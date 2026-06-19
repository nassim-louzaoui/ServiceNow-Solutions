// ============================================================
// OPERATIONS INTELLIGENCE — GLOBAL CLEANUP
// Run in GLOBAL scope  (scope picker must show "Global")
// ============================================================
// WHAT THIS DOES:
//   Removes every artifact created by previous setup attempts so
//   the instance is completely clean before the Engine is built.
//
//   [1] OAuth Application Registry entries  (oauth_entity)
//   [2] Orphan OAuth Entity Profiles        (oauth_entity_profile)
//   [3] Scripted REST providers + resources (sys_ws_provider / sys_ws_operation)
//       — skipped gracefully if plugin not installed (table absent)
//   [4] Legacy svc_claude_api service account
//   [5] Duplicate svc_operations_intelligence_api accounts
//       — oldest record is KEPT; extras deleted
//   [6] Stale REST Message definitions      (sys_rest_message)
//       — child functions (sys_rest_message_fn) cascade-deleted automatically
//   [7] Engine key system property          (x_infte_ops_int.engine_key)
//       — removed so Script 2 generates a fresh one
//
//   PRESERVES:
//     • svc_operations_intelligence_api (oldest record)
//     • x_infte_ops_int scoped application and all its artifacts
//     • glide.oauth.enabled and other platform-wide properties
//       that were NOT created solely for this project
//
// SAFE TO RE-RUN — every step is guarded by an existence check.
// Each step runs independently; one failure does NOT stop the rest.
// ============================================================

(function globalCleanup() {
    'use strict';

    var SEP  = '============================================================';
    var SEP2 = '------------------------------------------------------------';
    var report = { removed: [], skipped: [], errors: [] };

    // ── Helpers ───────────────────────────────────────────────

    // Check whether a table exists without querying it (avoids crash).
    function tableExists(tableName) {
        var t = new GlideRecord('sys_db_object');
        t.addQuery('name', tableName);
        t.setLimit(1);
        t.query();
        return t.next();
    }

    // Delete all records matching a query callback; report count.
    function removeWhere(label, table, queryFn) {
        try {
            if (!tableExists(table)) {
                gs.print('      [SKIP]    ' + label + ' — table "' + table + '" not found (plugin absent)');
                report.skipped.push(label + ' (table absent)');
                return;
            }
            var gr = new GlideRecord(table);
            queryFn(gr);
            gr.query();
            var count = 0;
            while (gr.next()) {
                try { gr.deleteRecord(); count++; }
                catch (e2) { report.errors.push(label + ' delete: ' + String(e2)); }
            }
            if (count > 0) {
                var msg = label + ' (' + count + ' record' + (count > 1 ? 's' : '') + ')';
                report.removed.push(msg);
                gs.print('      [REMOVED] ' + label + ' — ' + count + ' record(s)');
            } else {
                report.skipped.push(label);
                gs.print('      [SKIP]    ' + label + ' — nothing found');
            }
        } catch (e) {
            report.errors.push(label + ': ' + String(e));
            gs.print('      [ERROR]   ' + label + ' — ' + String(e));
        }
    }

    // ── Header ────────────────────────────────────────────────
    gs.print('');
    gs.print(SEP);
    gs.print('  OPERATIONS INTELLIGENCE — GLOBAL CLEANUP');
    gs.print(SEP);

    // ── [1] OAuth Application Registry ────────────────────────
    gs.print('');
    gs.print('  [1] OAuth Application Registry (oauth_entity)');

    removeWhere('OAuth entity: Operations Intelligence API', 'oauth_entity',
        function(gr) { gr.addQuery('name', 'Operations Intelligence API'); });

    removeWhere('OAuth entity: Operations Intelligence (any leftover)', 'oauth_entity',
        function(gr) { gr.addQuery('name', 'CONTAINS', 'Operations Intelligence'); });

    // ── [2] Orphan OAuth Entity Profiles ──────────────────────
    gs.print('');
    gs.print('  [2] OAuth Entity Profiles — orphans (oauth_entity_profile)');

    try {
        var orphanGr = new GlideRecord('oauth_entity_profile');
        orphanGr.addNullQuery('oauth_entity');
        orphanGr.query();
        var orphanCount = 0;
        while (orphanGr.next()) {
            try { orphanGr.deleteRecord(); orphanCount++; }
            catch (e2) { report.errors.push('orphan profile delete: ' + String(e2)); }
        }
        if (orphanCount > 0) {
            report.removed.push('Orphan oauth_entity_profile (' + orphanCount + ')');
            gs.print('      [REMOVED] Orphan profiles — ' + orphanCount + ' record(s)');
        } else {
            report.skipped.push('Orphan oauth_entity_profile');
            gs.print('      [SKIP]    No orphan profiles found');
        }
    } catch (e) {
        report.errors.push('orphan profile check: ' + String(e));
        gs.print('      [ERROR]   Could not check orphan profiles — ' + String(e));
    }

    // ── [3] Scripted REST API artifacts ───────────────────────
    gs.print('');
    gs.print('  [3] Scripted REST API artifacts (sys_ws_provider / sys_ws_operation)');

    if (!tableExists('sys_ws_provider')) {
        gs.print('      [SKIP]    Plugin "Scripted REST API" not installed — tables absent.');
        gs.print('                Nothing to remove in this category.');
        report.skipped.push('Scripted REST providers (plugin absent)');
    } else {
        var providerNames = [
            'Operations Intelligence Build API',
            'Operations Intelligence Engine'
        ];

        for (var i = 0; i < providerNames.length; i++) {
            var pName = providerNames[i];
            try {
                var pGr = new GlideRecord('sys_ws_provider');
                pGr.addQuery('name', pName);
                pGr.setLimit(1);
                pGr.query();

                if (!pGr.next()) {
                    gs.print('      [SKIP]    Provider "' + pName + '" — not found');
                    report.skipped.push('Provider "' + pName + '"');
                    continue;
                }

                var pSysId = pGr.getUniqueValue();

                // Child resources must be deleted before the parent (FK constraint)
                var opCount = 0;
                if (tableExists('sys_ws_operation')) {
                    var opGr = new GlideRecord('sys_ws_operation');
                    opGr.addQuery('web_service_definition', pSysId);
                    opGr.query();
                    while (opGr.next()) {
                        try { opGr.deleteRecord(); opCount++; }
                        catch (e2) { report.errors.push('operation delete: ' + String(e2)); }
                    }
                }

                var pGr2 = new GlideRecord('sys_ws_provider');
                pGr2.get(pSysId);
                pGr2.deleteRecord();

                var pMsg = 'Provider "' + pName + '" + ' + opCount + ' resource(s)';
                report.removed.push(pMsg);
                gs.print('      [REMOVED] ' + pMsg);
            } catch (e) {
                report.errors.push('Provider "' + pName + '": ' + String(e));
                gs.print('      [ERROR]   Provider "' + pName + '" — ' + String(e));
            }
        }
    }

    // ── [4] Legacy svc_claude_api service account ─────────────
    gs.print('');
    gs.print('  [4] Legacy svc_claude_api service account (sys_user)');

    removeWhere('svc_claude_api user', 'sys_user',
        function(gr) { gr.addQuery('user_name', 'svc_claude_api'); });

    // ── [5] Duplicate svc_operations_intelligence_api accounts ─
    gs.print('');
    gs.print('  [5] Duplicate svc_operations_intelligence_api accounts (sys_user)');

    try {
        var dupGr = new GlideRecord('sys_user');
        dupGr.addQuery('user_name', 'svc_operations_intelligence_api');
        dupGr.orderBy('sys_created_on');
        dupGr.query();
        var firstSeen = false;
        var dupCount  = 0;
        var keptSysId = '';
        while (dupGr.next()) {
            if (!firstSeen) {
                firstSeen = true;
                keptSysId = dupGr.getUniqueValue();
            } else {
                try { dupGr.deleteRecord(); dupCount++; }
                catch (e2) { report.errors.push('dup account delete: ' + String(e2)); }
            }
        }
        if (!firstSeen) {
            gs.print('      [SKIP]    Account svc_operations_intelligence_api not found');
            report.skipped.push('svc_operations_intelligence_api (not found)');
        } else if (dupCount > 0) {
            report.removed.push('Duplicate svc_operations_intelligence_api (' + dupCount + ')');
            gs.print('      [REMOVED] ' + dupCount + ' duplicate(s) deleted — kept sys_id: ' + keptSysId);
        } else {
            gs.print('      [SKIP]    No duplicates — single account exists (sys_id: ' + keptSysId + ')');
            report.skipped.push('svc_operations_intelligence_api (no duplicates)');
        }
    } catch (e) {
        report.errors.push('duplicate account check: ' + String(e));
        gs.print('      [ERROR]   Could not check duplicate accounts — ' + String(e));
    }

    // ── [6] Stale REST Message definitions ────────────────────
    // Child functions (sys_rest_message_fn) are cascade-deleted by ServiceNow
    // when the parent REST message is removed — no separate step needed.
    gs.print('');
    gs.print('  [6] Stale REST Message definitions (sys_rest_message)');

    removeWhere('REST Message: Operations Intelligence', 'sys_rest_message',
        function(gr) { gr.addQuery('name', 'CONTAINS', 'Operations Intelligence'); });

    // ── [7] Engine key system property ────────────────────────
    gs.print('');
    gs.print('  [7] Engine key system property (x_infte_ops_int.engine_key)');

    try {
        var propGr = new GlideRecord('sys_properties');
        propGr.addQuery('name', 'x_infte_ops_int.engine_key');
        propGr.setLimit(1);
        propGr.query();
        if (propGr.next()) {
            propGr.deleteRecord();
            report.removed.push('System property x_infte_ops_int.engine_key');
            gs.print('      [REMOVED] x_infte_ops_int.engine_key deleted — Script 2 will generate a fresh key');
        } else {
            report.skipped.push('x_infte_ops_int.engine_key (not found)');
            gs.print('      [SKIP]    x_infte_ops_int.engine_key — not set yet');
        }
    } catch (e) {
        report.errors.push('engine key property: ' + String(e));
        gs.print('      [ERROR]   x_infte_ops_int.engine_key — ' + String(e));
    }

    // ── FINAL REPORT ──────────────────────────────────────────
    gs.print('');
    gs.print(SEP);
    gs.print('  CLEANUP COMPLETE — ALL STEPS RAN');
    gs.print(SEP);
    gs.print('');
    gs.print('  Removed : ' + report.removed.length + ' item group(s)');
    gs.print('  Skipped : ' + report.skipped.length + ' (not found or already clean)');
    gs.print('  Errors  : ' + report.errors.length);

    if (report.removed.length > 0) {
        gs.print('');
        gs.print('  Removed:');
        for (var r = 0; r < report.removed.length; r++) {
            gs.print('    - ' + report.removed[r]);
        }
    }

    if (report.errors.length > 0) {
        gs.print('');
        gs.print('  Errors (non-fatal — other steps continued):');
        for (var err = 0; err < report.errors.length; err++) {
            gs.print('    ! ' + report.errors[err]);
        }
    }

    gs.print('');
    gs.print(SEP2);
    gs.print('  NEXT STEP');
    gs.print(SEP2);
    if (!tableExists('sys_ws_provider')) {
        gs.print('  ** Scripted REST API plugin is NOT installed. **');
        gs.print('  1. All > System Definition > Plugins');
        gs.print('  2. Search "Scripted REST API" (com.snc.scripted.rest.api)');
        gs.print('  3. Click Activate/Upgrade and wait for completion');
        gs.print('  4. Then: switch scope to "Operations Intelligence"');
        gs.print('           (x_infte_ops_int) and run 02_engine_setup.js');
    } else {
        gs.print('  Plugin is installed. Switch scope picker to');
        gs.print('  "Operations Intelligence" (x_infte_ops_int)');
        gs.print('  and run 02_engine_setup.js.');
    }
    gs.print(SEP);
    gs.print('');

})();
