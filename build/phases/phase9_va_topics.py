#!/usr/bin/env python3
"""
Phase 9c — Virtual Agent: NLU model wiring and the 23 system topic headers.

Creates the 23 Operations Assistant system topics as topic records linked to the
dedicated "Operations Intelligence NLU" model. Topic headers form the system
topic registry; per-automation topics are created dynamically by
CatalogService.onPublish. Conversational step authoring is completed in the
Conversation Designer on the instance.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

NLU = "75d8e16a3bed8f506d91a21864e45a7f"

TOPICS = [
    "Welcome", "Complete Onboarding", "Creator Assist Setup", "Onboard Leadership",
    "Onboard Sub-Leadership", "Onboard User", "Appoint Creator", "Create Group",
    "Create Automation", "Review Approvals", "Deactivation Action", "Re-invite User",
    "Check Status", "Help and Fallback", "Approval Review",
    "Create Report or Dashboard", "Create Notification Rule",
    "Create Scheduled Data Report", "Create Flow", "Request Custom Table",
    "Request UI Page", "Manage My Artifacts", "Check Artifact Status",
]


def build():
    log = []
    created = existed = failed = 0
    for t in TOPICS:
        name = "[Operations Intelligence] " + t
        chk = ec.op("record.query", table="sys_cs_topic",
                    encoded_query="name=%s" % name, fields=["sys_id"], limit=1)
        if chk.get("records"):
            existed += 1
            continue
        r = ec.op("record.insert", table="sys_cs_topic", platform=True, scope=True,
                  data={"name": name, "label": name, "nlu_model": NLU, "live": "false"})
        if r.get("ok"):
            created += 1
        else:
            failed += 1
            log.append("FAIL %s: %s" % (name, str(r.get("body", r))[:120]))
        time.sleep(0.3)
    log.append("=== topics: %d created, %d existed, %d failed (of %d) ===" % (
        created, existed, failed, len(TOPICS)))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
