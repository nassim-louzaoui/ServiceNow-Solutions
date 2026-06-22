#!/usr/bin/env python3
"""
Phase 12 — Fix Write Guard Permissions

The write guards deployed in Phase 10 block ALL writes to OI tables unless the
user has x_infte_ops_int.admin. This is too restrictive: portal users with
creator or user roles need to write to execution and managed_artifact tables
to trigger automations and create deliverables.

This phase redeploys targeted write guards:
  • x_infte_ops_int_execution      — any OI role may write (user, creator, leadership, admin)
  • x_infte_ops_int_managed_artifact — creator or admin may write
  • All other tables               — admin only (unchanged from Phase 10)

Also deploys write guards on x_infte_ops_int_person to allow the portal to
auto-enroll the current user (admin check is sufficient there).
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

ANY_OI_ROLE_GUARD = (
    "(function executeRule(current, previous) {\n"
    "    var uid = gs.getUserID();\n"
    "    var hr = new GlideRecord('sys_user_has_role');\n"
    "    hr.addQuery('user', uid);\n"
    "    hr.addQuery('role.name', 'IN', 'x_infte_ops_int.admin,x_infte_ops_int.leadership,x_infte_ops_int.creator,x_infte_ops_int.user');\n"
    "    hr.setLimit(1);\n"
    "    hr.query();\n"
    "    if (!hr.next()) {\n"
    "        current.setAbortAction(true);\n"
    "        gs.addErrorMessage('Write access to Operations Intelligence records requires an Operations Intelligence role.');\n"
    "    }\n"
    "})(current, previous);"
)

CREATOR_OR_ADMIN_GUARD = (
    "(function executeRule(current, previous) {\n"
    "    var uid = gs.getUserID();\n"
    "    var hr = new GlideRecord('sys_user_has_role');\n"
    "    hr.addQuery('user', uid);\n"
    "    hr.addQuery('role.name', 'IN', 'x_infte_ops_int.admin,x_infte_ops_int.creator');\n"
    "    hr.setLimit(1);\n"
    "    hr.query();\n"
    "    if (!hr.next()) {\n"
    "        current.setAbortAction(true);\n"
    "        gs.addErrorMessage('Write access to Operations Intelligence deliverables requires the Creator or Administrator role.');\n"
    "    }\n"
    "})(current, previous);"
)


TARGETED_GUARDS = [
    (
        "x_infte_ops_int_execution",
        "Operations Intelligence - Execution Write Guard",
        ANY_OI_ROLE_GUARD,
    ),
    (
        "x_infte_ops_int_managed_artifact",
        "Operations Intelligence - Managed Artifact Write Guard",
        CREATOR_OR_ADMIN_GUARD,
    ),
]


def build():
    log = ["=== Phase 12: Fix Write Guard Permissions ===", ""]

    ok = fail = 0
    for table, rule_name, script in TARGETED_GUARDS:
        data = {
            "name":       rule_name,
            "collection": table,
            "script":     script,
            "when":       "before",
            "query":      False,
            "insert":     True,
            "update":     True,
            "delete":     True,
            "order":      45,
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

    log.append("\nPermission guards: %d deployed, %d failed" % (ok, fail))
    log.append("\n=== Phase 12 complete ===")
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
