# Operations Intelligence — Project Standards

## Solution Identity

| Property | Value |
|---|---|
| Platform name | Operations Intelligence |
| ServiceNow application scope | `x_infte_ops_int` |
| Service account | `svc_operations_intelligence_api` |
| Engine endpoint | `POST /api/x_infte_ops_int/ops_int_engine/v1` |
| Branch (development) | `claude/servicenow-scoped-app-script-hjjksh` |

---

## Naming Convention

All names — for tables, roles, update sets, properties, Script Includes, Business Rules, Scheduled Jobs, notifications, portals, widgets, and every other artifact — must be:

- **Proper title case** with full words. Example: `Operations Intelligence`, `Service Request Handler`, `Execution Engine`.
- **No abbreviations.** Write `Operations Intelligence`, never `OI` or `ops_int`. Write `Service Account`, never `SVC Acct`. Write `Script Include`, never `SI`.
- **No camelCase or snake_case for display names.** API names and system identifiers follow ServiceNow conventions (e.g. `x_infte_ops_int.engine_key`), but every human-visible label, name, and description must be proper title case plain English.
- **Concise.** Names must be precise without being unnecessarily long.
- **Formal.** No casual language in any name, description, or label.

---

## Application Scope — Strict Isolation

Every configuration artifact created by or for Operations Intelligence must belong to the `x_infte_ops_int` application scope. This is non-negotiable.

- All `artifact.*` engine operations explicitly set `sys_scope` to the application scope sys_id.
- Schema operations (DDL) create tables and fields within the scope.
- ACLs, roles, Script Includes, Business Rules, Notifications, Scheduled Jobs, Widgets, UI Pages, and all other metadata records must have `sys_scope = x_infte_ops_int`.
- `sys_properties` (`property.*` operations) is a platform-global table by ServiceNow architecture and is the only intentional exception.
- Never create or modify records in another scope.

---

## Update Set Management

The engine maintains exactly **one** update set named `Operations Intelligence` (state: `in progress`). Rules:

- The engine creates this update set automatically the first time a configuration-creating operation runs. It never creates a second one.
- If the update set already exists and is in progress, the engine activates it for the current session — it does not create a new one.
- All `artifact.*`, `schema.*`, `acl.*`, `role.*`, `user.create`, and `group.*` write operations trigger this automatically before executing.
- No operation may create an update set with any other name or for any other purpose.
- `engine.status` returns the update set name, sys_id, and state for verification.

---

## Engine Script Standards

The engine operation script (`02b_engine_operation_script.js`) has strict formatting rules:

### Comments

- **No inline comments anywhere in the function body.** The script body must be free of all `//` comments.
- **One formal header block only.** The header (lines 1 to the first blank line before the function) must contain:
  - Engine identity (name, scope, endpoint, authentication)
  - Request format (single op and batch)
  - Complete operation catalog grouped by category
  - Nothing else — no deployment instructions, no operator guidance, no onboarding steps.
- The header is operational documentation for the engine itself. It must not address a human reader or contain instructions for how to copy, paste, or deploy the script.

### JavaScript

- **ES5 only.** ServiceNow's Rhino engine does not support ES6+.
- **No template literals (backticks).** Backticks cause a `SyntaxError` in the Rhino parser when stored as a Scripted REST operation script. Use string concatenation only.
- **No `let` or `const`.** Use `var`.
- **No arrow functions.** Use `function` declarations.
- **No destructuring.**
- **No `eval()`.** It is blocked in scoped apps. Use `GlideScopedEvaluator` with a real `GlideRecord` context.

### Structure

- All operations are dispatched through the single `dispatch()` function.
- The `TRACKED_OPS` object determines which operations trigger `ensureEngineUpdateSet()` pre-dispatch.
- `OP_CATALOG` drives both the `help` operation response and the `engine.status` `op_count` field. Add every new operation to `OP_CATALOG`.
- `engineOperationId()` must use a scope-qualified query (`sys_scope.scope=x_infte_ops_int`) with a name-only fallback. Never query by name alone as the primary path.

---

## Credentials and Secrets

| Secret | Storage location | Committed to source? |
|---|---|---|
| Engine API key | System property `x_infte_ops_int.engine_key` | No |
| Service account password | System property `x_infte_ops_int.svc_password` | No |
| `.env` file (local) | Repo root (gitignored) | No |

The `.env` file is gitignored. It must never be committed. The source of truth ZIP delivered to the project owner includes credentials by explicit authorisation — it is not stored in the repository.

---

## AI Identity Rules

- Never reference any AI tool, model, or vendor name in code, artifact names, Script Include names, property names, table names, role names, notifications, or any ServiceNow record.
- The service account is named `svc_operations_intelligence_api`. This name must not be changed or abbreviated.
- The engine key property is `x_infte_ops_int.engine_key`. This name must not be changed.

---

## Testing

The full test harness is `scripts/background-scripts/test_engine.sh`. It requires `.env` to be present at the repo root with `SNOW_INSTANCE`, `SNOW_USER`, `SNOW_PASS`, and `ENGINE_KEY` set.

- Run `bash test_engine.sh` after every engine change to verify the instance.
- All tests must pass before the engine is considered stable. `SKIP` results are acceptable only for operations where the required instance data does not exist (e.g. `record.history` requires an admin sys_id).
- The test script auto-unwraps the ServiceNow `{"result":{...}}` envelope.

---

## Deployment

Engine updates are deployed by running `bash scripts/background-scripts/update_engine.sh`, which reads `02b_engine_operation_script.js`, encodes it, and posts it to the live instance via `engine.selfupdate`. The engine validates the script contains the required safety markers before replacing itself.
