/**
 * Operations Intelligence — Create Test Admin User
 *
 * Creates a ServiceNow user with ONLY the x_infte_ops_int.admin role
 * (no global admin access). Use System > Impersonate User to test the portal.
 *
 * Run in Scripts - Background (any scope is fine).
 * Safe to re-run — all steps are idempotent.
 */

var TEST_USER_NAME = 'oi_test_admin';
var TEST_FIRST     = 'OI Test';
var TEST_LAST      = 'Admin';
var TEST_EMAIL     = 'oi_test_admin@example.com';
var TEST_PASSWORD  = 'OITestAdmin@2026';
var TEST_GROUP     = 'OI Test Administration';

function log(m) { gs.print(m); }
function sep(l) { log('\n══ ' + l + ' ══════════════════════════════════'); }

// ─── Step 1: Create ServiceNow User ──────────────────────────────────────────
sep('Step 1: ServiceNow User');
var userSysId;
var existUser = new GlideRecord('sys_user');
existUser.addQuery('user_name', TEST_USER_NAME);
existUser.setLimit(1);
existUser.query();

if (existUser.next()) {
    userSysId = '' + existUser.getUniqueValue();
    log('[OK] User already exists: ' + TEST_USER_NAME + ' (' + userSysId + ')');
} else {
    var newUser = new GlideRecord('sys_user');
    newUser.initialize();
    newUser.setValue('user_name',  TEST_USER_NAME);
    newUser.setValue('first_name', TEST_FIRST);
    newUser.setValue('last_name',  TEST_LAST);
    newUser.setValue('email',      TEST_EMAIL);
    newUser.setValue('active',     true);
    userSysId = '' + newUser.insert();

    if (!userSysId) {
        log('ERROR: Failed to create ServiceNow user. Aborting.');
        userSysId = null;
    } else {
        log('Created user: ' + TEST_USER_NAME + ' (' + userSysId + ')');
        try {
            new GlideUserManagement().updatePassword(userSysId, TEST_PASSWORD);
            log('Password set successfully.');
        } catch (pe) {
            log('WARN: Could not set password via GlideUserManagement (' + pe + ')');
            log('      Set it manually: System Security > Users > ' + TEST_USER_NAME);
        }
    }
}

if (!userSysId) { gs.print('Aborting — user could not be created.'); }

// ─── Step 2: Ensure user has NO global admin role ─────────────────────────────
sep('Step 2: Ensure No Global Admin Role');
var adminRoleGr = new GlideRecord('sys_user_role');
adminRoleGr.addQuery('name', 'admin');
adminRoleGr.setLimit(1);
adminRoleGr.query();
if (adminRoleGr.next()) {
    var globalAdminRoleId = '' + adminRoleGr.getUniqueValue();
    var hasGlobalAdmin    = new GlideRecord('sys_user_has_role');
    hasGlobalAdmin.addQuery('user', userSysId);
    hasGlobalAdmin.addQuery('role', globalAdminRoleId);
    hasGlobalAdmin.query();
    if (hasGlobalAdmin.next()) {
        hasGlobalAdmin.deleteRecord();
        log('Removed global admin role from test user.');
    } else {
        log('[OK] Test user does not have global admin role.');
    }
}

// ─── Step 3: Create OI Person Record ─────────────────────────────────────────
sep('Step 3: OI Person Record');
var personSysId;
var existPerson = new GlideRecord('x_infte_ops_int_person');
existPerson.addQuery('user', userSysId);
existPerson.setLimit(1);
existPerson.query();

if (existPerson.next()) {
    personSysId = '' + existPerson.getUniqueValue();
    // Ensure active
    if ('' + existPerson.getValue('active') !== 'true' && '' + existPerson.getValue('active') !== '1') {
        existPerson.setValue('active', true);
        existPerson.update();
        log('[OK] Person record re-activated: ' + personSysId);
    } else {
        log('[OK] Person record exists: ' + personSysId);
    }
} else {
    var newPerson = new GlideRecord('x_infte_ops_int_person');
    newPerson.initialize();
    newPerson.setValue('user',   userSysId);
    newPerson.setValue('active', true);
    personSysId = '' + newPerson.insert();
    if (personSysId) {
        log('Created person record: ' + personSysId);
    } else {
        log('ERROR: Failed to create person record.');
    }
}

// ─── Step 4: Create Test Admin Group ─────────────────────────────────────────
sep('Step 4: OI Test Admin Group');
var groupSysId;
var existGroup = new GlideRecord('x_infte_ops_int_group');
existGroup.addQuery('name', TEST_GROUP);
existGroup.addQuery('status', '!=', 'archived');
existGroup.setLimit(1);
existGroup.query();

if (existGroup.next()) {
    groupSysId = '' + existGroup.getUniqueValue();
    log('[OK] Group exists: ' + TEST_GROUP + ' (' + groupSysId + ')');
} else {
    try {
        var gm       = new x_infte_ops_int.GroupManager();
        groupSysId   = gm.createGroup(TEST_GROUP, 'Test group for OI admin impersonation testing', 'custom_group', personSysId, null, personSysId);
        log('Created group: ' + TEST_GROUP + ' (' + groupSysId + ')');
    } catch (ge) {
        log('ERROR: GroupManager.createGroup failed: ' + ge);
    }
}

// ─── Step 5: Add Person to Group as Admin ────────────────────────────────────
sep('Step 5: Add to Group as Admin');
if (groupSysId && personSysId) {
    try {
        var gm2   = new x_infte_ops_int.GroupManager();
        var added = gm2.addMember(groupSysId, personSysId, 'admin', null);
        log('GroupManager.addMember: ' + (added ? 'OK — role sync triggered automatically' : 'FAIL'));
    } catch (me) {
        log('ERROR: GroupManager.addMember failed: ' + me);
    }
} else {
    log('SKIP — missing group or person sys_id.');
}

// ─── Step 6: Verify Role Assignment ──────────────────────────────────────────
sep('Step 6: Role Verification');
var roles = ['x_infte_ops_int.admin', 'x_infte_ops_int.leadership', 'x_infte_ops_int.creator', 'x_infte_ops_int.user'];
var i;
for (i = 0; i < roles.length; i++) {
    var rChk = new GlideRecord('sys_user_has_role');
    rChk.addQuery('user', userSysId);
    rChk.addQuery('role.name', roles[i]);
    rChk.setLimit(1);
    rChk.query();
    log('  ' + (rChk.next() ? '[OK]     ' : '[MISSING]') + ' ' + roles[i]);
}

// ─── Summary ─────────────────────────────────────────────────────────────────
sep('Summary');
log('Username :  ' + TEST_USER_NAME);
log('Password :  ' + TEST_PASSWORD + '  (if auto-set failed, set manually)');
log('OI Role  :  x_infte_ops_int.admin  (scoped only — no platform admin)');
log('Person   :  ' + (personSysId || 'ERROR'));
log('Group    :  ' + TEST_GROUP + ' (' + (groupSysId || 'ERROR') + ')');
log('');
log('To test: System > Impersonate User > search "' + TEST_USER_NAME + '"');
log('Then visit the Operations Intelligence portal.');
