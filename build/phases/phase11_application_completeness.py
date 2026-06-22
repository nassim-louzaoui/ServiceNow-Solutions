#!/usr/bin/env python3
"""
Phase 11 — Application Completeness and Scope Enforcement

Ensures the entire Operations Intelligence application is fully self-contained
and correctly scoped under x_infte_ops_int. No artifact belonging to this
application should be modifiable by platform administrators outside our scope.

Steps:
  1. Scope resolution — resolves the app scope sys_id and confirms it matches
     the expected constant.

  2. Artifact re-scoping — queries every known artifact type and patches any
     record whose sys_scope does not already equal the app scope. Covers:
       • Script Includes (api_name LIKE x_infte_ops_int.)
       • Business Rules (name LIKE Operations Intelligence OR collection LIKE
         x_infte_ops_int_)
       • ACLs (name LIKE x_infte_ops_int_)
       • Service Portal widget, portal, and pages (by sys_id)
     Note: sys_cs_topic (Conversation Designer) records are NOT used by this
     application. The OI assistant runs entirely through the portal widget
     server script. No sys_cs_topic records should exist for this app.

  3. Navigator module creation — creates the Operations Intelligence
     application menu (sys_app_application) and two modules: the main portal
     link and the onboarding portal link.

  4. Manifest report — prints a full count of every artifact type, scoped
     correctly, so the exporter can verify the package is complete.

Idempotent: re-scoping is a no-op when already correct; navigator entries
upsert by name.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

APP_SCOPE      = "x_infte_ops_int"
APP_SCOPE_ID   = "75be0bf9fbe9cb5052eef5c9beefdce8"

SP_WIDGET_ID   = "d6d9baeefb2d8f9035cbf4bbaeefdce0"
SP_PORTAL_ID   = "e738a5262b610b90efe3f355fe91bfc1"
SP_PAGE_MAIN   = "ed4829262b610b90efe3f355fe91bf6a"
SP_PAGE_ONBOARDING = "2148edeafba98b9052eef5c9beefdc80"

# ---------------------------------------------------------------------------
# Step 1 — Scope resolution
# ---------------------------------------------------------------------------

def resolve_scope(log):
    log.append("--- Step 1: Scope Resolution ---")
    r = ec.op("record.query", table="sys_scope",
              encoded_query="scope=" + APP_SCOPE,
              fields=["sys_id", "name", "scope"], limit=1)
    recs = r.get("records", [])
    if not recs:
        log.append("  CRITICAL: app scope %s not found in sys_scope" % APP_SCOPE)
        return None
    rec = recs[0]
    actual_id = rec["sys_id"]
    if actual_id == APP_SCOPE_ID:
        log.append("  Scope sys_id confirmed: %s (%s)" % (actual_id, rec.get("name", "")))
    else:
        log.append("  WARNING: scope sys_id mismatch — expected %s, got %s" % (APP_SCOPE_ID, actual_id))
    return actual_id


# ---------------------------------------------------------------------------
# Step 2 — Artifact re-scoping
# ---------------------------------------------------------------------------

def rescope_by_query(log, label, table, encoded_query, field_hint, scope_id):
    r = ec.op("record.query", table=table,
              encoded_query=encoded_query,
              fields=["sys_id", field_hint, "sys_scope"], limit=500)
    records = r.get("records", [])
    patched = skipped = failed = 0
    for rec in records:
        if rec.get("sys_scope") == scope_id:
            skipped += 1
            continue
        upd = ec.op("record.update", table=table,
                    platform=True, scope=True,
                    data={"sys_id": rec["sys_id"], "sys_scope": scope_id})
        if upd.get("ok"):
            patched += 1
        else:
            failed += 1
            log.append("    FAIL re-scope %s %s: %s" % (
                label, rec.get(field_hint, rec["sys_id"]), str(upd)[:80]))
        time.sleep(0.2)
    log.append("  %-35s %3d records — %d patched, %d already correct, %d failed" % (
        label, len(records), patched, skipped, failed))
    return len(records)


def rescope_by_sysid(log, label, table, sys_id, scope_id):
    r = ec.op("record.query", table=table,
              encoded_query="sys_id=" + sys_id,
              fields=["sys_id", "sys_scope"], limit=1)
    records = r.get("records", [])
    if not records:
        log.append("  %-35s NOT FOUND (sys_id %s)" % (label, sys_id))
        return
    rec = records[0]
    if rec.get("sys_scope") == scope_id:
        log.append("  %-35s already correctly scoped" % label)
        return
    upd = ec.op("record.update", table=table,
                platform=True, scope=True,
                data={"sys_id": sys_id, "sys_scope": scope_id})
    if upd.get("ok"):
        log.append("  %-35s scoped to %s" % (label, APP_SCOPE))
    else:
        log.append("  %-35s FAIL: %s" % (label, str(upd)[:80]))
    time.sleep(0.2)


def rescope_artifacts(log, scope_id):
    log.append("\n--- Step 2: Artifact Re-Scoping ---")

    rescope_by_query(log, "Script Includes", "sys_script_include",
                     "api_nameLIKEx_infte_ops_int.", "name", scope_id)
    time.sleep(0.3)

    rescope_by_query(log, "Business Rules (OI tables)", "sys_business_rule",
                     "collectionLIKEx_infte_ops_int_", "name", scope_id)
    time.sleep(0.3)

    rescope_by_query(log, "Business Rules (OI named)", "sys_business_rule",
                     "nameLIKEOperations Intelligence", "name", scope_id)
    time.sleep(0.3)

    rescope_by_query(log, "ACLs", "sys_security_acl",
                     "nameLIKEx_infte_ops_int_", "name", scope_id)
    time.sleep(0.3)

    rescope_by_query(log, "Application Roles", "sys_user_role",
                     "nameLIKEx_infte_ops_int.", "name", scope_id)
    time.sleep(0.3)

    log.append("  %-35s platform-global table (intentional exception per architecture)" % "System Properties")

    rescope_by_query(log, "Custom Tables", "sys_db_object",
                     "nameLIKEx_infte_ops_int_", "name", scope_id)
    time.sleep(0.3)

    rescope_by_query(log, "Scheduled Jobs", "sysauto_script",
                     "nameLIKEOperations Intelligence", "name", scope_id)
    time.sleep(0.3)

    rescope_by_query(log, "Notifications", "sysevent_email_action",
                     "nameLIKEOperations Intelligence", "name", scope_id)
    time.sleep(0.3)

    rescope_by_sysid(log, "Service Portal Widget", "sp_widget", SP_WIDGET_ID, scope_id)
    rescope_by_sysid(log, "Service Portal",        "sp_portal", SP_PORTAL_ID, scope_id)
    rescope_by_sysid(log, "Portal Page (Main)",    "sp_page",   SP_PAGE_MAIN, scope_id)
    rescope_by_sysid(log, "Portal Page (Onboarding)", "sp_page", SP_PAGE_ONBOARDING, scope_id)


# ---------------------------------------------------------------------------
# Step 3 — Navigator module creation
# ---------------------------------------------------------------------------

APP_MENU_NAME   = "Operations Intelligence"
MODULE_PORTAL   = "Operations Intelligence Portal"
MODULE_ONBOARD  = "Operations Intelligence Onboarding"

PORTAL_URL      = "/operations-intelligence"
ONBOARD_URL     = "/operations-intelligence?id=oi_onboarding"


def ensure_app_menu(log, scope_id):
    r = ec.op("record.query", table="sys_app_application",
              encoded_query="title=" + APP_MENU_NAME,
              fields=["sys_id", "title"], limit=1)
    recs = r.get("records", [])
    if recs:
        menu_id = recs[0]["sys_id"]
        log.append("  Application menu already exists: %s (%s)" % (APP_MENU_NAME, menu_id))
        return menu_id
    r2 = ec.op("record.insert", table="sys_app_application",
               platform=True, scope=True,
               data={
                   "title":       APP_MENU_NAME,
                   "hint":        "Operations Intelligence application navigation",
                   "active":      True,
                   "sys_scope":   scope_id,
               })
    if r2.get("ok"):
        menu_id = r2.get("sys_id", "")
        log.append("  Application menu created: %s (%s)" % (APP_MENU_NAME, menu_id))
        return menu_id
    log.append("  FAIL create application menu: %s" % str(r2)[:120])
    return None


def ensure_module(log, scope_id, menu_id, title, url, order):
    if not menu_id:
        log.append("  SKIP module %s — no menu id" % title)
        return
    r = ec.op("record.query", table="sys_app_module",
              encoded_query="title=%s^application=%s" % (title, menu_id),
              fields=["sys_id", "title", "direct"], limit=1)
    if r.get("records"):
        existing = r["records"][0]
        if existing.get("direct") == url:
            log.append("  Module already exists with correct URL: %s" % title)
            return
        ru = ec.op("record.update", table="sys_app_module",
                   platform=True, scope=True,
                   data={"sys_id": existing["sys_id"], "direct": url})
        if ru.get("ok"):
            log.append("  Module URL updated: %s -> %s" % (title, url))
        else:
            log.append("  FAIL updating module URL %s: %s" % (title, str(ru)[:120]))
        return
    r2 = ec.op("record.insert", table="sys_app_module",
               platform=True, scope=True,
               data={
                   "title":       title,
                   "application": menu_id,
                   "link_type":   "DIRECT",
                   "direct":      url,
                   "order":       order,
                   "active":      True,
                   "sys_scope":   scope_id,
               })
    if r2.get("ok"):
        log.append("  Module created: %s -> %s" % (title, url))
    else:
        log.append("  FAIL create module %s: %s" % (title, str(r2)[:120]))
    time.sleep(0.3)


def create_navigator_modules(log, scope_id):
    log.append("\n--- Step 3: Navigator Module Creation ---")
    menu_id = ensure_app_menu(log, scope_id)
    time.sleep(0.3)
    ensure_module(log, scope_id, menu_id, MODULE_PORTAL,  PORTAL_URL,  100)
    ensure_module(log, scope_id, menu_id, MODULE_ONBOARD, ONBOARD_URL, 200)


# ---------------------------------------------------------------------------
# Step 4 — Manifest report
# ---------------------------------------------------------------------------

MANIFEST_CHECKS = [
    ("sys_script_include",   "api_nameLIKEx_infte_ops_int.",           "name",       "Script Includes"),
    ("sys_security_acl",     "nameLIKEx_infte_ops_int_",               "name",       "Access Controls"),
    ("sys_user_role",        "nameLIKEx_infte_ops_int.",                "name",       "Application Roles"),
    ("sys_db_object",        "nameLIKEx_infte_ops_int_",               "name",       "Custom Tables"),
    ("sp_widget",            "sys_id=" + SP_WIDGET_ID,                 "name",       "Service Portal Widget"),
    ("sp_portal",            "sys_id=" + SP_PORTAL_ID,                 "url_suffix", "Service Portal"),
    ("sp_page",              "sys_idIN" + SP_PAGE_MAIN + "," + SP_PAGE_ONBOARDING, "id", "Portal Pages"),
    ("sys_properties",       "nameLIKEx_infte_ops_int.",                "name",       "System Properties"),
    ("sysauto_script",       "nameLIKEOperations Intelligence",         "name",       "Scheduled Jobs"),
    ("sysevent_email_action","nameLIKEOperations Intelligence",         "name",       "Notifications"),
    ("sys_app_application",  "title=" + APP_MENU_NAME,                 "title",      "Navigator Menu"),
    ("sys_app_module",       "titleLIKEOperations Intelligence",        "title",      "Navigator Modules"),
]

MANIFEST_SKIP_SCOPE_CHECK = {"System Properties"}


def print_manifest(log):
    log.append("\n--- Step 4: Application Manifest ---")
    total = 0
    for table, query, field, label in MANIFEST_CHECKS:
        r = ec.op("record.query", table=table,
                  encoded_query=query,
                  fields=["sys_id", field, "sys_scope"], limit=500)
        records   = r.get("records", [])
        count     = len(records)
        if label in MANIFEST_SKIP_SCOPE_CHECK:
            status = "global-table (expected)"
            log.append("  %-35s %3d  [%s]" % (label, count, status))
        else:
            in_scope  = sum(1 for rec in records if rec.get("sys_scope") == APP_SCOPE_ID)
            out_scope = count - in_scope
            status    = "ok" if count > 0 and out_scope == 0 else ("WARN" if out_scope > 0 else "EMPTY")
            log.append("  %-35s %3d  scope-correct: %d  out-of-scope: %d  [%s]" % (
                label, count, in_scope, out_scope, status))
        total += count
        time.sleep(0.2)
    log.append("\n  Total artifacts in manifest: %d" % total)


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def build():
    log = ["=== Phase 11: Application Completeness and Scope Enforcement ===", ""]

    scope_id = resolve_scope(log)
    if not scope_id:
        log.append("Aborting — scope not resolvable.")
        return log

    rescope_artifacts(log, scope_id)
    create_navigator_modules(log, scope_id)
    print_manifest(log)

    log.append("\n=== Phase 11 complete ===")
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
