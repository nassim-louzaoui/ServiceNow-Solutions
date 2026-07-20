# 02 — The Three-Layer Architecture

The platform is three scoped applications (the "layers") plus a family of four models.

## Layer 1 — Enterprise Intelligence (`x_intelligence`)

The **core**. Two roles at once:
- **The intelligence itself.** Hosts the owned models (Intelligence Model + Assistant Model)
  as the beating heart of every portal — not as a bolt-on chatbot, but as the reasoning
  substrate the whole application uses.
- **The development environment.** Where authorised users build web applications and
  configure capabilities.

Roles (created): `administrator`, `developer`, `management`, `owner`, `implementer`.

## Layer 2 — Enterprise Solutions (`x_solutions`)

The **deployment target**. Web applications built in Enterprise Intelligence are deployed
here to run. Each deployed application "thinks" by calling back into the Intelligence Model
(hence the `x_solutions → x_intelligence` cross-scope grant). This is where the first real
solution (a rebuild of the earlier Operations Intelligence use-case) will land.

## Layer 3 — Intelligence Maintenance (`x_maintenance`)

The **guardian and control plane**. Three jobs:
1. **Monitoring** — watches the Intelligence Model's health/behaviour.
2. **Safe improvement engine** — a large in-Rhino RULE/KNOWLEDGE engine (not a neural net)
   that, during defined *Maintenance Timelines*, improves the Intelligence Model. It includes
   a **reasoning part that uses "slime-mold" discovery** (decentralised, path-reinforcing
   search over the knowledge/behaviour space) to find improvements. Think of it as an
   organism that continuously probes the model and reinforces the paths that help.
3. **Recovery + training control plane** — records every build/train step durably (so work
   survives interruptions) and coordinates the GPU training compute.

Role (created): `artificial_intelligence`.

## The four models

Two run **inside ServiceNow** (compact, from-scratch, owned); two are **build-time** assets
used to author the solution.

| Model | Where it runs | Purpose |
|---|---|---|
| **Enterprise Intelligence Model** | in-Rhino (ServiceNow), compact | The flagship reasoning model, core of all portals. Trained from scratch on the GPU, then quantised/compacted to run in ES5. |
| **Enterprise Assistant Model** | in-Rhino, compact | Intent + response model over the same tokenizer; the conversational/assistive surface. |
| **Technology Intelligence Model** | build-time (on the GPU box / agent) | A full-scale knowledge/template library the build agent uses to author ServiceNow technology artifacts. |
| **Integration Intelligence Model** | build-time | Full-scale knowledge/retriever for integration patterns/templates used while building. |

The in-Rhino models are the product's runtime brain. The build-time models are tooling that
makes the autonomous agent good at producing the ServiceNow solution.

## Cross-scope wiring (the "3-way" made concrete)

Created as `sys_scope_privilege` records, all `allowed`:
- `x_maintenance → x_intelligence` — Maintenance monitors/improves the Intelligence Model.
- `x_intelligence → x_solutions` — Intelligence deploys built apps into Solutions.
- `x_solutions → x_intelligence` — deployed apps call the Intelligence Model.

## Why "scaled up" from the earlier approach

The earlier application (see `04_earlier_vs_new_approach.md`) reached the ceiling of
rule-based / TF-IDF / keyword retrieval running only inside Rhino. To get genuine
capability and clean IP ownership, the intelligence had to become a real from-scratch
neural model, which requires GPU training that Rhino cannot do. Hence: train on the GPU,
own the weights, deploy compact into Rhino, and maintain/improve it over time — the three
layers make that lifecycle governable.
