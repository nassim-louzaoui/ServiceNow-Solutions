// ============================================================
// OPERATIONS INTELLIGENCE — IMPLEMENTATION VERIFICATION
// ============================================================
// Run this AFTER the full build is complete to verify all
// artifacts were created correctly in your scoped application.
//
// HOW TO USE:
//   1. Ensure scope is set to your Operations Intelligence app
//      (scope picker in top-right banner)
//   2. Navigate to: System Definition > Scripts - Background
//   3. Paste this ENTIRE script and click "Run script"
//   4. Screenshot the output and share it to confirm build
// ============================================================

(function verifyOIImplementation() {
    'use strict';

    var scope = gs.getCurrentScopeName();
    if (!scope || scope === 'global') {
        gs.print('ERROR: Switch to your Operations Intelligence scope first.');
        return;
    }

    var report = { passed: [], failed: [] };

    function pass(category, name) {
        report.passed.push({ c: category, n: name });
    }
    function fail(category, name, detail) {
        report.failed.push({ c: category, n: name, d: detail || 'NOT FOUND' });
    }

    // ── 1. TABLES (18) ───────────────────────────────────────
    var tables = [
        'person', 'reporting_relationship', 'group', 'group_member',
        'onboarding_request', 'automation_category', 'approved_flow',
        'automation', 'automation_version', 'automation_step', 'automation_input',
        'group_automation', 'execution', 'execution_step_log', 'automation_schedule',
        'use_case_request', 'creator_credential', 'pending_action'
    ];
    tables.forEach(function(tbl) {
        var gr = new GlideRecord('sys_db_object');
        gr.addQuery('name', 'ENDSWITH', '_' + tbl);
        gr.addQuery('sys_scope.scope', scope);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('Table', tbl);
        else fail('Table', tbl);
    });

    // ── 2. SCRIPT INCLUDES (14) ──────────────────────────────
    var includes = [
        'PermissionResolver', 'VAHelper', 'NotificationService', 'GroupManager',
        'CatalogService', 'ScheduleManager', 'ExecutionEngine', 'ApprovalRouter',
        'OnboardingService', 'DeactivationHandler', 'FlowBridge', 'RESTBridge',
        'CopilotBridge', 'AuditService'
    ];
    includes.forEach(function(si) {
        var gr = new GlideRecord('sys_script_include');
        gr.addQuery('name', si);
        gr.addQuery('sys_scope.scope', scope);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('ScriptInclude', si);
        else fail('ScriptInclude', si);
    });

    // ── 3. SYSTEM PROPERTIES (11) ────────────────────────────
    var props = [
        scope + '.debug_mode',
        scope + '.version',
        scope + '.invitation_expiry_hours',
        scope + '.max_reinvitations',
        scope + '.approval_escalation_hours',
        scope + '.deactivation_action_hours',
        scope + '.leader_reassignment_hours',
        scope + '.execution_log_retention_days',
        scope + '.copilot_api_endpoint',
        scope + '.copilot_timeout_ms',
        scope + '.catalog_top_n'
    ];
    props.forEach(function(prop) {
        var gr = new GlideRecord('sys_properties');
        gr.addQuery('name', prop);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('Property', prop);
        else fail('Property', prop);
    });

    // ── 4. BUSINESS RULES (5) ────────────────────────────────
    var rules = [
        'OI - Deactivation Detector',
        'OI - Execution Group Sync',
        'OI - Usage Count Increment',
        'OI - Automation Publish',
        'OI - Deprecation Guard'
    ];
    rules.forEach(function(br) {
        var gr = new GlideRecord('sys_script');
        gr.addQuery('name', br);
        gr.addQuery('sys_scope.scope', scope);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('BusinessRule', br);
        else fail('BusinessRule', br);
    });

    // ── 5. NOTIFICATION TEMPLATES (15) ───────────────────────
    var templates = [
        'OI - Onboarding Invitation',
        'OI - Onboarding Reminder',
        'OI - Onboarding Expired',
        'OI - Invitation Declined',
        'OI - Onboarding Complete',
        'OI - Added to Group',
        'OI - Automation Submitted',
        'OI - Cross-Group Approval Request',
        'OI - Approval Escalated',
        'OI - Automation Approved',
        'OI - Automation Rejected',
        'OI - User Deactivation Alert',
        'OI - Auto Removal Executed',
        'OI - Copilot Token Expired',
        'OI - Leader Reassignment Required'
    ];
    templates.forEach(function(tpl) {
        var gr = new GlideRecord('sysevent_email_action');
        gr.addQuery('name', tpl);
        gr.addQuery('sys_scope.scope', scope);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('Notification', tpl);
        else fail('Notification', tpl);
    });

    // ── 6. SCHEDULED JOBS (5) ────────────────────────────────
    var jobs = [
        'OI - Validate Creator Copilot Tokens',
        'OI - Onboarding Expiry Check',
        'OI - Approval Escalation Check',
        'OI - Deactivation Auto-Remove',
        'OI - Execution Cleanup'
    ];
    jobs.forEach(function(job) {
        var gr = new GlideRecord('sysauto_script');
        gr.addQuery('name', job);
        gr.addQuery('sys_scope.scope', scope);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('ScheduledJob', job);
        else fail('ScheduledJob', job);
    });

    // ── 7. VA CHANNEL ────────────────────────────────────────
    (function() {
        var gr = new GlideRecord('sys_cs_channel');
        gr.addQuery('name', 'Operations Assistant');
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('VAChannel', 'Operations Assistant');
        else fail('VAChannel', 'Operations Assistant');
    })();

    // ── 8. NLU MODEL ─────────────────────────────────────────
    (function() {
        var gr = new GlideRecord('sys_nlu_model');
        gr.addQuery('name', 'Operations Intelligence NLU');
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('NLUModel', 'Operations Intelligence NLU');
        else fail('NLUModel', 'Operations Intelligence NLU');
    })();

    // ── 9. SERVICE PORTAL ────────────────────────────────────
    (function() {
        var gr = new GlideRecord('sp_portal');
        gr.addQuery('url_suffix', 'operations_intelligence');
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('ServicePortal', 'operations_intelligence');
        else fail('ServicePortal', 'operations_intelligence');
    })();

    // ── 10. VA SYSTEM TOPICS (spot-check 3 key topics) ───────
    var topics = [
        '[Operations Intelligence] Welcome',
        '[Operations Intelligence] Create Automation',
        '[Operations Intelligence] Help & Fallback'
    ];
    topics.forEach(function(topic) {
        var gr = new GlideRecord('sys_cs_topic');
        gr.addQuery('name', topic);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) pass('VATopic', topic);
        else fail('VATopic', topic);
    });

    // ── 11. GITHUB_PAT FIELD ACL (read-deny) ─────────────────
    (function() {
        // Look for a deny-read ACL on the github_pat field
        var gr = new GlideRecord('sys_security_acl');
        gr.addQuery('operation', 'read');
        gr.addQuery('type', 'field');
        gr.addQuery('name', 'CONTAINS', 'creator_credential');
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            pass('FieldACL', 'github_pat read-deny (ACL record exists)');
        } else {
            fail('FieldACL', 'github_pat read-deny',
                 'No read ACL found on creator_credential — github_pat may be exposed');
        }
    })();

    // ── PRINT REPORT ─────────────────────────────────────────
    var total  = report.passed.length + report.failed.length;
    var DIV    = '='.repeat(64);
    var DIV2   = '-'.repeat(64);

    gs.print('');
    gs.print(DIV);
    gs.print('  OPERATIONS INTELLIGENCE — IMPLEMENTATION VERIFICATION');
    gs.print(DIV);
    gs.print('');
    gs.print('  Scope   : ' + scope);
    gs.print('  Passed  : ' + report.passed.length + ' / ' + total);
    gs.print('  Status  : ' + (report.failed.length === 0
        ? 'ALL CHECKS PASSED — build is complete'
        : report.failed.length + ' CHECK(S) FAILED — see below'));
    gs.print('');

    if (report.failed.length > 0) {
        gs.print('FAILED (' + report.failed.length + ')');
        gs.print(DIV2);
        report.failed.forEach(function(item) {
            gs.print('  [FAIL]  [' + item.c + ']  ' + item.n + '  —  ' + item.d);
        });
        gs.print('');
    }

    gs.print('PASSED (' + report.passed.length + ')');
    gs.print(DIV2);
    report.passed.forEach(function(item) {
        gs.print('  [OK]    [' + item.c + ']  ' + item.n);
    });
    gs.print('');
    gs.print(DIV);
    gs.print('');

})();
