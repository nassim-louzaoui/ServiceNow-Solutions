// ============================================================
// OPERATIONS INTELLIGENCE — SERVICE ACCOUNT PASSWORD SETUP
// Run in GLOBAL scope
// ============================================================
// Sets a local password on svc_operations_intelligence_api so
// the engine REST calls can authenticate with Basic Auth.
// REST API Basic Auth uses local SN passwords — SAML SSO does
// NOT intercept it, so this works even with Infosys IdP active.
//
// SAFE TO RE-RUN — generates a new password each time.
// Store the printed password somewhere safe; you will need it
// to re-configure calls if the session is lost.
// ============================================================

(function setServiceAccountPassword() {
    'use strict';

    var SVC_USER = 'svc_operations_intelligence_api';
    var PROP_KEY = 'x_infte_ops_int.svc_api_password_hint';

    // ── Locate service account ─────────────────────────────────
    var u = new GlideRecord('sys_user');
    u.addQuery('user_name', SVC_USER);
    u.setLimit(1);
    u.query();

    if (!u.next()) {
        gs.print('ERROR: User not found: ' + SVC_USER);
        gs.print('Run 01_global_cleanup.js first to ensure the account exists,');
        gs.print('or check All > User Administration > Users.');
        return;
    }

    var userSysId = u.getUniqueValue();
    gs.print('Found user: ' + SVC_USER + ' (sys_id: ' + userSysId + ')');

    // ── Generate strong random password ────────────────────────
    var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var SPECIAL = '!@#$%^&*';
    var pwd = '';
    for (var i = 0; i < 28; i++) {
        pwd += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    // Ensure at least 2 special chars and 2 digits to meet complexity rules
    pwd += SPECIAL.charAt(Math.floor(Math.random() * SPECIAL.length));
    pwd += SPECIAL.charAt(Math.floor(Math.random() * SPECIAL.length));
    pwd += '4' + '7'; // fixed digits for predictability in complexity check
    // Shuffle
    pwd = pwd.split('').sort(function() { return Math.random() - 0.5; }).join('');

    // ── Set the password via display value (triggers hashing) ──
    try {
        u.user_password.setDisplayValue(pwd);
        u.setWorkflow(false);
        u.autoSysFields(false);
        u.update();
        gs.print('');
        gs.print('============================================================');
        gs.print('  SERVICE ACCOUNT PASSWORD SET');
        gs.print('============================================================');
        gs.print('  User     : ' + SVC_USER);
        gs.print('  Sys ID   : ' + userSysId);
        gs.print('  PASSWORD : ' + pwd);
        gs.print('============================================================');
        gs.print('  NEXT STEPS:');
        gs.print('  1. Copy the PASSWORD above — store it securely.');
        gs.print('  2. In Studio → Operations Intelligence Engine →');
        gs.print('     Engine Router resource → check "Requires Authentication"');
        gs.print('     → Save.');
        gs.print('  3. Tell the assistant the password so engine calls');
        gs.print('     can include Basic Auth credentials.');
        gs.print('============================================================');
        gs.print('');

        // Store a hint (NOT the password itself) in a property as a reminder
        gs.setProperty(PROP_KEY, 'Set on ' + new GlideDateTime().toString() + ' — check script output for value', '');

    } catch (e) {
        gs.print('ERROR setting password: ' + String(e));
        gs.print('');
        gs.print('Alternative: Go to All > User Administration > Users,');
        gs.print('find svc_operations_intelligence_api, click Set Password,');
        gs.print('and set a password manually. Then tell the assistant.');
    }

})();
