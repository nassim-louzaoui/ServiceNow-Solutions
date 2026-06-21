#!/usr/bin/env python3
"""Create the OI test admin user directly via the engine."""
import sys
import os
import json
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "build", "lib"))
import engine_client as ec

PERSON_TABLE = ec.table("person")
GROUP_TABLE  = ec.table("group")
TEST_USER    = "oi_test_admin"
TEST_GROUP   = "OI Test Administration"

def run():
    results = {}

    # 1. Create (or find) the ServiceNow user
    r = ec.call({"op": "user.create", "data": {
        "user_name":  TEST_USER,
        "first_name": "OI Test",
        "last_name":  "Admin",
        "email":      "oi_test_admin@example.com",
        "active":     "true"
    }})
    user_sys_id = r.get("sys_id")
    results["user"] = r
    print("user.create       :", r.get("action", "skipped" if r.get("skipped") else "?"), "->", user_sys_id)
    if not user_sys_id:
        print("ABORT: no user sys_id")
        return

    # 2. Remove global admin role if present (safety check)
    r2 = ec.call({"op": "role.revoke", "data": {"user": TEST_USER, "role": "admin"}})
    print("role.revoke admin :", r2.get("action", r2.get("reason", str(r2)[:80])))

    # 3. Create OI person record
    existing_person = ec.call({"op": "record.query", "data": {
        "table":         PERSON_TABLE,
        "encoded_query": "user=" + user_sys_id,
        "fields":        ["sys_id"],
        "limit":         1
    }})
    recs = existing_person.get("records", [])
    if recs:
        person_sys_id = recs[0]["sys_id"]
        print("person record     : exists ->", person_sys_id)
    else:
        pr = ec.call({"op": "record.insert", "data": {
            "table":  PERSON_TABLE,
            "fields": {"user": user_sys_id, "active": "true"}
        }})
        person_sys_id = pr.get("sys_id")
        print("person record     : inserted ->", person_sys_id)

    if not person_sys_id:
        print("ABORT: no person sys_id")
        return

    # 4. Create (or find) the OI test admin group
    existing_group = ec.call({"op": "record.query", "data": {
        "table":         GROUP_TABLE,
        "encoded_query": "name=" + TEST_GROUP + "^status!=archived",
        "fields":        ["sys_id", "members"],
        "limit":         1
    }})
    g_recs = existing_group.get("records", [])

    members_json = json.dumps([{
        "person_sys_id": person_sys_id,
        "group_role":    "admin",
        "added_by":      "",
        "added_at":      "",
        "status":        "active"
    }])

    if g_recs:
        group_sys_id   = g_recs[0]["sys_id"]
        # Add person to members JSON if not already present
        try:
            members = json.loads(g_recs[0].get("members", "[]") or "[]")
        except Exception:
            members = []
        already = any(m.get("person_sys_id") == person_sys_id for m in members)
        if not already:
            members.append({"person_sys_id": person_sys_id, "group_role": "admin",
                            "added_by": "", "added_at": "", "status": "active"})
            ec.call({"op": "record.update", "data": {
                "table":  GROUP_TABLE,
                "sys_id": group_sys_id,
                "fields": {"members": json.dumps(members)}
            }})
        print("group             : exists ->", group_sys_id)
    else:
        gr = ec.call({"op": "record.insert", "data": {
            "table":  GROUP_TABLE,
            "fields": {
                "name":        TEST_GROUP,
                "description": "Test group for OI admin impersonation testing",
                "type":        "custom_group",
                "status":      "active",
                "members":     members_json,
                "automations": "[]"
            }
        }})
        group_sys_id = gr.get("sys_id")
        print("group             : inserted ->", group_sys_id)

    time.sleep(1)

    # 5. Explicitly grant x_infte_ops_int.admin
    r3 = ec.call({"op": "role.grant", "data": {
        "user": TEST_USER,
        "role": "x_infte_ops_int.admin"
    }})
    print("role.grant admin  :", r3.get("action", r3.get("reason", str(r3)[:80])))

    # 6. Verify final state
    print("\n── Verification ──────────────────────────────────────")
    for role in ["x_infte_ops_int.admin", "x_infte_ops_int.leadership",
                 "x_infte_ops_int.creator", "x_infte_ops_int.user", "admin"]:
        chk = ec.call({"op": "record.query", "data": {
            "table":         "sys_user_has_role",
            "encoded_query": "user=" + user_sys_id + "^role.name=" + role,
            "fields":        ["sys_id"],
            "limit":         1
        }})
        has = len(chk.get("records", [])) > 0
        print("  %-36s %s" % (role, "[OK]" if has else "[not granted]"))

    print("\n── Test user ready ───────────────────────────────────")
    print("  Username  : " + TEST_USER)
    print("  Group     : " + TEST_GROUP + " (" + str(group_sys_id) + ")")
    print("  Impersonate: System > Impersonate User > search '" + TEST_USER + "'")

if __name__ == "__main__":
    run()
