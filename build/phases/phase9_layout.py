#!/usr/bin/env python3
"""
Phase 9e — Page Layout

Wires the global widgets onto the two portal pages:
  main:       nav-bar (full width) / content-area (9) + assistant-panel (3)
  onboarding: onboarding-progress (full width)

The Content Area widget swaps the section widgets client-side, so only the global
shell widgets are placed declaratively. Idempotent: skips a page that already has
a container.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

MAIN_PAGE = "ed4829262b610b90efe3f355fe91bf6a"
ONBOARD_PAGE = "2148edeafba98b9052eef5c9beefdc80"


def widget_sysid(wid):
    r = ec.op("record.query", table="sp_widget", encoded_query="id=%s" % wid,
              fields=["sys_id"], limit=1)
    recs = r.get("records", [])
    return recs[0]["sys_id"] if recs else None


def page_has_container(page_sysid):
    r = ec.op("record.query", table="sp_container",
              encoded_query="sp_page=%s" % page_sysid, fields=["sys_id"], limit=1)
    return bool(r.get("records"))


def add_container(page_sysid, order):
    r = ec.op("artifact.sp_container", data={"page_sys_id": page_sysid, "order": order})
    return r.get("sys_id")


def add_row(container_sysid, order):
    r = ec.op("artifact.sp_row", data={"container_sys_id": container_sysid, "order": order})
    return r.get("sys_id")


def add_column(row_sysid, size, order):
    r = ec.op("artifact.sp_column", data={"row_sys_id": row_sysid, "size_md": size, "order": order})
    return r.get("sys_id")


def add_instance(col_sysid, widget_sysid, order):
    r = ec.op("artifact.sp_instance",
              data={"column_sys_id": col_sysid, "widget_sys_id": widget_sysid, "order": order})
    return r.get("sys_id")


def build():
    log = []

    # --- main page ---
    if page_has_container(MAIN_PAGE):
        log.append("main page already laid out — skipped")
    else:
        nav = widget_sysid("x_infte_ops_int_nav_bar")
        content = widget_sysid("x_infte_ops_int_content_area")
        assistant = widget_sysid("x_infte_ops_int_assistant_panel")
        cont = add_container(MAIN_PAGE, 100)
        r1 = add_row(cont, 100)
        c1 = add_column(r1, 12, 100)
        add_instance(c1, nav, 100)
        r2 = add_row(cont, 200)
        c2 = add_column(r2, 9, 100)
        add_instance(c2, content, 100)
        c3 = add_column(r2, 3, 200)
        add_instance(c3, assistant, 100)
        log.append("main page: nav-bar / content-area(9) + assistant-panel(3) placed")

    # --- onboarding page ---
    if page_has_container(ONBOARD_PAGE):
        log.append("onboarding page already laid out — skipped")
    else:
        onb = widget_sysid("x_infte_ops_int_onboarding_progress")
        cont = add_container(ONBOARD_PAGE, 100)
        r = add_row(cont, 100)
        c = add_column(r, 12, 100)
        add_instance(c, onb, 100)
        log.append("onboarding page: onboarding-progress placed")

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
