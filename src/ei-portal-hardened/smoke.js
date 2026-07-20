// Headless smoke test: load the built bundle into jsdom, drive the ei:mount contract,
// assert the shell renders, then exercise the anti-tamper revert and storage lockdown.
var fs = require('fs');
var JSDOM = require('jsdom').JSDOM;

var bundle = fs.readFileSync(process.argv[2] || 'bundle.min.js', 'utf8');
var dom = new JSDOM('<!doctype html><html><head></head><body><div class="sn-chrome">platform</div>' +
  '<div id="sp-page"><div id="ei-root"></div></div></body></html>', {
  runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://dev283926.service-now.com/ei'
});
var w = dom.window;
// minimal globals React 18 expects
global.window = w; global.document = w.document; global.navigator = w.navigator;
global.MutationObserver = w.MutationObserver;
w.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(Date.now()); }, 0); };
w.cancelAnimationFrame = function (id) { clearTimeout(id); };
w.matchMedia = w.matchMedia || function () { return { matches: false, addListener: function () {}, removeListener: function () {} }; };

// Run the bundle in the jsdom window context.
var vm = require('vm');
var ctx = vm.createContext(w);
w.eval = undefined; // ensure bundle doesn't rely on eval
vm.runInContext(bundle, ctx, { filename: 'bundle.js' });

var replies = [];
var bridge = { call: function (p) { return Promise.resolve({ reply: 'ack: ' + p.text }); } };
var root = w.document.getElementById('ei-root');
w.document.dispatchEvent(new w.CustomEvent('ei:mount', { detail: { el: root, bridge: bridge, init: { userName: 'Ada Lovelace', initials: 'AL' } } }));

setTimeout(function () {
  var d = w.document;
  function count(sel) { return d.querySelectorAll(sel).length; }
  var out = {
    rootReparentedToBody: root.parentNode === d.body,
    styleInjected: !!d.querySelector('style[data-ei="style"]'),
    shell: count('.ei-shell'),
    nav: count('.ei-nav-item'),
    cards: count('.ei-card'),
    brand: (d.querySelector('.ei-brand-txt') || {}).textContent,
    userName: (d.querySelector('.ei-user-name') || {}).textContent,
    welcome: count('.ei-welcome')
  };
  // storage lockdown
  var lockedStorage = false;
  try { w.localStorage.setItem('x', '1'); lockedStorage = (w.localStorage.getItem('x') === null); } catch (e) { lockedStorage = true; }
  out.storageLocked = lockedStorage;
  // anti-tamper: inject a foreign node + try to hide our root, then check revert
  var evil = d.createElement('div'); evil.id = 'evil'; evil.textContent = 'x'; d.body.appendChild(evil);
  root.setAttribute('style', 'display:none');
  setTimeout(function () {
    out.rootStyleReverted = (root.getAttribute('style') !== 'display:none');
    out.rootStillInBody = (root.parentNode === d.body);
    console.log(JSON.stringify(out, null, 2));
    process.exit(out.shell === 1 && out.cards === 3 && out.nav === 4 ? 0 : 1);
  }, 60);
}, 400);
