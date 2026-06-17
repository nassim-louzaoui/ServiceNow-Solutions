# Operations Intelligence — Solution Architecture

## Platform Overview

**Operations Intelligence** is an enterprise intelligent automation platform
built as a ServiceNow scoped application. It enables organisations to create,
govern, and interact with automations entirely through natural language via
the Operations Assistant (Virtual Agent), with structured approval workflows
and role-based group governance.

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
| Service Portal ID | operations_intelligence |
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
| `admin` | IT / platform team | Full system access, onboards leadership |
| `leadership` | Business leaders | Group governance, user onboarding, approvals |
| `creator` | Appointed power users | Design automations for assigned groups |
| `user` | All other staff | Trigger automations via Assistant or Workspace |

Viewer role is intentionally excluded. Every legitimate read-only need is
covered — leadership has full reporting in Operations Governance, admins
have the full audit trail in Operations Command. A person in a group should
be able to use it, not merely observe it.

When leadership appoints a user as group creator, the system automatically
grants them the `creator` system role (for Studio access) AND creates a
`group_member` record with `group_role = creator` for that group.

### Group Roles (within a specific group, independent of system role)

| Group Role | Granted by | Effect |
|---|---|---|
| `creator` | Leadership | Can design automations scoped to this group |
| `user` | Leadership | Can trigger automations in this group |

A person can hold `creator` group role in Group A and `user` group role in
Group B simultaneously. System role `creator` is granted once — group role
entries define the specific groups they create for.

---

## Organisational Hierarchy

```
ADMIN
  └── onboards LEADERSHIP (top-level, sets delegation_rights on person record)
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
- `delegation_rights` lives exclusively on the `person` record — not duplicated on the relationship

### Delegation Rights
- Admin sets `person.delegation_rights` when onboarding a top-level leader
- A leader with `delegation_rights = true` can onboard sub-leaders
- When onboarding a sub-leader, the parent leader sets the sub-leader's
  `delegation_rights` — but cannot grant more than they themselves hold
- Leaders with `delegation_rights = false` can only onboard users

---

## Group Model

| Group Type | Created when | Members |
|---|---|---|
| Leadership Group | Auto-created when a leader is onboarded | All direct reports of that leader |
| Custom Group | Manually created by leadership or admin via VA | Specific subset of users, explicitly added |

### Group Hierarchy
```
Sarah's Team (Leadership Group — parent)
  ├── HR Recruitment (Custom Group — child)
  └── HR Onboarding  (Custom Group — child)
```

Automations assigned to a parent group are NOT automatically inherited by
child groups. Each group's catalog is managed independently by leadership.

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
  delegation_rights         boolean  ← single source of truth, not duplicated
  copilot_enabled           boolean
  active                    boolean
  NOTE: system_role is NOT stored here — always read from ServiceNow roles
        via gs.hasRole(). person table stores OI-specific data only.

reporting_relationship
  leader                    person reference
  direct_report             person reference
  relationship_type         primary / secondary
  created_by                person reference
  created_at                datetime
  status                    active / inactive
  NOTE: delegation_rights removed — lives on person record only

group
  name                      string
  description               string
  type                      leadership_group / custom_group
  owner                     person reference (approver for cross-group publishing)
  parent_group              group reference
  created_by                person reference
  created_at                datetime
  status                    active / archived

group_member
  group                     group reference
  member                    person reference
  group_role                creator / user   ← viewer removed
  added_by                  person reference
  added_at                  datetime
  status                    active / inactive

onboarding_request
  nominee                   person reference
  initiated_by              person reference
  target_group              group reference
  group_role                creator / user   ← viewer removed
  system_role               leadership / user
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
  flow_sys_id               reference to sys_hub_flow
  display_name              string (user-friendly name shown in Assistant)
  description               string (what this flow does, in plain English)
  input_variables           string (JSON — expected inputs)
  active                    boolean
  approved_by               person reference (admin)
  approved_at               datetime
  NOTE: Admin curates this list. Only these flows are available as
        flow_trigger targets during automation creation. Creators
        see display_name and description, never the technical sys_id.

automation
  name                      string
  short_description         string (one-liner for cards and catalog views)
  description               string (full description)
  category                  automation_category reference ← enforced reference
  trigger_phrases           string (JSON array  ← not comma-separated)
  status                    draft / in_review / testing / pending_approval /
                            published / deprecated
  version                   integer (increments on each publish)
  base_automation           automation reference (self-reference — all versions
                            of the same automation share this value;
                            first version: base_automation = own sys_id)
  owner_group               group reference
  created_by                person reference
  submitted_at              datetime
  approved_at               datetime
  approved_by               person reference
  rejected_at               datetime
  rejected_by               person reference
  rejected_reason           string ← required when leadership rejects
  estimated_time_saved      integer (minutes per execution)
  usage_count               integer (maintained by Business Rule on execution)
  browsable                 boolean (true = visible in global catalog for
                            cross-group discovery by leadership/creators)
  active                    boolean

automation_version          ← version history table
  automation                automation reference (the CURRENT version record)
  version_number            integer
  snapshot_steps            string (JSON snapshot of all steps at publish time)
  snapshot_inputs           string (JSON snapshot of all inputs at publish time)
  snapshot_trigger_phrases  string (JSON array)
  published_at              datetime
  published_by              person reference
  NOTE: Created automatically when an automation transitions to published.
        Execution logs reference the version number so history remains
        meaningful even after the automation is updated or deprecated.

automation_step
  automation                automation reference
  order                     integer
  name                      string
  action_type               record_create / record_update / record_query /
                            flow_trigger / rest_call / send_notification /
                            approval_gate / conditional_branch
                            NOTE: scheduled_trigger removed as a step type —
                            see Scheduled Execution section below
  configuration             string (JSON — action-specific config)
  branch_true_step          integer (order of step to execute when condition
                            is true — conditional_branch only)
  branch_false_step         integer (order of step to execute when condition
                            is false — conditional_branch only)
  on_failure                stop / continue / skip
  active                    boolean

automation_input
  automation                automation reference
  order                     integer
  label                     string (what the VA asks the user)
  field_name                string (internal key)
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
  automation_version        integer (version number at time of execution —
                            links to automation_version for historical accuracy)
  triggered_by              person reference
  triggered_at              datetime
  channel                   va / portal / scheduled
  status                    pending / running / success / failed /
                            awaiting_approval / cancelled
  is_test                   boolean (true during automation testing phase —
                            test executions excluded from usage_count and metrics)
  input_values              string (JSON — field-level ACL: triggered_by and
                            leadership/admin only)
  completed_at              datetime
  group                     group reference (denormalised for query performance —
                            maintained by Business Rule, sourced from
                            group_automation on execution creation)

execution_step_log
  execution                 execution reference
  step_order                integer (not a reference — preserves log integrity
                            if step definition changes after execution)
  step_name                 string (copied from automation_step.name at runtime)
  action_type               string (copied at runtime)
  status                    pending / running / success / failed / skipped
  started_at                datetime
  completed_at              datetime
  output                    string (JSON)
  error_message             string
  NOTE: step fields are copied at runtime, not referenced. This ensures
        the log is accurate to what actually ran, not what the step
        definition says today.

automation_schedule         ← replaces scheduled_trigger step type
  automation                automation reference
  schedule_type             recurring / one_time
  cron_expression           string (for recurring)
  run_at                    datetime (for one_time)
  timezone                  string
  active                    boolean
  sysauto_sys_id            string (sys_id of the created sysauto_script record —
                            stored so it can be deactivated on deprecation)
  created_at                datetime
  NOTE: ScheduleManager Script Include creates/manages the underlying
        sysauto_script record. An automation can have a schedule OR be
        triggered on-demand — or both. These are not execution steps;
        they are independent execution triggers managed separately.

use_case_request
  title                     string
  description               string (full NL requirements from conversation)
  structured_spec           string (JSON — parsed from NLU conversation)
  submitted_by              person reference
  target_group              group reference
  additional_groups         string (JSON array of group sys_ids for
                            cross-group publishing requests)
  status                    draft / submitted / in_review / approved /
                            rejected / building / complete
  copilot_enhanced          boolean
  copilot_phrases_applied   boolean (true once Copilot's suggested phrases
                            have been written to automation.trigger_phrases)
  submitted_at              datetime
  reviewed_by               person reference
  reviewed_at               datetime
  resulting_automation      automation reference
```

### Security & Credential Tables

```
creator_credential
  user                      person reference (unique — one per creator)
  github_pat                password2 field
  token_status              active / expired / revoked
  connected_at              datetime
  last_validated_at         datetime
  last_validation_result    success / failed
  ACL — TABLE LEVEL:
    Read:   user = gs.getUserID() only (creator sees own row, no one else)
    Write:  user = gs.getUserID() only
    Delete: admin only (sets status = revoked, clears token — cannot read it)
  ACL — FIELD LEVEL on github_pat:
    Read:   NOBODY — including admin, including scripts running as admin
            The field is write-only at the platform level. CopilotBridge
            uses GlideRecord with elevated privilege solely to pass the
            value to the outbound REST call without ever returning it.
    Write:  user = gs.getUserID() only

pending_action
  action_type               user_deactivation / automation_approval /
                            approval_escalation / onboarding_expiry /
                            token_expiry / leader_reassignment
  subject_user              person reference (who the action concerns)
  related_automation        automation reference (for automation_approval type)
  related_group             group reference (which group's approval)
  assigned_to               person reference (who must act)
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
    ↓ submit
IN REVIEW
  Admin or senior creator validates technical completeness
    ↓ pass review
TESTING
  Creator runs test executions (execution.is_test = true)
  Test executions: log all steps but perform NO real actions
  ExecutionEngine runs in dry-run mode — logs what WOULD happen
  Creator reviews execution_step_log, confirms logic is correct
  Creator marks testing complete
    ↓ pass testing          ↑ reject → back to DRAFT with rejection reason
PENDING APPROVAL
  ApprovalRouter creates pending_action (type: automation_approval) for
  the primary leader (or group owner for cross-group publishing)
  72-hour response window before escalation to leader's leader, then admin
  Self-approval guard: if submitter IS the approver → auto-escalate to
  the submitter's own leader regardless of timing
    ↓ approved              ↑ rejected → back to DRAFT with rejection reason
PUBLISHED
  VA topic activated, NLU intent active, group_automation.approval_status = approved
  automation_version snapshot created
  automation.usage_count maintained by Business Rule on each successful execution
  Deprecation guard: cannot deprecate while any execution.status = running
    ↓ new version submitted → old version → DEPRECATED on new version publish
DEPRECATED
  VA topic deactivated, NLU intent deactivated
  All execution history preserved and linked via automation_version
  automation_schedule.sysauto_sys_id deactivated if schedule existed
```

### Automation Rejection — Return Path
When leadership rejects at PENDING APPROVAL:
- `pending_action.resolution = rejected`
- `automation.rejected_reason` populated (mandatory field on rejection)
- `automation.status` returns to `draft`
- Creator notified with rejection reason via Operations Assistant and email
- Creator can revise and resubmit — version number does NOT increment on resubmit,
  only on publish

### Cross-Group Publishing
- Creator selects additional groups during creation (`use_case_request.additional_groups`)
- Primary group (creator's own) follows standard approval via creator's primary leader
- Each additional group: `group.owner` for that group receives a separate
  `pending_action (type: automation_approval)`
- 72-hour escalation applies independently per group
- `automation.status = published` when primary group approves
- Per-group state tracked in `group_automation.approval_status`
- Partial publish is valid — live in Group A, pending in Group B, rejected in Group C

---

## Scheduled Execution Model

Scheduled execution is architecturally distinct from step-level actions.
An automation_schedule defines WHEN an automation runs. It is not a step
inside an execution — it is an independent trigger that creates new executions.

```
On automation publish (if automation_schedule record exists):
  ScheduleManager creates sysauto_script record
  Stores sysauto_sys_id on automation_schedule for later lifecycle management

sysauto_script fires on schedule:
  Creates execution record (channel = scheduled, triggered_by = system)
  ExecutionEngine runs the automation's steps normally

On automation deprecation:
  ScheduleManager reads automation_schedule.sysauto_sys_id
  Deactivates the sysauto_script record
  Sets automation_schedule.active = false

Running execution protection:
  Deprecation blocked if any execution.status IN (running, awaiting_approval)
  Admin sees warning: "X executions in progress — deprecation queued"
  Deprecation executes automatically when all running executions complete
```

---

## Automation Creation Flow

```
PHASE 1 — NLU Requirements Conversation (always runs, never blocked)
  Operations Assistant guides creator through structured multi-turn dialogue
  Covers: trigger phrases, inputs, steps, conditions, branch logic, schedule
  Progress saved to use_case_request after every turn — fully resumable
  If creator is in multiple groups → Assistant asks which group this is for
  Output: fully populated use_case_request with structured_spec JSON

PHASE 2 — Creator Review
  Structured spec displayed in Operations Studio
  Creator can edit any field directly before proceeding
  Automation is 100% complete and submittable at this point

PHASE 3 — Copilot Enhancement (optional, creator's explicit choice)
  Only offered if creator_credential.token_status = active
  If token is expired → Studio shows persistent warning banner
  Single bounded API call to GitHub Copilot API using creator's stored PAT
  Copilot asked to:
    - Generate additional NLU training phrases
    - Identify logical gaps or missing steps
    - Suggest optimised step ordering
  On success: suggested phrases written to use_case_request AND to
              automation.trigger_phrases once the record is created
              use_case_request.copilot_phrases_applied = true
  On failure (any reason — credits, timeout, network):
    Silent fallback to Phase 2 spec
    Creator sees: "AI enhancement unavailable — your automation is complete
    and ready to submit"
  Creator always has a complete, submittable result regardless of outcome

PHASE 4 — Submit for Leadership Approval
  ApprovalRouter called with use_case_request sys_id
  Self-approval check: if submitted_by primary leader = submitted_by →
    escalate immediately to their leader
  Null-leader check: if primary leader is deactivated or unset →
    route to leader's leader; if none → route to admin
  pending_action created (type: automation_approval) for the approver
  Approver notified — in-app + email
  72-hour window before escalation

PHASE 5 — On Approval
  CatalogService creates automation record from use_case_request.structured_spec
  automation_step and automation_input records created
  If automation_schedule required → ScheduleManager creates sysauto_script
  automation_version snapshot taken (version 1)
  VA topic created (sys_cs_topic) with group membership check as first step
  NLU intent created (sys_nlu_intent) with training utterances from
    automation.trigger_phrases (Copilot-enhanced if Phase 3 ran)
  NLU model retrained (sys_nlu_model training triggered)
  group_automation record created with approval_status = approved
  Creator and group members notified — automation is live
  automation.usage_count initialised to 0
```

---

## User Deactivation Flow

```
sys_user.active set to false
    ↓ Business Rule fires immediately
DeactivationHandler determines:
  Is this person a LEADER?
    YES → leader_deactivation sub-flow (see below)
  Does this person have executions with status = awaiting_approval?
    YES → include in pending_action notes for leader awareness

Primary leader notified — in-app + email — immediately
pending_action created (type: user_deactivation, deadline = 48h)
    │
    ├── Leader: APPROVE REMOVAL (via Operations Governance or Assistant)
    │     → group_member.status = inactive for all groups
    │     → creator system role revoked if held
    │     → creator_credential.token_status = revoked, github_pat cleared
    │     → reporting_relationship.status = inactive
    │     → pending automation approvals in their queue: reassigned to leader's leader
    │     → Leader notified: "Removal complete"
    │
    ├── Leader: NOTIFY USER / ACCOUNT TEAM
    │     → Notification sent to deactivated user's email + IT contact
    │     → 48-hour countdown visible in Operations Governance
    │     → Account reactivated within 48h:
    │         pending_action.status = auto_resolved, leader notified
    │     → No reactivation within 48h:
    │         auto-removal (same steps as APPROVE REMOVAL above)
    │         leader notified: "Auto-removed after 48h"
    │
    └── Leader: NO ACTION within 48h
          → Auto-removal executes
          → Leader notified: "Auto-removed — no response received"

LEADER DEACTIVATION SUB-FLOW
  Their leader + admin notified immediately
  pending_action created (type: leader_reassignment, deadline = 72h)
  Their direct reports temporarily route approval requests to THEIR leader
  (ApprovalRouter null-leader fallback: walk up the hierarchy)
  Admin or their leader reassigns direct reports within 72h
  If not resolved in 72h → admin handles directly
  All pending automation approvals in their queue:
    → reassigned to their leader immediately (not waiting for the 72h)
```

---

## Onboarding Flows

### Two-Step Onboarding with Existing Person Check

**Before Step 1 — OnboardingService checks for existing person record**
```
Nominee already has a person record (previously onboarded)?
  YES → Skip full onboarding invitation
        Directly create group_member record for new group
        Notify nominee: "You've been added to [Group] by [Leader]"
        Leader notified: "[Nominee] added to [Group] (already onboarded)"
  NO  → Proceed to full two-step onboarding below
```

**Step 1 — Leader initiates via Operations Assistant**
Leader describes nominee → system searches sys_user → leader confirms →
`onboarding_request` created → invitation sent (48h expiry)
`onboarding_request.re_invitation_count` initialised to 0

**Expiry and Re-invitation**
```
Invitation expires (48h):
  onboarding_request.status = expired
  Leader notified in Operations Governance (pending_action: onboarding_expiry)
  Leader options:
    Re-send invitation: re_invitation_count++ (max 2 re-invitations)
      → New invitation sent, new 48h window, same onboarding_request
    Cancel: onboarding_request closed, no further action

Nominee declines:
  onboarding_request.status = declined
  nominee may provide decline_reason (optional)
  Leader notified: "[Nominee] declined the invitation"
  Leader can re-initiate if appropriate (creates new onboarding_request)
```

**Step 2 — Nominee completes via Operations Assistant (first login)**
Nominee logs in → [Operations Intelligence] Complete Onboarding fires →
confirms role and group → completes profile → if creator: offered Copilot setup

### Creator Copilot Setup
1. Creator opens Operations Studio OR completes it during onboarding
2. Operations Assistant guides through GitHub PAT generation step by step
3. Creator pastes PAT into password2 input field
4. System validates token against Copilot API before saving
5. If valid → stored encrypted, `person.copilot_enabled = true`
6. If invalid → not stored, creator shown error with guidance
7. Operations Studio shows persistent warning banner when token is expired
8. Weekly scheduled job validates all active tokens → notifies creator on expiry

---

## Script Includes

| Name | Purpose |
|---|---|
| GroupManager | Group and group_member CRUD, hierarchy resolution |
| CatalogService | Automation lifecycle — create, version, publish, deprecate |
| ExecutionEngine | Runs steps in order, dry-run mode for testing, logs all |
| PermissionResolver | Reads ServiceNow roles + group_member — never person.system_role |
| NotificationService | Email and in-app notification dispatch using defined templates |
| FlowBridge | Triggers approved flows (approved_flow table) from automation steps |
| RESTBridge | Outbound REST executor for rest_call automation steps |
| CopilotBridge | GitHub Copilot API — write-only PAT access, timeout, fallback |
| OnboardingService | Existing person check, request creation, invitation, completion |
| DeactivationHandler | Detects deactivation type (user vs leader), routes accordingly |
| VAHelper | VA context: user identity, role, groups, top-5 catalog, page_id |
| ApprovalRouter | Self-approval guard, null-leader fallback, escalation chain |
| ScheduleManager | Creates/deactivates sysauto_script records for scheduled automations |
| AuditService | Field-level audit logging for admin actions on key tables |

---

## Security & Access Control

### Field-Level ACLs

| Table | Field | Read | Write |
|---|---|---|---|
| creator_credential | github_pat | NOBODY (not even admin, not even scripts unless via CopilotBridge) | Owner only |
| execution | input_values | triggered_by OR leadership/admin | System only |
| use_case_request | structured_spec | submitted_by OR leadership/admin | System only |
| use_case_request | description | submitted_by OR leadership/admin | submitted_by |

### Row-Level ACLs

| Table | Rule |
|---|---|
| creator_credential | Row visible only to the owning user. Admin can see metadata row (dates, status) but github_pat is field-blocked regardless. |
| execution | Row visible to triggered_by, leadership of that group, and admin. |
| use_case_request | Visible to submitted_by, leadership of target_group, and admin. |
| pending_action | Visible to assigned_to and admin only. |

### Auditing
Field-level auditing enabled on:
`automation` · `group` · `group_member` · `reporting_relationship` ·
`pending_action` · `creator_credential` (metadata fields only, not github_pat)

AuditService logs all admin actions that bypass normal role checks.

---

## Virtual Agent Architecture

### Channel
**Operations Assistant** — completely separate from the existing Now Support channel.
The existing Now Support implementation is untouched in every respect.

### NLU Model
**Operations Intelligence NLU** — dedicated model. No shared intents, no shared
training data, no connection to the Now Support NLU model.

### Context Awareness
The Operations Assistant widget passes `page_id` as a session variable to the
VA conversation context. VAHelper reads this to adjust the welcome and topic
routing per page. Example: on the `governance` page, the embedded panel
opens directly to the pending approvals summary rather than the general welcome.

### System Topics (bot-initiated, not presented as user choices)

| Topic | Fires when | Purpose |
|---|---|---|
| [Operations Intelligence] Welcome | VA opens on any page | Role-aware greeting; shows top 5 most-used group automations + "See all [X]" — never dumps the full list |
| [Operations Intelligence] Zero Groups | Welcome detects no group membership | "You have no group access yet — contact your manager or check for a pending invitation" |
| [Operations Intelligence] Complete Onboarding | First login post-invitation | Walks nominee through role, group, capabilities; Copilot setup for creators |
| [Operations Intelligence] Copilot Setup | Creator connects Copilot OR during onboarding | Step-by-step PAT guidance, validation, confirmation |
| [Operations Intelligence] Onboard Leadership | Admin initiates | Leadership onboarding — sets delegation rights |
| [Operations Intelligence] Onboard Sub-Leadership | Leader initiates (delegation_rights=true) | Sub-leader onboarding — cannot exceed parent's delegation level |
| [Operations Intelligence] Onboard User | Leader initiates | Direct report onboarding — existing person check first |
| [Operations Intelligence] Appoint Creator | Leader initiates | Grants creator group role; system role auto-granted |
| [Operations Intelligence] Create Group | Leader initiates | Custom group creation, member selection, creator assignment |
| [Operations Intelligence] Create Automation | Creator initiates | Full multi-turn NL requirements conversation, resumable |
| [Operations Intelligence] Review Approvals | Governance page or leadership request | Walks through pending_action queue |
| [Operations Intelligence] Deactivation Action | Leader receives deactivation pending_action | Guided resolution: approve / notify / escalate |
| [Operations Intelligence] Re-invite User | Leader requests after expiry | Re-sends invitation (max 2 re-invitations) |
| [Operations Intelligence] Check Status | User mentions reference or asks about request | Execution status lookup by reference or description |
| [Operations Intelligence] Help & Fallback | No intent matched | Suggests 3 closest available automations; never a dead end |

### Custom Automation Topics (auto-created per published automation)

On automation publish:
- VA topic created with group membership check as the FIRST step
  (if user is not in a group with access → graceful redirect to Help & Fallback)
- NLU intent created from `automation.trigger_phrases` (JSON array)
- NLU model retraining triggered immediately
- Topic linked exclusively to the Operations Assistant channel

On automation deprecation:
- VA topic deactivated (not deleted — history preserved)
- NLU intent deactivated
- NLU model retraining triggered

On automation update (new version published):
- Existing topic and intent updated to reflect new trigger phrases and inputs
- Previous version topic deactivated
- NLU model retraining triggered

---

## Notification Templates

All notifications sent via NotificationService. Templates defined in the
scoped app — never modifying global notification records.

| Template name | Trigger | Recipients |
|---|---|---|
| OI - Onboarding Invitation | onboarding_request created | Nominee |
| OI - Onboarding Reminder | 24h before expiry_at | Nominee |
| OI - Onboarding Expired | expiry_at passed | Initiating leader |
| OI - Invitation Declined | status = declined | Initiating leader |
| OI - Onboarding Complete | status = accepted | Initiating leader |
| OI - Added to Group | Existing person added to new group | Nominee |
| OI - Automation Submitted | pending_action automation_approval created | Approving leader |
| OI - Approval Escalated | 72h no response | Leader's leader |
| OI - Automation Approved | group_automation.approval_status = approved | Creator + group members |
| OI - Automation Rejected | group_automation.approval_status = rejected | Creator |
| OI - User Deactivation Alert | pending_action user_deactivation created | Primary leader |
| OI - Auto Removal Executed | auto-removal completes | Primary leader |
| OI - Copilot Token Expired | weekly validation fails | Creator |
| OI - Leader Reassignment Required | leader deactivated | Their leader + admin |

---

## Service Portal — Operations Workspace

| Property | Value |
|---|---|
| Portal ID | operations_intelligence |
| Title | Operations Workspace |
| URL | /operations_intelligence |
| Default page | home |
| Unauthenticated access | Redirect to ServiceNow login, then return to requested page |
| Theme | Inherits existing Service Portal theme |

### Pages

| Page ID | Name | Visible to |
|---|---|---|
| home | Home | All authenticated |
| catalog | Automation Catalog | All authenticated |
| my_requests | My Requests | All authenticated |
| onboarding | Onboarding | Nominees with status = pending / in_progress |
| studio | Operations Studio | creator, leadership, admin |
| governance | Operations Governance | leadership, admin |
| command | Operations Command | admin |

### Widgets

All widgets built with Bootstrap responsive grid — mobile-first layout.
Operations Workspace is used from mobile; widgets must function at all breakpoints.

| Widget | Pages | Notes |
|---|---|---|
| Welcome Banner | home | Role-aware, shows name, role, group |
| Automation Card | catalog, home | Uses short_description, category colour, usage count |
| Catalog Browser | catalog | Filters by category, group, search; top-5 default |
| Execution History | my_requests, home | Row-level — user sees own only |
| Group Manager | governance | Hierarchical group tree, member management |
| Pending Actions | governance, command | Unified queue: approvals + deactivations + expiries |
| Creator Studio Panel | studio | Automation builder, spec review, Copilot status banner |
| Metrics Dashboard | governance, command | Usage counts, success rates, time saved, group activity |
| Onboarding Progress | onboarding | Step tracker, role/group confirmation |
| Operations Assistant Launcher | all pages | Floating button; passes page_id as session variable |
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
| record_create | Creates any ServiceNow record | Table and field values in configuration JSON |
| record_update | Updates an existing record | Can reference outputs from record_query steps |
| record_query | Reads data for use in subsequent steps | Output stored in execution context |
| flow_trigger | Triggers an admin-approved Flow Designer flow | Selects from approved_flow table only |
| rest_call | Calls an external REST API | RESTBridge handles auth, timeout, retry |
| send_notification | Sends email and/or in-app notification | Uses NotificationService templates |
| approval_gate | Pauses execution pending human approval | Execution status = awaiting_approval |
| conditional_branch | If/else branching | branch_true_step and branch_false_step fields |

Scheduled execution is NOT a step type — it is managed via `automation_schedule`
and `ScheduleManager` as an independent execution trigger.

---

## Scheduled Jobs

| Job | Frequency | Notes |
|---|---|---|
| Validate Creator Copilot Tokens | Weekly | Pings Copilot API; marks expired; notifies creator |
| Onboarding Expiry Check | Hourly | Expires requests past deadline; notifies leader |
| Approval Escalation Check | Every 6 hours | Escalates past 72h; self-approval guard re-checked |
| Deactivation Auto-Remove | Every 2 hours | Executes removal where deadline passed |
| Execution Cleanup | Daily | Archives logs older than retention threshold; EXCLUDES executions with status = awaiting_approval regardless of age — these are never deleted while active |

---

## Key Configuration Properties

| Property | Default | Description |
|---|---|---|
| {scope}.debug_mode | false | Enable debug logging |
| {scope}.version | 1.0.0 | Platform version |
| {scope}.invitation_expiry_hours | 48 | Onboarding invitation lifetime |
| {scope}.max_reinvitations | 2 | Maximum re-invitations per onboarding request |
| {scope}.approval_escalation_hours | 72 | Hours before approval escalates |
| {scope}.deactivation_action_hours | 48 | Hours for leader to act on deactivation |
| {scope}.leader_reassignment_hours | 72 | Hours to reassign deactivated leader's reports |
| {scope}.execution_log_retention_days | 90 | Retention period (awaiting_approval excluded) |
| {scope}.copilot_api_endpoint | api.githubcopilot.com | Copilot API base URL |
| {scope}.copilot_timeout_ms | 15000 | Copilot API call timeout |
| {scope}.catalog_top_n | 5 | Automations shown in welcome message |

---

## Build Order

### Pre-Build
- Create update set: "Operations Intelligence v1.0 — Initial Build"
- All artifacts created within this update set
- Update set to be exported and promoted through dev → test → production

### Build Sequence

1. **Seed data tables** — automation_category (initial categories), approved_flow (initial curated flows)
2. **Core tables** — all custom tables with fields, choice lists, reference fields
3. **Roles and ACLs** — system roles, table-level ACLs, row-level ACLs, field-level ACLs (github_pat read-deny critical)
4. **Script Includes** — in dependency order: PermissionResolver → VAHelper → NotificationService → GroupManager → CatalogService → ScheduleManager → ExecutionEngine → ApprovalRouter → OnboardingService → DeactivationHandler → FlowBridge → RESTBridge → CopilotBridge → AuditService
5. **Business Rules** — deactivation detection, usage_count increment on execution success, execution.group sync, automation publish trigger, deprecation guard for running executions
6. **Scheduled Jobs** — all five jobs, initially inactive pending go-live
7. **Notification Templates** — all 14 OI notification records
8. **VA NLU Model** — Operations Intelligence NLU model created
9. **VA System Topics** — all 15 system topics created and linked to Operations Assistant channel
10. **NLU Initial Training** — NLU model trained on system topic intents
11. **Service Portal** — portal record, theme inheritance, pages, widgets
12. **Standard UI** — app menu, modules, role-gated navigation
13. **Custom automation topic auto-generation** — Business Rule on group_automation that fires on approval to create VA topic + NLU intent + trigger retraining
14. **GitHub Copilot integration** — CopilotBridge REST message, connection alias, timeout config
15. **Activate Scheduled Jobs** — enable all five jobs
16. **End-to-end testing** — full flow: admin onboards leader → leader onboards user → leader appoints creator → creator builds automation (with and without Copilot) → leader approves → user triggers via VA → execution logged → deactivation flow tested
