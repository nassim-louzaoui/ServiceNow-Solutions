#!/usr/bin/env python3
"""
Field ACL phase for person.github_pat

Creates the deny-read / creator-write ACLs for the person.github_pat
password2 field. Run this after phase3_acls.py when the service account
has had time to settle (avoids rate-limit failures).
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

ADMIN = "x_infte_ops_int.admin"
CREATOR = "x_infte_ops_int.creator"


def get_role_id(name):
    r = ec.op("record.query", table="sys_user_role",
               encoded_query="name=%s" % name, fields=["sys_id"], limit=1)
    recs = r.get("records", [])
    return recs[0]["sys_id"] if recs else None


def link_role(acl_id, role_id):
    if not role_id:
        return False
    exists = ec.op("record.query", table="sys_security_acl_role",
                   encoded_query="sys_security_acl=%s^sys_user_role=%s" % (acl_id, role_id),
                   fields=["sys_id"], limit=1)
    if exists.get("records"):
        return True
    ec.op("record.insert", table="sys_security_acl_role", platform=True, scope=True,
          data={"sys_security_acl": acl_id, "sys_user_role": role_id})
    return True


def build():
    log = []
    creator_id = get_role_id(CREATOR)
    log.append("Creator role: %s" % (creator_id or "MISSING"))

    field_name = "x_infte_ops_int_person.github_pat"

    r_read = ec.op("acl.create", table=field_name, data={
        "operation": "read", "type": "field",
        "admin_overrides": False,
        "script": "answer = false;",
    })
    if r_read.get("ok"):
        log.append("person.github_pat/read ACL -> ok (deny-all, no admin override)")
    else:
        log.append("person.github_pat/read ACL -> FAIL: %s" % str(r_read)[:200])

    time.sleep(0.5)

    r_write = ec.op("acl.create", table=field_name, data={
        "operation": "write", "type": "field",
        "admin_overrides": True,
    })
    if r_write.get("ok") and creator_id:
        acl_id = r_write.get("sys_id")
        link_role(acl_id, creator_id)
        log.append("person.github_pat/write ACL -> ok (creator role linked)")
    else:
        log.append("person.github_pat/write ACL -> FAIL: %s" % str(r_write)[:200])

    return log


if __name__ == "__main__":
    for line in build():
        print(line)
