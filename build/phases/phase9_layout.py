#!/usr/bin/env python3
"""
Phase 9e — Page Layout

Wires the global widgets onto the two portal pages:
  main:       nav-bar (full width) / content-area (9) + assistant-panel (3)
  onboarding: onboarding-progress (full width)

The Content Area widget swaps the section widgets client-side, so only the global
shell widgets are placed declaratively.

Idempotency: checks that all expected widget instances are actually assigned,
not just that a container exists. Re-running safely fills in any missing
widget assignments without duplicating structure.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

MAIN_PAGE    = "ed4829262b610b90efe3f355fe91bf6a"
ONBOARD_PAGE = "2148edeafba98b9052eef5c9beefdc80"


def widget_sysid(wid):
    r = ec.op("record.query", table="sp_widget", encoded_query="id=%s" % wid,
              fields=["sys_id"], limit=1)
    recs = r.get("records", [])
    return recs[0]["sys_id"] if recs else None


def page_widgets_assigned(page_sysid, expected_widget_ids):
    """Return True only when all expected widget sys_ids are assigned on the page."""
    r = ec.op("record.query", table="sp_instance",
              encoded_query="sp_column.sp_row.sp_container.sp_page=%s" % page_sysid,
              fields=["sp_widget"], limit=20)
    assigned = set(
        rec.get("sp_widget", "")
        for rec in r.get("records", [])
        if rec.get("sp_widget")
    )
    return all(w in assigned for w in expected_widget_ids)


def get_or_create_container(page_sysid, order):
    r = ec.op("record.query", table="sp_container",
              encoded_query="sp_page=%s" % page_sysid, fields=["sys_id"], limit=1)
    recs = r.get("records", [])
    if recs:
        return recs[0]["sys_id"]
    cr = ec.op("artifact.sp_container", data={"page_sys_id": page_sysid, "order": order})
    return cr.get("sys_id")


def get_or_create_row(container_sysid, order):
    r = ec.op("record.query", table="sp_row",
              encoded_query="sp_container=%s^order=%d" % (container_sysid, order),
              fields=["sys_id"], limit=1)
    recs = r.get("records", [])
    if recs:
        return recs[0]["sys_id"]
    cr = ec.op("artifact.sp_row", data={"container_sys_id": container_sysid, "order": order})
    return cr.get("sys_id")


def get_or_create_column(row_sysid, size, order):
    r = ec.op("record.query", table="sp_column",
              encoded_query="sp_row=%s^order=%d" % (row_sysid, order),
              fields=["sys_id"], limit=1)
    recs = r.get("records", [])
    col_id = recs[0]["sys_id"] if recs else None
    if not col_id:
        cr = ec.op("artifact.sp_column",
                   data={"row_sys_id": row_sysid, "size_md": size, "order": order})
        col_id = cr.get("sys_id")
    else:
        ec.op("record.update", table="sp_column",
              data={"sys_id": col_id, "size_md": str(size)})
    return col_id


def ensure_instance(col_sysid, w_sysid, order):
    r = ec.op("record.query", table="sp_instance",
              encoded_query="sp_column=%s" % col_sysid,
              fields=["sys_id", "sp_widget"], limit=1)
    recs = r.get("records", [])
    if recs:
        inst = recs[0]
        if inst.get("sp_widget") != w_sysid:
            ec.op("record.update", table="sp_instance",
                  data={"sys_id": inst["sys_id"], "sp_widget": w_sysid})
        return inst["sys_id"]
    cr = ec.op("artifact.sp_instance",
               data={"column_sys_id": col_sysid, "widget_sys_id": w_sysid, "order": order})
    return cr.get("sys_id")


def build():
    log = []

    # ── main page ────────────────────────────────────────────────────────────
    nav_id       = widget_sysid("x_infte_ops_int_nav_bar")
    content_id   = widget_sysid("x_infte_ops_int_content_area")
    assistant_id = widget_sysid("x_infte_ops_int_assistant_panel")

    if page_widgets_assigned(MAIN_PAGE, [nav_id, content_id, assistant_id]):
        log.append("main page: all widgets already assigned — skipped")
    else:
        cont = get_or_create_container(MAIN_PAGE, 100)
        r1   = get_or_create_row(cont, 100)
        c1   = get_or_create_column(r1, 12, 100)
        ensure_instance(c1, nav_id, 100)

        r2 = get_or_create_row(cont, 200)
        c2 = get_or_create_column(r2, 9, 100)
        ensure_instance(c2, content_id, 100)
        c3 = get_or_create_column(r2, 3, 200)
        ensure_instance(c3, assistant_id, 100)

        log.append("main page: nav-bar / content-area(9) + assistant-panel(3) wired")

    # ── onboarding page ──────────────────────────────────────────────────────
    onb_id = widget_sysid("x_infte_ops_int_onboarding_progress")

    if page_widgets_assigned(ONBOARD_PAGE, [onb_id]):
        log.append("onboarding page: widget already assigned — skipped")
    else:
        cont = get_or_create_container(ONBOARD_PAGE, 100)
        r    = get_or_create_row(cont, 100)
        c    = get_or_create_column(r, 12, 100)
        ensure_instance(c, onb_id, 100)
        log.append("onboarding page: onboarding-progress wired")

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
