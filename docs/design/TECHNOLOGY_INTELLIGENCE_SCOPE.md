# Technology Intelligence Model — deep web engineering + the app-build collaboration

Technology Intelligence is the model that actually **builds the web applications**: an
embedded-React Service Portal frontend backed by big ES5 Script Includes. That demands
**significant, production-grade web development knowledge and real build capability**, not
"fundamentals." It is a full web engineer. It is NOT a ServiceNow knowledge source; it
collaborates with the Enterprise Intelligence Model for everything ServiceNow-specific, and
with Integration + Assistant to complete the app.

## 1. Deep web knowledge it must own (its own corpus)
- **Core languages, in depth:** semantic HTML5; CSS (flexbox, grid, custom properties,
  transitions/animations/keyframes, transforms, stacking/containing blocks, responsive
  units vh/vw/clamp, the strict global reset, custom scrollbars, no-default-UA-CSS craft);
  JavaScript ES5 through modern ES (closures, prototypes, modules, promises/async, event
  loop, generators, proxies), TypeScript-level typing discipline.
- **React (the frontend engine), thoroughly:** components, hooks, state, context, refs,
  reconciliation, portals, effects, memoization, error boundaries, controlled inputs,
  performance (avoiding re-renders), and especially the **embedded-React pattern** used
  here: mounting React into a single `#ei-root` node, owning head/body, unmounting cleanly.
- **The embedded-React-in-Service-Portal architecture (the signature capability):**
  the thin AngularJS `api.controller` bootstrap that builds a **closure-scoped data bridge**
  (`call(payload)` -> `$scope.server.get`) and hands it to the React bundle's mount
  function; React takeover of the DOM; stripping platform chrome; promoting to full viewport.
- **Build + hardening toolchain:** bundlers (esbuild/rollup/webpack), transpilation, tree
  shaking, code splitting; **obfuscation** (control-flow flattening, string encryption,
  self-defending); IIFE/closure isolation (no `window` globals); SES/Object.freeze intrinsics;
  strict CSP authoring; source-map hygiene.
- **Browser platform + advanced web tech:** the DOM/CSSOM, Shadow DOM, `MutationObserver`
  (the anti-tamper engine), events/delegation, `fetch`/streaming, Web Storage (as untrusted),
  Web Workers, **WebGPU / WebAssembly** (to run our compact quantized models in-browser),
  Canvas/SVG for data viz, `IntersectionObserver`, `requestAnimationFrame`, accessibility
  (ARIA, keyboard, focus), i18n, performance budgets, memory profiling.
- **The hardened house style** (HARDENED_HOUSE_STYLE.md) as first-class craft: three-column
  shell, palette, perfect symmetry, vh/vw-only, icon height = label height, everything in
  viewport, no page/horizontal scroll, custom content-area scrollbars only, anti-tamper,
  console/eval/browser-API lockdown, per-app obfuscated bundle.
- Sources to gather (external, before GPU): MDN (HTML/CSS/JS/DOM/Web APIs/WebGPU/WASM),
  the React documentation, bundler + obfuscator docs, CSP/SES references, plus curated
  worked examples of the embedded-React Service Portal pattern (from our own reference).

## 2. Real build capabilities it must execute (not just know)
Technology Intelligence can genuinely **produce a working web app frontend**:
- Scaffold the React application (components, state, the data-bridge client, house-style
  shell) for the requested app.
- Emit the **thin AngularJS bootstrap widget** template (`<div id="ei-root"></div>`) + the
  controller that wires the closure-scoped bridge.
- Build + obfuscate the React bundle; author the CSP; wire the anti-tamper engine.
- Assemble everything against the house style with perfect symmetry and viewport fit.
All capabilities run under the own-security, system-context model; the built artifacts are
delivered as an application package (`<unload>` XML), backend in big ES5 Script Includes.

## 3. The genuine app-build collaboration (four models, one app)
A real web app = Service Portal frontend + Script Includes backend, produced together:
- **Assistant** — single voice: gathers requirements conversationally, orchestrates, and
  composes the final response. Never exposes the collaborators.
- **Technology Intelligence** — owns the **web frontend engineering**: the embedded-React
  bundle, house style, hardening, the browser-side data bridge and (where used) in-browser
  WebGPU inference. Whenever it needs a ServiceNow fact/artifact it issues a work order to EIM.
- **Enterprise Intelligence Model** — owns the **ServiceNow platform side**: the Service
  Portal widget record + sp_page/sp_portal wiring, any Jelly, the server-side **data-bridge
  script** and the **big ES5 Script Include backend**, Glide data access, instance
  configuration, and executing the capabilities in system context under our own security.
  It is the authority Technology consults for every ServiceNow specific.
- **Integration Intelligence** — when the app needs external data: supplies the external
  API auth/endpoints/extraction, collaborating with EIM for the ServiceNow-side outbound
  plumbing and with Technology for how the extracted data is rendered.

Division of truth: **web craft = Technology, ServiceNow = EIM, external APIs = Integration,
voice/orchestration = Assistant.** They meet through the typed work-order / result-envelope
collaboration protocol (Layer 3), which is the strongest part of the system. Collaboration
must be trained as heavily-weighted, first-class corpus content: end-to-end
"build app X" traces where Technology and EIM (and Integration when relevant) exchange work
orders and jointly produce the frontend + backend of a genuine, runnable application.

## 4. Corpus + training implication
- Technology corpus is **large and deep**: gathered web-dev/React/tooling references +
  the embedded-React Service Portal worked examples + the full house style + CoT build
  reasoning. Not a thin bank.
- Generate the **build-collaboration traces** (Technology <-> EIM <-> Integration, Assistant
  as voice) into every relevant corpus so all four models learn to build apps together.
