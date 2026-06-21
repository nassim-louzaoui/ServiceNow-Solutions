#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Operations Intelligence -- Live Instance Audit
Queries the ServiceNow instance and reports on all expected artifacts.
"""

import urllib.request
import urllib.parse
import urllib.error
import base64
import json

INSTANCE = "https://everestdev.service-now.com"
USER = "svc_operations_intelligence_api"
PASS = "H!^j46ZKAHA7RLfDb6Va97Pu7pB8sTcF"
SCOPE = "x_infte_ops_int"

AUTH = base64.b64encode((USER + ":" + PASS).encode("utf-8")).decode("utf-8")


def rest_get(table, params):
    qs = urllib.parse.urlencode(params)
    url = INSTANCE + "/api/now/table/" + table + "?" + qs
    req = urllib.request.Request(url)
    req.add_header("Authorization", "Basic " + AUTH)
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        body = resp.read()
        return json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read()
        return {"error": str(e), "detail": body[:500].decode("utf-8", errors="replace")}
    except Exception as ex:
        return {"error": str(ex)}


def section(title):
    print("")
    print("=" * 70)
    print("  " + title)
    print("=" * 70)


def row(label, value):
    print("  {:<32} {}".format(label, value))


def mask_password(name, value):
    lower = name.lower()
    if any(kw in lower for kw in ("password", "pass", "key", "secret")):
        if value:
            return "***MASKED***"
    return value


# ──────────────────────────────────────────────────────────────
# 1. Roles
# ──────────────────────────────────────────────────────────────
section("1. Roles (sys_user_role where name STARTSWITH x_infte_ops_int)")

expected_roles = [
    "x_infte_ops_int.leadership",
    "x_infte_ops_int.creator",
    "x_infte_ops_int.user",
]

result = rest_get("sys_user_role", {
    "sysparm_query": "nameLIKEx_infte_ops_int",
    "sysparm_fields": "name,sys_id,active",
    "sysparm_limit": "50",
})

found_roles = []
if "result" in result:
    roles = result["result"]
    if not roles:
        print("  [NONE FOUND]")
    else:
        for r in roles:
            name = r.get("name", "")
            sys_id = r.get("sys_id", "")
            active = r.get("active", "")
            found_roles.append(name)
            row(name, "sys_id=" + sys_id + "  active=" + str(active))
else:
    print("  ERROR: " + str(result))

print("")
print("  Expected vs Found:")
for e in expected_roles:
    status = "PRESENT" if e in found_roles else "MISSING"
    print("    [{}] {}".format(status, e))

# ──────────────────────────────────────────────────────────────
# 2. Portal
# ──────────────────────────────────────────────────────────────
section("2. Portal (sp_portal where sys_scope.scope = x_infte_ops_int)")

result = rest_get("sp_portal", {
    "sysparm_query": "sys_scope.scope=" + SCOPE,
    "sysparm_fields": "title,url_suffix,sys_id,theme",
    "sysparm_limit": "20",
})

portal_sys_ids = []
if "result" in result:
    portals = result["result"]
    if not portals:
        print("  [NONE FOUND]")
    else:
        for p in portals:
            title = p.get("title", "")
            url_suffix = p.get("url_suffix", "")
            sys_id = p.get("sys_id", "")
            theme_val = p.get("theme", {})
            if isinstance(theme_val, dict):
                theme = theme_val.get("display_value", theme_val.get("value", ""))
            else:
                theme = str(theme_val)
            portal_sys_ids.append(sys_id)
            row("title:", title)
            row("url_suffix:", url_suffix)
            row("sys_id:", sys_id)
            row("theme:", theme)
            print("")
else:
    print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# 3. Portal Pages
# ──────────────────────────────────────────────────────────────
section("3. Portal Pages (sp_page where sys_scope.scope = x_infte_ops_int)")

result = rest_get("sp_page", {
    "sysparm_query": "sys_scope.scope=" + SCOPE,
    "sysparm_fields": "title,id,sys_id",
    "sysparm_limit": "50",
})

page_sys_ids = []
page_ids_map = {}
if "result" in result:
    pages = result["result"]
    if not pages:
        print("  [NONE FOUND]")
    else:
        for p in pages:
            title = p.get("title", "")
            pid = p.get("id", "")
            sys_id = p.get("sys_id", "")
            page_sys_ids.append(sys_id)
            page_ids_map[sys_id] = title + " (id=" + pid + ")"
            row(title, "id=" + pid + "  sys_id=" + sys_id)
else:
    print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# 4. Portal Page Layout (sp_container)
# ──────────────────────────────────────────────────────────────
section("4. Portal Page Layout (sp_container per page)")

if not page_sys_ids:
    print("  [No pages found -- skipping container query]")
else:
    page_ids_encoded = ",".join(page_sys_ids)
    result = rest_get("sp_container", {
        "sysparm_query": "sp_pageIN" + page_ids_encoded,
        "sysparm_fields": "sp_page,sys_id,background_color",
        "sysparm_limit": "200",
    })

    container_counts = {}
    if "result" in result:
        containers = result["result"]
        if not containers:
            print("  [NO CONTAINERS FOUND for any page]")
        else:
            for c in containers:
                sp_page_val = c.get("sp_page", {})
                if isinstance(sp_page_val, dict):
                    page_ref = sp_page_val.get("value", "")
                else:
                    page_ref = str(sp_page_val)
                container_counts[page_ref] = container_counts.get(page_ref, 0) + 1

            for page_id, label in page_ids_map.items():
                count = container_counts.get(page_id, 0)
                status = "LAID OUT" if count > 0 else "NO CONTAINERS"
                print("  {}: {} container(s) -- {}".format(label, count, status))
    else:
        print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# 5. App Menu & Modules
# ──────────────────────────────────────────────────────────────
section("5. App Menu & Modules")

print("  -- sys_app_application --")
result = rest_get("sys_app_application", {
    "sysparm_query": "sys_scope.scope=" + SCOPE,
    "sysparm_fields": "title,sys_id,active",
    "sysparm_limit": "20",
})

if "result" in result:
    apps = result["result"]
    if not apps:
        print("  [NONE FOUND]")
    else:
        for a in apps:
            row(a.get("title", ""), "sys_id=" + a.get("sys_id", "") + "  active=" + str(a.get("active", "")))
else:
    print("  ERROR: " + str(result))

print("")
print("  -- sys_app_module --")
result = rest_get("sys_app_module", {
    "sysparm_query": "sys_scope.scope=" + SCOPE,
    "sysparm_fields": "title,sys_id,active,application",
    "sysparm_limit": "50",
})

if "result" in result:
    modules = result["result"]
    if not modules:
        print("  [NONE FOUND]")
    else:
        for m in modules:
            app_val = m.get("application", {})
            if isinstance(app_val, dict):
                app_label = app_val.get("display_value", app_val.get("value", ""))
            else:
                app_label = str(app_val)
            row(m.get("title", ""), "active=" + str(m.get("active", "")) + "  app=" + app_label)
else:
    print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# 6. Catalog Items
# ──────────────────────────────────────────────────────────────
section("6. Catalog Items (sc_cat_item where sys_scope.scope = x_infte_ops_int)")

result = rest_get("sc_cat_item", {
    "sysparm_query": "sys_scope.scope=" + SCOPE,
    "sysparm_fields": "name,active,sys_id",
    "sysparm_limit": "50",
})

if "result" in result:
    items = result["result"]
    if not items:
        print("  [NONE FOUND]")
    else:
        for i in items:
            row(i.get("name", ""), "active=" + str(i.get("active", "")) + "  sys_id=" + i.get("sys_id", ""))
else:
    print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# 7. VA / Virtual Agent Topics
# ──────────────────────────────────────────────────────────────
section("7. VA / Virtual Agent Topics (sys_cs_topic)")

expected_topics = [
    "Welcome",
    "Complete Onboarding",
    "Copilot Setup",
    "Onboard Leadership",
    "Onboard Sub-Leadership",
    "Onboard User",
    "Appoint Creator",
    "Create Group",
    "Create Automation",
    "Review Approvals",
    "Deactivation Action",
    "Re-invite User",
    "Check Status",
    "Help and Fallback",
    "Approval Review",
    "Create Report or Dashboard",
    "Create Notification Rule",
    "Create Scheduled Data Report",
    "Create Flow",
    "Request Custom Table",
    "Request UI Page",
    "Manage My Artifacts",
    "Check Artifact Status",
]

result = rest_get("sys_cs_topic", {
    "sysparm_query": "nameLIKE[Operations Intelligence]",
    "sysparm_fields": "name,sys_id,active",
    "sysparm_limit": "100",
})

found_topic_names = []
if "result" in result:
    topics = result["result"]
    if not topics:
        print("  [NONE FOUND]")
    else:
        for t in topics:
            name = t.get("name", "")
            found_topic_names.append(name)
            row(name, "sys_id=" + t.get("sys_id", "") + "  active=" + str(t.get("active", "")))
else:
    print("  ERROR: " + str(result))

print("")
print("  Expected topic coverage ({} expected):".format(len(expected_topics)))
present = []
missing = []
for e in expected_topics:
    full_name = "[Operations Intelligence] " + e
    if full_name in found_topic_names:
        present.append(e)
    else:
        missing.append(e)

print("  PRESENT ({}/{}):".format(len(present), len(expected_topics)))
for p in present:
    print("    [PRESENT] [Operations Intelligence] " + p)
print("  MISSING ({}/{}):".format(len(missing), len(expected_topics)))
for m_topic in missing:
    print("    [MISSING] [Operations Intelligence] " + m_topic)

# ──────────────────────────────────────────────────────────────
# 8. Event Registry
# ──────────────────────────────────────────────────────────────
section("8. Event Registry (sysevent_register where sys_scope.scope = x_infte_ops_int)")

result = rest_get("sysevent_register", {
    "sysparm_query": "sys_scope.scope=" + SCOPE,
    "sysparm_fields": "name,active,sys_id",
    "sysparm_limit": "50",
})

if "result" in result:
    events = result["result"]
    if not events:
        print("  [NONE FOUND]")
    else:
        for e in events:
            row(e.get("name", ""), "active=" + str(e.get("active", "")))
else:
    print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# 9. System Properties
# ──────────────────────────────────────────────────────────────
section("9. System Properties (sys_properties where name STARTSWITH x_infte_ops_int)")

result = rest_get("sys_properties", {
    "sysparm_query": "nameLIKEx_infte_ops_int",
    "sysparm_fields": "name,value,sys_id",
    "sysparm_limit": "50",
})

if "result" in result:
    props = result["result"]
    if not props:
        print("  [NONE FOUND]")
    else:
        for p in props:
            name = p.get("name", "")
            value = p.get("value", "")
            masked = mask_password(name, value)
            row(name, masked)
else:
    print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# 10. Update Sets
# ──────────────────────────────────────────────────────────────
section("10. Update Sets (sys_update_set where name = 'Operations Intelligence')")

result = rest_get("sys_update_set", {
    "sysparm_query": "name=Operations Intelligence",
    "sysparm_fields": "name,state,sys_id,description",
    "sysparm_limit": "20",
})

if "result" in result:
    sets = result["result"]
    if not sets:
        print("  [NONE FOUND]")
    else:
        for s in sets:
            row("name:", s.get("name", ""))
            row("state:", s.get("state", ""))
            row("sys_id:", s.get("sys_id", ""))
            print("")
else:
    print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# 11. Orphaned global artifacts
# ──────────────────────────────────────────────────────────────
section("11. Orphaned Global Artifacts (wrong scope)")

print("  -- Roles in wrong scope --")
result = rest_get("sys_user_role", {
    "sysparm_query": "nameLIKEx_infte_ops_int^sys_scope.scope!=" + SCOPE,
    "sysparm_fields": "name,sys_id,sys_scope",
    "sysparm_limit": "50",
})

if "result" in result:
    orphans = result["result"]
    if not orphans:
        print("  [NONE -- all roles are in correct scope]")
    else:
        for o in orphans:
            scope_val = o.get("sys_scope", {})
            if isinstance(scope_val, dict):
                scope_label = scope_val.get("display_value", scope_val.get("value", ""))
            else:
                scope_label = str(scope_val)
            row(o.get("name", ""), "sys_scope=" + scope_label + "  sys_id=" + o.get("sys_id", ""))
else:
    print("  ERROR: " + str(result))

print("")
print("  -- ACLs in wrong scope --")
result = rest_get("sys_security_acl", {
    "sysparm_query": "nameLIKEx_infte_ops_int^sys_scope.scope!=" + SCOPE,
    "sysparm_fields": "name,sys_id,sys_scope",
    "sysparm_limit": "50",
})

if "result" in result:
    orphans = result["result"]
    if not orphans:
        print("  [NONE -- all ACLs with x_infte_ops_int in name are in correct scope]")
    else:
        for o in orphans:
            scope_val = o.get("sys_scope", {})
            if isinstance(scope_val, dict):
                scope_label = scope_val.get("display_value", scope_val.get("value", ""))
            else:
                scope_label = str(scope_val)
            row(o.get("name", ""), "sys_scope=" + scope_label + "  sys_id=" + o.get("sys_id", ""))
else:
    print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# 12. Scheduled Jobs
# ──────────────────────────────────────────────────────────────
section("12. Scheduled Jobs (sysauto_script where sys_scope.scope = x_infte_ops_int)")

result = rest_get("sysauto_script", {
    "sysparm_query": "sys_scope.scope=" + SCOPE,
    "sysparm_fields": "name,active,run_type,run_period,sys_id",
    "sysparm_limit": "50",
})

if "result" in result:
    jobs = result["result"]
    if not jobs:
        print("  [NONE FOUND]")
    else:
        for j in jobs:
            run_period_val = j.get("run_period", {})
            if isinstance(run_period_val, dict):
                run_period = run_period_val.get("display_value", run_period_val.get("value", ""))
            else:
                run_period = str(run_period_val)
            detail = ("active=" + str(j.get("active", "")) +
                      "  run_type=" + str(j.get("run_type", "")) +
                      "  run_period=" + run_period)
            row(j.get("name", ""), detail)
else:
    print("  ERROR: " + str(result))

# ──────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────
section("AUDIT COMPLETE")
print("  Instance: " + INSTANCE)
print("  Scope:    " + SCOPE)
print("  Date:     2026-06-21")
print("")
