# The Factory: Enterprise Intelligence web app, Service Catalog, and the three flows

This is the build contract for the factory that produces web applications, and for the
first concrete deliverable, operations-intelligence-new. It sits in the build sequence
AFTER the four models are trained and packed, and it uses the same hardened house style,
own-security, and four-model collaboration already specified.

## 0. Sequence (so nothing is out of order)
1. Train and pack the four models (in progress, separate track).
2. Build the **Enterprise Intelligence web app** (the factory) in the x_intelligence scoped
   app: the three-column hardened shell, an **Assistant** area, and a **Service Catalog**.
3. Build the **Enterprise Solutions** catalog category and its three catalog items with
   their closed-loop flows (below).
4. Use the factory, in a browser session, to build **operations-intelligence-new** inside
   the x_solutions (Enterprise Solutions) scoped app, as an enhanced replication of the
   existing operations-intelligence portal.
5. If a catalog item is not good enough for that job, enhance it, then finish the app.
6. Once operations-intelligence-new matches and exceeds the old portal, retire the old one.

Reference for the closed-loop feel: the existing **operations-intelligence** Service Portal
inside the Operations Workspace (already analyzed live: three-column shell, Service Catalog
accordion, Assistant chat, closed-loop guidance). We replicate its look and function, then
improve it with our models, house style, and own-security.

## 1. The Service Catalog, category and items
- **Category:** "Enterprise Solutions" (shown in the Assistant tab's Service Catalog).
- Three catalog items, each launching a **closed-loop interaction** in the Enterprise
  Assistant chat (reasoning-first: analyse intent, collaborate, return to the user):
  1. New Solution Development
  2. Existing Solution Maintenance
  3. Module Bridge Maintenance

## 2. New Solution Development (closed loop)
Purpose: build a brand-new web application into x_solutions.
Flow (gaps filled as concrete design):
1. **Requirement gathering** — the Assistant conversationally gathers purpose, users/roles,
   data sources (internal, and external via Integration), and scope.
2. **Layout selection** — the Assistant presents web-app **layouts as clickable tiles**.
   Each tile opens a **popup preview of the actual shell skeleton** rendered live in the
   hardened house style (real React shell, not a picture). Starter layout set (extensible),
   all house-style compliant, perfectly symmetric, vh/vw only, everything in viewport:
   - **Operations shell** (the operations-intelligence three-column: sidebar nav +
     header + content + right per-section Assistant chat).
   - **Focus shell** (sidebar + header + single large content area, no right chat rail).
   - **Dashboard-grid shell** (sidebar + header + symmetric KPI/content grid).
   - **Split shell** (sidebar + header + two balanced content panes).
   The preview is the genuine skeleton so the user judges the real thing.
3. **Module definition** — after the user picks a shell, the Assistant gathers, per
   navigation module: the module's name/label (Title Case, full words, no dash), and the
   **content of its content area** (what it shows/does). The Assistant collaborates with
   Technology (frontend build) and EIM (ServiceNow backend: Script Include, data-bridge
   script, Glide access, config) and Integration (external data) to design each module.
4. **Access control** — the Assistant asks whether special access control is needed, for
   the **whole app** or **specific modules**. If yes, it **auto-creates an Access
   Management Module** in the app, visible to the Enterprise Intelligence scoped app's
   **Administrator, Developer, Management, and Owner** roles. That module manages, through
   our own authorization model (not ServiceNow ACLs), who may access the app and each
   guarded module. (Gap filled: the Access Management Module is a standard, generated module
   with an entitlement map the own-security engine enforces at every bridge call.)
5. **Plan + demo skeleton, then build** — the Assistant composes the plan and a live demo
   skeleton, iterates with the user, then builds the app into x_solutions with its own
   dedicated **bridge** (Section 5), delivered as an application package.

## 3. Existing Solution Maintenance (closed loop)
Purpose: adjust an existing web app in x_solutions.
Flow:
1. **Choose the app** — a picker of the web applications present in the Enterprise Solutions
   (x_solutions) scoped app.
2. **Context tag** — the chosen app is **pinned as a tag at the top of the Assistant chat**,
   so the whole conversation is scoped to it (mirrors the operations-intelligence closed
   loop where context frames the interaction).
3. **Define adjustments** — the user and Assistant define changes to the app's modules
   (add/edit/remove a module, change a content area, change data, change layout within the
   house style). The Assistant collaborates with Technology + EIM + Integration as needed,
   shows the change as a skeleton diff, and on approval applies it and re-packages the app.

## 4. Module Bridge Maintenance (closed loop)
Purpose: inspect and adjust the **bridge** of an existing web app.
Flow:
1. **Choose the app** — same picker as Existing Solution Maintenance, pinned as a tag.
2. **Analyse the bridge** — the Assistant surfaces everything the app's bridge exposes:
   the **capabilities** in scope for that app, the data-bridge methods, the external
   integrations, and the entitlements. It explains each in one voice (collaborating with
   EIM for instance-specific operations, reasoning, and knowledge behind the scenes).
3. **Adjust the bridge** — grant or revoke capabilities for the app (least privilege),
   add/remove a bridge method, or change an integration, all mediated by the own-security
   engine and audited. Re-packages the app's bridge on approval.

## 5. The bridge (why it exists)
Every generated web app has a **dedicated bridge**: a scoped, in-check communication channel
between that app and the Enterprise Assistant. The bridge exposes ONLY the capabilities in
scope for that app (least privilege per app). Through the bridge, the Assistant collaborates
with the Enterprise Intelligence Model for instance-specific operations, reasoning, and
knowledge, and with Integration for external data. The own-security engine authenticates,
authorizes (our access model), validates graph-resolved inputs, mediates privileged writes
in system context, and audits every call. Module Bridge Maintenance is how a human inspects
and tunes that bridge.

## 6. First deliverable: operations-intelligence-new
- I build **operations-intelligence-new** in the x_solutions (Enterprise Solutions) scoped
  app, in a browser session, using the three catalog items above (starting with New Solution
  Development, choosing the Operations shell).
- It is a **visual and functional replication of the existing operations-intelligence
  portal**, enhanced with our four models, hardened house style, own-security, per-app
  bridge, and the closed-loop Assistant, all in-house.
- If a catalog item is not good enough for this build, I enhance the item, then continue.
- When operations-intelligence-new matches and exceeds the old portal, we **retire the old
  operations-intelligence** portal.

## 7. Gaps I filled, flagged for your confirmation (not silent assumptions)
- The starter **layout set** in Section 2.2 (Operations, Focus, Dashboard-grid, Split). I
  can add or change these; the Operations shell is the one used for operations-intelligence-new.
- The **Access Management Module** shape (an entitlement map enforced by own-security, app-
  wide and per-module), auto-generated when access control is requested, role-visible to
  Administrator/Developer/Management/Owner.
- The **layout preview** renders the real React shell skeleton (not an image), so the tile
  preview is the genuine thing.
These are design decisions, stated openly so you can redirect any of them.
