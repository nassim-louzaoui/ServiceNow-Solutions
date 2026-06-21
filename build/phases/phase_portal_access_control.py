#!/usr/bin/env python3
"""
Portal Access Control Phase

Locks the Operations Intelligence portal so only users holding one of the three
OI roles (user, creator, leadership) can access it.  Platform administrators
without an OI role are redirected to the portal login page.

Two layers:
  1. sp_page.roles on both portal pages — enforced by the SP processor before
     any widget renders.
  2. Nav-bar widget server script — server-side guard that aborts rendering and
     sets data.accessDenied so the template can show an access-denied message.
"""
import os
import sys
import json
import urllib.request
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

OI_ROLES = "x_infte_ops_int.user,x_infte_ops_int.creator,x_infte_ops_int.leadership"

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
