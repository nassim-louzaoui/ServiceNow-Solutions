#!/usr/bin/env python3
"""
Phase 6 — Scheduled Jobs

Creates the five platform scheduled jobs (sysauto_script) in the application
scope, each delegating to Script Include logic. Created INACTIVE per the build
order (activated in build step 14 once the platform is verified). Idempotent.

These are the platform's housekeeping sweeps — distinct from the per-automation
sysauto_script records ScheduleManager creates for scheduled automations.
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

ONBOARD_SWEEP = """new OnboardingService().expireStale();"""

ESCALATION_SWEEP = """(function () {
    var store = new OIDataStore();
    var router = new ApprovalRouter();
    var now = new GlideDateTime().getValue();
    var overdue = store.find('pending_actions', function (pa) {
        return ('' + pa.status) === 'pending' && ('' + pa.deadline_at) < now;
    });
    var i;
    for (i = 0; i < overdue.length; i++) {
        router.escalate('' + overdue[i].sys_id);
    }
})();"""

DEACTIVATION_SWEEP = """(function () {
    var store = new OIDataStore();
    var handler = new DeactivationHandler();
    var now = new GlideDateTime().getValue();
    var overdue = store.find('pending_actions', function (pa) {
        return ('' + pa.action_type) === 'user_deactivation' &&
               ('' + pa.status) === 'pending' &&
               ('' + pa.deadline_at) < now;
    });
    var i;
    for (i = 0; i < overdue.length; i++) {
        var pa = overdue[i];
        if (pa.subject_user) {
            handler.executeRemoval('' + pa.subject_user);
            pa.status = 'actioned';
            pa.resolution = 'approved_removal';
            store.upsert('pending_actions', pa);
        }
    }
})();"""

CREATOR_ASSIST_VALIDATION = """(function () {
    var store = new OIDataStore();
    var bridge = new CreatorAssistBridge();
    if (typeof bridge.validateToken !== 'function') { return; }
    var active = store.find('persons', function (p) {
        return ('' + p.token_status) === 'active' &&
               p.active !== false && p.active !== 'false';
    });
    var i;
    for (i = 0; i < active.length; i++) {
        bridge.validateToken('' + active[i].sys_id);
    }
})();"""

DEPRECATION_SWEEP = """(function () {
    var store = new OIDataStore();
    var svc = new CatalogService();
    var queued = store.find('automations', function (a) {
        return ('' + a.status) === 'deprecation_queued';
    });
    var i;
    for (i = 0; i < queued.length; i++) {
        var autoSysId = '' + queued[i].sys_id;
        var running = store.find('executions', function (e) {
            return ('' + e.automation) === autoSysId &&
                   (('' + e.status) === 'running' || ('' + e.status) === 'awaiting_approval');
        });
        if (running.length === 0) {
            queued[i].status = 'deprecated';
            store.upsert('automations', queued[i]);
            svc.onDeprecate(autoSysId);
        }
    }
})();"""

# (name, script, run_period) — run_period is a duration glide_date_time (HH offset)
JOBS = [
    ("Operations Intelligence - Onboarding Expiry Sweep", ONBOARD_SWEEP, "1970-01-01 01:00:00"),
    ("Operations Intelligence - Approval Escalation Sweep", ESCALATION_SWEEP, "1970-01-01 01:00:00"),
    ("Operations Intelligence - Deactivation Removal Sweep", DEACTIVATION_SWEEP, "1970-01-01 01:00:00"),
    ("Operations Intelligence - Creator Assist Token Validation", CREATOR_ASSIST_VALIDATION, "1970-01-07 00:00:00"),
    ("Operations Intelligence - Deprecation Completion Sweep", DEPRECATION_SWEEP, "1970-01-01 00:30:00"),
]


def build():
    log = []
    ok = fail = 0
    for name, script, period in JOBS:
        data = {
            "name": name, "script": script, "active": False,
            "run_type": "periodically", "run_period": period,
        }
        r = ec.op("artifact.scheduled_job", data=data)
        if r.get("ok"):
            ok += 1
            log.append("%-52s %s (inactive)" % (name, r.get("action", "ok")))
        else:
            fail += 1
            log.append("%-52s FAIL: %s" % (name, str(r)[:200]))
        time.sleep(0.5)
    log.append("=== scheduled jobs: %d ok, %d failed (all inactive) ===" % (ok, fail))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
