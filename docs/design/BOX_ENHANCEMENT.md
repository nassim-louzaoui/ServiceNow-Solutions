# Box based continual enhancement — one GPU train, then improve forever for free

Directive: there is no future GPU retrain. The four base models are trained ONCE on the
GPU. Every improvement after that happens on the box (CPU) or in the instance, at zero
GPU cost, so cost never compounds. Our neuro-symbolic design makes this natural, because
most of what a system "learns" is knowledge and capability, not neural weights.

Three pillars of enhancement, all free after the single GPU train.

## Pillar 1 — Knowledge (non-parametric, no training at all)
New facts are added by RETRIEVAL, not by touching the neural weights.
- **Incremental ingestion** (crawler/graph_incremental.py, out/ingest/): add a document and
  it is extracted into the existing knowledge graph and index by an idempotent merge, no
  full rebuild. Remove a document and its edges and now-stale nodes are garbage collected.
- The BM25 index, dense vectors, and reranker update the same incremental way.
- At run time the models retrieve this knowledge (GraphRAG), so new or corrected facts show
  up immediately with no retraining. This is the "no full retrain, ever" property from the
  master plan, and it covers the large majority of real improvements.

## Pillar 2 — Behaviour and skills (parametric, cheap, CPU LoRA)  [NEW, built + proven]
When the model's own behaviour, style, or a new skill must change, we adapt the frozen base
with a small LoRA adapter trained on the box CPU, never the GPU.
- **train/model/lora_finetune.py**: injects low-rank adapters (B@A, rank r) into every
  attention and MLP projection, freezes the base weights, and trains only the adapters.
  For a 1B model this is a fraction of a percent of the parameters, so it fits and runs on
  the box CPU for occasional small fine-tunes (minutes to a few hours depending on size).
- **Merge**: `--merge` folds an adapter back into the base weights and writes a new full
  checkpoint, which then goes through the normal export_int8 + pack_script_includes path, so
  the deployed Script Includes simply improve in place.
- **Proven end to end on the box, no GPU**: fine-tune adapter -> merge -> re-export int8 ->
  ready to re-pack. Verified on the baseline checkpoint (adapter 65k params, merge + export OK).
- Adapters are small and composable, so we can keep per-domain or per-app adapters and stack
  or swap them without ever retraining from scratch.

## Pillar 3 — Reasoning and capabilities (code and config)
- The reasoning ensemble (slime-mold, spreading activation, symbolic, planner, graph) and the
  executable capability layer are ordinary code on the box. Sharpen reasoning by tuning the
  ensemble fusion, add or refine a capability, or extend the collaboration protocol, all by
  editing code and re-packing, no training of any kind.

## The rule
GPU is spent exactly once, to give the models their base language and reasoning. After that:
- New knowledge -> Pillar 1 (ingestion, free).
- New behaviour or skill -> Pillar 2 (CPU LoRA, free).
- New reasoning or capability -> Pillar 3 (code, free).
Cost does not compound, and the system keeps getting better on the box indefinitely.
