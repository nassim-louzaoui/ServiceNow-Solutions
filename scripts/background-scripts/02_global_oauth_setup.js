// ============================================================
// OPERATIONS INTELLIGENCE — GLOBAL SETUP & OAUTH CONFIGURATION
// Run ONCE in global scope (scope picker must show "Global")
// ============================================================
// WHAT THIS DOES (in one execution):
//   1. Verifies and repairs the svc_operations_intelligence_api
//      service account (password reset, roles, flags)
//   2. Removes any legacy svc_claude_api artifacts
//   3. Confirms system properties for basic-auth are correct
//   4. Creates (or resets) the OAuth 2.0 Application Registry
//      entry so that /oauth_token.do issues Bearer tokens
//   5. Prints the exact curl command to test OAuth token retrieval
//
// SCOPE REQUIREMENT: Run in GLOBAL scope only.
//   If the scope picker shows anything other than "Global",
//   switch it before running — scoped context blocks sys_user
//   deletes and system property writes.
// ============================================================

(function globalOAuthSetup() {
    'use strict';

    var SEP = '============================================================';
    var USERNAME      = 'svc_operations_intelligence_api';
    var OAUTH_APP_NAME = 'Operations Intelligence API';

    // Generate a strong random password (alphanumeric + 1 special + 1 digit)
    var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var SPEC  = '!@#$';
    var pwd   = '';
    for (var i = 0; i < 14; i++) pwd += ALPHA.charAt(Math.floor(Math.random() * ALPHA.length));
    pwd += SPEC.charAt(Math.floor(Math.random() * SPEC.length));
    pwd += Math.floor(Math.random() * 9);
    var PASSWORD = pwd;

    var errors = [];

    gs.print('');
    gs.print(SEP);
    gs.print('  OPERATIONS INTELLIGENCE — GLOBAL SETUP & OAUTH');
    gs.print(SEP);

    // ── STEP 1: VERIFY / REPAIR SERVICE ACCOUNT ──────────────
    gs.print('');
    gs.print('  [STEP 1] Service Account: ' + USERNAME);

    var userSysId;
    var userGr = new GlideRecord('sys_user');
    userGr.addQuery('user_name', USERNAME);
    userGr.setLimit(1);
    userGr.query();

    if (userGr.next()) {
        userSysId = userGr.getUniqueValue();
        userGr.setValue('user_password',          PASSWORD);
        userGr.setValue('active',                 true);
        userGr.setValue('locked_out',             false);
        userGr.setValue('web_service_access_only', true);
        userGr.setValue('first_name', 'Operations Intelligence');
        userGr.setValue('last_name',  'Service Account');
        userGr.setValue('email',      'svc.operations.intelligence.api@internal.invalid');
        userGr.update();
        gs.print('      Action   : Updated — password reset, flags corrected');
    } else {
        var newUser = new GlideRecord('sys_user');
        newUser.initialize();
        newUser.setValue('user_name',              USERNAME);
        newUser.setValue('first_name', 'Operations Intelligence');
        newUser.setValue('last_name',  'Service Account');
        newUser.setValue('email',      'svc.operations.intelligence.api@internal.invalid');
        newUser.setValue('active',                 true);
        newUser.setValue('web_service_access_only', true);
        newUser.setValue('user_password',          PASSWORD);
        userSysId = newUser.insert();
        if (userSysId) {
            gs.print('      Action   : Created');
        } else {
            errors.push('Failed to create service account');
            gs.print('      ERROR    : Could not create service account');
        }
    }
    gs.print('      Sys ID   : ' + (userSysId || 'N/A'));

    // Ensure admin role is assigned
    if (userSysId) {
        var roleGr = new GlideRecord('sys_user_role');
        roleGr.addQuery('name', 'admin');
        roleGr.setLimit(1);
        roleGr.query();
        if (roleGr.next()) {
            var roleId = roleGr.getUniqueValue();
            var hasRole = new GlideRecord('sys_user_has_role');
            hasRole.addQuery('user', userSysId);
            hasRole.addQuery('role', roleId);
            hasRole.setLimit(1);
            hasRole.query();
            if (hasRole.next()) {
                gs.print('      Role     : admin (already assigned)');
            } else {
                var grant = new GlideRecord('sys_user_has_role');
                grant.initialize();
                grant.setValue('user',  userSysId);
                grant.setValue('role',  roleId);
                grant.setValue('state', 'active');
                if (grant.insert()) {
                    gs.print('      Role     : admin (granted)');
                } else {
                    errors.push('Failed to grant admin role');
                    gs.print('      ERROR    : Failed to grant admin role');
                }
            }
        } else {
            errors.push('admin role record not found in sys_user_role');
        }
    }

    // ── STEP 2: REMOVE LEGACY ARTIFACTS ──────────────────────
    gs.print('');
    gs.print('  [STEP 2] Legacy Cleanup');

    // Remove any leftover svc_claude_api user
    var legacyUser = new GlideRecord('sys_user');
    legacyUser.addQuery('user_name', 'svc_claude_api');
    legacyUser.query();
    var legacyCount = 0;
    while (legacyUser.next()) {
        legacyUser.deleteRecord();
        legacyCount++;
    }
    gs.print('      svc_claude_api records removed : ' + legacyCount);

    // Remove any svc_operations_intelligence_api duplicates (keep only one)
    var dupCheck = new GlideRecord('sys_user');
    dupCheck.addQuery('user_name', USERNAME);
    dupCheck.query();
    var dupCount = 0;
    var firstSeen = false;
    while (dupCheck.next()) {
        if (firstSeen) {
            dupCheck.deleteRecord();
            dupCount++;
        } else {
            firstSeen = true;
        }
    }
    gs.print('      Duplicate service account records removed : ' + dupCount);

    // ── STEP 3: SYSTEM PROPERTIES ─────────────────────────────
    gs.print('');
    gs.print('  [STEP 3] System Properties');

    var basicAuth    = gs.getProperty('glide.basicauth.required');
    var restBasicAuth = gs.getProperty('glide.rest.basicauth.required');
    gs.print('      glide.basicauth.required      : ' + basicAuth);
    gs.print('      glide.rest.basicauth.required : ' + restBasicAuth);

    if (basicAuth !== 'true') {
        gs.setProperty('glide.basicauth.required', 'true');
        gs.print('      -> Set glide.basicauth.required = true');
    }
    if (restBasicAuth !== 'false') {
        gs.setProperty('glide.rest.basicauth.required', 'false');
        gs.print('      -> Set glide.rest.basicauth.required = false');
    }
    gs.print('      Both properties are correct.');

    // ── STEP 4: CREATE / RESET OAUTH APPLICATION ──────────────
    gs.print('');
    gs.print('  [STEP 4] OAuth 2.0 Application Registry');

    // Generate a 32-char alphanumeric client secret
    var secretAlpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var clientSecret = '';
    for (var k = 0; k < 32; k++) {
        clientSecret += secretAlpha.charAt(Math.floor(Math.random() * secretAlpha.length));
    }

    var clientId;
    var oauthGr = new GlideRecord('oauth_entity');
    oauthGr.addQuery('name', OAUTH_APP_NAME);
    oauthGr.setLimit(1);
    oauthGr.query();

    if (oauthGr.next()) {
        clientId = oauthGr.getValue('client_id');
        oauthGr.setValue('client_secret',          clientSecret);
        oauthGr.setValue('active',                 true);
        oauthGr.setValue('token_lifetime',         1800);      // 30 min
        oauthGr.setValue('refresh_token_lifetime', 7776000);   // 90 days
        oauthGr.update();
        gs.print('      Action        : Updated — client secret reset');
        gs.print('      OAuth Sys ID  : ' + oauthGr.getUniqueValue());
    } else {
        var newOauth = new GlideRecord('oauth_entity');
        newOauth.initialize();
        newOauth.setValue('name',                  OAUTH_APP_NAME);
        newOauth.setValue('type',                  'oauth_provider');
        newOauth.setValue('active',                true);
        newOauth.setValue('client_secret',         clientSecret);
        newOauth.setValue('token_lifetime',        1800);
        newOauth.setValue('refresh_token_lifetime', 7776000);
        var newOauthSysId = newOauth.insert();

        if (newOauthSysId) {
            // Re-read to get the auto-generated client_id
            var reRead = new GlideRecord('oauth_entity');
            reRead.get(newOauthSysId);
            clientId = reRead.getValue('client_id');
            gs.print('      Action        : Created');
            gs.print('      OAuth Sys ID  : ' + newOauthSysId);
        } else {
            errors.push('Failed to create OAuth application in oauth_entity');
            gs.print('      ERROR         : Could not create OAuth application');
        }
    }

    gs.print('      Client ID     : ' + (clientId || 'N/A'));
    gs.print('      Client Secret : ' + clientSecret);

    // ── RESOLVE INSTANCE URL ──────────────────────────────────
    var instanceUrl = gs.getProperty('glide.servlet.uri') ||
                      gs.getProperty('glide.url')         || '';
    if (!instanceUrl) {
        var instanceName = gs.getProperty('instance_name') || '';
        instanceUrl = instanceName ? 'https://' + instanceName + '.service-now.com' : 'UNKNOWN';
    }
    instanceUrl = instanceUrl.replace(/\/$/, '');

    // ── FINAL OUTPUT BLOCK ────────────────────────────────────
    gs.print('');
    gs.print(SEP);
    gs.print('  COMPLETE OUTPUT — SHARE THIS BLOCK');
    gs.print(SEP);
    gs.print('');
    gs.print('  STATUS        : ' + (errors.length === 0 ? 'SUCCESS' : 'ERRORS — see details above'));
    gs.print('  Instance URL  : ' + instanceUrl);
    gs.print('');
    gs.print('  --- SERVICE ACCOUNT ---');
    gs.print('  Username      : ' + USERNAME);
    gs.print('  Password      : ' + PASSWORD);
    gs.print('  User Sys ID   : ' + (userSysId || 'N/A'));
    gs.print('');
    gs.print('  --- OAUTH 2.0 APPLICATION ---');
    gs.print('  App Name      : ' + OAUTH_APP_NAME);
    gs.print('  Client ID     : ' + (clientId || 'N/A'));
    gs.print('  Client Secret : ' + clientSecret);
    gs.print('');
    gs.print('  --- TEST: GET OAUTH TOKEN (run in terminal or Postman) ---');
    gs.print('  curl -X POST "' + instanceUrl + '/oauth_token.do" \\');
    gs.print('    -H "Content-Type: application/x-www-form-urlencoded" \\');
    gs.print('    --data-urlencode "grant_type=password" \\');
    gs.print('    --data-urlencode "client_id=' + (clientId || 'CLIENT_ID_HERE') + '" \\');
    gs.print('    --data-urlencode "client_secret=' + clientSecret + '" \\');
    gs.print('    --data-urlencode "username=' + USERNAME + '" \\');
    gs.print('    --data-urlencode "password=' + PASSWORD + '"');
    gs.print('');
    gs.print('  On success you will receive JSON with "access_token".');
    gs.print('  Use it in REST calls as:  Authorization: Bearer <access_token>');
    gs.print('');

    if (errors.length > 0) {
        gs.print('  --- ERRORS ---');
        errors.forEach(function(e) { gs.print('  ! ' + e); });
        gs.print('');
    }

    gs.print('  --- NEXT STEP ---');
    gs.print('  Screenshot / copy this entire output and share it.');
    gs.print('  The OAuth token endpoint will be tested and the full');
    gs.print('  Operations Intelligence platform build will begin.');
    gs.print('');
    gs.print(SEP);
    gs.print('');

})();
