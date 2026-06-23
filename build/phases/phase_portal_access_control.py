#!/usr/bin/env python3
"""
Portal Access Control Phase

Opens the Operations Intelligence portal to all authenticated ServiceNow users.
Any user who can log into the instance can reach the portal; their experience is
determined at runtime by the widget server script:
  - admin / developer / leadership / creator roles → full role-scoped experience
  - no OI role → user-level view (read-only, assistant available, no write actions)

Two layers remain in effect:
  1. sp_page.roles is cleared on both portal pages so the SP processor does not
     block any authenticated session.
  2. Portal widget server script — determines the active role and scopes data
     returned to match that role's permitted view.
"""
import os
import sys
import json
import urllib.request
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

OI_ROLES = ""

PAGES = [
    ("oi_main",       "ed4829262b610b90efe3f355fe91bf6a"),
    ("oi_onboarding", "2148edeafba98b9052eef5c9beefdc80"),
]


def table_patch(table, sys_id, data):
    url = "%s/api/now/table/%s/%s" % (ec.INSTANCE, table, sys_id)
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method="PATCH")
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read()).get("result", {})


def build():
    log = []

    # Layer 1: set sp_page.roles on both pages
    for page_id, page_sys_id in PAGES:
        res = table_patch("sp_page", page_sys_id, {"roles": OI_ROLES})
        saved = res.get("roles", "?")
        log.append("sp_page %-14s roles -> %s" % (page_id, saved or "(empty — check manually)"))

    # Layer 2: portal notfound_page stays as-is; login_page set to onboarding page
    # so unauthenticated/unauthorised users see the onboarding page which the
    # nav-bar guard will block with an access-denied message.
    portal_sys_id = "e738a5262b610b90efe3f355fe91bfc1"
    onboard_sys_id = PAGES[1][1]
    res2 = table_patch("sp_portal", portal_sys_id, {
        "login_page": onboard_sys_id,
    })
    log.append("sp_portal login_page -> %s" % res2.get("login_page", {}).get("value", "?"))

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
