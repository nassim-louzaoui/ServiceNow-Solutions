# Enterprise Intelligence — hardened portal (house style)

The Enterprise Intelligence web application front end. An embedded-React Service Portal app that
faithfully replicates the **live operations-intelligence portal** on the everestdev instance
(its dark full-width header, Service Catalog accordion, and full-height Assistant rail) and layers
on the hardening defined in `docs/design/HARDENED_HOUSE_STYLE.md`.

Deployed to scoped app `x_intelligence` on PDI `dev283926` at `/ei`
(`sp_widget id=ei-portal-app`). Backend capability engine lives in the `EI_*` Script Includes.

## Visual fidelity

The stylesheet in `src/base.css` is the **actual live operations-intelligence stylesheet**
(already viewport-based, `vw`/`vh`/`%` throughout), rebranded `oi-` to `ei-`, with a hardened
takeover reset appended (zero the host box model, hide every native scrollbar, hide every platform
sibling of our root). The React components are the real portal components, so the DOM the CSS
targets is the same DOM the reference renders:

- `src/components/Sidebar.jsx` — dark slate sidebar: brand, role nav, Open Service Portal, My
  Requests, user card.
- `src/components/Header.jsx` — dark full-width top bar: breadcrumb, date, notifications, avatar.
- `src/components/sections/CatalogSection.jsx` — the Service Catalog card: subtab strip plus the
  accordion (coloured category bar, description, item count, chevron, expandable item rows with a
  Start action). Populated with the three Enterprise Solutions closed-loop items.
- `src/components/AssistantPanel.jsx` — the full-height right rail: dark header, welcome, chat
  bubbles (user right in brand green, assistant left in grey), and the Ask anything input.
- `src/App.jsx` — the shell: `sidebar | main( header + body( content + assistant ) )`, wired to the
  server through a closure data bridge (init / load_section / check_auth / assistant_query). No
  `window` globals.

## Hardening

- `src/harden.js` — best effort client hardening (the real wall is server-side own-security):
  freeze `Object`/`Array` prototypes (the pollution targets; `Function`/`String` left alone so the
  legacy host page keeps working), trap `eval`, neuter tampering surfaces, lock
  local/sessionStorage, silence the console, DOM takeover, and a MutationObserver anti-tamper that
  auto-reverts edits to our style and root.
- `src/index.jsx` — bootstrap. The bundle is an IIFE whose only global contact is a single,
  self-removing `ei:mount` listener; the AngularJS controller builds the closure `call()` bridge and
  dispatches that event with `{ el, bridge, init }`. React owns the subtree from there.
- `build.js` — esbuild (IIFE, no global name, minified, CSS imported as text) then moderate
  obfuscation. `selfDefending` is off on purpose: it overrides `Function.prototype.toString`.

## Build and deploy

```
npm install
npm run build          # -> react-bundle.js (obfuscated IIFE)
node smoke.js react-bundle.js   # jsdom smoke test: render + anti-tamper + storage lockdown
```

The obfuscated bundle is uploaded to object storage `src/ei_react_bundle.js`; `deploy_hard.sh`
runs on the OCI box, patches the widget's client_script with the Angular bootstrap + inlined bundle,
refreshes the server script, and browser-verifies the result against the live PDI.

## Deferred

The strict CSP header (`docs/design/HARDENED_HOUSE_STYLE.md` §6) is deferred: a `script-src 'self'`
policy is incompatible with the inline-script Service Portal host and would risk locking out the
instance. It needs a nonce or a dedicated UI-Page delivery path. The server-side own-authorization
wall remains the actual security guarantee; the client hardening only raises the bar in the browser.
