# Operations Intelligence — Solution Architecture

## Platform Overview

**Operations Intelligence** is an enterprise intelligent automation platform
built as a ServiceNow scoped application. It enables organisations to create,
govern, and interact with automations entirely through natural language via
the Operations Assistant (Virtual Agent), with structured approval workflows
and role-based group governance.

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
| Admin interface | Operations Command |
| Leadership interface | Operations Governance |
| Creator interface | Operations Studio |
| User portal | Operations Workspace |
| VA / AI layer | Operations Assistant |
| Service Portal ID | `operations_intelligence` |
| Portal URL suffix | `/operations_intelligence` |
| App Navigator menu | Operations Intelligence |
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
| `creator` | Appointed power users | Design automations for assigned groups |
| `user` | All other staff | Trigger automations via Assistant or Workspace |

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
| `creator` | Leadership via Appoint Creator topic | Can design automations scoped to this group |
| `user` | Leadership during onboarding | Can trigger automations in this group |

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
                 └── CREATOR designs automations scoped to their group(s)
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

Automations assigned to a parent group are NOT automatically inherited by
child groups. Each group's catalog is managed independently.

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
        targets. Creators see display_name and description — never the sys_id.
        FlowBridge resolves flow_sys_id to sys_hub_flow at execution time.

automation
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
  action_type               user_deactivation / automation_approval /
                            onboarding_expiry / token_expiry /
                            leader_reassignment
                            NOTE: approval escalation UPDATES the existing
                            pending_action record (status = escalated,
                            assigned_to changes to the leader's leader).
                            A new pending_action record is NOT created for
                            escalation — one traceable record per approval.
  subject_user              person reference (who the action concerns)
  related_automation        automation reference (automation_approval type)
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
| `FlowBridge` | Triggers approved flows — resolves approved_flow.flow_sys_id to sys_hub_flow |
| `RESTBridge` | Outbound REST executor for rest_call steps: auth, timeout, retry |
| `CopilotBridge` | GitHub Copilot API: write-only PAT access, timeout, fallback, phrase merge |
| `AuditService` | Field-level audit logging for admin actions on key tables |

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

### Field-Level ACLs

| Table | Field | Read | Write |
|---|---|---|---|
| `creator_credential` | `github_pat` | NOBODY — including admin, including elevated-privilege scripts. CopilotBridge reads via privileged GlideRecord without returning the value. | Own user only |
| `execution` | `input_values` | triggered_by OR leadership/admin of that group | System only |
| `use_case_request` | `structured_spec` | submitted_by OR leadership/admin | System only |
| `use_case_request` | `description` | submitted_by OR leadership/admin | submitted_by |

### Auditing
Field-level auditing enabled on:
`automation` · `group` · `group_member` · `reporting_relationship` ·
`pending_action` · `creator_credential` (metadata fields only — github_pat excluded)

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
The Operations Assistant widget passes `page_id` as a VA session variable.
VAHelper reads this to adjust welcome message and topic routing per interface.
On the `governance` page the embedded panel opens to the pending approvals
summary. On `studio` it opens to creation guidance.

### System Topics (15 total)

| Topic | Fires when | Purpose |
|---|---|---|
| [Operations Intelligence] Welcome | VA opens on any page | Role-aware greeting; top 5 most-used group automations + "See all [X]"; zero-groups message rendered as inline branch within this topic — not a separate invocation |
| [Operations Intelligence] Complete Onboarding | First login post-invitation | Walks nominee through role, group, capabilities; Copilot setup for creators |
| [Operations Intelligence] Copilot Setup | Creator connects Copilot or during onboarding | Step-by-step PAT guidance, validation, confirmation |
| [Operations Intelligence] Onboard Leadership | Admin initiates | Leadership onboarding — sets delegation rights |
| [Operations Intelligence] Onboard Sub-Leadership | Leader initiates (delegation_rights=true) | Sub-leader onboarding — cannot exceed parent's delegation level |
| [Operations Intelligence] Onboard User | Leader initiates | Direct report onboarding — existing person check first |
| [Operations Intelligence] Appoint Creator | Leader initiates | Grants creator group role; creator system role auto-granted |
| [Operations Intelligence] Create Group | Leader initiates | Custom group creation, member selection, creator assignment |
| [Operations Intelligence] Create Automation | Creator initiates | Full multi-turn NL requirements conversation, resumable |
| [Operations Intelligence] Review Approvals | Governance page or leadership request | Walks through pending_action queue |
| [Operations Intelligence] Deactivation Action | Leader receives deactivation pending_action | Guided resolution: approve / notify / escalate |
| [Operations Intelligence] Re-invite User | Leader requests after expiry | Re-sends invitation (max 2 re-invitations) |
| [Operations Intelligence] Check Status | User mentions reference or asks about request | Execution status lookup by reference or description |
| [Operations Intelligence] Help & Fallback | No intent matched | Suggests 3 closest available automations; never a dead end |
| [Operations Intelligence] Approval Review | Leadership pending_action automation_approval | Guided approval: review spec, approve or reject with reason |

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

### Request Contract

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

### PAT Access Pattern
CopilotBridge never returns or logs the decrypted PAT value. It reads the
password2 field via an elevated GlideRecord call, passes it directly to the
outbound REST request, and discards the reference. No caller receives the
plain-text value.

### Timeout and Fallback
- Timeout: `{scope}.copilot_timeout_ms` (default 15000ms)
- On timeout, HTTP error, parse failure, or credits exhausted:
  - `use_case_request.copilot_enhanced = false`
  - Return original structured_spec unchanged
  - Creator sees: "AI enhancement unavailable — your automation is complete"
  - Log error details to AuditService (not surfaced to creator)

---

## Notification Templates (15 total)

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

---

## Service Portal — Operations Workspace

| Property | Value |
|---|---|
| Portal ID | `operations_intelligence` |
| Title | Operations Workspace |
| URL suffix | `/operations_intelligence` |
| Default page | `home` |
| Unauthenticated access | Redirect to ServiceNow login; return to requested page after auth |
| Theme | Inherits existing Service Portal theme |

### Pages

| Page ID | Name | Visible to |
|---|---|---|
| `home` | Home | All authenticated |
| `catalog` | Automation Catalog | All authenticated |
| `my_requests` | My Requests | All authenticated |
| `onboarding` | Onboarding | Nominees with status = pending / in_progress |
| `studio` | Operations Studio | creator, leadership, admin |
| `governance` | Operations Governance | leadership, admin |
| `command` | Operations Command | admin |

### Widgets

All widgets built with Bootstrap responsive grid — mobile-first layout.

| Widget | Pages | Notes |
|---|---|---|
| Welcome Banner | home | Role-aware; shows name, role, group membership |
| Automation Card | catalog, home | Uses short_description, category colour, usage_count |
| Catalog Browser | catalog | Filter by category, group, search; top-5 default (configurable) |
| Execution History | my_requests, home | Row-level ACL — user sees own executions only |
| Group Manager | governance | Hierarchical group tree, member management |
| Pending Actions | governance, command | Unified queue: approvals + deactivations + expiries |
| Creator Studio Panel | studio | Automation builder, spec review, Copilot status banner |
| Metrics Dashboard | governance, command | Usage counts, success rates, time saved, group activity |
| Onboarding Progress | onboarding | Step tracker, role/group confirmation |
| Operations Assistant Launcher | all pages | Floating button bottom-right; passes page_id as VA session variable |
| Copilot Status Banner | studio | Persistent warning when token expired or disconnected |

---

## Standard UI — Operations Intelligence App Menu

| Module | Role | Notes |
|---|---|---|
| Operations Command | admin | Full system view, all groups, all executions |
| Operations Governance | leadership | Scoped to own groups and direct reports |
| Operations Studio | creator | Scoped to groups where group_role = creator |
| My Workspace | user | Scoped to own executions and group catalog |
| Execution Logs | admin, leadership | Admin: all logs; leadership: own groups only |

---

## VA Placement Per Interface

| Interface | Placement | Behaviour |
|---|---|---|
| Operations Workspace (portal) | Floating button, bottom-right, all pages | Auto-opens on first-ever visit; page_id passed as context |
| Standard UI | Help panel (separate entry from Now Support) | Opens on demand; role-aware greeting |
| Operations Governance page | Embedded side panel | page_id = governance; opens to pending approvals directly |
| Operations Studio page | Embedded side panel | page_id = studio; opens to creation guidance directly |

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

All jobs initially inactive during build; activated in step 15.
Any job failure generates an admin in-app notification and an AuditService
log entry — no automation is silently abandoned.

| Job | Frequency | Notes |
|---|---|---|
| OI - Validate Creator Copilot Tokens | Weekly | Pings Copilot API; marks expired; notifies creator. On API unreachable: logs warning, no status change. |
| OI - Onboarding Expiry Check | Hourly | Expires requests past deadline; creates pending_action for leader. |
| OI - Approval Escalation Check | Every 6 hours | Updates assigned_to on existing pending_action records past 72h. |
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

---

## Build Order

### Pre-Build
- Create update set: `Operations Intelligence v1.0 — Initial Build`
- All artifacts created within this update set
- Export and promote through dev -> test -> production

### Custom Tables (18 total — created in step 1)

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

### Build Sequence

1. **Core tables** — all 18 tables with fields, choice lists, reference fields
2. **Seed data** — `automation_category` initial records; `approved_flow` initial curated flows
   (tables must exist before seed data is inserted)
3. **Roles and ACLs** — system roles, complete table-level ACLs, row-level ACLs,
   field-level ACLs. Verify github_pat read-deny via REST before proceeding.
4. **Script Includes** — in dependency order:
   `PermissionResolver` -> `VAHelper` -> `NotificationService` -> `GroupManager` ->
   `CatalogService` -> `ScheduleManager` -> `ExecutionEngine` -> `ApprovalRouter` ->
   `OnboardingService` -> `DeactivationHandler` -> `FlowBridge` -> `RESTBridge` ->
   `CopilotBridge` -> `AuditService`
5. **Business Rules** — all 5 OI BRs in the order listed in the Business Rules section
6. **Scheduled Jobs** — all 5 jobs, initially inactive
7. **Notification Templates** — all 15 OI notification records
8. **VA NLU Model** — create `Operations Intelligence NLU` model record
9. **VA System Topics** — all 15 system topics linked to Operations Assistant channel
10. **NLU Initial Training** — trigger first model train via REST; poll until status = ready
11. **Service Portal** — portal record (url_suffix = `operations_intelligence`, default page = `home`),
    theme inheritance, all 7 pages, all 11 widgets
12. **Standard UI** — app menu `Operations Intelligence`, all 5 modules with role gates
13. **Custom topic auto-generation Business Rule** — on `group_automation` table,
    fires when `approval_status` changes to `approved`;
    calls `CatalogService.onPublish()` which creates VA topic + NLU intent + retraining
14. **GitHub Copilot integration** — CopilotBridge Connection alias, REST Message record,
    `{scope}.copilot_api_endpoint` and `{scope}.copilot_timeout_ms` properties
15. **Activate Scheduled Jobs** — enable all 5 jobs
16. **End-to-end testing** — run `02_verify_implementation.js` first, then Test Checklist

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
