// ============================================================
// OPERATIONS INTELLIGENCE — ENGINE SETUP
// Run in APPLICATION scope (scope picker = "Operations Intelligence")
// ============================================================
// WHAT THIS CREATES:
//   A Scripted REST API called "Operations Intelligence Engine"
//   that serves as the sole build & management interface for the
//   entire platform. Once the endpoint responds to ping, all 15
//   build steps can be executed remotely via structured JSON calls.
//
//   Endpoint : POST /api/x_infte_ops_int/ops_int_engine/v1
//   Auth     : X-Engine-Key header (value stored in system property)
//
// ENGINE OPERATIONS:
//   ping              — connectivity + scope health check
//   scope.info        — instance URL, app name, version
//   record.insert     — create any record in any table
//   record.update     — update a record by sys_id
//   record.delete     — delete a record by sys_id
//   record.query      — query records with filter / encoded query
//   record.get        — fetch a single record by sys_id
//   property.set      — write a system property
//   property.get      — read a system property
//   batch             — run multiple operations in one HTTP call
//
// AFTER RUNNING:
//   If the endpoint returns 302 → SSO login page (rare):
//     UI: System Web Services > Scripted REST APIs
//     Open "Operations Intelligence Engine" → uncheck
//     "Requires authentication" → Save
//     Open resource "Engine Router" → same → Save
//
// SCOPE REQUIREMENT: Run in x_infte_ops_int scope only.
// ============================================================

(function engineSetup() {
    'use strict';

    var SEP  = '============================================================';
    var SEP2 = '------------------------------------------------------------';

    var APP_SCOPE    = 'x_infte_ops_int';
    var PROVIDER_NAME = 'Operations Intelligence Engine';
    var SERVICE_ID   = 'ops_int_engine';
    var OPERATION_NAME = 'Engine Router';
    var OP_URI       = '/v1';
    var KEY_PROP     = APP_SCOPE + '.engine_key';

    gs.print('');
    gs.print(SEP);
    gs.print('  OPERATIONS INTELLIGENCE — ENGINE SETUP');
    gs.print(SEP);

    // ── GUARD: must be in correct scope ───────────────────────
    var currentScope = gs.getCurrentScopeName();
    if (!currentScope || currentScope === 'global') {
        gs.print('');
        gs.print('  ERROR: You are in GLOBAL scope.');
        gs.print('  Switch to "Operations Intelligence" (x_infte_ops_int)');
        gs.print('  using the scope picker in the top-right banner, then re-run.');
        gs.print('');
        return;
    }
    if (currentScope !== APP_SCOPE) {
        gs.print('');
        gs.print('  ERROR: Wrong scope — currently in "' + currentScope + '".');
        gs.print('  Switch to "' + APP_SCOPE + '" and re-run.');
        gs.print('');
        return;
    }
    gs.print('');
    gs.print('  Scope : ' + currentScope);

    // ── STEP 1: LOCATE SCOPE SYS_ID ───────────────────────────
    gs.print('');
    gs.print('  [STEP 1] Locate scoped application');

    var appGr = new GlideRecord('sys_scope');
    appGr.addQuery('scope', APP_SCOPE);
    appGr.setLimit(1);
    appGr.query();

    var scopeSysId = null;
    if (appGr.next()) {
        scopeSysId = appGr.getUniqueValue();
        gs.print('      App Name : ' + appGr.getValue('name'));
        gs.print('      Sys ID   : ' + scopeSysId);
    } else {
        gs.print('      ERROR: Application not found in sys_scope. Cannot continue.');
        return;
    }

    // ── STEP 2: VERIFY PLUGIN ──────────────────────────────────
    gs.print('');
    gs.print('  [STEP 2] Verify Scripted REST API plugin');

    var chk1 = new GlideRecord('sys_db_object');
    chk1.addQuery('name', 'sys_ws_provider');
    chk1.setLimit(1);
    chk1.query();
    if (!chk1.next()) {
        gs.print('      ERROR: sys_ws_provider table missing.');
        gs.print('      Activate plugin: com.snc.scripted.rest.api');
        return;
    }
    gs.print('      sys_ws_provider  : OK');

    var chk2 = new GlideRecord('sys_db_object');
    chk2.addQuery('name', 'sys_ws_operation');
    chk2.setLimit(1);
    chk2.query();
    if (!chk2.next()) {
        gs.print('      ERROR: sys_ws_operation table missing.');
        return;
    }
    gs.print('      sys_ws_operation : OK');

    // ── STEP 3: GENERATE & STORE ENGINE KEY ───────────────────
    gs.print('');
    gs.print('  [STEP 3] Engine API key');

    // Only generate a new key if one is not already set
    var existingKey = gs.getProperty(KEY_PROP, '');
    var engineKey;
    if (existingKey && existingKey.length >= 20) {
        engineKey = existingKey;
        gs.print('      Using existing key from property ' + KEY_PROP);
    } else {
        // Generate a 40-char alphanumeric key
        var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        engineKey = '';
        for (var ki = 0; ki < 40; ki++) {
            engineKey += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
        }
        gs.setProperty(KEY_PROP, engineKey, 'Operations Intelligence Engine API key. Keep secret.');
        gs.print('      Generated new key and stored in property ' + KEY_PROP);
    }
    gs.print('      Key length : ' + engineKey.length + ' chars');

    // ── STEP 4: PROBE FIELD AVAILABILITY ──────────────────────
    gs.print('');
    gs.print('  [STEP 4] Probe sys_ws_provider field availability');

    var provProbe   = new GlideRecord('sys_ws_provider');
    provProbe.setLimit(1);
    provProbe.query();
    var pHasServiceId    = false;
    var pHasNoAuth       = false;
    var pHasAccess       = false;
    try { provProbe.getValue('service_id');             pHasServiceId = true; } catch(e) {}
    try { provProbe.getValue('requires_authentication'); pHasNoAuth    = true; } catch(e) {}
    try { provProbe.getValue('access');                 pHasAccess    = true; } catch(e) {}
    gs.print('      service_id              : ' + (pHasServiceId ? 'yes' : 'no'));
    gs.print('      requires_authentication : ' + (pHasNoAuth    ? 'yes' : 'no'));
    gs.print('      access                  : ' + (pHasAccess    ? 'yes' : 'no'));

    gs.print('');
    gs.print('  [STEP 4b] Probe sys_ws_operation field availability');

    var operProbe    = new GlideRecord('sys_ws_operation');
    operProbe.setLimit(1);
    operProbe.query();
    var oHasOpUri    = false;
    var oHasMethod   = false;
    var oHasNoAuth   = false;
    var oHasAccess   = false;
    try { operProbe.getValue('operation_uri');          oHasOpUri   = true; } catch(e) {}
    try { operProbe.getValue('http_method');            oHasMethod  = true; } catch(e) {}
    try { operProbe.getValue('requires_authentication'); oHasNoAuth  = true; } catch(e) {}
    try { operProbe.getValue('access');                 oHasAccess  = true; } catch(e) {}
    gs.print('      operation_uri           : ' + (oHasOpUri   ? 'yes' : 'no'));
    gs.print('      http_method             : ' + (oHasMethod  ? 'yes' : 'no'));
    gs.print('      requires_authentication : ' + (oHasNoAuth  ? 'yes' : 'no'));
    gs.print('      access                  : ' + (oHasAccess  ? 'yes' : 'no'));

    // ── STEP 5: BUILD ENGINE OPERATION SCRIPT ─────────────────
    // This is the GlideScript that ServiceNow executes when the
    // endpoint is called. It handles all engine operations.
    gs.print('');
    gs.print('  [STEP 5] Assembling engine operation script');

    var engineLines = [
        '(function process(request, response) {',
        '    var K = gs.getProperty(\'x_infte_ops_int.engine_key\', \'\');',
        '    if (!K) {',
        '        response.setStatus(503);',
        '        response.setBody({ ok: false, error: \'Engine key not set\' });',
        '        return;',
        '    }',
        '    if ((request.headers.getHeader(\'X-Engine-Key\') || \'\') !== K) {',
        '        response.setStatus(403);',
        '        response.setBody({ ok: false, error: \'Forbidden\' });',
        '        return;',
        '    }',
        '    var body = {};',
        '    try { body = request.body.data || {}; } catch (e) { body = {}; }',
        '',
        '    function run(op) {',
        '        var r = { ok: true, op: op.op };',
        '        var gr, data, key, row, rows, fields, val, sc, ag, url, f;',
        '        try {',
        '            if (op.op === \'ping\') {',
        '                r.message  = \'Operations Intelligence Engine is active\';',
        '                r.ts       = new GlideDateTime().toString();',
        '                r.scope    = gs.getCurrentScopeName();',
        '                r.instance = gs.getProperty(\'instance_name\', \'\');',
        '',
        '            } else if (op.op === \'scope.info\') {',
        '                sc = gs.getCurrentScopeName();',
        '                ag = new GlideRecord(\'sys_app\');',
        '                ag.addQuery(\'scope\', sc); ag.setLimit(1); ag.query();',
        '                url = gs.getProperty(\'glide.servlet.uri\', \'\') || \'\';',
        '                if (url.charAt(url.length - 1) === \'/\') url = url.slice(0, -1);',
        '                r.scope = sc; r.instance = gs.getProperty(\'instance_name\', \'\'); r.url = url;',
        '                if (ag.next()) {',
        '                    r.app_name = ag.getValue(\'name\');',
        '                    r.app_sys_id = ag.getUniqueValue();',
        '                    r.version = ag.getValue(\'version\');',
        '                }',
        '',
        '            } else if (op.op === \'record.insert\') {',
        '                gr = new GlideRecord(op.table); gr.initialize();',
        '                data = op.data || {};',
        '                for (key in data) { if (data.hasOwnProperty(key)) gr.setValue(key, data[key]); }',
        '                r.sys_id = gr.insert(); r.success = !!r.sys_id;',
        '',
        '            } else if (op.op === \'record.update\') {',
        '                gr = new GlideRecord(op.table);',
        '                if (gr.get(op.sys_id)) {',
        '                    data = op.data || {};',
        '                    for (key in data) { if (data.hasOwnProperty(key)) gr.setValue(key, data[key]); }',
        '                    gr.update(); r.success = true;',
        '                } else { r.ok = false; r.error = \'Not found: \' + op.sys_id; }',
        '',
        '            } else if (op.op === \'record.delete\') {',
        '                gr = new GlideRecord(op.table);',
        '                if (gr.get(op.sys_id)) { gr.deleteRecord(); r.success = true; }',
        '                else { r.ok = false; r.error = \'Not found: \' + op.sys_id; }',
        '',
        '            } else if (op.op === \'record.query\') {',
        '                gr = new GlideRecord(op.table);',
        '                f = op.filter || {};',
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
        '                    fields.forEach(function(x) { row[x] = gr.getValue(x); });',
        '                    rows.push(row);',
        '                }',
        '                r.rows = rows; r.count = rows.length;',
        '',
        '            } else if (op.op === \'record.get\') {',
        '                gr = new GlideRecord(op.table);',
        '                if (gr.get(op.sys_id)) {',
        '                    row = { sys_id: gr.getUniqueValue() };',
        '                    fields = op.fields || [];',
        '                    fields.forEach(function(x) { row[x] = gr.getValue(x); });',
        '                    r.record = row; r.found = true;',
        '                } else { r.found = false; }',
        '',
        '            } else if (op.op === \'property.set\') {',
        '                gs.setProperty(op.name, op.value, op.description || \'\');',
        '                r.success = true;',
        '',
        '            } else if (op.op === \'property.get\') {',
        '                val = gs.getProperty(op.name);',
        '                r.value = val; r.exists = (val !== null);',
        '',
        '            } else {',
        '                r.ok = false; r.error = \'Unknown op: \' + op.op;',
        '                r.supported = [\'ping\',\'scope.info\',\'record.insert\',\'record.update\',',
        '                    \'record.delete\',\'record.query\',\'record.get\',',
        '                    \'property.set\',\'property.get\',\'batch\'];',
        '            }',
        '        } catch (e) { r.ok = false; r.error = String(e); }',
        '        return r;',
        '    }',
        '',
        '    var output;',
        '    try {',
        '        if (body.op === \'batch\') {',
        '            var steps = body.steps || []; var results = []; var allOk = true;',
        '            for (var i = 0; i < steps.length; i++) {',
        '                var sr = run(steps[i]); results.push(sr);',
        '                if (!sr.ok && body.stop_on_error !== false) { allOk = false; break; }',
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
        '})(request, response);'
    ];

    var engineScript = engineLines.join('\n');
    gs.print('      Lines assembled : ' + engineLines.length);

    // ── STEP 6: CREATE / RESET sys_ws_provider ─────────────────
    gs.print('');
    gs.print('  [STEP 6] Create / reset Scripted REST API provider');

    var existingProv = new GlideRecord('sys_ws_provider');
    existingProv.addQuery('name', PROVIDER_NAME);
    existingProv.setLimit(1);
    existingProv.query();

    var providerSysId = null;
    if (existingProv.next()) {
        providerSysId = existingProv.getUniqueValue();
        existingProv.setValue('active', true);
        if (pHasNoAuth)   existingProv.setValue('requires_authentication', false);
        if (pHasAccess)   existingProv.setValue('access', 'public');
        existingProv.update();
        gs.print('      Action    : Updated existing provider');
    } else {
        var newProv = new GlideRecord('sys_ws_provider');
        newProv.initialize();
        newProv.setValue('name', PROVIDER_NAME);
        if (pHasServiceId) newProv.setValue('service_id', SERVICE_ID);
        newProv.setValue('active', true);
        newProv.setValue('sys_scope', scopeSysId);
        if (pHasNoAuth)   newProv.setValue('requires_authentication', false);
        if (pHasAccess)   newProv.setValue('access', 'public');
        newProv.setValue('short_description',
            'Internal build and management API for the Operations Intelligence platform. ' +
            'Secured by X-Engine-Key header. Do not expose externally.');
        providerSysId = newProv.insert();
        if (providerSysId) {
            gs.print('      Action    : Created new provider');
        } else {
            gs.print('      ERROR     : Failed to insert sys_ws_provider');
            return;
        }
    }
    gs.print('      Sys ID    : ' + providerSysId);

    // Verify what actually got saved
    var rrProv = new GlideRecord('sys_ws_provider');
    rrProv.get(providerSysId);
    if (pHasServiceId) gs.print('      service_id              : ' + rrProv.getValue('service_id'));
    if (pHasNoAuth)    gs.print('      requires_authentication : ' + rrProv.getValue('requires_authentication'));
    if (pHasAccess)    gs.print('      access                  : ' + rrProv.getValue('access'));

    // ── STEP 7: CREATE / RESET sys_ws_operation ────────────────
    gs.print('');
    gs.print('  [STEP 7] Create / reset Engine Router operation');

    var existingOp = new GlideRecord('sys_ws_operation');
    existingOp.addQuery('web_service_definition', providerSysId);
    existingOp.addQuery('name', OPERATION_NAME);
    existingOp.setLimit(1);
    existingOp.query();

    var operSysId = null;
    if (existingOp.next()) {
        operSysId = existingOp.getUniqueValue();
        existingOp.setValue('script', engineScript);
        existingOp.setValue('active', true);
        if (oHasNoAuth)  existingOp.setValue('requires_authentication', false);
        if (oHasAccess)  existingOp.setValue('access', 'public');
        existingOp.update();
        gs.print('      Action    : Updated existing operation (script refreshed)');
    } else {
        var newOp = new GlideRecord('sys_ws_operation');
        newOp.initialize();
        newOp.setValue('name', OPERATION_NAME);
        newOp.setValue('web_service_definition', providerSysId);
        if (oHasOpUri)   newOp.setValue('operation_uri', OP_URI);
        if (oHasMethod)  newOp.setValue('http_method', 'POST');
        newOp.setValue('active', true);
        newOp.setValue('sys_scope', scopeSysId);
        if (oHasNoAuth)  newOp.setValue('requires_authentication', false);
        if (oHasAccess)  newOp.setValue('access', 'public');
        newOp.setValue('script', engineScript);
        newOp.setValue('short_description',
            'Routes all engine operations: ping, scope.info, record.*, property.*, batch.');
        operSysId = newOp.insert();
        if (operSysId) {
            gs.print('      Action    : Created new operation');
        } else {
            gs.print('      ERROR     : Failed to insert sys_ws_operation');
            return;
        }
    }
    gs.print('      Sys ID    : ' + operSysId);

    var rrOp = new GlideRecord('sys_ws_operation');
    rrOp.get(operSysId);
    if (oHasOpUri)   gs.print('      operation_uri           : ' + rrOp.getValue('operation_uri'));
    if (oHasMethod)  gs.print('      http_method             : ' + rrOp.getValue('http_method'));
    if (oHasNoAuth)  gs.print('      requires_authentication : ' + rrOp.getValue('requires_authentication'));
    if (oHasAccess)  gs.print('      access                  : ' + rrOp.getValue('access'));

    // ── STEP 8: RESOLVE ENDPOINT URL ──────────────────────────
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

    // ── FINAL OUTPUT ───────────────────────────────────────────
    gs.print('');
    gs.print(SEP);
    gs.print('  ENGINE SETUP COMPLETE — COPY THIS ENTIRE BLOCK');
    gs.print(SEP);
    gs.print('');
    gs.print('  Provider Sys ID  : ' + providerSysId);
    gs.print('  Operation Sys ID : ' + operSysId);
    gs.print('  Endpoint URL     : ' + endpointUrl);
    gs.print('  Engine Key       : ' + engineKey);
    gs.print('  Key Property     : ' + KEY_PROP);
    gs.print('');
    gs.print(SEP2);
    gs.print('  TEST PING (run in terminal)');
    gs.print(SEP2);
    gs.print('  curl -s -X POST "' + endpointUrl + '" \\');
    gs.print('    -H "Content-Type: application/json" \\');
    gs.print('    -H "X-Engine-Key: ' + engineKey + '" \\');
    gs.print('    -d \'{"op":"ping"}\'');
    gs.print('');
    gs.print('  Expected:');
    gs.print('  {"ok":true,"op":"ping","message":"Operations Intelligence Engine is active",...}');
    gs.print('');
    gs.print(SEP2);
    gs.print('  IF YOU GET 302 REDIRECT TO SSO LOGIN');
    gs.print(SEP2);
    gs.print('  The requires_authentication flag did not persist (scope restriction).');
    gs.print('  Fix in the UI:');
    gs.print('  1. System Web Services > Scripted REST APIs');
    gs.print('     Open "' + PROVIDER_NAME + '"');
    gs.print('     Uncheck "Requires authentication" -> Save');
    gs.print('  2. Open "Resources" tab > "' + OPERATION_NAME + '"');
    gs.print('     Uncheck "Requires authentication" -> Save');
    gs.print('  3. Re-run the curl ping above.');
    gs.print('');
    gs.print(SEP);
    gs.print('');

})();
