#!/usr/bin/env python3
"""
Reliable table/field verifier — uses an encoded-query read of sys_dictionary
(which is not affected by the engine's schema.fields ISNOTEMPTY bug) to confirm
every modelled field exists, in-scope, on every table.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec
from tables import TABLES

APP = "75be0bf9fbe9cb5052eef5c9beefdce8"


def live_fields(phys):
    r = ec.op("record.query", table="sys_dictionary",
              encoded_query="name=%s^elementISNOTEMPTY" % phys,
              fields=["element"], limit=300)
    return set(x.get("element") for x in r.get("records", []))


def build():
    log = []
    ok_tables = 0
    for short, _label, fields in TABLES:
        phys = ec.table(short)
        # table existence + scope
        t = ec.op("record.query", table="sys_db_object",
                  encoded_query="name=%s" % phys, fields=["sys_scope"], limit=1)
        trecs = t.get("records", [])
        if not trecs:
            log.append("%-24s TABLE MISSING" % short)
            continue
        in_scope = trecs[0].get("sys_scope") == APP
        have = live_fields(phys)
        want = set(e for (e, _s, _l, _o) in fields)
        miss = want - have
        flag = "OK" if (not miss and in_scope) else "PROBLEM"
        if flag == "OK":
            ok_tables += 1
        line = "%-24s %s  fields %d/%d  scope=%s" % (
            short, flag, len(want & have), len(want),
            "app" if in_scope else trecs[0].get("sys_scope"))
        if miss:
            line += "  MISSING " + str(sorted(miss))
        log.append(line)
    log.append("=== %d / %d tables fully correct ===" % (ok_tables, len(TABLES)))
    return log, ok_tables == len(TABLES)


if __name__ == "__main__":
    lines, allok = build()
    for l in lines:
        print(l)
    sys.exit(0 if allok else 1)
