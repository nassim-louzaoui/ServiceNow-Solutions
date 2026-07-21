// Client-side model runtime. Loads a code-as-data model THROUGH THE BRIDGE (manifest + tokenizer
// + weight chunks, no REST), rebuilds it byte-exact, and generates on-device. WebGPU fast path
// (verified to 1.9e-5 logit parity), pure-JS fallback. To keep the browser tab responsive while
// streaming hundreds of MB, chunks are fetched in BATCHES (one bridge call returns many chunks)
// and the event loop is yielded between batches. Loaded models are cached for the session.
import EIClientInfer from './vendor/infer.js';
import EIWebGPUInfer from './vendor/webgpu_infer.js';
import EITokenizer from './vendor/tokenizer.js';

var _cache = {};
// Weights arrive through many small requests run in parallel. The Service Portal data broker
// (bridge.call) serialises every request through one channel, so we use bridge.post when the host
// provides it: a direct fetch to the widget endpoint that the browser can run truly concurrently.
// count is kept at 4 (about 15 MB) to stay under the widget response size limit; the instance is
// throughput bound near 4 MB/s, so 8 requests in flight loads the largest model in a few minutes.
var BATCH = 4;
var CONCURRENCY = 8;

export function isLoaded(model) { return !!_cache[model]; }
export function backendOf(model) { return _cache[model] ? _cache[model].kind : null; }

function unwrap(r, key) {
  if (r && r[key] !== undefined) return r[key];
  if (r && r.data && r.data[key] !== undefined) return r.data[key];
  return r;
}
function yieldToLoop() { return new Promise(function (res) { setTimeout(res, 0); }); }

// Issue one weight request. Use the parallel-capable direct transport (bridge.post) when the host
// provides it, otherwise the serialising data broker (bridge.call).
function callChunks(bridge, body) {
  return (bridge.post ? bridge.post(body) : bridge.call(body));
}

// Fetch a run of weight chunks. Prefer the batched 'chunks' action; fall back to per-chunk 'chunk'.
function fetchBatch(bridge, model, parts) {
  return callChunks(bridge, { action: 'chunks', model: model, from: parts[0], count: parts.length })
    .then(function (r) {
      var payloads = unwrap(r, 'payloads');
      if (payloads && payloads.length === parts.length) {
        return parts.map(function (p, i) { return { part: p, payload: payloads[i] }; });
      }
      // batched action unsupported -> fetch each part singly
      var out = [], seq = Promise.resolve();
      parts.forEach(function (p) {
        seq = seq.then(function () {
          return bridge.call({ action: 'chunk', model: model, part: p }).then(function (cr) {
            out.push({ part: p, payload: unwrap(cr, 'payload') });
          });
        });
      });
      return seq.then(function () { return out; });
    });
}

// Load a model through the bridge. onProgress(done, total, phase) reports streaming progress.
export function loadModel(bridge, model, onProgress) {
  if (_cache[model]) return Promise.resolve(_cache[model]);
  var manifest, tokJson, weights, chunks = [];
  return bridge.call({ action: 'manifest', model: model }).then(function (r) {
    manifest = unwrap(r, 'result');
    return bridge.call({ action: 'tokenizer', model: model });
  }).then(function (r) {
    tokJson = unwrap(r, 'result');
    weights = manifest.chunks.filter(function (c) { return c.kind === 'weights'; })
      .sort(function (a, b) { return a.part - b.part; }).map(function (c) { return c.part; });
    // Split into batches, then drain them through a pool of concurrent bridge calls. Fetch order
    // does not matter (createSession sorts chunks by part), so parallelism is a pure speedup. This
    // turns a ~40 minute sequential load of the largest model into a few minutes.
    var batches = [];
    for (var bi = 0; bi < weights.length; bi += BATCH) batches.push(weights.slice(bi, bi + BATCH));
    var total = weights.length, doneChunks = 0, nextBatchIdx = 0;
    function worker() {
      if (nextBatchIdx >= batches.length) return Promise.resolve();
      var parts = batches[nextBatchIdx++];
      return fetchBatch(bridge, model, parts).then(function (got) {
        for (var j = 0; j < got.length; j++) chunks.push(got[j]);
        doneChunks += parts.length;
        if (onProgress) onProgress(Math.min(doneChunks, total), total, 'weights');
        return yieldToLoop().then(worker);
      });
    }
    var pool = [];
    for (var w = 0; w < Math.min(CONCURRENCY, batches.length); w++) pool.push(worker());
    return Promise.all(pool);
  }).then(function () {
    var tok = new EITokenizer(tokJson);
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      if (onProgress) onProgress(weights.length, weights.length, 'gpu');
      return EIWebGPUInfer.createSession(manifest, chunks).then(function (session) {
        var st = { kind: 'webgpu', session: session, tok: tok, manifest: manifest, model: model };
        _cache[model] = st; chunks = null; return st;
      })['catch'](function () {
        var M = EIClientInfer.buildModel(manifest, chunks);
        var st = { kind: 'js', M: M, tok: tok, manifest: manifest, model: model };
        _cache[model] = st; chunks = null; return st;
      });
    }
    var M = EIClientInfer.buildModel(manifest, chunks);
    var st = { kind: 'js', M: M, tok: tok, manifest: manifest, model: model };
    _cache[model] = st; chunks = null; return st;
  });
}

// Special token ids, read from the tokenizer so this stays correct for any model.
function special(st, name, dflt) {
  var v = st.tok.specialTokens && st.tok.specialTokens[name];
  return (v === undefined || v === null) ? dflt : v;
}

// Block size for either backend.
function blockOf(st) { return st.kind === 'webgpu' ? st.session.cfg.block_size : st.M.cfg.block_size; }

// One forward pass over a context window, returning logits. Backend agnostic.
function forwardCtx(st, ctx) {
  if (st.kind === 'webgpu') return EIWebGPUInfer.forward(st.session, ctx);
  return Promise.resolve(EIClientInfer.forward(st.M, ctx));
}
function pickArgmax(st, lg) {
  return st.kind === 'webgpu' ? EIWebGPUInfer.argmax(lg) : EIClientInfer.argmax(lg);
}

// Chat generation, single voice. Builds the turn sequence
//   <|system|> systemText <|user|> userText <|assistant|>
// with the special token ids interleaved (the tokenizer does not encode the markers itself), then
// generates greedily up to maxTokens, streaming the decoded assistant text via onToken(textSoFar).
// Generation stops early at <|endoftext|> so replies end naturally. Same code path for WebGPU and
// the pure JS fallback, so the on device answer is identical whichever backend is active.
export function generateChat(st, systemText, userText, maxTokens, onToken) {
  var SYS = special(st, '<|system|>', null), USR = special(st, '<|user|>', null);
  var ASST = special(st, '<|assistant|>', null), EOS = special(st, '<|endoftext|>', 1);
  var ids = [];
  if (SYS !== null && systemText) ids = ids.concat([SYS], st.tok.encode(systemText));
  if (USR !== null) ids.push(USR);
  ids = ids.concat(st.tok.encode(userText));
  if (ASST !== null) ids.push(ASST);
  // If the model has no chat markers, fall back to plain continuation of the user text.
  if (SYS === null && USR === null && ASST === null) ids = st.tok.encode(userText);

  var produced = [], block = blockOf(st), n = 0;
  return new Promise(function (resolve, reject) {
    function step() {
      if (n >= maxTokens) { resolve(st.tok.decode(produced)); return; }
      var ctx = ids.length > block ? ids.slice(ids.length - block) : ids;
      forwardCtx(st, ctx).then(function (lg) {
        var next = pickArgmax(st, lg);
        if (next === EOS) { resolve(st.tok.decode(produced)); return; }
        ids.push(next); produced.push(next); n++;
        if (onToken) onToken(st.tok.decode(produced));
        setTimeout(step, 0);
      })['catch'](reject);
    }
    setTimeout(step, 0);
  });
}

// Plain greedy continuation (kept for non chat use). Streams decoded text via onToken(textSoFar).
export function generate(st, prompt, nTokens, onToken) {
  var ids = st.tok.encode(prompt), produced = [], block = blockOf(st), n = 0;
  return new Promise(function (resolve, reject) {
    function step() {
      if (n >= nTokens) { resolve(st.tok.decode(produced)); return; }
      var ctx = ids.length > block ? ids.slice(ids.length - block) : ids;
      forwardCtx(st, ctx).then(function (lg) {
        var next = pickArgmax(st, lg);
        ids.push(next); produced.push(next); n++;
        if (onToken) onToken(st.tok.decode(produced));
        setTimeout(step, 0);
      })['catch'](reject);
    }
    setTimeout(step, 0);
  });
}
