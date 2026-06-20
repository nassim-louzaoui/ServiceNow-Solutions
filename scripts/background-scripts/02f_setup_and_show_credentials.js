// ============================================================
// OPERATIONS INTELLIGENCE — SETUP & SHOW ALL CREDENTIALS
// ============================================================
// Run in GLOBAL scope (System Definition > Scripts - Background)
//
// What this does in one run:
//   1. Generates a new password for svc_operations_intelligence_api
//   2. Sets the password on the user account
//   3. Stores the password in x_infte_ops_int.svc_password property
//   4. Prints ALL credentials needed for the source of truth
//
// After running: screenshot the output and share it — the AI
// will save the values permanently into credentials.env in the
// source of truth ZIP.
// ============================================================

(function setupAndShowCredentials() {
    'use strict';

    var SCOPE    = 'x_infte_ops_int';
    var SVC_USER = 'svc_operations_intelligence_api';
    var INSTANCE = 'https://everestdev.service-now.com';

    // ── 1. Locate the service account ─────────────────────────
    var u = new GlideRecord('sys_user');
    u.addQuery('user_name', SVC_USER);
    u.setLimit(1);
    u.query();
    if (!u.next()) {
        gs.print('ERROR: User not found: ' + SVC_USER);
        gs.print('Run 01_global_cleanup.js first.');
        return;
    }
    var svcSysId = u.getUniqueValue();

    // ── 2. Generate a strong password ─────────────────────────
    var CHARS   = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var SPECIAL = '!@#$%^&*';
    var pwd = '';
    for (var i = 0; i < 28; i++) {
        pwd += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    pwd += SPECIAL.charAt(Math.floor(Math.random() * SPECIAL.length));
    pwd += SPECIAL.charAt(Math.floor(Math.random() * SPECIAL.length));
    pwd += '4' + '7';
    pwd = pwd.split('').sort(function() { return Math.random() - 0.5; }).join('');

    // ── 3. Set the password on the user account ───────────────
    try {
        u.user_password.setDisplayValue(pwd);
        u.setWorkflow(false);
        u.autoSysFields(false);
        u.update();
    } catch (e) {
        gs.print('ERROR setting password: ' + String(e));
        return;
    }

    // ── 4. Store password in the engine property ──────────────
    gs.setProperty(SCOPE + '.svc_password', pwd, 'Service account password for engine REST calls');

    // ── 5. Read the engine key ────────────────────────────────
    var engineKey = gs.getProperty(SCOPE + '.engine_key', '(not set)');

    // ── 6. Print all credentials ──────────────────────────────
    var DIV  = '='.repeat(64);
    var DIV2 = '-'.repeat(64);
    gs.print('');
    gs.print(DIV);
    gs.print('  OPERATIONS INTELLIGENCE — ALL CREDENTIALS');
    gs.print(DIV);
    gs.print('');
    gs.print('  SNOW_INSTANCE : ' + INSTANCE);
    gs.print('  SNOW_USER     : ' + SVC_USER);
    gs.print('  SNOW_PASS     : ' + pwd);
    gs.print('  SVC_PASSWORD  : ' + pwd);
    gs.print('  SVC_SYS_ID    : ' + svcSysId);
    gs.print('  ENGINE_KEY    : ' + engineKey);
    gs.print('  APP_SCOPE     : ' + SCOPE);
    gs.print('');
    gs.print(DIV2);
    gs.print('  Screenshot this output and share it with the AI.');
    gs.print('  It will save these values into credentials.env');
    gs.print('  inside the source of truth ZIP permanently.');
    gs.print(DIV);
    gs.print('');

})();
