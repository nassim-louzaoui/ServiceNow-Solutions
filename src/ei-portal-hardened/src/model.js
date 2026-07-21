// Client-side model runtime. Loads a code-as-data model THROUGH THE BRIDGE (manifest + tokenizer
// + weight chunks, no REST), rebuilds it byte-exact, and generates on-device. WebGPU fast path
// (verified to 1.9e-5 logit parity), pure-JS fallback. To keep the browser tab responsive while
// streaming hundreds of MB, chunks are fetched in BATCHES (one bridge call returns many chunks)
// and the event loop is yielded between batches. Loaded models are cached for the session.
import EIClientInfer from './vendor/infer.js';
import EIWebGPUInfer from './vendor/webgpu_infer.js';
import EITokenizer from './vendor/tokenizer.js';

var _cache = {};
var BATCH = 8; // chunks per bridge call

export function isLoaded(model) { return !!_cache[model]; }
export function backendOf(model) { return _cache[model] ? _cache[model].kind : null; }

function unwrap(r, key) {
  if (r && r[key] !== undefined) return r[key];
  if (r && r.data && r.data[key] !== undefined) return r.data[key];
  return r;
}
function yieldToLoop() { return new Promise(function (res) { setTimeout(res, 0); }); }

// Fetch a run of weight chunks. Prefer the batched 'chunks' action; fall back to per-chunk 'chunk'.
function fetchBatch(bridge, model, parts) {
  return bridge.call({ action: 'chunks', model: model, from: parts[0], count: parts.length })
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
    var total = weights.length, i = 0;
    function nextBatch() {
      if (i >= total) return Promise.resolve();
      var parts = weights.slice(i, i + BATCH);
      return fetchBatch(bridge, model, parts).then(function (got) {
        for (var j = 0; j < got.length; j++) chunks.push(got[j]);
        i += parts.length;
        if (onProgress) onProgress(Math.min(i, total), total, 'weights');
        return yieldToLoop().then(nextBatch);
      });
    }
    return nextBatch();
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

// Generate nTokens greedily, streaming the decoded continuation via onToken(textSoFar).
export function generate(st, prompt, nTokens, onToken) {
  var ids = st.tok.encode(prompt);
  var produced = [];
  if (st.kind === 'webgpu') {
    return EIWebGPUInfer.generate(st.session, ids, nTokens, function (id) {
      produced.push(id); if (onToken) onToken(st.tok.decode(produced));
    }).then(function () { return st.tok.decode(produced); });
  }
  var block = st.M.cfg.block_size, n = 0;
  return new Promise(function (resolve) {
    function step() {
      if (n >= nTokens) { resolve(st.tok.decode(produced)); return; }
      var ctx = ids.length > block ? ids.slice(ids.length - block) : ids;
      var lg = EIClientInfer.forward(st.M, ctx);
      var next = EIClientInfer.argmax(lg);
      ids.push(next); produced.push(next); n++;
      if (onToken) onToken(st.tok.decode(produced));
      setTimeout(step, 0);
    }
    setTimeout(step, 0);
  });
}
