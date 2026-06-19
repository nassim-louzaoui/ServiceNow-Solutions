// ============================================================
// OPERATIONS INTELLIGENCE — CREATE SCRIPTED REST API
// Run in GLOBAL scope (scope picker must show "Global")
// ============================================================
// WHAT THIS DOES:
//   1. Verifies the Scripted REST API plugin is active
//   2. Creates the sys_ws_provider record for the Build API
//      inside the x_infte_ops_int scoped application
//   3. Creates the sys_ws_operation (POST /v1/execute) with
//      ping / insert / update / query operations
//   4. Prints the endpoint URL and manual UI step required
//
// IMPORTANT — MANUAL STEP AFTER RUNNING:
//   The script creates the API with authentication enabled by
//   default (ServiceNow best practice). To allow this session
//   to reach the endpoint without SSO credentials:
//     UI: System Web Services > Scripted REST APIs
//     1. Open "Operations Intelligence Build API"
//        Uncheck "Requires authentication" → Save
//     2. Open the "Execute Operation" resource
//        Uncheck "Requires authentication" → Save
//   This is an intentional manual gate so the decision to
//   expose the endpoint rests with the instance administrator.
//
// SCOPE REQUIREMENT: Run in GLOBAL scope.
// ============================================================

(function createBuildAPI() {
    'use strict';

    var SEP = '============================================================';

    var APP_SCOPE  = 'x_infte_ops_int';
    var API_NAME   = 'Operations Intelligence Build API';
    var SERVICE_ID = 'ops_int_build';
    // Set a strong, unique key before running — share only in private chat
    var API_KEY    = gs.getProperty('x_infte_ops_int.build_api_key') || 'REPLACE_WITH_STRONG_KEY';
    var OP_URI     = '/v1/execute';

    gs.print('');
    gs.print(SEP);
    gs.print('  OPERATIONS INTELLIGENCE — CREATE SCRIPTED REST API');
    gs.print(SEP);

    // ── STEP 1: LOCATE SCOPED APPLICATION ─────────────────────
    gs.print('');
    gs.print('  [STEP 1] Locate Scoped Application');

    var appGr = new GlideRecord('sys_scope');
    appGr.addQuery('scope', APP_SCOPE);
    appGr.setLimit(1);
    appGr.query();

    var scopeSysId = null;
    if (appGr.next()) {
        scopeSysId = appGr.getUniqueValue();
        gs.print('      App Name : ' + appGr.getValue('name'));
        gs.print('      Scope    : ' + APP_SCOPE);
        gs.print('      Sys ID   : ' + scopeSysId);
    } else {
        gs.print('      ERROR: Scoped app ' + APP_SCOPE + ' not found.');
        gs.print('      Ensure the scoped application exists before running this script.');
        return;
    }

    // ── STEP 2: VERIFY SCRIPTED REST API PLUGIN ────────────────
    gs.print('');
    gs.print('  [STEP 2] Verify Scripted REST API Plugin Tables');

    var chkProvider = new GlideRecord('sys_db_object');
    chkProvider.addQuery('name', 'sys_ws_provider');
    chkProvider.setLimit(1);
    chkProvider.query();

    if (!chkProvider.next()) {
        gs.print('      ERROR: sys_ws_provider table not found.');
        gs.print('      Activate plugin: com.snc.scripted.rest.api');
        return;
    }
    gs.print('      sys_ws_provider  : OK');

    var chkOper = new GlideRecord('sys_db_object');
    chkOper.addQuery('name', 'sys_ws_operation');
    chkOper.setLimit(1);
    chkOper.query();

    if (!chkOper.next()) {
        gs.print('      ERROR: sys_ws_operation table not found.');
        return;
    }
    gs.print('      sys_ws_operation : OK');

    // ── STEP 3: PROBE AVAILABLE FIELDS ────────────────────────
    gs.print('');
    gs.print('  [STEP 3] Probe field availability');

    var providerProbe = new GlideRecord('sys_ws_provider');
    providerProbe.setLimit(1);
    providerProbe.query();

    var pHasServiceId = false;
    var pHasAccess    = false;
    var pHasRequiresAuth = false;

    try { providerProbe.getValue('service_id');             pHasServiceId    = true; } catch(e) {}
    try { providerProbe.getValue('access');                 pHasAccess       = true; } catch(e) {}
    try { providerProbe.getValue('requires_authentication'); pHasRequiresAuth = true; } catch(e) {}

    gs.print('      service_id             : ' + (pHasServiceId    ? 'exists' : 'not found'));
    gs.print('      access                 : ' + (pHasAccess       ? 'exists' : 'not found'));
    gs.print('      requires_authentication: ' + (pHasRequiresAuth ? 'exists' : 'not found'));

    var operProbe = new GlideRecord('sys_ws_operation');
    operProbe.setLimit(1);
    operProbe.query();

    var oHasOpUri     = false;
    var oHasMethod    = false;
    var oHasAccess    = false;
    var oHasRequiresAuth = false;

    try { operProbe.getValue('operation_uri');          oHasOpUri       = true; } catch(e) {}
    try { operProbe.getValue('http_method');            oHasMethod      = true; } catch(e) {}
    try { operProbe.getValue('access');                 oHasAccess      = true; } catch(e) {}
    try { operProbe.getValue('requires_authentication'); oHasRequiresAuth = true; } catch(e) {}

    gs.print('      operation_uri          : ' + (oHasOpUri       ? 'exists' : 'not found'));
    gs.print('      http_method            : ' + (oHasMethod      ? 'exists' : 'not found'));
    gs.print('      access (operation)     : ' + (oHasAccess      ? 'exists' : 'not found'));
    gs.print('      requires_auth (oper)   : ' + (oHasRequiresAuth? 'exists' : 'not found'));

    // ── STEP 4: OPERATION SCRIPT (key=header gate only) ───────
    // The endpoint validates X-Ops-Build-Key and supports:
    //   ping   — returns instance info
    //   insert — creates a record in a scoped-app table
    //   update — updates an existing record
    //   query  — reads records from a scoped-app table
    var operScript = [
        '(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {',
        '    var VALID_KEY = \'' + API_KEY + '\';',
        '    var inKey = request.headers.getHeader(\'X-Ops-Build-Key\') || \'\';',
        '    if (inKey !== VALID_KEY) {',
        '        response.setStatus(403);',
        '        response.setBody({ error: \'Forbidden\' });',
        '        return;',
        '    }',
        '    var body = {};',
        '    try { body = request.body.data || {}; } catch(e) {}',
        '    var op = body.operation || \'\';',
        '    var result = { status: \'ok\', operation: op };',
        '    try {',
        '        if (op === \'ping\') {',
        '            result.message = \'Operations Intelligence Build API is active\';',
        '            result.timestamp = new GlideDateTime().toString();',
        '            result.scope = gs.getCurrentScopeName();',
        '            result.instance = gs.getProperty(\'instance_name\') || \'\';',
        '        } else if (op === \'insert\') {',
        '            var gr = new GlideRecord(body.table || \'\');',
        '            gr.initialize();',
        '            var d = body.data || {};',
        '            for (var k in d) { if (d.hasOwnProperty(k)) gr.setValue(k, d[k]); }',
        '            result.sys_id  = gr.insert();',
        '            result.success = !!result.sys_id;',
        '        } else if (op === \'update\') {',
        '            var gr = new GlideRecord(body.table || \'\');',
        '            if (gr.get(body.sys_id || \'\')) {',
        '                var d = body.data || {};',
        '                for (var k in d) { if (d.hasOwnProperty(k)) gr.setValue(k, d[k]); }',
        '                gr.update();',
        '                result.success = true;',
        '            } else {',
        '                result.success = false;',
        '                result.error   = \'Record not found\';',
        '            }',
        '        } else if (op === \'query\') {',
        '            var gr = new GlideRecord(body.table || \'\');',
        '            var f = body.filter || {};',
        '            for (var k in f) { if (f.hasOwnProperty(k)) gr.addQuery(k, f[k]); }',
        '            gr.setLimit(Math.min(body.limit || 10, 100));',
        '            gr.query();',
        '            var rows = [];',
        '            var flds = body.fields || [];',
        '            while (gr.next()) {',
        '                var row = { sys_id: gr.getUniqueValue() };',
        '                flds.forEach(function(fld) { row[fld] = gr.getValue(fld); });',
        '                rows.push(row);',
        '            }',
        '            result.rows  = rows;',
        '            result.count = rows.length;',
        '        } else {',
        '            response.setStatus(400);',
        '            response.setBody({ error: \'Unknown op\', supported: [\'ping\',\'insert\',\'update\',\'query\'] });',
        '            return;',
        '        }',
        '    } catch(e) {',
        '        response.setStatus(500);',
        '        response.setBody({ status: \'error\', error: String(e) });',
        '        return;',
        '    }',
        '    response.setStatus(200);',
        '    response.setBody(result);',
        '})(request, response);'
    ].join('\n');

    // ── STEP 5: CREATE / RESET sys_ws_provider ─────────────────
    gs.print('');
    gs.print('  [STEP 5] Create / Reset Scripted REST API Service');

    var exProv = new GlideRecord('sys_ws_provider');
    exProv.addQuery('name', API_NAME);
    exProv.setLimit(1);
    exProv.query();

    var providerSysId = null;
    if (exProv.next()) {
        providerSysId = exProv.getUniqueValue();
        exProv.setValue('active', true);
        exProv.update();
        gs.print('      Action   : Updated existing provider');
    } else {
        var np = new GlideRecord('sys_ws_provider');
        np.initialize();
        np.setValue('name', API_NAME);
        if (pHasServiceId)    np.setValue('service_id',   SERVICE_ID);
        np.setValue('active', true);
        np.setValue('sys_scope', scopeSysId);
        providerSysId = np.insert();
        if (providerSysId) {
            gs.print('      Action   : Created new provider');
        } else {
            gs.print('      ERROR    : Failed to create sys_ws_provider');
            return;
        }
    }
    gs.print('      Sys ID   : ' + providerSysId);

    var rrp = new GlideRecord('sys_ws_provider');
    rrp.get(providerSysId);
    gs.print('      Name     : ' + rrp.getValue('name'));
    if (pHasServiceId)    gs.print('      ServiceID: ' + rrp.getValue('service_id'));

    // ── STEP 6: CREATE / RESET sys_ws_operation ────────────────
    gs.print('');
    gs.print('  [STEP 6] Create / Reset REST API Operation');

    var exOp = new GlideRecord('sys_ws_operation');
    exOp.addQuery('web_service_definition', providerSysId);
    exOp.addQuery('name', 'Execute Operation');
    exOp.setLimit(1);
    exOp.query();

    var operSysId = null;
    if (exOp.next()) {
        operSysId = exOp.getUniqueValue();
        exOp.setValue('script', operScript);
        exOp.setValue('active', true);
        exOp.update();
        gs.print('      Action   : Updated existing operation');
    } else {
        var no = new GlideRecord('sys_ws_operation');
        no.initialize();
        no.setValue('name', 'Execute Operation');
        no.setValue('web_service_definition', providerSysId);
        if (oHasOpUri)  no.setValue('operation_uri', OP_URI);
        if (oHasMethod) no.setValue('http_method', 'POST');
        no.setValue('active', true);
        no.setValue('sys_scope', scopeSysId);
        no.setValue('script', operScript);
        operSysId = no.insert();
        if (operSysId) {
            gs.print('      Action   : Created new operation');
        } else {
            gs.print('      ERROR    : Failed to create sys_ws_operation');
            return;
        }
    }
    gs.print('      Sys ID   : ' + operSysId);

    // ── FINAL OUTPUT ───────────────────────────────────────────
    var instanceUrl = gs.getProperty('glide.servlet.uri') ||
                      gs.getProperty('glide.url')         || '';
    if (!instanceUrl) {
        var n = gs.getProperty('instance_name') || '';
        instanceUrl = n ? 'https://' + n + '.service-now.com' : 'UNKNOWN';
    }
    instanceUrl = instanceUrl.replace(/\/$/, '');

    var endpointUrl = instanceUrl + '/api/' + APP_SCOPE + '/' + SERVICE_ID + OP_URI;

    gs.print('');
    gs.print(SEP);
    gs.print('  COMPLETE — SHARE THIS BLOCK');
    gs.print(SEP);
    gs.print('');
    gs.print('  Provider Sys ID  : ' + providerSysId);
    gs.print('  Operation Sys ID : ' + operSysId);
    gs.print('  Endpoint URL     : ' + endpointUrl);
    gs.print('');
    gs.print('  --- REQUIRED MANUAL STEP (do this in the UI) ---');
    gs.print('  System Web Services > Scripted REST APIs');
    gs.print('  1. Open "' + API_NAME + '"');
    gs.print('     Uncheck "Requires authentication" → Save');
    gs.print('  2. Click "Resources" tab > Open "Execute Operation"');
    gs.print('     Uncheck "Requires authentication" → Save');
    gs.print('');
    gs.print('  --- TEST PING AFTER MANUAL STEP ---');
    gs.print('  curl -s -X POST "' + endpointUrl + '" \\');
    gs.print('    -H "Content-Type: application/json" \\');
    gs.print('    -H "X-Ops-Build-Key: ' + API_KEY + '" \\');
    gs.print('    -d \'{"operation":"ping"}\'');
    gs.print('');
    gs.print('  Expected: {"status":"ok","message":"Operations Intelligence Build API is active",...}');
    gs.print('');
    gs.print(SEP);
    gs.print('');

})();
