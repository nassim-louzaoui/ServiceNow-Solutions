// =============================================================================
// OPERATIONS INTELLIGENCE — ACL REMEDIATION BACKGROUND SCRIPT
// =============================================================================
// Run in: System Definition > Scripts - Background
// Scope:  Global
// Role:   admin (security_admin NOT required)
//
// Why a background script: server-side GlideRecord bypasses ACL enforcement,
// allowing sys_security_acl records to be created and roles attached without
// the security_admin elevated role.
//
// Table drops are intentionally excluded: dropping tables via GlideRecord is
// a synchronous, blocking operation that causes transaction timeouts on
// ServiceNow developer instances. The mis-scoped u_x_infte_ops_int_* tables
// are inert (no application code references them) and can be removed manually
// through Studio > Data Model if desired.
//
// This script is idempotent. It performs two things:
//   1. Creates the complete table + field ACL layer in the x_infte_ops_int
//      scope, with roles attached, including the github_pat read-deny.
//   2. Removes the temporary remediation helpers (cleanup job + properties).
// =============================================================================

(function () {
    'use strict';

    var SCOPE = 'x_infte_ops_int';
    var T = SCOPE + '_';
    var out = [];
    function log(m) { out.push(m); gs.info('[OI-FIX] ' + m); }

    // --- Resolve the application scope sys_id ---
    var appId = '';
    var sc = new GlideRecord('sys_scope');
    sc.addQuery('scope', SCOPE);
    sc.setLimit(1);
    sc.query();
    if (sc.next()) { appId = sc.getUniqueValue(); }
    if (!appId) { gs.print('ABORT: application scope ' + SCOPE + ' not found.'); return; }
    log('Application scope sys_id: ' + appId);

    // =========================================================================
    // 1. ACCESS CONTROL LAYER
    // =========================================================================
    function roleId(name) {
        var r = new GlideRecord('sys_user_role');
        r.addQuery('name', name);
        r.setLimit(1);
        r.query();
        return r.next() ? r.getUniqueValue() : '';
    }
    var ROLE = {
        admin:   roleId('admin'),
        lead:    roleId(SCOPE + '.leadership'),
        creator: roleId(SCOPE + '.creator'),
        user:    roleId(SCOPE + '.user')
    };
    log('Roles resolved: admin=' + (!!ROLE.admin) + ' leadership=' + (!!ROLE.lead) +
        ' creator=' + (!!ROLE.creator) + ' user=' + (!!ROLE.user));

    var aclCreated = 0, aclExisted = 0, aclFail = 0, rolesLinked = 0;

    function ensureAcl(name, op, roleTokens, script, adminOverrides) {
        var aclId = '';
        var ex = new GlideRecord('sys_security_acl');
        ex.addQuery('name', name);
        ex.addQuery('operation', op);
        ex.setLimit(1);
        ex.query();
        if (ex.next()) {
            aclId = ex.getUniqueValue();
            aclExisted++;
        } else {
            var a = new GlideRecord('sys_security_acl');
            a.initialize();
            a.setValue('name', name);
            a.setValue('operation', op);
            a.setValue('type', 'record');
            a.setValue('admin_overrides', adminOverrides ? 'true' : 'false');
            a.setValue('active', 'true');
            if (script) { a.setValue('script', script); }
            a.setValue('sys_scope', appId);
            aclId = a.insert();
            if (!aclId) { aclFail++; log('ACL INSERT FAILED ' + name + '/' + op); return; }
            aclCreated++;
        }
        for (var i = 0; i < roleTokens.length; i++) {
            var rid = ROLE[roleTokens[i]];
            if (!rid) { continue; }
            var lk = new GlideRecord('sys_security_acl_role');
            lk.addQuery('sys_security_acl', aclId);
            lk.addQuery('sys_user_role', rid);
            lk.setLimit(1);
            lk.query();
            if (lk.next()) { continue; }
            var nl = new GlideRecord('sys_security_acl_role');
            nl.initialize();
            nl.setValue('sys_security_acl', aclId);
            nl.setValue('sys_user_role', rid);
            if (nl.insert()) { rolesLinked++; }
        }
    }

    // ---- Table-level ACL matrix ----
    // Empty array = open to all authenticated users (no role restriction).
    var MATRIX = {
        person:                 { read: ['admin', 'lead', 'user'],              create: ['admin'],              write: ['admin'],              'delete': ['admin'] },
        reporting_relationship: { read: ['admin', 'lead'],                      create: ['admin', 'lead'],      write: ['admin', 'lead'],      'delete': ['admin'] },
        group:                  { read: ['admin', 'lead', 'creator', 'user'],   create: ['admin', 'lead'],      write: ['admin', 'lead'],      'delete': ['admin'] },
        group_member:           { read: ['admin', 'lead', 'user'],              create: ['admin'],              write: ['admin', 'lead'],      'delete': ['admin'] },
        onboarding_request:     { read: ['admin', 'lead', 'user'],              create: ['admin'],              write: ['admin', 'user'],      'delete': ['admin'] },
        automation_category:    { read: [],                                     create: ['admin'],              write: ['admin'],              'delete': ['admin'] },
        approved_flow:          { read: ['admin', 'lead', 'creator'],           create: ['admin'],              write: ['admin'],              'delete': ['admin'] },
        automation:             { read: ['admin', 'lead', 'creator', 'user'],   create: ['admin', 'creator'],   write: ['admin', 'creator'],   'delete': ['admin'] },
        automation_version:     { read: ['admin', 'lead', 'creator'],           create: ['admin'],              write: ['admin'],              'delete': ['admin'] },
        automation_step:        { read: ['admin', 'lead', 'creator', 'user'],   create: ['admin', 'creator'],   write: ['admin', 'creator'],   'delete': ['admin', 'creator'] },
        automation_input:       { read: ['admin', 'lead', 'creator', 'user'],   create: ['admin', 'creator'],   write: ['admin', 'creator'],   'delete': ['admin', 'creator'] },
        group_automation:       { read: ['admin', 'lead', 'creator', 'user'],   create: ['admin'],              write: ['admin', 'lead'],      'delete': ['admin'] },
        execution:              { read: ['admin', 'lead', 'user'],              create: ['admin', 'user'],      write: ['admin'],              'delete': ['admin'] },
        execution_step_log:     { read: ['admin', 'lead', 'user'],              create: ['admin'],              write: ['admin'],              'delete': ['admin'] },
        automation_schedule:    { read: ['admin', 'lead', 'creator'],           create: ['admin', 'creator'],   write: ['admin', 'creator'],   'delete': ['admin', 'creator'] },
        use_case_request:       { read: ['admin', 'lead', 'creator'],           create: ['creator'],            write: ['admin', 'creator'],   'delete': ['admin'] },
        creator_credential:     { read: ['admin', 'creator'],                   create: ['admin', 'creator'],   write: ['admin', 'creator'],   'delete': ['admin'] },
        pending_action:         { read: ['admin', 'lead'],                      create: ['admin'],              write: ['admin', 'lead'],      'delete': ['admin'] },
        managed_artifact:       { read: ['admin', 'lead', 'creator', 'user'],   create: ['admin', 'creator', 'user'], write: ['admin', 'creator'], 'delete': ['admin'] }
    };
    var OPS = ['read', 'create', 'write', 'delete'];
    var tbl;
    for (tbl in MATRIX) {
        if (!MATRIX.hasOwnProperty(tbl)) { continue; }
        for (var oi = 0; oi < OPS.length; oi++) {
            var op = OPS[oi];
            ensureAcl(T + tbl, op, MATRIX[tbl][op] || [], '', true);
        }
    }

    // ---- Field-level ACLs ----
    // [table, field, operation, roleTokens, script, adminOverrides]
    var FIELD_ACLS = [
        ['creator_credential', 'github_pat',      'read',  [],                             'answer = false;', false],
        ['creator_credential', 'github_pat',      'write', ['creator'],                    '',                true],
        ['execution',          'input_values',    'read',  ['admin', 'lead', 'user'],      '',                true],
        ['execution',          'input_values',    'write', ['admin'],                       '',                true],
        ['use_case_request',   'structured_spec', 'read',  ['admin', 'lead', 'creator'],   '',                true],
        ['use_case_request',   'structured_spec', 'write', ['admin'],                       '',                true],
        ['use_case_request',   'description',     'read',  ['admin', 'lead', 'creator'],   '',                true],
        ['use_case_request',   'description',     'write', ['creator'],                    '',                true],
        ['managed_artifact',   'artifact_sys_ids','read',  ['admin'],                       '',                true],
        ['managed_artifact',   'artifact_sys_ids','write', ['admin'],                       '',                true],
        ['managed_artifact',   'creation_spec',   'read',  ['admin', 'creator'],           '',                true],
        ['managed_artifact',   'creation_spec',   'write', ['admin'],                       '',                true],
        ['managed_artifact',   'copilot_assisted','read',  ['admin', 'lead', 'creator'],   '',                true],
        ['managed_artifact',   'copilot_assisted','write', ['admin'],                       '',                true]
    ];
    for (var fi = 0; fi < FIELD_ACLS.length; fi++) {
        var fa = FIELD_ACLS[fi];
        ensureAcl(T + fa[0] + '.' + fa[1], fa[2], fa[3], fa[4], fa[5]);
    }
    log('ACLs: ' + aclCreated + ' created, ' + aclExisted + ' already existed, ' +
        aclFail + ' failed; role links added: ' + rolesLinked);

    // =========================================================================
    // 2. REMOVE REMEDIATION HELPERS
    // =========================================================================
    var helperRemoved = 0;
    var job = new GlideRecord('sysauto_script');
    job.addQuery('name', 'Operations Intelligence Cleanup');
    job.query();
    while (job.next()) { if (job.deleteRecord()) { helperRemoved++; } }
    var helperProps = [SCOPE + '.cleanup_result', SCOPE + '.cleanup_job_id'];
    for (var pi = 0; pi < helperProps.length; pi++) {
        var pr = new GlideRecord('sys_properties');
        pr.addQuery('name', helperProps[pi]);
        pr.query();
        while (pr.next()) { if (pr.deleteRecord()) { helperRemoved++; } }
    }
    log('Remediation helpers removed: ' + helperRemoved);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    gs.print('================ OPERATIONS INTELLIGENCE REMEDIATION ================');
    for (var li = 0; li < out.length; li++) { gs.print('  ' + out[li]); }
    gs.print('====================================================================');
    gs.print('ACLs created: ' + aclCreated + ' (existed ' + aclExisted + ', failed ' +
        aclFail + ') | role links: ' + rolesLinked + ' | helpers removed: ' + helperRemoved);
    gs.print('Remediation complete.');
})();
