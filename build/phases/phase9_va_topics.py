#!/usr/bin/env python3
"""
Phase 9 — Virtual Agent Topic Cleanup

Operations Intelligence does not use the ServiceNow Virtual Agent framework
(sys_cs_topic). This phase removes any Operations Intelligence topic records
that may have been created in a previous deployment, preventing them from
appearing in platform-level portals such as Now Support.

The application's assistant experience is delivered entirely through the
ReasoningEngine Script Include and the Operations Intelligence portal widget,
both scoped to x_infte_ops_int.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

OI_TOPIC_PREFIX = "[Operations Intelligence]"


def build():
    log = []
    r = ec.op("record.query", table="sys_cs_topic",
              encoded_query="nameLIKE" + OI_TOPIC_PREFIX,
              fields=["sys_id", "name"], limit=100)
    records = r.get("records", [])
    if not records:
        log.append("No Operations Intelligence Virtual Agent topics found — nothing to clean up.")
        return log

    deleted = failed = 0
    for rec in records:
        d = ec.op("record.delete", table="sys_cs_topic", platform=True,
                  data={"sys_id": rec["sys_id"]})
        if d.get("deleted", 0) >= 1 or d.get("ok"):
            deleted += 1
            log.append("Deleted topic: %s" % rec.get("name", rec["sys_id"]))
        else:
            failed += 1
            log.append("FAIL deleting %s: %s" % (rec.get("name", rec["sys_id"]), str(d)[:120]))

    log.append("=== topics cleaned: %d deleted, %d failed (of %d found) ===" % (
        deleted, failed, len(records)))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
