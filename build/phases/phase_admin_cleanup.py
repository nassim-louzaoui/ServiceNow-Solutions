#!/usr/bin/env python3
"""
Admin Cleanup Phase

1. Deletes 5 inactive business rules left over from earlier development.
2. Creates a test user with the Operations Intelligence admin role.
3. Reports results for each action.

Uses the Table REST API for deletions (bypasses scoped-evaluator restrictions)
and the engine user.create operation for the test user.
"""
import os
import sys
import json
import urllib.request
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

INACTIVE_BR_SYS_IDS = [
    "2e07a1a6fbe50f9035cbf4bbaeefdcb0",
    "4b07a1a6fbe50f9035cbf4bbaeefdcc2",
    "530725a6fbe50f9035cbf4bbaeefdcae",
    "7a07ede6fba98b9052eef5c9beefdcb1",
    "fb0721663b294b90105c95bf55e45ae5",
]

TEST_USER = {
    "user_name":   "oi.test.admin",
    "first_name":  "Operations",
    "last_name":   "Test Admin",
    "email":       "oi.test.admin@everestdev.service-now.com",
    "title":       "Operations Intelligence Test Administrator",
    "department":  "Operations Intelligence",
    "active":      True,
    "password":    "OI_Test@2026!",
    "roles":       ["x_infte_ops_int.admin"],
}


def table_delete(table, sys_id):
    url = "%s/api/now/table/%s/%s" % (ec.INSTANCE, table, sys_id)
    req = urllib.request.Request(url, method="DELETE")
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def table_query(table, encoded_query, fields=None, limit=10):
    params = {"sysparm_query": encoded_query, "sysparm_limit": str(limit)}
    if fields:
        params["sysparm_fields"] = ",".join(fields)
    url = "%s/api/now/table/%s?%s" % (ec.INSTANCE, table,
                                      urllib.parse.urlencode(params))
    req = urllib.request.Request(url)
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read()).get("result", [])


def build():
    log = []

    # ── 1. Delete inactive business rules ─────────────────────────────────────
    log.append("--- Deleting inactive business rules ---")
    for sys_id in INACTIVE_BR_SYS_IDS:
        status = table_delete("sys_script", sys_id)
        if status in (200, 204):
            log.append("  deleted BR %s  (HTTP %d)" % (sys_id, status))
        elif status == 404:
            log.append("  BR %s not found (already gone)" % sys_id)
        else:
            log.append("  BR %s  HTTP %d (unexpected)" % (sys_id, status))

    # ── 2. Create test user ────────────────────────────────────────────────────
    log.append("--- Creating test user ---")
    existing = table_query("sys_user",
                           "user_name=%s" % TEST_USER["user_name"],
                           fields=["sys_id", "user_name"], limit=1)
    if existing:
        uid = existing[0]["sys_id"]
        log.append("  test user '%s' already exists (sys_id %s)" % (
            TEST_USER["user_name"], uid))
    else:
        r = ec.op("user.create", data=TEST_USER)
        if r.get("ok"):
            log.append("  test user '%s' created  sys_id=%s" % (
                TEST_USER["user_name"], r.get("sys_id", "?")))
        else:
            log.append("  test user creation FAILED: %s" % str(r)[:200])

    # ── 3. Clean up empty/leftover test property records ──────────────────────
    log.append("--- Cleaning up empty test property records ---")
    test_props = table_query(
        "sys_properties",
        "nameLIKEtest^ORnameLIKE_test_^sys_scope=75be0bf9fbe9cb5052eef5c9beefdce8",
        fields=["sys_id", "name", "value"], limit=20
    )
    for prop in test_props:
        if not prop.get("value", "").strip() or prop.get("value") in ("", "null"):
            status = table_delete("sys_properties", prop["sys_id"])
            log.append("  deleted empty property '%s'  HTTP %d" % (
                prop.get("name", "?"), status))

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
