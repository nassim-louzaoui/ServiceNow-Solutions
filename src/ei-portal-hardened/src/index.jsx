// Bootstrap. The bundle is an IIFE whose only global contact is a single, self-removing
// 'ei:mount' listener. The AngularJS controller builds the closure data bridge and dispatches
// that event with { el, bridge, init }. We then harden, take over the DOM, wire the bridge, and
// let React own the subtree. Hardening order mirrors HARDENED_HOUSE_STYLE.md sections 3 to 5.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App, { setBridge } from './App.jsx';
import CSS from './base.css';
import {
  freezeIntrinsics, blockEval, neuterSurfaces, lockStorage, silenceConsole, takeover, antiTamper
} from './harden.js';

var mounted = false;

function boot(detail) {
  if (mounted) return;
  var el = (detail && detail.el) || document.getElementById('ei-root');
  if (!el) return;
  mounted = true;

  freezeIntrinsics();
  var styleEl = takeover(el, CSS);

  setBridge((detail && detail.bridge) || null);
  var root = createRoot(el);
  root.render(React.createElement(App, null));

  antiTamper(el, styleEl, styleEl.textContent);
  neuterSurfaces();
  lockStorage();
  blockEval();
  silenceConsole();
}

function onMount(e) {
  document.removeEventListener('ei:mount', onMount);
  boot(e && e.detail);
}
document.addEventListener('ei:mount', onMount);
