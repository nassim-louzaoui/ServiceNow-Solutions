// Client-side model runtime. Loads a code-as-data model THROUGH THE BRIDGE (manifest + tokenizer
// + weight chunks, no REST), rebuilds it byte-exact, and generates on-device. Two backends, chosen
// automatically: WebGPU (fast path, WGSL kernels, verified to 1.9e-5 logit parity vs the reference)
// when navigator.gpu is present, else the pure-JS engine (correct, ~6s/token). The heavy forward
// runs in the user's browser; the server only serves bytes and gates. Loaded models are cached.
import EIClientInfer from './vendor/infer.js';
import EIWebGPUInfer from './vendor/webgpu_infer.js';
import EITokenizer from './vendor/tokenizer.js';

var _cache = {};

export function isLoaded(model) { return !!_cache[model]; }
export function backendOf(model) { return _cache[model] ? _cache[model].kind : null; }

function unwrap(r, key) {
  if (r && r[key] !== undefined) return r[key];
  if (r && r.data && r.data[key] !== undefined) return r.data[key];
  return r;
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
      .sort(function (a, b) { return a.part - b.part; });
    var seq = Promise.resolve();
    weights.forEach(function (w, i) {
      seq = seq.then(function () {
        return bridge.call({ action: 'chunk', model: model, part: w.part }).then(function (cr) {
          chunks.push({ part: w.part, payload: unwrap(cr, 'payload') });
          if (onProgress) onProgress(i + 1, weights.length, 'weights');
        });
      });
    });
    return seq;
  }).then(function () {
    var tok = new EITokenizer(tokJson);
    // Fast path: WebGPU. Fall back to pure JS on any failure or when unavailable.
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
      produced.push(id);
      if (onToken) onToken(st.tok.decode(produced));
    }).then(function () { return st.tok.decode(produced); });
  }
  // JS path: yield to the event loop between tokens so React can paint the partial reply.
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
