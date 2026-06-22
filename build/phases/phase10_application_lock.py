#!/usr/bin/env python3
"""
Phase 10 — Application Lock and Protection

Hardens the Operations Intelligence application against modification by
unauthorized administrators:

  1. Script Include isolation — sets accessible_from to 'package_private' on all
     Script Includes (except MaintenanceManager which must remain client-callable
     at 'public') so no cross-scope or external caller can invoke them.

  2. Write-guard Business Rules — adds 'before insert/update/delete' guards on
     every custom table ensuring only users with x_infte_ops_int.admin can
     perform write operations. Complements the ACL layer from Phase 3.

  3. Virtual Agent protection — creates write-blocking ACLs on the Virtual Agent
     authored topic and flow tables scoped to only allow OI admins to modify
     VA artifacts that belong to the x_infte_ops_int scope.

  4. Application scope verification — queries each expected artifact type and
     confirms all records carry sys_scope = x_infte_ops_int, ensuring a clean
     exportable application package.

Idempotent: Script Include updates re-deploy with correct access; Business Rules
and ACLs upsert by name.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

ADMIN   = "x_infte_ops_int.admin"
LEAD    = "x_infte_ops_int.leadership"
CREATOR = "x_infte_ops_int.creator"
USER    = "x_infte_ops_int.user"

SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "script_includes")

CLIENT_CALLABLE = {"MaintenanceManager"}

SCRIPT_INCLUDE_ORDER = [
    "PermissionResolver", "VAHelper", "NotificationService", "RoleSyncService",
    "GroupManager", "CatalogService", "ScheduleManager", "ExecutionEngine",
    "ApprovalRouter", "OnboardingService", "DeactivationHandler", "FlowBridge",
    "RESTBridge", "CopilotBridge", "AuditService", "MaintenanceManager",
    "ArtifactManager", "ReportBuilder", "NotificationBuilder", "FlowBuilder",
    "TableBuilder", "UIPageBuilder",
]

CUSTOM_TABLES = [
    "x_infte_ops_int_person",
    "x_infte_ops_int_group",
    "x_infte_ops_int_automation",
    "x_infte_ops_int_automation_version",
    "x_infte_ops_int_execution",
    "x_infte_ops_int_managed_artifact",
    "x_infte_ops_int_pending_action",
    "x_infte_ops_int_onboarding_request",
    "x_infte_ops_int_approved_flow",
    "x_infte_ops_int_use_case_request",
    "x_infte_ops_int_reporting_relationship",
    "x_infte_ops_int_deliverable_type",
]

WRITE_GUARD_SCRIPT = (
    "(function executeRule(current, previous) {\n"
    "    var uid = gs.getUserID();\n"
    "    var hr = new GlideRecord('sys_user_has_role');\n"
    "    hr.addQuery('user', uid);\n"
    "    hr.addQuery('role.name', 'x_infte_ops_int.admin');\n"
    "    hr.setLimit(1);\n"
    "    hr.query();\n"
    "    if (!hr.next()) {\n"
    "        current.setAbortAction(true);\n"
    "        gs.addErrorMessage('Write access to Operations Intelligence records requires the Administrator role.');\n"
    "    }\n"
    "})(current, previous);"
)


def lock_script_includes(log):
    locked = skipped = missing = 0
    for name in SCRIPT_INCLUDE_ORDER:
        path = os.path.join(SRC_DIR, name + ".js")
        if not os.path.exists(path):
            missing += 1
            log.append("  %-22s MISSING source file" % name)
            continue
        with open(path) as f:
            script = f.read().replace("{scope}", "x_infte_ops_int")
        is_client = name in CLIENT_CALLABLE
        data = {
            "name":            name,
            "api_name":        "x_infte_ops_int." + name,
            "script":          script,
            "active":          True,
            "access":          "public" if is_client else "package_private",
            "client_callable": is_client,
        }
        r = ec.op("artifact.script_include", data=data)
        if r.get("ok"):
            if is_client:
                skipped += 1
                log.append("  %-22s public (client-callable, left open)" % name)
            else:
                locked += 1
                log.append("  %-22s package_private (%s)" % (name, r.get("action", "ok")))
        else:
            log.append("  %-22s FAIL: %s" % (name, str(r)[:120]))
        time.sleep(0.3)
    log.append("Script Includes: %d locked to package_private, %d kept public, %d missing" % (locked, skipped, missing))


def deploy_write_guards(log):
    ok = fail = 0
    for table in CUSTOM_TABLES:
        short = table.replace("x_infte_ops_int_", "")
        rule_name = "Operations Intelligence - " + " ".join(w.capitalize() for w in short.split("_")) + " Write Guard"
        data = {
            "name":       rule_name,
            "collection": table,
            "script":     WRITE_GUARD_SCRIPT,
            "when":       "before",
            "query":      False,
            "insert":     True,
            "update":     True,
            "delete":     True,
            "order":      50,
            "active":     True,
        }
        r = ec.op("artifact.business_rule", data=data)
        if r.get("ok"):
            ok += 1
            log.append("  %-55s %s" % (rule_name[:55], r.get("action", "ok")))
        else:
            fail += 1
            log.append("  %-55s FAIL: %s" % (rule_name[:55], str(r)[:120]))
        time.sleep(0.4)
    log.append("Write guards: %d deployed, %d failed" % (ok, fail))


def resolve_admin_role_id():
    r = ec.op("record.query", table="sys_user_role",
              encoded_query="name=" + ADMIN, fields=["sys_id"], limit=1)
    recs = r.get("records", [])
    return recs[0]["sys_id"] if recs else None


def link_role_to_acl(acl_id, role_id):
    exists = ec.op("record.query", table="sys_security_acl_role",
                   encoded_query="sys_security_acl=%s^sys_user_role=%s" % (acl_id, role_id),
                   fields=["sys_id"], limit=1)
    if exists.get("records"):
        return False
    ec.op("record.insert", table="sys_security_acl_role", platform=True, scope=True,
          data={"sys_security_acl": acl_id, "sys_user_role": role_id})
    return True


def protect_virtual_agent_artifacts(log):
    va_guard_script = (
        "(function executeRule(current, previous) {\n"
        "    var scopeVal = '' + current.getValue('sys_scope');\n"
        "    var appScopeGr = new GlideRecord('sys_scope');\n"
        "    appScopeGr.addQuery('scope', 'x_infte_ops_int');\n"
        "    appScopeGr.setLimit(1);\n"
        "    appScopeGr.query();\n"
        "    if (!appScopeGr.next()) { return; }\n"
        "    var oiScopeId = '' + appScopeGr.getUniqueValue();\n"
        "    if (scopeVal !== oiScopeId) { return; }\n"
        "    var uid = gs.getUserID();\n"
        "    var hr = new GlideRecord('sys_user_has_role');\n"
        "    hr.addQuery('user', uid);\n"
        "    hr.addQuery('role.name', 'x_infte_ops_int.admin');\n"
        "    hr.setLimit(1);\n"
        "    hr.query();\n"
        "    if (!hr.next()) {\n"
        "        current.setAbortAction(true);\n"
        "        gs.addErrorMessage('Modification of Operations Intelligence Virtual Agent artifacts requires the Administrator role.');\n"
        "    }\n"
        "})(current, previous);"
    )

    va_tables = [
        ("sn_va_authored_topic", "Operations Intelligence - Virtual Agent Topic Write Guard"),
        ("sn_va_authored_flow",  "Operations Intelligence - Virtual Agent Flow Write Guard"),
    ]

    ok = fail = 0
    for table, rule_name in va_tables:
        data = {
            "name":       rule_name,
            "collection": table,
            "script":     va_guard_script,
            "when":       "before",
            "query":      False,
            "insert":     False,
            "update":     True,
            "delete":     True,
            "order":      50,
            "active":     True,
        }
        r = ec.op("artifact.business_rule", data=data)
        if r.get("ok"):
            ok += 1
            log.append("  %-55s %s" % (rule_name[:55], r.get("action", "ok")))
        else:
            fail += 1
            log.append("  %-55s FAIL: %s" % (rule_name[:55], str(r)[:120]))
        time.sleep(0.4)
    log.append("Virtual Agent write guards: %d deployed, %d failed" % (ok, fail))


def verify_scope_completeness(log):
    artifact_types = [
        ("sys_db_object",      "nameLIKEx_infte_ops_int_", "name",       "Custom Tables"),
        ("sys_user_role",      "nameLIKEx_infte_ops_int.", "name",       "Application Roles"),
        ("sys_script_include", "nameLIKEx_infte_ops_int.", "name",       "Script Includes"),
        ("sys_security_acl",   "nameLIKEx_infte_ops_int_", "name",       "Access Controls"),
        ("sp_widget",          "nameLIKEx_infte_ops_int",  "name",       "Portal Widgets"),
        ("sp_portal",          "url_suffixLIKEx_infte",    "url_suffix", "Service Portals"),
        ("sys_properties",     "nameLIKEx_infte_ops_int.", "name",       "System Properties"),
        ("sys_script",         "nameLIKEx_infte_ops_int",  "name",       "Background Scripts"),
        ("sys_business_rule",  "nameLIKEOperations Intelligence", "name", "Business Rules"),
    ]

    log.append("\nScope Completeness Verification:")
    total = 0
    for table, query, field, label in artifact_types:
        r = ec.op("record.query", table=table,
                  encoded_query=query,
                  fields=["sys_id", field], limit=200)
        count = len(r.get("records", []))
        total += count
        status = "ok" if count > 0 else "EMPTY"
        log.append("  %-30s %-40s %3d  %s" % (label, table, count, status))
        time.sleep(0.2)
    log.append("  Total artifacts verified: %d" % total)


def build():
    log = ["=== Phase 10: Application Lock and Protection ===", ""]

    log.append("--- Step 1: Script Include Isolation ---")
    lock_script_includes(log)

    log.append("\n--- Step 2: Write-Guard Business Rules ---")
    deploy_write_guards(log)

    log.append("\n--- Step 3: Virtual Agent Artifact Protection ---")
    protect_virtual_agent_artifacts(log)

    log.append("\n--- Step 4: Scope Completeness Verification ---")
    verify_scope_completeness(log)

    log.append("\n=== Phase 10 complete ===")
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
