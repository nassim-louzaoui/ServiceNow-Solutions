/* webgpu_infer.js -- WebGPU-accelerated forward pass for the Enterprise
 * Intelligence code-as-data GPT models. Mirrors EI_client_infer.js exactly
 * (int8 lazy-dequant GPT: exact GELU via erf, tied wte/lm_head, LayerNorm
 * eps 1e-5, no bias, per-row float32 scales), but does the matmuls,
 * layernorms, GELU and causal attention as WGSL compute shaders.
 *
 * Standard WebGPU API only (navigator.gpu / GPUBufferUsage / GPUMapMode as
 * globals) -- drops into a browser bundle with no imports. For Node-side
 * verification, pass an already-created `device` (and, since Node has no
 * WebGPU globals, the GPUBufferUsage/GPUMapMode enum objects) via opts.
 *
 * No KV cache in v1 (nice-to-have, not required) -- forward() recomputes
 * the full context each call, same as generate() slicing to block_size in
 * EI_client_infer.js.
 */

// Softmax scratch array bound inside the attention shader (must be >=
// max block_size of any model this engine is used with).
var MAX_CTX = 2048;
var WG = 64;

function align4(n) { return (n + 3) & ~3; }

function b64ToBytes(b64) {
  if (typeof Buffer !== "undefined") {
    var bb = Buffer.from(b64, "base64");
    return new Uint8Array(bb.buffer, bb.byteOffset, bb.length);
  }
  var bin = atob(b64), n = bin.length, out = new Uint8Array(n);
  for (var i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function resolveEnums(opts) {
  var BufferUsage = (opts && opts.GPUBufferUsage) ||
    (typeof GPUBufferUsage !== "undefined" ? GPUBufferUsage : undefined);
  var MapMode = (opts && opts.GPUMapMode) ||
    (typeof GPUMapMode !== "undefined" ? GPUMapMode : undefined);
  if (!BufferUsage || !MapMode) {
    throw new Error("GPUBufferUsage/GPUMapMode not available -- in Node pass " +
      "them via opts (they are not globals outside a browser).");
  }
  return { BufferUsage: BufferUsage, MapMode: MapMode };
}

// -------------------------------------------------------------------------
// WGSL shared helper: extract a signed int8 from a packed array<u32>
// (4 bytes per word, little-endian byte order matches how the raw int8
// byte stream was uploaded verbatim into the u32 buffer).
// -------------------------------------------------------------------------
var WGSL_SIGN_EXTEND =
  "fn signExtendByte(word: u32, byteIdx: u32) -> i32 {\n" +
  "  let shl = (3u - byteIdx) * 8u;\n" +
  "  let top = word << shl;\n" +
  "  return bitcast<i32>(top) >> 24u;\n" +
  "}\n";

var WGSL_EMBED =
  "struct Params { T: u32, C: u32 };\n" +
  "@group(0) @binding(0) var<storage, read> ids: array<u32>;\n" +
  "@group(0) @binding(1) var<storage, read> wteQ: array<u32>;\n" +
  "@group(0) @binding(2) var<storage, read> wteScale: array<f32>;\n" +
  "@group(0) @binding(3) var<storage, read> wpeQ: array<u32>;\n" +
  "@group(0) @binding(4) var<storage, read> wpeScale: array<f32>;\n" +
  "@group(0) @binding(5) var<storage, read_write> outH: array<f32>;\n" +
  "@group(0) @binding(6) var<uniform> params: Params;\n" +
  WGSL_SIGN_EXTEND +
  "@compute @workgroup_size(" + WG + ")\n" +
  "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n" +
  "  let idx = gid.x;\n" +
  "  let C = params.C;\n" +
  "  if (idx >= params.T * C) { return; }\n" +
  "  let t = idx / C;\n" +
  "  let c = idx % C;\n" +
  "  let tokId = ids[t];\n" +
  "  let eIdx = tokId * C + c;\n" +
  "  let eWord = wteQ[eIdx >> 2u];\n" +
  "  let eByte = signExtendByte(eWord, eIdx & 3u);\n" +
  "  let eVal = f32(eByte) * wteScale[tokId];\n" +
  "  let pIdx = t * C + c;\n" +
  "  let pWord = wpeQ[pIdx >> 2u];\n" +
  "  let pByte = signExtendByte(pWord, pIdx & 3u);\n" +
  "  let pVal = f32(pByte) * wpeScale[t];\n" +
  "  outH[idx] = eVal + pVal;\n" +
  "}\n";

var WGSL_LAYERNORM =
  "struct Params { T: u32, C: u32 };\n" +
  "@group(0) @binding(0) var<storage, read> x: array<f32>;\n" +
  "@group(0) @binding(1) var<storage, read> gain: array<f32>;\n" +
  "@group(0) @binding(2) var<storage, read_write> outY: array<f32>;\n" +
  "@group(0) @binding(3) var<uniform> params: Params;\n" +
  "@compute @workgroup_size(" + WG + ")\n" +
  "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n" +
  "  let t = gid.x;\n" +
  "  if (t >= params.T) { return; }\n" +
  "  let C = params.C;\n" +
  "  let base = t * C;\n" +
  "  var m: f32 = 0.0;\n" +
  "  for (var i: u32 = 0u; i < C; i = i + 1u) { m = m + x[base + i]; }\n" +
  "  m = m / f32(C);\n" +
  "  var v: f32 = 0.0;\n" +
  "  for (var i: u32 = 0u; i < C; i = i + 1u) { let d = x[base + i] - m; v = v + d * d; }\n" +
  "  v = v / f32(C);\n" +
  "  let inv = 1.0 / sqrt(v + 1e-5);\n" +
  "  for (var i: u32 = 0u; i < C; i = i + 1u) { outY[base + i] = (x[base + i] - m) * inv * gain[i]; }\n" +
  "}\n";

// y[t,o] = scale[outRowOffset+o] * sum_i x[xRowOffset+t, i] * q[outRowOffset+o, i]
var WGSL_LINEARQ =
  "struct Params { T: u32, inDim: u32, outDim: u32, outRowOffset: u32, xRowOffset: u32 };\n" +
  "@group(0) @binding(0) var<storage, read> x: array<f32>;\n" +
  "@group(0) @binding(1) var<storage, read> q: array<u32>;\n" +
  "@group(0) @binding(2) var<storage, read> scale: array<f32>;\n" +
  "@group(0) @binding(3) var<storage, read_write> y: array<f32>;\n" +
  "@group(0) @binding(4) var<uniform> params: Params;\n" +
  WGSL_SIGN_EXTEND +
  "@compute @workgroup_size(" + WG + ")\n" +
  "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n" +
  "  let idx = gid.x;\n" +
  "  let outDim = params.outDim;\n" +
  "  let total = params.T * outDim;\n" +
  "  if (idx >= total) { return; }\n" +
  "  let t = idx / outDim;\n" +
  "  let o = idx % outDim;\n" +
  "  let inDim = params.inDim;\n" +
  "  let xBase = (params.xRowOffset + t) * inDim;\n" +
  "  let wRow = params.outRowOffset + o;\n" +
  "  let wBase = wRow * inDim;\n" +
  "  var s: f32 = 0.0;\n" +
  "  for (var i: u32 = 0u; i < inDim; i = i + 1u) {\n" +
  "    let elemIdx = wBase + i;\n" +
  "    let word = q[elemIdx >> 2u];\n" +
  "    let b = signExtendByte(word, elemIdx & 3u);\n" +
  "    s = s + x[xBase + i] * f32(b);\n" +
  "  }\n" +
  "  y[t * outDim + o] = s * scale[wRow];\n" +
  "}\n";

var WGSL_GELU =
  "struct Params { N: u32 };\n" +
  "@group(0) @binding(0) var<storage, read_write> buf: array<f32>;\n" +
  "@group(0) @binding(1) var<uniform> params: Params;\n" +
  "const SQRT2: f32 = 1.4142135623730951;\n" +
  "fn erf_(xin: f32) -> f32 {\n" +
  "  var x = xin;\n" +
  "  var s: f32 = 1.0;\n" +
  "  if (x < 0.0) { s = -1.0; }\n" +
  "  x = abs(x);\n" +
  "  let t = 1.0 / (1.0 + 0.3275911 * x);\n" +
  "  let y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x);\n" +
  "  return s * y;\n" +
  "}\n" +
  "fn gelu_(x: f32) -> f32 { return 0.5 * x * (1.0 + erf_(x / SQRT2)); }\n" +
  "@compute @workgroup_size(" + WG + ")\n" +
  "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n" +
  "  let i = gid.x;\n" +
  "  if (i >= params.N) { return; }\n" +
  "  buf[i] = gelu_(buf[i]);\n" +
  "}\n";

// b[i] += a[i]
var WGSL_ADD =
  "struct Params { N: u32 };\n" +
  "@group(0) @binding(0) var<storage, read> a: array<f32>;\n" +
  "@group(0) @binding(1) var<storage, read_write> b: array<f32>;\n" +
  "@group(0) @binding(2) var<uniform> params: Params;\n" +
  "@compute @workgroup_size(" + WG + ")\n" +
  "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n" +
  "  let i = gid.x;\n" +
  "  if (i >= params.N) { return; }\n" +
  "  b[i] = b[i] + a[i];\n" +
  "}\n";

// causal multi-head attention: one thread per (t, head)
var WGSL_ATTENTION =
  "struct Params { T: u32, C: u32, H: u32, HD: u32 };\n" +
  "@group(0) @binding(0) var<storage, read> q: array<f32>;\n" +
  "@group(0) @binding(1) var<storage, read> k: array<f32>;\n" +
  "@group(0) @binding(2) var<storage, read> v: array<f32>;\n" +
  "@group(0) @binding(3) var<storage, read_write> outY: array<f32>;\n" +
  "@group(0) @binding(4) var<uniform> params: Params;\n" +
  "const MAX_CTX: u32 = " + MAX_CTX + "u;\n" +
  "@compute @workgroup_size(32)\n" +
  "fn main(@builtin(global_invocation_id) gid: vec3<u32>) {\n" +
  "  let idx = gid.x;\n" +
  "  let H = params.H;\n" +
  "  let total = params.T * H;\n" +
  "  if (idx >= total) { return; }\n" +
  "  let t = idx / H;\n" +
  "  let hh = idx % H;\n" +
  "  let C = params.C;\n" +
  "  let HD = params.HD;\n" +
  "  let offh = hh * HD;\n" +
  "  var scores: array<f32, MAX_CTX>;\n" +
  "  var mx: f32 = -1e30;\n" +
  "  for (var j: u32 = 0u; j <= t; j = j + 1u) {\n" +
  "    var s: f32 = 0.0;\n" +
  "    for (var i: u32 = 0u; i < HD; i = i + 1u) { s = s + q[t * C + offh + i] * k[j * C + offh + i]; }\n" +
  "    s = s / sqrt(f32(HD));\n" +
  "    scores[j] = s;\n" +
  "    if (s > mx) { mx = s; }\n" +
  "  }\n" +
  "  var den: f32 = 0.0;\n" +
  "  for (var j: u32 = 0u; j <= t; j = j + 1u) {\n" +
  "    let e = exp(scores[j] - mx);\n" +
  "    scores[j] = e;\n" +
  "    den = den + e;\n" +
  "  }\n" +
  "  for (var i: u32 = 0u; i < HD; i = i + 1u) {\n" +
  "    var acc: f32 = 0.0;\n" +
  "    for (var j: u32 = 0u; j <= t; j = j + 1u) { acc = acc + (scores[j] / den) * v[j * C + offh + i]; }\n" +
  "    outY[t * C + offh + i] = acc;\n" +
  "  }\n" +
  "}\n";

function buildPipelines(device) {
  function mk(code) {
    var module = device.createShaderModule({ code: code });
    return device.createComputePipeline({ layout: "auto", compute: { module: module, entryPoint: "main" } });
  }
  return {
    embed: mk(WGSL_EMBED),
    layernorm: mk(WGSL_LAYERNORM),
    linearQ: mk(WGSL_LINEARQ),
    gelu: mk(WGSL_GELU),
    add: mk(WGSL_ADD),
    attention: mk(WGSL_ATTENTION),
  };
}

// -------------------------------------------------------------------------
// createSession
// -------------------------------------------------------------------------
async function createSession(manifest, chunks, opts) {
  opts = opts || {};
  var enums = resolveEnums(opts);
  var BufferUsage = enums.BufferUsage;

  var device = opts.device;
  if (!device) {
    if (typeof navigator === "undefined" || !navigator.gpu) {
      throw new Error("WebGPU not available (no navigator.gpu)");
    }
    var adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("no WebGPU adapter");
    device = await adapter.requestDevice();
  }

  var cfg = manifest.meta.config;
  if (cfg.block_size > MAX_CTX) {
    throw new Error("model block_size " + cfg.block_size + " exceeds engine MAX_CTX " + MAX_CTX);
  }

  var sorted = chunks.slice().sort(function (a, b) { return a.part - b.part; });
  var byteArrays = new Array(sorted.length);
  var total = 0, i;
  for (i = 0; i < sorted.length; i++) { byteArrays[i] = b64ToBytes(sorted[i].payload); total += byteArrays[i].length; }
  var U = new Uint8Array(total), off = 0;
  for (i = 0; i < sorted.length; i++) { U.set(byteArrays[i], off); off += byteArrays[i].length; }

  var STORAGE_RW = BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST;

  var tensors = {};
  var tlist = manifest.tensors;
  for (i = 0; i < tlist.length; i++) {
    var sp = tlist[i];
    if (sp.dtype === "float32") {
      var fbytes = U.subarray(sp.weight_offset, sp.weight_offset + sp.weight_len);
      var fbuf = device.createBuffer({ size: align4(fbytes.length), usage: STORAGE_RW });
      device.queue.writeBuffer(fbuf, 0, fbytes);
      tensors[sp.name] = { kind: "f32", buf: fbuf, shape: sp.shape };
    } else {
      var qbytes = U.subarray(sp.weight_offset, sp.weight_offset + sp.weight_len);
      var qbuf = device.createBuffer({ size: align4(qbytes.length), usage: STORAGE_RW });
      device.queue.writeBuffer(qbuf, 0, qbytes);
      var sbytes = U.subarray(sp.scale_offset, sp.scale_offset + sp.scale_len);
      var sbuf = device.createBuffer({ size: align4(sbytes.length), usage: STORAGE_RW });
      device.queue.writeBuffer(sbuf, 0, sbytes);
      tensors[sp.name] = { kind: "q8", qbuf: qbuf, sbuf: sbuf, shape: sp.shape };
    }
  }

  var pipelines = buildPipelines(device);
  return { device: device, cfg: cfg, tensors: tensors, pipelines: pipelines, enums: enums, STORAGE_RW: STORAGE_RW };
}

// -------------------------------------------------------------------------
// forward
// -------------------------------------------------------------------------
function makeUniformU32(device, BufferUsage, arr) {
  var data = new Uint32Array(arr);
  var buf = device.createBuffer({ size: Math.max(4, data.byteLength), usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST });
  device.queue.writeBuffer(buf, 0, data);
  return buf;
}

function dispatch1D(encoder, pipeline, bindGroup, totalThreads, wg) {
  var pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.max(1, Math.ceil(totalThreads / wg)));
  pass.end();
}

async function forward(session, ids) {
  var device = session.device, cfg = session.cfg, T_ = session.tensors, P = session.pipelines;
  var BufferUsage = session.enums.BufferUsage, MapMode = session.enums.MapMode;
  var STORAGE_RW = session.STORAGE_RW;

  var C = cfg.n_embd, H = cfg.n_head, L = cfg.n_layer, HD = C / H, V = cfg.vocab_size;
  var T = ids.length;

  function buf(bytes) { return device.createBuffer({ size: align4(bytes), usage: STORAGE_RW }); }
  function uni(arr) { return makeUniformU32(device, BufferUsage, arr); }

  var idsU32 = new Uint32Array(ids);
  var idsBuf = device.createBuffer({ size: align4(idsU32.byteLength), usage: BufferUsage.STORAGE | BufferUsage.COPY_DST });
  device.queue.writeBuffer(idsBuf, 0, idsU32);

  var encoder = device.createCommandEncoder();

  // -- embedding: h = wte[ids[t]] + wpe[t] --------------------------------
  var wte = T_["transformer.wte.weight"], wpe = T_["transformer.wpe.weight"];
  var h = buf(T * C * 4);
  {
    var params = uni([T, C]);
    var bg = device.createBindGroup({
      layout: P.embed.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: idsBuf } },
        { binding: 1, resource: { buffer: wte.qbuf } },
        { binding: 2, resource: { buffer: wte.sbuf } },
        { binding: 3, resource: { buffer: wpe.qbuf } },
        { binding: 4, resource: { buffer: wpe.sbuf } },
        { binding: 5, resource: { buffer: h } },
        { binding: 6, resource: { buffer: params } },
      ],
    });
    dispatch1D(encoder, P.embed, bg, T * C, WG);
  }

  function runLayernorm(xBuf, gainTensor, outBuf) {
    var params = uni([T, C]);
    var bg = device.createBindGroup({
      layout: P.layernorm.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: xBuf } },
        { binding: 1, resource: { buffer: gainTensor.buf } },
        { binding: 2, resource: { buffer: outBuf } },
        { binding: 3, resource: { buffer: params } },
      ],
    });
    dispatch1D(encoder, P.layernorm, bg, T, WG);
  }

  function runLinearQ(xBuf, weightTensor, outBuf, Tloc, inDim, outDim, outRowOffset, xRowOffset) {
    var params = uni([Tloc, inDim, outDim, outRowOffset, xRowOffset]);
    var bg = device.createBindGroup({
      layout: P.linearQ.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: xBuf } },
        { binding: 1, resource: { buffer: weightTensor.qbuf } },
        { binding: 2, resource: { buffer: weightTensor.sbuf } },
        { binding: 3, resource: { buffer: outBuf } },
        { binding: 4, resource: { buffer: params } },
      ],
    });
    dispatch1D(encoder, P.linearQ, bg, Tloc * outDim, WG);
  }

  function runGelu(xBuf, N) {
    var params = uni([N]);
    var bg = device.createBindGroup({
      layout: P.gelu.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: xBuf } },
        { binding: 1, resource: { buffer: params } },
      ],
    });
    dispatch1D(encoder, P.gelu, bg, N, WG);
  }

  function runAdd(aBuf, bBuf, N) {
    var params = uni([N]);
    var bg = device.createBindGroup({
      layout: P.add.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: aBuf } },
        { binding: 1, resource: { buffer: bBuf } },
        { binding: 2, resource: { buffer: params } },
      ],
    });
    dispatch1D(encoder, P.add, bg, N, WG);
  }

  function runAttention(qBuf, kBuf, vBuf, outBuf) {
    var params = uni([T, C, H, HD]);
    var bg = device.createBindGroup({
      layout: P.attention.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: qBuf } },
        { binding: 1, resource: { buffer: kBuf } },
        { binding: 2, resource: { buffer: vBuf } },
        { binding: 3, resource: { buffer: outBuf } },
        { binding: 4, resource: { buffer: params } },
      ],
    });
    dispatch1D(encoder, P.attention, bg, T * H, 32);
  }

  for (var l = 0; l < L; l++) {
    var p = "transformer.h." + l + ".";
    var ln1w = T_[p + "ln_1.weight"], ln2w = T_[p + "ln_2.weight"];
    var cattn = T_[p + "attn.c_attn.weight"], cproj = T_[p + "attn.c_proj.weight"];
    var cfc = T_[p + "mlp.c_fc.weight"], cpj2 = T_[p + "mlp.c_proj.weight"];

    var a = buf(T * C * 4);
    runLayernorm(h, ln1w, a);

    var qBuf = buf(T * C * 4), kBuf = buf(T * C * 4), vBuf = buf(T * C * 4);
    runLinearQ(a, cattn, qBuf, T, C, C, 0, 0);
    runLinearQ(a, cattn, kBuf, T, C, C, C, 0);
    runLinearQ(a, cattn, vBuf, T, C, C, 2 * C, 0);

    var attnOut = buf(T * C * 4);
    runAttention(qBuf, kBuf, vBuf, attnOut);

    var attnProj = buf(T * C * 4);
    runLinearQ(attnOut, cproj, attnProj, T, C, C, 0, 0);

    runAdd(attnProj, h, T * C); // h += attnProj

    var b = buf(T * C * 4);
    runLayernorm(h, ln2w, b);

    var f = buf(T * 4 * C * 4);
    runLinearQ(b, cfc, f, T, C, 4 * C, 0, 0);
    runGelu(f, T * 4 * C);

    var mlpOut = buf(T * C * 4);
    runLinearQ(f, cpj2, mlpOut, T, 4 * C, C, 0, 0);

    runAdd(mlpOut, h, T * C); // h += mlpOut
  }

  var lnf = T_["transformer.ln_f.weight"];
  var hl = buf(T * C * 4);
  runLayernorm(h, lnf, hl);

  var logitsBuf = buf(V * 4);
  // tied lm_head: logits = hl[last row] @ wte^T, lazy dequant
  runLinearQ(hl, wte, logitsBuf, 1, C, V, 0, T - 1);

  var readBuf = device.createBuffer({ size: align4(V * 4), usage: BufferUsage.MAP_READ | BufferUsage.COPY_DST });
  encoder.copyBufferToBuffer(logitsBuf, 0, readBuf, 0, align4(V * 4));

  device.queue.submit([encoder.finish()]);

  await readBuf.mapAsync(MapMode.READ);
  var mapped = readBuf.getMappedRange();
  var logits = new Float32Array(mapped.slice(0, V * 4));
  readBuf.unmap();
  return logits;
}

function argmax(a) {
  var bi = 0, bv = a[0];
  for (var i = 1; i < a.length; i++) if (a[i] > bv) { bv = a[i]; bi = i; }
  return bi;
}

async function generate(session, ids, nNew, onToken) {
  var out = ids.slice(), block = session.cfg.block_size;
  for (var n = 0; n < nNew; n++) {
    var ctx = out.length > block ? out.slice(out.length - block) : out;
    var lg = await forward(session, ctx);
    var id = argmax(lg);
    out.push(id);
    if (onToken) onToken(id);
  }
  return out;
}

var EIWebGPUInfer = { createSession: createSession, forward: forward, generate: generate, argmax: argmax, MAX_CTX: MAX_CTX };

export default EIWebGPUInfer;
