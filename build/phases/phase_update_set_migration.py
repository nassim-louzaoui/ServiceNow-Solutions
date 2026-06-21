#!/usr/bin/env python3
"""
Update Set Migration — Consolidate OI Records

Moves all sys_update_xml records that belong to the x_infte_ops_int application
scope but are NOT yet in the 'Operations Intelligence' update set into that set.

This ensures the canonical update set is the single source of all customisations
for the application so it can be exported or promoted as a single unit.

Safe to re-run: records already in the target update set are skipped.
"""
import os
import sys
import json
import urllib.request
import urllib.parse
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

TARGET_UPDATE_SET = "8f656a623b2d87901ed748d964e45ad4"
SCOPE_NAME = "x_infte_ops_int"
BATCH_SIZE = 100


def table_query(table, encoded_query, fields, limit=None):
    params = {
        "sysparm_query": encoded_query,
        "sysparm_fields": ",".join(fields),
        "sysparm_display_value": "false",
    }
    if limit:
        params["sysparm_limit"] = str(limit)
    url = "%s/api/now/table/%s?%s" % (ec.INSTANCE, table, urllib.parse.urlencode(params))
    req = urllib.request.Request(url)
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read()).get("result", [])


def table_patch(table, sys_id, payload):
    url = "%s/api/now/table/%s/%s" % (ec.INSTANCE, table, sys_id)
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PATCH")
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def build():
    log = []

    # Resolve the scope sys_id for x_infte_ops_int
    scope_recs = table_query("sys_scope", "scope=" + SCOPE_NAME, ["sys_id", "name"], limit=1)
    if not scope_recs:
        log.append("ERROR: scope %s not found" % SCOPE_NAME)
        return log
    scope_sys_id = scope_recs[0]["sys_id"]
    log.append("Scope sys_id: %s" % scope_sys_id)

    # Verify the target update set exists
    uset_recs = table_query("sys_update_set", "sys_id=" + TARGET_UPDATE_SET, ["sys_id", "name", "state"], limit=1)
    if not uset_recs:
        log.append("ERROR: target update set %s not found" % TARGET_UPDATE_SET)
        return log
    log.append("Target update set: %s (%s)" % (uset_recs[0]["name"], uset_recs[0]["state"]))

    # Find sys_update_xml records in our scope not already in target update set
    query = "sys_scope=%s^update_set!=%s" % (scope_sys_id, TARGET_UPDATE_SET)
    log.append("Querying sys_update_xml: %s" % query)

    offset = 0
    moved = skipped = errors = 0

    while True:
        params = {
            "sysparm_query": query,
            "sysparm_fields": "sys_id,name,update_set",
            "sysparm_limit": str(BATCH_SIZE),
            "sysparm_offset": str(offset),
            "sysparm_display_value": "false",
        }
        url = "%s/api/now/table/sys_update_xml?%s" % (ec.INSTANCE, urllib.parse.urlencode(params))
        req = urllib.request.Request(url)
        req.add_header("Authorization", ec._AUTH)
        req.add_header("Accept", "application/json")
        with urllib.request.urlopen(req, timeout=60) as r:
            records = json.loads(r.read()).get("result", [])

        if not records:
            break

        for rec in records:
            sys_id = rec["sys_id"]
            status = table_patch("sys_update_xml", sys_id, {"update_set": TARGET_UPDATE_SET})
            if status in (200, 204):
                moved += 1
            else:
                errors += 1
                log.append("  WARN: %s HTTP %d" % (rec.get("name", sys_id), status))
            time.sleep(0.05)

        offset += BATCH_SIZE
        log.append("  processed batch offset=%d (moved=%d errors=%d so far)" % (offset, moved, errors))

        if len(records) < BATCH_SIZE:
            break

    log.append("=== Update set migration complete: moved=%d, skipped=%d, errors=%d ===" % (moved, skipped, errors))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
