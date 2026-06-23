#!/usr/bin/env python3
"""
Phase 13 — Developer Role and Reasoning Engine

Creates:
  - x_infte_ops_int.developer role
  - Deploys updated Script Includes: OIDataStore, OIJournal, PermissionResolver,
    VirtualAgentHelper, ConversationAdvisor
  - Deploys updated portal widget (app.js + server-script.js)

Catalog data is stored in sys_properties via OIDataStore — no custom tables required.
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
            "Developer Hub access to inspect all application artifacts, "
            "script includes, business rules, and execution journal."
        ),
        "grantable": True,
    })
    action = r.get("action", "skipped" if r.get("skipped") else "?")
    log.append("role x_infte_ops_int.developer -> %s (%s)" % ("ok" if r.get("ok") else "FAIL", action))

    # ── 2. Deploy Script Includes ────────────────────────────────────────────
    si_files = [
        ("OIDataStore",        "OIDataStore.js",        False),
        ("OIJournal",          "OIJournal.js",          False),
        ("PermissionResolver", "PermissionResolver.js", False),
        ("VirtualAgentHelper", "VirtualAgentHelper.js", False),
        ("ConversationAdvisor","ConversationAdvisor.js", False),
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

    # ── 3. Deploy portal widget ──────────────────────────────────────────────
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
