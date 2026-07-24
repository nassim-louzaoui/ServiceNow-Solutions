// Enterprise Intelligence portal — hardened bootstrap. esbuild bundles this to an IIFE
// exposed as window.__EI_REACT__; the thin AngularJS widget controller calls
// __EI_REACT__.mount(rootEl, { bridge, init }). All sensitive state stays in closure.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app.jsx';
import { CSS } from './styles.js';

function injectCSS() {
  var s = document.createElement('style');
  s.setAttribute('data-ei-style', '1');
  s.textContent = CSS;
  document.head.appendChild(s);
  return s;
}

function lockConsole() {
  try {
    var noop = function () {};
    var keys = ['log', 'info', 'warn', 'error', 'debug', 'table', 'dir', 'trace', 'group', 'groupEnd'];
    for (var i = 0; i < keys.length; i++) { try { console[keys[i]] = noop; } catch (e) {} }
  } catch (e) {}
}

// anti-tamper: keep our injected style present; remove foreign nodes appended to <html> root
function antiTamper(rootEl, styleEl) {
  try {
    var obs = new MutationObserver(function () {
      if (styleEl && !styleEl.isConnected) { try { document.head.appendChild(styleEl); } catch (e) {} }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
}

export function mount(rootEl, ctx) {
  ctx = ctx || {};
  if (!rootEl) { return false; }
  var styleEl = injectCSS();
  try { document.documentElement.style.overflow = 'hidden'; document.body.style.margin = '0'; document.body.style.overflow = 'hidden'; } catch (e) {}
  var root = createRoot(rootEl);
  root.render(React.createElement(App, { bridge: ctx.bridge, init: ctx.init }));
  antiTamper(rootEl, styleEl);
  if (ctx.harden !== false) { lockConsole(); }
  return true;
}
