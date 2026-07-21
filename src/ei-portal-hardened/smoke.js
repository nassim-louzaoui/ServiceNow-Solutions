var fs = require('fs');
var JSDOM = require('jsdom').JSDOM;
var bundle = fs.readFileSync(process.argv[2] || 'bundle.min.js', 'utf8');
var dom = new JSDOM('<!doctype html><html><head></head><body><div class="sn-chrome">platform</div>' +
  '<div id="sp"><div id="ei-root"></div></div></body></html>', { pretendToBeVisual: true, url: 'https://x/ei' });
var w = dom.window;
global.window = w; global.document = w.document; global.navigator = w.navigator; global.MutationObserver = w.MutationObserver;
w.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(Date.now()); }, 0); };
w.cancelAnimationFrame = function (id) { clearTimeout(id); };
w.matchMedia = w.matchMedia || function () { return { matches: false, addListener: function () {}, removeListener: function () {} }; };
w.scrollIntoView = function () {};
w.Element.prototype.scrollIntoView = function () {};
var vm = require('vm');
vm.runInContext(bundle, vm.createContext(w), { filename: 'b.js' });
var bridge = { call: function (p) {
  if (p.action === 'init') return Promise.resolve({ userName: 'Ada Lovelace', userInitials: 'AL', userRole: 'administrator', requestCount: 0, instanceUrl: '/sp' });
  if (p.action === 'load_section') return Promise.resolve({});
  if (p.action === 'assistant_query') return Promise.resolve({ reply: 'ack: ' + p.query });
  return Promise.resolve({});
} };
var root = w.document.getElementById('ei-root');
w.document.dispatchEvent(new w.CustomEvent('ei:mount', { detail: { el: root, bridge: bridge } }));
setTimeout(function () {
  var d = w.document; function c(s) { return d.querySelectorAll(s).length; }
  var out = {
    rootInBody: root.parentNode === d.body,
    shell: c('.ei-shell'), sidebar: c('.ei-sidebar'), nav: c('.ei-nav-item'),
    brand: (d.querySelector('.ei-brand-text') || {}).textContent,
    topbar: c('.ei-topbar'), breadcrumbCurrent: (d.querySelector('.ei-breadcrumb-current') || {}).textContent,
    subtab: (d.querySelector('.ei-subtab') || {}).textContent, accCats: c('.ei-acc-cat'),
    catalogRows: c('.ei-catalog-row'), assistant: c('.ei-assistant-panel'),
    asstInput: c('.ei-asst-input'), welcome: c('.ei-asst-welcome'),
    userName: (d.querySelector('.ei-user-name') || {}).textContent
  };
  var storeLocked = false; try { w.localStorage.setItem('x', '1'); storeLocked = w.localStorage.getItem('x') === null; } catch (e) { storeLocked = true; }
  out.storeLocked = storeLocked;
  root.setAttribute('style', 'display:none');
  setTimeout(function () {
    out.rootReverted = root.getAttribute('style') !== 'display:none';
    console.log(JSON.stringify(out, null, 2));
    process.exit(out.shell === 1 && out.nav === 4 && out.accCats === 1 && out.catalogRows === 3 && out.assistant === 1 ? 0 : 1);
  }, 80);
}, 500);
