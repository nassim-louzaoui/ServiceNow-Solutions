# Enterprise Intelligence — hardened portal (house style)

The Enterprise Intelligence web application front end. An embedded-React Service Portal app that
visually references the operations-intelligence portal and reimplements it as the hardened house
style defined in `docs/design/HARDENED_HOUSE_STYLE.md`.

Deployed to scoped app `x_intelligence` on PDI `dev283926` at `/ei`
(`sp_widget id=ei-portal-app`). Backend capability engine lives in the `EI_*` Script Includes.

## Layout

- `src/styles.js` — the entire stylesheet as one injected string. Strict reset (zeroes every UA
  default and the native scrollbar), exact operations-intelligence palette, **all sizing in vh/vw**,
  full-viewport shell, custom scrollbars only inside the two containers that genuinely overflow,
  every icon sized to its adjacent label height.
- `src/icons.jsx` — inline stroke icons, `currentColor`, rendered at 100% of a vh-sized wrapper.
- `src/app.jsx` — the React shell: dark-slate sidebar (brand + role nav + Open Service Portal +
  user card), white header (breadcrumb + actions), and the Assistant section (Service Catalog with
  the three Enterprise Solutions items + the Enterprise Assistant chat). No `window` globals.
- `src/harden.js` — client hardening (best effort; the real wall is server-side own-security):
  freeze intrinsics, trap `eval`, neuter tampering surfaces, lock local/sessionStorage, silence the
  console, DOM head/body takeover, and a MutationObserver anti-tamper that auto-reverts edits to our
  style and root.
- `src/index.jsx` — bootstrap. The bundle is an IIFE whose only global contact is a single,
  self-removing `ei:mount` listener; the AngularJS controller builds the closure `call()` bridge and
  dispatches that event with `{ el, bridge, init }`. React owns the subtree from there.
- `build.js` — esbuild (IIFE, no global name, minified) then moderate obfuscation. `selfDefending`
  is off on purpose: it overrides `Function.prototype.toString`, which the intrinsic freeze locks.

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
