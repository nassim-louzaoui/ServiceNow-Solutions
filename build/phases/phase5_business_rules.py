#!/usr/bin/env python3
"""
Phase 5 — Business Rules

Creates the five platform Business Rules verbatim from the architecture, each a
thin wrapper delegating to a Script Include. All in the application scope.
Scoped Business Rules on global tables (sys_user) are supported by ServiceNow.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

SCOPE = "x_infte_ops_int"
EXEC = ec.table("execution")
AUTO = ec.table("automation")

BR1 = """(function executeRule(current, previous) {
    var handler = new DeactivationHandler();
    handler.handle(current.getUniqueValue());
})(current, previous);"""

BR2 = """(function executeRule(current, previous) {
    if (current.automation.nil()) return;
    var userId = current.triggered_by.nil()
        ? gs.getUserID()
        : current.triggered_by.user.toString();
    var gaGr = new GlideRecord('x_infte_ops_int_group_automation');
    gaGr.addQuery('automation', current.getValue('automation'));
    gaGr.addQuery('approval_status', 'approved');
    gaGr.orderBy('approved_at');
    gaGr.query();
    while (gaGr.next()) {
        var memGr = new GlideRecord('x_infte_ops_int_group_member');
        memGr.addQuery('group', gaGr.getValue('group'));
        memGr.addQuery('member.user', userId);
        memGr.addQuery('status', 'active');
        memGr.setLimit(1);
        memGr.query();
        if (memGr.next()) {
            current.setValue('group', gaGr.getValue('group'));
            break;
        }
    }
})(current, previous);"""

BR3 = """(function executeRule(current, previous) {
    if (current.is_test) return;
    var autoGr = new GlideRecord('x_infte_ops_int_automation');
    if (autoGr.get(current.getValue('automation'))) {
        var count = parseInt(autoGr.getValue('usage_count') || '0', 10) + 1;
        autoGr.setValue('usage_count', count);
        autoGr.setWorkflow(false);
        autoGr.update();
    }
})(current, previous);"""

BR4 = """(function executeRule(current, previous) {
    var svc = new CatalogService();
    svc.onPublish(current.getUniqueValue());
})(current, previous);"""

BR5 = """(function executeRule(current, previous) {
    var exec = new GlideRecord('x_infte_ops_int_execution');
    exec.addQuery('automation', current.getUniqueValue());
    exec.addQuery('status', 'IN', 'running,awaiting_approval');
    exec.query();
    if (exec.getRowCount() === 0) {
        var autoGr = new GlideRecord('x_infte_ops_int_automation');
        if (autoGr.get(current.getUniqueValue())) {
            autoGr.setValue('status', 'deprecated');
            autoGr.setWorkflow(false);
            autoGr.update();
            var svc = new CatalogService();
            svc.onDeprecate(current.getUniqueValue());
        }
    }
})(current, previous);"""

# (name, collection, when, insert, update, condition, script)
RULES = [
    ("Operations Intelligence - Deactivation Detector", "sys_user", "after",
     False, True, "current.active == false && previous.active == true", BR1),
    ("Operations Intelligence - Execution Group Sync", EXEC, "before",
     True, False, "!current.automation.nil()", BR2),
    ("Operations Intelligence - Usage Count Increment", EXEC, "after",
     False, True, "current.status == 'success' && previous.status != 'success' && current.is_test == false", BR3),
    ("Operations Intelligence - Automation Publish", AUTO, "after",
     False, True, "current.status == 'published' && previous.status != 'published'", BR4),
    ("Operations Intelligence - Deprecation Guard", AUTO, "after",
     False, True, "current.status == 'deprecation_queued'", BR5),
]


def build():
    log = []
    ok = fail = 0
    for name, collection, when, ins, upd, condition, script in RULES:
        data = {
            "name": name, "collection": collection, "when": when,
            "insert": ins, "update": upd, "delete": False,
            "condition": condition, "script": script, "active": True, "order": 100,
        }
        r = ec.op("artifact.business_rule", data=data)
        if r.get("ok"):
            ok += 1
            log.append("%-50s %s" % (name, r.get("action", "ok")))
        else:
            fail += 1
            log.append("%-50s FAIL: %s" % (name, str(r)[:200]))
        time.sleep(0.5)
    log.append("=== business rules: %d ok, %d failed ===" % (ok, fail))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
