# Production hardening and advanced concepts — the definitive addendum

This ties the researched, state-of-the-art concepts into our architecture so the whole
system is production grade: models that self-improve on the box for free, and a factory
that builds correct, valid, tested, and safe ServiceNow applications. Nothing here needs
the GPU after the single base train. It layers on top of REAL_AI_ARCHITECTURE.md,
FACTORY_AND_CATALOG.md, HARDENED_HOUSE_STYLE.md, and BOX_ENHANCEMENT.md.

## Part 1 — Model intelligence (box + inference, free)
1. **Self-improvement flywheel (STaR + our verifier + CPU LoRA).** A model generates
   reasoning over the graph; the symbolic/graph verifier keeps only traces that reach a
   verified-correct answer; those become LoRA training data (lora_finetune.py) folded back
   in on the box CPU. The system gets smarter over time, autonomously, for free, with our
   own graph as the ground-truth signal.
2. **Test-time compute + self-consistency.** At inference the model samples N reasoning
   paths (the slime-mold engine already searches paths in parallel) and selects the one the
   graph verifies, or the majority answer. Small models then reason far above their size,
   with no retraining. Budget-forced (s1-style) for hard queries only.
3. **Mandatory verification gate (chain-of-verification).** Before ANY user-facing answer or
   capability, the claim is checked against the graph/symbolic layer; unsupported claims are
   revised or refused. Anti-hallucination becomes a required pre-answer step, not optional.
4. **Surgical knowledge editing (ROME/MEMIT).** For a single changed fact, write it directly
   into the model's feed-forward layers on CPU in minutes, no training loop. Complements
   LoRA (LoRA = behaviour/skills, MEMIT = specific facts). Added to the box toolkit.
5. **PageRank-style graph seeding (HippoRAG 2).** Sharpen retrieval by fusing dense + sparse
   seeds with Personalized-PageRank-style scoring over the graph; validated as same family
   as our slime-mold/spreading-activation.

## Part 2 — Factory correctness (build time, in-instance, free)
The factory generates and deploys live code, so correctness is the product.
1. **Graph-grounded generation (the correctness backbone).** Every Script Include, Glide
   call, Jelly template, widget, and React binding is generated grounded in the REAL instance
   schema/APIs retrieved from our graph and index, never invented. This is GraphRAG applied
   to code, and it is the single largest defense against hallucinated tables/fields/methods.
2. **Generate -> test -> execute -> self-repair loop.** For each build the factory ALSO
   generates ATF tests (ServiceNow's own test framework, which we trained on), dry-runs and
   executes the artifacts in system context in a sandbox, feeds errors back, and self-repairs
   until the tests pass. Only a passing build deploys. Verification is by tests, not trust.
3. **Grammar-constrained decoding.** Generated ES5 Script Includes, Jelly XML, widget JSON,
   HTTP-header/CSP records, and house-style React are constrained to a formal grammar so a
   structurally invalid artifact is impossible, not merely unlikely. Enforces the house style
   at the token level.
4. **Verified spec + reviewer role.** The Assistant conversation is formalized into a
   structured, checkable specification (elicit -> model -> verify), and the four-model
   discussion includes an explicit reviewer/critic pass that inspects the plan and the
   generated artifacts before shipping. Defects are caught where they are cheap.

## Part 3 — Autonomous-builder safety (the highest-stakes layer)
We build and execute in system context, so a mistake could be catastrophic (the 2025 case of
an agent deleting a production database is the cautionary tale). Our own-security engine is
formalized to the current best practice:
1. **Mandatory Access Control (MAC).** Every capability call is authorized by our own access
   model before it runs; the acting user's entitlements are checked per capability; no path
   bypasses it. Formalized as MAC for agent systems.
2. **Look-ahead impact reasoning + dry-run.** Every write is preceded by required
   impact-analysis (graph-derived) and a dry-run that predicts and shows the effect BEFORE
   mutating. Destructive or irreversible actions cannot run without this.
3. **Human confirmation gates.** Irreversible/high-stakes actions require explicit
   propose -> confirm (already our two-step). Deletes require exact sys_id + a second guard
   field, never broad deletes.
4. **Least privilege per app (the bridge).** Each generated app's bridge exposes only its
   in-scope capabilities; nothing more is reachable. Short-lived, server-signed tokens only;
   never secrets in the client or in prompts.
5. **Graph-resolved inputs only + injection defense.** Capability inputs must resolve to real
   graph entities; raw/unresolvable text is rejected. Full durable audit of who/what/when/
   before/after on every action.

## The through-line
Our graph, own-security, per-app bridge, ATF coverage, and propose/confirm were the right
bones. The research names and sharpens them: graph-grounding makes generation correct,
test+self-repair makes builds work, grammar constraints make artifacts valid, spec+review
makes intent right, and MAC+look-ahead+confirm makes autonomy safe. Combined with the box
self-improvement, this is a system you can trust to build real applications on a real
instance, and to keep getting better without ever spending on GPU again.

## Sequence
These are build-time/runtime and free, so they are implemented during the factory build
phase (after the single base train), in this priority: graph-grounded generation, then the
generate/test/self-repair gate, then MAC + look-ahead safety, then grammar constraints, then
spec+reviewer, alongside the box self-improvement flywheel.
