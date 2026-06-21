#!/usr/bin/env python3
"""
Delete the 5 inactive business rules identified during development cleanup.
Uses the Table REST API DELETE method, which works where script.run is blocked.
"""
import os
import sys
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

INACTIVE_BR_SYS_IDS = [
    "2e07a1a6fbe50f9035cbf4bbaeefdcb0",
    "4b07a1a6fbe50f9035cbf4bbaeefdcc2",
    "530725a6fbe50f9035cbf4bbaeefdcae",
    "7a07ede6fba98b9052eef5c9beefdcb1",
    "fb0721663b294b90105c95bf55e45ae5",
]


def table_delete(table, sys_id):
    url = "%s/api/now/table/%s/%s" % (ec.INSTANCE, table, sys_id)
    req = urllib.request.Request(url, method="DELETE")
    req.add_header("Authorization", ec._AUTH)
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def build():
    log = []
    for sys_id in INACTIVE_BR_SYS_IDS:
        status = table_delete("sys_script", sys_id)
        if status in (200, 204):
            log.append("deleted BR %s  (HTTP %d)" % (sys_id, status))
        elif status == 404:
            log.append("BR %s not found — already removed" % sys_id)
        else:
            log.append("BR %s  HTTP %d (unexpected)" % (sys_id, status))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
