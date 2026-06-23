#!/usr/bin/env python3
"""
Phase 13 — Developer Role, Catalog Tables, and Reasoning Engine

Creates:
  - x_infte_ops_int.developer role
  - x_infte_ops_int_catalog_category table with fields
  - x_infte_ops_int_catalog_item table with fields
  - Deploys updated Script Includes: PermissionResolver, VirtualAgentHelper, ConversationAdvisor
  - Deploys updated portal widget (app.js + server-script.js)

Idempotent and safe to re-run.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "script_includes")
WIDGET_DIR = os.path.join(os.path.dirname(__file__), "..", "widgets", "portal")


def build():
    log = []

    # ── 1. Developer role ────────────────────────────────────────────────────
    r = ec.op("artifact.role", data={
        "name": "x_infte_ops_int.developer",
        "description": (
            "Operations Intelligence Developer: full administrative access plus "
            "Developer Workspace access to inspect all application artifacts, "
            "tables, script includes, business rules, and Virtual Agent topics."
        ),
        "grantable": True,
    })
    action = r.get("action", "skipped" if r.get("skipped") else "?")
    log.append("role x_infte_ops_int.developer -> %s (%s)" % ("ok" if r.get("ok") else "FAIL", action))

    # ── 2. Catalog Category table ────────────────────────────────────────────
    r = ec.op("schema.table.create", table="catalog_category", data={
        "label": "Catalog Category",
        "is_extendable": False,
    })
    log.append("table catalog_category -> %s" % ("ok" if r.get("ok") else ("skipped" if r.get("skipped") else "FAIL")))

    cat_fields = [
        ("name",        "string",        "Name",        {"max_length": 200, "mandatory": True}),
        ("description", "string",        "Description", {"max_length": 1000}),
        ("icon",        "string",        "Icon",        {"max_length": 100, "default_value": "fa-folder"}),
        ("color",       "string",        "Color",       {"max_length": 20,  "default_value": "#00BF6F"}),
        ("sort_order",  "integer",       "Sort Order",  {"default_value": "0"}),
        ("active",      "boolean",       "Active",      {"default_value": "true"}),
        ("created_by",  "reference",     "Created By",  {"reference": "sys_user"}),
    ]
    phys_cat = ec.table("catalog_category")
    for element, gtype, label, opts in cat_fields:
        data = {"element": element, "type": gtype, "label": label}
        if "max_length" in opts:  data["max_length"] = opts["max_length"]
        if "mandatory" in opts:   data["mandatory"]   = opts["mandatory"]
        if "default_value" in opts: data["default_value"] = opts["default_value"]
        if "reference" in opts:   data["reference"]   = opts["reference"]
        fr = ec.op("schema.add_field", table=phys_cat, data=data)
        status = "ok" if fr.get("ok") else ("skip" if fr.get("skipped") else "FAIL")
        log.append("  field %s.%s -> %s" % (phys_cat, element, status))

    # ── 3. Catalog Item table ────────────────────────────────────────────────
    r = ec.op("schema.table.create", table="catalog_item", data={
        "label": "Catalog Item",
        "is_extendable": False,
    })
    log.append("table catalog_item -> %s" % ("ok" if r.get("ok") else ("skipped" if r.get("skipped") else "FAIL")))

    item_fields = [
        ("name",         "string",    "Name",         {"max_length": 200, "mandatory": True}),
        ("description",  "string",    "Description",  {"max_length": 1000}),
        ("category",     "reference", "Category",     {"reference": phys_cat, "mandatory": True}),
        ("sort_order",   "integer",   "Sort Order",   {"default_value": "0"}),
        ("active",       "boolean",   "Active",       {"default_value": "true"}),
        ("action_type",  "string",    "Action Type",  {"max_length": 50}),
        ("action_value", "string",    "Action Value", {"max_length": 500}),
        ("created_by",   "reference", "Created By",   {"reference": "sys_user"}),
    ]
    phys_item = ec.table("catalog_item")
    for element, gtype, label, opts in item_fields:
        data = {"element": element, "type": gtype, "label": label}
        if "max_length" in opts:    data["max_length"]    = opts["max_length"]
        if "mandatory" in opts:     data["mandatory"]      = opts["mandatory"]
        if "default_value" in opts: data["default_value"]  = opts["default_value"]
        if "reference" in opts:     data["reference"]      = opts["reference"]
        fr = ec.op("schema.add_field", table=phys_item, data=data)
        status = "ok" if fr.get("ok") else ("skip" if fr.get("skipped") else "FAIL")
        log.append("  field %s.%s -> %s" % (phys_item, element, status))

    # ── 4. Deploy Script Includes ────────────────────────────────────────────
    si_files = [
        ("PermissionResolver",  "PermissionResolver.js",  False),
        ("VirtualAgentHelper",  "VirtualAgentHelper.js",  False),
        ("ConversationAdvisor", "ConversationAdvisor.js", False),
    ]
    for name, filename, client_callable in si_files:
        path = os.path.join(SRC_DIR, filename)
        if not os.path.exists(path):
            log.append("SI %-22s MISSING FILE" % name)
            continue
        with open(path) as f:
            script = f.read()
        r = ec.op("artifact.script_include", data={
            "name": name,
            "api_name": "x_infte_ops_int." + name,
            "script": script,
            "active": True,
            "access": "public",
            "client_callable": client_callable,
        })
        log.append("SI %-22s -> %s (%s)" % (name, "ok" if r.get("ok") else "FAIL", r.get("action", "")))

    time.sleep(1)

    # ── 5. Deploy portal widget ──────────────────────────────────────────────
    import phase9_deploy_widgets as p9
    log.append("--- Widget deployment via phase9_deploy_widgets ---")
    p9_result = p9.build()
    if isinstance(p9_result, list):
        for entry in p9_result:
            log.append("  " + str(entry))
    else:
        log.append("  Widget deployed (see phase9 output)")

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
