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
    var router = new ApprovalRouter();
    var pa = new GlideRecord('x_infte_ops_int_pending_action');
    pa.addQuery('status', 'pending');
    pa.addQuery('deadline_at', '<', new GlideDateTime());
    pa.query();
    while (pa.next()) {
        router.escalate(pa.getUniqueValue());
    }
})();"""

DEACTIVATION_SWEEP = """(function () {
    var handler = new DeactivationHandler();
    var pa = new GlideRecord('x_infte_ops_int_pending_action');
    pa.addQuery('action_type', 'user_deactivation');
    pa.addQuery('status', 'pending');
    pa.addQuery('deadline_at', '<', new GlideDateTime());
    pa.query();
    while (pa.next()) {
        if (!pa.subject_user.nil()) {
            handler.executeRemoval(pa.getValue('subject_user'));
            pa.setValue('status', 'actioned');
            pa.setValue('resolution', 'approved_removal');
            pa.update();
        }
    }
})();"""

COPILOT_VALIDATION = """(function () {
    var bridge = new CopilotBridge();
    var cred = new GlideRecord('x_infte_ops_int_creator_credential');
    cred.addQuery('token_status', 'active');
    cred.query();
    while (cred.next()) {
        if (typeof bridge.validateToken === 'function') {
            bridge.validateToken(cred.getValue('user'));
        }
    }
})();"""

DEPRECATION_SWEEP = """(function () {
    var svc = new CatalogService();
    var auto = new GlideRecord('x_infte_ops_int_automation');
    auto.addQuery('status', 'deprecation_queued');
    auto.query();
    while (auto.next()) {
        var exec = new GlideRecord('x_infte_ops_int_execution');
        exec.addQuery('automation', auto.getUniqueValue());
        exec.addQuery('status', 'IN', 'running,awaiting_approval');
        exec.query();
        if (exec.getRowCount() === 0) {
            auto.setValue('status', 'deprecated');
            auto.setWorkflow(false);
            auto.update();
            svc.onDeprecate(auto.getUniqueValue());
        }
    }
})();"""

# (name, script, run_period) — run_period is a duration glide_date_time (HH offset)
JOBS = [
    ("Operations Intelligence - Onboarding Expiry Sweep", ONBOARD_SWEEP, "1970-01-01 01:00:00"),
    ("Operations Intelligence - Approval Escalation Sweep", ESCALATION_SWEEP, "1970-01-01 01:00:00"),
    ("Operations Intelligence - Deactivation Removal Sweep", DEACTIVATION_SWEEP, "1970-01-01 01:00:00"),
    ("Operations Intelligence - Copilot Token Validation", COPILOT_VALIDATION, "1970-01-07 00:00:00"),
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
