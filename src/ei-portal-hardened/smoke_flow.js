// jsdom smoke test for the closed-loop catalog: render, start a flow, verify route options,
// choose one (verify replace/branch), then Back (verify return).
var fs = require('fs');
var JSDOM = require('jsdom').JSDOM;
var bundle = fs.readFileSync(process.argv[2] || 'react-bundle.js', 'utf8');
var dom = new JSDOM('<!doctype html><html><head></head><body><div id="sp"><div id="ei-root"></div></div></body></html>', { pretendToBeVisual: true, url: 'https://x/ei' });
var w = dom.window;
global.window = w; global.document = w.document; global.navigator = w.navigator; global.MutationObserver = w.MutationObserver;
w.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(Date.now()); }, 0); };
w.cancelAnimationFrame = function (id) { clearTimeout(id); };
w.matchMedia = w.matchMedia || function () { return { matches: false, addListener: function () {}, removeListener: function () {} }; };
w.Element.prototype.scrollIntoView = function () {};
var vm = require('vm');
vm.runInContext(bundle, vm.createContext(w), { filename: 'b.js' });
var bridge = { call: function (p) {
  if (p.action === 'init') return Promise.resolve({ userName: 'Ada Lovelace', userInitials: 'AL', userRole: 'administrator' });
  return Promise.resolve({});
} };
var d = w.document;
d.dispatchEvent(new w.CustomEvent('ei:mount', { detail: { el: d.getElementById('ei-root'), bridge: bridge } }));

function q(sel) { return d.querySelectorAll(sel); }
function txt(sel) { var e = d.querySelector(sel); return e ? e.textContent : null; }
function click(el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }

setTimeout(function () {
  var out = { cards: q('.ei-catalog-row').length };
  // Start the first catalog item (New Solution Development)
  var startBtn = d.querySelector('.ei-catalog-row .ei-btn.primary');
  click(startBtn);
  setTimeout(function () {
    out.flowShown = !!d.querySelector('.ei-flow');
    out.rootOptions = q('.ei-flow-opt').length;
    out.rootText = (txt('.ei-flow-text') || '').slice(0, 40);
    out.hasBack = !!d.querySelector('.ei-flow-back');
    // choose the 2nd option ("Choose a layout")
    var opts = q('.ei-flow-opt');
    click(opts[1]);
    setTimeout(function () {
      out.afterChooseText = (txt('.ei-flow-text') || '').slice(0, 30);
      out.afterChooseOptions = q('.ei-flow-opt').length;
      out.branched = out.afterChooseText !== out.rootText.slice(0, 30);
      // Back should return to root
      click(d.querySelector('.ei-flow-back'));
      setTimeout(function () {
        out.afterBackText = (txt('.ei-flow-text') || '').slice(0, 40);
        out.backReturnedToRoot = out.afterBackText === out.rootText;
        console.log(JSON.stringify(out, null, 2));
        var ok = out.flowShown && out.rootOptions === 4 && out.hasBack && out.branched && out.backReturnedToRoot;
        process.exit(ok ? 0 : 1);
      }, 60);
    }, 60);
  }, 120);
}, 400);
