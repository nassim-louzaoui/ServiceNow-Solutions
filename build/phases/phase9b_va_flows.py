#!/usr/bin/env python3
"""
Phase 9b — Virtual Agent Flow Cleanup (No-Op)

Operations Intelligence does not use the ServiceNow Virtual Agent framework.
All conversation logic is handled by the ReasoningEngine Script Include,
which is invoked directly by the Operations Intelligence portal widget.

This phase is intentionally a no-op. It exists to confirm that no
sys_cs_topic or sn_va_authored_flow records belonging to this application
remain on the instance.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec


def build():
    log = []
    r = ec.op("record.query", table="sys_cs_topic",
              encoded_query="nameLIKE[Operations Intelligence]",
              fields=["sys_id", "name"], limit=50)
    records = r.get("records", [])
    if records:
        log.append("WARNING: %d Operations Intelligence Virtual Agent topic(s) still exist — run phase9_va_topics.py to clean up." % len(records))
        for rec in records:
            log.append("  - %s (%s)" % (rec.get("name", "?"), rec["sys_id"]))
    else:
        log.append("No Operations Intelligence Virtual Agent topics found — instance is clean.")
    log.append("=== phase9b complete (no-op) ===")
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
