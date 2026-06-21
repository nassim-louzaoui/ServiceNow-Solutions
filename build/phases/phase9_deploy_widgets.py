#!/usr/bin/env python3
"""
Phase 9d — Build React App and Deploy Portal Widget

Builds the React application (webapp/), then deploys the single Operations
Intelligence Portal widget (build/widgets/portal/) as sp_widget
id=x_infte_ops_int_portal. Idempotent — safe to re-run.
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

REPO_ROOT    = os.path.join(os.path.dirname(__file__), "..", "..")
WEBAPP_DIR   = os.path.join(REPO_ROOT, "webapp")
WIDGETS_DIR  = os.path.join(os.path.dirname(__file__), "..", "widgets")
PORTAL_ID    = "x_infte_ops_int_portal"
PORTAL_NAME  = "Operations Intelligence Portal"


def read_widget(fname):
    path = os.path.join(WIDGETS_DIR, "portal", fname)
    if os.path.exists(path):
        with open(path) as f:
            return f.read().replace("{scope}", "x_infte_ops_int")
    return ""


def build_react():
    print("Building React application…")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=WEBAPP_DIR,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("React build FAILED:\n" + result.stdout + result.stderr)
        sys.exit(1)
    print("React build complete.")


def read_dist(fname):
    path = os.path.join(WEBAPP_DIR, "dist", fname)
    if os.path.exists(path):
        with open(path) as f:
            return f.read()
    return ""


def build():
    build_react()

    bundle_js  = read_dist("oi-portal") or read_dist("oi-portal.js") or read_dist("oi-portal.iife.js")
    bundle_css = read_dist("webapp.css") or read_dist("oi-portal.css")
    bridge_js  = read_widget("client-script.js")
    template   = read_widget("template.html")

    if not bundle_js:
        print("ERROR: dist/oi-portal.js not found after build.")
        sys.exit(1)

    composed_client_script = bundle_js + "\n\n" + bridge_js
    composed_css = bundle_css if bundle_css else read_widget("style.css")

    data = {
        "id":            PORTAL_ID,
        "name":          PORTAL_NAME,
        "template":      template,
        "server_script": read_widget("server-script.js"),
        "client_script": composed_client_script,
        "css":           composed_css,
        "active":        True,
    }
    r = ec.op("artifact.widget", data=data)
    if r.get("ok"):
        print("%-34s -> %s (%s)" % (PORTAL_NAME, PORTAL_ID, r.get("action", "ok")))
    else:
        print("FAIL: %s" % str(r)[:200])
    return [r]


if __name__ == "__main__":
    for r in build():
        pass
