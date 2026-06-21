#!/usr/bin/env python3
"""
Table Deletion Phase — removes eliminated tables from the instance.

All field additions were completed in phase_schema_migration.py.
This script only handles the table deletions.
"""
import os
import sys
import json
import time
import urllib.request
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

SCOPE_ID = "75be0bf9fbe9cb5052eef5c9beefdce8"

TABLES_TO_DELETE = [
    "automation_category",
    "automation_step",
    "automation_input",
    "automation_schedule",
    "creator_credential",
    "execution_step_log",
    "group_member",
    "group_automation",
]


def _backoff(attempt, base=15):
    wait = base * (2 ** attempt)
    print("  [rate-limit] waiting %ds before retry..." % wait, flush=True)
    time.sleep(wait)


def table_get(table, encoded_query, fields, limit=1):
    params = urllib.parse.urlencode({
        "sysparm_query": encoded_query,
        "sysparm_fields": ",".join(fields),
        "sysparm_limit": str(limit),
    })
    url = "%s/api/now/table/%s?%s" % (ec.INSTANCE, table, params)
    for attempt in range(6):
        req = urllib.request.Request(url)
        req.add_header("Authorization", ec._AUTH)
        req.add_header("Accept", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read()).get("result", [])
        except urllib.error.HTTPError as e:
            if e.code == 429:
                _backoff(attempt, base=30)
                continue
            raise
        except Exception as e:
            _backoff(attempt, base=10)
    return []


def table_delete(table, sys_id):
    url = "%s/api/now/table/%s/%s" % (ec.INSTANCE, table, sys_id)
    for attempt in range(6):
        req = urllib.request.Request(url, method="DELETE")
        req.add_header("Authorization", ec._AUTH)
        req.add_header("Accept", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.status
        except urllib.error.HTTPError as e:
            if e.code == 429:
                _backoff(attempt, base=30)
                continue
            return e.code
        except Exception as e:
            _backoff(attempt, base=15)
    return 0


def build():
    log = []
    log.append("--- Deleting eliminated tables ---")
    for short_name in TABLES_TO_DELETE:
        full_table = "x_infte_ops_int_%s" % short_name
        time.sleep(5)
        print("  Looking up %s..." % full_table, flush=True)
        recs = table_get("sys_db_object",
                         "name=%s^sys_scope=%s" % (full_table, SCOPE_ID),
                         ["sys_id", "name"], limit=1)
        if not recs:
            log.append("  %-40s not found (already gone)" % full_table)
            print(log[-1], flush=True)
            continue
        sys_id = recs[0]["sys_id"]
        time.sleep(5)
        print("  Deleting %s (%s)..." % (full_table, sys_id), flush=True)
        status = table_delete("sys_db_object", sys_id)
        if status in (200, 204):
            log.append("  %-40s deleted (HTTP %d)" % (full_table, status))
        else:
            log.append("  %-40s HTTP %d (unexpected)" % (full_table, status))
        print(log[-1], flush=True)
    return log


if __name__ == "__main__":
    print("Waiting 60s for rate-limit window to clear...", flush=True)
    time.sleep(60)
    for line in build():
        print(line)
