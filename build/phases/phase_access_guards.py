#!/usr/bin/env python3
"""
Phase — Query Access Guards

Creates one "before query" Business Rule per Operations Intelligence table.
Each rule queries sys_user_has_role directly (bypassing gs.hasRole admin
elevation) so that only users with an explicitly assigned Operations
Intelligence role can read any OI table record — including platform admins
without an OI role assignment.

The guard script adds an impossible filter (sys_id = 'BLOCKED') when the
current user has no OI role, which causes ServiceNow to return zero records.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

GUARD_SCRIPT = (
    "(function executeRule(current, previous) {\n"
    "    var uid = gs.getUserID();\n"
    "    var hr = new GlideRecord('sys_user_has_role');\n"
    "    hr.addQuery('user', uid);\n"
    "    hr.addQuery('role.name', 'IN',\n"
    "        'x_infte_ops_int.admin,x_infte_ops_int.leadership,"
    "x_infte_ops_int.creator,x_infte_ops_int.user');\n"
    "    hr.setLimit(1);\n"
    "    hr.query();\n"
    "    if (!hr.next()) {\n"
    "        current.addQuery('sys_id', '=', 'BLOCKED');\n"
    "    }\n"
    "})(current, previous);"
)

# (rule_name, table_name)
# Names intentionally descriptive — engine truncates to 40 chars on the instance;
# the truncated names serve as idempotent upsert keys combined with collection.
GUARDS = [
    ("Operations Intelligence - Approved Automation Flow Access Guard",
     "x_infte_ops_int_approved_flow"),
    ("Operations Intelligence - Automation Definition Access Guard",
     "x_infte_ops_int_automation"),
    ("Operations Intelligence - Automation Version Access Guard",
     "x_infte_ops_int_automation_version"),
    ("Operations Intelligence - Automation Execution Access Guard",
     "x_infte_ops_int_execution"),
    ("Operations Intelligence - Operations Group Access Guard",
     "x_infte_ops_int_group"),
    ("Operations Intelligence - Managed Artifact Access Guard",
     "x_infte_ops_int_managed_artifact"),
    ("Operations Intelligence - Onboarding Request Access Guard",
     "x_infte_ops_int_onboarding_request"),
    ("Operations Intelligence - Pending Action Access Guard",
     "x_infte_ops_int_pending_action"),
    ("Operations Intelligence - Personnel Record Access Guard",
     "x_infte_ops_int_person"),
    ("Operations Intelligence - Reporting Relationship Access Guard",
     "x_infte_ops_int_reporting_relationship"),
    ("Operations Intelligence - Use Case Request Access Guard",
     "x_infte_ops_int_use_case_request"),
]


def build():
    log = []
    ok = fail = 0
    for name, table in GUARDS:
        data = {
            "name":       name,
            "collection": table,
            "script":     GUARD_SCRIPT,
            "when":       "before",
            "query":      True,
            "insert":     False,
            "update":     False,
            "delete":     False,
            "order":      100,
            "active":     True,
        }
        r = ec.op("artifact.business_rule", data=data)
        if r.get("ok"):
            ok += 1
            log.append("%-55s %s" % (name[:55], r.get("action", "ok")))
        else:
            fail += 1
            log.append("%-55s FAIL: %s" % (name[:55], str(r)[:160]))
        time.sleep(0.4)
    log.append("=== access guards: %d ok, %d failed ===" % (ok, fail))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
