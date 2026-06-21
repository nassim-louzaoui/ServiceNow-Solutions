#!/usr/bin/env python3
"""
Phase — Role Assignment Guard

Deploys two Business Rules on sys_user_has_role that enforce the invariant:
OI roles (x_infte_ops_int.*) can only be assigned or revoked through the
Operations Intelligence application itself.

Any attempt by a platform administrator — or any other mechanism — to directly
insert or delete an OI sys_user_has_role record is aborted unless:
  (a) the calling code is in the x_infte_ops_int scope (e.g. RoleSyncService), OR
  (b) the request authenticates as the OI service account.

This means even a platform administrator with full admin rights cannot bypass
the application's access control by directly touching sys_user_has_role.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

BR_INSERT = (
    "(function executeRule(current, previous) {\n"
    "    var OI_ROLES = [\n"
    "        'x_infte_ops_int.admin',\n"
    "        'x_infte_ops_int.leadership',\n"
    "        'x_infte_ops_int.creator',\n"
    "        'x_infte_ops_int.user'\n"
    "    ];\n"
    "    var roleGr = new GlideRecord('sys_user_role');\n"
    "    if (!roleGr.get('' + current.getValue('role'))) { return; }\n"
    "    var roleName = '' + roleGr.getValue('name');\n"
    "    var isOiRole = false;\n"
    "    var i;\n"
    "    for (i = 0; i < OI_ROLES.length; i++) {\n"
    "        if (OI_ROLES[i] === roleName) { isOiRole = true; break; }\n"
    "    }\n"
    "    if (!isOiRole) { return; }\n"
    "    var callerScope = gs.getCallerScopeName ? gs.getCallerScopeName() : '';\n"
    "    if (callerScope === 'x_infte_ops_int') { return; }\n"
    "    if (gs.getUserName() === 'svc_operations_intelligence_api') { return; }\n"
    "    current.setAbortAction(true);\n"
    "    gs.addErrorMessage('Operations Intelligence roles can only be assigned through the Operations Intelligence application.');\n"
    "})(current, previous);"
)

BR_DELETE = (
    "(function executeRule(current, previous) {\n"
    "    var OI_ROLES = [\n"
    "        'x_infte_ops_int.admin',\n"
    "        'x_infte_ops_int.leadership',\n"
    "        'x_infte_ops_int.creator',\n"
    "        'x_infte_ops_int.user'\n"
    "    ];\n"
    "    var roleGr = new GlideRecord('sys_user_role');\n"
    "    if (!roleGr.get('' + current.getValue('role'))) { return; }\n"
    "    var roleName = '' + roleGr.getValue('name');\n"
    "    var isOiRole = false;\n"
    "    var i;\n"
    "    for (i = 0; i < OI_ROLES.length; i++) {\n"
    "        if (OI_ROLES[i] === roleName) { isOiRole = true; break; }\n"
    "    }\n"
    "    if (!isOiRole) { return; }\n"
    "    var callerScope = gs.getCallerScopeName ? gs.getCallerScopeName() : '';\n"
    "    if (callerScope === 'x_infte_ops_int') { return; }\n"
    "    if (gs.getUserName() === 'svc_operations_intelligence_api') { return; }\n"
    "    current.setAbortAction(true);\n"
    "    gs.addErrorMessage('Operations Intelligence role assignments can only be modified through the Operations Intelligence application.');\n"
    "})(current, previous);"
)

RULES = [
    (
        "Operations Intelligence - Role Assignment Guard",
        "sys_user_has_role",
        "before", True, False, False,
        "",
        BR_INSERT,
        99,
    ),
    (
        "Operations Intelligence - Role Removal Guard",
        "sys_user_has_role",
        "before", False, False, True,
        "",
        BR_DELETE,
        99,
    ),
]


def build():
    log = []
    ok = fail = 0
    for name, collection, when, ins, upd, dele, condition, script, order in RULES:
        data = {
            "name":       name,
            "collection": collection,
            "when":       when,
            "insert":     ins,
            "update":     upd,
            "delete":     dele,
            "condition":  condition,
            "script":     script,
            "active":     True,
            "order":      order,
        }
        r = ec.op("artifact.business_rule", data=data)
        if r.get("ok"):
            ok += 1
            log.append("%-55s %s" % (name[:55], r.get("action", "ok")))
        else:
            fail += 1
            log.append("%-55s FAIL: %s" % (name[:55], str(r)[:200]))
        time.sleep(0.5)
    log.append("=== role assignment guards: %d ok, %d failed ===" % (ok, fail))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
