/* verify_webgpu.js -- Node harness: builds a tiny synthetic random model to
 * sanity-check every WebGPU kernel against EI_client_infer.js, then loads
 * the real "technology" model and compares full forward passes + greedy
 * generation between the reference (pure JS) and webgpu_infer.js (via
 * @kmamal/gpu, headless Dawn+lavapipe -- see ~/ei/status/webgpu_progress.md
 * for why that needs a non-default libstdc++/Vulkan ICD on this box).
 *
 * Run via: ~/ei/out/webgpu/run_node.sh verify_webgpu.js
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const gpuPkgDefault = (await import("@kmamal/gpu")).default;
const { create: gpuCreate, GPUBufferUsage, GPUMapMode } = gpuPkgDefault;

const EIClientInfer = require("/home/eiagent/ei/runtime/EI_client_infer.js");
const EITokenizer = require("/home/eiagent/ei/runtime/es5_tokenizer.js");
const webgpuMod = (await import("./webgpu_infer.js")).default;

// ---------------------------------------------------------------------
// Load a UMD "var NAME = (function(){ ... return {...payload...}; })();"
// script file the same way a <script> tag would, and return the value
// assigned to its top-level var.
// ---------------------------------------------------------------------
function loadPayloadVar(filePath) {
  const varName = path.basename(filePath, ".js");
  const code = fs.readFileSync(filePath, "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: filePath });
  const val = sandbox[varName];
  if (val === undefined) throw new Error("var " + varName + " not found in " + filePath);
  return val;
}

function loadModelFiles(dir, prefix) {
  const manifestFile = path.join(dir, prefix + "_manifest_000.js");
  const tokenizerFile = path.join(dir, prefix + "_tokenizer_000.js");
  const manifest = JSON.parse(loadPayloadVar(manifestFile).payload);
  const tokenizerJson = JSON.parse(loadPayloadVar(tokenizerFile).payload);
  const weightFiles = fs.readdirSync(dir)
    .filter((f) => f.startsWith(prefix + "_weights_") && f.endsWith(".js"))
    .sort();
  const chunks = weightFiles.map((f) => {
    const v = loadPayloadVar(path.join(dir, f));
    return { part: v.part, payload: v.payload };
  });
  return { manifest, tokenizerJson, chunks };
}

// ---------------------------------------------------------------------
// Synthetic tiny random model, built in-memory in the same tensor/manifest
// layout as export_int8.py (see ~/ei/train/model/export_int8.py) so it
// exercises every kernel (embed, layernorm, linearQ, gelu, add, attention,
// tied logits) before touching the ~330MB real model.
// ---------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSyntheticModel(cfg, seed) {
  const rng = mulberry32(seed);
  const randInt8 = () => Math.round((rng() * 2 - 1) * 120);
  const randScale = () => 0.01 + rng() * 0.05;
  const randGain = () => 0.8 + rng() * 0.4;

  const C = cfg.n_embd, V = cfg.vocab_size, L = cfg.n_layer, B = cfg.block_size;

  const specs = []; // {name, dtype, shape, rowsForQ (array of Int8Array), scale (array), floatData}
  function addQ(name, rows, cols) {
    const q = new Int8Array(rows * cols);
    const scale = new Float32Array(rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) q[r * cols + c] = randInt8();
      scale[r] = randScale();
    }
    specs.push({ name, dtype: "int8", shape: [rows, cols], q, scale });
  }
  function addF(name, n) {
    const f = new Float32Array(n);
    for (let i = 0; i < n; i++) f[i] = randGain();
    specs.push({ name, dtype: "float32", shape: [n], f });
  }

  addQ("transformer.wte.weight", V, C);
  addQ("transformer.wpe.weight", B, C);
  for (let l = 0; l < L; l++) {
    const p = "transformer.h." + l + ".";
    addF(p + "ln_1.weight", C);
    addF(p + "ln_2.weight", C);
    addQ(p + "attn.c_attn.weight", 3 * C, C);
    addQ(p + "attn.c_proj.weight", C, C);
    addQ(p + "mlp.c_fc.weight", 4 * C, C);
    addQ(p + "mlp.c_proj.weight", C, 4 * C);
  }
  addF("transformer.ln_f.weight", C);

  // pack into one contiguous byte stream + manifest tensor offsets, exactly
  // like export_int8.py's per-tensor layout (weight bytes, then separately
  // scale bytes are appended after ALL weight bytes -- order doesn't matter
  // as long as offsets are correct, so we just lay out weight then scale
  // for each tensor back-to-back).
  let total = 0;
  for (const s of specs) {
    if (s.dtype === "float32") { s._wlen = s.f.length * 4; s._slen = 0; }
    else { s._wlen = s.q.length; s._slen = s.scale.length * 4; }
    total += s._wlen + s._slen;
  }
  const U = new Uint8Array(total);
  const dv = new DataView(U.buffer);
  let off = 0;
  const tensors = [];
  for (const s of specs) {
    const weight_offset = off;
    if (s.dtype === "float32") {
      for (let i = 0; i < s.f.length; i++) dv.setFloat32(off + i * 4, s.f[i], true);
      off += s._wlen;
      tensors.push({ name: s.name, dtype: "float32", shape: s.shape, weight_offset, weight_len: s._wlen, scale_offset: 0, scale_len: 0 });
    } else {
      U.set(new Uint8Array(s.q.buffer, s.q.byteOffset, s.q.length), off);
      off += s._wlen;
      const scale_offset = off;
      for (let i = 0; i < s.scale.length; i++) dv.setFloat32(off + i * 4, s.scale[i], true);
      off += s._slen;
      tensors.push({ name: s.name, dtype: "int8", shape: s.shape, weight_offset, weight_len: s._wlen, scale_offset, scale_len: s._slen });
    }
  }

  const manifest = { model: "synthetic", total_bytes: total, chunks: [{ var: "chunk0", part: 0, of: 1, kind: "weights" }], tensors, meta: { config: cfg } };
  const payload = Buffer.from(U.buffer, U.byteOffset, U.byteLength).toString("base64");
  const chunks = [{ part: 0, payload }];
  return { manifest, chunks };
}

function maxAbsDiff(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > m) m = d; }
  return m;
}

async function makeDevice() {
  const inst = gpuCreate([]);
  const adapter = await inst.requestAdapter();
  if (!adapter) throw new Error("no adapter (headless Vulkan/lavapipe not found)");
  const device = await adapter.requestDevice();
  return device;
}

// ---------------------------------------------------------------------
async function runSynthetic(device) {
  console.log("\n=== Synthetic model check ===");
  const cfg = { vocab_size: 128, block_size: 64, n_layer: 2, n_head: 4, n_embd: 64, bias: false };
  const { manifest, chunks } = buildSyntheticModel(cfg, 12345);

  const refModel = EIClientInfer.buildModel(manifest, chunks);
  const session = await webgpuMod.createSession(manifest, chunks, { device, GPUBufferUsage, GPUMapMode });

  const prompts = [
    [3, 10, 55, 2, 99],
    [1],
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  ];
  let worst = 0, allMatch = true;
  for (const ids of prompts) {
    const refLogits = EIClientInfer.forward(refModel, ids);
    const gpuLogits = await webgpuMod.forward(session, ids);
    const d = maxAbsDiff(refLogits, gpuLogits);
    const am1 = EIClientInfer.argmax(refLogits), am2 = webgpuMod.argmax(gpuLogits);
    worst = Math.max(worst, d);
    const match = am1 === am2;
    allMatch = allMatch && match;
    console.log("  ids.len=" + ids.length + " maxAbsDiff=" + d.toExponential(3) + " argmax ref=" + am1 + " gpu=" + am2 + " match=" + match);
  }
  console.log("Synthetic worst maxAbsDiff:", worst.toExponential(3), "all argmax match:", allMatch);
  return { worst, allMatch };
}

// ---------------------------------------------------------------------
async function runReal(device) {
  console.log("\n=== Real 'technology' model check ===");
  const dir = "/home/eiagent/ei/out/si2/technology";
  const t0 = Date.now();
  const { manifest, tokenizerJson, chunks } = loadModelFiles(dir, "EI_technology");
  console.log("  loaded", chunks.length, "weight chunks in", (Date.now() - t0) + "ms, config:", manifest.meta.config);

  const tok = new EITokenizer(tokenizerJson);

  const t1 = Date.now();
  const refModel = EIClientInfer.buildModel(manifest, chunks);
  console.log("  reference buildModel:", (Date.now() - t1) + "ms");

  const t2 = Date.now();
  const session = await webgpuMod.createSession(manifest, chunks, { device, GPUBufferUsage, GPUMapMode });
  console.log("  webgpu createSession (GPU upload):", (Date.now() - t2) + "ms");

  const prompts = ["How do I create an ACL", "A business rule is"];
  const results = [];
  for (const prompt of prompts) {
    const ids = tok.encode(prompt);
    console.log("\n  prompt:", JSON.stringify(prompt), "-> ids:", ids);

    const tRef0 = Date.now();
    const refLogits = EIClientInfer.forward(refModel, ids);
    const tRef = Date.now() - tRef0;

    const tGpu0 = Date.now();
    const gpuLogits = await webgpuMod.forward(session, ids);
    const tGpu = Date.now() - tGpu0;

    const d = maxAbsDiff(refLogits, gpuLogits);
    const am1 = EIClientInfer.argmax(refLogits), am2 = webgpuMod.argmax(gpuLogits);
    console.log("    forward: maxAbsDiff=" + d.toExponential(3) + " argmax ref=" + am1 + "(" + tok.decode([am1]) + ")" +
      " gpu=" + am2 + "(" + tok.decode([am2]) + ") match=" + (am1 === am2) +
      " time ref=" + tRef + "ms gpu=" + tGpu + "ms");

    // greedy generation, a handful of tokens, timing per-token on GPU
    const nNew = 8;
    const tGenRef0 = Date.now();
    const refOut = EIClientInfer.generate(refModel, ids, nNew);
    const tGenRef = Date.now() - tGenRef0;

    const perTok = [];
    const tGenGpu0 = Date.now();
    const gpuOut = await webgpuMod.generate(session, ids, nNew, () => { perTok.push(Date.now()); });
    const tGenGpu = Date.now() - tGenGpu0;
    const perTokMs = perTok.map((t, i) => t - (i === 0 ? tGenGpu0 : perTok[i - 1]));

    const refCont = tok.decode(refOut.slice(ids.length));
    const gpuCont = tok.decode(gpuOut.slice(ids.length));
    const tokensMatch = JSON.stringify(refOut) === JSON.stringify(gpuOut);
    console.log("    generate(" + nNew + "): ref='" + refCont + "' (" + tGenRef + "ms)");
    console.log("                      gpu='" + gpuCont + "' (" + tGenGpu + "ms, per-token ms: " + perTokMs.map((x) => x.toFixed(0)).join(",") + ")");
    console.log("    token sequences match:", tokensMatch);

    results.push({ prompt, ids, maxAbsDiff: d, argmaxMatch: am1 === am2, refCont, gpuCont, tokensMatch, tRef, tGpu, tGenRef, tGenGpu, perTokMs });
  }
  return results;
}

async function main() {
  const device = await makeDevice();
  const synth = await runSynthetic(device);
  if (!synth.allMatch) {
    console.error("SYNTHETIC CHECK FAILED -- aborting before real model");
    process.exit(1);
  }
  const real = await runReal(device);
  const worstReal = Math.max(...real.map((r) => r.maxAbsDiff));
  const allMatchReal = real.every((r) => r.argmaxMatch);
  console.log("\n=== SUMMARY ===");
  console.log("synthetic worst maxAbsDiff:", synth.worst.toExponential(3));
  console.log("real ('technology') worst maxAbsDiff:", worstReal.toExponential(3));
  console.log("real argmax match all prompts:", allMatchReal);

  fs.writeFileSync(path.join(__dirname, "verify_result.json"), JSON.stringify({ synth, real, worstReal, allMatchReal }, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
