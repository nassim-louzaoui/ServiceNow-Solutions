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

- **Control container (me)** → **OCI box `ei-builder` (eiagent)** via object-storage mailbox →
  (H100 GPU was reached from the box; now deleted).
- **Mailbox runbox:** `bash /root/.oci/runbox.sh <script.sh> <maxpoll>` writes the script to the
  box, box executor `eic.sh` (systemd, runs as root) runs it, output returns. One command at a time.
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
- No custom Service Portal widgets/themes yet.
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
