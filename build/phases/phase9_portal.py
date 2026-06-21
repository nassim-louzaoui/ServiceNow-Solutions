#!/usr/bin/env python3
"""
Phase 9a — Portal Infrastructure

Creates the Operations Intelligence Service Portal, its custom theme, and the
two portal pages.  The portal's homepage field is a reference to sp_page by
sys_id, so pages must be created (or looked up) before the portal is wired.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

THEME_CSS = """:root {
  --oi-navy: #0B2A4A;
  --oi-primary: #1F7BB6;
  --oi-primary-dark: #0D5B8E;
  --oi-accent: #00AEE8;
  --oi-bg: #F0F3F8;
  --oi-surface: #FFFFFF;
  --oi-text: #1B2541;
  --oi-muted: #6B7A99;
  --oi-danger: #C62828;
  --oi-success: #1B7E36;
  --oi-warning: #B45309;
  --oi-border: #D8E0EE;
}
*, *::before, *::after { box-sizing: border-box; }
body {
  background: var(--oi-bg);
  color: var(--oi-text);
  font-family: 'Source Sans Pro', 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}
.oi-card {
  background: var(--oi-surface);
  border: 1px solid var(--oi-border);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,32,96,0.06);
  padding: 20px;
}
a { color: var(--oi-primary); }
a:hover { color: var(--oi-primary-dark); }
"""


def page_sys_id(page_id):
    r = ec.op("record.query", table="sp_page",
              encoded_query="id=%s" % page_id,
              fields=["sys_id"], limit=1)
    recs = r.get("records", [])
    return recs[0]["sys_id"] if recs else None


def build():
    log = []

    theme = ec.op("artifact.sp_theme", data={
        "name": "Operations Intelligence Theme",
        "css_variables": THEME_CSS,
    })
    log.append("theme: %s %s" % ("ok" if theme.get("ok") else "FAIL",
                                 theme.get("sys_id", str(theme)[:120])))
    theme_id = theme.get("sys_id", "")

    # Pages must exist before the portal so we can pass the sys_id as homepage.
    # sp_portal.homepage is a reference field (not a string page-id).
    page_ids = {}
    for pid, title in [("oi_main", "Operations Intelligence"),
                       ("oi_onboarding", "Operations Intelligence Onboarding")]:
        pg = ec.op("artifact.sp_page", data={"id": pid, "title": title, "draft": False})
        page_ids[pid] = pg.get("sys_id", "")
        log.append("page %-14s %s %s" % (pid, "ok" if pg.get("ok") else "FAIL",
                                          page_ids[pid]))

    main_sys_id = page_ids.get("oi_main") or page_sys_id("oi_main") or ""

    portal = ec.op("artifact.sp_portal", data={
        "title":      "Operations Intelligence",
        "url_suffix": "operations_intelligence",
        "theme":      theme_id,
        "homepage":   main_sys_id,
    })
    portal_id = portal.get("sys_id", "")
    log.append("portal: %s %s" % ("ok" if portal.get("ok") else "FAIL", portal_id))

    # Ensure homepage reference is the page sys_id (artifact.sp_portal may store
    # the string value; force it via record.update using the confirmed sys_id).
    if portal_id and main_sys_id:
        ec.op("record.update", table="sp_portal",
              data={"sys_id": portal_id, "homepage": main_sys_id})
        log.append("portal homepage pinned to page sys_id %s" % main_sys_id)

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
