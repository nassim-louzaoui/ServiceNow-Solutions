# Operations Intelligence — System Context

## Identity

| | |
|---|---|
| Platform | Operations Intelligence |
| Application Scope | x_infte_ops_int |
| Instance | https://everestdev.service-now.com |
| Engine Endpoint | POST /api/x_infte_ops_int/ops_int_engine/v1 |
| Service Account | svc_operations_intelligence_api |
| Service Account Sys ID | 94a5973dfb6dcb5052eef5c9beefdc77 |
| Development Branch | claude/servicenow-scoped-app-script-hjjksh |

---

## Credentials

Live credentials are in `.env` at the repo root (gitignored; included in the source of truth ZIP).

| Variable | Purpose |
|---|---|
| SNOW_INSTANCE | Instance base URL |
| SNOW_USER | Service account username (`svc_operations_intelligence_api`) |
| SNOW_PASS | Service account password (stored in system property `x_infte_ops_int.svc_password`) |
| ENGINE_KEY | Engine API key (stored in system property `x_infte_ops_int.engine_key`) |
| ENGINE_ENDPOINT | `/api/x_infte_ops_int/ops_int_engine/v1` |
| SVC_SYS_ID | Service account sys_id (`94a5973dfb6dcb5052eef5c9beefdc77`) |
| APP_SCOPE | `x_infte_ops_int` |

Authentication header on every engine request: `X-Engine-Key: <ENGINE_KEY from .env>`

Basic Auth on every request: `SNOW_USER : SNOW_PASS`

---

## Non-Negotiable Standards

**Naming.** Every artifact name, description, label, role name, update set name, table name, and notification name must be proper title case with full words and no abbreviations. "Operations Intelligence", not "ops_int" or "OI". "Script Include", not "SI". "Service Account", not "SVC Acct". API identifiers follow ServiceNow conventions (e.g. `x_infte_ops_int.engine_key`) — display names do not.

**Scope isolation.** Every artifact belongs to `x_infte_ops_int`. All `artifact.*` and `schema.*` operations set `sys_scope` to the application scope automatically. `sys_properties` is the only platform-global table in use and is the only intentional exception.

**Update set.** The engine maintains exactly one update set named "Operations Intelligence" (state: in progress). It is created on first configuration write and never duplicated. `engine.status` returns its sys_id and state.

**Engine script — no inline comments.** The function body contains no `//` comments. The file starts with a formal header block covering scope, endpoint, authentication, request format, and operation catalog only. No operator instructions, no deployment steps.

**Engine script — ES5 only.** No template literals (backticks), no `let`/`const`, no arrow functions, no destructuring, no `eval()`. ServiceNow's Rhino engine rejects template literals at parse time when stored as a Scripted REST operation script — this causes total engine failure.

**AI identity.** No AI tool, model, or vendor name may appear in any artifact, record, property name, Script Include, or configuration of any kind.

---

## Engine

### Calling the Engine

Single operation:
```
POST https://everestdev.service-now.com/api/x_infte_ops_int/ops_int_engine/v1
Authorization: Basic <base64(svc_operations_intelligence_api:H!^j46ZKAHA7RLfDb6Va97Pu7pB8sTcF)>
Content-Type: application/json
X-Engine-Key: EPpXxygqG5AvP8zEPAQ847sFqW6NGqYYp5P6VWJn

{"op": "<name>", "data": { ... }, "table": "<table>", "query": { ... }, "limit": 100}
```

Batch:
```json
{"op": "batch", "ops": [{"op": "ping"}, {"op": "now", "label": "ts"}], "stop_on_error": true}
```

ServiceNow wraps all responses: `{"result": { ... }}`. Unwrap `.result` before reading fields.

Platform writes: add `"platform": true` to any record operation. Routes through the Table API as `svc_operations_intelligence_api`, bypassing the scoped sandbox. Required for writing to tables outside the app scope.

Send `{"op": "help"}` to the live instance for the full annotated operation list. Send `{"op": "engine.status"}` for health, inventory, and update set state.

### Operation Reference

All 117 operations. Required `data` fields listed; all others optional unless noted.

**DIAGNOSTICS**

| Operation | Required | Returns |
|---|---|---|
| `ping` | — | `{ok, pong, scope, ts}` |
| `now` | — | `{ok, utc, display, numeric}` |
| `scope.info` | — | `{ok, scope, instance, user, roles, platform_capable}` |
| `engine.status` | — | `{ok, scope, instance, op_count, update_set, inventory}` |
| `selftest` | — | `{ok, read, write, platform_write}` |
| `help` | — | `{ok, count, ops[{op, description}]}` |
| `sys.version` | — | `{ok, build_name, build_date, build_tag, instance}` |

**DISCOVERY**

| Operation | Required | Notes |
|---|---|---|
| `meta.tables` | — | Tables in scope |
| `meta.script_includes` | — | |
| `meta.business_rules` | — | |
| `meta.notifications` | — | |
| `meta.widgets` | — | |
| `meta.jobs` | — | Scheduled Jobs |
| `meta.acls` | `data.table` | ACLs for a specific table |
| `meta.all` | — | Full inventory across all types |
| `meta.ui_pages` | — | |
| `meta.portal_pages` | — | |
| `meta.catalog_items` | — | |
| `meta.app_menus` | — | |
| `meta.app_modules` | — | |
| `meta.events` | — | Registered platform events |
| `meta.roles` | — | Roles in scope |
| `meta.portals` | — | Service Portal portals |
| `table.exists` | `data.table` | `{ok, exists}` |
| `schema.fields` | `table` | All fields with metadata |
| `table.schema` | `table` | Fields + choices + autonumber |

**DDL** (all trigger update set management)

| Operation | Required | Notes |
|---|---|---|
| `schema.table.create` | `data.name`, `data.label` | Optional: `data.extends` |
| `schema.table.delete` | `data.name` | Requires `data.confirm: true` |
| `schema.table.extend` | `data.name`, `data.extends` | Change parent table |
| `schema.add_field` | `data.table`, `data.name`, `data.type` | Optional: `data.label`, `data.mandatory`, `data.max_length`, `data.reference` |
| `schema.field.update` | `data.table`, `data.name` | Pass fields to change |
| `schema.field.delete` | `data.table`, `data.name` | |
| `schema.add_choice` | `data.table`, `data.field`, `data.label`, `data.value` | Optional: `data.sequence` |
| `schema.choice.update` | `data.table`, `data.field`, `data.value` | Pass `data.label` and/or `data.sequence` to change |
| `schema.choice.delete` | `data.table`, `data.field`, `data.value` | |
| `schema.set_autonumber` | `data.table` | Optional: `data.prefix`, `data.minimum_digits`, `data.start_number` |
| `schema.index.create` | `data.table`, `data.fields` | `data.fields` is array of field names |

**PROPERTIES**

| Operation | Required | Notes |
|---|---|---|
| `property.set` | `data.key`, `data.value` | Optional: `data.type` (string/boolean/integer/password2), `data.description`. Accepts array of `{key,value}` objects for batch set. |
| `property.get` | `data.key` | `{ok, key, value}` |
| `property.list` | — | Optional: `data.prefix` to filter |
| `property.delete` | `data.key` | |

**RECORDS**

| Operation | Required | Notes |
|---|---|---|
| `record.insert` | `table`, `data` | Add `"platform": true` for admin-level write. Optional: `ctx.bypass_rules`. |
| `record.insert_many` | `table`, `data.records` | Array of field objects. Returns `{inserted, failed, sys_ids}`. |
| `record.update` | `table`, `data` | Pass `data.sys_id` for single record, or `query`/`encoded_query` for multi. |
| `record.patch` | `table`, `data.sys_id`, `data` | Updates only supplied fields. |
| `record.upsert` | `table`, `data` | Requires `query` or `encoded_query` to find existing. |
| `record.delete` | `table` | Pass `data.sys_id` or `query`. |
| `record.bulk_delete` | `table`, `query` | Requires `data.confirm: true` as safety gate. |
| `record.get` | `table` | Pass `data.sys_id` or `query`. Optional: `data.fields` array. |
| `record.find` | `table`, `data.value` | Searches `name` or display field. |
| `record.query` | `table` | Optional: `query`, `encoded_query`, `data.fields`, `limit`, `offset`, `data.order_by`, `data.include_total`. |
| `record.count` | `table` | Optional: `query`, `encoded_query`. Returns `{ok, count}`. |
| `record.aggregate` | `table` | `data.aggregate` (COUNT/SUM/AVG/MIN/MAX), `data.field`. Optional: `data.group_by`. |
| `record.clone` | `table`, `data.sys_id` | Optional: `data.overrides` object for field overrides. |
| `record.history` | `table`, `data.sys_id` | Returns audit log and journal entries. |
| `record.exists` | `table` | Pass `data.sys_id` or `query`. Returns `{ok, exists, sys_id}`. |
| `record.read_many` | `table`, `data.sys_ids` | Array of sys_ids. Returns array of records. Add `"platform": true` for cross-scope. |
| `table.truncate` | `table` | Requires `data.confirm: true`. Deletes all rows. |

**ACL** (trigger update set management)

| Operation | Required | Notes |
|---|---|---|
| `acl.create` | `data.name`, `data.type`, `data.operation` | Optional: `data.condition`, `data.script`, `data.roles` array |
| `acl.delete` | `data.sys_id` or `data.name` | |
| `acl.list` | `data.table` | |

**ACCESS** (trigger update set management)

| Operation | Required | Notes |
|---|---|---|
| `role.grant` | `data.user_sys_id`, `data.role` | |
| `role.revoke` | `data.user_sys_id`, `data.role` | |
| `user.roles` | `data.user_sys_id` or `data.user_name` | |

**USERS** (user.create triggers update set management)

| Operation | Required | Notes |
|---|---|---|
| `user.create` | `data.user_name`, `data.first_name`, `data.last_name`, `data.email` | Optional: `data.title`, `data.department`, `data.password` |
| `user.get` | `data.user_name` or `data.sys_id` or `data.email` | |
| `user.update` | `data.sys_id` or `data.user_name`, `data` | Pass fields to change |
| `user.search` | `data.query` | Also accepts `data.email`, `data.first_name`, `data.last_name`, `data.department`. Returns up to `limit` users. |

**GROUPS** (group.create, group.add_member, group.remove_member trigger update set management)

| Operation | Required | Notes |
|---|---|---|
| `group.create` | `data.name` | Optional: `data.description`, `data.manager` |
| `group.add_member` | `data.group_sys_id` or `data.group_name`, `data.user_sys_id` | |
| `group.remove_member` | `data.group_sys_id` or `data.group_name`, `data.user_sys_id` | |
| `group.members` | `data.group_sys_id` or `data.group_name` | |
| `group.search` | `data.query` or `data.name` | Returns matching groups |

**UPDATE SETS**

| Operation | Required | Notes |
|---|---|---|
| `update_set.create` | `data.name` | The engine creates "Operations Intelligence" automatically; this op is for manual/additional sets |
| `update_set.activate` | `data.name` or `data.sys_id` | Sets state to in progress |
| `update_set.list` | — | Optional: `data.state` filter |

**ARTIFACTS** (all trigger update set management; all auto-scope to x_infte_ops_int)

| Operation | Required | Notes |
|---|---|---|
| `artifact.script_include` | `data.name`, `data.script` | Optional: `data.api_name`, `data.description`, `data.active` |
| `artifact.business_rule` | `data.name`, `data.table`, `data.script` | Optional: `data.when` (before/after/async), `data.action` (insert/update/delete/query), `data.condition`, `data.order`, `data.active` |
| `artifact.notification` | `data.name`, `data.table`, `data.event` | Optional: `data.subject`, `data.body`, `data.recipients` (array), `data.active` |
| `artifact.scheduled_job` | `data.name`, `data.script` | Optional: `data.run_type` (daily/weekly/monthly/periodically/once), `data.run_time`, `data.active` |
| `artifact.client_script` | `data.name`, `data.table`, `data.script`, `data.type` | type: onChange/onLoad/onSubmit/onCellEdit |
| `artifact.ui_action` | `data.name`, `data.table`, `data.script` | Optional: `data.action_name`, `data.condition`, `data.active`, `data.client` |
| `artifact.widget` | `data.name`, `data.id` | Optional: `data.template`, `data.css`, `data.script`, `data.client_script`, `data.option_schema`, `data.demo_data` |
| `artifact.ui_page` | `data.name` | Optional: `data.html`, `data.client_script`, `data.processing_script`, `data.category` |
| `artifact.sp_portal` | `data.url_suffix` | Optional: `data.title`, `data.theme`, `data.homepage`, `data.default_page` |
| `artifact.sp_page` | `data.id`, `data.title` | Optional: `data.draft`, `data.internal` |
| `artifact.sp_container` | `data.page_sys_id`, `data.order` | Optional: `data.background`, `data.width` |
| `artifact.sp_row` | `data.container_sys_id`, `data.order` | |
| `artifact.sp_column` | `data.row_sys_id`, `data.order` | Optional: `data.size` (1–12, Bootstrap grid) |
| `artifact.sp_instance` | `data.column_sys_id`, `data.widget_sys_id` | Optional: `data.order`, `data.options` |
| `artifact.sp_theme` | `data.name` | Optional: `data.css_variables`, `data.header`, `data.footer` |
| `artifact.app_menu` | `data.name`, `data.title` | Optional: `data.roles`, `data.active`, `data.order` |
| `artifact.app_module` | `data.name`, `data.title`, `data.application_sys_id` | Optional: `data.url`, `data.roles`, `data.order`, `data.active` |
| `artifact.catalog_item` | `data.name`, `data.short_description`, `data.category_sys_id` | Optional: `data.description`, `data.active`, `data.workflow_sys_id` |
| `artifact.catalog_variable` | `data.catalog_item_sys_id`, `data.name`, `data.question_text`, `data.type` | type: string/boolean/integer/choice/reference |
| `artifact.ui_policy` | `data.table` | Optional: `data.short_description`, `data.conditions`, `data.script`, `data.active` |
| `artifact.ui_policy_action` | `data.ui_policy_sys_id`, `data.field` | Optional: `data.mandatory`, `data.visible`, `data.read_only` |
| `artifact.event_registry` | `data.name`, `data.table` | Optional: `data.description`, `data.fired_by`, `data.param1`, `data.param2` |
| `artifact.report` | `data.title`, `data.table` | Optional: `data.type` (list/pie/bar/line), `data.field`, `data.filter`, `data.group_by` |
| `artifact.role` | `data.name` | Optional: `data.description`, `data.assignable_by` |

**FILES**

| Operation | Required | Notes |
|---|---|---|
| `attachment.write` | `data.table`, `data.sys_id`, `data.file_name`, `data.content` | `data.content` is base64. Optional: `data.content_type` |
| `attachment.read` | `data.sys_id` | Returns base64 content |
| `attachment.list` | `data.table`, `data.sys_id` | |
| `attachment.delete` | `data.sys_id` | |

**POWER**

| Operation | Required | Notes |
|---|---|---|
| `script.run` | `data.script` | Executes JS in x_infte_ops_int scope context. Set `var result = <value>` to return data. Uses GlideScopedEvaluator with the engine's own GlideRecord as context (null GlideRecord silently fails on this instance). |
| `rest.call` | `data.path` | Optional: `data.method` (default GET), `data.body`, `data.params`, `data.headers` |
| `event.fire` | `data.name` | Optional: `data.param1`, `data.param2`, `data.user_sys_id` |
| `sys.log` | `data.message` | Optional: `data.source`, `data.level` (info/warn/error) |
| `cache.flush` | — | Flushes all platform caches |
| `sys.id` | `data.type`, `data.name` | Resolves artifact name → sys_id. Types: script_include, business_rule, notification, scheduled_job, widget, ui_page, sp_page, sp_portal, app_menu, catalog_item, catalog_variable, role, acl, client_script, ui_action, table, event, update_set, attachment, property |
| `note.add` | `data.table`, `data.sys_id`, `data.note` | Optional: `data.type` (work_note/comment; default work_note) |

**WORKFLOW**

| Operation | Required | Notes |
|---|---|---|
| `workflow.start` | `data.flow` | Flow name or sys_id. Optional: `data.inputs` object |
| `workflow.cancel` | `data.sys_id` | Flow instance sys_id |

**EMAIL**

| Operation | Required | Notes |
|---|---|---|
| `email.send` | `data.to`, `data.subject`, `data.body` or `data.html` | Optional: `data.cc`, `data.bcc`, `data.reply_to` |

**ENGINE**

| Operation | Required | Notes |
|---|---|---|
| `engine.source` | — | Returns `{ok, operation_sys_id, name, bytes, marker_ok}`. Does not return source text. |
| `engine.selfupdate` | `data.script` | Replaces the engine script. Safety-checked: must contain `X-Engine-Key` and `function dispatch` markers. |

---

## Solution Architecture

Operations Intelligence is an enterprise automation and deliverable platform built as a ServiceNow scoped application (`x_infte_ops_int`). It enables creation and governance of automations and persistent ServiceNow artifacts through natural language via the Operations Assistant (Virtual Agent).

**Four roles:** admin, leadership, creator, user — all enforced from actual ServiceNow role assignments, never from a custom field.

**Two creative tracks:**
1. Process automations — multi-step sequences stored in `x_infte_ops_int_automation`, executed by ExecutionEngine on demand or on schedule.
2. Managed artifacts — persistent ServiceNow records (reports, dashboards, notification rules, scheduled data jobs, flows, custom tables, UI pages) governed through `managed_artifact`.

**Key Script Includes:** PermissionResolver, VAHelper, NotificationService, GroupManager, CatalogService, ScheduleManager, ExecutionEngine, ApprovalRouter, OnboardingService, DeactivationHandler, FlowBridge, RESTBridge, CopilotBridge, AuditService, MaintenanceManager, ArtifactManager, ReportBuilder, NotificationBuilder, FlowBuilder, TableBuilder, UIPageBuilder.

**Business Rules (5):** Operations Intelligence - Deactivation Detector (sys_user), Operations Intelligence - Execution Group Sync (execution table), Operations Intelligence - Usage Count Increment (execution table), Operations Intelligence - Automation Publish (automation table), Operations Intelligence - Deprecation Guard (automation table).

**Service Portal:** ID `operations_intelligence`, suffix `/operations_intelligence`. Four sections: Operations Command (admin), Operations Governance (leadership), Operations Studio (creator), Workspace (all users).

**Approval routing:** 72-hour window, escalation updates the existing `pending_action` record (never creates a new one), self-approval escalates immediately, null-leader falls back up the hierarchy to admin.

For full data model, table definitions, ACLs, lifecycle flows, and VA topic structure: see `solution-architecture.md`.

---

## Implementation State

**Engine:** 117 operations deployed on `https://everestdev.service-now.com`. Test harness (`test_engine.sh`) runs 64 tests. Current status: 63 pass, 1 skip (record.history — admin sys_id not available on dev instance), 1 skip (group.members — no groups on dev instance). `script.run` uses an in-memory GlideRecord workaround because `GlideScopedEvaluator.evaluateScript(null, script, null)` silently fails on this instance.

**Update set:** "Operations Intelligence" update set created and maintained automatically by the engine.

**Background scripts (run in ServiceNow Background Scripts console):**
- `02a_generate_engine_key.js` — generates and stores the engine key property
- `02c_set_svc_account_password.js` — stores service account password as property
- `02d_grant_svc_account_roles.js` — grants required roles to service account
- `02e_show_credentials.js` — displays all configured values for verification
- `02f_setup_and_show_credentials.js` — combined setup + verification

**Deployment:** `bash update_engine.sh` reads `02b_engine_operation_script.js`, posts it to `engine.selfupdate`, and confirms. Run `bash test_engine.sh` after every engine change.
