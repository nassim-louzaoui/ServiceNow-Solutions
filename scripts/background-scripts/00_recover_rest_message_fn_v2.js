// ============================================================
// RECOVERY V2 — sys_rest_message_fn sub-table records
// Run in GLOBAL scope
// ============================================================
// PURPOSE:
//   The first recovery script (00_recover_rest_message_fn.js)
//   correctly restored 111 main REST Message Function records.
//   98 records failed because the script extracted the wrong
//   table name and sys_id for sub-type records:
//
//     update version name format: {actual_table}_{sys_id}
//     e.g. sys_rest_message_fn_headers_02c6c9ad...
//          → table: sys_rest_message_fn_headers
//          → sys_id: 02c6c9ad...
//
//   The original script stripped only "sys_rest_message_fn_"
//   from the name, leaving "headers_02c6c9ad..." as a fake
//   sys_id, then tried to insert into the wrong table.
//   The Business Rule "Set HTTP method on insert" rejected all 98.
//
//   This script correctly parses table name and sys_id, skips
//   records already restored (already exist in DB), and uses
//   setWorkflow(false) + autoSysFields(false) to insert
//   sub-type records cleanly.
//
// SAFE TO RE-RUN — existence check prevents duplicates.
// ============================================================

(function recoverV2() {
    'use strict';

    var SEP  = '============================================================';
    var SEP2 = '------------------------------------------------------------';

    var restored = 0;
    var skipped  = 0;
    var failed   = [];
    var tablesSeen = {};

    gs.print('');
    gs.print(SEP);
    gs.print('  RECOVERY V2 — sys_rest_message_fn sub-table records');
    gs.print(SEP);
    gs.print('');

    // ── Parse simple XML element value ────────────────────────
    function xmlVal(xml, tag) {
        try {
            var s = String(xml);
            // Match <tag ...>value</tag> or <tag>value</tag>
            var start = s.indexOf('<' + tag + '>');
            if (start === -1) {
                // Try with attributes: <tag attr="...">
                var re = new RegExp('<' + tag + '\\s[^>]*>');
                var m = re.exec(s);
                if (!m) return '';
                start = m.index + m[0].length - 1; // position of '>'
                start = s.indexOf('>', start) + 1;
            } else {
                start += tag.length + 2;
            }
            var end = s.indexOf('</' + tag + '>', start);
            if (end === -1) return '';
            return s.substring(start, end)
                .replace(/&lt;/g,  '<')
                .replace(/&gt;/g,  '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
        } catch (e) { return ''; }
    }

    // ── Extract all field name/value pairs from payload XML ───
    function extractFields(xml) {
        var fields = {};
        try {
            var s = String(xml);
            // Find <record_update> or <fields> section
            // ServiceNow update set XML: <{tablename}><field>value</field>...</{tablename}>
            // Pull out every element inside the root element
            var rootStart = s.indexOf('<', s.indexOf('<?') + 1);
            // Skip XML declaration and find first real element
            var declEnd = s.indexOf('?>');
            if (declEnd !== -1) rootStart = s.indexOf('<', declEnd + 2);
            var rootTagEnd = s.indexOf('>', rootStart);
            if (rootStart === -1 || rootTagEnd === -1) return fields;

            var rootTag = s.substring(rootStart + 1, rootTagEnd).split(/\s/)[0];
            var innerStart = rootTagEnd + 1;
            var innerEnd = s.lastIndexOf('</' + rootTag + '>');
            if (innerEnd === -1) innerEnd = s.length;
            var inner = s.substring(innerStart, innerEnd);

            // Match all <fieldname ...>value</fieldname> pairs
            var tagRe = /<([a-z_][a-z0-9_]*)(?:\s[^>]*)?>([^<]*(?:<!\[CDATA\[[\s\S]*?\]\]>[^<]*)*)<\/\1>/g;
            var match;
            while ((match = tagRe.exec(inner)) !== null) {
                var fName = match[1];
                var fVal  = match[2];
                // Unwrap CDATA if present
                fVal = fVal.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
                // Decode entities
                fVal = fVal
                    .replace(/&lt;/g,  '<')
                    .replace(/&gt;/g,  '>')
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'");
                fields[fName] = fVal;
            }
        } catch (e) {
            gs.print('      [WARN] Field extraction error: ' + String(e));
        }
        return fields;
    }

    // ── Check table exists ─────────────────────────────────────
    function tableExists(tbl) {
        var t = new GlideRecord('sys_db_object');
        t.addQuery('name', tbl);
        t.setLimit(1);
        t.query();
        return t.next();
    }

    // ── Query all sys_rest_message_fn* update versions ─────────
    gs.print('  Scanning sys_update_version ...');

    var uvGr = new GlideRecord('sys_update_version');
    uvGr.addQuery('name', 'STARTSWITH', 'sys_rest_message_fn_');
    uvGr.addQuery('state', '!=', 'history');
    uvGr.query();

    var total = 0;
    while (uvGr.next()) {
        total++;
        var vName = uvGr.getValue('name');

        // ── Parse table name and sys_id from version name ─────
        // Format: {table_name}_{32-char-hex-sys_id}
        // sys_id is always exactly 32 lowercase hex chars at the end
        var sysId    = vName.substring(vName.length - 32);
        var tblName  = vName.substring(0, vName.length - 33); // remove _sysid

        // Validate sys_id is 32 hex characters
        if (!/^[0-9a-f]{32}$/i.test(sysId)) {
            gs.print('  [SKIP] Unexpected name format: ' + vName);
            skipped++;
            continue;
        }

        // Track which sub-tables we encounter
        if (!tablesSeen[tblName]) tablesSeen[tblName] = 0;
        tablesSeen[tblName]++;

        // ── Skip main function records — already restored in V1 ─
        if (tblName === 'sys_rest_message_fn') {
            // Check if it exists; if yes, skip; if no, restore
            var existMain = new GlideRecord('sys_rest_message_fn');
            if (existMain.get(sysId)) {
                skipped++;
                continue;
            }
            // Not found — restore it too (belt and suspenders)
        }

        // ── Check if this table exists on this instance ────────
        if (!tableExists(tblName)) {
            // Sub-table may not exist if plugin that owns it is absent
            skipped++;
            continue;
        }

        // ── Check if record already exists ────────────────────
        var existCheck = new GlideRecord(tblName);
        if (existCheck.get(sysId)) {
            skipped++;  // Already in DB — no action needed
            continue;
        }

        // ── Extract fields from update version XML payload ─────
        var payload = uvGr.getValue('payload') || '';
        var fields  = extractFields(payload);

        // ── Insert with Business Rules and auto-fields bypassed ─
        try {
            var gr = new GlideRecord(tblName);
            gr.initialize();
            for (var f in fields) {
                if (!fields.hasOwnProperty(f)) continue;
                if (f === 'sys_id') continue; // set separately below
                try { gr.setValue(f, fields[f]); } catch (fe) { /* skip read-only/non-existent fields */ }
            }
            gr.setValue('sys_id', sysId);
            gr.setWorkflow(false);     // bypass Business Rules (incl. "Set HTTP method on insert")
            gr.autoSysFields(false);   // preserve original sys_created_on, sys_updated_on, etc.

            var inserted = gr.insert();
            if (inserted) {
                restored++;
                gs.print('  [OK]   Restored ' + tblName + '_' + sysId);
            } else {
                failed.push(tblName + '_' + sysId + ' (insert returned null)');
                gs.print('  [FAIL] ' + tblName + '_' + sysId);
            }
        } catch (e) {
            failed.push(tblName + '_' + sysId + ': ' + String(e));
            gs.print('  [ERR]  ' + tblName + '_' + sysId + ' — ' + String(e));
        }
    }

    // ── REPORT ────────────────────────────────────────────────
    gs.print('');
    gs.print(SEP);
    gs.print('  RECOVERY V2 — COMPLETE');
    gs.print(SEP);
    gs.print('');
    gs.print('  Total update versions scanned : ' + total);
    gs.print('  Skipped (already exist/absent): ' + skipped);
    gs.print('  Newly restored                : ' + restored);
    gs.print('  Failed                        : ' + failed.length);

    gs.print('');
    gs.print('  Sub-tables encountered:');
    for (var tbl in tablesSeen) {
        if (tablesSeen.hasOwnProperty(tbl)) {
            gs.print('    ' + tbl + ' (' + tablesSeen[tbl] + ' version(s))');
        }
    }

    if (failed.length > 0) {
        gs.print('');
        gs.print('  Failed records:');
        for (var fi = 0; fi < failed.length; fi++) {
            gs.print('    ! ' + failed[fi]);
        }
        gs.print('');
        gs.print('  If failures remain after this run, those records likely');
        gs.print('  belong to tables with strict write-protection or mandatory');
        gs.print('  fields not captured in the update set XML. A ServiceNow');
        gs.print('  Support ticket for point-in-time restore is the only');
        gs.print('  remaining option for those specific records.');
    }

    if (restored === 0 && failed.length === 0) {
        gs.print('');
        gs.print('  Nothing new to restore — all found records already exist.');
        gs.print('  Recovery is complete.');
    }

    gs.print(SEP);
    gs.print('');

})();
