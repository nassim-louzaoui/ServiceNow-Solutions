# Enterprise Intelligence — MASTER CONTEXT (authoritative memory)

> **Purpose of this file:** the single source of truth so that after ANY context reset,
> container reset, or session loss, the complete and CORRECT understanding of this project
> is recoverable and work continues without repeating past mistakes.
> **Durable copies:** (1) this repo `nassim-louzaoui/servicenow-solutions` (GitHub — most durable),
> (2) OCI box `/home/eiagent/ei/status/MASTER_CONTEXT.md`, (3) object storage `ei-control/meta/MASTER_CONTEXT.md`.
> Keep all three in sync. Update this file whenever understanding or state changes.

_Last updated: 2026-07-20._

---

## THE DEFINITIVE DESIGN (from the user's actual instructions across all sessions — follow exactly)

### The product: an AI factory for building ServiceNow portal web applications
Users interact with the **Enterprise Assistant** (single voice). Through a Service Catalog, the
four collaborating models design + build embedded-React Service Portal web apps (frontend) + big
ES5 Script Includes (backend), deployed into `x_solutions`, each with its own per-app security
bridge. All in the hardened house style, running on the models' OWN system context.

### The four models and their EXACT scopes (all run IN the instance, all from-scratch)
- **Enterprise Intelligence Model (flagship, 1.03B, val 0.40)** — expert in ALL ServiceNow:
  administration, development, instance configuration, **Glide**, **Jelly**, ServiceNow JS objects,
  Developer-site + Administrator-site knowledge, and all associated capabilities. (HTML/CSS/JS was
  deliberately moved OUT of EIM to Technology.)
- **Enterprise Assistant Model (706M, val 0.09)** — a genuine LLM (analyze intent → reason →
  generate contextually; NOT pattern matching / predefined responses). Handles ANY human input
  (small talk, formal/casual/terse/verbose, gibberish, etiquette, context follow-ups). The single
  user-facing voice.
- **Technology Intelligence Model (317M, val 1.45)** — web engineering: embedded-React, AngularJS
  lockdown, DOM cleanup/takeover, service-portal security lockdown, builds the portals (frontend) +
  Script Includes (backend). Collaborates with EIM for ServiceNow-specific knowledge.
- **Integration Intelligence Model (405M, val 0.48)** — external API integration: Flexera,
  Microsoft/M365/Graph/Entra, SolarWinds, AWS, Azure.

### KNOWLEDGE = NEURO-SYMBOLIC (trained-in weights + runtime graph/retrieval ensemble)
The system is neuro-symbolic (per REAL_AI_ARCHITECTURE / BOX_ENHANCEMENT / PRODUCTION_HARDENING).
Each model = trained neural core WRAPPED by a runtime ensemble: **graphify + slime-mold + GraphRAG
retrieval grounding + verifier**. Base knowledge is trained INTO the weights, AND the runtime graph +
retrieval index are CORE and intentional because they: (1) ground every answer / anti-hallucination
gate (retrieve-then-reason, verifier before any answer or capability), (2) are how NEW knowledge is
added for FREE without retraining (Pillar 1 incremental ingestion — the whole "no future GPU retrain"
mandate), (3) make generated ServiceNow code correct (graph-grounded generation).
WHAT IS DEAD: only the old dim-80 TOY's standalone `KnowledgeStore`/`Mesh`/`CapabilityKnowledge` as a
*substitute* for a real model. Now the models are real; the graph/retrieval is their grounding
ensemble, NOT a substitute — it must be REBUILT as the ensemble (code-as-data, client + server), not
dropped. (Correction: I earlier wrongly said "drop the knowledge layer entirely" — that contradicted
the design; the ensemble stays.)

### Collaboration is the strongest part
Genuine multi-round DISCUSSION between the models (each model's reasoning engaged, like a real
discussion), returning to the user when needed. Assistant is the only one talking to the user.

### The enterprise-intelligence web application (the platform front end — NOT operations intelligence)
An embedded-React Service Portal in `x_intelligence`, house style. First nav tab **"Assistant"** =
a **Service Catalog** + the **Enterprise Assistant chat**. Service Catalog Category **"Enterprise
Solutions"** with three catalog items, each a closed-loop chat interaction:
1. **New Solution Development** — gather requirements → show web-app layouts as clickable tiles →
   popup preview of the actual shell skeleton → user picks a shell → Assistant gathers nav-bar
   modules + content per module + optional special access control → if access control requested,
   auto-create an **Access Management Module** visible to Administrator/Developer/Management/Owner
   roles → build the app into `x_solutions`.
2. **Existing Solution Maintenance** — pick an existing `x_solutions` web app → tag it at the top of
   the Assistant chat → define adjustments to its modules.
3. **Module Bridge Maintenance** — pick an existing web app → analyze/tune the capabilities in that
   app's bridge toward the Enterprise Assistant.

### The concrete deliverable to build (via the 3 catalog items, in a browser session)
**operations-intelligence-new** in `x_solutions` — an enhanced replication of the everestdev
`operations-intelligence` portal (reference it for VISUALS + the Operations Workspace closed-loop
concept only), using our models + hardened house style, so the old one can be retired.

### House style (hardened — reference operations-intelligence visuals)
Strip the Service Portal DOM head/body and replace with the web app's; anti-tamper (revert any
DOM change not made by our app, MutationObserver); obfuscation; NO window globals; secure storage;
stub/disable console + eval + default browser APIs; NO default browser CSS (custom content-area
scrollbars only, everything in the viewport, no page/horizontal scroll); **perfect symmetry
mandatory**; vh/vw units only; icon height = adjacent label text height; same palette + navbar +
header + content-area shell; AngularJS locked to a bare-minimum bootstrap that hands off to the
embedded-React package. Tampering must be made as physically impossible as possible.

### Scope of work NOW (user, line 1378): only these, decide the rest later
The existing roles + the enterprise-intelligence web application + the four models. Focus
`x_intelligence` + `x_solutions`. Defer `x_maintenance`.

### Every user-facing text
Professional, precise, each sentence on its own line, and **never the "-" character** (it reveals
generated text). Never reference any AI tool/model/vendor name in any ServiceNow artifact or commit.

---

## 0. HARD RULES — mistakes never to repeat

1. **Operations Intelligence is NOT the Enterprise Intelligence platform front end.** It is
   (a) the earlier app in scope `x_infte_ops_int` (on the everestdev instance), and
   (b) the HOUSE-STYLE visual/build standard every portal follows. The platform *produces/rebuilds*
   it as a solution (`operations-intelligence-new`) into `x_solutions`. Do not confuse the two.
2. **All FOUR models run IN the instance.** (Not "two in-instance, two build-time" — that was an
   earlier/superseded framing in `03_scoped_applications.md`.)
3. **Runtime split:** heavy neural generation runs **client-side (browser)**; the secure
   agentic/capability layer runs **server-side (Rhino Script Includes)**. The OCI box is
   **development only** — never a runtime. The GPU was **one-time training only** (done, deleted).
4. **Deploy ONLY to the Enterprise Intelligence scoped app in the PDI `dev283926`** — scope
   `x_intelligence` (sys_scope id `6fda1f2583460710f36fec80ceaad3e1`). NEVER deploy EI content to
   `x_infte_ops_int` / everestdev.
5. **From-scratch only.** No pretrained/open-weight bases. Owned IP.
6. **Code-as-data in big Script Includes, near the ~4MB limit; zero system properties** unless
   truly unavoidable (the older property-based storage is being retired).
7. **Save work durably** (box + object storage + repo) continuously, so a reset never loses context.
8. **Read the actual sources before acting** — the OCI box (`/home/eiagent/ei`), the live PDI, and
   THIS repo. Do not reconstruct from memory or assume.

---

## 1. What the product is

**Enterprise Intelligence** — a neuro-symbolic AI platform on ServiceNow. Four from-scratch,
owned GPT models deployed as code-as-data. It is a **solution factory**: users ask the
**Enterprise Assistant** (the single user-facing voice) to build and maintain ServiceNow
solutions; the models collaborate to do it; solutions deploy into `x_solutions`.

### The four models (all in-instance, served as ~910 Script Includes in `x_intelligence`)
| Model | Params | Chunks | Role |
|---|---|---|---|
| Flagship EIM | 1.03B | 376 | core reasoning/generation |
| Enterprise Assistant | 706M | 260 | single user-facing voice, intent+dialogue |
| Integration Intelligence | 405M | 153 | integration patterns specialist |
| Technology Intelligence | 317M | 121 | portal/tech build specialist |

Architecture (identical for all 4): decoder-only GPT, pre-norm, exact-GELU, no bias, LayerNorm
eps 1e-5, **weight-tied wte/lm_head**, vocab 16000 byte-level BPE. int8 per-row quant. Packed as a
contiguous byte-stream: `EI_<model>_weights_*` (base64 payload), `EI_<model>_manifest_*` (offset
table JSON), `EI_<model>_tokenizer_*` (BPE JSON). Manifest `tensors[]` gives weight/scale offsets.
Val losses: technology ~1.45, integration ~0.48; flagship/assistant fine.

### The three scoped apps (all already exist on dev283926)
- **`x_intelligence`** (Enterprise Intelligence) — core + the intelligence + the build environment
  + the platform front end. Roles: `owner, administrator, developer, management, implementer`.
- **`x_solutions`** (Enterprise Solutions) — deployment target for built solutions; calls back into
  `x_intelligence`. Currently empty.
- **`x_maintenance`** (Intelligence Maintenance) — guardian: monitoring + the slime-mold
  safe-improvement engine + recovery/training control plane. Role: `artificial_intelligence`.
  Has `IntelligenceMaintenanceRecovery`.

### The factory (Service Catalog items)
New Solution Development · Existing Solution Maintenance · Module Bridge Maintenance.
Each built solution: house style + its own security bridge. Four-model collaboration uses the
`<|system|>` tokenizer channel; the Assistant is the only voice the user sees.

---

## 2. Control chain / infrastructure (how to reach everything)

- **Control container (me) = ORCHESTRATOR.** **OCI box `ei-builder` = the autonomous BUILD AGENT:
  it runs Claude Code CLI** (`/usr/local/bin/claude`, `@anthropic-ai/claude-code`, authed via
  `CLAUDE_CODE_OAUTH_TOKEN` in `/home/eiagent/.claude_env`; charter at `/home/eiagent/ei/CLAUDE.md`).
  **THE INTENDED MODEL: I hand the box's Claude high-level build MISSIONS; it does the heavy local
  work (16 vCPU / 64 GB, open internet, can install anything, Node/Dawn WebGPU, training, packing,
  code) under `~/ei/out`; I review its deliverables and perform the PRIVILEGED actions it cannot
  (PDI deploys, object storage, git push).** The box Claude has NO PDI/cloud creds by design; it
  requests privileged actions via `~/ei/broker-outbox/req-*.json`. Do NOT hand-run the box's build
  work through one-off mailbox scripts — DELEGATE it to the box Claude.
- **Launching the box Claude (must run AS user `eiagent`, NOT root):** the mailbox executor runs as
  root and Claude refuses `--dangerously-skip-permissions` as root. Pattern:
  `runuser -l eiagent -c 'cd ~/ei && source ~/.claude_env && export PATH="$PATH:/usr/local/bin" &&
  nohup claude -p "$(cat ~/ei/mission_X.txt)" --dangerously-skip-permissions --verbose > ~/ei/status/X.log 2>&1 &'`.
  Ensure any files I pre-create are `chown eiagent:eiagent` (root-owned files block eiagent writes).
  The agent appends progress to `~/ei/status/*_progress.md` and writes a DONE marker when finished;
  poll those + `~/ei/out/` via the mailbox. `~/ei/run_mission.sh` is the reference launcher.
- **Mailbox runbox (for MY orchestration commands, not for build work):** `bash /root/.oci/runbox.sh
  <script.sh> <maxpoll>` writes the script to the box, executor `eic.sh` (systemd, runs as ROOT)
  runs it, output returns. One command at a time. Use it to launch/poll the box Claude and to run
  my privileged deploys — not to hand-build what the box Claude should build.
  **CRITICAL: NEVER run a long/blocking process in a mailbox foreground command** (e.g.
  `runuser ... node bigjob` without `nohup ... &`). `eic.sh` runs `bash cmd.sh` and WAITS; a
  foreground long job wedges the mailbox for everyone (learned the hard way — a 95-min lavapipe node
  froze the channel). Always launch long work as `nohup ... &` and poll separately.
- **Box recovery channels (when the mailbox is wedged):** the instance is `ei-builder`,
  OCID `ocid1.instance.oc1.eu-frankfurt-1.antheljrueyhwpaclow6ag7fg4cfricatly4ql6dnbgjs37uehtz5swd7t5q`,
  region eu-frankfurt-1, public IP 92.5.117.206, tenancy/compartment
  `ocid1.tenancy.oc1..aaaaaaaahecih3azbru7xw6dplrw3zsx3pgcb4r4oko7aj6pbimzlrrmcjgq`. OCI CLI:
  `/root/.oci-venv/bin/oci` (works over the HTTPS proxy). (1) **OCA Run Command** (bypasses the
  mailbox): `oci instance-agent command create --compartment-id <T> --timeout-in-seconds N
  --target file://{"instance-id":IID} --content file://{"source":{"source-type":"TEXT","text":SCRIPT},"output":{"output-type":"TEXT"}}`;
  poll with `command-execution get --command-id <id> --instance-id <IID>`. BUT it runs as
  UNPRIVILEGED `ocarun` (cannot kill eiagent procs or `systemctl`), and its inline TEXT output comes
  back EMPTY — so have the script `curl -X PUT` its output to object storage `out/<name>.txt` and
  read that. (2) **Reboot to clear a wedged mailbox:** `oci compute instance action --instance-id
  <IID> --action SOFTRESET`; box returns in ~40s, `eic.service` auto-starts (enabled), `/tmp/mgpu_env3`
  (lavapipe) SURVIVES reboot, models are on persistent disk. `ssh` is not available in the control
  container and outbound 22 is likely blocked — use OCA / reboot, not SSH. Key at `/root/.ssh/ei_box.pem`.
- **PAR URL (object storage `ei-control` bucket, read+write, plain curl, no creds):**
  `https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/-fvZyjo7sfHJLLt6pvb_7QxVPQldq-zvZlxgL0Jg56ivCXiLknA3mSeKBz8uw3Wq/n/fryrxfdwttez/b/ei-control/o/`
  Layout: `models/` (13.3GB int8 bundles + model.pt), `backup/` (code/corpora/runtime tgz),
  `meta/` (RECOVERY.md, MASTER_CONTEXT.md, screenshots), `src/` (source tarballs, PDI scaffold dump).
- **PDI:** `https://dev283926.service-now.com`, admin / `mItR4%Se3E/w` (control creds in
  `/root/.pdi.env`). **Interactive-user API auth is blocked** → use a real browser session for auth.
- **Browser login helper (box):** `/home/eiagent/login_helper.py` — Playwright Chromium login,
  prints `{"cookie","gck"}`. MUST set `PLAYWRIGHT_BROWSERS_PATH=/home/eiagent/.cache/ms-playwright`
  (already patched into the helper; root executor otherwise looks in /root/.cache).
- **Scope switch for deploys:** ServiceNow forces new records into the session's CURRENT app and
  ignores the `sys_scope` field. To deploy to `x_intelligence`, after login PUT
  `/api/now/ui/concoursepicker/application` `{"app_id":"6fda1f2583460710f36fec80ceaad3e1"}`.
  Deploy scripts on box: `/home/eiagent/ei/deploy_parallel.py` (proven, 8 workers, re-login on 401,
  preflight scope guard).

---

## 3. Current state (verified 2026-07-20)

### PDI `dev283926`
- **`x_intelligence`: CLEANED (Phase 0 done 2026-07-20) — now exactly the 910 `EI_*` model
  Script Includes and NOTHING else** (0 `x_intelligence.*` properties). Deleted: old app
  (`EnterpriseIntelligenceModel/Core/Operations/Discovery/Security/AssistantModel`, `KnowledgeStore`,
  `KnowledgeShard0-3`, `AdaptiveKnowledgeMesh`, `CapabilityKnowledge`, `EnterpriseIntelligenceBuilder`,
  `EnterpriseIntelligenceDesign`), my experimental `EI_infer_engine`/`EI_runtime` + the "EI Runtime
  API" Scripted REST, the char-level toy model + all `eim/kstore/krouter/mesh.part.*` + junk props.
  No export was taken (models are secure on the box `out/si2` + object storage `models/`, redeployable).
  The old app code is still recoverable from object storage `src/pdi_scaffold_scripts.txt` if ever needed.
- `x_solutions`: empty. `x_maintenance`: `IntelligenceMaintenanceRecovery` only. (Both left as-is.)
- **BACKEND IS PRODUCTION-CLEAN (2026-07-21): NO custom REST API.** `x_intelligence` backend =
  exactly the 910 `EI_*` models + 8 engine Script Includes (`EnterpriseIntelligenceRuntime`,
  `Core`, `Discovery`, `Operations`, `Security`, `Model`, `Builder`, `EnterpriseAssistantModel`) +
  the portal records. The Phase 1 Scripted REST "Enterprise Intelligence API" (`sys_ws_definition`
  + its 7 ops catalog/manifest/tokenizer/chunk/verify/brain/diag) was **DELETED** — verified 0
  `sys_ws_definition` / 0 `sys_ws_operation` in scope, endpoints now 404/400. Its capabilities were
  MOVED into the widget server bridge (below), which is the SOLE server entry point. No business
  rules, client scripts, processors, scheduled jobs, UI actions/pages, or REST messages in scope.
  Engine API: `EnterpriseIntelligenceRuntime` `.catalog()/.manifest(m)/.tokenizer(m)/.weightChunk(m,part)/.verify(m)`;
  `EnterpriseIntelligenceModel` `.capabilities()/.plan(goal)/.execute(plan,opts)/.achieve(goal,opts)/.howto(q,rel)/.tokenize(t)/.models()`;
  `EnterpriseAssistantModel.respond(text)`; `EnterpriseIntelligenceOperations` `.capabilities()/.describe(table)`.
  (Note: `_kstore/_mesh/_capk` grounding return null since the standalone knowledge SIs were removed
  in Phase 0 — the real generation is the four neural models running client-side.)
- **CLIENT-SIDE INFERENCE — FUNDAMENTAL PROVEN, PERFORMANCE IS THE OPEN FORK (2026-07-21).** The
  real pipeline is built + bundle-ready in the portal: `src/vendor/infer.js` (the box-validated
  `EI_client_infer` forward pass, UMD→ESM), `src/vendor/tokenizer.js` (byte-level BPE), `src/model.js`
  (bridge-driven loader `manifest`+`tokenizer`+`chunk` → `buildModel`, plus streaming greedy `generate`).
  PROVEN in Node against the exact bridge-served format (see `CLIENT_INFERENCE_PROOF.txt`): technology
  model (94 tensors, 119 chunks, 339MB, 15L/1280d/16k vocab) builds in 1.9s and produces coherent
  domain text ("How do I create an ACL" → " experience by selecting Create > Experience …"; "A business
  rule is" → " available in secure contexts (HTTPS) …"). **HARD CONSTRAINT: pure JS is ~6.3s/token**
  (no WebGPU kernel in the engine) and the smallest model is 339MB over 119 bridge calls — so a *fast
  interactive* client assistant is NOT viable in pure JS. Making it usable needs WebGPU kernels
  (matmul/attention/layernorm WGSL) — a large build that needs a real GPU to validate (headless has
  none) — and ideally instruction-tuning (base models continue text, they do not follow instructions).
  User chose WebGPU. **WEBGPU ACCELERATION — BUILT + VERIFIED + INTEGRATED + DEPLOYED (2026-07-21),
  built by the BOX CLAUDE AGENT (first correct use of the orchestration model).** `src/vendor/webgpu_infer.js`
  = WGSL compute kernels (embed, layernorm, int8-dequant matmul, exact-erf GELU, residual add, causal
  MHA, tied logits) with `createSession/forward/generate`; uses `navigator.gpu` in the browser, no
  runtime deps. VERIFIED numerically against the pure-JS reference via `@kmamal/gpu` (Dawn + Mesa
  lavapipe software Vulkan on the box): **worst logit diff 1.907e-5 on the real technology model, all
  next-token argmaxes match, 8-token continuations byte-identical**; **9-15x faster than pure JS even
  on software Vulkan** (~310-707ms/tok vs ~5.3s), far faster expected on real GPU. Evidence in repo
  `src/ei-portal-hardened/webgpu/parity_report.md` + `verify_result.json`. `src/model.js` picks WebGPU
  when `navigator.gpu` exists, else the pure-JS engine (never breaks). `AssistantPanel.jsx` has an
  opt-in **"On device"** toggle (default OFF → fast server-routed guidance): ON loads the technology
  model through the bridge (progress) and streams real generated tokens, tagged with the backend used.
  Deployed to `/ei` (client bundle 447KB) and browser-verified (toggle renders, default path intact).
  KNOWN GAPS (from the box agent, honest): no KV cache (v1; per-token cost grows with context),
  per-byte int8 unpack (not u32-vectorized, ~2-4x left), MAX_CTX=2048 compile bound.
- **BROWSER E2E VERIFIED (2026-07-21) — the on-device model LOADS + GENERATES real text in a real
  browser.** Fixed the tab-hang: added a batched `chunks` bridge action (native `indexOf` base64
  extraction, ~8 chunks/call) + `model.js` batched fetch with event-loop yields + LAZY load on first
  message (not on mount). Result on the box's Chrome-for-Testing 148 (Playwright/CDP): closed-loop
  catalog all 3 items pass; the technology model streams in cleanly (`Loading 0%..94%..On device`, tab
  responsive) and GENERATES the byte-correct domain text (`"How do I create an ACL" -> " experience by
  selecting"`). 17/19 checks pass. TWO honest gaps: (1) **load is ~15 min** for 339MB (Rhino/Service
  Portal transport; a binary/attachment delivery would be the real speedup); (2) **generation ran on
  the JS backend, not WebGPU**, because `navigator.gpu` is present on the HTTPS page but
  `requestAdapter()` returns null under headless software Chrome driven by Playwright/CDP (no real GPU
  + a Playwright automation quirk — verified across all flag combos). The app path is correct
  (`navigator.gpu` present -> WebGPU `createSession` -> else JS), so on real user hardware with a GPU it
  uses WebGPU automatically; WebGPU correctness+speed is separately proven on the box via Node/Dawn.
  NOTE: 4 big models resident in one browser tab (2.5GB total, ~15min each) is NOT physically feasible;
  the collaboration must keep the Enterprise Assistant model as the single resident voice with the
  other models consulted via the trained `<|system|>` channel / targeted calls, never a 4-model
  concurrent browser load.
- **Enterprise Intelligence portal (Phase 2, deployed + browser-verified 2026-07-21)** at
  `https://dev283926.service-now.com/ei`. Records in `x_intelligence`: `sp_widget id=ei-portal-app`
  (template `<div id="ei-root"></div>` only; client_script = thin Angular bootstrap that inlines the
  obfuscated IIFE bundle, builds the closure `call()` bridge, dispatches `ei:mount`; **server script =
  the SINGLE server-side bridge**: dispatches `init`/`check_auth`/`load_section`/`assistant_query`
  plus the client model loader `catalog`/`manifest`/`tokenizer`/`chunk`/`verify` to the engine, all
  through `$scope.server.get` (server context, gated), NO REST), `sp_theme "Enterprise Intelligence"`, `sp_page ei_home`,
  container/row/column/instance, `sp_portal url_suffix=ei`. Bundle stored at object storage
  `src/ei_react_bundle.js`; source at `src/ei_hard_src.tgz` and repo `src/ei-portal-hardened/`.
  **HARDENED HOUSE STYLE** (per `docs/design/HARDENED_HOUSE_STYLE.md`): FAITHFULLY REPLICATES the
  LIVE operations-intelligence portal on everestdev — `src/base.css` IS the live portal stylesheet
  (already viewport-based `vw`/`vh`/`%`) rebranded `oi-`→`ei-`, and the React components are the real
  portal components (Sidebar/Header/AssistantPanel/accordion catalog). So the DOM matches the
  reference exactly: dark FULL-WIDTH header (`#293E40`, breadcrumb + date + bell + avatar), dark-slate
  sidebar (brand + nav + Open Service Portal + My Requests + user card), white Service Catalog card
  with the subtab strip + accordion (coloured category bar, count, chevron, expandable item rows with
  Start), and the FULL-HEIGHT Enterprise Assistant right rail (dark header, welcome, green/grey chat
  bubbles, Ask anything input). The three Enterprise Solutions closed-loop items populate the catalog.
  Bridge contract: init / load_section / check_auth / assistant_query. Plus full-viewport DOM takeover (root lifted
  to `<body>`, every platform sibling hidden, no default ServiceNow element visible); MutationObserver
  anti-tamper auto-reverts edits to our style/root; no `window` globals (single self-removing `ei:mount`
  listener); frozen `Object`/`Array` prototypes (Function/String left alone so the legacy host keeps working);
  `window.eval` trapped; local/sessionStorage neutered; console silenced;
  contextmenu + devtools-shortcut deterrents; bundle obfuscated. Verified: shell + 3 catalog cards +
  4 nav + chat render full-viewport, card-click routes into the Assistant, anti-tamper reverts a forced
  `display:none` on root, storage writes blocked. NOTE: strict CSP header (doc §6) deliberately DEFERRED
  — a `script-src 'self'` policy is incompatible with the inline-script Service Portal host and would
  risk the instance; it needs a nonce/UI-Page delivery path. Server-side own-security wall is the real guarantee.
- **PROVEN:** in-instance targeted weight load+dequant is byte-exact (verify endpoint returned
  ok:true, wte row matched PyTorch). Client-side engine generates correct domain text
  (parity vs reference, logit diff 7e-7): e.g. "How do I create an ACL" → coherent output.

### OCI box `/home/eiagent/ei`
- Full pipeline source: `crawler/` (corpus + BM25 + graph), `out/` (deploy=BM25 shards,
  deploy_graph, neural, reranker, reasoning=7 ES5 engines, capabilities=12 caps + authority_gateway,
  ingest, si2=the 910 packed chunks), `train/` (model.py, trainer, export_int8, pack_script_includes,
  tokenizer, corpus_gen, configs, house_style/react_portal, GPU_PLAN.md), `research/`
  (MASTERPLAN.md, REASONING.md), `status/` (progress.md = full build log, RECOVERY.md).
- Runtime code (mine): `runtime/EI_infer_engine.js`, `EI_runtime.js`, `EI_client_infer.js`,
  `es5_tokenizer.js` (all validated).
- Corpora tokenized: flagship ~168M, assistant ~176M, technology ~66M, integration ~52M train tokens.

### Repo `nassim-louzaoui/servicenow-solutions`
- Branch `claude/new-session-jv0b1d`: the **Operations Intelligence portal** source
  (`src/react-portal/`, `build/widgets/oi-portal-app/`, `deploy_portal_v2.py`) — scope
  `x_infte_ops_int` = the house-style reference + use-case. THIS is Operations Intelligence.
- Branch `claude/servicenow-scoped-app-script-hjjksh` (mine): dev branch for this work.
- `main`: near-empty.

---

## 4. The plan (clean rebuild on top of the ready models)

**Phase 0 — Backup + wipe `x_intelligence`.** Export all non-model SIs + all `x_intelligence`
properties to object storage; delete them; **keep only the ~910 `EI_*` model Script Includes**; verify.

**Phase 1 — Server-side core (clean ES5, code-as-data, no junk props).** Model registry/loader over
the chunks (replaces the toy); the agentic brain (capability catalog, plan→execute with
dry-run+confirm+destructive-impact gating) + the missing Builder; knowledge+reasoning grounding
(BM25 + graph + capabilities + ensemble) redeployed clean; security (5 roles) + design system;
secure role-gated chunk-serving endpoint for the browser.

**Phase 2 — Client-side inference + platform front end.** Client engine (typed-array int8, WebGPU +
JS fallback) + ES5 tokenizer; the **Enterprise Intelligence portal** (embedded-React, house style,
`#oi-root`, locked-down Angular bridge, hidden chrome), Assistant as single voice, exposing the
factory catalog. Prove end-to-end in a real browser.

**Phase 3 — Collaboration, maintenance, first solution.** Four-model collaboration (`<|system|>`
channel); `x_maintenance` monitoring + slime-mold improvement + recovery; `x_solutions`
`operations-intelligence-new` (first factory-built solution, house style, own security bridge).

**Status:** Phase 0 DONE (x_intelligence wiped to the 910 model SIs, verified). Next: Phase 1
(server-side core) — build clean on top of the ready models.
