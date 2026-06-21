#!/usr/bin/env python3
"""
Schema Migration Phase — Table Consolidation

Adds the new fields required by the 13-table model to the three surviving tables
(automation, person, execution), then deletes the six eliminated tables.

Tables eliminated:
  automation_category, automation_step, automation_input,
  automation_schedule, creator_credential, execution_step_log

All field additions are idempotent (schema.add_field checks existence).
Table deletions use the Table REST API DELETE on sys_db_object.
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

NEW_FIELDS = {
    "automation": [
        ("category_name",        "string",    "Category Name",                 {"max_length": "200"}),
        ("category_color",       "string",    "Category Color",                {"max_length": "20"}),
        ("category_icon",        "string",    "Category Icon",                 {"max_length": "80"}),
        ("step_definitions",     "string",    "Step Definitions",              {"max_length": "16000"}),
        ("input_definitions",    "string",    "Input Definitions",             {"max_length": "16000"}),
        ("schedule_type",        "string",    "Schedule Type",                 {"max_length": "40"}),
        ("cron_expression",      "string",    "Cron Expression",               {"max_length": "100"}),
        ("run_at",               "glide_date_time","Run At",                   {}),
        ("timezone",             "string",    "Timezone",                      {"max_length": "80"}),
        ("sysauto_sys_id",       "string",    "Scheduled Job Sys ID",          {"max_length": "40"}),
        ("schedule_active",      "boolean",   "Schedule Active",               {"default_value": "false"}),
    ],
    "person": [
        ("github_pat",               "password2",      "GitHub Personal Access Token",  {}),
        ("token_status",             "string",         "Token Status",                  {"max_length": "40"}),
        ("github_connected_at",      "glide_date_time","GitHub Connected At",           {}),
        ("github_last_validated",    "glide_date_time","GitHub Last Validated At",      {}),
        ("github_validation_result", "string",         "GitHub Validation Result",      {"max_length": "40"}),
    ],
    "execution": [
        ("step_log", "string", "Step Log", {"max_length": "16000"}),
    ],
}

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


def _backoff(attempt, base=10):
    time.sleep(base * (2 ** attempt))


def table_delete(table, sys_id):
    url = "%s/api/now/table/%s/%s" % (ec.INSTANCE, table, sys_id)
    for attempt in range(5):
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
        except Exception:
            _backoff(attempt, base=10)
    return 0


def table_get(table, encoded_query, fields, limit=1):
    params = urllib.parse.urlencode({
        "sysparm_query": encoded_query,
        "sysparm_fields": ",".join(fields),
        "sysparm_limit": str(limit),
    })
    url = "%s/api/now/table/%s?%s" % (ec.INSTANCE, table, params)
    for attempt in range(5):
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
        except Exception:
            _backoff(attempt, base=10)
    return []


def build():
    log = []

    # ── 1. Add new fields to surviving tables ─────────────────────────────────
    log.append("--- Adding new fields ---")
    for short_name, fields in NEW_FIELDS.items():
        full_table = "x_infte_ops_int_%s" % short_name
        for element, col_type, label, opts in fields:
            r = ec.op("schema.add_field", table=full_table, data={
                "element":    element,
                "type":       col_type,
                "label":      label,
                "scope_id":   SCOPE_ID,
                "max_length": opts.get("max_length", ""),
                "default_value": opts.get("default_value", ""),
            })
            status = "ok" if r.get("ok") else ("exists" if r.get("exists") else "FAIL")
            log.append("  %-20s.%-28s %s" % (short_name, element, status))

    # ── 2. Delete the 8 eliminated tables ─────────────────────────────────────
    log.append("--- Deleting eliminated tables ---")
    for short_name in TABLES_TO_DELETE:
        full_table = "x_infte_ops_int_%s" % short_name
        time.sleep(3)
        recs = table_get("sys_db_object",
                         "name=%s^sys_scope=%s" % (full_table, SCOPE_ID),
                         ["sys_id", "name"], limit=1)
        if not recs:
            log.append("  %-40s not found (already gone)" % full_table)
            continue
        sys_id = recs[0]["sys_id"]
        time.sleep(3)
        status = table_delete("sys_db_object", sys_id)
        if status in (200, 204):
            log.append("  %-40s deleted (HTTP %d)" % (full_table, status))
        else:
            log.append("  %-40s HTTP %d (unexpected)" % (full_table, status))

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
