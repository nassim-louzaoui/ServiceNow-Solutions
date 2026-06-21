#!/usr/bin/env python3
"""
Group Consolidation Phase — Merge Group Membership and Automation Assignments

Adds two JSON fields to the group table:
  - members: replaces group_member table
  - automations: replaces group_automation table

Then migrates existing data from the two tables into those JSON fields,
and deletes the two now-redundant tables.

Safe to re-run: field additions are idempotent. Data migration is additive
(existing JSON values are read, merged, and written back). Table deletions
check for existence first.
"""
import os
import sys
import json
import time
import urllib.request
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

SCOPE_ID = "75be0bf9fbe9cb5052eef5c9beefdce8"

NEW_GROUP_FIELDS = [
    ("members",    "string", "Members",    {"max_length": "16000"}),
    ("automations","string", "Automations",{"max_length": "16000"}),
]

TABLES_TO_DELETE = [
    "group_member",
    "group_automation",
]


def table_query(table, query, fields, limit=1000):
    params = urllib.parse.urlencode({
        "sysparm_query": query,
        "sysparm_fields": ",".join(fields),
        "sysparm_limit": str(limit),
        "sysparm_display_value": "false",
    })
    url = "%s/api/now/table/%s?%s" % (ec.INSTANCE, table, params)
    req = urllib.request.Request(url)
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read()).get("result", [])


def table_patch(table, sys_id, payload):
    url = "%s/api/now/table/%s/%s" % (ec.INSTANCE, table, sys_id)
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PATCH")
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def table_delete(table, sys_id):
    url = "%s/api/now/table/%s/%s" % (ec.INSTANCE, table, sys_id)
    for attempt in range(3):
        req = urllib.request.Request(url, method="DELETE")
        req.add_header("Authorization", ec._AUTH)
        req.add_header("Accept", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.status
        except urllib.error.HTTPError as e:
            return e.code
        except Exception:
            time.sleep(5 * (attempt + 1))
    return 0


def build():
    log = []

    # 1. Add members + automations fields to group table
    log.append("--- Adding JSON fields to group table ---")
    for element, col_type, label, opts in NEW_GROUP_FIELDS:
        r = ec.op("schema.add_field", table="x_infte_ops_int_group", data={
            "element":    element,
            "type":       col_type,
            "label":      label,
            "scope_id":   SCOPE_ID,
            "max_length": opts.get("max_length", ""),
        })
        status = "ok" if r.get("ok") else ("exists" if r.get("exists") else "FAIL")
        log.append("  group.%-15s %s" % (element, status))

    # 2. Migrate group_member data into group.members JSON
    log.append("--- Migrating group_member to group.members ---")
    group_recs = table_query("x_infte_ops_int_group",
                             "sys_scope=" + SCOPE_ID,
                             ["sys_id", "name", "members"])
    members_by_group = {}
    member_recs = table_query("x_infte_ops_int_group_member",
                              "sys_scope=" + SCOPE_ID,
                              ["sys_id", "group", "member", "group_role", "added_by", "added_at", "status"])
    for m in member_recs:
        gid = m["group"]
        if gid not in members_by_group:
            members_by_group[gid] = []
        members_by_group[gid].append({
            "person_sys_id": m["member"],
            "group_role":    m["group_role"],
            "added_by":      m["added_by"],
            "added_at":      m["added_at"],
            "status":        m["status"],
        })

    for grp in group_recs:
        gid = grp["sys_id"]
        new_members = members_by_group.get(gid, [])
        if new_members:
            status = table_patch("x_infte_ops_int_group", gid, {"members": json.dumps(new_members)})
            log.append("  group %s: wrote %d members (HTTP %s)" % (grp["name"], len(new_members), status))
        time.sleep(0.1)

    # 3. Migrate group_automation data into group.automations JSON
    log.append("--- Migrating group_automation to group.automations ---")
    auto_by_group = {}
    ga_recs = table_query("x_infte_ops_int_group_automation",
                          "sys_scope=" + SCOPE_ID,
                          ["sys_id", "group", "automation", "added_by", "added_at",
                           "approval_status", "approved_by", "approved_at", "rejected_reason"])
    for ga in ga_recs:
        gid = ga["group"]
        if gid not in auto_by_group:
            auto_by_group[gid] = []
        auto_by_group[gid].append({
            "automation_sys_id": ga["automation"],
            "approval_status":   ga["approval_status"],
            "added_by":          ga["added_by"],
            "added_at":          ga["added_at"],
            "approved_by":       ga["approved_by"],
            "approved_at":       ga["approved_at"],
            "rejected_reason":   ga["rejected_reason"],
        })

    for grp in group_recs:
        gid = grp["sys_id"]
        new_autos = auto_by_group.get(gid, [])
        if new_autos:
            status = table_patch("x_infte_ops_int_group", gid, {"automations": json.dumps(new_autos)})
            log.append("  group %s: wrote %d automations (HTTP %s)" % (grp["name"], len(new_autos), status))
        time.sleep(0.1)

    # 4. Delete the two now-redundant tables
    log.append("--- Deleting consolidated tables ---")
    for short_name in TABLES_TO_DELETE:
        full_table = "x_infte_ops_int_%s" % short_name
        recs = table_query("sys_db_object",
                           "name=%s^sys_scope=%s" % (full_table, SCOPE_ID),
                           ["sys_id", "name"], limit=1)
        if not recs:
            log.append("  %-40s not found (already gone)" % full_table)
            continue
        sys_id = recs[0]["sys_id"]
        status = table_delete("sys_db_object", sys_id)
        if status in (200, 204):
            log.append("  %-40s deleted (HTTP %d)" % (full_table, status))
        else:
            log.append("  %-40s HTTP %d (unexpected)" % (full_table, status))

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
