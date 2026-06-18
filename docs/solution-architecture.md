# Operations Intelligence — Solution Architecture

## Platform Overview

**Operations Intelligence** is an enterprise intelligent automation and deliverable
platform built as a ServiceNow scoped application. It enables organisations to
create, govern, and manage automations AND persistent ServiceNow deliverables
(dashboards, reports, notification rules, flows, custom tables, UI pages) entirely
through natural language via the Operations Assistant (Virtual Agent), with
role-appropriate approval workflows and group-scoped governance.

Creators never navigate directly to the underlying ServiceNow artifacts they
create — all lifecycle management (edit, deactivate, archive, delete) happens
exclusively through Operations Intelligence. This principle applies to every
deliverable type.

### Scope Naming Note

Throughout this document `{scope}` is a placeholder for the actual application
scope prefix (e.g. `x_opsi_ops_int`). The exact value is printed by
`01_bootstrap_api_access.js` as **Scope** in its output block. All custom
table names are automatically prefixed with this value by ServiceNow (e.g.
the `automation` table becomes `x_opsi_ops_int_automation`). Business Rule
and Script Include code uses the full prefixed name; this document uses the
unprefixed name for readability.

---

## Naming Convention

| Component | Name |
|---|---|
| Platform | Operations Intelligence |
| Portal section — admin | Operations Command |
| Portal section — leadership | Operations Governance |
| Portal section — creator | Operations Studio |
| Portal section — all users | Workspace |
| VA / AI layer | Operations Assistant |
| Service Portal ID | `operations_intelligence` |
| Portal URL suffix | `/operations_intelligence` |
| VA Channel | Operations Assistant |
| NLU Model | Operations Intelligence NLU |

---

## Roles

All roles are scoped automatically by ServiceNow. Enforcement always reads
from actual ServiceNow role assignments — never from a field on a custom table.

### System Roles

| Role | Held by | Capabilities |
|---|---|---|
| `admin` | IT / platform team | Full system access, onboards top-level leadership |
| `leadership` | Business leaders | Group governance, user onboarding, approvals |
| `creator` | Appointed power users | Design automations and deliverables for assigned groups |
| `user` | All other staff | Trigger automations; request reports and dashboards via Assistant |

Viewer role is intentionally excluded. Every legitimate read-only need is
covered — leadership has full reporting in Operations Governance, admins
have the full audit trail in Operations Command.

When leadership appoints a group creator, the system grants the `creator`
system role (for Studio access) AND creates a `group_member` record with
`group_role = creator` for that group. Creator appointment is a separate
post-onboarding step — it is NOT part of the `onboarding_request` workflow.
`onboarding_request.system_role` therefore only holds `leadership` or `user`.

### Group Roles (per group, independent of system role)

| Group Role | Granted by | Effect |
|---|---|---|
| `creator` | Leadership via Appoint Creator topic | Can design automations and deliverables scoped to this group |
| `user` | Leadership during onboarding | Can trigger automations; may request reports/dashboards for this group |

A person can hold `creator` group role in Group A and `user` group role in
Group B simultaneously.

---

## Organisational Hierarchy

```
ADMIN
  └── onboards LEADERSHIP (top-level; sets delegation_rights on person record)
       └── LEADERSHIP (delegation_rights=true) onboards sub-LEADERSHIP
       └── LEADERSHIP onboards USERS (direct reports)
            └── LEADERSHIP appoints CREATORS from their user pool
                 └── CREATOR designs automations and deliverables scoped to their group(s)
```

### Reporting Relationships
- Many-to-many between users and leaders
- Each relationship is `primary` or `secondary`
- A user has exactly ONE primary leader across all relationships
- Automation approvals route to the primary leader only
- Secondary leaders receive notifications but do not block approval
- `delegation_rights` lives exclusively on the `person` record

### Delegation Rights
- Admin sets `person.delegation_rights` when onboarding a top-level leader
- A leader with `delegation_rights = true` may onboard sub-leaders
- When onboarding a sub-leader, the parent leader sets the sub-leader's
  `delegation_rights` — but cannot grant more than they themselves hold
- Leaders with `delegation_rights = false` can only onboard users

---

## Group Model

| Group Type | Created when | Members |
|---|---|---|
| Leadership Group | Auto-created when a leader is onboarded | All direct reports of that leader |
| Custom Group | Created by leadership or admin via VA | Specific subset of users, explicitly added |

### Group Hierarchy
```
Sarah's Team (Leadership Group — parent)
  ├── HR Recruitment (Custom Group — child)
  └── HR Onboarding  (Custom Group — child)
```

Automations and deliverables assigned to a parent group are NOT automatically
inherited by child groups. Each group's catalog and deliverable registry is
managed independently.

---

## Data Model

### Core Tables

```
person
  user                      sys_user reference (one per SN user)
  onboarded_by              person reference
  onboarded_at              datetime
  onboarding_status         pending / in_progress / complete
  invitation_sent_at        datetime
  delegation_rights         boolean  <- single source of truth
  copilot_enabled           boolean
  active                    boolean
  NOTE: system_role is NOT stored here — read from ServiceNow roles
        via gs.hasRole(). person stores OI-specific data only.

reporting_relationship
  leader                    person reference
  direct_report             person reference
  relationship_type         primary / secondary
  created_by                person reference
  created_at                datetime
  status                    active / inactive
  NOTE: DeactivationHandler sets status = inactive during user removal.
        delegation_rights removed — lives on person record only.

group
  name                      string
  description               string
  type                      leadership_group / custom_group
  owner                     person reference (approver for cross-group publishing;
                            if null or deactivated: cross-group approval routes
                            to admin automatically)
  parent_group              group reference
  created_by                person reference
  created_at                datetime
  status                    active / archived

group_member
  group                     group reference
  member                    person reference
  group_role                creator / user
  added_by                  person reference
  added_at                  datetime
  status                    active / inactive

onboarding_request
  number                    string (auto-generated; format ONB0001001; read-only
                            after creation; used in notifications and support
                            conversations as the human-readable reference)
  nominee                   person reference
  initiated_by              person reference
  target_group              group reference
  group_role                creator / user
  system_role               leadership / user
                            NOTE: 'creator' is NOT included here. Creator
                            appointment is a separate post-onboarding step
                            handled by the Appoint Creator VA topic.
  delegation_rights         boolean
  status                    pending / accepted / declined / expired
  re_invitation_count       integer (max 2 re-invitations allowed)
  invited_at                datetime
  completed_at              datetime
  expiry_at                 datetime (48 hours from invited_at)
  decline_reason            string (optional, nominee may provide)
```

### Automation Tables

```
automation_category
  name                      string
  description               string
  color                     string (hex — for UI display)
  icon                      string (ServiceNow icon name)
  active                    boolean
  created_by                person reference
  NOTE: admin manages categories. Creators select from this list.
        Free-text category removed — enforced reference only.

approved_flow
  flow_sys_id               string (sys_id of the sys_hub_flow record)
  display_name              string (user-friendly name shown in Assistant)
  description               string (what this flow does, in plain English)
  input_variables           string (JSON — expected inputs and their types)
  active                    boolean
  approved_by               person reference (admin)
  approved_at               datetime
  NOTE: Admin curates this list. Only these flows are available as flow_trigger
        targets for automation steps. Creators see display_name and description
        — never the sys_id. FlowBridge resolves flow_sys_id to sys_hub_flow at
        execution time.

automation
  number                    string (auto-generated; format AUT0001001; read-only
                            after creation; used in approval notifications and
                            leadership references)
  name                      string
  short_description         string (one-liner for cards and catalog views)
  description               string (full description)
  category                  automation_category reference (enforced — no free text)
  trigger_phrases           string (JSON array — not comma-separated)
  status                    draft / in_review / testing / pending_approval /
                            published / deprecation_queued / deprecated
                            NOTE: deprecation_queued is set when deprecation is
                            requested but running/awaiting_approval executions
                            exist. System auto-transitions to deprecated once
                            all in-flight executions complete.
  version                   integer (increments on each publish)
  base_automation           automation reference (self-reference; all published
                            versions of the same automation share this value;
                            first version sets base_automation = own sys_id)
  owner_group               group reference
  created_by                person reference
  submitted_at              datetime
  approved_at               datetime
  approved_by               person reference
  rejected_at               datetime
  rejected_by               person reference
  rejected_reason           string (mandatory when leadership rejects)
  estimated_time_saved      integer (minutes per execution)
  usage_count               integer (maintained by Business Rule on execution)
  browsable                 boolean (true = visible in global catalog for
                            cross-group discovery by leadership/creators)
  active                    boolean

automation_version
  automation                automation reference
                            NOTE: each automation_version row references the
                            specific automation record that existed at publish
                            time. Because every new version creates a new
                            automation record sharing the same base_automation,
                            the automation pointer on automation_version is
                            immutable after insert and correctly identifies
                            the exact version snapshot — it does NOT update
                            when a newer version is published.
  version_number            integer
  snapshot_steps            string (JSON snapshot of all steps at publish)
  snapshot_inputs           string (JSON snapshot of all inputs at publish)
  snapshot_trigger_phrases  string (JSON array at publish)
  published_at              datetime
  published_by              person reference

automation_step
  automation                automation reference
  order                     integer (1-based; used in {{steps.N.output.X}})
  name                      string
  action_type               record_create / record_update / record_query /
                            flow_trigger / rest_call / send_notification /
                            approval_gate / conditional_branch
  configuration             string (JSON — see Action Type Schemas section)
  branch_true_step          integer (order of next step if condition is true;
                            conditional_branch only)
  branch_false_step         integer (order of next step if condition is false;
                            conditional_branch only)
  on_failure                stop / continue / skip
  active                    boolean

automation_input
  automation                automation reference
  order                     integer
  label                     string (what the VA asks the user)
  field_name                string (internal key — used as {{input.FIELD_NAME}})
  input_type                text / number / date / choice / boolean
  choices                   string (JSON array — for choice type only)
  required                  boolean
  validation_regex          string

group_automation
  group                     group reference
  automation                automation reference
  added_by                  person reference
  added_at                  datetime
  approval_status           pending / approved / rejected
  approved_by               person reference
  approved_at               datetime
  rejected_reason           string

execution
  number                    string (auto-generated; format EXC0001001; read-only
                            after creation; shown to user as the execution
                            reference in VA confirmation and My Activity)
  automation                automation reference
  automation_version        integer (version number at time of execution)
  triggered_by              person reference
  triggered_at              datetime
  channel                   va / portal / scheduled
  status                    pending / running / success / failed /
                            awaiting_approval / cancelled
  is_test                   boolean (test executions excluded from usage_count)
  input_values              string (JSON — field ACL: triggered_by and
                            leadership/admin only)
  completed_at              datetime
  group                     group reference (denormalised for query performance;
                            maintained by OI - Execution Group Sync BR on insert;
                            when an automation belongs to multiple groups, set to
                            the first approved group_automation record (ordered by
                            approved_at asc) whose group the triggering user is
                            an active member of)

execution_step_log
  execution                 execution reference
  step_order                integer (copied at runtime — not a FK reference)
  step_name                 string (copied from automation_step.name at runtime)
  action_type               string (copied at runtime)
  status                    pending / running / success / failed / skipped
  started_at                datetime
  completed_at              datetime
  output                    string (JSON)
  error_message             string
  NOTE: all step fields are copied at runtime to preserve historical accuracy
        if step definitions change after the execution runs.

automation_schedule
  automation                automation reference
  schedule_type             recurring / one_time
  cron_expression           string (for recurring)
  run_at                    datetime (for one_time)
  timezone                  string
  active                    boolean
  sysauto_sys_id            string (sys_id of the underlying sysauto_script
                            record, stored so ScheduleManager can deactivate
                            it on deprecation)
  created_at                datetime
  NOTE: An automation can have a schedule AND be triggered on-demand.
        Scheduled triggers are independent of execution steps.

use_case_request
  number                    string (auto-generated; format UCR0001001; read-only
                            after creation; used in admin and leadership tracking)
  title                     string
  description               string (full NL requirements captured by VA)
  structured_spec           string (JSON — parsed from NLU conversation)
  submitted_by              person reference
  target_group              group reference
  additional_groups         string (JSON array of group sys_ids for
                            cross-group publishing; each requires separate
                            group.owner approval — null/deactivated owner
                            routes to admin)
  status                    draft / submitted / in_review / approved /
                            rejected / building / complete
  copilot_enhanced          boolean
  copilot_phrases_applied   boolean (true once Copilot's phrases are written
                            to automation.trigger_phrases)
  submitted_at              datetime
  reviewed_by               person reference
  reviewed_at               datetime
  resulting_automation      automation reference
```

### Deliverable Table

```
managed_artifact
  number                    string (auto-generated; format ART0001001; read-only
                            after creation; used in approval notifications and
                            creator references in Operations Studio)
  display_name              string
  description               string
  artifact_type             report / pa_dashboard / notification_rule /
                            scheduled_data_job / flow / custom_table / ui_page
  owner_group               group reference
  created_by                person reference
  status                    draft / pending_approval / active /
                            inactive / archived
                            NOTE: pending_approval applies only to
                            artifact_types that require leadership approval
                            (custom_table, ui_page). All others go
                            directly from draft to active on creation.
  approval_required         boolean (true for custom_table and ui_page)
  approved_by               person reference
  approved_at               datetime
  rejected_reason           string
  artifact_sys_ids          string (JSON array of sys_ids of the actual
                            ServiceNow records created. May contain multiple
                            entries — e.g. a PA dashboard + its underlying
                            report, or a custom_table + its form layout.)
  creation_spec             string (JSON — full configuration used at
                            creation time. Enables ArtifactManager to
                            re-create or update the artifact. Field format
                            varies by artifact_type — see Deliverable
                            Creation Flows section.)
  copilot_assisted          boolean (true if Copilot filled any technical
                            gaps during spec generation)
  copilot_spec_applied      boolean (true once creator confirms Copilot spec)
  created_at                datetime
  updated_at                datetime
  NOTE: Creators never access the underlying ServiceNow records directly.
        All management (edit, deactivate, archive, delete) is performed
        through OI via ArtifactManager. The artifact_sys_ids array is used
        internally by builder Script Includes.
```

### Security & Credential Tables

```
creator_credential
  user                      person reference (unique — one per creator)
  github_pat                password2 field type
  token_status              active / expired / revoked
  connected_at              datetime
  last_validated_at         datetime
  last_validation_result    success / failed
  ACL — TABLE LEVEL:
    Read:   user = gs.getUserID() OR gs.hasRole('admin')
            Admin sees all metadata fields (dates, token_status, validation
            results) but github_pat is unconditionally blocked at field level
            regardless of who is reading the row.
    Write:  user = gs.getUserID() only for normal credential updates.
            Admin write is restricted to: token_status = 'revoked' and
            github_pat = '' (clearing the token). Admin cannot set a PAT.
    Delete: admin only
  ACL — FIELD LEVEL on github_pat:
    Read:   NOBODY — including admin, including scripts running as admin.
            CopilotBridge uses an elevated GlideRecord solely to pass the
            decrypted value to the outbound REST call; it never returns the
            value to any caller.
    Write:  user = gs.getUserID() only

pending_action
  number                    string (auto-generated; format PND0001001; read-only
                            after creation; used in admin queries and escalation
                            audit trail)
  action_type               user_deactivation / automation_approval /
                            onboarding_expiry / token_expiry /
                            leader_reassignment / artifact_approval
                            NOTE: approval escalation UPDATES the existing
                            pending_action record (status = escalated,
                            assigned_to changes to the leader's leader).
                            A new pending_action record is NOT created for
                            escalation — one traceable record per approval.
                            artifact_approval type: used when custom_table
                            or ui_page requires leadership sign-off.
  subject_user              person reference (who the action concerns)
  related_automation        automation reference (automation_approval type)
  related_artifact          managed_artifact reference (artifact_approval type)
  related_group             group reference (which group's approval)
  assigned_to               person reference (updated on escalation)
  status                    pending / actioned / auto_resolved / escalated
  created_at                datetime
  deadline_at               datetime
  actioned_at               datetime
  actioned_by               person reference
  resolution                approved / rejected / approved_removal /
                            notified_user / reassigned / no_action
  notes                     string
```

---

## Deliverable Types & Governance

Operations Intelligence extends beyond process automations to deliver persistent
ServiceNow artifacts on behalf of creators. The following governance matrix
governs who can request each type, whether approval is required, and how
lifecycle management works.

### Governance Matrix

| Deliverable Type | Who can create | Approval required | Copilot role | OI-managed lifecycle |
|---|---|---|---|---|
| `report` | All users (via VA) and creators | No — active immediately | Auto fills field selection, conditions, chart type if not specified | Creator (and user who requested it) manages via OI |
| `pa_dashboard` | All users (via VA) and creators | No — active immediately | Auto fills widget layout, widget types, data sources if not specified | Creator manages via OI |
| `notification_rule` | All users (via VA) and creators | No — active immediately | Auto fills trigger conditions, email template if not specified | Creator manages via OI |
| `scheduled_data_job` | All users (via VA) and creators | No — active immediately | Auto fills schedule, target table, field selection if not specified | Creator manages via OI |
| `flow` | Creators only | No — active immediately; leadership notified (informational) | Auto fills trigger conditions, action logic if not specified | Creator manages via OI; leadership can deactivate |
| `custom_table` | Creators only | Yes — leadership approval required | Full spec generation: field types, labels, mandatory flags, form layout | Creator manages via OI after approval |
| `ui_page` | Creators only (optional complement to custom_table) | Yes — leadership approval required | Full UI spec from plain English: layout, fields, data binding to custom tables | Creator manages via OI after approval |

**Excluded types (security risk):**
- `sysauto_script` (Scheduled Scripts) — global scope execution risk
- `sys_script` (Business Rules) — global scope execution risk
- Service Portal widgets with scripts — script injection risk

### Key Governance Principles

1. **No direct artifact access** — creators and users never navigate to the underlying
   ServiceNow records (`sys_report`, `pa_dashboards`, `sysevent_email_action`, etc.).
   All management is through Operations Intelligence.

2. **User-accessible deliverables** — any user may request a report, PA dashboard,
   notification rule, or scheduled data job via the Operations Assistant. The system
   guides them through requirements; if they lack sufficient technical detail, Copilot
   automatically fills the gaps (see Copilot Role in Deliverables).

3. **Creator-only deliverables** — flows, custom tables, and UI pages require creator
   permissions due to their system-level impact.

4. **Leadership visibility of flows** — when a creator activates a flow, leadership
   receives an informational notification (OI - Flow Activated). Leadership may
   deactivate a flow from Operations Governance without creator approval — this is
   an override capability, not a blocking approval gate.

5. **Custom table + UI page pairing** — when a custom table is approved, the creator
   is offered the option to also create a UI page interface. If chosen, the UI page
   request is filed simultaneously, shares the same approval workflow, and is listed
   alongside the table in managed_artifact.

6. **Scope isolation** — all custom tables created through OI are created within the
   OI scoped application. They are NOT global tables. TableBuilder ensures the scoped
   app prefix is applied automatically.

7. **No ungated script artifacts** — no deliverable path creates `sysauto_script`
   (Scheduled Scripts) or `sys_script` (Business Rules). Scheduled data delivery
   uses `sysauto_report`. Flows are restricted to a curated safe action set.
   UI pages (`sys_ui_page`) are full-capability pages — Jelly, GlideAjax, client
   JavaScript — but are gated behind mandatory leadership approval. Copilot
   generates the full implementation plan from the creator's plain-English
   requirements; the plan is presented to the leader for approval before
   UIPageBuilder creates a single line of code.

### Builder Dispatch — Artifact Type to Underlying Records

`ArtifactManager` routes each managed_artifact to its builder. No builder ever
creates a script-bearing artifact.

| artifact_type | Builder | Underlying ServiceNow record(s) | Scripts? |
|---|---|---|---|
| `report` | ReportBuilder | `sys_report` | None — declarative |
| `pa_dashboard` | ReportBuilder | `pa_dashboards` + PA widgets (scorecards, breakdowns, trendlines) | None — declarative |
| `notification_rule` | NotificationBuilder | `sysevent_email_action` | None — declarative condition + template |
| `scheduled_data_job` | NotificationBuilder | `sys_report` + `sysauto_report` (scheduled delivery) | None — declarative |
| `flow` | FlowBuilder | `sys_hub_flow` (+ trigger + actions) | No script steps; safe action set only |
| `custom_table` | TableBuilder | `sys_db_object` + `sys_dictionary` (+ default form & list views) | None — schema only |
| `ui_page` | UIPageBuilder | `sys_ui_page` (full UI Page — Jelly layout + GlideAjax + client JS per Copilot-generated spec) | Per requirements — full script capability; gated by leadership approval |

---

## Deliverable Creation Flows

### Common Pattern (all deliverable types)

```
PHASE 1 — Requirements Conversation (always runs, never blocked)
  Operations Assistant guides creator/user through structured multi-turn dialogue
  Questions adapt to deliverable type (see type-specific flows below)
  Progress auto-saved to managed_artifact as creation_spec JSON after every turn
  Fully resumable if conversation is interrupted

PHASE 2 — Gap Detection & Copilot Fill
  System checks creation_spec for missing or underspecified technical fields
  If gaps detected AND creator has active copilot credential:
    -> CopilotBridge generates full technical specification for the missing parts
    -> Assistant displays: "Based on your requirements, here is what I suggest for
       the technical details: [formatted spec]. Does this look right?"
    -> Creator reviews and confirms or adjusts each suggestion
    -> managed_artifact.copilot_assisted = true
    -> managed_artifact.copilot_spec_applied = true on confirmation
  If gaps detected but NO active copilot credential:
    -> Assistant asks targeted follow-up questions to resolve each gap manually
  If no gaps: creation proceeds directly to Phase 3

PHASE 3 — Creator Review
  Full spec displayed in conversation and/or Operations Studio
  Creator can edit any field before confirming
  Deliverable is complete and ready to create at this point

PHASE 4 — Create or Submit for Approval
  Deliverables NOT requiring approval (report, pa_dashboard, notification_rule,
    scheduled_data_job, flow):
    -> ArtifactManager calls the relevant builder Script Include
    -> Underlying ServiceNow artifact created immediately
    -> managed_artifact.status = active
    -> Creator/user notified of successful creation with record reference
    -> For flows: leadership informed via OI - Flow Activated (non-blocking)

  Deliverables requiring approval (custom_table, ui_page):
    -> managed_artifact.status = pending_approval
    -> pending_action created (type: artifact_approval) for primary leader
    -> Leader notified via OI - Custom Table Submitted or OI - UI Page Submitted
    -> 72-hour response window (same escalation rules as automation approvals)
    -> On approval: ArtifactManager calls builder; artifact created; creator notified
    -> On rejection: managed_artifact.status = draft; creator notified with reason
```

### Type-Specific Requirements Conversations

**report / pa_dashboard**
- Which group's data should this show? (system lists groups the user belongs to)
- Which ITSM modules? (incident, change, problem, task, etc.)
- What time period?
- What filters? (assigned group, state, priority, etc.)
- What should the main visualisation show? (Copilot suggests chart type and metrics if not specified)
- For PA dashboard: how many tabs/panels? What key metrics per panel? (Copilot generates
  full widget layout — scorecard, breakdown, trendline, list — if not specified)

**notification_rule**
- Which table should trigger the notification?
- What condition should fire it? (e.g. assigned_to group = dns_sam AND state changes)
- Who should receive it? (specific email, group members, triggering user, etc.)
- What should the email subject and body contain? (Copilot generates template if not specified)
- Should it fire on insert only, update only, or both?

**scheduled_data_job**
- What data should be fetched and sent?
- Which table and which filters?
- Which fields to include in the report email?
- Who should receive it?
- How often? (daily / weekly / specific day and time)
- Copilot generates the field selection and email format if not specified
- NOTE: Implemented declaratively as a `sys_report` plus a `sysauto_report`
  (scheduled report delivery) created by NotificationBuilder — NOT as a
  `sysauto_script` and NOT as a flow. This keeps scheduled data jobs open to
  all users with zero script surface. The schedule, target table, filters and
  recipients are all declarative configuration.

**flow**
- What should trigger this flow? (record created / record updated with condition /
  one-time manual / scheduled)
- Which table should it watch?
- What condition? (e.g. assigned_to.group = dns_sam)
- What should happen? (update a field, send a notification, assign to a user, etc.)
- Should it be event-driven (fires automatically) or manually triggered?
- Copilot translates plain-English action descriptions into Flow Designer action config
- NOTE: FlowBuilder creates a `sys_hub_flow` record within the OI scoped app and
  activates it immediately. Leadership receives OI - Flow Activated.

**FlowBuilder security model** (creator flows bypass approval, so they are bounded):
- **Run-as-creator** — the flow executes with the creating creator's own
  ServiceNow permissions, never elevated. A flow can never perform an operation
  the creator could not perform manually.
- **Safe action set only** — FlowBuilder accepts a curated list of action types:
  record create, record update, set field values, assign to a group/user,
  send notification (via OI templates), and wait/timer. It rejects any action
  that runs arbitrary script, calls an unapproved external endpoint, or elevates
  privileges.
- **No script steps** — Flow Designer "Run Script" actions are never generated.
- **Action cap** — bounded by `{scope}.max_flow_actions` (default 20).
- **Leadership override** — leadership sees every group flow in Operations
  Governance and can deactivate any of them at any time (OI - Flow Activated
  gives them immediate awareness). This is an override, not a blocking gate.

**custom_table**
- What is the purpose of this table? (e.g. "activity tracker replacing our Excel sheet")
- What information should each record track? (Copilot generates field definitions)
- Which fields are mandatory?
- Should it have an approval process of its own? (adds an approval field + state)
- Who should be able to create / edit / view records? (role-based access)
- Copilot generates: field list, field types, field labels, form layout, list view columns
- Full spec subject to leadership approval before TableBuilder creates the table

**ui_page**
- This option is only offered when a custom_table has been approved
- What should the page show? (system lists approved custom tables to choose from)
- Describe the layout and features in plain English — what should a user be able
  to do on this page? (view records, filter, create new, click to expand a record,
  show related data from another table, auto-refresh, export, etc.)
- Which custom tables should it pull data from?
- Copilot generates a full implementation plan: Jelly layout, GlideAjax calls for
  dynamic data, client-side JavaScript for UI interactions, server-side Jelly for
  data binding. The plan is presented to the leader as part of the approval package.
- NOTE: UIPageBuilder creates a `sys_ui_page` record — a full ServiceNow UI Page.
  The implementation may include GlideAjax, client-side JavaScript, and server-side
  Jelly as required by the stated features. The mandatory leadership approval step is
  the security gate — no code is created until the leader approves the spec.
  The page opens in a GlideModal on the Group Workspace (see Group Workspace
  Interface section).

---

## Group Workspace Interface

The Group Workspace is the **Workspace section of the `main` page** — the single
surface where users see and interact with everything their groups have. It is automatically
kept in sync — when a creator publishes a new automation or deliverable, it appears
in the workspace for all members of the relevant group(s) without any manual steps.

### Three-Panel Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Group selector  [All my groups ▾]          [Operations Assistant]│
├───────────────────────┬─────────────────────────────────────────┤
│  PANEL 1              │  PANEL 3                                 │
│  Automations          │  Existing Deliverables                   │
│  ─────────────────    │  ─────────────────────────────────────   │
│  [card] [card] ...    │  [card] [card] [card] ...                │
│                       │  (click any → GlideModal popup)          │
├───────────────────────┴─────────────────────────────────────────┤
│  PANEL 2 — Create New                                            │
│  [Report/Dashboard] [Notification] [Scheduled Email] │(creator)  │
│                              [Flow] [Custom Table] [UI Page]     │
└─────────────────────────────────────────────────────────────────┘
```

### Panel 1 — Automations

One card per published automation available to the user's selected group(s).
Cards show: name, short_description, category colour, usage_count, trigger type.

**On-demand automation card:**
- "Trigger" button present
- Clicking Trigger opens the Operations Assistant side panel pre-populated with
  the automation's NLU intent — VA collects inputs, launches execution, shows
  reference number. No page navigation occurs.

**Event-driven automation (Flow-backed):**
- No Trigger button — shows status badge (Active / Inactive) and how many
  times it fired this month
- Clicking the card opens a GlideModal showing: trigger condition, action summary,
  recent activation log (last 10 firings with timestamp and outcome)

### Panel 2 — Create New Deliverable Tiles

Tiles are role-filtered at render time:

| Tile | Visible to |
|---|---|
| Report or Dashboard | All users |
| Notification Rule | All users |
| Scheduled Data Report | All users |
| Flow | Creators only |
| Custom Table | Creators only |
| UI Page | Creators only (only shown when ≥1 custom_table is active for this group) |

Clicking a tile:
1. Opens the Operations Assistant side panel (if not already open)
2. Pre-populates it with the matching creation intent via the `pre_intent` VA session
   variable (`VAHelper.setPreIntent(intentName)`)
3. The VA topic fires immediately — no user typing required
4. The creation conversation runs inline; the user never navigates away
5. On completion, the new deliverable card appears in Panel 3 automatically

### Panel 3 — Existing Deliverables

One card per active `managed_artifact` in the user's groups. Cards show:
`display_name`, artifact type icon, `owner_group`, `created_by`, `created_at`,
status badge. Cross-group deliverables appear in the workspace for all member groups.

Clicking any deliverable card opens it inside a GlideModal popup. No navigation.

**GlideModal target per artifact type:**

| artifact_type | GlideModal opens |
|---|---|
| `report` | `report_viewer.do?sysparm_report={artifact_sys_id}` |
| `pa_dashboard` | `$pa_dashboard.do?sys_id={artifact_sys_id}` |
| `notification_rule` | OI info page: rule name, condition, recipients, status, last triggered |
| `scheduled_data_job` | OI info page: schedule, target table, filters, last run, next run |
| `flow` | OI info page: trigger, condition, action summary, recent activation log |
| `custom_table` | The group's UI page (`sys_ui_page`) for this table if one exists and is active; otherwise a standard scoped GlideList view of the custom table |
| `ui_page` | The `sys_ui_page` record rendered directly inside the GlideModal frame |

**Creator controls** (visible only to creators on their own group's artifacts):
Edit · Deactivate · Archive — these actions open the Operations Assistant side panel
with the management intent pre-filled rather than navigating away.

### Cross-Group Surfacing

When a creator shares an automation or deliverable with multiple groups, the item
appears in the workspace for every member of every listed group. The group selector
at the top of the workspace lets users filter by a specific group or see all at once.
The content a user sees is always scoped to their active `group_member` records —
they never see content for groups they are not a member of.

---

## Managed Artifact Lifecycle

```
DRAFT
  Requirements being captured or spec being reviewed
    |
    v confirmed (no approval required)       v submitted (approval required)
ACTIVE                                   PENDING_APPROVAL
  Artifact live in ServiceNow              pending_action created for leader
  Creator manages via OI only                |
    |                                        v approved
    +-- Edit request:                    ACTIVE (same as left path)
    |     Re-opens requirements            |
    |     conversation for the            +-- Leadership override (flows only):
    |     specific change;                |     managed_artifact.status = inactive
    |     ArtifactManager updates              Artifact deactivated in ServiceNow
    |     underlying record               |
    |                                    +-- Creator deactivates:
    +-- Deactivate:                      |     managed_artifact.status = inactive
    |     managed_artifact.status        |     Artifact deactivated in ServiceNow
    |       = inactive                   |
    |     Artifact deactivated           +-- Creator re-activates:
    |     in ServiceNow                  |     managed_artifact.status = active
    |                                    |     Artifact reactivated
    +-- Re-activate:                     |
    |     status = active                +-- Archive:
    |     Artifact reactivated                managed_artifact.status = archived
    |                                         Underlying artifact DELETED from SN
    +-- Archive:                              History preserved in managed_artifact
          status = archived                   Creator cannot un-archive
          Underlying artifact DELETED
          History preserved

INACTIVE
  Artifact exists in ServiceNow but is deactivated
  Can be re-activated by creator (or by resolving leadership override)
  Custom tables: underlying table is NOT deleted on inactive — only deactivated

ARCHIVED
  Artifact and all managed_artifact records retained for audit
  Underlying ServiceNow record permanently deleted
  managed_artifact record preserved with artifact_sys_ids and creation_spec
  for historical reference
```

### Creator's Artifact Management View

In Operations Studio, creators see a "My Deliverables" panel showing all
managed_artifact records for their group(s). From this view they can:
- Filter by artifact_type and status
- View creation spec and Copilot contribution
- Initiate edit (opens requirements re-conversation)
- Deactivate / re-activate
- Archive (with confirmation — irreversible)
- See which artifacts are pending_approval and their deadline

Leadership sees all group deliverables in Operations Governance, with the
ability to deactivate flows as an override action.

---

## Copilot Role in Deliverables

For automations, Copilot is an optional Phase 3 enhancement that suggests NLU
training phrases. For deliverables, Copilot plays a fundamentally different role:
it automatically generates the full technical specification when the creator
provides requirements in plain English but does not specify technical details.

### Automatic Gap Fill (not optional)

When a creator describes what they need but omits technical specifics, Copilot
is invoked automatically (not as an opt-in step) to produce the technical spec.
The system explicitly acknowledges this to the creator:

> "You've told me what you need — I'll use AI to fill in the technical details.
> Here's what I'm proposing: [formatted spec]. Review each section and tell me
> if anything needs adjusting."

The creator must explicitly confirm or adjust the proposed spec before it is
saved to `managed_artifact.creation_spec`. Nothing is applied silently.

### CopilotBridge Request for Deliverables

The request contract extends the automation-phrase contract with a
`deliverable_spec_mode` flag:

```
System prompt (deliverable mode):
  "You are a ServiceNow configuration specialist. Given a plain-English
   requirement and a deliverable type, return ONLY valid JSON with:
   'spec' (the complete technical configuration object for this deliverable
   type — see per-type schema), 'assumptions' (array of strings describing
   any assumptions made), 'questions' (array of clarifying questions if
   critical information is missing — empty array if none).
   No prose outside the JSON object."

User message:
  "Deliverable type: {artifact_type}
   Requirements: {plain_english_requirements}
   Already specified: {partial_creation_spec}"
```

`max_tokens` is raised to `3000` for deliverable spec generation (vs `1000`
for automation phrase suggestions). All other timeout and fallback rules apply
identically — on failure, the conversation falls back to manual clarifying
questions.

### Copilot Credential Requirement

The automatic gap-fill path requires an active `creator_credential`. If the
creator does not have an active PAT:
- System proceeds with manual clarifying questions only
- No Copilot spec generation is attempted
- Creator is shown a prompt offering to set up Copilot integration

---

## Automation Lifecycle

```
DRAFT
  Creator working on the definition in Operations Studio or via Assistant
    |
    v submit
IN REVIEW
  Admin or senior creator validates technical completeness
    |
    v pass review
TESTING
  Creator runs test executions (execution.is_test = true)
  ExecutionEngine runs in dry-run mode — logs what WOULD happen, no real actions
  Creator reviews execution_step_log and confirms logic
  Creator marks testing complete
    |                           ^
    v pass testing              | reject -> back to DRAFT with rejection reason
PENDING APPROVAL
  ApprovalRouter creates pending_action (type: automation_approval) for the
  primary leader (or group.owner for cross-group publishing)
  Self-approval guard: if the creator's primary leader IS the creator
    themselves -> escalate immediately to that leader's own leader,
    regardless of the 72-hour window
  Null-leader fallback: if primary leader is deactivated or unset ->
    walk up the hierarchy; if no leader at any level -> route to admin
  Cross-group owner null fallback: if group.owner is null or deactivated ->
    route to admin
  72-hour response window; escalation UPDATES assigned_to on the existing
    pending_action record — no new record is created
    |                           ^
    v approved                  | rejected -> back to DRAFT with rejection reason
PUBLISHED
  VA topic activated; NLU intent active; group_automation.approval_status = approved
  automation_version snapshot created
  usage_count maintained by Business Rule on each successful non-test execution
  Cannot directly deprecate while any execution.status IN (running, awaiting_approval)
    -> set to DEPRECATION_QUEUED instead
    |
    v new version submitted -> old version transitions to DEPRECATION_QUEUED on new publish
DEPRECATION_QUEUED
  No new executions can be started for this automation
  OI - Deprecation Guard BR monitors; auto-transitions to DEPRECATED once all
  in-flight executions complete
    |
    v all executions complete
DEPRECATED
  VA topic deactivated (not deleted); NLU intent deactivated; NLU retrained
  Execution history preserved and linked via automation_version
  automation_schedule.sysauto_sys_id deactivated if a schedule existed
```

### Automation Rejection Return Path
When leadership rejects at PENDING APPROVAL:
- `pending_action.resolution = rejected`
- `automation.rejected_reason` populated (mandatory on rejection)
- `automation.status` returns to `draft`
- Creator notified with rejection reason via Operations Assistant and email
- Creator can revise and resubmit — version increments only on publish, not resubmit

### Cross-Group Publishing
- Creator selects additional groups during creation (`use_case_request.additional_groups`)
- Primary group: standard approval via creator's primary leader
- Each additional group: `group.owner` receives a separate `pending_action`
  (if owner null/deactivated -> admin receives it)
- 72-hour escalation applies independently per group
- `automation.status = published` when primary group approves
- Per-group state tracked in `group_automation.approval_status`
- Partial publish is valid: live in Group A, pending in Group B, rejected in Group C

---

## Scheduled Execution Model

Scheduled execution is architecturally distinct from step-level actions.
`automation_schedule` defines WHEN an automation runs as an independent trigger.

```
On automation publish (if automation_schedule record exists):
  ScheduleManager creates sysauto_script record
  Stores sysauto_sys_id on automation_schedule

sysauto_script fires on schedule:
  Creates execution record (channel = scheduled, triggered_by = system)
  ExecutionEngine runs steps normally

On automation deprecation (or deprecation_queued transition):
  ScheduleManager reads automation_schedule.sysauto_sys_id
  Deactivates the sysauto_script record immediately
  Sets automation_schedule.active = false

Deprecation guard:
  If any execution.status IN (running, awaiting_approval) when deprecation
  is requested -> set status = deprecation_queued rather than deprecated
  Admin sees: "X execution(s) in progress — deprecation queued"
  BR5 (OI - Deprecation Guard) monitors; completes automatically when all clear
```

### Why automation scheduling may use `sysauto_script` but deliverables may not

The deliverable governance excludes `sysauto_script` because it would let a
creator author **arbitrary script** that runs in the global scope. The
`sysauto_script` records ScheduleManager creates for scheduled automations carry
a **fixed, system-authored body** — they contain only
`new ExecutionEngine().runScheduled(automation_sys_id)`. The creator never writes
a line of script; they define declarative steps that ExecutionEngine interprets
against its bounded action set. The risk being excluded (creator-authored global
script) therefore never exists on this path. Scheduled **data jobs** requested by
end users take the fully declarative `sysauto_report` path instead and never
touch `sysauto_script` at all.

---

## Automation Creation Flow

```
PHASE 1 — NLU Requirements Conversation (always runs, never blocked)
  Operations Assistant guides creator through structured multi-turn dialogue
  Covers: trigger phrases, inputs, steps, conditions, branch logic, schedule
  Progress saved to use_case_request after every turn — fully resumable
  If creator is in multiple groups -> Assistant asks which group this is for
  Output: fully populated use_case_request with structured_spec JSON

PHASE 2 — Creator Review
  Structured spec displayed in Operations Studio
  Creator can edit any field before proceeding
  Automation is 100% complete and submittable at this point

PHASE 3 — Copilot Enhancement (optional, creator's explicit choice)
  Only offered if creator_credential.token_status = active
  If token is expired -> Studio shows persistent warning banner
  Single bounded API call to GitHub Copilot API (see CopilotBridge Specification)
  Copilot asked to generate additional NLU training phrases, identify logical
  gaps, and suggest optimised step ordering
  On success: Copilot's suggested phrases are APPENDED to the creator's
    original phrases (not replaced). Creator reviews the merged list and
    confirms or removes individual suggestions before proceeding.
    Once confirmed: written to automation.trigger_phrases;
    use_case_request.copilot_phrases_applied = true
  On failure (any reason — credits, timeout, network, parse error):
    Silent fallback to Phase 2 spec; creator's original phrases unchanged
    Creator sees: "AI enhancement unavailable — your automation is complete
    and ready to submit"
  Creator always has a complete, submittable result regardless of outcome

PHASE 4 — Submit for Leadership Approval
  ApprovalRouter called with use_case_request sys_id
  Self-approval check: resolve creator's primary leader; if that leader's
    person.user sys_id equals the submitted_by user's sys_id -> escalate
    immediately to that leader's own leader
  Null-leader check: if primary leader is deactivated or unset ->
    walk up the hierarchy; if no leader found at any level -> route to admin
  pending_action created (type: automation_approval) for the resolved approver
  Approver notified via OI - Automation Submitted
  72-hour response window; escalation updates assigned_to on existing record;
    NotificationService resolves escalation recipient by calling
    ApprovalRouter.getEscalationTarget()

PHASE 5 — On Approval
  CatalogService creates automation record from use_case_request.structured_spec
  automation_step and automation_input records created
  If automation_schedule required -> ScheduleManager creates sysauto_script
  automation_version snapshot taken (version 1)
  VA topic created (see VA Custom Automation Topic Structure section)
  NLU intent created from automation.trigger_phrases (JSON array)
  NLU model retraining triggered (see NLU Model Training section)
  group_automation record created with approval_status = approved
  Creator and group members notified via OI - Automation Approved
  automation.usage_count initialised to 0
```

---

## User Deactivation Flow

```
sys_user.active set to false
    |
    v OI - Deactivation Detector Business Rule fires immediately
DeactivationHandler determines:
  Is this person a LEADER?
    YES -> leader_deactivation sub-flow (see below)
  Does this person have executions with status = awaiting_approval?
    YES -> include in pending_action notes for leader awareness

Primary leader notified via OI - User Deactivation Alert immediately
pending_action created (type: user_deactivation, deadline = 48h)
    |
    +-- Leader: APPROVE REMOVAL
    |     -> group_member.status = inactive for all groups
    |     -> creator system role revoked if held
    |     -> creator_credential.token_status = revoked, github_pat = ''
    |     -> reporting_relationship.status = inactive (DeactivationHandler)
    |     -> pending automation approvals reassigned to leader's leader
    |     -> Leader notified via OI - Auto Removal Executed
    |
    +-- Leader: NOTIFY USER / ACCOUNT TEAM
    |     -> Notification sent to deactivated user's email + IT contact
    |     -> 48-hour countdown visible in Operations Governance
    |     -> Account reactivated within 48h:
    |         pending_action.status = auto_resolved, leader notified
    |     -> No reactivation within 48h:
    |         auto-removal executes (same steps as APPROVE REMOVAL)
    |
    +-- Leader: NO ACTION within 48h
          -> Auto-removal executes
          -> Leader notified via OI - Auto Removal Executed

LEADER DEACTIVATION SUB-FLOW
  Their leader + admin notified via OI - Leader Reassignment Required
  pending_action created (type: leader_reassignment, deadline = 72h)
  All pending automation approvals in their queue:
    -> Reassigned to their leader immediately (not waiting for 72h)
  Direct reports' future approval requests route to THEIR leader
  (ApprovalRouter null-leader fallback: walk up the hierarchy)
  Admin or their leader reassigns direct reports within 72h
  If not resolved in 72h -> admin handles directly
```

---

## Onboarding Flows

### Existing Person Check (runs before every onboarding initiation)

```
Nominee already has a person record?
  YES -> Skip full invitation flow
         Create group_member record for new group directly
         Notify nominee via OI - Added to Group
         Notify leader: "[Nominee] added (already onboarded)"
  NO  -> Proceed to full two-step onboarding below
```

### Step 1 — Leader initiates via Operations Assistant
Leader describes nominee -> system searches sys_user -> leader confirms ->
`onboarding_request` created -> invitation sent (48h expiry)
`onboarding_request.re_invitation_count` initialised to 0

### Expiry and Re-invitation
```
Invitation expires (48h):
  onboarding_request.status = expired
  pending_action created (type: onboarding_expiry); leader notified
  Leader options:
    Re-send: re_invitation_count++ (max 2 re-invitations)
      -> New invitation, new 48h window, same onboarding_request record
    Cancel: onboarding_request closed

Nominee declines:
  onboarding_request.status = declined
  nominee may provide decline_reason (optional)
  Leader notified via OI - Invitation Declined
  Leader can re-initiate if appropriate (creates new onboarding_request)
```

### Step 2 — Nominee completes via Operations Assistant (first login)
Nominee logs in -> [Operations Intelligence] Complete Onboarding fires ->
confirms role and group -> completes profile -> if creator: offered Copilot setup

### Creator Copilot Setup
1. Creator opens Operations Studio OR completes during onboarding
2. Operations Assistant guides through GitHub PAT generation step by step
3. Creator pastes PAT into password2 input field
4. System validates token against Copilot API before saving
5. If valid -> stored encrypted; `person.copilot_enabled = true`
6. If invalid -> not stored; creator shown specific error with guidance
7. Operations Studio shows persistent warning banner when token is expired
8. Weekly scheduled job validates all active tokens; notifies creator on expiry

---

## Script Includes

Dependency order determines build sequence in step 4.

| Name | Purpose |
|---|---|
| `PermissionResolver` | Reads ServiceNow roles + group_member — never person.system_role |
| `VAHelper` | VA context: user identity, role, groups, top-5 catalog, page_id context |
| `NotificationService` | Email and in-app notification dispatch; resolves escalation targets |
| `GroupManager` | Group and group_member CRUD, hierarchy resolution |
| `CatalogService` | Automation lifecycle: create, version, publish, deprecate, VA topic, NLU retraining |
| `ScheduleManager` | Creates/deactivates sysauto_script records for scheduled automations |
| `ExecutionEngine` | Runs steps in order, template variable resolution, dry-run mode, step logging |
| `ApprovalRouter` | Self-approval guard, null-leader fallback, escalation chain, target resolution |
| `OnboardingService` | Existing person check, request creation, invitation, completion |
| `DeactivationHandler` | Detects deactivation type (user vs leader), routes accordingly |
| `FlowBridge` | Triggers admin-approved flows — resolves approved_flow.flow_sys_id to sys_hub_flow |
| `RESTBridge` | Outbound REST executor for rest_call steps: auth, timeout, retry |
| `CopilotBridge` | GitHub Copilot API: write-only PAT access, timeout, fallback, phrase merge, deliverable spec |
| `AuditService` | Field-level audit logging for admin actions on key tables |
| `ArtifactManager` | Central registry: managed_artifact CRUD, lifecycle transitions, builder dispatch |
| `ReportBuilder` | Creates/updates/deletes `sys_report` and `pa_dashboards` (+ PA widgets) — declarative only |
| `NotificationBuilder` | Creates/updates sysevent_email_action (event email rules) and sysauto_report (scheduled report delivery) — declarative, no scripts |
| `FlowBuilder` | Creates/activates/deactivates sys_hub_flow records within OI scope; enforces run-as-creator, safe action set, no script steps |
| `TableBuilder` | Creates custom table definitions (sys_db_object + sys_dictionary fields) + default form/list views within OI scope |
| `UIPageBuilder` | Creates full `sys_ui_page` records (ServiceNow UI Pages) — Jelly layout, GlideAjax, client-side JavaScript — all generated from the Copilot implementation plan; leadership-approved before creation |

**Dependency note for new Script Includes:**
`ArtifactManager` depends on `PermissionResolver`, `NotificationService`, `AuditService`.
`ReportBuilder`, `NotificationBuilder`, `FlowBuilder`, `TableBuilder`, `UIPageBuilder`
all depend on `ArtifactManager`. Build in the order listed above.

---

## Business Rules

Five business rules wire the platform together. Each is a thin wrapper that
delegates to the appropriate Script Include. All created within the scoped app.
Scoped app Business Rules on global tables (e.g. sys_user) are supported by
ServiceNow.

| # | Name | Table | When | Condition |
|---|---|---|---|---|
| 1 | OI - Deactivation Detector | `sys_user` | After update | `current.active == false && previous.active == true` |
| 2 | OI - Execution Group Sync | `{scope}_execution` | Before insert | `!current.automation.nil()` |
| 3 | OI - Usage Count Increment | `{scope}_execution` | After update | `current.status == 'success' && previous.status != 'success' && current.is_test == false` |
| 4 | OI - Automation Publish | `{scope}_automation` | After update | `current.status == 'published' && previous.status != 'published'` |
| 5 | OI - Deprecation Guard | `{scope}_automation` | After update | `current.status == 'deprecation_queued'` |

Replace `{scope}` with the actual scope prefix when creating via REST API.

### Business Rule Scripts

**BR1 — OI - Deactivation Detector**
```javascript
(function executeRule() {
    var handler = new DeactivationHandler();
    handler.handle(current.getUniqueValue());
})();
```

**BR2 — OI - Execution Group Sync**
```javascript
(function executeRule() {
    if (current.automation.nil()) return;
    var userId = current.triggered_by.nil()
        ? gs.getUserID()
        : current.triggered_by.user.toString();
    var gaGr = new GlideRecord('{scope}_group_automation');
    gaGr.addQuery('automation', current.getValue('automation'));
    gaGr.addQuery('approval_status', 'approved');
    gaGr.orderBy('approved_at');
    gaGr.query();
    while (gaGr.next()) {
        var memGr = new GlideRecord('{scope}_group_member');
        memGr.addQuery('group', gaGr.getValue('group'));
        memGr.addQuery('member.user', userId);
        memGr.addQuery('status', 'active');
        memGr.setLimit(1);
        memGr.query();
        if (memGr.next()) {
            current.setValue('group', gaGr.getValue('group'));
            break;
        }
    }
})();
```

**BR3 — OI - Usage Count Increment**
```javascript
(function executeRule() {
    if (current.is_test) return;
    var autoGr = new GlideRecord('{scope}_automation');
    if (autoGr.get(current.getValue('automation'))) {
        var count = parseInt(autoGr.getValue('usage_count') || '0') + 1;
        autoGr.setValue('usage_count', count);
        autoGr.setWorkflow(false);
        autoGr.update();
    }
})();
```

**BR4 — OI - Automation Publish**
```javascript
(function executeRule() {
    var svc = new CatalogService();
    svc.onPublish(current.getUniqueValue());
})();
```

**BR5 — OI - Deprecation Guard**
```javascript
(function executeRule() {
    var exec = new GlideRecord('{scope}_execution');
    exec.addQuery('automation', current.getUniqueValue());
    exec.addQuery('status', 'IN', 'running,awaiting_approval');
    exec.query();
    if (exec.getRowCount() === 0) {
        var autoGr = new GlideRecord('{scope}_automation');
        if (autoGr.get(current.getUniqueValue())) {
            autoGr.setValue('status', 'deprecated');
            autoGr.setWorkflow(false);
            autoGr.update();
            var svc = new CatalogService();
            svc.onDeprecate(current.getUniqueValue());
        }
    }
})();
```

---

## Security & Access Control

### Complete Table ACLs

All ACLs created within the scoped application. Row-level conditions are
implemented as ServiceNow ACL script conditions.

| Table | Read | Create | Write | Delete |
|---|---|---|---|---|
| `person` | admin (all rows); leadership (own direct_reports + self); user (own row) | System (OnboardingService) | admin; self (limited fields) | admin only |
| `reporting_relationship` | admin; parties in relationship; leadership (own) | admin; leadership (with delegation_rights) | admin; leadership (own); DeactivationHandler (status field) | admin only |
| `group` | admin (all); leadership (own groups); creator/user (member-of groups only) | admin; leadership | admin; leadership (own groups) | admin — soft delete: status = archived |
| `group_member` | admin (all); leadership (own groups); member (own row) | System (GroupManager, OnboardingService) | admin; leadership (status field, own groups) | admin only |
| `onboarding_request` | admin; initiated_by; nominee (own request) | System (OnboardingService) | System; nominee (decline fields only); admin | admin only |
| `automation_category` | all authenticated | admin | admin | admin only |
| `approved_flow` | admin; creator; leadership | admin | admin | admin only |
| `automation` | admin/leadership/creator: all statuses; user: published rows in own groups only | creator (own group); admin | creator (own, draft/testing only); admin; System (status transitions) | admin only (blocked if executions exist) |
| `automation_version` | admin; leadership (own groups); creator (own automations) | System (CatalogService on publish) | none | none — immutable after creation |
| `automation_step` | admin; leadership; creator (own automations); user (published, own groups) | creator (own automation); admin | creator (own, non-published); admin | creator (own, draft only); admin |
| `automation_input` | same as automation_step | same | same | same |
| `group_automation` | admin; leadership (own groups); creator/user (own groups) | System (CatalogService) | leadership (approval_status, own groups); admin; System | admin only |
| `execution` | admin (all); leadership (own groups); triggered_by (own) | System; user (triggered_by = current user, via VA/portal) | System only (status updates) | admin only (with retention check) |
| `execution_step_log` | admin; leadership (own group executions); triggered_by (parent execution owner) | System (ExecutionEngine) | System only | admin (with parent execution) |
| `automation_schedule` | admin; creator (own automations); leadership | creator (own); admin | creator (own, non-published); admin; System (sysauto_sys_id field) | admin; creator (draft only) |
| `use_case_request` | admin; leadership (target_group); submitted_by | creator | submitted_by (draft/in_review only); System | admin only |
| `creator_credential` | Row: own user OR admin; github_pat unconditionally blocked at field level for ALL readers | System; own user (initial setup) | own user (PAT + token_status); admin (revoke only: token_status + clear PAT) | admin only |
| `pending_action` | assigned_to (own); admin | System only | assigned_to (actioned fields); admin; System | System (auto-resolution); admin |
| `managed_artifact` | admin (all); leadership (own groups); creator (own group rows); user (active rows in own groups — display_name and description only) | System (ArtifactManager, via creator/user request) | creator (own, draft/inactive only — display_name, description); System (status, artifact_sys_ids, creation_spec); admin | admin only (archived status = soft delete) |

### Field-Level ACLs

| Table | Field | Read | Write |
|---|---|---|---|
| `creator_credential` | `github_pat` | NOBODY — including admin, including elevated-privilege scripts. CopilotBridge reads via privileged GlideRecord without returning the value. | Own user only |
| `execution` | `input_values` | triggered_by OR leadership/admin of that group | System only |
| `use_case_request` | `structured_spec` | submitted_by OR leadership/admin | System only |
| `use_case_request` | `description` | submitted_by OR leadership/admin | submitted_by |
| `managed_artifact` | `artifact_sys_ids` | admin; System (ArtifactManager) | System only |
| `managed_artifact` | `creation_spec` | creator (own); admin | System only |
| `managed_artifact` | `copilot_assisted` | creator (own); leadership; admin | System only |

### Auditing
Field-level auditing enabled on:
`automation` · `group` · `group_member` · `reporting_relationship` ·
`pending_action` · `creator_credential` (metadata fields only — github_pat excluded) ·
`managed_artifact`

AuditService logs all admin actions that bypass normal role checks.

---

## Execution Context Variables

ExecutionEngine resolves template variables in step `configuration` JSON
before each step executes. Unresolvable variables produce a step error — never
a silent failure. Steps use 1-based `order` as the index in `{{steps.N.output.X}}`.

| Variable | Resolved from |
|---|---|
| `{{input.FIELD_NAME}}` | Value collected via automation_input during VA conversation (`field_name` field) |
| `{{context.user_sys_id}}` | sys_id of the user who triggered the execution |
| `{{context.user_email}}` | Email of the triggering user |
| `{{context.user_name}}` | Full name of the triggering user |
| `{{context.automation_sys_id}}` | sys_id of the automation record |
| `{{context.automation_name}}` | Display name of the automation |
| `{{context.group_sys_id}}` | sys_id of the group context for this execution |
| `{{context.primary_leader_sys_id}}` | sys_id of the triggering user's primary leader |
| `{{context.leader_of_leader_sys_id}}` | sys_id of the primary leader's own leader (for escalation) |
| `{{context.execution_sys_id}}` | sys_id of the current execution record |
| `{{steps.N.output.KEY}}` | Output from step N (1-based order); KEY is the output_field value or a field on a returned record |

---

## Virtual Agent Architecture

### Channel
**Operations Assistant** — completely separate from the existing Now Support
channel. The existing Now Support implementation is untouched in every respect.

### NLU Model
**Operations Intelligence NLU** — dedicated model. No shared intents, no shared
training data, no connection to the Now Support NLU model.

### NLU Model Training
CatalogService triggers model retraining after creating or modifying NLU intents.

```
Trigger retraining:
  POST /api/sn_nlu/v1/model/{nlu_model_sys_id}/train
  Authorization: Basic {svc_claude_api credentials}
  Content-Type: application/json
  Body: {}

Poll training status:
  GET /api/sn_nlu/v1/model/{nlu_model_sys_id}
  Response includes: { "status": "ready" | "training" | "failed" }

Training typically completes within 2-5 minutes for small models.
CatalogService logs the training job sys_id to execution_step_log for audit.
```

Retraining is triggered on: initial NLU setup (build step 10), each new
automation publish, each automation deprecation, each automation update.

### Context Awareness
The Operations Assistant panel passes two VA session variables on every interaction:
- `page_id` — always `operations_intelligence` (single portal)
- `active_section` — the current section the user is viewing (`workspace`, `activity`,
  `studio`, `governance`, `command`); set by the Navigation Bar widget when the user
  switches sections

VAHelper reads `active_section` to adjust welcome message and topic routing.
When `active_section = governance`, the VA opens to the pending approvals summary.
When `active_section = studio`, it opens to creation guidance or resumes an
in-progress spec. `pre_intent` overrides `active_section` routing when a creation
tile or quick-start card sets a specific intent directly.

### System Topics (23 total)

| Topic | Fires when | Purpose |
|---|---|---|
| [Operations Intelligence] Welcome | VA opens on any page | Role-aware greeting based on `active_section`; contextual next-action prompts (e.g. "You have X pending approvals" for leaders, "Resume your last draft?" for creators); zero-groups message rendered as inline branch within this topic — not a separate invocation |
| [Operations Intelligence] Complete Onboarding | First login post-invitation | Walks nominee through role, group, capabilities; Copilot setup for creators |
| [Operations Intelligence] Copilot Setup | Creator connects Copilot or during onboarding | Step-by-step PAT guidance, validation, confirmation |
| [Operations Intelligence] Onboard Leadership | Admin initiates | Leadership onboarding — sets delegation rights |
| [Operations Intelligence] Onboard Sub-Leadership | Leader initiates (delegation_rights=true) | Sub-leader onboarding — cannot exceed parent's delegation level |
| [Operations Intelligence] Onboard User | Leader initiates | Direct report onboarding — existing person check first |
| [Operations Intelligence] Appoint Creator | Leader initiates | Grants creator group role; creator system role auto-granted |
| [Operations Intelligence] Create Group | Leader initiates | Custom group creation, member selection, creator assignment |
| [Operations Intelligence] Create Automation | Creator initiates | Full multi-turn NL requirements conversation, resumable |
| [Operations Intelligence] Review Approvals | Governance page or leadership request | Walks through unified pending_action queue (automation_approval AND artifact_approval) |
| [Operations Intelligence] Deactivation Action | Leader receives deactivation pending_action | Guided resolution: approve / notify / escalate |
| [Operations Intelligence] Re-invite User | Leader requests after expiry | Re-sends invitation (max 2 re-invitations) |
| [Operations Intelligence] Check Status | User mentions reference or asks about request | Execution status lookup by reference or description |
| [Operations Intelligence] Help & Fallback | No intent matched | Suggests 3 closest available automations; never a dead end |
| [Operations Intelligence] Approval Review | Leadership pending_action automation_approval or artifact_approval | Guided approval: review spec (automation, custom table, or UI page), approve or reject with reason |
| [Operations Intelligence] Create Report or Dashboard | User/creator requests a report or PA dashboard | Multi-turn requirements; Copilot fills technical gaps; immediate creation (no approval) |
| [Operations Intelligence] Create Notification Rule | User/creator requests an email trigger or alert | Multi-turn requirements including condition, recipients, email body; Copilot fills gaps; immediate creation |
| [Operations Intelligence] Create Scheduled Data Report | User/creator requests periodic data email | Requirements: table, filters, fields, recipients, schedule; Copilot fills gaps; immediate creation |
| [Operations Intelligence] Create Flow | Creator initiates a Flow Designer flow | Requirements: trigger type, table, condition, actions; Copilot translates plain English to flow config; immediate activation + leadership notified |
| [Operations Intelligence] Request Custom Table | Creator requests a custom tracking table | Requirements: purpose, fields, access; Copilot generates full field spec; submitted for leadership approval |
| [Operations Intelligence] Request UI Page | Creator requests a UI page for an existing custom table | Lists available custom tables; requirements: layout, actions, data binding; Copilot generates layout spec; submitted for leadership approval |
| [Operations Intelligence] Manage My Artifacts | Creator or user wants to manage existing deliverables | Lists managed_artifact records for group; options: view, edit, deactivate, archive |
| [Operations Intelligence] Check Artifact Status | Creator checks status of pending-approval deliverables | Shows pending_approval records for creator's groups with deadlines and assigned approver |

---

## VA Custom Automation Topic Structure

Each published automation generates one VA topic. CatalogService.onPublish()
creates these blocks via the VA topic REST API (`sys_cs_topic` + `sys_cs_topic_block`).

Topic naming: `[Operations Intelligence] {automation.name} (v{automation.version})`

| Block | Type | Detail |
|---|---|---|
| 1. Intent Confirmation | Message | "I can help you with [automation.name]. [automation.short_description]." Shows estimated_time_saved if > 0. |
| 2. Group Access Check | Script | Calls `VAHelper.userHasGroupAccess(automation_sys_id)`. Fail path: "You don't have access to this automation. Contact your manager." -> End topic. |
| 3 to N. Input Collection | Collect Input — one block per automation_input in order | Label from `automation_input.label`. VA input type mapped from `automation_input.input_type`. For choice type: choices from `automation_input.choices` JSON array. Required validation applied. |
| N+1. Confirmation | Message + Choice | Summary of all collected inputs. "Ready to proceed?" [Yes] [Cancel]. Cancel path: "Cancelled. Let me know if you need anything else." -> End topic. |
| N+2. Execution | Script | Calls `ExecutionEngine.createExecution(automation_sys_id, input_values, group_sys_id)`. Stores execution sys_id in VA session variable `oi_execution_ref`. |
| N+3. Success | Message | "Done! Your request is being processed. Reference: [oi_execution_ref]." |
| Failure branch | Message | "Something went wrong. Please try again or contact your group administrator." Error logged to execution_step_log. |

On deprecation: topic `active = false` (not deleted — preserves audit trail).
On new version published: new topic created; previous topic deactivated.

---

## CopilotBridge API Specification

### Request Contract — Automation Mode (phrase generation)

```
Endpoint:   POST https://api.githubcopilot.com/chat/completions
Headers:    Authorization: Bearer {decrypted_github_pat}
            Content-Type: application/json
            Copilot-Integration-Id: servicenow-oi
            Editor-Version: ServiceNow/OI-1.0

Request body (OpenAI-compatible):
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are an automation requirements analyst. Given a structured
                  specification, return ONLY valid JSON with three keys:
                  'additional_phrases' (array of NLU training utterances),
                  'gap_analysis' (array of strings describing missing steps),
                  'step_optimisations' (array of suggested improvements).
                  No prose outside the JSON object."
    },
    {
      "role": "user",
      "content": "Specification: {structured_spec_as_JSON_string}"
    }
  ],
  "max_tokens": 1000,
  "temperature": 0.3
}

Response parsing:
  choices[0].message.content -> parse as JSON
  Extract 'additional_phrases' -> append to creator's original phrases
  On any parse failure -> treat as API failure -> silent fallback
```

### Request Contract — Deliverable Mode (spec generation)

```
Request body:
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a ServiceNow configuration specialist. Given a
                  plain-English requirement and a deliverable type, return
                  ONLY valid JSON with: 'spec' (the complete technical
                  configuration object for this deliverable type),
                  'assumptions' (array of strings describing any assumptions
                  made), 'questions' (array of clarifying questions if
                  critical information is missing — empty array if none).
                  No prose outside the JSON object."
    },
    {
      "role": "user",
      "content": "Deliverable type: {artifact_type}
                  Requirements: {plain_english_requirements}
                  Already specified: {partial_creation_spec_as_JSON_string}"
    }
  ],
  "max_tokens": 3000,
  "temperature": 0.2
}

Response parsing:
  choices[0].message.content -> parse as JSON
  Extract 'spec' -> merge with partial creation_spec
  Extract 'assumptions' + 'questions' -> present to creator for review
  On any parse failure -> treat as API failure -> fall back to manual questions
```

### PAT Access Pattern
CopilotBridge never returns or logs the decrypted PAT value. It reads the
password2 field via an elevated GlideRecord call, passes it directly to the
outbound REST request, and discards the reference. No caller receives the
plain-text value.

### Timeout and Fallback
- Timeout: `{scope}.copilot_timeout_ms` (default 15000ms)
- On timeout, HTTP error, parse failure, or credits exhausted:
  - Automation mode: `use_case_request.copilot_enhanced = false`; return original structured_spec; creator sees "AI enhancement unavailable"
  - Deliverable mode: `managed_artifact.copilot_assisted = false`; fall back to manual clarifying questions; no error shown to creator — conversation continues naturally
  - Log error details to AuditService (not surfaced to creator)

---

## Notification Templates (22 total)

All notifications sent via NotificationService. Templates defined in the scoped
app — global notification records are never modified.

| Template name | Trigger | Recipients |
|---|---|---|
| OI - Onboarding Invitation | onboarding_request created | Nominee |
| OI - Onboarding Reminder | 24h before expiry_at | Nominee |
| OI - Onboarding Expired | expiry_at passed | Initiating leader |
| OI - Invitation Declined | status = declined | Initiating leader |
| OI - Onboarding Complete | status = accepted | Initiating leader |
| OI - Added to Group | Existing person added to new group | Nominee |
| OI - Automation Submitted | pending_action automation_approval created | Primary approving leader |
| OI - Cross-Group Approval Request | Cross-group pending_action created | group.owner (or admin if null/deactivated) |
| OI - Approval Escalated | 72h no response; pending_action escalated | Resolved by ApprovalRouter.getEscalationTarget() |
| OI - Automation Approved | group_automation.approval_status = approved | Creator + group members |
| OI - Automation Rejected | automation.rejected_reason populated | Creator |
| OI - User Deactivation Alert | pending_action user_deactivation created | Primary leader |
| OI - Auto Removal Executed | auto-removal completes | Primary leader |
| OI - Copilot Token Expired | weekly validation fails | Creator |
| OI - Leader Reassignment Required | leader deactivated | Their leader + admin |
| OI - Flow Activated | FlowBuilder activates a new flow | Group's leadership (informational only — not approval-blocking) |
| OI - Custom Table Submitted | managed_artifact custom_table pending_approval | Creator's primary leader |
| OI - Custom Table Approved | managed_artifact custom_table status = active | Creator |
| OI - Custom Table Rejected | managed_artifact custom_table rejected_reason populated | Creator |
| OI - UI Page Submitted | managed_artifact ui_page pending_approval | Creator's primary leader |
| OI - UI Page Approved | managed_artifact ui_page status = active | Creator |
| OI - UI Page Rejected | managed_artifact ui_page rejected_reason populated | Creator |

---

## Portal Interface — Operations Intelligence

One portal. One URL. The entire platform lives at `/operations_intelligence`.
There is no Standard UI app menu, no separate portal per role, no generic
ServiceNow pages. Every pixel is custom-built for this solution.

Users switch between role-appropriate sections within the same interface — no
navigation to a different URL, no page reload. A leader sees Workspace, My Activity,
and Governance in their nav bar. A creator additionally sees Studio. An admin
additionally sees Command. A regular user sees Workspace and My Activity only.

### Portal Record

| Property | Value |
|---|---|
| Portal ID | `operations_intelligence` |
| Title | Operations Intelligence |
| URL suffix | `/operations_intelligence` |
| Default page | `main` |
| Theme | Fully custom — purpose-built CSS, no OOB theme inherited |
| Unauthenticated | Redirect to ServiceNow login; return to requested URL after auth |

### Pages (2 total)

| Page | Purpose |
|---|---|
| `main` | The single role-based interface. All role sections live here. Never reloads — section switching is handled client-side by the Navigation Bar widget. |
| `onboarding` | Isolated first-login flow for nominees completing onboarding. Separate because the nominee has not yet had their role and group confirmed. Redirects to `main` on completion. |

No catalog page. No governance page. No command page. No studio page. No requests page.
Everything is a section within `main`.

### Navigation Bar

A custom Navigation Bar widget sits at the top of `main`. It evaluates the
current user's ServiceNow roles and active `group_member` records at render time
and displays only the sections that user is permitted to see. A user holding
multiple roles sees all applicable section links simultaneously.

| Section label | URL anchor | Visible to |
|---|---|---|
| Workspace | `#workspace` | All authenticated |
| My Activity | `#activity` | All authenticated |
| Studio | `#studio` | `creator` role |
| Governance | `#governance` | `leadership` role |
| Command | `#command` | `admin` role |

Clicking a nav item sets a shared `activeSection` state in the AngularJS scope.
The Content Area widget watches this value and swaps the rendered section widget
in place. No page navigation, no URL change, no reload.

### Operations Assistant

Persistent right-side collapsible panel pinned to the interface — always present,
never a floating button that appears and disappears. Opens automatically on first
visit with the Welcome topic. The current `activeSection` is passed as `page_id`
to the VA so it is always context-aware.

When a creation tile in the Workspace section is clicked, the VA panel activates
with the matching `pre_intent` already loaded — the conversation begins immediately
without the user typing anything.

### Section Layouts

#### Workspace (all users)
Three-panel layout as defined in the Group Workspace Interface section:
Panel 1 — Automations (trigger on-demand; view status of event-driven)
Panel 2 — Create New tiles (role-filtered; click → VA inline)
Panel 3 — Existing Deliverables (click → GlideModal popup)

#### My Activity (all users)
- Execution history — own executions, row-level ACL, click to expand step log
- Artifact request history — own `managed_artifact` records with status badges;
  click on a draft to resume the creation conversation in the VA panel
- Onboarding status card — shown only while onboarding is still in progress

#### Studio (creator role)
- Quick-start cards: "Build an Automation", "Create a Report/Dashboard",
  "Set Up a Notification", "Create a Flow", "Request a Custom Table"
  — each card pre-fills the VA with the matching creation intent
- Active drafts: in-progress automation and deliverable specs with resume button
- Published automations for my groups: version, usage count, edit / deprecate controls
- Active deliverables for my groups: edit / deactivate / archive controls
- Copilot status banner — persistent warning when token is expired or disconnected

#### Governance (leadership role)
- Pending approvals — unified `pending_action` queue (automation_approval and
  artifact_approval types); inline approve / reject form; escalation indicator
  and deadline countdown
- Group management — group tree scoped to own groups; member list; add / remove
  members; onboarding queue with expiry warnings and re-invite action
- Flow oversight — all flows active for own groups; deactivate toggle; last
  activation log per flow
- Group metrics — execution counts, estimated time saved, active deliverable
  counts per group

#### Command (admin role)
- System-wide metrics overview
- All-groups tree — any group selectable; drill into members, executions,
  deliverables
- All executions — searchable, filterable; step log drill-down per execution
- All deliverables — full `managed_artifact` list across all groups
- Full `pending_action` queue across all types and all users
- Audit log — `AuditService` entries; searchable by action, user, date range
- System config — editable key configuration properties; debug mode toggle

### Custom Widgets (all purpose-built — no OOB widgets used anywhere)

| Widget | Section(s) | Purpose |
|---|---|---|
| Navigation Bar | Global — `main` page | Role-filtered section links, branding, user profile, `activeSection` state management |
| Content Area | Global — `main` page | Watches `activeSection`; swaps the correct section widget into the content frame |
| Operations Assistant Panel | Global — `main` page | Persistent right-side panel; always visible; wired to `activeSection` as `page_id` and to `pre_intent` from creation tiles |
| Workspace Automation Panel | workspace | Automation cards — Trigger button (on-demand) or status + activity count (event-driven); GlideModal for flow detail view |
| Deliverable Type Tiles | workspace | Role-filtered creation tiles; click sets `pre_intent` and opens VA panel |
| Deliverable Cards | workspace, studio | `managed_artifact` cards; click → GlideModal viewer; creator edit/deactivate/archive controls on own artifacts |
| GlideModal Viewer | workspace, studio | Opens artifact in popup: `report_viewer.do` for reports, `$pa_dashboard.do` for PA dashboards, OI info page for notifications/scheduled jobs/flows, `sys_ui_page` frame for custom UI pages |
| Execution History | activity | Own execution cards; row-level ACL; click to expand step log detail inline |
| Artifact History | activity | Own `managed_artifact` cards; status badges; click draft → resumes VA conversation |
| Creator Studio Panel | studio | Quick-start cards, draft list, published artifact management, Copilot status banner |
| Pending Approvals | governance | `pending_action` queue with inline approve/reject form and escalation indicators |
| Group Manager | governance | Group tree, member management, onboarding queue, re-invite controls |
| Flow Oversight | governance | Active flows for own groups; deactivate toggle; activation log |
| Group Metrics | governance | Execution counts, time saved, deliverable counts — charts per group |
| Admin Overview | command | System-wide metrics, all-groups tree, execution and deliverable search |
| Audit Log Viewer | command | `AuditService` records; searchable and filterable |
| System Config Panel | command | Editable configuration properties, debug mode toggle |
| Onboarding Progress | `onboarding` page | Step tracker, role/group confirmation, first-login guided flow |

---

## Automation Step Action Types

| Action Type | Description | Notes |
|---|---|---|
| `record_create` | Creates any ServiceNow record | Table and field values in configuration JSON |
| `record_update` | Updates an existing record | Can reference outputs from record_query steps |
| `record_query` | Reads data for use in subsequent steps | Output stored in execution context |
| `flow_trigger` | Triggers an admin-approved Flow Designer flow | Selects from approved_flow table only |
| `rest_call` | Calls an external REST API | RESTBridge handles auth, timeout, retry |
| `send_notification` | Sends email and/or in-app notification | Uses NotificationService templates |
| `approval_gate` | Pauses execution pending human approval | execution.status = awaiting_approval |
| `conditional_branch` | If/else branching on a condition | branch_true_step and branch_false_step on the step record |

Scheduled execution is NOT a step type — managed via automation_schedule and
ScheduleManager as an independent trigger.

### Action Type Configuration Schemas

The `automation_step.configuration` field stores action-specific JSON.
Template variables (Execution Context Variables section) are resolved before
each step executes. Credentials are NEVER hardcoded — use context variables
or ServiceNow Connection aliases.

**record_create**
```json
{
  "table": "incident",
  "fields": {
    "short_description": "{{input.description}}",
    "caller_id": "{{context.user_sys_id}}",
    "urgency": "2"
  },
  "output_field": "created_incident"
}
```
`output_field` stores the created record sys_id as `{{steps.N.output.created_incident}}`.

**record_update**
```json
{
  "table": "incident",
  "query_field": "sys_id",
  "query_value": "{{steps.1.output.created_incident}}",
  "fields": {
    "state": "2",
    "comments": "Processed by Operations Intelligence"
  }
}
```

**record_query**
```json
{
  "table": "incident",
  "conditions": [
    { "field": "caller_id", "operator": "=",  "value": "{{context.user_sys_id}}" },
    { "field": "state",     "operator": "!=", "value": "6" }
  ],
  "order_by": "sys_created_on",
  "order_direction": "desc",
  "limit": 10,
  "output_field": "open_incidents"
}
```
`{{steps.N.output.open_incidents}}` is an array; index as `[0]`, `[1]`, etc.

**flow_trigger**
```json
{
  "approved_flow_sys_id": "abc123...",
  "inputs": {
    "requester":    "{{context.user_sys_id}}",
    "description":  "{{input.description}}"
  },
  "wait_for_completion": false
}
```
`approved_flow_sys_id` is the sys_id of the `approved_flow` record.
FlowBridge resolves the actual `sys_hub_flow.sys_id` at runtime.

**rest_call**
```json
{
  "method": "POST",
  "url": "https://api.example.com/endpoint",
  "headers": { "Content-Type": "application/json" },
  "body": "{\"user\": \"{{context.user_email}}\", \"note\": \"{{input.message}}\"}",
  "auth_type": "bearer",
  "credential_alias": "example_api_alias",
  "timeout_ms": 10000,
  "output_field": "api_response"
}
```
`credential_alias` references a ServiceNow Connection & Credential alias managed
by admin. Never hardcode secrets in configuration JSON.

**send_notification**
```json
{
  "template": "OI - Automation Approved",
  "recipients": ["{{context.user_email}}"],
  "body_vars": {
    "automation_name": "{{context.automation_name}}",
    "execution_ref":   "{{context.execution_sys_id}}"
  }
}
```

**approval_gate**
```json
{
  "approver_type": "person",
  "approver_ref": "{{context.primary_leader_sys_id}}",
  "notification_template": "OI - Automation Submitted",
  "timeout_hours": 72,
  "timeout_action": "escalate",
  "escalate_to": "{{context.leader_of_leader_sys_id}}"
}
```
ExecutionEngine sets `execution.status = awaiting_approval` and creates a
`pending_action` record for the approver. Approval/rejection resumes or
terminates the execution.

**conditional_branch**
```json
{
  "condition_type": "comparison",
  "left_operand":  "{{steps.1.output.open_incidents}}",
  "operator":      "is_not_empty",
  "right_operand": ""
}
```
Supported operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`,
`is_empty`, `is_not_empty`. `branch_true_step` and `branch_false_step`
are on the `automation_step` record, not inside this JSON.

---

## Scheduled Jobs

All jobs initially inactive during build; activated in step 14.
Any job failure generates an admin in-app notification and an AuditService
log entry — no automation is silently abandoned.

| Job | Frequency | Notes |
|---|---|---|
| OI - Validate Creator Copilot Tokens | Weekly | Pings Copilot API; marks expired; notifies creator. On API unreachable: logs warning, no status change. |
| OI - Onboarding Expiry Check | Hourly | Expires requests past deadline; creates pending_action for leader. |
| OI - Approval Escalation Check | Every 6 hours | Updates assigned_to on existing pending_action records past 72h (covers both automation and artifact approvals). |
| OI - Deactivation Auto-Remove | Every 2 hours | Executes removal where deadline passed and no leader action taken. |
| OI - Execution Cleanup | Daily | Hard-deletes execution_step_log + parent execution records older than retention threshold. EXCLUDES executions with status = awaiting_approval regardless of age. |

---

## Key Configuration Properties

`{scope}` = the value printed by `01_bootstrap_api_access.js` as **Scope**.

| Property | Default | Description |
|---|---|---|
| `{scope}.debug_mode` | `false` | Enable debug logging |
| `{scope}.version` | `1.0.0` | Platform version |
| `{scope}.invitation_expiry_hours` | `48` | Onboarding invitation lifetime |
| `{scope}.max_reinvitations` | `2` | Maximum re-invitations per onboarding request |
| `{scope}.approval_escalation_hours` | `72` | Hours before approval escalates |
| `{scope}.deactivation_action_hours` | `48` | Hours for leader to act on deactivation |
| `{scope}.leader_reassignment_hours` | `72` | Hours to reassign deactivated leader's reports |
| `{scope}.execution_log_retention_days` | `90` | Days before hard-deleting execution records (awaiting_approval excluded) |
| `{scope}.copilot_api_endpoint` | `https://api.githubcopilot.com` | Copilot API base URL |
| `{scope}.copilot_timeout_ms` | `15000` | Copilot API call timeout in milliseconds |
| `{scope}.catalog_top_n` | `5` | Automations shown in welcome message |
| `{scope}.max_custom_tables_per_group` | `10` | Maximum approved custom tables per group |
| `{scope}.max_flow_actions` | `20` | Maximum actions per creator-built flow |
| `{scope}.artifact_log_retention_days` | `365` | Days before archived managed_artifact records are eligible for purge |

---

## Scoped Application Setup

The scoped application must be created manually in ServiceNow Studio before
running any of the background scripts. This establishes the application scope,
generates the `{scope}` prefix, and registers the app in the system.

### Step 1 — Open Studio

1. Navigate to: **System Applications → Studio** (or search "Studio" in the App Navigator)
2. Click **Create Application**
3. Select **Start from scratch**

### Step 2 — Application Details

| Field | Value |
|---|---|
| Name | `Operations Intelligence` |
| Scope | `x_opsi_ops_int` (suggested; type exactly as shown if this prefix is available on your instance) |
| Version | `1.0.0` |
| Short description | Enterprise intelligent automation and deliverable platform |

> **Note on scope prefix:** ServiceNow may auto-suggest a scope based on the
> application name — you can overwrite it. The exact prefix does NOT have to be
> `x_opsi_ops_int`. Whatever value is set here becomes `{scope}` throughout the
> entire architecture. The `01_bootstrap_api_access.js` script prints the resolved
> `{scope}` value after the app is created — use that output as the authoritative
> reference for all subsequent build steps.

### Step 3 — Create Application Roles

After the app is created, remain in Studio and create the four application roles:

| Role name (suffix) | Full scoped name | Description |
|---|---|---|
| `admin` | `{scope}.admin` | Platform administrators — full access |
| `leadership` | `{scope}.leadership` | Business leaders — group governance and approvals |
| `creator` | `{scope}.creator` | Power users — design automations and deliverables |
| `user` | `{scope}.user` | All other staff — trigger automations, request deliverables |

In Studio: **File → Create Application File → Application Role**
Create one role at a time. ServiceNow automatically prefixes the role with the
application scope.

### Step 4 — Confirm the Active Scope

After the app is created, confirm the scope picker in the ServiceNow banner
(top-right corner) shows **Operations Intelligence**, not **Global**. All
subsequent configuration — tables, Script Includes, BRs, ACLs — must be created
while this scope is active. Artifacts created under the wrong scope cannot be
easily moved.

### Step 5 — Run the Bootstrap Scripts

Run scripts in order from **System Definition → Scripts - Background**:

| Script | Purpose |
|---|---|
| `01_bootstrap_api_access.js` | Creates service account `svc_claude_api` with admin role; prints credentials, instance URL, and the resolved `{scope}` prefix. **Capture this output** — it is the prerequisite for all REST-based build tooling. |
| `03_setup_update_sets.js` | Creates the batch update set structure (4 child sets); activates "OI v1.0 — Data Foundation" as the current update set. Run after capturing credentials from the above. |

**Do not proceed to the main build until:**
- `01_bootstrap_api_access.js` output has been captured (credentials + `{scope}` prefix)
- The active update set shown in the top banner reads **OI v1.0 — Data Foundation**
- The scope picker still shows **Operations Intelligence**

---

## Update Set & Migration Strategy

Operations Intelligence uses a **batch update set** structure that groups build
artifacts into four logically cohesive child sets. Each child can be individually
reviewed; the parent batch promotes all four atomically.

### Batch Structure

```
sys_update_set_batch  (parent)
  └── "Operations Intelligence v1.0.0"
        │
        ├── "OI v1.0 — Data Foundation"
        │     19 custom tables (fields, choice lists, reference fields)
        │     Roles and ACLs (table-level, row-level, field-level)
        │     Seed data: automation_category + approved_flow records
        │
        ├── "OI v1.0 — Application Logic"
        │     20 Script Includes (in dependency order)
        │     5 Business Rules
        │     5 Scheduled Jobs (initially inactive)
        │     14 system properties
        │
        ├── "OI v1.0 — Notifications & VA"
        │     22 notification templates
        │     VA Channel (Operations Assistant)
        │     NLU Model (Operations Intelligence NLU)
        │     23 VA System Topics
        │
        └── "OI v1.0 — Portal Interface"
              Portal record + custom theme
              2 portal pages (main + onboarding)
              18 custom widgets
              GitHub Copilot Connection alias + REST Message record
```

### Environment-Specific Configuration (kept separate)

A fifth update set is maintained per environment and is **NOT included in the
batch**. Keeping it separate prevents dev credentials or debug settings from
being overwritten by a batch migration.

| Update set name | Contents |
|---|---|
| `OI — Environment Config (dev)` | `debug_mode`, `copilot_api_endpoint`, connection aliases, integration credentials |
| `OI — Environment Config (test)` | Same properties with test-environment values |
| `OI — Environment Config (prod)` | Same properties with production values |

Each environment config update set is applied manually on the target instance,
never promoted as part of the batch.

### NLU Model Migration Note

The `Operations Intelligence NLU` model record migrates via the batch (as a
`sys_nlu_model` record in "OI v1.0 — Notifications & VA"). However, **trained
model weights are NOT captured in update sets** — update sets record configuration
only, not ML state.

After promoting the batch to each environment, trigger a fresh NLU training run:

```
POST /api/sn_nlu/v1/model/{nlu_model_sys_id}/train
Authorization: Basic {svc_claude_api credentials on that instance}
```

Training runs against the same VA topics that were promoted; results are
equivalent. Typical completion: 2–5 minutes.

### Migration Sequence

```
DEV — build and verify
  1. Run 02_verify_implementation.js — all checks must pass
  2. Ensure all 4 child update sets are fully committed (no open transactions)
  3. Export batch update set XML from System Update Sets > Batch Update Sets

TEST
  4. Import the batch XML (System Update Sets > Retrieved Update Sets > Import XML)
  5. Preview the batch — resolve any conflicts before applying
  6. Apply batch (dependency order enforced: Data Foundation applied first)
  7. Apply OI — Environment Config (test) manually
  8. Trigger NLU model retraining (POST to train endpoint on test instance)
  9. Run 02_verify_implementation.js on test — all checks must pass
  10. Execute End-to-End Test Checklist (items 1–15 minimum)

PRODUCTION
  11. Import the same batch XML (no re-export needed)
  12. Preview and apply
  13. Apply OI — Environment Config (prod) manually
  14. Trigger NLU model retraining
  15. Run 02_verify_implementation.js on prod — all checks must pass
  16. Activate Scheduled Jobs (step 14 of Build Sequence)
  17. Smoke-test: admin onboards one leader; confirm VA responds correctly
```

### Switching the Active Child Update Set During Build

`03_setup_update_sets.js` creates all four child sets and activates
"OI v1.0 — Data Foundation" automatically. Switch the active child before
starting each build phase — ServiceNow captures every artifact into whichever
child is active at creation time.

| Build phase | Active child update set |
|---|---|
| Steps 1–3 (tables, ACLs, seed data) | OI v1.0 — Data Foundation |
| Steps 4–6 (Script Includes, BRs, Jobs) + properties | OI v1.0 — Application Logic |
| Steps 7–10 (notifications, VA, NLU) | OI v1.0 — Notifications & VA |
| Steps 11–13 (portal, widgets, Copilot integration) | OI v1.0 — Portal Interface |

Switch via: **System Update Sets → Local Update Sets** → click the target child
→ click **Make Current**.

---

## Build Order

### Pre-Build
1. Create the scoped application in Studio (see **Scoped Application Setup** section)
2. Run `01_bootstrap_api_access.js` — capture credentials and `{scope}` prefix
3. Run `03_setup_update_sets.js` — creates batch structure; activates Data Foundation set
4. Confirm: scope picker = **Operations Intelligence**; active update set = **OI v1.0 — Data Foundation**

### Custom Tables (19 total — created in step 1)

| # | Table (unprefixed) | Purpose |
|---|---|---|
| 1 | `person` | OI-specific user profile |
| 2 | `reporting_relationship` | Leader-to-user hierarchy |
| 3 | `group` | OI groups (leadership + custom) |
| 4 | `group_member` | Group membership with group role |
| 5 | `onboarding_request` | Invitation lifecycle |
| 6 | `automation_category` | Admin-managed taxonomy |
| 7 | `approved_flow` | Admin-curated Flow Designer flows |
| 8 | `automation` | Core automation definition |
| 9 | `automation_version` | Publish-time snapshots (immutable) |
| 10 | `automation_step` | Step definitions |
| 11 | `automation_input` | Input field definitions |
| 12 | `group_automation` | Group to automation assignment + approval |
| 13 | `execution` | Runtime execution records |
| 14 | `execution_step_log` | Per-step execution log |
| 15 | `automation_schedule` | Scheduled execution triggers |
| 16 | `use_case_request` | NLU requirements capture + Copilot spec |
| 17 | `creator_credential` | Encrypted GitHub PAT storage |
| 18 | `pending_action` | Leadership action queue |
| 19 | `managed_artifact` | Registry of all OI-created deliverables |

### Build Sequence

1. **Core tables** — all 19 tables with fields, choice lists, reference fields
2. **Seed data** — `automation_category` initial records; `approved_flow` initial curated flows
   (tables must exist before seed data is inserted)
3. **Roles and ACLs** — system roles, complete table-level ACLs, row-level ACLs,
   field-level ACLs. Verify github_pat read-deny via REST before proceeding.
   Verify managed_artifact.artifact_sys_ids and creation_spec field ACLs.
4. **Script Includes** — in dependency order:
   `PermissionResolver` -> `VAHelper` -> `NotificationService` -> `GroupManager` ->
   `CatalogService` -> `ScheduleManager` -> `ExecutionEngine` -> `ApprovalRouter` ->
   `OnboardingService` -> `DeactivationHandler` -> `FlowBridge` -> `RESTBridge` ->
   `CopilotBridge` -> `AuditService` -> `ArtifactManager` ->
   `ReportBuilder` -> `NotificationBuilder` -> `FlowBuilder` ->
   `TableBuilder` -> `UIPageBuilder`
5. **Business Rules** — all 5 OI BRs in the order listed in the Business Rules section
6. **Scheduled Jobs** — all 5 jobs, initially inactive
7. **Notification Templates** — all 22 OI notification records
8. **VA NLU Model** — create `Operations Intelligence NLU` model record
9. **VA System Topics** — all 23 system topics linked to Operations Assistant channel
10. **NLU Initial Training** — trigger first model train via REST; poll until status = ready
11. **Portal Interface** — portal record (url_suffix = `operations_intelligence`,
    default page = `main`), fully custom theme, 2 pages (`main` + `onboarding`),
    all 18 custom widgets; verify role-based section rendering for all 4 roles
12. **Custom topic auto-generation Business Rule** — on `group_automation` table,
    fires when `approval_status` changes to `approved`;
    calls `CatalogService.onPublish()` which creates VA topic + NLU intent + retraining
13. **GitHub Copilot integration** — CopilotBridge Connection alias, REST Message record,
    `{scope}.copilot_api_endpoint` and `{scope}.copilot_timeout_ms` properties
14. **Activate Scheduled Jobs** — enable all 5 jobs
15. **End-to-end testing** — run `02_verify_implementation.js` first, then Test Checklist

### End-to-End Test Checklist

| # | Test | Expected outcome |
|---|---|---|
| 1 | Admin onboards a leader via Operations Assistant | Leader receives OI - Onboarding Invitation; `onboarding_request` created with 48h expiry |
| 2 | Leader completes onboarding | `person` record created; `leadership` role granted; Leadership Group auto-created |
| 3 | Leader onboards a user (direct report) | User invited; `reporting_relationship` (type: primary) created on completion |
| 4 | Leader appoints a creator (Appoint Creator topic) | `creator` system role granted; `group_member` with group_role = creator created |
| 5 | Creator connects GitHub PAT | PAT validated against Copilot API; stored encrypted; `person.copilot_enabled = true` |
| 6 | Verify github_pat unreadable | `GET /api/now/table/{scope}_creator_credential/{sys_id}?sysparm_fields=github_pat` as admin must return null or empty — never the PAT |
| 7 | Creator builds automation without Copilot | `use_case_request` fully populated; `copilot_enhanced = false`; submitted; `pending_action` created for leader |
| 8 | Creator builds automation with Copilot | Copilot phrases appended (not replaced); creator reviews merged list; `copilot_phrases_applied = true` after confirm |
| 9 | Simulate Copilot failure (revoke token before Phase 3) | Silent fallback; "AI enhancement unavailable" shown; original spec submitted unchanged |
| 10 | Leader approves automation | `automation.status = published`; VA topic active; NLU intent active; NLU model retraining triggered; OI - Automation Approved sent |
| 11 | Leader rejects automation | `automation.status = draft`; `rejected_reason` populated; OI - Automation Rejected sent to creator |
| 12 | User triggers automation via VA | Execution created (`is_test = false`); all steps logged; `usage_count` incremented; execution reference shown to user |
| 13 | Creator runs test execution via Studio | Execution created (`is_test = true`); steps logged; `usage_count` NOT incremented |
| 14 | User deactivated in ServiceNow | `OI - Deactivation Detector` fires; `pending_action` created for leader; 48h deadline; OI - User Deactivation Alert sent |
| 15 | Leader deactivated | Their leader + admin notified via OI - Leader Reassignment Required; pending approvals reassigned immediately |
| 16 | Cross-group publish | Primary group approved; additional group owner receives OI - Cross-Group Approval Request; partial publish confirmed |
| 17 | Deprecation with running execution | `automation.status = deprecation_queued`; schedule deactivated; admin sees warning; auto-transitions to deprecated when execution completes |
| 18 | Invitation expiry and re-invite | After 48h: status = expired; leader re-sends (max 2); third attempt blocked |
| 19 | Self-approval guard | Creator whose primary leader IS themselves -> escalated immediately to leader's leader; no 72h wait |
| 20 | Zero-groups login | Welcome topic fires; zero-groups message branch shown; no catalog rendered |
| 21 | User requests a PA dashboard via VA | Requirements captured; Copilot fills technical gaps; `managed_artifact` created (type: pa_dashboard, status: active); underlying pa_dashboard record created immediately; no approval step |
| 22 | User requests a notification rule via VA | Condition + recipients + email template captured; Copilot fills gaps; notification rule active immediately; `managed_artifact` created |
| 23 | Creator builds a flow via VA | Trigger + condition + actions captured in plain English; Copilot translates to flow config; flow activated; `managed_artifact` created; OI - Flow Activated sent to leadership |
| 24 | Leadership deactivates a creator's flow | Flow deactivated in ServiceNow; `managed_artifact.status = inactive`; creator notified |
| 25 | Creator requests a custom table | Requirements captured; Copilot generates full field spec; creator reviews; `managed_artifact` (status: pending_approval) created; OI - Custom Table Submitted sent to leader |
| 26 | Leader approves custom table | `managed_artifact.status = active`; TableBuilder creates scoped table; OI - Custom Table Approved sent to creator |
| 27 | Leader rejects custom table | `managed_artifact.status = draft`; OI - Custom Table Rejected with reason sent to creator |
| 28 | Creator archives a deliverable | `managed_artifact.status = archived`; underlying ServiceNow record deleted; archived record preserved in OI |
| 29 | Verify managed_artifact.artifact_sys_ids unreadable by non-admin | Field-level ACL blocks read for non-System/non-admin callers |
| 30 | Copilot gap-fill for deliverable with no PAT | Manual clarifying questions only; no Copilot call attempted; creation still completes successfully |
