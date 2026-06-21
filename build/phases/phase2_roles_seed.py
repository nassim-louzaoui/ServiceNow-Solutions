#!/usr/bin/env python3
"""
Phase 2 — Roles and Seed Data

Creates the three application roles (admin is the platform role and already
exists) and seeds the admin-managed automation_category taxonomy. approved_flow
is intentionally left empty — it is curated by admin against real Flow Designer
flows that exist on the target instance, so seeding placeholder sys_ids would be
incorrect.

Role naming: scope-qualified (x_infte_ops_int.<role>) so enforcement is
unambiguous and isolated to the application.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

ROLES = [
    ("x_infte_ops_int.leadership", "Operations Intelligence role for business leaders: group governance, user onboarding, and approvals."),
    ("x_infte_ops_int.creator", "Operations Intelligence role for appointed power users: design and manage automations and deliverables within assigned groups."),
    ("x_infte_ops_int.user", "Operations Intelligence role for all staff: execute automations and request deliverables via the Operations Assistant."),
]

CATEGORIES = [
    ("Incident Management", "Automations that create, update, or resolve incidents.", "#C62828", "incident"),
    ("Service Request", "Automations that fulfil service catalog and request tasks.", "#1565C0", "catalog"),
    ("Change Management", "Automations supporting change planning and execution.", "#6A1B9A", "change"),
    ("Onboarding and Access", "Automations for user onboarding and access provisioning.", "#2E7D32", "user"),
    ("Reporting and Analytics", "Automations that generate reports and analytical outputs.", "#EF6C00", "report"),
    ("Notifications and Alerts", "Automations that send notifications and alerts.", "#00838F", "mail"),
]


def build():
    log = []

    # --- Roles ---
    for name, desc in ROLES:
        r = ec.op("artifact.role", data={"name": name, "description": desc, "grantable": True})
        action = r.get("action", "skipped" if r.get("skipped") else "?")
        log.append("role %-32s -> %s (%s)" % (name, "ok" if r.get("ok") else "FAIL", action))

    # --- Seed automation_category ---
    cat_table = ec.table("automation_category")
    added = existed = 0
    for name, desc, color, icon in CATEGORIES:
        exists = ec.op("record.exists", table=cat_table, query={"name": name})
        if exists.get("exists"):
            existed += 1
            continue
        r = ec.op("record.insert", table=cat_table, platform=True, scope=True,
                  data={"name": name, "description": desc, "color": color,
                        "icon": icon, "active": "true"})
        if r.get("ok"):
            added += 1
        else:
            log.append("  category FAIL %s: %s" % (name, str(r)[:160]))
    log.append("categories: %d added, %d existed" % (added, existed))

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
