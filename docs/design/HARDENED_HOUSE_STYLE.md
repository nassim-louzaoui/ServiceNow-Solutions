# Hardened House Style — Enterprise Intelligence Web Applications

Reference: the operations-intelligence Service Portal (visual + shell + embedded-React pattern),
hardened much further. This is BOTH the build standard for every web app and the Technology
Intelligence model's training corpus.

## 0. Security posture (the honest model)
Client code runs on the user's machine, so the browser can never be made truly tamper-proof; a
determined attacker with dev tools controls their own runtime. Therefore:
- **Client hardening raises the bar as high as physically possible** (below) — it defeats casual
  tampering, injected scripts, and reverse-engineering-at-a-glance, and auto-reverts DOM edits.
- **Our own server-side authorization engine is the real wall — running in powerful system
  context, NOT relying on ServiceNow ACLs.** The engine and all four models execute privileged
  (system context) because full administration/development/configuration power is mandatory. Since
  that power bypasses the platform's own security, we build our OWN authorization layer: every call
  is authenticated, the acting user's entitlement is checked by our own access model before any
  powerful operation runs, all inputs are validated (graph-structure-derived), and every action is
  audited. Tampering the client can only deface the attacker's own screen; it can never invoke a
  capability our own server-side gate does not grant them.

## 1. Shell + visual standard (identical to operations-intelligence)
- Three-column shell: dark-green **Sidebar** (brand + role-filtered nav + Open Service Portal +
  user card) | top **Header** (breadcrumb + notifications + avatar) | center **Content** | right
  per-section **Assistant** chat. Underlying portal navbar/footer removed (theme heights 0).
- Palette: brand #00BF6F, dark #00895E, bg #F0F2F5, surface #FFF, ink #121212, muted #6E6E6E,
  line #DCDCDC, danger #D9534F. Fonts Source Sans Pro / Segoe UI.
- **VH/VW units only** for all sizing. **Every icon is the same height as its adjacent label text.**
- **Perfect symmetry is mandatory** — every layout balanced and symmetrical (aligned grids,
  centered/mirrored composition, equal proportions and spacing on all sides). No lopsided UI, ever.
- **No default browser CSS or influences** — a strict global reset zeroes every UA default (margins,
  paddings, outlines, list/form styling, and the native scrollbar). Nothing renders from browser
  defaults; every pixel is styled explicitly by us.
- **Everything fits the viewport** — a 100vh × 100vw shell, **no page-level scroll and no horizontal
  scroll ever**; native scrollbars are hidden.
- **Custom scrollbars only where content requires** — vertical scrolling is a **custom-styled
  scrollbar created only inside the specific content-area container that genuinely overflows** (per
  the content's context); never a page or browser scrollbar.
- Title Case full-word labels; no AI-vendor references anywhere.
- Content layouts may vary per app (variety); the shell + hardening + these rules never change.

## 2. AngularJS lockdown -> React takeover
- Widget template is exactly `<div id="ei-root"></div>`; nothing else.
- The sp-widget AngularJS `api.controller` does ONE thing then stops: build a **closure-scoped
  data bridge** (a `call(payload)` that proxies to `$scope.server.get`, plus initial `data`) and
  pass it into the React bundle's mount function. No `$scope` watchers, no Angular templating on
  our subtree, no ongoing Angular logic. React owns everything after mount.

## 3. DOM head/body takeover
- On mount: inject our stylesheet into `<head>`, mount our app into `#ei-root`, promote it to full
  viewport, and strip platform chrome. The app's head/body are the only things that render.
- Angular digests or the platform may try to re-add nodes; the anti-tamper engine (below) keeps
  the tree ours.

## 4. Anti-tamper engine (client, best-effort, auto-reverting)
- After first render, register the legitimate node set (our root subtree + our injected head nodes).
- A `MutationObserver` on `documentElement` (childList + attributes + subtree):
  - Foreign node added outside our root / not whitelisted -> remove it.
  - Attribute/text change to our nodes not issued by React -> revert from the known-good model.
  - Guard against observing our own reverts (disconnect -> mutate -> reconnect).
- React reconciliation is the primary revert for its managed nodes; the observer makes it immediate
  and covers head + anything outside React.
- Honest limit: the observer itself runs in the attacker's runtime and can be disabled via devtools.
  It stops injection/defacement for normal use; it is not a substitute for server enforcement.

## 5. JavaScript hardening
- **No `window` globals.** The whole app is an IIFE closure; the bridge, tokens, and state live in
  closure scope, never on `window`. Nothing sensitive is reachable from the console.
- **Freeze intrinsics** early: `Object.freeze(Object.prototype)`, `Array.prototype`, `Function.prototype`,
  etc. (SES/lockdown-style) to stop prototype pollution. (Validate no dependency mutates prototypes.)
- **No `eval` / `new Function`.** Strict CSP forbids them.
- **Storage is untrusted:** never put secrets, auth, or authoritative state in local/sessionStorage.
  If persistence is unavoidable, store only an opaque, short-lived, server-signed token that the
  server re-validates; client-side "encryption" is treated as obfuscation only, never as security.
- **Obfuscate** the built bundle (control-flow flattening, string encryption, self-defending). Raises
  reverse-engineering cost; not treated as a security guarantee.
- **Neuter the browser attack surface, in layers:** stub/disable `console.*` (no-ops so the console
  yields nothing), block `eval` / `Function`, remove or no-op default browser APIs the app does not
  need (e.g. context menu / drag-drop / clipboard hooks that only aid tampering), and detect/hinder
  common devtools entry points. Each measure is a **deterrence layer** — a determined attacker who
  controls their own runtime can defeat any single one, so we stack them deep to make tampering
  incredibly hard; the server-side own-security wall (Section 7) remains the actual guarantee.

## 6. Content Security Policy (platform)
- A ServiceNow HTTP Response Header record on our portal: `Content-Security-Policy` with
  `default-src 'self'`, `script-src 'self'` (nonce/hash; NO `unsafe-inline`/`unsafe-eval`),
  `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'self'`. Blocks injected/inline scripts.

## 7. Powerful system context + our own security (the real wall)
- **Mandatory: the engine and all four models run in system context (privileged).** The AI must be
  able to administer/develop/configure the whole instance (create tables, Script Includes, roles,
  portals, etc.), which requires full power. A normally-scoped, ACL-gated app cannot do that.
- **Because we run privileged, ServiceNow's own ACL/scoped security is NOT relied upon** (system
  context bypasses it anyway). We build our OWN server-side security, defense-in-depth:
  1. **Authenticate** the caller (real user identity, never client-asserted).
  2. **Authorize** via our own access model (roles / groups / access map / capability entitlements) —
     our code decides what this user may invoke, per capability, before anything runs.
  3. **Validate** every input as graph-structure-derived (reject raw/unresolvable text — the
     injection defense); dry-run + explicit confirm for mutations; impact analysis before destructive ops.
  4. **Mediate** powerful writes through the system-context execution path (privileged engine / the
     config-write-style event) so the user never needs admin and cannot escalate.
  5. **Audit** every action durably (who, what, when, before/after) — because we hold the power.
  6. **Per-app bridge scope:** each generated app gets a dedicated bridge exposing only the
     capabilities in scope for it — least privilege per app, enforced by our engine.
- Since we hold platform-level power, this own-security layer must be rock-solid; it is built
  defense-in-depth and IS the actual security guarantee (the client hardening above only raises the
  bar in the browser).

## 8. Deliverable shape
- One thin AngularJS bootstrap widget + one obfuscated React bundle per app; backend logic in big
  ES5 Script Includes (code-as-data), system properties near-zero; delivered as an application
  package (`<unload>` XML), never update sets.
