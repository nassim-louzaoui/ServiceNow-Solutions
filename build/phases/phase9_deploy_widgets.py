#!/usr/bin/env python3
"""
Phase 9d — Deploy Portal Widget

Deploys the single Operations Intelligence Portal widget (build/widgets/portal/)
as sp_widget id=x_infte_ops_int_portal. Idempotent — safe to re-run.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

WIDGETS_DIR = os.path.join(os.path.dirname(__file__), "..", "widgets")
PORTAL_ID   = "x_infte_ops_int_portal"
PORTAL_NAME = "Operations Intelligence Portal"


def read(fname):
    path = os.path.join(WIDGETS_DIR, "portal", fname)
    if os.path.exists(path):
        with open(path) as f:
            return f.read().replace("{scope}", "x_infte_ops_int")
    return ""


def build():
    data = {
        "id":            PORTAL_ID,
        "name":          PORTAL_NAME,
        "template":      read("template.html"),
        "server_script": read("server-script.js"),
        "client_script": read("client-script.js"),
        "css":           read("style.css"),
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
