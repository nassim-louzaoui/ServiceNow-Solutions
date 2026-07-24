# WebGPU forward-pass parity report

## What was built
`webgpu_infer.js` -- a dependency-free ES module exposing `createSession` /
`forward` / `generate`, implementing the same int8 lazy-dequant GPT forward
pass as `~/ei/runtime/EI_client_infer.js` (tied wte/lm_head, LayerNorm eps
1e-5 / no bias, exact erf-based GELU) as WGSL compute shaders: embedding
gather, layernorm, int8-dequant matmul (reused for QKV projection, attention
output projection, MLP, and the tied logits matmul via row-offset/x-offset
uniforms), elementwise GELU, residual add, and causal multi-head attention.
It obtains its own device via `navigator.gpu` in a browser, or accepts an
injected `device` (+ `GPUBufferUsage`/`GPUMapMode`, which aren't globals in
Node) for headless testing.

No KV cache in v1 (explicitly a nice-to-have per the mission) -- `forward()`
recomputes the full context on every call, and `generate()` just calls
`forward()` in a loop and greedy-argmaxes, same structure as the reference's
`generate()`.

## Test setup
- Config tested (real model): `{vocab_size:16000, block_size:1536, n_layer:15,
  n_head:16, n_embd:1280, bias:false}` -- the "technology" model at
  `~/ei/out/si2/technology/`.
- Also tested a synthetic random model (`n_layer:2, n_head:4, n_embd:64,
  vocab_size:128, block_size:64`) built in-memory in the same manifest/tensor
  layout as `export_int8.py`, to exercise every kernel cheaply before the
  330MB real model.
- Verification device: headless WebGPU via `@kmamal/gpu` (Dawn), using Mesa
  lavapipe (software Vulkan) as the backend, since this box has no real GPU
  (`00:01.0 VGA compatible controller: Device 1234:1111` -- a virtual
  stdvga device) and no root to install system drivers. Getting this working
  required a non-default libstdc++ (via a no-root micromamba/conda-forge
  env) and pinning mesalib to a build using LLVM 21 -- LLVM 22's JIT
  crashes compiling any compute shader on this specific AMD EPYC 9J14 host
  (an X86 masked-gather instruction-selection bug). Full details in
  `~/ei/status/webgpu_progress.md`. **This entire workaround is local to
  verification only** -- `webgpu_infer.js` itself has zero Node/Dawn/lavapipe
  dependencies and uses only the standard browser `navigator.gpu` API.
- Reference: `EIClientInfer.forward` / `.generate` run in the same Node
  process against the same in-memory model, for a bit-exact apples-to-apples
  comparison.

## Results

### Synthetic model (2 layer, n_embd 64, vocab 128)
3 prompts of varying length (1, 5, 12 tokens). Worst max-abs-logit-diff:
**3.815e-5**. Argmax matched on all 3.

### Real "technology" model
| prompt | max abs logit diff | argmax match | 8-token greedy continuation match |
|---|---|---|---|
| "How do I create an ACL" | 1.240e-5 | yes (token 1646, " experience") | yes, byte-identical: `" experience by selecting Create > Experience .\n"` |
| "A business rule is" | 1.907e-5 | yes (token 992, " available") | yes, byte-identical: `" available in secure contexts (HTTPS),"` |

**Worst max abs logit diff across all tests: 1.907e-5**, roughly 500x under
the ~1e-2 tolerance in the mission brief. Greedy generation produced
identical token sequences (not just matching next-token argmax) over 8 steps
on both prompts, i.e. the small per-step logit noise never flips an argmax
in this test.

### Why any diff at all
Both implementations do the same int8-dequant sum-of-products, but the JS
reference accumulates each dot product sequentially in a single `for` loop,
while the GPU sums within whatever order the WGSL compiler/hardware executes
the identical loop -- plus the two platforms' `exp`/`sqrt` intrinsics used in
softmax/layernorm are not bit-identical implementations. Float32 addition
isn't associative, so ~1e-5-scale drift after 15 transformer layers (~90
matmuls plus 15 attention softmaxes) is expected and is exactly the ballpark
observed.

### Timing (per-token, this box's headless software/CPU WebGPU backend)
Pure-JS reference: ~5.3s/token generating (matches the mission's "~6s/token"
baseline). WebGPU (lavapipe, software rasterizer, no real GPU hardware):
310ms - 707ms/token, growing with context length T since v1 has no KV cache
(every generate() step reprocesses the full context: embedding + 15 layers
+ tied logits over the whole prefix again). That's already a **~9-15x
speedup with zero real GPU hardware** -- lavapipe is a CPU software rasterizer
running the exact same WGSL kernels a real GPU would run, just without any
hardware parallelism. On an actual discrete/integrated GPU in a browser this
should be dramatically faster still, since the same kernels get real SIMD/
warp parallelism across the thousands of output-row / attention-head threads
they're written to exploit (e.g. the tied-logits matmul alone dispatches
16000 independent GPU threads).

Full per-run numbers (chunk load, buildModel/createSession, per-prompt
forward + generate timings) are in `verify_result.json` next to this report
(regenerate via `run_node.sh verify_webgpu.js`).

## Known limitations / honest gaps
- **No KV cache.** Every `generate()` step redoes the full forward pass over
  the whole context, so per-token cost grows with T (visible in the timing
  table above). This is explicitly allowed as v1 scope by the mission but is
  the single biggest real-world perf lever left on the table.
- **Per-byte int8 unpacking, not vectorized.** The dequant matmul kernel
  unpacks one int8 per loop iteration (`signExtendByte`) rather than reading
  a `u32` word and unpacking 4 elements at once. Correct and simple, but
  leaves a straightforward ~2-4x kernel-level speedup unclaimed for later.
  This kernel choice was deliberate for the sake of clarity/simplicity per
  the mission's kernel guidance, and this constraint should be revisited
  as a follow-up if perf becomes the priority.
- **Attention kernel's softmax scratch array is a fixed compile-time bound**
  (`MAX_CTX = 2048`, comfortably above this model family's `block_size:1536`).
  `createSession` throws if a model's `block_size` exceeds that, so this is
  a checked limitation, not a silent one.
- **Verification-only workaround stack** (libstdc++/lavapipe/LLVM-21 pin) is
  brittle and specific to this box's CPU + lack of a real GPU; it is not
  part of the shipped `webgpu_infer.js` and does not need to travel with it.
- Not yet tested: real browser + real GPU hardware (this box has none to
  test against), very long contexts near `block_size`, or the `si2`
  collection's larger models (only "technology", the smallest, was used per
  the mission's guidance).
