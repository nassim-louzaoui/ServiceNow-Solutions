#!/usr/bin/env python3
"""
Phase 9d — Deploy Widgets

Deploys every widget folder under build/widgets/ as an sp_widget in the
application scope. Each folder contains template.html, server-script.js,
client-script.js, style.css. The sp_widget id is scope-qualified for isolation;
the name is proper title case. Idempotent (upsert by id).
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

WIDGETS_DIR = os.path.join(os.path.dirname(__file__), "..", "widgets")

NAMES = {
    "nav-bar": "Navigation Bar",
    "content-area": "Content Area",
    "assistant-panel": "Operations Assistant Panel",
    "onboarding-progress": "Onboarding Progress",
    "workspace-automation": "Workspace Automation Panel",
    "deliverable-tiles": "Deliverable Type Tiles",
    "deliverable-cards": "Deliverable Cards",
    "modal-viewer": "Artifact Modal Viewer",
    "execution-history": "Execution History",
    "creator-studio": "Creator Studio Panel",
    "pending-approvals": "Pending Approvals",
    "group-manager": "Group Manager",
    "flow-oversight": "Flow Oversight",
    "artifact-history": "Artifact History",
    "group-metrics": "Group Metrics",
    "admin-overview": "Admin Overview",
    "audit-log": "Audit Log Viewer",
    "system-config": "System Configuration Panel",
    "maintenance-control-panel": "Maintenance Control Panel",
    "maintenance-overlay": "Maintenance Overlay",
}

# sp_widget.id is limited to 40 characters; any computed id that would exceed
# that limit must be declared here with its actual truncated value.
ID_OVERRIDES = {
    "maintenance-control-panel": "x_infte_ops_int_maintenance_control_pane",
}


def read(folder, fname):
    path = os.path.join(WIDGETS_DIR, folder, fname)
    if os.path.exists(path):
        with open(path) as f:
            return f.read().replace("{scope}", "x_infte_ops_int")
    return ""


def build():
    log = []
    ok = fail = 0
    folders = sorted(d for d in os.listdir(WIDGETS_DIR)
                     if os.path.isdir(os.path.join(WIDGETS_DIR, d)))
    for folder in folders:
        wid = ID_OVERRIDES.get(folder, "x_infte_ops_int_" + folder.replace("-", "_"))
        name = NAMES.get(folder, folder.replace("-", " ").title())
        data = {
            "id": wid,
            "name": name,
            "template": read(folder, "template.html"),
            "server_script": read(folder, "server-script.js"),
            "client_script": read(folder, "client-script.js"),
            "css": read(folder, "style.css"),
            "active": True,
        }
        r = ec.op("artifact.widget", data=data)
        if r.get("ok"):
            ok += 1
            log.append("%-28s -> %s (%s)" % (name, wid, r.get("action", "ok")))
        else:
            fail += 1
            log.append("%-28s FAIL: %s" % (name, str(r)[:160]))
        time.sleep(0.5)
    log.append("=== widgets deployed: %d ok, %d failed (of %d) ===" % (ok, fail, len(folders)))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
