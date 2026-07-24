# 03 — Planned Architecture Per Scoped Application

Each application is built with **Script Includes (code-as-data) + system properties only**
(no custom tables), ES5, strict scope isolation, Title Case names, and is delivered as an
application package.

---

## Enterprise Intelligence — `x_intelligence`

**Purpose:** the core intelligence and the developer build environment.

### Script Includes (existing + planned)
- `EnterpriseIntelligenceCore` *(built)* — core entry point / version + scope identity.
- `EnterpriseIntelligenceModel` *(built)* — the compact in-Rhino flagship model registry:
  `model_meta` / `model_vocab` / `model_weights` system properties, ES5 tokenizer,
  ready-state gating, inference entry points. Weights are loaded from the GPU-trained model.
- `EnterpriseAssistantModel` *(built)* — intent classifier + response over the model's tokenizer.
- `EnterpriseIntelligenceSecurity` *(built)* — centralised role/access gating for all roles.
- `EnterpriseIntelligenceDesign` *(built)* — the single shared design system (tokens + base
  CSS, viewport units); every portal renders from this one source.
- *(planned)* inference/runtime Script Include(s) that expose the model to widgets;
  retrieval/grounding helpers; portal model backends.

### Portals (planned; defined at manifest level)
- `enterprise-intelligence` — the control portal: Insights / Assistant / Solutions /
  Diagnostic tabs (Phase 4).
- `enterprise-directory`, `enterprise-workspace`, `enterprise-bootcamp` — deferred until
  after baseline (see `09_defined_vs_to_define.md`).

### Properties
- `x_intelligence.model_meta` / `model_weights` / `model_vocab` — the compact owned model.
- `x_intelligence.assistant_intents` — assistant intent set.
- design/security config as needed.

---

## Intelligence Maintenance — `x_maintenance`

**Purpose:** monitor + safely improve the Intelligence Model; recovery + training control plane.

### Script Includes (existing + planned)
- `IntelligenceMaintenanceRecovery` *(built)* — durable recovery log
  (`x_maintenance.recovery_log` JSON, `.log(phase,status,detail)` / `.tail(n)`). Every build
  and training milestone is written here so nothing is lost between steps/sessions.
- *(planned)* **Monitoring engine** — samples/observes the Intelligence Model's behaviour and
  records health.
- *(planned)* **Safe-improvement engine** — the large rule/knowledge engine that runs during
  Maintenance Timelines; includes the **slime-mold discovery** reasoning module (decentralised
  reinforcement search for improvements).
- *(planned)* **Training control plane** — coordinates GPU training runs, checkpoints, and the
  deployment of improved compact weights back into `x_intelligence`.

### Frontend (planned)
- `intelligence-maintenance` Service Portal — the maintenance/operator frontend, with
  GitHub Copilot and Claude Code integration surfaces (as discussed) for the operator to
  drive/observe training and improvement.

### Properties
- `x_maintenance.recovery_log` *(built)* — the recovery timeline.
- maintenance schedules, monitoring thresholds, improvement policy (planned).

---

## Enterprise Solutions — `x_solutions`

**Purpose:** the deployment target where built web applications run and call the model.

### Contents (planned)
- Deployed solution applications (the first being a rebuild of the earlier Operations
  Intelligence use-case — see doc 04), each implemented as Script Includes + portal widgets.
- Runtime glue that calls `x_intelligence`'s Intelligence Model (via the allowed cross-scope
  privilege) so deployed apps "think".

### Properties / config
- Per-solution configuration, all scoped to `x_solutions`.

---

## Naming & delivery rules (all three apps)
- Proper Title Case, full words, formal, concise; no abbreviations; no AI-vendor references.
- API/system identifiers follow ServiceNow convention (`x_intelligence.<name>`).
- Delivered as **application packages** (`<unload>` XML of each `sys_app` + children).
  **Never** as update sets.
