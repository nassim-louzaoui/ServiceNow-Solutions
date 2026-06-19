// ============================================================
// OPERATIONS INTELLIGENCE — ENGINE SETUP
// Run in APPLICATION scope  (scope picker = "Operations Intelligence")
// ============================================================
//
// PREREQUISITES
//   Script 1 (01_global_cleanup.js) must have been run in Global scope.
//
// WHAT THIS CREATES
//   "Operations Intelligence Engine" — a Scripted REST API that is
//   the sole remote interface used to build and manage the entire
//   Operations Intelligence platform.
//
//   Endpoint : POST /api/x_infte_ops_int/ops_int_engine/v1
//   Security : X-Engine-Key request header
//              Value is auto-generated and stored in system property
//              x_infte_ops_int.engine_key  (never committed to source)
//
// ENGINE OPERATIONS
//   ping            health check — confirms endpoint is live
//   scope.info      instance URL, app name, sys_id, version
//   table.exists    check whether a table exists
//   record.insert   create a record in any table
//   record.update   update a record by sys_id
//   record.upsert   insert-or-update based on a unique key set
//   record.delete   delete a record by sys_id
//   record.query    query records with field filters or encoded query
//   record.get      fetch a single record by sys_id
//   record.count    count records matching a filter
//   property.set    write a system property
//   property.get    read a system property
//   batch           execute multiple operations in one HTTP call
//                   (stop_on_error: false to continue past failures)
//
// PLUGIN REQUIREMENT
//   The Scripted REST API plugin (com.snc.scripted.rest.api) must be
//   active. This script detects a missing plugin and attempts to
//   activate it automatically; if auto-activation fails it prints
//   the manual UI steps and exits cleanly.
//
// IF THE ENDPOINT RETURNS 302 AFTER RUNNING
//   The requires_authentication flag did not persist due to a scope
//   restriction. Fix in the UI (one-time only):
//     All > System Web Services > Scripted REST APIs
//     Open "Operations Intelligence Engine"
//       → uncheck "Requires authentication" → Save
//     Resources tab → open "Engine Router"
//       → uncheck "Requires authentication" → Save
//
// SAFE TO RE-RUN — all steps are idempotent.
// ============================================================

(function engineSetup() {
    'use strict';

    var SEP  = '============================================================';
    var SEP2 = '------------------------------------------------------------';

    var APP_SCOPE      = 'x_infte_ops_int';
    var PROVIDER_NAME  = 'Operations Intelligence Engine';
    var SERVICE_ID     = 'ops_int_engine';
    var OPERATION_NAME = 'Engine Router';
    var OP_URI         = '/v1';
    var KEY_PROP       = APP_SCOPE + '.engine_key';

    var errors = [];

    gs.info('');
    gs.info(SEP);
    gs.info('  OPERATIONS INTELLIGENCE — ENGINE SETUP');
    gs.info(SEP);

    // ══════════════════════════════════════════════════════════
    //  GUARD — scope check
    // ══════════════════════════════════════════════════════════
    var currentScope = gs.getCurrentScopeName();
    if (!currentScope || currentScope === 'global') {
        gs.info('');
        gs.info('  ERROR: You are in GLOBAL scope.');
        gs.info('  Switch to "Operations Intelligence" (' + APP_SCOPE + ')');
        gs.info('  using the scope picker, then re-run.');
        gs.info('');
        return;
    }
    if (currentScope !== APP_SCOPE) {
        gs.info('');
        gs.info('  ERROR: Wrong scope — currently "' + currentScope + '".');
        gs.info('  Switch to ' + APP_SCOPE + ' and re-run.');
        gs.info('');
        return;
    }
    gs.info('  Scope : ' + currentScope);

    // ══════════════════════════════════════════════════════════
    //  STEP 1 — Locate scoped application sys_id
    // ══════════════════════════════════════════════════════════
    gs.info('');
    gs.info('  [STEP 1] Locate scoped application');

    var scopeSysId = null;
    try {
        var appGr = new GlideRecord('sys_scope');
        appGr.addQuery('scope', APP_SCOPE);
        appGr.setLimit(1);
        appGr.query();
        if (appGr.next()) {
            scopeSysId = appGr.getUniqueValue();
            gs.info('      App Name : ' + appGr.getValue('name'));
            gs.info('      Sys ID   : ' + scopeSysId);
        } else {
            gs.info('      ERROR: Scoped app not found in sys_scope — cannot continue.');
            return;
        }
    } catch (e) {
        gs.info('      ERROR: ' + String(e));
        return;
    }

    // ══════════════════════════════════════════════════════════
    //  STEP 2 — Verify / activate Scripted REST API plugin
    // ══════════════════════════════════════════════════════════
    gs.info('');
    gs.info('  [STEP 2] Verify Scripted REST API plugin (com.snc.scripted.rest.api)');

    var providerTableExists = false;
    try {
        var tblChk = new GlideRecord('sys_db_object');
        tblChk.addQuery('name', 'sys_ws_provider');
        tblChk.setLimit(1);
        tblChk.query();
        providerTableExists = tblChk.next();
    } catch (e) {
        gs.info('      Table check threw: ' + String(e));
    }

    if (!providerTableExists) {
        gs.info('      sys_ws_provider : NOT FOUND');
        gs.info('      Attempting automatic plugin activation...');

        var activated = false;
        try {
            var pm = new GlidePluginManager();
            pm.install('com.snc.scripted.rest.api');
            activated = true;
            gs.info('      Activation request submitted.');
        } catch (pe) {
            gs.info('      Auto-activation failed: ' + String(pe));
        }

        gs.info('');
        if (activated) {
            gs.info('  Plugin activation was requested. It may take 1–3 minutes.');
            gs.info('  Re-run this script once activation completes.');
        } else {
            gs.info('  MANUAL ACTIVATION REQUIRED:');
            gs.info('  1. All > System Definition > Plugins');
            gs.info('  2. Search: "Scripted REST API"');
            gs.info('  3. Click "Activate/Upgrade" on com.snc.scripted.rest.api');
            gs.info('  4. Wait for activation to finish, then re-run this script.');
        }
        gs.info('');
        gs.info(SEP);
        return;
    }
    gs.info('      sys_ws_provider  : OK');

    var operTableExists = false;
    try {
        var tblChk2 = new GlideRecord('sys_db_object');
        tblChk2.addQuery('name', 'sys_ws_operation');
        tblChk2.setLimit(1);
        tblChk2.query();
        operTableExists = tblChk2.next();
    } catch (e) {}
    gs.info('      sys_ws_operation : ' + (operTableExists ? 'OK' : 'MISSING'));
    if (!operTableExists) {
        gs.info('      ERROR: sys_ws_operation missing. Plugin may be partially installed.');
        return;
    }

    // ══════════════════════════════════════════════════════════
    //  STEP 3 — Generate / retrieve engine API key
    // ══════════════════════════════════════════════════════════
    gs.info('');
    gs.info('  [STEP 3] Engine API key');

    var engineKey = '';
    try {
        var existingKey = gs.getProperty(KEY_PROP, '');
        if (existingKey && existingKey.length >= 20) {
            engineKey = existingKey;
            gs.info('      Reusing existing key from property ' + KEY_PROP);
        } else {
            var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
            for (var ki = 0; ki < 40; ki++) {
                engineKey += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
            }
            gs.setProperty(KEY_PROP, engineKey,
                'Operations Intelligence Engine API key. Treat as a secret credential.');
            gs.info('      Generated new 40-char key and stored in ' + KEY_PROP);
        }
        gs.info('      Key length : ' + engineKey.length);
    } catch (e) {
        gs.info('      ERROR: ' + String(e));
        errors.push('Key step: ' + String(e));
    }

    // ══════════════════════════════════════════════════════════
    //  STEP 4 — Probe field availability on both tables
    // ══════════════════════════════════════════════════════════
    gs.info('');
    gs.info('  [STEP 4] Probe sys_ws_provider fields');

    var pHasServiceId = false, pHasNoAuth = false, pHasAccess = false;
    try {
        var provProbe = new GlideRecord('sys_ws_provider');
        provProbe.setLimit(1);
        provProbe.query();
        try { provProbe.getValue('service_id');             pHasServiceId = true; } catch(e) {}
        try { provProbe.getValue('requires_authentication'); pHasNoAuth    = true; } catch(e) {}
        try { provProbe.getValue('access');                 pHasAccess    = true; } catch(e) {}
    } catch (e) { gs.info('      Probe exception: ' + String(e)); }
    gs.info('      service_id              : ' + (pHasServiceId ? 'yes' : 'no'));
    gs.info('      requires_authentication : ' + (pHasNoAuth    ? 'yes' : 'no'));
    gs.info('      access                  : ' + (pHasAccess    ? 'yes' : 'no'));

    gs.info('');
    gs.info('  [STEP 4b] Probe sys_ws_operation fields');

    var oHasOpUri = false, oHasMethod = false, oHasNoAuth = false, oHasAccess = false;
    try {
        var operProbe = new GlideRecord('sys_ws_operation');
        operProbe.setLimit(1);
        operProbe.query();
        try { operProbe.getValue('operation_uri');          oHasOpUri  = true; } catch(e) {}
        try { operProbe.getValue('http_method');            oHasMethod = true; } catch(e) {}
        try { operProbe.getValue('requires_authentication'); oHasNoAuth = true; } catch(e) {}
        try { operProbe.getValue('access');                 oHasAccess = true; } catch(e) {}
    } catch (e) { gs.info('      Probe exception: ' + String(e)); }
    gs.info('      operation_uri           : ' + (oHasOpUri  ? 'yes' : 'no'));
    gs.info('      http_method             : ' + (oHasMethod ? 'yes' : 'no'));
    gs.info('      requires_authentication : ' + (oHasNoAuth ? 'yes' : 'no'));
    gs.info('      access                  : ' + (oHasAccess ? 'yes' : 'no'));

    // ══════════════════════════════════════════════════════════
    //  STEP 5 — Assemble engine operation script
    //
    //  This GlideScript runs inside ServiceNow every time the
    //  endpoint is called. It is stored in sys_ws_operation.script.
    //  Single quotes inside each array element are escaped as \'
    //  because the outer strings use single quotes.
    // ══════════════════════════════════════════════════════════
    gs.info('');
    gs.info('  [STEP 5] Assembling engine operation script');

    var L = [
        '(function process(request, response) {',
        '    // ── Authentication ──────────────────────────────────',
        '    var K = gs.getProperty(\'x_infte_ops_int.engine_key\', \'\');',
        '    if (!K) {',
        '        response.setStatus(503);',
        '        response.setBody({ ok: false, error: \'Engine key not configured\' });',
        '        return;',
        '    }',
        '    if ((request.headers.getHeader(\'X-Engine-Key\') || \'\') !== K) {',
        '        response.setStatus(403);',
        '        response.setBody({ ok: false, error: \'Forbidden\' });',
        '        return;',
        '    }',
        '',
        '    // ── Parse body ──────────────────────────────────────',
        '    var body = {};',
        '    try { body = request.body.data || {}; } catch (e) { body = {}; }',
        '',
        '    // ── Operation router ────────────────────────────────',
        '    function run(op) {',
        '        var r = { ok: true, op: op.op };',
        '        var gr, data, key, row, rows, fields, val, sc, ag, url, f, dbgr, agg, ukey;',
        '        try {',
        '',
        '            // ── ping ──────────────────────────────────────',
        '            if (op.op === \'ping\') {',
        '                r.message  = \'Operations Intelligence Engine is active\';',
        '                r.ts       = new GlideDateTime().toString();',
        '                r.scope    = gs.getCurrentScopeName();',
        '                r.instance = gs.getProperty(\'instance_name\', \'\');',
        '',
        '            // ── scope.info ────────────────────────────────',
        '            } else if (op.op === \'scope.info\') {',
        '                sc  = gs.getCurrentScopeName();',
        '                ag  = new GlideRecord(\'sys_app\');',
        '                ag.addQuery(\'scope\', sc); ag.setLimit(1); ag.query();',
        '                url = gs.getProperty(\'glide.servlet.uri\', \'\') || \'\';',
        '                if (url.charAt(url.length - 1) === \'/\') url = url.slice(0, -1);',
        '                r.scope    = sc;',
        '                r.instance = gs.getProperty(\'instance_name\', \'\');',
        '                r.url      = url;',
        '                if (ag.next()) {',
        '                    r.app_name   = ag.getValue(\'name\');',
        '                    r.app_sys_id = ag.getUniqueValue();',
        '                    r.version    = ag.getValue(\'version\');',
        '                }',
        '',
        '            // ── table.exists ──────────────────────────────',
        '            } else if (op.op === \'table.exists\') {',
        '                dbgr = new GlideRecord(\'sys_db_object\');',
        '                dbgr.addQuery(\'name\', op.table); dbgr.setLimit(1); dbgr.query();',
        '                r.exists = dbgr.next();',
        '                if (r.exists) r.sys_id = dbgr.getUniqueValue();',
        '',
        '            // ── record.insert ─────────────────────────────',
        '            } else if (op.op === \'record.insert\') {',
        '                gr = new GlideRecord(op.table); gr.initialize();',
        '                data = op.data || {};',
        '                for (key in data) { if (data.hasOwnProperty(key)) gr.setValue(key, data[key]); }',
        '                r.sys_id  = gr.insert();',
        '                r.success = !!r.sys_id;',
        '',
        '            // ── record.update ─────────────────────────────',
        '            } else if (op.op === \'record.update\') {',
        '                gr = new GlideRecord(op.table);',
        '                if (gr.get(op.sys_id)) {',
        '                    data = op.data || {};',
        '                    for (key in data) { if (data.hasOwnProperty(key)) gr.setValue(key, data[key]); }',
        '                    gr.update();',
        '                    r.success = true;',
        '                    r.sys_id  = op.sys_id;',
        '                } else { r.ok = false; r.error = \'Not found: \' + op.sys_id; }',
        '',
        '            // ── record.upsert ─────────────────────────────',
        '            // Finds a record by unique_key fields; updates if',
        '            // found, inserts if not. Returns action: inserted|updated.',
        '            } else if (op.op === \'record.upsert\') {',
        '                ukey = op.unique_key || {};',
        '                data = op.data       || {};',
        '                gr   = new GlideRecord(op.table);',
        '                for (key in ukey) { if (ukey.hasOwnProperty(key)) gr.addQuery(key, ukey[key]); }',
        '                gr.setLimit(1); gr.query();',
        '                if (gr.next()) {',
        '                    for (key in data) { if (data.hasOwnProperty(key)) gr.setValue(key, data[key]); }',
        '                    gr.update();',
        '                    r.sys_id = gr.getUniqueValue(); r.action = \'updated\'; r.success = true;',
        '                } else {',
        '                    gr = new GlideRecord(op.table); gr.initialize();',
        '                    for (key in ukey) { if (ukey.hasOwnProperty(key)) gr.setValue(key, ukey[key]); }',
        '                    for (key in data) { if (data.hasOwnProperty(key)) gr.setValue(key, data[key]); }',
        '                    r.sys_id = gr.insert(); r.action = \'inserted\'; r.success = !!r.sys_id;',
        '                }',
        '',
        '            // ── record.delete ─────────────────────────────',
        '            } else if (op.op === \'record.delete\') {',
        '                gr = new GlideRecord(op.table);',
        '                if (gr.get(op.sys_id)) { gr.deleteRecord(); r.success = true; }',
        '                else { r.ok = false; r.error = \'Not found: \' + op.sys_id; }',
        '',
        '            // ── record.query ──────────────────────────────',
        '            // filter: { field: value, ... } or { _encoded: "encodedQuery" }',
        '            // fields: ["f1","f2"] — if omitted only sys_id is returned',
        '            // limit: max rows (cap 500)',
        '            // order_by: field name',
        '            } else if (op.op === \'record.query\') {',
        '                gr = new GlideRecord(op.table);',
        '                f  = op.filter || {};',
        '                if (f._encoded) {',
        '                    gr.addEncodedQuery(f._encoded);',
        '                } else {',
        '                    for (key in f) { if (f.hasOwnProperty(key)) gr.addQuery(key, f[key]); }',
        '                }',
        '                if (op.order_by) gr.orderBy(op.order_by);',
        '                gr.setLimit(Math.min(op.limit || 10, 500)); gr.query();',
        '                rows = []; fields = op.fields || [];',
        '                while (gr.next()) {',
        '                    row = { sys_id: gr.getUniqueValue() };',
        '                    fields.forEach(function (x) { row[x] = gr.getValue(x); });',
        '                    rows.push(row);',
        '                }',
        '                r.rows  = rows;',
        '                r.count = rows.length;',
        '',
        '            // ── record.get ────────────────────────────────',
        '            } else if (op.op === \'record.get\') {',
        '                gr = new GlideRecord(op.table);',
        '                if (gr.get(op.sys_id)) {',
        '                    row    = { sys_id: gr.getUniqueValue() };',
        '                    fields = op.fields || [];',
        '                    fields.forEach(function (x) { row[x] = gr.getValue(x); });',
        '                    r.record = row; r.found = true;',
        '                } else { r.found = false; }',
        '',
        '            // ── record.count ──────────────────────────────',
        '            } else if (op.op === \'record.count\') {',
        '                agg = new GlideAggregate(op.table);',
        '                f   = op.filter || {};',
        '                if (f._encoded) { agg.addEncodedQuery(f._encoded); }',
        '                else { for (key in f) { if (f.hasOwnProperty(key)) agg.addQuery(key, f[key]); } }',
        '                agg.addAggregate(\'COUNT\'); agg.query();',
        '                r.count = agg.next() ? parseInt(agg.getAggregate(\'COUNT\'), 10) : 0;',
        '',
        '            // ── property.set ──────────────────────────────',
        '            } else if (op.op === \'property.set\') {',
        '                gs.setProperty(op.name, op.value, op.description || \'\');',
        '                r.success = true;',
        '',
        '            // ── property.get ──────────────────────────────',
        '            } else if (op.op === \'property.get\') {',
        '                val      = gs.getProperty(op.name);',
        '                r.value  = val;',
        '                r.exists = (val !== null);',
        '',
        '            // ── unknown ───────────────────────────────────',
        '            } else {',
        '                r.ok    = false;',
        '                r.error = \'Unknown op: \' + op.op;',
        '                r.supported = [',
        '                    \'ping\', \'scope.info\', \'table.exists\',',
        '                    \'record.insert\', \'record.update\', \'record.upsert\',',
        '                    \'record.delete\', \'record.query\',  \'record.get\', \'record.count\',',
        '                    \'property.set\',  \'property.get\',  \'batch\'',
        '                ];',
        '            }',
        '        } catch (e) { r.ok = false; r.error = String(e); }',
        '        return r;',
        '    }',
        '',
        '    // ── Dispatch single or batch ─────────────────────────',
        '    var output;',
        '    try {',
        '        if (body.op === \'batch\') {',
        '            var steps   = body.steps || [];',
        '            var results = [];',
        '            var allOk   = true;',
        '            for (var i = 0; i < steps.length; i++) {',
        '                var sr = run(steps[i]);',
        '                results.push(sr);',
        '                if (!sr.ok && body.stop_on_error !== false) {',
        '                    allOk = false;',
        '                    break;',
        '                }',
        '            }',
        '            output = { ok: allOk, op: \'batch\', results: results, count: results.length };',
        '        } else {',
        '            output = run(body);',
        '        }',
        '    } catch (e) {',
        '        response.setStatus(500);',
        '        response.setBody({ ok: false, error: String(e) });',
        '        return;',
        '    }',
        '    response.setStatus(200);',
        '    response.setBody(output);',
        '',
        '})(request, response);'
    ];

    var engineScript = L.join('\n');
    gs.info('      Lines assembled : ' + L.length);

    // ══════════════════════════════════════════════════════════
    //  STEP 6 — Create / reset sys_ws_provider
    // ══════════════════════════════════════════════════════════
    gs.info('');
    gs.info('  [STEP 6] Create / reset Scripted REST API provider');

    var providerSysId = null;
    try {
        var existingProv = new GlideRecord('sys_ws_provider');
        existingProv.addQuery('name', PROVIDER_NAME);
        existingProv.setLimit(1);
        existingProv.query();

        if (existingProv.next()) {
            providerSysId = existingProv.getUniqueValue();
            existingProv.setValue('active', true);
            if (pHasNoAuth)    existingProv.setValue('requires_authentication', false);
            if (pHasAccess)    existingProv.setValue('access', 'public');
            existingProv.update();
            gs.info('      Action   : Updated existing provider');
        } else {
            var newProv = new GlideRecord('sys_ws_provider');
            newProv.initialize();
            newProv.setValue('name', PROVIDER_NAME);
            if (pHasServiceId) newProv.setValue('service_id', SERVICE_ID);
            newProv.setValue('active', true);
            newProv.setValue('sys_scope', scopeSysId);
            if (pHasNoAuth)    newProv.setValue('requires_authentication', false);
            if (pHasAccess)    newProv.setValue('access', 'public');
            newProv.setValue('short_description',
                'Internal build and management engine for the Operations Intelligence platform. ' +
                'Secured by X-Engine-Key header. Restrict network access to authorised clients only.');
            providerSysId = newProv.insert();
            if (providerSysId) {
                gs.info('      Action   : Created new provider');
            } else {
                errors.push('sys_ws_provider insert returned null');
                gs.info('      ERROR    : Insert returned null for sys_ws_provider');
            }
        }
        gs.info('      Sys ID   : ' + (providerSysId || 'N/A'));

        if (providerSysId) {
            var rrProv = new GlideRecord('sys_ws_provider');
            rrProv.get(providerSysId);
            if (pHasServiceId) gs.info('      service_id              : ' + rrProv.getValue('service_id'));
            if (pHasNoAuth)    gs.info('      requires_authentication : ' + rrProv.getValue('requires_authentication'));
            if (pHasAccess)    gs.info('      access                  : ' + rrProv.getValue('access'));
        }
    } catch (e) {
        gs.info('      ERROR: ' + String(e));
        errors.push('Provider step: ' + String(e));
    }

    if (!providerSysId) {
        gs.info('');
        gs.info('  Cannot create operation without a provider. Exiting.');
        return;
    }

    // ══════════════════════════════════════════════════════════
    //  STEP 7 — Create / reset sys_ws_operation
    // ══════════════════════════════════════════════════════════
    gs.info('');
    gs.info('  [STEP 7] Create / reset Engine Router operation');

    var operSysId = null;
    try {
        var existingOp = new GlideRecord('sys_ws_operation');
        existingOp.addQuery('web_service_definition', providerSysId);
        existingOp.addQuery('name', OPERATION_NAME);
        existingOp.setLimit(1);
        existingOp.query();

        if (existingOp.next()) {
            operSysId = existingOp.getUniqueValue();
            existingOp.setValue('script', engineScript);
            existingOp.setValue('active', true);
            if (oHasNoAuth) existingOp.setValue('requires_authentication', false);
            if (oHasAccess) existingOp.setValue('access', 'public');
            existingOp.update();
            gs.info('      Action   : Updated — script refreshed');
        } else {
            var newOp = new GlideRecord('sys_ws_operation');
            newOp.initialize();
            newOp.setValue('name', OPERATION_NAME);
            newOp.setValue('web_service_definition', providerSysId);
            if (oHasOpUri)  newOp.setValue('operation_uri', OP_URI);
            if (oHasMethod) newOp.setValue('http_method', 'POST');
            newOp.setValue('active', true);
            newOp.setValue('sys_scope', scopeSysId);
            if (oHasNoAuth) newOp.setValue('requires_authentication', false);
            if (oHasAccess) newOp.setValue('access', 'public');
            newOp.setValue('script', engineScript);
            newOp.setValue('short_description',
                'Routes all engine ops: ping, scope.info, table.exists, record.*, property.*, batch.');
            operSysId = newOp.insert();
            if (operSysId) {
                gs.info('      Action   : Created new operation');
            } else {
                errors.push('sys_ws_operation insert returned null');
                gs.info('      ERROR    : Insert returned null for sys_ws_operation');
            }
        }
        gs.info('      Sys ID   : ' + (operSysId || 'N/A'));

        if (operSysId) {
            var rrOp = new GlideRecord('sys_ws_operation');
            rrOp.get(operSysId);
            if (oHasOpUri)  gs.info('      operation_uri           : ' + rrOp.getValue('operation_uri'));
            if (oHasMethod) gs.info('      http_method             : ' + rrOp.getValue('http_method'));
            if (oHasNoAuth) gs.info('      requires_authentication : ' + rrOp.getValue('requires_authentication'));
            if (oHasAccess) gs.info('      access                  : ' + rrOp.getValue('access'));
        }
    } catch (e) {
        gs.info('      ERROR: ' + String(e));
        errors.push('Operation step: ' + String(e));
    }

    // ══════════════════════════════════════════════════════════
    //  STEP 8 — Resolve endpoint URL
    // ══════════════════════════════════════════════════════════
    var instanceUrl = gs.getProperty('glide.servlet.uri', '') ||
                      gs.getProperty('glide.url', '')         || '';
    if (!instanceUrl) {
        var iName = gs.getProperty('instance_name', '');
        instanceUrl = iName ? 'https://' + iName + '.service-now.com' : 'UNKNOWN';
    }
    if (instanceUrl.charAt(instanceUrl.length - 1) === '/') {
        instanceUrl = instanceUrl.slice(0, -1);
    }
    var endpointUrl = instanceUrl + '/api/' + APP_SCOPE + '/' + SERVICE_ID + OP_URI;

    // ══════════════════════════════════════════════════════════
    //  FINAL OUTPUT
    // ══════════════════════════════════════════════════════════
    gs.info('');
    gs.info(SEP);
    gs.info('  ENGINE SETUP ' + (errors.length === 0 ? 'COMPLETE' : 'COMPLETED WITH ERRORS'));
    gs.info('  *** COPY THIS ENTIRE BLOCK AND SHARE IT ***');
    gs.info(SEP);
    gs.info('');
    gs.info('  Status           : ' + (errors.length === 0 ? 'SUCCESS' : 'ERRORS — see above'));
    gs.info('  Provider Sys ID  : ' + (providerSysId || 'N/A'));
    gs.info('  Operation Sys ID : ' + (operSysId     || 'N/A'));
    gs.info('  Endpoint URL     : ' + endpointUrl);
    gs.info('  Engine Key       : ' + engineKey);
    gs.info('  Key Property     : ' + KEY_PROP);

    if (errors.length > 0) {
        gs.info('');
        gs.info('  Errors:');
        errors.forEach(function (e) { gs.info('    ! ' + e); });
    }

    gs.info('');
    gs.info(SEP2);
    gs.info('  TEST PING (run in terminal)');
    gs.info(SEP2);
    gs.info('  curl -s -X POST "' + endpointUrl + '" \\');
    gs.info('    -H "Content-Type: application/json" \\');
    gs.info('    -H "X-Engine-Key: ' + engineKey + '" \\');
    gs.info('    -d \'{"op":"ping"}\'');
    gs.info('');
    gs.info('  Expected:');
    gs.info('  {"ok":true,"op":"ping","message":"Operations Intelligence Engine is active",...}');
    gs.info('');
    gs.info(SEP2);
    gs.info('  IF ENDPOINT RETURNS 302 (SSO redirect)');
    gs.info(SEP2);
    gs.info('  The requires_authentication flag was not persisted (scope restriction).');
    gs.info('  One-time manual fix in the UI:');
    gs.info('    All > System Web Services > Scripted REST APIs');
    gs.info('    Open "' + PROVIDER_NAME + '"');
    gs.info('      Uncheck "Requires authentication" > Save');
    gs.info('    Resources tab > open "' + OPERATION_NAME + '"');
    gs.info('      Uncheck "Requires authentication" > Save');
    gs.info('  Then re-run the curl ping above.');
    gs.info('');
    gs.info(SEP);
    gs.info('');

})();
