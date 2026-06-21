#!/usr/bin/env python3
"""
Phase 1 field repair — fills any fields missing after the initial run.

Queries the live dictionary per table, computes the set difference against the
model, and adds only the missing fields one at a time (the live instance
rate-limits rapid batch writes to sys_dictionary). Idempotent and safe to re-run.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec
from tables import TABLES
from phase1_tables import resolve_type


def existing_fields(phys):
    r = ec.op("schema.fields", table=phys)
    return set(f["element"] for f in r.get("fields", []))


def build():
    log = []
    total_added = total_ok = 0
    for short, _label, fields in TABLES:
        phys = ec.table(short)
        have = existing_fields(phys)
        missing = [(e, s, l, o) for (e, s, l, o) in fields if e not in have]
        if not missing:
            log.append("%-24s complete (%d fields)" % (short, len(fields)))
            continue
        added = 0
        for element, spec, label, opts in missing:
            gtype, extra = resolve_type(spec, opts)
            data = {"element": element, "type": gtype, "label": label}
            data.update(extra)
            if opts.get("mandatory"):
                data["mandatory"] = True
            if opts.get("read_only"):
                data["read_only"] = True
            if "default" in opts:
                data["default_value"] = opts["default"]
            r = ec.op("schema.add_field", table=phys, data=data)
            if r.get("ok"):
                added += 1
            else:
                log.append("  FAIL %s.%s: %s" % (short, element, str(r)[:160]))
            time.sleep(0.4)
        total_added += added
        log.append("%-24s +%d fields (was missing %d)" % (short, added, len(missing)))

    # Final verification pass
    log.append("--- verification ---")
    all_ok = True
    for short, _label, fields in TABLES:
        phys = ec.table(short)
        have = existing_fields(phys)
        want = set(e for (e, _s, _l, _o) in fields)
        miss = want - have
        if miss:
            all_ok = False
            log.append("%-24s MISSING %s" % (short, sorted(miss)))
        else:
            total_ok += 1
    log.append("Tables fully built: %d / %d" % (total_ok, len(TABLES)))
    log.append("RESULT: " + ("ALL FIELDS PRESENT" if all_ok else "GAPS REMAIN"))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
