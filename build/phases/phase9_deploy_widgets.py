#!/usr/bin/env python3
"""
Phase 9 — Deploy Portal Widget

Deploys the Operations Intelligence Portal widget (build/widgets/portal/)
as sp_widget id=x_infte_ops_int_portal. Composes:
  - React 18 UMD (react + react-dom, embedded inline — no CDN)
  - app.js (plain-JS React application)
  - client-script.js (minimal AngularJS bridge, appended last)
Idempotent — safe to re-run.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

WIDGETS_DIR  = os.path.join(os.path.dirname(__file__), "..", "widgets")
REACT_DIR    = "/tmp/react18/node_modules"
PORTAL_ID    = "x_infte_ops_int_portal"
PORTAL_NAME  = "Operations Intelligence Portal"


def read_widget(fname):
    path = os.path.join(WIDGETS_DIR, "portal", fname)
    if os.path.exists(path):
        with open(path) as f:
            return f.read().replace("{scope}", "x_infte_ops_int")
    return ""


def read_file(path):
    if os.path.exists(path):
        with open(path) as f:
            return f.read()
    return ""


def build():
    react_js    = read_file(os.path.join(REACT_DIR, "react/umd/react.production.min.js"))
    reactdom_js = read_file(os.path.join(REACT_DIR, "react-dom/umd/react-dom.production.min.js"))
    app_js      = read_widget("app.js")
    bridge_js   = read_widget("client-script.js")
    template    = read_widget("template.html")

    if not react_js:
        print("ERROR: react.production.min.js not found at " + REACT_DIR)
        print("Run: mkdir -p /tmp/react18 && cd /tmp/react18 && npm install react@18.3.1 react-dom@18.3.1")
        sys.exit(1)

    if not app_js:
        print("ERROR: build/widgets/portal/app.js not found.")
        sys.exit(1)

    composed_client_script = react_js + "\n" + reactdom_js + "\n" + app_js + "\n\n" + bridge_js
    composed_css = read_widget("style.css")

    server_script = read_widget("server-script.js")
    data = {
        "id":            PORTAL_ID,
        "name":          PORTAL_NAME,
        "template":      template,
        "server_script": server_script,
        "client_script": composed_client_script,
        "css":           composed_css,
        "active":        True,
    }
    r = ec.op("artifact.widget", data=data)
    if not r.get("ok"):
        print("FAIL artifact.widget: %s" % str(r)[:200])
        return [r]
    print("%-34s -> %s (%s)" % (PORTAL_NAME, PORTAL_ID, r.get("action", "ok")))
    widget_sys_id = r.get("sys_id", "")
    if widget_sys_id and server_script:
        r2 = ec.op("rest.call", data={
            "method": "PATCH",
            "path": "/api/now/table/sp_widget/" + widget_sys_id,
            "body": {"script": server_script},
        })
        if r2.get("ok") and r2.get("status") in (200, 200.0):
            print("  %-32s -> server script deployed (%d bytes)" % ("", len(server_script)))
        else:
            print("  WARN: server script REST deploy failed: %s" % str(r2)[:120])
    return [r]


if __name__ == "__main__":
    for r in build():
        pass
