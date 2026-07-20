# Enterprise Intelligence Model — required expertise (development + instance configuration)

The Enterprise Intelligence Model must be a FULL EXPERT across:
1. **ServiceNow Jelly** — the server-side templating language (`<?xml ... ?>`, `<j:jelly>`, `g:evaluate`,
   `jvar`/`gvar`, phases 1/2, `g2:evaluate`, includes, macros, UI Page/UI Macro usage).
2. **ServiceNow JavaScript objects / Glide APIs** — server-side (GlideRecord, GlideAggregate,
   GlideSystem/`gs`, GlideDateTime, GlideElement, GlideStringUtil, GlideScopedEvaluator, GlideModalV3,
   sn_ws, RESTMessageV2, GlideEmailOutbound, GlideScheduleItem, GlideUser, etc.) AND client-side
   (GlideForm/`g_form`, GlideUser/`g_user`, GlideAjax, GlideModal, GlideList2, spModal, spUtil,
   `g_scratchpad`) — every class + method.
3. **(MOVED to Technology Intelligence)** — general **HTML/CSS/JavaScript fundamentals** are NOT part of
   the Enterprise Intelligence Model. They belong to the **Technology Intelligence Model** (which builds
   the web apps + hardened house style), as originally planned. EIM stays a pure ServiceNow expert:
   ServiceNow development, instance configuration, administration, plus Jelly and the full Glide APIs.
   EIM still knows ServiceNow-native UI construction (UI Pages, UI Macros, Service Portal widgets, Jelly)
   because those are ServiceNow platform artifacts; generic web-language fundamentals are Technology's.
4. **ServiceNow development** — Business Rules, Script Includes, Client Scripts, UI Policies, UI Actions,
   UI Pages, Scripted REST APIs, Flow Designer, Service Portal widgets, ATF, scoped app dev, Fluent SDK.
5. **ServiceNow instance configuration** — forms, lists, views, dictionary, field types, choices,
   reference qualifiers, data policies, catalog + variables, SLAs, workflow/flow.
6. **ServiceNow administration** — users/roles/groups, contextual security/ACLs (as knowledge, though we
   run our own security), system properties, update sets, import/export, scheduled jobs, notifications.
7. **All associated CAPABILITIES** — the executable operation for each of the above (create/configure/
   read/update/activate), grounded + graph-validated, run in system context.

## Gap this exposes (honest) + augmentation plan
VERIFIED (live audit, box): **Glide is fully covered** and was never skipped. The complete ServiceNow
api-reference book (all 1,227 topics) is captured, with method-level class pages: GlideRecord Global
(169 methods) + Scoped (106), 410 distinct API classes total (server + client: g_form, g_user, GlideAjax,
spModal, spUtil, GlideModal, etc.). **Jelly** is present (Jelly tags, syntax extensions, escaping, UI
pages/macros). So core ServiceNow development knowledge is in.

TREMENDOUS EXPANSION (in progress): the original crawl used narrow breadcrumb filters and captured ~6,278
of 16,199 available platform topics. A full-book crawl now captures EVERY topic across the platform books
(application-development, platform-administration, platform-security, platform-user-interface,
servicenow-platform, build-workflows, integrate-applications, mobile, conversational-interfaces,
now-intelligence) plus the already-complete api-reference. Product/process application books (ITSM/CSM/FSM/
industry suites) remain excluded per target. The Developer site (developer.servicenow.com) is probed
separately for its unique tutorial/SDK content (its API reference overlaps the captured api-reference).

Remaining EIM augmentation (ServiceNow-only now):
- **Deeper Jelly** worked examples (UI Pages/Macros) beyond the reference pages.
- **Developer-site** tutorials / Fluent SDK articles where crawlable.
- **HTML/CSS/JS fundamentals are NO LONGER an EIM task** — moved to the Technology Intelligence corpus.
Merged into the flagship corpus (grounded, CoT / answer-centered), retrievable at runtime (RAG).
This runs as the augmentation pass before the GPU run.
