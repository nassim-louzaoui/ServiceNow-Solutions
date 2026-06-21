/**
 * Operations Intelligence — One-Time Setup Script
 * Run once in ServiceNow Scripts - Background (application scope: x_infte_ops_int)
 *
 * What this script does:
 *   1. Syncs platform roles for all existing persons based on their current group memberships
 *   2. Verifies and activates all 16 OI business rules
 *   3. Reports a full inventory of the OI application state
 */

var SCOPE        = 'x_infte_ops_int';
var GROUP_TABLE  = 'x_infte_ops_int_group';
var PERSON_TABLE = 'x_infte_ops_int_person';
var OI_ROLES     = ['x_infte_ops_int.admin', 'x_infte_ops_int.leadership', 'x_infte_ops_int.creator', 'x_infte_ops_int.user'];
var lines        = [];
var errors       = [];

function log(msg) { lines.push(msg); gs.print(msg); }
function err(msg) { errors.push(msg); gs.print('ERROR: ' + msg); }
function sep(label) { log('\n══ ' + label + ' ════════════════════════════════════════'); }

// ─── STEP 1: Role Sync ────────────────────────────────────────────────────────
sep('Step 1: Role Sync for All Persons');
try {
    var synced = new RoleSyncService().syncAllRoles();
    log('Synced roles for ' + synced + ' active person(s).');
} catch (e) {
    err('RoleSyncService.syncAllRoles() failed: ' + e);
}

// ─── STEP 2: Verify Business Rules ───────────────────────────────────────────
sep('Step 2: Business Rule Verification');
var brGr = new GlideRecord('sys_script');
brGr.addQuery('sys_scope.scope', SCOPE);
brGr.query();
var brTotal = 0;
var brInactive = [];
while (brGr.next()) {
    brTotal++;
    if ('' + brGr.getValue('active') !== 'true' && '' + brGr.getValue('active') !== '1') {
        brInactive.push('' + brGr.getValue('name'));
    }
}
log('Found ' + brTotal + ' business rule(s) in scope.');
if (brInactive.length > 0) {
    log('Activating ' + brInactive.length + ' inactive business rule(s)...');
    var brFix = new GlideRecord('sys_script');
    brFix.addQuery('sys_scope.scope', SCOPE);
    brFix.addQuery('active', false);
    brFix.query();
    while (brFix.next()) {
        brFix.setValue('active', true);
        brFix.setWorkflow(false);
        brFix.update();
        log('  Activated: ' + brFix.getValue('name'));
    }
} else {
    log('All business rules are active.');
}

// ─── STEP 3: Verify Access Guard BRs have query=true ─────────────────────────
sep('Step 3: Access Guard Business Rule Check');
var guardFixed = 0;
var guardGr = new GlideRecord('sys_script');
guardGr.addQuery('sys_scope.scope', SCOPE);
guardGr.addQuery('name', 'CONTAINS', 'Access Guard');
guardGr.query();
while (guardGr.next()) {
    var needsFix = false;
    if ('' + guardGr.getValue('action_query') !== 'true' && '' + guardGr.getValue('action_query') !== '1') {
        needsFix = true;
    }
    if (needsFix) {
        guardGr.setValue('action_query', true);
        guardGr.setValue('action_insert', false);
        guardGr.setValue('action_update', false);
        guardGr.setValue('action_delete', false);
        guardGr.setValue('when', 'before');
        guardGr.setWorkflow(false);
        guardGr.update();
        guardFixed++;
        log('  Fixed guard: ' + guardGr.getValue('name'));
    }
}
if (guardFixed === 0) {
    log('All access guard business rules are correctly configured.');
} else {
    log('Fixed ' + guardFixed + ' access guard business rule(s).');
}

// ─── STEP 4: Verify OI Roles Exist ──────────────────────────────────────────
sep('Step 4: Platform Role Verification');
var i;
for (i = 0; i < OI_ROLES.length; i++) {
    var roleGr = new GlideRecord('sys_user_role');
    roleGr.addQuery('name', OI_ROLES[i]);
    roleGr.setLimit(1);
    roleGr.query();
    if (roleGr.next()) {
        log('  [OK] ' + OI_ROLES[i] + ' (' + roleGr.getUniqueValue() + ')');
    } else {
        err('[MISSING] Role not found: ' + OI_ROLES[i] + ' — re-run phase2_roles_seed');
    }
}

// ─── STEP 5: Inventory Report ────────────────────────────────────────────────
sep('Step 5: Inventory Report');

var personCount = 0;
var pGr = new GlideRecord(PERSON_TABLE);
pGr.addQuery('active', true);
pGr.query();
while (pGr.next()) { personCount++; }
log('Active persons: ' + personCount);

var groupCount = 0;
var memberCount = 0;
var gGr = new GlideRecord(GROUP_TABLE);
gGr.addQuery('status', 'active');
gGr.query();
while (gGr.next()) {
    groupCount++;
    var members = [];
    try { members = JSON.parse('' + gGr.getValue('members') || '[]'); } catch (e2) {}
    var activeMemberCount = 0;
    var mi;
    for (mi = 0; mi < members.length; mi++) {
        if (members[mi].status !== 'inactive') { activeMemberCount++; }
    }
    memberCount += activeMemberCount;
    log('  Group: ' + gGr.getValue('name') + ' [' + gGr.getValue('type') + '] — ' + activeMemberCount + ' member(s)');
}
log('Active groups: ' + groupCount + ' | Total active memberships: ' + memberCount);

var execGr = new GlideRecord('x_infte_ops_int_execution');
execGr.addQuery('sys_created_on', '>=', gs.nowDateTime().substring(0, 10) + ' 00:00:00');
execGr.query();
var todayExecs = 0;
while (execGr.next()) { todayExecs++; }
log('Executions today: ' + todayExecs);

// ─── STEP 6: Service Account Check ───────────────────────────────────────────
sep('Step 6: Service Account Verification');
var SVC_USER = 'svc_operations_intelligence_api';
var svcGr = new GlideRecord('sys_user');
svcGr.addQuery('user_name', SVC_USER);
svcGr.setLimit(1);
svcGr.query();
if (svcGr.next()) {
    log('Service account found: ' + SVC_USER + ' (sys_id: ' + svcGr.getUniqueValue() + ')');
    var svcSysId = '' + svcGr.getUniqueValue();
    var j;
    for (j = 0; j < OI_ROLES.length; j++) {
        var hrGr = new GlideRecord('sys_user_has_role');
        hrGr.addQuery('user', svcSysId);
        hrGr.addQuery('role.name', OI_ROLES[j]);
        hrGr.setLimit(1);
        hrGr.query();
        var hasIt = hrGr.next();
        log('  ' + (hasIt ? '[OK] ' : '[MISSING] ') + OI_ROLES[j]);
        if (!hasIt) {
            var roleGr2 = new GlideRecord('sys_user_role');
            roleGr2.addQuery('name', OI_ROLES[j]);
            roleGr2.setLimit(1);
            roleGr2.query();
            if (roleGr2.next()) {
                var grantGr = new GlideRecord('sys_user_has_role');
                grantGr.initialize();
                grantGr.setValue('user', svcSysId);
                grantGr.setValue('role', roleGr2.getUniqueValue());
                grantGr.insert();
                log('    -> Granted ' + OI_ROLES[j] + ' to service account.');
            }
        }
    }
} else {
    err('Service account not found: ' + SVC_USER);
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
sep('Summary');
log('Errors: ' + (errors.length === 0 ? 'None' : errors.length));
if (errors.length > 0) {
    var ei;
    for (ei = 0; ei < errors.length; ei++) { log('  - ' + errors[ei]); }
}
log('\nOne-time setup complete. ' + (errors.length === 0 ? 'All checks passed.' : 'Review errors above.'));
