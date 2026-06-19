// ============================================================
// OPERATIONS INTELLIGENCE — GLOBAL CLEANUP
// Run ONCE in GLOBAL scope (scope picker must show "Global")
// ============================================================
// WHAT THIS DOES:
//   Removes all artifacts from previous, failed authentication
//   attempts so the instance is clean before the Engine is built:
//     - OAuth Application Registry entries we created
//     - Leftover Scripted REST API provider/operation records
//     - Legacy svc_claude_api user
//
//   PRESERVES: svc_operations_intelligence_api, x_infte_ops_int app,
//              system properties (basicauth, oauth.enabled), and
//              all platform build artifacts already in place.
//
// SAFE TO RE-RUN — all operations are guarded by existence checks.
// ============================================================

(function globalCleanup() {
    'use strict';

    var SEP  = '============================================================';
    var SEP2 = '------------------------------------------------------------';
    var report = { removed: [], skipped: [], errors: [] };

    function remove(label, table, query) {
        var gr = new GlideRecord(table);
        query(gr);
        gr.query();
        var count = 0;
        while (gr.next()) {
            try {
                gr.deleteRecord();
                count++;
            } catch (e) {
                report.errors.push(label + ': ' + String(e));
            }
        }
        if (count > 0) {
            report.removed.push(label + ' (' + count + ' record' + (count > 1 ? 's' : '') + ')');
            gs.print('      [REMOVED] ' + label + ' — ' + count + ' record(s)');
        } else {
            report.skipped.push(label);
            gs.print('      [SKIP]    ' + label + ' — nothing found');
        }
    }

    gs.print('');
    gs.print(SEP);
    gs.print('  OPERATIONS INTELLIGENCE — GLOBAL CLEANUP');
    gs.print(SEP);

    // ── 1. OAuth Application Registry Entries ─────────────────
    gs.print('');
    gs.print('  [1] OAuth Application Registry (oauth_entity)');

    remove('OAuth entity: Operations Intelligence API', 'oauth_entity',
        function(gr) { gr.addQuery('name', 'Operations Intelligence API'); });

    remove('OAuth entity: Operations Intelligence (any leftover)', 'oauth_entity',
        function(gr) { gr.addQuery('name', 'CONTAINS', 'Operations Intelligence'); });

    // ── 2. OAuth Entity Profiles ───────────────────────────────
    gs.print('');
    gs.print('  [2] OAuth Entity Profiles (oauth_entity_profile)');

    // Profiles linked to any removed entity — clean up orphans
    var orphanCheck = new GlideRecord('oauth_entity_profile');
    orphanCheck.addNullQuery('oauth_entity');
    orphanCheck.query();
    var orphanCount = 0;
    while (orphanCheck.next()) {
        orphanCheck.deleteRecord();
        orphanCount++;
    }
    if (orphanCount > 0) {
        report.removed.push('Orphan oauth_entity_profile (' + orphanCount + ')');
        gs.print('      [REMOVED] Orphan profiles — ' + orphanCount + ' record(s)');
    } else {
        gs.print('      [SKIP]    No orphan profiles found');
    }

    // ── 3. Scripted REST API — Build API Artifacts ─────────────
    gs.print('');
    gs.print('  [3] Scripted REST API artifacts (previous attempts)');

    // Operations must be deleted before providers (FK constraint)
    var providerNames = [
        'Operations Intelligence Build API',
        'Operations Intelligence Engine'
    ];

    providerNames.forEach(function(pName) {
        var pGr = new GlideRecord('sys_ws_provider');
        pGr.addQuery('name', pName);
        pGr.setLimit(1);
        pGr.query();
        if (!pGr.next()) {
            gs.print('      [SKIP]    Provider "' + pName + '" — not found');
            return;
        }
        var pSysId = pGr.getUniqueValue();

        // Delete child operations first
        var opGr = new GlideRecord('sys_ws_operation');
        opGr.addQuery('web_service_definition', pSysId);
        opGr.query();
        var opCount = 0;
        while (opGr.next()) { opGr.deleteRecord(); opCount++; }

        // Delete provider
        var pGr2 = new GlideRecord('sys_ws_provider');
        pGr2.get(pSysId);
        pGr2.deleteRecord();

        var msg = 'Provider "' + pName + '" + ' + opCount + ' operation(s)';
        report.removed.push(msg);
        gs.print('      [REMOVED] ' + msg);
    });

    // ── 4. Legacy Service Account ─────────────────────────────
    gs.print('');
    gs.print('  [4] Legacy svc_claude_api user');

    remove('svc_claude_api user', 'sys_user',
        function(gr) { gr.addQuery('user_name', 'svc_claude_api'); });

    // ── 5. Duplicate Service Accounts ─────────────────────────
    gs.print('');
    gs.print('  [5] Duplicate svc_operations_intelligence_api accounts');

    var dupGr = new GlideRecord('sys_user');
    dupGr.addQuery('user_name', 'svc_operations_intelligence_api');
    dupGr.orderBy('sys_created_on');
    dupGr.query();
    var firstSeen = false;
    var dupCount  = 0;
    while (dupGr.next()) {
        if (firstSeen) {
            dupGr.deleteRecord();
            dupCount++;
        } else {
            firstSeen = true;
        }
    }
    if (dupCount > 0) {
        report.removed.push('Duplicate svc_operations_intelligence_api (' + dupCount + ')');
        gs.print('      [REMOVED] Duplicate accounts — ' + dupCount + ' record(s)');
    } else {
        gs.print('      [SKIP]    No duplicates found');
    }

    // ── FINAL REPORT ───────────────────────────────────────────
    gs.print('');
    gs.print(SEP);
    gs.print('  CLEANUP COMPLETE');
    gs.print(SEP);
    gs.print('');
    gs.print('  Removed : ' + report.removed.length + ' item group(s)');
    gs.print('  Skipped : ' + report.skipped.length + ' (not found — already clean)');
    gs.print('  Errors  : ' + report.errors.length);

    if (report.removed.length > 0) {
        gs.print('');
        gs.print('  Removed:');
        report.removed.forEach(function(r) { gs.print('    - ' + r); });
    }

    if (report.errors.length > 0) {
        gs.print('');
        gs.print('  Errors:');
        report.errors.forEach(function(e) { gs.print('    ! ' + e); });
    }

    gs.print('');
    gs.print(SEP2);
    gs.print('  NEXT STEP');
    gs.print(SEP2);
    gs.print('  Switch scope picker to "Operations Intelligence"');
    gs.print('  (x_infte_ops_int), then run 02_engine_setup.js.');
    gs.print(SEP);
    gs.print('');

})();
