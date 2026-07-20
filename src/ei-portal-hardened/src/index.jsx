// Bootstrap. The whole bundle is an IIFE, so nothing here leaks onto window: the only contact
// with the global scope is a single, transient 'ei:mount' listener that removes itself once it
// has fired. The AngularJS controller builds the closure-scoped data bridge and dispatches that
// event with { el, bridge, init }; from there React owns the subtree and all state lives in
// closure scope. Order of operations mirrors HARDENED_HOUSE_STYLE.md sections 3 to 5.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.jsx';
import { CSS } from './styles.js';
import {
  freezeIntrinsics, blockEval, neuterSurfaces, lockStorage, silenceConsole, takeover, antiTamper
} from './harden.js';

var mounted = false;

function boot(detail) {
  if (mounted) return;
  var el = detail && detail.el;
  if (!el) el = document.getElementById('ei-root');
  if (!el) return;
  mounted = true;

  // Stop prototype pollution before we build anything on top of the intrinsics.
  freezeIntrinsics();

  // Take the DOM: lift our root to <body>, inject the stylesheet, hide all platform siblings.
  var styleEl = takeover(el, CSS);

  // React owns everything from here.
  var root = createRoot(el);
  root.render(React.createElement(App, {
    bridge: detail && detail.bridge,
    init: (detail && detail.init) || {}
  }));

  // Keep our style and root exactly as set; auto revert unauthorized edits.
  antiTamper(el, styleEl, styleEl.textContent);

  // Remaining browser-surface hardening, once the app is live.
  neuterSurfaces();
  lockStorage();
  blockEval();
  silenceConsole();
}

// Register the one-time mount listener. It is the sole global touch and unhooks itself.
function onMount(e) {
  document.removeEventListener('ei:mount', onMount);
  boot(e && e.detail);
}
document.addEventListener('ei:mount', onMount);
