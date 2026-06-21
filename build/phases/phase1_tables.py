#!/usr/bin/env python3
"""
Phase 1 — Core Tables

Creates all 19 Operations Intelligence tables, then adds every field, then every
choice value. Tables are created first as a block so that forward references and
self references (person -> person, automation -> automation, group -> group,
pending_action -> managed_artifact) all resolve when fields are added.

Idempotent: schema.table.create skips existing tables, schema.add_field skips
existing fields, schema.add_choice skips existing choices.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec
from tables import TABLES, CHOICES, AUTONUMBER

INSCOPE = set(short for short, _label, _fields in TABLES)


def resolve_type(spec, opts):
    """Return (glide_type, extra_field_attrs) for a field shorthand."""
    attrs = {}
    if spec.startswith("ref:"):
        target = spec[4:]
        ref_table = ec.table(target) if target in INSCOPE else target
        return "reference", {"reference": ref_table}
    if spec.startswith("str:"):
        return "string", {"max_length": int(spec[4:])}
    if spec == "txt":
        return "string", {"max_length": 4000}
    if spec == "json":
        return "string", {"max_length": 16000}
    if spec == "dt":
        return "glide_date_time", {}
    if spec == "bool":
        return "boolean", {}
    if spec == "int":
        return "integer", {}
    if spec == "pw2":
        return "password2", {}
    if spec == "choice":
        ml = opts.get("max_length", 40)
        return "string", {"max_length": ml, "choice": "1"}
    raise ValueError("Unknown field spec: " + spec)


def build():
    log = []

    # --- 1a. Create tables ---
    create_ops = []
    for short, label, _fields in TABLES:
        create_ops.append({
            "op": "schema.table.create",
            "table": short,
            "data": {"label": label, "is_extendable": False},
        })
    res = ec.batch(create_ops, stop_on_error=False)
    created = skipped = 0
    for r in res["results"]:
        rr = r["result"]
        if not rr.get("ok"):
            log.append("TABLE FAIL %s: %s" % (r.get("op"), rr))
        elif rr.get("skipped"):
            skipped += 1
        else:
            created += 1
    log.append("Tables: %d created, %d already existed" % (created, skipped))

    # --- 1b. Add fields (batched per table) ---
    f_added = f_skipped = f_failed = 0
    for short, _label, fields in TABLES:
        phys = ec.table(short)
        field_ops = []
        for element, spec, label, opts in fields:
            gtype, extra = resolve_type(spec, opts)
            data = {"element": element, "type": gtype, "label": label}
            data.update(extra)
            if opts.get("mandatory"):
                data["mandatory"] = True
            if opts.get("read_only"):
                data["read_only"] = True
            if "default" in opts:
                data["default_value"] = opts["default"]
            field_ops.append({"op": "schema.add_field", "table": phys, "data": data})
        fr = ec.batch(field_ops, stop_on_error=False)
        for r in fr["results"]:
            rr = r["result"]
            if not rr.get("ok"):
                f_failed += 1
                log.append("FIELD FAIL %s.%s: %s" % (short, r.get("op"), rr))
            elif rr.get("skipped"):
                f_skipped += 1
            else:
                f_added += 1
    log.append("Fields: %d added, %d existed, %d failed" % (f_added, f_skipped, f_failed))

    # --- 1c. Add choices ---
    c_added = c_skipped = c_failed = 0
    for (short, field), pairs in CHOICES.items():
        phys = ec.table(short)
        choice_ops = []
        for value, clabel, seq in pairs:
            choice_ops.append({
                "op": "schema.add_choice",
                "table": phys,
                "data": {"element": field, "value": value, "label": clabel, "sequence": seq},
            })
        crr = ec.batch(choice_ops, stop_on_error=False)
        for r in crr["results"]:
            rr = r["result"]
            if not rr.get("ok"):
                c_failed += 1
                log.append("CHOICE FAIL %s.%s: %s" % (short, field, rr))
            elif rr.get("skipped"):
                c_skipped += 1
            else:
                c_added += 1
    log.append("Choices: %d added, %d existed, %d failed" % (c_added, c_skipped, c_failed))

    # --- 1d. Autonumbering ---
    n_set = n_skip = 0
    for short, prefix in AUTONUMBER.items():
        phys = ec.table(short)
        ar = ec.op("schema.set_autonumber", table=phys, data={"prefix": prefix, "start": 1001})
        if ar.get("skipped"):
            n_skip += 1
        elif ar.get("ok"):
            n_set += 1
        else:
            log.append("AUTONUMBER FAIL %s: %s" % (short, ar))
    log.append("Autonumber: %d set, %d existed" % (n_set, n_skip))

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
