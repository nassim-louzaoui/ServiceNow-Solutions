#!/usr/bin/env python3
"""
Table Label Update Phase

Updates the display labels of all surviving tables on the instance
to match the professional labels defined in tables.py.
Uses the engine record.update operation via sys_db_object.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
from tables import TABLES

SCOPE_ID = "75be0bf9fbe9cb5052eef5c9beefdce8"

TABLE_LABELS = {
    "x_infte_ops_int_%s" % short: label
    for short, label, _ in TABLES
}


def build():
    log = []
    log.append("--- Updating table display labels ---")

    for phys_name, label in TABLE_LABELS.items():
        recs = ec.op("record.query", table="sys_db_object",
                     encoded_query="name=%s^sys_scope=%s" % (phys_name, SCOPE_ID),
                     fields=["sys_id", "name", "label"], limit=1)
        records = recs.get("records", [])
        if not records:
            log.append("  %-45s not found" % phys_name)
            continue
        rec = records[0]
        if rec.get("label") == label:
            log.append("  %-45s already correct" % phys_name)
            continue
        r = ec.op("record.update", table="sys_db_object",
                  sys_id=rec["sys_id"], data={"label": label})
        if r.get("ok"):
            log.append("  %-45s -> %s" % (phys_name, label))
        else:
            log.append("  %-45s FAIL: %s" % (phys_name, str(r)[:120]))
        time.sleep(0.5)

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
