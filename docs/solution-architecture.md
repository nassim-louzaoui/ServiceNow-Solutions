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

All roles are scoped automatically by ServiceNow. Clean names, no prefix needed.

| Role | Held by | Capabilities |
|---|---|---|
| `admin` | IT / platform team | Full system access, onboards leadership |
| `leadership` | Business leaders | Group governance, user onboarding, approvals |
| `creator` | Appointed power users | Design automations for their assigned groups |
| `user` | All other staff | Trigger automations via Assistant or Workspace |

Viewer role is intentionally excluded. Every person with a legitimate
need for visibility is covered by an existing role — leadership has full
reporting via Operations Governance, admins have the full audit trail via
Operations Command. If someone is in a group they should be able to use
it (user), not merely observe it.

**Group roles** (within a specific group, independent of system role):

| Group Role | Granted by | Effect |
|---|---|---|
| `creator` | Leadership | Can create automations scoped to this group |
| `user` | Leadership | Can trigger automations in this group |

---

## Organisational Hierarchy

```
ADMIN
  └── onboards LEADERSHIP (top-level, configures delegation rights)
       └── LEADERSHIP can onboard sub-LEADERSHIP (if delegation_rights = true)
       └── LEADERSHIP onboards USERS (direct reports)
            └── LEADERSHIP appoints CREATORS from within their user pool
                 └── CREATOR designs automations scoped to their group(s)
```

### Reporting Relationships
- Many-to-many between users and leaders
- Each relationship is `primary` or `secondary`
- Automation approvals route to the **primary** leader only
- Secondary leaders receive notifications but do not block approval

### Delegation Rights
- Admin sets delegation rights when onboarding a leader
- A leader with `delegation_rights = true` can onboard sub-leaders
- Sub-leaders inherit a delegation level that cannot exceed the parent's
- Leaders without delegation rights can only onboard users

---

## Group Model

| Group Type | Created when | Members |
|---|---|---|
| Leadership Group | Auto-created when a leader is onboarded | All direct reports of that leader |
| Custom Group | Manually created by leadership or admin via VA | Specific subset of users, explicitly added |

### Group Hierarchy
Groups are hierarchical with parent/child relationships:
```
Sarah's Team (Leadership Group — parent)
  ├── HR Recruitment Group (Custom Group — child)
  └── HR Onboarding Group  (Custom Group — child)
```

Automations assigned to a parent group are NOT automatically inherited
by child groups. Each group's catalog is managed independently.

---

## Data Model

### Core Tables

```
person
  user                      sys_user reference
  system_role               admin / leadership / user
  onboarded_by              person reference
  onboarded_at              datetime
  onboarding_status         pending / in_progress / complete
  invitation_sent_at        datetime
  delegation_rights         boolean
  copilot_enabled           boolean
  active                    boolean

reporting_relationship
  leader                    person reference
  direct_report             person reference
  relationship_type         primary / secondary
  delegation_rights         boolean
  created_by                person reference
  created_at                datetime
  status                    active / inactive

group
  name                      string
  description               string
  type                      leadership_group / custom_group
  owner                     person reference (the leader who owns it)
  parent_group              group reference
  created_by                person reference
  created_at                datetime
  status                    active / archived

group_member
  group                     group reference
  member                    person reference
  group_role                creator / user / viewer
  added_by                  person reference
  added_at                  datetime
  status                    active / inactive

onboarding_request
  nominee                   person reference
  initiated_by              person reference
  target_group              group reference
  group_role                creator / user / viewer
  system_role               leadership / user
  delegation_rights         boolean
  status                    pending / accepted / expired
  invited_at                datetime
  completed_at              datetime
  expiry_at                 datetime (48 hours from invited_at)
```

### Automation Tables

```
automation
  name                      string
  description               string
  category                  string
  trigger_phrases           string (comma-separated NLU triggers)
  status                    draft / in_review / testing / pending_approval /
                            published / deprecated
  version                   integer
  owner_group               group reference
  created_by                person reference
  submitted_at              datetime
  approved_at               datetime
  approved_by               person reference
  estimated_time_saved      integer (minutes)
  usage_count               integer
  active                    boolean

automation_step
  automation                automation reference
  order                     integer
  name                      string
  action_type               record_create / record_update / record_query /
                            flow_trigger / rest_call / send_notification /
                            approval_gate / conditional_branch / scheduled_trigger
  configuration             string (JSON — action-specific config)
  on_failure                stop / continue / skip
  active                    boolean

automation_input
  automation                automation reference
  order                     integer
  label                     string (what the VA asks the user)
  field_name                string (internal key)
  input_type                text / number / date / choice / boolean
  choices                   string (JSON array, for choice type)
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

execution
  automation                automation reference
  triggered_by              person reference
  triggered_at              datetime
  channel                   va / portal / scheduled
  status                    pending / running / success / failed /
                            awaiting_approval / cancelled
  input_values              string (JSON)
  completed_at              datetime
  group                     group reference

execution_step_log
  execution                 execution reference
  step                      automation_step reference
  order                     integer
  status                    pending / running / success / failed / skipped
  started_at                datetime
  completed_at              datetime
  output                    string (JSON)
  error_message             string

use_case_request
  title                     string
  description               string (full NL requirements from conversation)
  structured_spec           string (JSON — parsed from conversation)
  submitted_by              person reference
  target_group              group reference
  status                    draft / submitted / in_review / approved /
                            rejected / building / complete
  copilot_enhanced          boolean
  submitted_at              datetime
  reviewed_by               person reference
  reviewed_at               datetime
  resulting_automation      automation reference
```

### Security & Credential Tables

```
creator_credential
  user                      person reference (unique — one per creator)
  github_pat                password2 field (encrypted at rest, never returned
                            in API responses, never visible in UI)
  token_status              active / expired / revoked
  connected_at              datetime
  last_validated_at         datetime
  last_validation_result    success / failed
  ACL: creator reads/writes own row only
       admin sees metadata (status, dates) — never the token value
       admin can set status = revoked and clear token field

pending_action
  action_type               user_deactivation / approval_escalation /
                            onboarding_expiry / token_expiry
  subject_user              person reference
  assigned_to               person reference (the leader who must act)
  status                    pending / actioned / auto_resolved / escalated
  created_at                datetime
  deadline_at               datetime
  actioned_at               datetime
  actioned_by               person reference
  resolution                approved_removal / notified_user / no_action
  notes                     string
```

---

## Automation Lifecycle

```
DRAFT           Creator working on the definition
    ↓
IN REVIEW       Submitted — admin or senior creator reviewing
    ↓
TESTING         Creator runs against sandbox data — safe, no real impact
    ↓
PENDING APPROVAL  Sent to primary leader for sign-off
    ↓  (72h escalation if no response → leader's leader → admin)
PUBLISHED       Live — visible and triggerable by assigned group(s)
    ↓
DEPRECATED      Retired — topic and intent deactivated, history preserved
```

### Cross-Group Publishing
- Creator selects one or more target groups during creation
- Primary group (creator's own group) follows the standard approval flow
- Additional groups require that group's own leader to approve independently
- Automation publishes to each group as each leader approves
- Partial publish is allowed — live in Group A, pending in Group B

---

## Automation Creation Flow

```
PHASE 1 — NLU Requirements Conversation (always runs)
  Operations Assistant guides creator through structured multi-turn dialogue
  Handles: triggers, inputs, steps, conditions, branches, schedules
  Progress saved after every turn — conversation is resumable if interrupted
  Output: fully populated use_case_request record

PHASE 2 — Creator Review
  Structured spec displayed in Operations Studio
  Creator can edit any field before submitting
  Automation is 100% complete and submittable at this point

PHASE 3 — Copilot Enhancement (optional, creator's choice)
  Single bounded API call to GitHub Copilot using creator's stored PAT
  Copilot is asked to:
    - Generate additional NLU training phrases
    - Identify logical gaps or missing steps
    - Suggest optimised step ordering
  If call fails for ANY reason → silent fallback to Phase 2 spec
  Creator always has a complete result regardless of Copilot availability

PHASE 4 — Submit for Leadership Approval
  Triggers approval routing via ApprovalRouter Script Include
  Primary leader notified (in-app + email)
  72-hour response window before escalation

PHASE 5 — On Approval
  ExecutionEngine validates the step configuration
  VA topic auto-created (sys_cs_topic)
  NLU intent auto-created with training phrases (sys_nlu_intent + utterances)
  group_automation record created
  Creator and group members notified — automation is live
```

---

## User Deactivation Flow

```
sys_user.active set to false
    ↓ Business Rule fires immediately
Primary leader(s) notified — in-app + email
pending_action record created (type: user_deactivation)
    │
    ├── Leader: APPROVE REMOVAL
    │     → All group memberships revoked
    │     → Creator roles cleared
    │     → Credentials wiped (creator_credential.status = revoked)
    │     → Leader notified: removal complete
    │
    ├── Leader: NOTIFY USER / ACCOUNT TEAM
    │     → Notification sent to user / IT contact
    │     → 48-hour countdown begins (visible in Operations Governance)
    │     → Account reactivated within 48h → pending action cleared
    │     → No action within 48h → auto-removal + leader notified
    │
    └── Leader: NO ACTION within 48h
          → Auto-removal executes
          → Leader notified: auto-removed due to no response

SPECIAL CASE — deactivated user IS a leader:
    → Their leader + admin notified immediately
    → pending_action: reassign direct reports
    → 72-hour window before admin handles it
```

---

## Onboarding Flows

### Two-Step Onboarding
**Step 1 — Leader initiates via Operations Assistant**
Leader describes who to add → system creates onboarding_request → invitation sent (48h expiry)

**Step 2 — Nominee completes via Operations Assistant**
Nominee logs in → onboarding topic fires → confirms role and group → completes profile → if creator: offered Copilot setup

### Creator Copilot Setup
1. Creator opens Operations Studio → "Connect Copilot" panel
2. Operations Assistant guides through GitHub PAT generation
3. Creator pastes PAT into password2 field
4. System validates token against Copilot API before saving
5. If valid → stored encrypted, copilot_enabled = true
6. Weekly scheduled job validates all active tokens → notifies creator if expired

---

## Script Includes

| Name | Purpose |
|---|---|
| GroupManager | Group and group_member CRUD, hierarchy resolution |
| CatalogService | Automation lifecycle management |
| ExecutionEngine | Runs automation steps in order, handles errors, logs all |
| PermissionResolver | Role + group access checks for all interfaces |
| NotificationService | Email and in-app notification dispatch |
| FlowBridge | Triggers Flow Designer flows from automation steps |
| RESTBridge | Outbound REST call executor for automation steps |
| CopilotBridge | GitHub Copilot API integration with timeout and fallback |
| OnboardingService | Onboarding request creation, invitation dispatch, completion |
| DeactivationHandler | User deactivation detection and pending_action creation |
| VAHelper | VA context resolution — user identity, role, group, catalog |
| ApprovalRouter | Routes approvals to correct leader, handles escalation |

---

## Virtual Agent Architecture

### Channel
**Operations Assistant** — completely separate from existing Now Support channel.
Existing Now Support implementation is untouched.

### NLU Model
**Operations Intelligence NLU** — dedicated model, no shared intents with Now Support.

### System Topics (bot-initiated, not user-selectable)

| Topic | Fires when | Purpose |
|---|---|---|
| [Operations Intelligence] Welcome | VA opens | Role-aware greeting, lists available automations |
| [Operations Intelligence] Complete Onboarding | First login post-invitation | Walks nominee through setup |
| [Operations Intelligence] Copilot Setup | Creator connects Copilot | PAT guidance and validation |
| [Operations Intelligence] Onboard Leadership | Admin initiates | Leadership onboarding conversation |
| [Operations Intelligence] Onboard Sub-Leadership | Leader initiates (delegation_rights) | Sub-leader onboarding |
| [Operations Intelligence] Onboard User | Leader initiates | Direct report onboarding |
| [Operations Intelligence] Appoint Creator | Leader initiates | Appoints group creator |
| [Operations Intelligence] Create Group | Leader initiates | Custom group creation |
| [Operations Intelligence] Create Automation | Creator initiates | Full NL requirements conversation |
| [Operations Intelligence] Review Approvals | Leadership interface | Approval queue walkthrough |
| [Operations Intelligence] Deactivation Action | Lead receives pending action | Guided deactivation resolution |
| [Operations Intelligence] Check Status | User asks about a request | Execution status lookup |
| [Operations Intelligence] Help & Fallback | No intent matched | Suggests closest automations |

### Custom Automation Topics (auto-created per published automation)

Each published automation generates:
- One NLU intent with training phrases from `automation.trigger_phrases`
- One VA topic that collects inputs defined in `automation_input` records
- Topic calls ExecutionEngine on completion
- Topic deactivated automatically when automation is deprecated
- Topic updated automatically when automation is republished

---

## Service Portal — Operations Workspace

| Property | Value |
|---|---|
| Portal ID | operations_intelligence |
| Title | Operations Workspace |
| URL | /operations_intelligence |

### Pages

| Page ID | Name | Visible to |
|---|---|---|
| home | Home | All |
| catalog | Automation Catalog | user, creator, leadership, admin |
| my_requests | My Requests | All |
| onboarding | Onboarding | Nominees with pending invitation |
| studio | Operations Studio | creator, leadership, admin |
| governance | Operations Governance | leadership, admin |
| command | Operations Command | admin |

### Widgets

| Widget | Used on |
|---|---|
| Automation Card | catalog, home |
| Execution History | my_requests, home |
| Group Manager | governance |
| Catalog Browser | catalog |
| Creator Studio Panel | studio |
| Metrics Dashboard | governance, command |
| Onboarding Progress | onboarding |
| Operations Assistant Launcher | all pages |
| Welcome Banner | home |
| Pending Actions | governance, command |

---

## Standard UI — Operations Intelligence App Menu

| Module | Name | Role |
|---|---|---|
| Operations Command | Full system overview and config | admin |
| Operations Governance | Group management and approvals | leadership |
| Operations Studio | Automation builder and management | creator |
| My Workspace | Personal automation catalog | user |
| Execution Logs | Full execution audit trail | admin, leadership |

---

## VA Placement Per Interface

| Interface | Placement | Behaviour |
|---|---|---|
| Operations Workspace (portal) | Floating button, bottom-right, every page | Auto-opens on first visit with welcome |
| Standard UI | Help panel (separate entry from Now Support) | Opens on demand, role-aware greeting |
| Operations Governance page | Embedded side panel | Shows pending approvals inline |
| Operations Studio page | Embedded side panel | Guides creator through automation definition |

---

## Automation Step Action Types (Option B)

| Action Type | Description |
|---|---|
| record_create | Creates any ServiceNow record |
| record_update | Updates an existing record |
| record_query | Reads data for use in subsequent steps |
| flow_trigger | Triggers a Flow Designer flow |
| rest_call | Calls an external REST API |
| send_notification | Sends email and/or in-app notification |
| approval_gate | Pauses execution pending human approval |
| conditional_branch | If/else branching between steps |
| scheduled_trigger | Executes automatically on a defined schedule |

---

## Scheduled Jobs

| Job | Frequency | Purpose |
|---|---|---|
| Validate Creator Copilot Tokens | Weekly | Pings Copilot API per active token, marks expired, notifies creator |
| Onboarding Expiry Check | Hourly | Expires onboarding_request records past 48h, notifies leader |
| Approval Escalation Check | Every 6 hours | Escalates unanswered approvals past 72h |
| Deactivation Auto-Remove | Every 2 hours | Auto-removes users where pending_action deadline passed |
| Execution Cleanup | Daily | Archives execution logs older than configured retention period |

---

## Key Configuration Properties

| Property | Default | Description |
|---|---|---|
| {scope}.debug_mode | false | Enable debug logging |
| {scope}.version | 1.0.0 | Platform version |
| {scope}.invitation_expiry_hours | 48 | Onboarding invitation lifetime |
| {scope}.approval_escalation_hours | 72 | Hours before approval escalates |
| {scope}.deactivation_action_hours | 48 | Hours for leader to act on deactivation |
| {scope}.execution_log_retention_days | 90 | Execution log retention period |
| {scope}.copilot_api_endpoint | api.githubcopilot.com | Copilot API base URL |
| {scope}.copilot_timeout_ms | 15000 | Copilot API call timeout |

---

## Build Order

1. Tables and fields
2. Roles and ACLs
3. Script Includes (core layer)
4. Business Rules (deactivation handler, automation publish trigger)
5. Scheduled Jobs
6. Email Notifications
7. Virtual Agent NLU Model and System Topics
8. Service Portal — pages and widgets
9. Standard UI — app menu and modules
10. Custom automation topic auto-generation logic
11. GitHub Copilot integration (CopilotBridge)
12. End-to-end testing of all flows
