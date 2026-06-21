#!/usr/bin/env python3
"""
Phase 2 — Roles

Creates the four application roles. Role naming is scope-qualified
(x_infte_ops_int.<role>) so enforcement is unambiguous and isolated to
the application. The approved_flow table is intentionally left unseeded —
it is curated by admin against real Flow Designer flows on the target instance.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

ROLES = [
    ("x_infte_ops_int.admin", "Operations Intelligence application administrator: full access to all records, tables, and configuration."),
    ("x_infte_ops_int.leadership", "Operations Intelligence role for business leaders: group governance, user onboarding, and approvals."),
    ("x_infte_ops_int.creator", "Operations Intelligence role for appointed power users: design and manage automations and deliverables within assigned groups."),
    ("x_infte_ops_int.user", "Operations Intelligence role for all staff: execute automations and request deliverables via the Operations Assistant."),
]


def build():
    log = []

    for name, desc in ROLES:
        r = ec.op("artifact.role", data={"name": name, "description": desc, "grantable": True})
        action = r.get("action", "skipped" if r.get("skipped") else "?")
        log.append("role %-32s -> %s (%s)" % (name, "ok" if r.get("ok") else "FAIL", action))

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
