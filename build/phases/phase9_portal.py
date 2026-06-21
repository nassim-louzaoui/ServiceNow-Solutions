#!/usr/bin/env python3
"""
Phase 9a — Portal Infrastructure

Creates the single Operations Intelligence Service Portal, its custom theme, and
the two pages (main + onboarding) in the application scope. Widgets and page
layout are built in subsequent steps.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

THEME_CSS = """:root {
  --oi-primary: #1565C0;
  --oi-primary-dark: #0D47A1;
  --oi-accent: #00838F;
  --oi-bg: #F4F6F8;
  --oi-surface: #FFFFFF;
  --oi-text: #1A2027;
  --oi-muted: #5A6772;
  --oi-danger: #C62828;
  --oi-success: #2E7D32;
}
body { background: var(--oi-bg); color: var(--oi-text); font-family: 'Segoe UI', Roboto, sans-serif; }
.oi-card { background: var(--oi-surface); border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); padding: 16px; }
.oi-navbar { background: var(--oi-primary-dark); color: #fff; }
"""


def build():
    log = []

    theme = ec.op("artifact.sp_theme", data={
        "name": "Operations Intelligence Theme",
        "css_variables": THEME_CSS,
    })
    log.append("theme: %s %s" % ("ok" if theme.get("ok") else "FAIL",
                                 theme.get("sys_id", str(theme)[:120])))
    theme_id = theme.get("sys_id", "")

    portal = ec.op("artifact.sp_portal", data={
        "title": "Operations Intelligence",
        "url_suffix": "operations_intelligence",
        "theme": theme_id,
        "default_page": "main",
        "homepage": "main",
    })
    log.append("portal: %s %s" % ("ok" if portal.get("ok") else "FAIL",
                                  portal.get("sys_id", str(portal)[:120])))

    for pid, title in [("main", "Operations Intelligence"),
                       ("onboarding", "Operations Intelligence Onboarding")]:
        pg = ec.op("artifact.sp_page", data={"id": pid, "title": title, "draft": False})
        log.append("page %-12s %s %s" % (pid, "ok" if pg.get("ok") else "FAIL",
                                         pg.get("sys_id", str(pg)[:120])))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
