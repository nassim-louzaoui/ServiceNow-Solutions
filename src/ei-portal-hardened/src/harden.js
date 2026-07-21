// Client hardening. Honest posture: the browser runs on the user's machine and can never be
// made truly tamper proof, so none of this is the security guarantee. The guarantee is the
// server side own-authorization wall. These layers only raise the bar in the browser: they
// defeat casual tampering, injected scripts, reverse-engineering at a glance, and they auto
// revert unauthorized DOM edits. Every routine is best effort and fails closed but quiet.

// ---- 1. Freeze the intrinsics (SES / lockdown style) to stop prototype pollution. ----
export function freezeIntrinsics() {
  // Freeze the prototypes that are the real prototype-pollution targets. We deliberately do NOT
  // freeze Function.prototype (the host Service Portal page keeps running background scripts that
  // legitimately redefine toString on it, and freezing it only produces hidden console noise
  // without adding real defense once our app is mounted).
  // Object.prototype and Array.prototype are the classic pollution targets and are not
  // re-polyfilled by the host. We leave String/Number/Boolean/Function prototypes alone, since
  // the legacy Service Portal page re-defines methods on them (e.g. String.prototype.trim) and
  // freezing those only yields hidden console noise without adding real defense post-mount.
  var targets = [Object.prototype, Array.prototype];
  for (var i = 0; i < targets.length; i++) {
    try { Object.freeze(targets[i]); } catch (e) {}
  }
}

// ---- 2. Block eval (CSP is the real block; this backs it up). ----
// We trap window.eval only. The Function constructor is left intact on purpose: our bundle is
// embedded inside the host Service Portal AngularJS page, whose digest ($parse) depends on
// Function, and killing it would break the host we run inside. The strict CSP (Section 6) is
// what forbids both in the real wall; here we take the one we can take without host breakage.
export function blockEval() {
  function trap() { throw new Error('blocked'); }
  try { Object.defineProperty(window, 'eval', { value: trap, writable: false, configurable: false }); } catch (e) {}
}

// ---- 3. Neuter browser surfaces that only aid tampering; keep text selection where wanted. ----
export function neuterSurfaces() {
  function stop(e) { e.preventDefault(); return false; }
  try { window.addEventListener('contextmenu', stop, true); } catch (e) {}
  try { window.addEventListener('dragstart', stop, true); } catch (e) {}
  // Deter the common devtools shortcuts. A deterrent only; anyone can still open devtools.
  try {
    window.addEventListener('keydown', function (e) {
      var k = (e.key || '').toLowerCase();
      var block =
        e.keyCode === 123 ||                                   // F12
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) ||
        ((e.ctrlKey || e.metaKey) && k === 'u');               // view source
      if (block) { e.preventDefault(); e.stopPropagation(); return false; }
    }, true);
  } catch (e) {}
}

// ---- 4. Treat storage as untrusted: deny local/sessionStorage writes from our own origin. ----
// We never persist secrets or authoritative state in the browser; the server re-validates
// everything. Overriding the setters removes an obvious exfiltration and tampering surface.
export function lockStorage() {
  ['localStorage', 'sessionStorage'].forEach(function (name) {
    try {
      var store = window[name];
      if (!store) return;
      var noop = function () {};
      var shim = {
        getItem: function () { return null; }, setItem: noop, removeItem: noop,
        clear: noop, key: function () { return null; }, get length() { return 0; }
      };
      Object.defineProperty(window, name, { value: shim, writable: false, configurable: false });
    } catch (e) {}
  });
}

// ---- 5. Silence the console AFTER the app is up, so it yields nothing to a curious user. ----
export function silenceConsole() {
  try {
    var noop = function () {};
    var c = window.console || {};
    var keys = ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'table',
      'group', 'groupEnd', 'groupCollapsed', 'time', 'timeEnd', 'count', 'assert', 'profile'];
    for (var i = 0; i < keys.length; i++) { try { c[keys[i]] = noop; } catch (e) {} }
    try { Object.defineProperty(window, 'console', { value: c, writable: false, configurable: false }); } catch (e) {}
  } catch (e) {}
}

// ---- 6. DOM takeover: our root becomes the only visible thing under <body>. ----
// The widget renders #ei-root deep inside the platform page composition. We lift it to be a
// direct child of <body>, promote it to the full viewport, and hide every platform sibling so
// no default ServiceNow element is ever visible. Returns the style element that enforces this.
export function takeover(rootEl, css) {
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.setAttribute('data-ei', 'style');
  style.appendChild(document.createTextNode(
    css + '\nbody>*:not([data-ei-host]){display:none!important}\n' +
    'html,body{background:#F0F2F5!important}'
  ));
  head.appendChild(style);
  try {
    if (rootEl.parentNode !== document.body) { document.body.appendChild(rootEl); }
    rootEl.setAttribute('data-ei-host', '1');
  } catch (e) {}
  return style;
}

// ---- 7. Anti tamper engine: keep our style and root exactly as we set them. ----
// A MutationObserver on <html>. If our stylesheet is removed or edited, or #ei-root is removed
// or has its identity attributes changed by anything other than us, we revert immediately.
// We do NOT police inside #ei-root: React owns that subtree and reconciles it itself. We guard
// against observing our own reverts by disconnecting around them.
export function antiTamper(rootEl, styleEl, cssText) {
  var head = document.head || document.getElementsByTagName('head')[0];
  var goodStyle = cssText;
  var goodRootAttrs = {};
  var i;
  for (i = 0; i < rootEl.attributes.length; i++) {
    goodRootAttrs[rootEl.attributes[i].name] = rootEl.attributes[i].value;
  }
  var observer;
  function withGuard(fn) {
    if (observer) observer.disconnect();
    try { fn(); } catch (e) {}
    if (observer) observer.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true, characterData: true
    });
  }
  function restore() {
    // stylesheet present and unedited
    if (!styleEl.parentNode) head.appendChild(styleEl);
    if (styleEl.textContent !== goodStyle) styleEl.textContent = goodStyle;
    // root present as a direct child of body
    if (rootEl.parentNode !== document.body) document.body.appendChild(rootEl);
    // root identity attributes unchanged (blocks display:none, class swaps, id rename)
    var seen = {};
    for (var j = rootEl.attributes.length - 1; j >= 0; j--) {
      var a = rootEl.attributes[j];
      seen[a.name] = true;
      if (goodRootAttrs.hasOwnProperty(a.name)) {
        if (a.value !== goodRootAttrs[a.name]) rootEl.setAttribute(a.name, goodRootAttrs[a.name]);
      } else {
        rootEl.removeAttribute(a.name);
      }
    }
    for (var name in goodRootAttrs) {
      if (goodRootAttrs.hasOwnProperty(name) && !seen[name]) rootEl.setAttribute(name, goodRootAttrs[name]);
    }
  }
  observer = new MutationObserver(function (records) {
    var touched = false;
    for (var r = 0; r < records.length; r++) {
      var t = records[r].target;
      // ignore everything happening inside our React-owned subtree
      if (t !== rootEl && rootEl.contains(t) && t !== styleEl) continue;
      touched = true;
      break;
    }
    if (touched) withGuard(restore);
  });
  observer.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true, characterData: true
  });
  return observer;
}
