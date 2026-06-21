#!/usr/bin/env python3
"""
Portal Page Rebuild — Single-Widget Architecture

Replaces the existing oi_main page layout (which had multiple separate widget
instances that broke cross-widget communication) with a single full-width
widget instance pointing to x_infte_ops_int_portal.

The onboarding page is left as-is (it is a simple redirect / landing page
for users who are not yet provisioned).

Steps:
  1. Look up the oi_main page sys_id.
  2. Delete all existing sp_container records on that page.
  3. Create a single container → row → column (col_md=12) → widget instance
     pointing to x_infte_ops_int_portal.
"""
import os
import sys
import json
import urllib.request
import urllib.parse
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

PORTAL_WIDGET_ID = "x_infte_ops_int_portal"
OI_MAIN_PAGE_SYS_ID = "ed4829262b610b90efe3f355fe91bf6a"


def table_query(table, query, fields, limit=100):
    params = urllib.parse.urlencode({
        "sysparm_query":        query,
        "sysparm_fields":       ",".join(fields),
        "sysparm_limit":        str(limit),
        "sysparm_display_value":"false",
    })
    url = "%s/api/now/table/%s?%s" % (ec.INSTANCE, table, params)
    req = urllib.request.Request(url)
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read()).get("result", [])


def table_post(table, payload):
    url = "%s/api/now/table/%s" % (ec.INSTANCE, table)
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read()).get("result", {})
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return {"error": "HTTP %d: %s" % (e.code, body[:200])}


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


def build():
    log = []

    # 1. Look up the portal widget sys_id
    widget_recs = table_query("sp_widget", "id=" + PORTAL_WIDGET_ID, ["sys_id", "id"])
    if not widget_recs:
        log.append("ERROR: widget %s not found — deploy it first (phase9_deploy_widgets.py)" % PORTAL_WIDGET_ID)
        return log
    widget_sys_id = widget_recs[0]["sys_id"]
    log.append("Portal widget sys_id: %s" % widget_sys_id)

    # 2. Delete all existing containers on oi_main
    containers = table_query("sp_container", "sp_page=" + OI_MAIN_PAGE_SYS_ID, ["sys_id", "title"])
    for c in containers:
        status = table_delete("sp_container", c["sys_id"])
        log.append("  Deleted container %s (HTTP %d)" % (c.get("title", c["sys_id"]), status))
        time.sleep(0.3)

    # 3. Create container
    container_data = {
        "sp_page":   OI_MAIN_PAGE_SYS_ID,
        "title":     "Portal Container",
        "bootstrap_alt": False,
        "order":     100,
    }
    container = table_post("sp_container", container_data)
    if "error" in container:
        log.append("ERROR creating container: %s" % container["error"])
        return log
    container_sys_id = container.get("sys_id", "")
    log.append("Created container: %s" % container_sys_id)
    time.sleep(0.5)

    # 4. Create row
    row_data = {
        "sp_container": container_sys_id,
        "order":        100,
    }
    row = table_post("sp_row", row_data)
    if "error" in row:
        log.append("ERROR creating row: %s" % row["error"])
        return log
    row_sys_id = row.get("sys_id", "")
    log.append("Created row: %s" % row_sys_id)
    time.sleep(0.5)

    # 5. Create column (full width)
    col_data = {
        "sp_row":   row_sys_id,
        "col_md":   "12",
        "col_sm":   "12",
        "col_xs":   "12",
        "order":    100,
    }
    col = table_post("sp_column", col_data)
    if "error" in col:
        log.append("ERROR creating column: %s" % col["error"])
        return log
    col_sys_id = col.get("sys_id", "")
    log.append("Created column: %s" % col_sys_id)
    time.sleep(0.5)

    # 6. Create widget instance (field is sp_widget, NOT widget)
    instance_data = {
        "sp_column": col_sys_id,
        "sp_widget": widget_sys_id,
        "order":     100,
    }
    instance = table_post("sp_instance", instance_data)
    if "error" in instance:
        log.append("ERROR creating widget instance: %s" % instance["error"])
        return log
    instance_sys_id = instance.get("sys_id", "")
    log.append("Created widget instance: %s" % instance_sys_id)

    log.append("=== Portal page rebuilt with single portal widget ===")
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
