# Real AI Architecture — four models, powerful across all four layers

Directive: each of the four models must be **really powerful, not just knowledgeable** —
strong across every layer: **knowledge -> reasoning -> collaboration -> capabilities**.
Not loose concepts: real, running artificial intelligence. This document is the build
contract. Every model is a **neuro-symbolic system**, never a bare language model.

## The four models
1. **Enterprise Intelligence Model (EIM, flagship)** — the single owner of ALL
   ServiceNow-specific knowledge and capability: ServiceNow development, instance
   configuration, administration; **Jelly**; the full server + client **Glide APIs**;
   Service Portal / widgets / UI Pages / UI Builder; and the **Developer-site** content
   (developer.servicenow.com tutorials, Fluent SDK, articles). Owns the executable
   capability catalog over the whole instance. Any ServiceNow question or action, from any
   model, is ultimately EIM's domain. (General HTML/CSS/JS fundamentals are NOT ServiceNow
   knowledge and are NOT EIM's — see Technology Intelligence.)
2. **Enterprise Assistant Model** — the single conversational voice to the user; gathers
   requirements, orchestrates, delegates silently, composes one first-person answer.
3. **Technology Intelligence Model** — the model that **actually builds the web apps**:
   embedded-React Service Portal frontend backed by big ES5 Script Includes. It is a full,
   production-grade **web engineer** (see TECHNOLOGY_INTELLIGENCE_SCOPE.md), not a
   fundamentals model. Its own deep knowledge: HTML/CSS/JS in depth, **React and the
   embedded-React-in-Service-Portal pattern** (thin AngularJS bootstrap -> closure-scoped
   data bridge -> React DOM takeover), the build+obfuscation toolchain, browser platform +
   advanced web tech (MutationObserver anti-tamper, CSP/SES, **WebGPU/WASM** for in-browser
   model inference, Canvas/SVG, a11y, performance), and the hardened house style. Real build
   capabilities: scaffold the React app, emit the bootstrap widget + bridge, build+obfuscate
   the bundle, apply the house style. It is **NOT a ServiceNow knowledge source**: for every
   ServiceNow-specific artifact (the widget record, sp_page/portal wiring, Jelly, the
   server-side Script Include backend + data-bridge script, Glide, config, capability
   execution) it **collaborates with EIM**. Web craft here, ServiceNow in EIM, joined by
   collaboration.
4. **Integration Intelligence Model** — external-API integration (Flexera, Microsoft
   Graph/M365/Entra/Intune, SolarWinds, AWS, Azure); auth, endpoints, extraction, mapping.

## The stack every model runs (all four layers)
A model = a **trained neural core** wrapped by the **shared neuro-symbolic runtime
ensemble**. Both the corpus (training) and the runtime (inference) must realize all four
layers; a layer present in training but absent at runtime (or vice-versa) is a defect.

### Layer 1 — Knowledge (grounding)
- **Training:** crawled ServiceNow dev/config/admin docs + the knowledge graph
  (13k+ nodes / 21k+ edges) + node explanations. Plus the augmentation corpus: **Jelly**,
  **full server+client Glide API** (every class/method), **HTML/CSS/JS fundamentals**,
  and per external platform for Integration. Model-specific banks (HARDENING_BANK for
  Technology, PLATFORM_BANK for Integration).
- **Runtime:** **GraphRAG** (BM25 + dense retrieval over the corpus + graph) grounds every
  answer in retrieved, citable knowledge. The model never free-associates facts; it
  retrieves, then reasons. Retrieval is answer-centered (dual-level: entity + community).

### Layer 2 — Reasoning
- **Training:** CoT chains, reasoning paths, and graph-relation chains baked into every
  corpus (present in all four generators — verified).
- **Runtime, the ensemble that makes reasoning *powerful*, not just chatty:**
  - **Neural core** — from-scratch decoder-only transformer (flagship ~1.03B target;
    per-model cores), CoT-prompted.
  - **Graphify** — the knowledge graph as an explicit reasoner: multi-hop path finding
    between entities, so a chain of relations is *computed*, not hallucinated.
  - **Slime-mold (Physarum) reasoning** — flow/energy over the graph (gamma=0.8) that
    reinforces high-value reasoning paths and prunes dead ones; gives the model a
    non-neural, convergent search over the solution space.
  - **CoT-RAG loop** — retrieve -> reason a step -> retrieve again on the new sub-question,
    until the chain closes. Reasoning and knowledge interleave.
  - **Verifier** — a graph-structure check on every reasoning conclusion before it is
    allowed to drive a capability (the anti-hallucination gate).
  The neural core proposes; graphify + slime-mold + the verifier make it *correct*.

### Layer 3 — Collaboration (the strongest layer, by mandate)
Each model holds a clean, non-overlapping scope; **collaboration is how a request that
crosses scopes is served.** Because scopes do not overlap, collaboration is not a fallback
— it is the primary mechanism, and it must be the most robust part of the whole system.
The scope boundaries that make collaboration necessary:
- **EIM** = all ServiceNow knowledge + capability (dev/config/admin, Jelly, Glide, Service
  Portal/widgets/UI Pages, Developer-site content).
- **Technology** = general web engineering only (HTML/CSS/JS + house style). It has NO
  ServiceNow knowledge of its own; it **must collaborate with EIM** for every
  ServiceNow-specific fact or capability it needs while building an app.
- **Integration** = external-platform API knowledge; collaborates with Technology (and via
  EIM for the ServiceNow-side plumbing) when an app needs external data.
- **Assistant** = the single user-facing voice; orchestrates the others.

**Collaboration is a genuine multi-round DISCUSSION, not a single handoff.**
When a request crosses scopes, the Assistant opens a working session among the relevant
models and each one brings its OWN powerful reasoning to the table:
- **EIM** reasons about ServiceNow feasibility: the right tables/fields, Script Includes,
  widgets, capabilities, constraints, and platform limits.
- **Technology** reasons about the web-app design, the embedded-React build, and house style.
- **Integration** reasons about the external data: source, auth, endpoints, extraction shape.
They exchange proposals and questions across **multiple rounds**, question and refine each
other (e.g. Technology proposes a layout and asks EIM whether a field exists and how to read
it; EIM answers and flags a constraint; Technology adapts; Integration proposes a data source
and EIM plans the outbound plumbing; they reconcile), until the discussion CONVERGES on an
implementation plan + demo skeleton. **The Assistant returns to the user whenever necessary**
— a missing requirement, a decision, a trade-off, or an approval — in one clear voice, takes
the answer back into the discussion, and the loop continues until the plan is agreed and
built. The models' reasoning is genuinely utilised in the discussion; it is a real
deliberation, not a scripted exchange.

- **Training:** explicit 4-model collaboration traces (verified in gen_assistant.py):
  PLUS the new **multi-round inter-model discussion transcripts** — the internal deliberation
  (each model's reasoning turns, back-and-forth refinement to convergence) interleaved with
  the Assistant's user check-ins, so all four models learn to reason together and to surface
  to the user at the right moments. The user only ever sees the composed Assistant voice.
  the Assistant silently delegates a work order to a peer, receives the result, and composes
  ONE first-person, user-facing answer (never "Technology Intelligence told me..."). We ALSO
  generate the **Technology -> EIM ServiceNow-knowledge collaboration traces** (Technology
  asks EIM "how do I do X in ServiceNow" / "give me the Glide/Jelly/widget for Y", EIM
  answers grounded, Technology consumes it in the build) and the Integration <-> Technology
  external-data traces. These cross-scope handoffs are a first-class, heavily-weighted part
  of every corpus, not an afterthought.
- **Runtime — a real protocol, not a prompt trick:**
  - Structured **work order** (intent + resolved entities) -> peer runs its own full stack
    (knowledge/reasoning/capabilities) -> structured **result envelope** back. Typed,
    validated, auditable messages between models; not free-text nudging.
  - **Technology never guesses ServiceNow**: at build time, every ServiceNow-specific need
    routes to EIM via a work order; EIM returns grounded Jelly/Glide/widget/config; the
    verified result flows into Technology's build. One source of ServiceNow truth (EIM),
    consumed everywhere by collaboration.
  - Assistant is the sole voice; Technology <-> Integration collaborate behind it for
    external data (Technology the bridge point, Integration the API specifics).
  - Every delegated fact stays verbatim/grounded — collaboration must not invent facts.

### Layer 4 — Capabilities (executable, in system context)
- **Training:** the capability catalog (capability_traces.jsonl, ~185MB) generated over the
  graph — create/configure/read/update/activate for every knowledge area, with the exact
  Glide/Jelly/REST code and the reasoning that selects it. Folded into EIM + Assistant.
- **Runtime — this is where "powerful" is literal:**
  - Every capability is an **executable operation** run in **system context (privileged)**,
    gated by **our own server-side authorization engine** (NOT ServiceNow ACLs — see
    HARDENED_HOUSE_STYLE.md sec 7). Authenticate -> authorize (our access model) ->
    validate (graph-structure-derived inputs only) -> dry-run + confirm for mutations ->
    mediate the privileged write -> audit.
  - Inputs to a capability must be **graph-resolved**, not raw text — the injection defense
    and the reason the model can hold full instance power safely.
  - **Per-app bridge scope**: each generated app gets a dedicated bridge exposing only its
    in-scope capabilities (least privilege per app).

## All four models pushed to the limit (parity mandate)
No model is a lightweight. Each gets a deep corpus + the full ensemble across all four layers.
- **EIM** — the full ServiceNow platform corpus (21k+ pages, all platform books) + doubled
  knowledge graph (26k nodes / 51k edges) + capability catalog. DONE/rebuilt.
- **Technology** — deep web-engineering corpus: MDN (HTML/CSS/JS, the full Web API/DOM
  platform incl. WebGPU/WASM, SVG, a11y, performance, security, HTTP) + React (react.dev
  reference + Learn) + the embedded-React Service Portal pattern + house style. ~12.7k pages.
- **Integration** — deep external-platform API corpus, gathered from authoritative sources:
  **AWS** (botocore service models: Cost Explorer, CloudWatch, EC2, S3, IAM, Organizations,
  Config, CloudTrail, resource/tagging, compute-optimizer, savings/pricing, and more — every
  operation + data shape + docs), **Microsoft Graph / M365** (users, groups, devices,
  licenses/subscribedSkus, directoryRoles, reports, SDK/paging/throttling), **Entra** (OAuth2
  client-credentials + app scenarios + tokens + managed identities), **Intune**
  (deviceManagement), **Azure REST** (Resource Manager, Monitor metrics/logs, Cost
  Management), **SolarWinds** (Orion SDK / SWIS / SWQL), **Flexera** (best-effort). Per
  platform: auth pattern, endpoints, data models, pagination, rate limits, extraction, and
  the mapping into a ServiceNow outbound integration (the ServiceNow side via EIM collab).
- **Assistant** — pushed to the limit on the layers that ARE its power: a **massive, diverse
  conversation + orchestration + composition corpus**. Requirement-gathering dialogues across
  many app scenarios; the full factory flow (catalog item -> conversation -> implementation
  plan -> demo skeleton -> build); closed-loop guidance interactions (operations-intelligence
  style); typed work-order delegation to all three peers and first-person composition of their
  results (never naming a helper); breadth grounding across all four domains so routing is
  flawless. It is the strongest orchestrator + conversationalist, not a thin router.
  **General human-interaction breadth (mandatory, since from-scratch):** the Assistant must
  handle ANY human input, so the corpus explicitly trains: greetings + small talk; formal /
  casual / terse / verbose / rambling registers of the same intent; etiquette (please, thanks,
  apologies, goodbyes); **gibberish and unclear input handled by reasoning about intent** and
  asking a clarifying question rather than failing; vague/indirect requests inferred and
  confirmed; **multi-turn context awareness** (resolving "that one" / "the second" / pronouns
  against earlier turns); long user explanations summarized back before proceeding; graceful
  **out-of-scope redirects** (stays in persona, steers back to what it can do); and small-talk
  -> task transitions. Implemented by gen_conversation.py (folded in via gen_augment.py) with
  combinatorial register/slot variety, and extensible: this list is representative, not
  exhaustive, and grows as new interaction patterns are identified.

## Runtime placement
- Compact, quantized (QAT/int8) neural cores + the ensemble (graph, slime-mold, RAG index,
  capability engine, own-security) are packed as **code-as-data into big ES5 Script
  Includes** (<=4MB each, hundreds), executed in **Rhino / system context**. Heavier neural
  inference may run in the **client browser via WebGPU** where model size permits (<~3B),
  with the authoritative capability + security layer always server-side. System properties
  near-zero.

## What "powerful across all layers" concretely requires (acceptance)
For **each** of the four models, all four must hold:
1. Knowledge: answers are retrieved + grounded + citable (GraphRAG), covering its full
   domain incl. the Jelly/Glide/HTML-CSS-JS augmentation for EIM.
2. Reasoning: multi-hop conclusions are graph-verified, not just neurally plausible
   (neural + graphify + slime-mold + verifier all live at runtime).
3. Collaboration: the model participates in the work-order/result-envelope protocol with
   its peers, Assistant as sole voice.
4. Capabilities: it can *execute* its domain operations in system context under our own
   security, inputs graph-resolved, every action audited.

A model that is only layer-1 strong (knowledgeable) is INCOMPLETE. The bar is all four.

## Build sequence (unchanged gate)
big corpus (running) -> Jelly/Glide/HTML-CSS-JS augmentation -> CPU baseline + deploy-path
validation (pack -> Rhino/browser inference -> in-instance test) -> **GPU approval gate**
(all four cores at scale) -> pack compact cores + ensemble into big Script Includes on the
PDI -> build the enterprise-intelligence web app (hardened house style) + per-app bridges ->
tamper-test. The GPU spend is the single approval gate.
