// ============================================================
// RECOVERY DIAGNOSTIC — Deleted sys_rest_message_fn Records
// Run in GLOBAL scope
// ============================================================
// PURPOSE:
//   107 sys_rest_message_fn records were accidentally deleted.
//   This script checks every ServiceNow recovery source and
//   restores as many records as possible automatically.
//
//   Recovery sources checked (in order of reliability):
//     [A] sys_update_version — update set XML (best source)
//     [B] sys_audit_delete   — deletion audit log
//     [C] sys_audit          — field-level change history
//
//   Runs read-only diagnostics first, then restores what it can.
// ============================================================

(function recoverRestMessageFn() {
    'use strict';

    var SEP  = '============================================================';
    var SEP2 = '------------------------------------------------------------';

    // Approximate time the deletion happened — adjust if needed
    // (script looks back 4 hours to be safe)
    var LOOKBACK_HOURS = 4;
    var cutoff = new GlideDateTime();
    cutoff.addSeconds(-(LOOKBACK_HOURS * 3600));

    var restored   = [];
    var found      = {};  // sys_id → true, prevents duplicates across sources
    var report     = { sourceA: 0, sourceB: 0, sourceC: 0, restored: 0, failed: [] };

    gs.print('');
    gs.print(SEP);
    gs.print('  RECOVERY — sys_rest_message_fn (accidentally deleted records)');
    gs.print(SEP);
    gs.print('  Lookback window: ' + LOOKBACK_HOURS + ' hours (since ' + cutoff.getDisplayValue() + ')');
    gs.print('');

    // ── Helper: attempt to insert a record from a field map ────
    function restoreRecord(sysId, fieldMap, source) {
        if (found[sysId]) return;  // already restored from another source
        found[sysId] = true;
        try {
            var gr = new GlideRecord('sys_rest_message_fn');
            gr.initialize();
            for (var f in fieldMap) {
                if (fieldMap.hasOwnProperty(f) && f !== 'sys_id') {
                    try { gr.setValue(f, fieldMap[f]); } catch (ef) { /* skip unwritable fields */ }
                }
            }
            // Preserve original sys_id so references stay intact
            gr.setValue('sys_id', sysId);
            var inserted = gr.insert();
            if (inserted) {
                restored.push({ sysId: sysId, source: source });
                report.restored++;
                gs.print('      [OK]     Restored ' + sysId + ' (from ' + source + ')');
            } else {
                report.failed.push(sysId + ' (insert returned null, source: ' + source + ')');
                gs.print('      [FAIL]   Could not insert ' + sysId + ' (source: ' + source + ')');
            }
        } catch (e) {
            report.failed.push(sysId + ': ' + String(e));
            gs.print('      [ERROR]  ' + sysId + ' — ' + String(e));
        }
    }

    // ── Helper: parse simple XML element value ─────────────────
    function xmlVal(xml, tag) {
        try {
            var re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
            var m = String(xml).match(re);
            return m ? m[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'") : '';
        } catch (e) { return ''; }
    }

    // ── SOURCE A: sys_update_version (update set XML) ──────────
    gs.print('  [A] Checking sys_update_version for update set records ...');
    try {
        var uvGr = new GlideRecord('sys_update_version');
        uvGr.addQuery('name', 'STARTSWITH', 'sys_rest_message_fn_');
        uvGr.addQuery('state', '!=', 'history');
        uvGr.query();
        var uvCount = 0;
        while (uvGr.next()) {
            uvCount++;
            report.sourceA++;
            var sysId = uvGr.getValue('name').replace('sys_rest_message_fn_', '');
            var xmlPayload = uvGr.getValue('payload');
            if (!xmlPayload || found[sysId]) continue;

            // Extract key fields from update set XML payload
            var fields = {};
            var fieldNames = [
                'rest_message','function_name','http_method','endpoint','content_type',
                'rest_endpoint','authentication_type','use_mutual_auth','mutual_auth_profile',
                'basic_auth_profile','oauth_profile','mid_entry_point','use_proxy_data',
                'timeout','log_level','name'
            ];
            for (var fi = 0; fi < fieldNames.length; fi++) {
                var v = xmlVal(xmlPayload, fieldNames[fi]);
                if (v !== '') fields[fieldNames[fi]] = v;
            }
            restoreRecord(sysId, fields, 'sys_update_version');
        }
        gs.print('      Found ' + uvCount + ' update version record(s) for sys_rest_message_fn');
        if (uvCount === 0) {
            gs.print('      These records were likely not captured in any update set.');
        }
    } catch (e) {
        gs.print('      [ERROR] Could not query sys_update_version: ' + String(e));
    }

    // ── SOURCE B: sys_audit_delete ─────────────────────────────
    gs.print('');
    gs.print('  [B] Checking sys_audit_delete for deletion records ...');
    try {
        var adGr = new GlideRecord('sys_audit_delete');
        adGr.addQuery('tablename', 'sys_rest_message_fn');
        adGr.addQuery('sys_created_on', '>=', cutoff);
        adGr.query();
        var adCount = 0;
        while (adGr.next()) {
            adCount++;
            report.sourceB++;
            var adSysId = adGr.getValue('documentkey');
            if (found[adSysId]) continue;

            // sys_audit_delete may store record data in various fields
            var adFields = {};
            var adXml = adGr.getValue('record') || adGr.getValue('xml') || '';
            if (adXml) {
                var adFieldNames = [
                    'rest_message','function_name','http_method','endpoint','content_type',
                    'rest_endpoint','authentication_type','name','log_level','timeout'
                ];
                for (var afi = 0; afi < adFieldNames.length; afi++) {
                    var av = xmlVal(adXml, adFieldNames[afi]);
                    if (av !== '') adFields[adFieldNames[afi]] = av;
                }
                if (Object.keys(adFields).length > 0) {
                    restoreRecord(adSysId, adFields, 'sys_audit_delete');
                } else {
                    gs.print('      [INFO]   sys_id ' + adSysId + ' found in audit_delete but XML is empty');
                }
            } else {
                gs.print('      [INFO]   sys_id ' + adSysId + ' found in audit_delete but no XML payload stored');
            }
        }
        gs.print('      Found ' + adCount + ' deletion audit record(s) for sys_rest_message_fn');
        if (adCount === 0) {
            gs.print('      Deletion auditing may not be enabled for this table.');
        }
    } catch (e) {
        gs.print('      [ERROR] Could not query sys_audit_delete: ' + String(e));
        gs.print('              (Table may not exist on this instance)');
    }

    // ── SOURCE C: sys_audit (field-level history) ──────────────
    gs.print('');
    gs.print('  [C] Checking sys_audit for field-level history ...');
    try {
        // Collect unique sys_ids modified/created in sys_rest_message_fn history
        var saGr = new GlideAggregate('sys_audit');
        saGr.addQuery('tablename', 'sys_rest_message_fn');
        saGr.addQuery('sys_created_on', '>=', cutoff);
        saGr.groupBy('documentkey');
        saGr.query();
        var saCount = 0;
        while (saGr.next()) {
            saCount++;
            var saSysId = saGr.getValue('documentkey');
            if (found[saSysId]) continue;
            report.sourceC++;

            // Rebuild field map from individual audit entries
            var saFields = {};
            var fieldGr = new GlideRecord('sys_audit');
            fieldGr.addQuery('tablename', 'sys_rest_message_fn');
            fieldGr.addQuery('documentkey', saSysId);
            fieldGr.orderByDesc('sys_created_on');
            fieldGr.query();
            while (fieldGr.next()) {
                var fn = fieldGr.getValue('fieldname');
                if (fn && !saFields.hasOwnProperty(fn)) {
                    saFields[fn] = fieldGr.getValue('newvalue') || fieldGr.getValue('oldvalue') || '';
                }
            }
            if (Object.keys(saFields).length > 0) {
                restoreRecord(saSysId, saFields, 'sys_audit');
            }
        }
        gs.print('      Found ' + saCount + ' audit entry group(s) for sys_rest_message_fn');
    } catch (e) {
        gs.print('      [ERROR] Could not query sys_audit: ' + String(e));
    }

    // ── FINAL REPORT ──────────────────────────────────────────
    gs.print('');
    gs.print(SEP);
    gs.print('  RECOVERY REPORT');
    gs.print(SEP);
    gs.print('');
    gs.print('  Records found in sys_update_version : ' + report.sourceA);
    gs.print('  Records found in sys_audit_delete   : ' + report.sourceB);
    gs.print('  Records found in sys_audit          : ' + report.sourceC);
    gs.print('  Records successfully restored        : ' + report.restored);
    gs.print('  Records failed to restore            : ' + report.failed.length);

    if (report.restored > 0) {
        gs.print('');
        gs.print('  Restored sys_ids:');
        for (var ri = 0; ri < restored.length; ri++) {
            gs.print('    + ' + restored[ri].sysId + ' (source: ' + restored[ri].source + ')');
        }
    }

    if (report.failed.length > 0) {
        gs.print('');
        gs.print('  Failed:');
        for (var fli = 0; fli < report.failed.length; fli++) {
            gs.print('    ! ' + report.failed[fli]);
        }
    }

    gs.print('');
    gs.print(SEP2);

    var totalFound = report.sourceA + report.sourceB + report.sourceC;
    if (totalFound === 0) {
        gs.print('  NO RECOVERY DATA FOUND IN AUDIT/UPDATE-SET TABLES.');
        gs.print('  The deleted records were not part of any update set and');
        gs.print('  deletion auditing was not capturing sys_rest_message_fn.');
        gs.print('');
        gs.print('  Options:');
        gs.print('  1. ServiceNow Support — request a point-in-time restore of');
        gs.print('     the sys_rest_message_fn table (requires active support ticket).');
        gs.print('  2. Check if the instance has a recent clone/backup in');
        gs.print('     System Clone > Clone Instances.');
        gs.print('  3. Check if affected REST Messages have a source plugin that');
        gs.print('     can be deactivated + reactivated to re-seed the functions.');
    } else if (report.restored < totalFound) {
        gs.print('  PARTIAL RECOVERY — ' + report.restored + ' of ' + totalFound + ' found records restored.');
        gs.print('  For the remainder, contact ServiceNow Support for a backup restore.');
    } else {
        gs.print('  FULL RECOVERY — all found records restored successfully.');
    }

    gs.print(SEP);
    gs.print('');

})();
