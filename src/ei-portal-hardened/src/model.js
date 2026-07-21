// Client-side model runtime. Loads a code-as-data model THROUGH THE BRIDGE (manifest + tokenizer
// + weight chunks, no REST), rebuilds it byte-exact with the box-validated engine, and generates
// on-device. The heavy forward runs in the user's browser; the server only serves bytes and gates.
// Pure JS (int8 lazy dequant). The big models (assistant/flagship) want WebGPU before they are
// interactive; the smallest (technology) runs here today. Loaded models are cached for the session.
import EIClientInfer from './vendor/infer.js';
import EITokenizer from './vendor/tokenizer.js';

var _cache = {};

export function isLoaded(model) { return !!_cache[model]; }

function unwrap(r, key) {
  if (r && r[key] !== undefined) return r[key];
  if (r && r.data && r.data[key] !== undefined) return r.data[key];
  return r;
}

// Load a model through the bridge. onProgress(done, total, phase) reports streaming progress.
export function loadModel(bridge, model, onProgress) {
  if (_cache[model]) return Promise.resolve(_cache[model]);
  var manifest, tokJson, weights;
  return bridge.call({ action: 'manifest', model: model }).then(function (r) {
    manifest = unwrap(r, 'result');
    return bridge.call({ action: 'tokenizer', model: model });
  }).then(function (r) {
    tokJson = unwrap(r, 'result');
    weights = manifest.chunks.filter(function (c) { return c.kind === 'weights'; })
      .sort(function (a, b) { return a.part - b.part; });
    var chunks = [];
    var seq = Promise.resolve();
    weights.forEach(function (w, i) {
      seq = seq.then(function () {
        return bridge.call({ action: 'chunk', model: model, part: w.part }).then(function (cr) {
          chunks.push({ part: w.part, payload: unwrap(cr, 'payload') });
          if (onProgress) onProgress(i + 1, weights.length, 'weights');
        });
      });
    });
    return seq.then(function () { return chunks; });
  }).then(function (chunks) {
    var M = EIClientInfer.buildModel(manifest, chunks);
    var tok = new EITokenizer(tokJson);
    var st = { M: M, tok: tok, manifest: manifest, model: model };
    _cache[model] = st;
    return st;
  });
}

// Generate nTokens greedily, streaming the decoded continuation via onToken(textSoFar).
// Yields to the event loop between tokens so React can paint the partial reply.
export function generate(st, prompt, nTokens, onToken) {
  var ids = st.tok.encode(prompt);
  var block = st.M.cfg.block_size;
  var produced = [];
  var n = 0;
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
