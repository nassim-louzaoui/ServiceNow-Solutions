// ============================================================
// OPERATIONS INTELLIGENCE — GRANT SERVICE ACCOUNT ROLES
// Run in GLOBAL scope
// ============================================================
// Grants the admin role to svc_operations_intelligence_api so
// the engine can create Script Includes, Business Rules, tables,
// notifications, and all other platform artifacts via REST calls.
// ============================================================

(function grantRoles() {
    'use strict';

    var SVC_SYS_ID = '94a5973dfb6dcb5052eef5c9beefdc77';
    var SVC_USER   = 'svc_operations_intelligence_api';

    // ── Verify service account exists ─────────────────────────
    var u = new GlideRecord('sys_user');
    if (!u.get(SVC_SYS_ID)) {
        gs.print('ERROR: Service account not found (sys_id: ' + SVC_SYS_ID + ')');
        return;
    }
    gs.print('Service account: ' + u.getValue('user_name') + ' — found.');

    // ── Find admin role sys_id ─────────────────────────────────
    var roleGr = new GlideRecord('sys_user_role');
    roleGr.addQuery('name', 'admin');
    roleGr.setLimit(1);
    roleGr.query();
    if (!roleGr.next()) {
        gs.print('ERROR: admin role not found in sys_user_role.');
        return;
    }
    var adminRoleSysId = roleGr.getUniqueValue();
    gs.print('Admin role sys_id: ' + adminRoleSysId);

    // ── Check if already granted ───────────────────────────────
    var existCheck = new GlideRecord('sys_user_has_role');
    existCheck.addQuery('user', SVC_SYS_ID);
    existCheck.addQuery('role', adminRoleSysId);
    existCheck.setLimit(1);
    existCheck.query();
    if (existCheck.next()) {
        gs.print('Admin role already granted to ' + SVC_USER + ' — nothing to do.');
        gs.print('sys_user_has_role sys_id: ' + existCheck.getUniqueValue());
        return;
    }

    // ── Grant admin role ───────────────────────────────────────
    var grant = new GlideRecord('sys_user_has_role');
    grant.initialize();
    grant.setValue('user', SVC_SYS_ID);
    grant.setValue('role', adminRoleSysId);
    grant.setValue('state', 'active');
    var grantId = grant.insert();

    if (grantId) {
        gs.print('');
        gs.print('============================================================');
        gs.print('  ROLE GRANTED');
        gs.print('============================================================');
        gs.print('  User : ' + SVC_USER);
        gs.print('  Role : admin');
        gs.print('  ID   : ' + grantId);
        gs.print('============================================================');
        gs.print('  Engine calls will now run with full admin permissions.');
        gs.print('  You can now tell the assistant to start building.');
        gs.print('============================================================');
    } else {
        gs.print('ERROR: Role grant insert returned null — check ACLs or logs.');
    }

})();
