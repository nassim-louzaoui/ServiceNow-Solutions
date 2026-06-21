#!/usr/bin/env python3
"""
Phase 3 — Access Control

Implements the documented governance matrix as ServiceNow ACLs in the
application scope:

  * Table-level read/create/write/delete ACLs granting the roles each table
    permits. Roles attach through the sys_security_acl_role M2M table (the
    engine creates the ACL row; this phase links the roles).
  * Field-level ACLs for the sensitive fields, most importantly
    creator_credential.github_pat whose read is denied to everyone — including
    admin — via admin_overrides=false and a script that returns false.

Row-level refinements (own row / own groups) are enforced at runtime by
PermissionResolver (Phase 4); the role tier created here is the primary
user-facing access surface. "System" operations in the matrix map to admin at
the ACL tier — in-scope Script Include code operates on its own tables with
application privilege and is unaffected.

Idempotent: ACLs upsert by name+operation; role links are checked before insert.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

ADMIN = "admin"
LEAD = "x_infte_ops_int.leadership"
CREATOR = "x_infte_ops_int.creator"
USER = "x_infte_ops_int.user"

# table -> {operation: [roles]}; empty role list = all authenticated
MATRIX = {
    "person":                 {"read": [ADMIN, LEAD, USER], "create": [ADMIN], "write": [ADMIN], "delete": [ADMIN]},
    "reporting_relationship": {"read": [ADMIN, LEAD], "create": [ADMIN, LEAD], "write": [ADMIN, LEAD], "delete": [ADMIN]},
    "group":                  {"read": [ADMIN, LEAD, CREATOR, USER], "create": [ADMIN, LEAD], "write": [ADMIN, LEAD], "delete": [ADMIN]},
    "group_member":           {"read": [ADMIN, LEAD, USER], "create": [ADMIN], "write": [ADMIN, LEAD], "delete": [ADMIN]},
    "onboarding_request":     {"read": [ADMIN, LEAD, USER], "create": [ADMIN], "write": [ADMIN, USER], "delete": [ADMIN]},
    "automation_category":    {"read": [], "create": [ADMIN], "write": [ADMIN], "delete": [ADMIN]},
    "approved_flow":          {"read": [ADMIN, LEAD, CREATOR], "create": [ADMIN], "write": [ADMIN], "delete": [ADMIN]},
    "automation":             {"read": [ADMIN, LEAD, CREATOR, USER], "create": [ADMIN, CREATOR], "write": [ADMIN, CREATOR], "delete": [ADMIN]},
    "automation_version":     {"read": [ADMIN, LEAD, CREATOR], "create": [ADMIN], "write": [ADMIN], "delete": [ADMIN]},
    "automation_step":        {"read": [ADMIN, LEAD, CREATOR, USER], "create": [ADMIN, CREATOR], "write": [ADMIN, CREATOR], "delete": [ADMIN, CREATOR]},
    "automation_input":       {"read": [ADMIN, LEAD, CREATOR, USER], "create": [ADMIN, CREATOR], "write": [ADMIN, CREATOR], "delete": [ADMIN, CREATOR]},
    "group_automation":       {"read": [ADMIN, LEAD, CREATOR, USER], "create": [ADMIN], "write": [ADMIN, LEAD], "delete": [ADMIN]},
    "execution":              {"read": [ADMIN, LEAD, USER], "create": [ADMIN, USER], "write": [ADMIN], "delete": [ADMIN]},
    "execution_step_log":     {"read": [ADMIN, LEAD, USER], "create": [ADMIN], "write": [ADMIN], "delete": [ADMIN]},
    "automation_schedule":    {"read": [ADMIN, LEAD, CREATOR], "create": [ADMIN, CREATOR], "write": [ADMIN, CREATOR], "delete": [ADMIN, CREATOR]},
    "use_case_request":       {"read": [ADMIN, LEAD, CREATOR], "create": [CREATOR], "write": [ADMIN, CREATOR], "delete": [ADMIN]},
    "creator_credential":     {"read": [ADMIN, CREATOR], "create": [ADMIN, CREATOR], "write": [ADMIN, CREATOR], "delete": [ADMIN]},
    "pending_action":         {"read": [ADMIN, LEAD], "create": [ADMIN], "write": [ADMIN, LEAD], "delete": [ADMIN]},
    "managed_artifact":       {"read": [ADMIN, LEAD, CREATOR, USER], "create": [ADMIN, CREATOR, USER], "write": [ADMIN, CREATOR], "delete": [ADMIN]},
}

# Field ACLs: (table_short, field, operation, roles, script, admin_overrides)
FIELD_ACLS = [
    ("creator_credential", "github_pat", "read", [], "answer = false;", False),
    ("creator_credential", "github_pat", "write", [CREATOR], "", True),
    ("execution", "input_values", "read", [ADMIN, LEAD, USER], "", True),
    ("execution", "input_values", "write", [ADMIN], "", True),
    ("use_case_request", "structured_spec", "read", [ADMIN, LEAD, CREATOR], "", True),
    ("use_case_request", "structured_spec", "write", [ADMIN], "", True),
    ("use_case_request", "description", "read", [ADMIN, LEAD, CREATOR], "", True),
    ("use_case_request", "description", "write", [CREATOR], "", True),
    ("managed_artifact", "artifact_sys_ids", "read", [ADMIN], "", True),
    ("managed_artifact", "artifact_sys_ids", "write", [ADMIN], "", True),
    ("managed_artifact", "creation_spec", "read", [ADMIN, CREATOR], "", True),
    ("managed_artifact", "creation_spec", "write", [ADMIN], "", True),
    ("managed_artifact", "copilot_assisted", "read", [ADMIN, LEAD, CREATOR], "", True),
    ("managed_artifact", "copilot_assisted", "write", [ADMIN], "", True),
]


def resolve_roles():
    out = {}
    for token in (ADMIN, LEAD, CREATOR, USER):
        r = ec.op("record.query", table="sys_user_role",
                  encoded_query="name=%s" % token, fields=["sys_id"], limit=1)
        recs = r.get("records", [])
        out[token] = recs[0]["sys_id"] if recs else None
    return out


def link_roles(acl_id, role_tokens, role_ids):
    """Attach roles to an ACL via sys_security_acl_role, skipping existing links."""
    linked = 0
    for tok in role_tokens:
        rid = role_ids.get(tok)
        if not rid:
            continue
        exists = ec.op("record.query", table="sys_security_acl_role",
                       encoded_query="sys_security_acl=%s^sys_user_role=%s" % (acl_id, rid),
                       fields=["sys_id"], limit=1)
        if exists.get("records"):
            continue
        ec.op("record.insert", table="sys_security_acl_role", platform=True, scope=True,
              data={"sys_security_acl": acl_id, "sys_user_role": rid})
        linked += 1
        time.sleep(0.2)
    return linked


def make_acl(name, operation, roles, role_ids, script="", admin_overrides=True):
    data = {"operation": operation, "type": "record",
            "admin_overrides": admin_overrides}
    if script:
        data["script"] = script
    res = ec.op("acl.create", table=name, data=data)
    if not res.get("ok"):
        return None, "acl FAIL %s/%s: %s" % (name, operation, str(res)[:140])
    acl_id = res.get("sys_id")
    nlinked = link_roles(acl_id, roles, role_ids) if roles else 0
    return acl_id, "%s/%s ok (+%d roles)%s" % (name, operation, nlinked,
                                               " [deny-all]" if not roles and script else "")


def build():
    log = []
    role_ids = resolve_roles()
    log.append("roles: " + ", ".join("%s=%s" % (k.split(".")[-1], "ok" if v else "MISSING")
                                      for k, v in role_ids.items()))

    # Table ACLs
    for short, ops in MATRIX.items():
        phys = ec.table(short)
        for operation, roles in ops.items():
            _id, msg = make_acl(phys, operation, roles, role_ids)
            if "FAIL" in msg:
                log.append("  " + msg)
        time.sleep(0.3)
    log.append("table ACLs created for %d tables" % len(MATRIX))

    # Field ACLs
    fcount = 0
    for short, field, operation, roles, script, ao in FIELD_ACLS:
        name = "%s.%s" % (ec.table(short), field)
        _id, msg = make_acl(name, operation, roles, role_ids, script=script, admin_overrides=ao)
        if "FAIL" in msg:
            log.append("  " + msg)
        else:
            fcount += 1
        time.sleep(0.2)
    log.append("field ACLs created: %d / %d" % (fcount, len(FIELD_ACLS)))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
