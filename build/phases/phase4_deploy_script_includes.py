#!/usr/bin/env python3
"""
Phase 4 — Deploy Script Includes

Deploys every Script Include in dependency order via the engine's
artifact.script_include op (find-then-upsert, scope-set automatically). Any
'{scope}' placeholder tokens in a source file are replaced with the real scope
prefix before deployment.

Run after the authoring agents have produced the .js files in
build/script_includes/. Idempotent and safe to re-run.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

SRC_DIR = os.path.join(os.path.dirname(__file__), "..", "script_includes")

# Architecture dependency order (build sequence step 4).
ORDER = [
    "OIDataStore", "OIJournal",
    "PermissionResolver", "ReasoningEngine", "VirtualAgentHelper",
    "NotificationService", "RoleSyncService", "GroupManager",
    "CatalogService", "ScheduleManager", "ExecutionEngine", "ApprovalRouter",
    "OnboardingService", "DeactivationHandler", "FlowBridge", "RestBridge",
    "CreatorAssistBridge", "AuditService", "MaintenanceManager", "ArtifactManager",
    "ReportBuilder", "NotificationBuilder", "FlowBuilder", "TableBuilder",
    "UserInterfacePageBuilder",
]

# Script Includes that must be client-callable (extend AbstractAjaxProcessor).
CLIENT_CALLABLE = set(["MaintenanceManager"])


def build():
    log = []
    deployed = failed = missing = 0
    for name in ORDER:
        path = os.path.join(SRC_DIR, name + ".js")
        if not os.path.exists(path):
            missing += 1
            log.append("%-22s MISSING FILE" % name)
            continue
        with open(path) as f:
            script = f.read().replace("{scope}", "x_infte_ops_int")
        data = {
            "name": name,
            "api_name": "x_infte_ops_int." + name,
            "script": script,
            "active": True,
            "access": "public",
            "client_callable": name in CLIENT_CALLABLE,
        }
        r = ec.op("artifact.script_include", data=data)
        if r.get("ok"):
            deployed += 1
            log.append("%-22s %s (%d bytes)" % (name, r.get("action", "ok"), len(script)))
        else:
            failed += 1
            log.append("%-22s FAIL: %s" % (name, str(r)[:200]))
        time.sleep(0.5)
    log.append("=== deployed %d, failed %d, missing %d of %d ===" % (
        deployed, failed, missing, len(ORDER)))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
