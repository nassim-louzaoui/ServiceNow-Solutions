// ============================================================
// SERVICENOW API ACCESS BOOTSTRAP  — run ONCE in Background Scripts
// ============================================================
// HOW TO USE:
//   1. Create your Scoped Application in Studio first
//   2. Switch scope to your app (top-right scope picker)
//   3. System Definition > Scripts - Background
//   4. Paste this entire script and click Run script
//   5. Screenshot the output block and share it
//
// WHAT THIS DOES IN ONE EXECUTION:
//   - Creates a dedicated service-account user
//   - Grants it the roles needed to manage a scoped app via REST
//   - Captures instance URL + scope sys_id
//   - Prints everything needed for direct REST API access
//   After you share the output, this session calls the ServiceNow
//   REST API directly to build and implement the entire solution.
// ============================================================

(function bootstrapAPIAccess() {
    'use strict';

    // ── GUARD ────────────────────────────────────────────────
    var scope = gs.getCurrentScopeName();
    if (!scope || scope === 'global') {
        gs.print('');
        gs.print('ERROR: You are in GLOBAL scope.');
        gs.print('Switch to your scoped application using the');
        gs.print('scope picker in the top-right banner, then re-run.');
        gs.print('');
        return;
    }

    // ── CONFIGURATION ────────────────────────────────────────
    var USERNAME = 'svc_claude_api';

    // Generate a strong random password (visible only in this output)
    var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var SPEC  = '!@#$';
    var pwd   = '';
    for (var i = 0; i < 14; i++) pwd += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    pwd += SPEC.charAt(Math.floor(Math.random() * SPEC.length));
    pwd += Math.floor(Math.random() * 9);
    var PASSWORD = pwd;

    var results = { user: {}, scope: {}, roles: [], errors: [] };

    // ── 1. RESOLVE SCOPE SYS_ID ──────────────────────────────
    var scopeGr = new GlideRecord('sys_app');
    scopeGr.addQuery('scope', scope);
    scopeGr.setLimit(1);
    scopeGr.query();
    if (scopeGr.next()) {
        results.scope = {
            name:    scopeGr.getValue('name'),
            scope:   scopeGr.getValue('scope'),
            sysId:   scopeGr.getUniqueValue(),
            version: scopeGr.getValue('version') || '1.0.0'
        };
    } else {
        results.errors.push('Scoped app not found in sys_app for scope: ' + scope);
    }

    // ── 2. CREATE / RESET SERVICE ACCOUNT ────────────────────
    var existingUser = new GlideRecord('sys_user');
    existingUser.addQuery('user_name', USERNAME);
    existingUser.setLimit(1);
    existingUser.query();

    if (existingUser.next()) {
        // Reset password on existing account
        existingUser.setValue('user_password', PASSWORD);
        existingUser.setValue('active', true);
        existingUser.setValue('locked_out', false);
        existingUser.update();
        results.user = {
            sysId:  existingUser.getUniqueValue(),
            action: 'updated (password reset)'
        };
    } else {
        var newUser = new GlideRecord('sys_user');
        newUser.initialize();
        newUser.setValue('user_name',              USERNAME);
        newUser.setValue('first_name',             'Claude');
        newUser.setValue('last_name',              'API');
        newUser.setValue('email',                  'svc.claude.api@internal.invalid');
        newUser.setValue('active',                 true);
        newUser.setValue('web_service_access_only', true);   // no browser login
        newUser.setValue('user_password',          PASSWORD);
        var newSysId = newUser.insert();
        if (newSysId) {
            results.user = { sysId: newSysId, action: 'created' };
        } else {
            results.errors.push('Failed to create user ' + USERNAME);
        }
    }

    // ── 3. ASSIGN ROLES ──────────────────────────────────────
    var rolesToGrant = ['admin'];   // admin lets the API create any app artifact

    if (results.user.sysId) {
        rolesToGrant.forEach(function(roleName) {
            var roleGr = new GlideRecord('sys_user_role');
            roleGr.addQuery('name', roleName);
            roleGr.setLimit(1);
            roleGr.query();
            if (!roleGr.next()) {
                results.errors.push('Role not found: ' + roleName);
                return;
            }
            var roleId = roleGr.getUniqueValue();

            var hasRole = new GlideRecord('sys_user_has_role');
            hasRole.addQuery('user', results.user.sysId);
            hasRole.addQuery('role', roleId);
            hasRole.setLimit(1);
            hasRole.query();

            if (hasRole.next()) {
                results.roles.push(roleName + ' (already assigned)');
                return;
            }

            var grant = new GlideRecord('sys_user_has_role');
            grant.initialize();
            grant.setValue('user', results.user.sysId);
            grant.setValue('role', roleId);
            grant.setValue('state', 'active');
            if (grant.insert()) {
                results.roles.push(roleName + ' (granted)');
            } else {
                results.errors.push('Failed to grant role: ' + roleName);
            }
        });
    }

    // ── 4. RESOLVE INSTANCE URL ──────────────────────────────
    var instanceUrl = gs.getProperty('glide.servlet.uri')      ||
                      gs.getProperty('glide.url')              || '';
    if (!instanceUrl) {
        var instanceName = gs.getProperty('instance_name') || '';
        instanceUrl = instanceName ? 'https://' + instanceName + '.service-now.com' : 'UNKNOWN';
    }
    // Strip trailing slash
    instanceUrl = instanceUrl.replace(/\/$/, '');

    // ── 5. VERIFY REST TABLE API IS REACHABLE ────────────────
    var tableApiPath = instanceUrl + '/api/now/table/sys_user?sysparm_limit=1';

    // ── 6. PRINT OUTPUT ──────────────────────────────────────
    var DIV = '='.repeat(60);
    gs.print('');
    gs.print(DIV);
    gs.print('  API ACCESS BOOTSTRAP — OUTPUT');
    gs.print(DIV);
    gs.print('');
    gs.print('  STATUS       : ' + (results.errors.length === 0 ? 'SUCCESS' : 'ERRORS — see below'));
    gs.print('');
    gs.print('  --- CREDENTIALS (share only in this private chat) ---');
    gs.print('  Instance URL : ' + instanceUrl);
    gs.print('  Username     : ' + USERNAME);
    gs.print('  Password     : ' + PASSWORD);
    gs.print('  User Sys ID  : ' + (results.user.sysId || 'N/A'));
    gs.print('  User Action  : ' + (results.user.action || 'N/A'));
    gs.print('');
    gs.print('  --- SCOPED APPLICATION ---');
    gs.print('  App Name     : ' + (results.scope.name    || 'N/A'));
    gs.print('  Scope        : ' + (results.scope.scope   || scope));
    gs.print('  Scope Sys ID : ' + (results.scope.sysId   || 'N/A'));
    gs.print('  App Version  : ' + (results.scope.version || 'N/A'));
    gs.print('');
    gs.print('  --- ROLES GRANTED ---');
    results.roles.forEach(function(r) { gs.print('  * ' + r); });
    gs.print('');

    if (results.errors.length > 0) {
        gs.print('  --- ERRORS ---');
        results.errors.forEach(function(e) { gs.print('  ! ' + e); });
        gs.print('');
    }

    gs.print('  --- REST API TEST URL (verify in browser) ---');
    gs.print('  ' + tableApiPath);
    gs.print('');
    gs.print('  --- NEXT STEP ---');
    gs.print('  Screenshot this entire output and share it.');
    gs.print('  Claude will then call the REST API directly to');
    gs.print('  build the full solution inside your scoped app.');
    gs.print('');
    gs.print(DIV);
    gs.print('');

})();
