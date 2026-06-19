// ============================================================
// OPERATIONS INTELLIGENCE — ENGINE
// Paste into Studio → Scripted REST → Engine Router resource
// Script field (replace entire content)
// ============================================================
// Resource settings:
//   HTTP Method  : POST
//   Relative Path: /v1   ← stable endpoint path, NOT a version.
//                          This is the single, self-maintaining engine.
//                          Enhance in place via engine.selfupdate.
// ============================================================
// AUTH
//   Header  X-Engine-Key  must match property x_infte_ops_int.engine_key
//
// PLATFORM WRITES (the autonomy unlock)
//   Set property x_infte_ops_int.svc_password (service-account password)
//   once via property.set. The engine then makes authenticated internal
//   REST calls that run at PLATFORM level, bypassing the scoped-code
//   sandbox. Any record.* op with "platform": true is routed through the
//   Table API as the service account — letting the engine create and
//   maintain ANY artifact in ANY table: Script Includes, Business Rules,
//   Scheduled Jobs, Notifications, ACLs, Portal, Widgets, UI Pages, etc.
//   Created artifacts are auto-tagged to the app scope (opt out: scope:false).
// ============================================================
// OP CATALOG (call {"op":"help"} for the live list)
//   DIAGNOSTICS  ping · help · now · scope.info · selftest
//   DISCOVERY    meta.tables · table.exists · schema.fields
//   DDL          schema.table.create · schema.add_field ·
//                schema.add_choice · schema.set_autonumber
//   PROPERTIES   property.set · property.get · property.list
//   RECORDS      record.insert · record.insert_many · record.update ·
//                record.upsert · record.delete · record.get ·
//                record.query · record.count · record.aggregate
//                (add "platform": true to write to ANY table)
//   ACCESS       role.grant · role.revoke · user.roles
//   FILES        attachment.write · attachment.read · attachment.list
//   POWER        script.run · rest.call · event.fire · sys.log · cache.flush
//   ENGINE       engine.source · engine.selfupdate
//   BATCH        batch  (stop_on_error flag)
// ============================================================

(function process(request, response) {
    'use strict';

    var APP_SCOPE = 'x_infte_ops_int';
    var SVC_USER  = 'svc_operations_intelligence_api';
    var MAX_LIMIT = 10000;

    // ══════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ══════════════════════════════════════════════════════════
    var K = gs.getProperty(APP_SCOPE + '.engine_key', '');
    if (!K) {
        response.setStatus(503);
        response.setBody({ ok: false, error: 'Engine key not configured' });
        return;
    }
    var incomingKey = request.getHeader('X-Engine-Key') || '';
    if (!incomingKey || incomingKey !== K) {
        response.setStatus(403);
        response.setBody({ ok: false, error: 'Forbidden' });
        return;
    }

    // ══════════════════════════════════════════════════════════
    // PARSE BODY
    // ══════════════════════════════════════════════════════════
    var body = {};
    try {
        body = JSON.parse(request.body.dataString);
    } catch (e) {
        response.setStatus(400);
        response.setBody({ ok: false, error: 'Invalid JSON body' });
        return;
    }
    response.setContentType('application/json');

    // ══════════════════════════════════════════════════════════
    // SHARED HELPERS
    // ══════════════════════════════════════════════════════════

    function buildGr(tbl, qry) {
        var gr = new GlideRecord(tbl);
        if (qry && typeof qry === 'object') {
            for (var f in qry) {
                if (qry.hasOwnProperty(f)) gr.addQuery(f, qry[f]);
            }
        }
        return gr;
    }

    // getFields() is blocked in scoped context — enumerate via sys_dictionary
    // with a per-request cache so repeated rows on a table cost one query.
    var _fieldCache = {};
    function tableFields(tbl) {
        if (!_fieldCache[tbl]) {
            _fieldCache[tbl] = [];
            var dd = new GlideRecord('sys_dictionary');
            dd.addQuery('name', tbl);
            dd.addQuery('element', 'ISNOTEMPTY');
            dd.query();
            while (dd.next()) _fieldCache[tbl].push(dd.getValue('element'));
        }
        return _fieldCache[tbl];
    }
    function grToObj(gr, fieldsArr, useDisplay) {
        var obj = { sys_id: gr.getUniqueValue() };
        var flds = (fieldsArr && fieldsArr.length) ? fieldsArr : tableFields(gr.getTableName());
        for (var i = 0; i < flds.length; i++) {
            try {
                obj[flds[i]] = useDisplay ? gr.getDisplayValue(flds[i]) : gr.getValue(flds[i]);
            } catch (e) { /* skip unreadable */ }
        }
        return obj;
    }

    function instanceBase() {
        var u = gs.getProperty('glide.servlet.uri', '');
        if (!u) u = 'https://' + gs.getProperty('instance_name', '') + '.service-now.com';
        return u.replace(/\/$/, '');
    }

    var _appId = null;
    function appScopeSysId() {
        if (_appId !== null) return _appId;
        var g = new GlideRecord('sys_scope');
        g.addQuery('scope', APP_SCOPE);
        g.setLimit(1);
        g.query();
        _appId = g.next() ? g.getUniqueValue() : '';
        return _appId;
    }

    var _typeCache = {};
    function glideTypeId(name) {
        if (_typeCache[name] !== undefined) return _typeCache[name];
        var g = new GlideRecord('sys_glide_object');
        g.addQuery('name', name);
        g.setLimit(1);
        g.query();
        _typeCache[name] = g.next() ? g.getUniqueValue() : '';
        return _typeCache[name];
    }

    function resolveUser(idOrName) {
        if (!idOrName) return null;
        var g = new GlideRecord('sys_user');
        if (String(idOrName).length === 32 && g.get(idOrName)) return g.getUniqueValue();
        g = new GlideRecord('sys_user');
        g.addQuery('user_name', idOrName);
        g.setLimit(1);
        g.query();
        return g.next() ? g.getUniqueValue() : null;
    }
    function resolveRole(idOrName) {
        if (!idOrName) return null;
        var g = new GlideRecord('sys_user_role');
        if (String(idOrName).length === 32 && g.get(idOrName)) return g.getUniqueValue();
        g = new GlideRecord('sys_user_role');
        g.addQuery('name', idOrName);
        g.setLimit(1);
        g.query();
        return g.next() ? g.getUniqueValue() : null;
    }

    function encodeQuery(query, encoded) {
        var parts = [];
        if (query && typeof query === 'object') {
            for (var f in query) {
                if (query.hasOwnProperty(f)) parts.push(f + '=' + query[f]);
            }
        }
        if (encoded) parts.push(encoded);
        return parts.join('^');
    }

    // ── Internal authenticated REST call (PLATFORM level) ──────
    // Bypasses the scoped sandbox. Requires svc_password.
    function internalRest(method, path, payload, qParams, extraHeaders) {
        var pwd = gs.getProperty(APP_SCOPE + '.svc_password', '');
        if (!pwd) {
            return { ok: false, _status: 503,
                error: 'Property ' + APP_SCOPE + '.svc_password not set. Set it once via property.set to enable platform writes.' };
        }
        var rm;
        try { rm = new sn_ws.RESTMessageV2(); }
        catch (e) { return { ok: false, _status: 503, error: 'REST plugin unavailable: ' + String(e) }; }

        var meth = String(method || 'GET').toUpperCase();
        rm.setHttpMethod(meth);

        var url = instanceBase() + path;
        if (qParams && typeof qParams === 'object') {
            var parts = [];
            for (var pk in qParams) {
                if (qParams.hasOwnProperty(pk) && qParams[pk] !== undefined && qParams[pk] !== null) {
                    parts.push(encodeURIComponent(String(pk)) + '=' + encodeURIComponent(String(qParams[pk])));
                }
            }
            if (parts.length) url += (url.indexOf('?') >= 0 ? '&' : '?') + parts.join('&');
        }
        rm.setEndpoint(url);
        rm.setBasicAuth(SVC_USER, pwd);
        rm.setRequestHeader('Accept', 'application/json');
        rm.setRequestHeader('Content-Type', 'application/json');
        if (extraHeaders && typeof extraHeaders === 'object') {
            for (var hk in extraHeaders) {
                if (extraHeaders.hasOwnProperty(hk)) rm.setRequestHeader(hk, String(extraHeaders[hk]));
            }
        }
        if (payload !== null && payload !== undefined && meth !== 'GET' && meth !== 'DELETE') {
            rm.setRequestBody(JSON.stringify(payload));
        }
        rm.setHttpTimeout(60000);

        var r       = rm.execute();
        var status  = parseInt(r.getStatusCode(), 10) || 0;
        var respBody;
        try { respBody = JSON.parse(r.getBody()); }
        catch (e) { respBody = { raw: r.getBody() }; }

        var out = { ok: (status >= 200 && status < 300), _status: 200, status: status, body: respBody };
        if (!out.ok) { out.request = { method: meth, url: url }; }
        return out;
    }

    // ── Platform Table-API primitives (admin, sandbox-free) ────
    function platformInsert(tbl, data, displayValues, autoScope) {
        var payload = {};
        for (var k in data) { if (data.hasOwnProperty(k)) payload[k] = data[k]; }
        if (autoScope && payload.sys_scope === undefined) payload.sys_scope = appScopeSysId();
        var params = displayValues ? { sysparm_input_display_value: 'true' } : null;
        var res = internalRest('POST', '/api/now/table/' + tbl, payload, params, null);
        if (res.ok && res.body && res.body.result) res.sys_id = res.body.result.sys_id;
        return res;
    }
    function platformUpdate(tbl, sysId, data, displayValues) {
        var params = displayValues ? { sysparm_input_display_value: 'true' } : null;
        var res = internalRest('PATCH', '/api/now/table/' + tbl + '/' + sysId, data, params, null);
        if (res.ok && res.body && res.body.result) res.sys_id = res.body.result.sys_id;
        return res;
    }
    function platformDelete(tbl, sysId) {
        return internalRest('DELETE', '/api/now/table/' + tbl + '/' + sysId, null, null, null);
    }
    function platformGet(tbl, sysId, fields, displayValues) {
        var params = { sysparm_display_value: displayValues ? 'true' : 'false' };
        if (fields && fields.length) params.sysparm_fields = fields.join(',');
        return internalRest('GET', '/api/now/table/' + tbl + '/' + sysId, null, params, null);
    }
    function platformQuery(tbl, encQ, fields, limit, orderBy, orderByDesc, displayValues) {
        var query = encQ || '';
        if (orderBy)     query += (query ? '^' : '') + 'ORDERBY' + orderBy;
        if (orderByDesc) query += (query ? '^' : '') + 'ORDERBYDESC' + orderByDesc;
        var params = { sysparm_limit: limit || 100,
                       sysparm_display_value: displayValues ? 'true' : 'false' };
        if (query)             params.sysparm_query  = query;
        if (fields && fields.length) params.sysparm_fields = fields.join(',');
        return internalRest('GET', '/api/now/table/' + tbl, null, params, null);
    }

    // Convenience used by schema.* ops
    function tableInsert(tbl, payload, displayValues) {
        return platformInsert(tbl, payload, displayValues, false);
    }

    // ── Locate the engine's own Scripted REST operation record ─
    function engineOperationId(override) {
        if (override) return override;
        var ws = new GlideRecord('sys_ws_operation');
        ws.addQuery('name', 'Engine Router');
        ws.setLimit(1);
        ws.query();
        return ws.next() ? ws.getUniqueValue() : '';
    }

    // ══════════════════════════════════════════════════════════
    // OP CATALOG (for help)
    // ══════════════════════════════════════════════════════════
    var OP_CATALOG = [
        ['ping', 'health-check'],
        ['help', 'list every op'],
        ['now', 'server date-time'],
        ['scope.info', 'instance / user / scope details'],
        ['selftest', 'prove read + write + platform-write end-to-end'],
        ['meta.tables', 'list tables in the application scope'],
        ['table.exists', 'check whether a table exists'],
        ['schema.table.create', 'create a scoped table (sys_db_object)'],
        ['schema.fields', 'list all fields for a table'],
        ['schema.add_field', 'create a field (sys_dictionary)'],
        ['schema.add_choice', 'create a choice (sys_choice)'],
        ['schema.set_autonumber', 'configure auto-numbering (sys_number)'],
        ['property.set', 'write a system property'],
        ['property.get', 'read a system property'],
        ['property.list', 'list properties by prefix'],
        ['record.insert', 'create one record (+platform)'],
        ['record.insert_many', 'create many records (+platform)'],
        ['record.update', 'update by sys_id or query (+platform)'],
        ['record.upsert', 'insert-or-update (+platform)'],
        ['record.delete', 'delete records matching query (+platform)'],
        ['record.get', 'fetch one record (+platform)'],
        ['record.query', 'fetch many records (+platform)'],
        ['record.count', 'count records'],
        ['record.aggregate', 'COUNT / SUM / AVG / MIN / MAX'],
        ['role.grant', 'grant a role to a user'],
        ['role.revoke', 'revoke a role from a user'],
        ['user.roles', 'list a user\'s roles'],
        ['attachment.write', 'attach base64 content to a record'],
        ['attachment.read', 'read attachment content as base64'],
        ['attachment.list', 'list a record\'s attachments'],
        ['script.run', 'execute JS in scope context'],
        ['rest.call', 'authenticated internal REST call'],
        ['event.fire', 'fire a platform event'],
        ['sys.log', 'write to the system log'],
        ['cache.flush', 'flush platform caches'],
        ['engine.source', 'inspect the engine\'s own stored script'],
        ['engine.selfupdate', 'replace the engine\'s own script'],
        ['batch', 'run many ops in one call']
    ];

    // ══════════════════════════════════════════════════════════
    // OP DISPATCHER — single ops and each batch item route here.
    // Returns a plain object; a numeric _status key (if present)
    // sets the outer HTTP status and is stripped before sending.
    // ══════════════════════════════════════════════════════════
    function dispatch(ctx) {
        var o  = ctx.op    || '';
        var t  = ctx.table || '';
        var d  = ctx.data  || {};
        var q  = ctx.query || {};
        var l  = Math.min(parseInt(ctx.limit, 10) || 100, MAX_LIMIT);
        var dv = !!ctx.display_values;
        var pf = !!ctx.platform;                       // route writes via platform REST
        var sc = (ctx.scope !== false);                // auto-scope platform writes (default on)

        switch (o) {

        // ── diagnostics ────────────────────────────────────────
        case 'ping':
            return { ok: true, pong: true, scope: gs.getCurrentScopeName(),
                     ts: new GlideDateTime().getDisplayValue() };

        case 'help':
            var ops = [];
            for (var hi = 0; hi < OP_CATALOG.length; hi++) {
                ops.push({ op: OP_CATALOG[hi][0], description: OP_CATALOG[hi][1] });
            }
            return { ok: true, count: ops.length, ops: ops };

        case 'now':
            var gdt = new GlideDateTime();
            return { ok: true, utc: gdt.getValue(), display: gdt.getDisplayValue() };

        case 'scope.info':
            return { ok: true, scope: gs.getCurrentScopeName(), user: gs.getUserName(),
                     is_admin: gs.hasRole('admin'), app_sys_id: appScopeSysId(),
                     platform_writes_enabled: !!gs.getProperty(APP_SCOPE + '.svc_password', ''),
                     instance: gs.getProperty('instance_name', 'unknown'), base_url: instanceBase() };

        // selftest — exercises the full capability matrix and cleans up
        case 'selftest':
            var matrix = {}, allOk = true;
            // 1. auth / config
            matrix.svc_password_set = !!gs.getProperty(APP_SCOPE + '.svc_password', '');
            matrix.is_admin = gs.hasRole('admin');
            matrix.app_scope_resolved = !!appScopeSysId();
            // 2. scoped read
            try {
                var stR = new GlideRecord('sys_user'); stR.setLimit(1); stR.query();
                matrix.scoped_read = stR.next();
            } catch (e) { matrix.scoped_read = false; matrix.scoped_read_err = String(e); }
            // 3. scoped write (property)
            try {
                var stKey = APP_SCOPE + '.__selftest';
                gs.setProperty(stKey, 'ok-' + new GlideDateTime().getNumericValue());
                matrix.scoped_write = (gs.getProperty(stKey, '').indexOf('ok-') === 0);
            } catch (e) { matrix.scoped_write = false; matrix.scoped_write_err = String(e); }
            // 4. platform write/read/delete round-trip on a system table
            if (matrix.svc_password_set) {
                try {
                    var ins = platformInsert('sys_user_preference',
                        { name: APP_SCOPE + '.__selftest', value: String(new GlideDateTime().getNumericValue()), type: 'string' },
                        false, false);
                    matrix.platform_write = ins.ok;
                    if (ins.ok && ins.sys_id) {
                        var got = platformGet('sys_user_preference', ins.sys_id, ['name', 'value'], false);
                        matrix.platform_read = got.ok;
                        var del = platformDelete('sys_user_preference', ins.sys_id);
                        matrix.platform_delete = del.ok;
                    } else {
                        matrix.platform_read = false; matrix.platform_delete = false;
                        matrix.platform_write_detail = ins.body || ins.error;
                    }
                } catch (e) { matrix.platform_write = false; matrix.platform_err = String(e); }
            } else {
                matrix.platform_write = false; matrix.platform_read = false; matrix.platform_delete = false;
            }
            ['svc_password_set','is_admin','app_scope_resolved','scoped_read','scoped_write',
             'platform_write','platform_read','platform_delete'].forEach(function (kk) {
                if (!matrix[kk]) allOk = false;
            });
            return { ok: allOk, capability: matrix,
                     summary: allOk ? 'Fully autonomous: build + maintenance ready.'
                                    : 'One or more capabilities unavailable — see capability matrix.' };

        case 'meta.tables':
            var mtGr = new GlideRecord('sys_db_object');
            mtGr.addQuery('sys_scope', appScopeSysId());
            mtGr.orderBy('name');
            mtGr.query();
            var tables = [];
            while (mtGr.next()) {
                tables.push({ name: mtGr.getValue('name'), label: mtGr.getValue('label'),
                              sys_id: mtGr.getUniqueValue() });
            }
            return { ok: true, count: tables.length, tables: tables };

        case 'table.exists':
            var chk = new GlideRecord('sys_db_object');
            chk.addQuery('name', t);
            chk.setLimit(1);
            chk.query();
            return { ok: true, exists: !!chk.next() };

        // ── schema / DDL (platform REST, scope-aware) ──────────

        // schema.table.create — table is the SHORT suffix (e.g. "person").
        // data: { label, name_field, is_extendable }
        case 'schema.table.create':
            if (!t) return { _status: 400, ok: false, error: 'table (short name) required' };
            var stFullName = APP_SCOPE + '_' + t;
            var stCheck = new GlideRecord('sys_db_object');
            stCheck.addQuery('name', stFullName);
            stCheck.setLimit(1);
            stCheck.query();
            if (stCheck.next()) {
                return { ok: true, skipped: true, reason: 'table exists',
                         full_name: stFullName, sys_id: stCheck.getUniqueValue() };
            }
            var stPayload = { name: stFullName, label: d.label || t,
                sys_scope: appScopeSysId(), is_extendable: d.is_extendable ? 'true' : 'false',
                access: 'public', create_access: 'true', read_access: 'true' };
            if (d.name_field) stPayload.name_field = d.name_field;
            var stRes = tableInsert('sys_db_object', stPayload, false);
            if (!stRes.ok) { delete stRes._status; return stRes; }
            var stCreatedName = (stRes.body && stRes.body.result) ? stRes.body.result.name : '(unknown)';
            return { ok: true, full_name: stFullName, created_name: stCreatedName,
                     sys_id: stRes.sys_id || '', name_ok: stCreatedName === stFullName };

        case 'schema.fields':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var sfGr = new GlideRecord('sys_dictionary');
            sfGr.addQuery('name', t);
            sfGr.addQuery('element', 'ISNOTEMPTY');
            sfGr.orderBy('element');
            sfGr.query();
            var sfFields = [];
            while (sfGr.next()) {
                sfFields.push({ element: sfGr.getValue('element'), column_label: sfGr.getValue('column_label'),
                    internal_type: sfGr.getValue('internal_type'), max_length: sfGr.getValue('max_length'),
                    mandatory: sfGr.getValue('mandatory'), default_value: sfGr.getValue('default_value'),
                    reference: sfGr.getValue('reference'), read_only: sfGr.getValue('read_only') });
            }
            return { ok: true, table: t, count: sfFields.length, fields: sfFields };

        // data: { element, label, type, max_length, reference, mandatory,
        //         default_value, choice, read_only }
        case 'schema.add_field':
            if (!t)         return { _status: 400, ok: false, error: 'table required' };
            if (!d.element) return { _status: 400, ok: false, error: 'data.element required' };
            if (!d.type)    return { _status: 400, ok: false, error: 'data.type required' };
            var exF = new GlideRecord('sys_dictionary');
            exF.addQuery('name', t);
            exF.addQuery('element', d.element);
            exF.setLimit(1);
            exF.query();
            if (exF.next()) return { ok: true, skipped: true, reason: 'field exists', sys_id: exF.getUniqueValue() };
            var typeId = glideTypeId(d.type);
            if (!typeId) return { _status: 400, ok: false, error: 'Unknown field type: ' + d.type };
            var fPayload = { name: t, element: d.element, column_label: d.label || d.element,
                internal_type: typeId, active: 'true', sys_scope: appScopeSysId() };
            if (d.max_length    !== undefined) fPayload.max_length    = String(d.max_length);
            if (d.reference)                   fPayload.reference     = d.reference;
            if (d.mandatory     !== undefined) fPayload.mandatory     = d.mandatory ? 'true' : 'false';
            if (d.default_value !== undefined) fPayload.default_value = String(d.default_value);
            if (d.choice        !== undefined) fPayload.choice        = String(d.choice);
            if (d.read_only     !== undefined) fPayload.read_only     = d.read_only ? 'true' : 'false';
            var fRes = tableInsert('sys_dictionary', fPayload, false);
            delete fRes._status;
            return fRes;

        // data: { element, value, label, sequence }
        case 'schema.add_choice':
            if (!t)         return { _status: 400, ok: false, error: 'table required' };
            if (!d.element) return { _status: 400, ok: false, error: 'data.element required' };
            var exC = new GlideRecord('sys_choice');
            exC.addQuery('name', t);
            exC.addQuery('element', d.element);
            exC.addQuery('value', d.value);
            exC.setLimit(1);
            exC.query();
            if (exC.next()) return { ok: true, skipped: true, reason: 'choice exists', sys_id: exC.getUniqueValue() };
            var cRes = tableInsert('sys_choice', { name: t, element: d.element, value: d.value,
                label: d.label || d.value, sequence: String(d.sequence || 0), sys_scope: appScopeSysId() }, false);
            delete cRes._status;
            return cRes;

        // data: { prefix, start }
        case 'schema.set_autonumber':
            if (!t)        return { _status: 400, ok: false, error: 'table required' };
            if (!d.prefix) return { _status: 400, ok: false, error: 'data.prefix required' };
            var exN = new GlideRecord('sys_number');
            exN.addQuery('category', t);
            exN.setLimit(1);
            exN.query();
            if (exN.next()) return { ok: true, skipped: true, reason: 'autonumber exists', sys_id: exN.getUniqueValue() };
            var nRes = tableInsert('sys_number', { category: t, prefix: d.prefix,
                number: String(d.start || 1001), sys_scope: appScopeSysId() }, false);
            delete nRes._status;
            return nRes;

        // ── properties ─────────────────────────────────────────
        case 'property.set':
            if (!d.key) return { _status: 400, ok: false, error: 'data.key required' };
            gs.setProperty(d.key, d.value !== undefined ? String(d.value) : '', d.description || '');
            return { ok: true, key: d.key };

        case 'property.get':
            if (!d.key) return { _status: 400, ok: false, error: 'data.key required' };
            return { ok: true, key: d.key, value: gs.getProperty(d.key, null) };

        case 'property.list':
            var plGr = new GlideRecord('sys_properties');
            if (d.prefix) plGr.addQuery('name', 'STARTSWITH', d.prefix);
            plGr.orderBy('name');
            plGr.setLimit(l);
            plGr.query();
            var props = [];
            while (plGr.next()) {
                props.push({ key: plGr.getValue('name'), value: plGr.getValue('value'),
                             description: plGr.getValue('description') });
            }
            return { ok: true, count: props.length, properties: props };

        // ── records (scoped GlideRecord OR platform via "platform":true) ──
        case 'record.insert':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                var pIns = platformInsert(t, d, dv, sc);
                if (pIns.ok) return { ok: true, sys_id: pIns.sys_id, via: 'platform' };
                return { _status: pIns.status || 500, ok: false, error: 'Platform insert failed',
                         status: pIns.status, body: pIns.body };
            }
            var ins = new GlideRecord(t);
            ins.initialize();
            for (var fi in d) {
                if (!d.hasOwnProperty(fi)) continue;
                try {
                    if (ctx.use_display_value && ctx.use_display_value[fi]) ins[fi].setDisplayValue(d[fi]);
                    else ins.setValue(fi, d[fi]);
                } catch (e) { /* skip unwritable */ }
            }
            if (ctx.bypass_rules) { ins.setWorkflow(false); ins.autoSysFields(false); }
            var newId = ins.insert();
            if (newId) return { ok: true, sys_id: String(newId) };
            return { _status: 500, ok: false, error: 'Insert failed',
                     last_error: ins.getLastErrorMessage ? String(ins.getLastErrorMessage()) : 'n/a' };

        // data.records: [ {..}, {..} ]
        case 'record.insert_many':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var recs = d.records || [];
            if (!recs.length) return { _status: 400, ok: false, error: 'data.records array required' };
            var imIds = [], imFail = 0;
            for (var ri = 0; ri < recs.length; ri++) {
                var row = recs[ri], imId = null;
                if (pf) {
                    var pim = platformInsert(t, row, dv, sc);
                    imId = pim.ok ? pim.sys_id : null;
                } else {
                    var im = new GlideRecord(t);
                    im.initialize();
                    for (var rf in row) { if (row.hasOwnProperty(rf)) { try { im.setValue(rf, row[rf]); } catch (e) {} } }
                    if (ctx.bypass_rules) { im.setWorkflow(false); im.autoSysFields(false); }
                    var x = im.insert();
                    imId = x ? String(x) : null;
                }
                if (imId) imIds.push(imId); else { imIds.push(null); imFail++; }
            }
            return { ok: imFail === 0, inserted: imIds.length - imFail, failed: imFail, sys_ids: imIds };

        case 'record.update':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                if (d.sys_id) {
                    var pd = {}; for (var pk1 in d) { if (d.hasOwnProperty(pk1) && pk1 !== 'sys_id') pd[pk1] = d[pk1]; }
                    var pu = platformUpdate(t, d.sys_id, pd, dv);
                    if (pu.ok) return { ok: true, updated: 1, sys_id: d.sys_id, via: 'platform' };
                    return { _status: pu.status || 500, ok: false, error: 'Platform update failed', status: pu.status, body: pu.body };
                }
                var pEnc = encodeQuery(q, ctx.encoded_query);
                if (!pEnc) return { _status: 400, ok: false, error: 'platform update needs data.sys_id, query, or encoded_query' };
                var pql = platformQuery(t, pEnc, ['sys_id'], l, '', '', false);
                if (!pql.ok) return { _status: pql.status || 500, ok: false, error: 'Platform query failed', body: pql.body };
                var pRows = (pql.body && pql.body.result) ? pql.body.result : [];
                var pdat = {}; for (var pk2 in d) { if (d.hasOwnProperty(pk2)) pdat[pk2] = d[pk2]; }
                var pUpd = 0;
                for (var pi = 0; pi < pRows.length; pi++) {
                    var pr = platformUpdate(t, pRows[pi].sys_id, pdat, dv);
                    if (pr.ok) pUpd++;
                }
                return { ok: true, updated: pUpd, via: 'platform' };
            }
            if (d.sys_id) {
                var ubi = new GlideRecord(t);
                if (!ubi.get(d.sys_id)) return { _status: 404, ok: false, error: 'Record not found' };
                for (var ufId in d) { if (d.hasOwnProperty(ufId) && ufId !== 'sys_id') ubi.setValue(ufId, d[ufId]); }
                if (ctx.bypass_rules) { ubi.setWorkflow(false); ubi.autoSysFields(false); }
                ubi.update();
                return { ok: true, updated: 1, sys_id: ubi.getUniqueValue() };
            }
            var upd = buildGr(t, q);
            if (ctx.encoded_query) upd.addEncodedQuery(ctx.encoded_query);
            upd.query();
            var updCount = 0;
            while (upd.next()) {
                for (var uf in d) { if (d.hasOwnProperty(uf)) upd.setValue(uf, d[uf]); }
                if (ctx.bypass_rules) { upd.setWorkflow(false); }
                upd.update();
                updCount++;
            }
            return { ok: true, updated: updCount };

        case 'record.upsert':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                var uEnc = encodeQuery(q, ctx.encoded_query);
                if (!uEnc) return { _status: 400, ok: false, error: 'platform upsert needs a query or encoded_query to match on' };
                var uq = platformQuery(t, uEnc, ['sys_id'], 1, '', '', false);
                if (!uq.ok) return { _status: uq.status || 500, ok: false, error: 'Platform query failed', body: uq.body };
                var uRows = (uq.body && uq.body.result) ? uq.body.result : [];
                if (uRows.length) {
                    var puu = platformUpdate(t, uRows[0].sys_id, d, dv);
                    if (puu.ok) return { ok: true, action: 'updated', sys_id: uRows[0].sys_id, via: 'platform' };
                    return { _status: puu.status || 500, ok: false, error: 'Platform update failed', status: puu.status, body: puu.body };
                }
                var pui = platformInsert(t, d, dv, sc);
                if (pui.ok) return { ok: true, action: 'inserted', sys_id: pui.sys_id, via: 'platform' };
                return { _status: pui.status || 500, ok: false, error: 'Platform insert failed', status: pui.status, body: pui.body };
            }
            var ups = buildGr(t, q);
            if (ctx.encoded_query) ups.addEncodedQuery(ctx.encoded_query);
            ups.query();
            if (ups.next()) {
                for (var uf2 in d) { if (d.hasOwnProperty(uf2)) ups.setValue(uf2, d[uf2]); }
                ups.update();
                return { ok: true, action: 'updated', sys_id: ups.getUniqueValue() };
            }
            var ins2 = new GlideRecord(t);
            ins2.initialize();
            for (var if3 in d) { if (d.hasOwnProperty(if3)) ins2.setValue(if3, d[if3]); }
            return { ok: true, action: 'inserted', sys_id: String(ins2.insert()) };

        case 'record.delete':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (!ctx.encoded_query && (!q || !Object.keys(q).length) && !d.sys_id) {
                return { _status: 400, ok: false, error: 'Refusing unbounded delete: provide query, encoded_query, or data.sys_id' };
            }
            if (pf) {
                if (d.sys_id) {
                    var pdel = platformDelete(t, d.sys_id);
                    if (pdel.ok) return { ok: true, deleted: 1, via: 'platform' };
                    return { _status: pdel.status || 500, ok: false, error: 'Platform delete failed', status: pdel.status, body: pdel.body };
                }
                var dEnc = encodeQuery(q, ctx.encoded_query);
                var dq = platformQuery(t, dEnc, ['sys_id'], l, '', '', false);
                if (!dq.ok) return { _status: dq.status || 500, ok: false, error: 'Platform query failed', body: dq.body };
                var dRows = (dq.body && dq.body.result) ? dq.body.result : [];
                var pDel = 0;
                for (var di = 0; di < dRows.length; di++) {
                    var dr = platformDelete(t, dRows[di].sys_id);
                    if (dr.ok) pDel++;
                }
                return { ok: true, deleted: pDel, via: 'platform' };
            }
            var del = buildGr(t, q);
            if (d.sys_id) del.addQuery('sys_id', d.sys_id);
            if (ctx.encoded_query) del.addEncodedQuery(ctx.encoded_query);
            del.query();
            var delCount = 0;
            while (del.next()) { del.deleteRecord(); delCount++; }
            return { ok: true, deleted: delCount };

        case 'record.get':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                if (d.sys_id) {
                    var pg = platformGet(t, d.sys_id, ctx.fields || null, dv);
                    if (pg.ok && pg.body && pg.body.result) return { ok: true, record: pg.body.result, via: 'platform' };
                    return { _status: 404, ok: false, error: 'Not found', body: pg.body };
                }
                var gEnc = encodeQuery(q, ctx.encoded_query);
                var pgq = platformQuery(t, gEnc, ctx.fields || null, 1, ctx.order_by, ctx.order_by_desc, dv);
                if (pgq.ok && pgq.body && pgq.body.result && pgq.body.result.length) {
                    return { ok: true, record: pgq.body.result[0], via: 'platform' };
                }
                return { _status: 404, ok: false, error: 'Not found' };
            }
            var getGr;
            if (d.sys_id) {
                getGr = new GlideRecord(t);
                if (!getGr.get(d.sys_id)) return { _status: 404, ok: false, error: 'Not found' };
                return { ok: true, record: grToObj(getGr, ctx.fields || null, dv) };
            }
            getGr = buildGr(t, q);
            if (ctx.encoded_query) getGr.addEncodedQuery(ctx.encoded_query);
            getGr.setLimit(1);
            getGr.query();
            if (!getGr.next()) return { _status: 404, ok: false, error: 'Not found' };
            return { ok: true, record: grToObj(getGr, ctx.fields || null, dv) };

        case 'record.query':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                var qEnc = encodeQuery(q, ctx.encoded_query);
                var pq = platformQuery(t, qEnc, ctx.fields || null, l, ctx.order_by, ctx.order_by_desc, dv);
                if (!pq.ok) return { _status: pq.status || 500, ok: false, error: 'Platform query failed', body: pq.body };
                var pqRows = (pq.body && pq.body.result) ? pq.body.result : [];
                return { ok: true, count: pqRows.length, records: pqRows, via: 'platform' };
            }
            var qGr = buildGr(t, q);
            if (ctx.encoded_query) qGr.addEncodedQuery(ctx.encoded_query);
            if (ctx.order_by)      qGr.orderBy(ctx.order_by);
            if (ctx.order_by_desc) qGr.orderByDesc(ctx.order_by_desc);
            qGr.setLimit(l);
            qGr.query();
            var rows = [];
            while (qGr.next()) rows.push(grToObj(qGr, ctx.fields || null, dv));
            return { ok: true, count: rows.length, records: rows };

        case 'record.count':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var cGr = buildGr(t, q);
            if (ctx.encoded_query) cGr.addEncodedQuery(ctx.encoded_query);
            cGr.query();
            return { ok: true, count: cGr.getRowCount() };

        case 'record.aggregate':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var agg = new GlideAggregate(t);
            for (var aqf in q) { if (q.hasOwnProperty(aqf)) agg.addQuery(aqf, q[aqf]); }
            if (ctx.encoded_query) agg.addEncodedQuery(ctx.encoded_query);
            var aggType  = (d.type || 'COUNT').toUpperCase();
            var aggField = d.field || '';
            var groupBy  = ctx.group_by || '';
            if (aggField) agg.addAggregate(aggType, aggField); else agg.addAggregate('COUNT');
            if (groupBy)  agg.groupBy(groupBy);
            agg.query();
            var aggRows = [];
            while (agg.next()) {
                var aggRow = {};
                if (groupBy) aggRow[groupBy] = agg.getValue(groupBy);
                aggRow.value = aggField ? agg.getAggregate(aggType, aggField) : agg.getAggregate('COUNT');
                aggRows.push(aggRow);
            }
            return { ok: true, count: aggRows.length, rows: aggRows };

        // ── access (roles) ─────────────────────────────────────
        case 'role.grant':
            var gUid = resolveUser(d.user), gRid = resolveRole(d.role);
            if (!gUid) return { _status: 404, ok: false, error: 'User not found: ' + d.user };
            if (!gRid) return { _status: 404, ok: false, error: 'Role not found: ' + d.role };
            var exR = new GlideRecord('sys_user_has_role');
            exR.addQuery('user', gUid);
            exR.addQuery('role', gRid);
            exR.setLimit(1);
            exR.query();
            if (exR.next()) return { ok: true, skipped: true, reason: 'already granted', sys_id: exR.getUniqueValue() };
            var grRes = tableInsert('sys_user_has_role', { user: gUid, role: gRid }, false);
            delete grRes._status;
            return grRes;

        case 'role.revoke':
            var rUid = resolveUser(d.user), rRid = resolveRole(d.role);
            if (!rUid) return { _status: 404, ok: false, error: 'User not found: ' + d.user };
            if (!rRid) return { _status: 404, ok: false, error: 'Role not found: ' + d.role };
            var rvGr = new GlideRecord('sys_user_has_role');
            rvGr.addQuery('user', rUid);
            rvGr.addQuery('role', rRid);
            rvGr.query();
            var rvCount = 0;
            while (rvGr.next()) { rvGr.deleteRecord(); rvCount++; }
            return { ok: true, revoked: rvCount };

        case 'user.roles':
            var urUid = resolveUser(d.user);
            if (!urUid) return { _status: 404, ok: false, error: 'User not found: ' + d.user };
            var urGr = new GlideRecord('sys_user_has_role');
            urGr.addQuery('user', urUid);
            urGr.query();
            var roles = [];
            while (urGr.next()) roles.push(urGr.getDisplayValue('role'));
            return { ok: true, user: d.user, count: roles.length, roles: roles };

        // ── attachments ────────────────────────────────────────
        case 'attachment.write':
            if (!d.table || !d.sys_id || !d.file_name || !d.base64) {
                return { _status: 400, ok: false, error: 'data.table, data.sys_id, data.file_name, data.base64 required' };
            }
            var awGr = new GlideRecord(d.table);
            if (!awGr.get(d.sys_id)) return { _status: 404, ok: false, error: 'Target record not found' };
            var sa = new GlideSysAttachment();
            var aId = sa.writeBase64(awGr, d.file_name, d.content_type || 'application/octet-stream', d.base64);
            if (!aId) return { _status: 500, ok: false, error: 'Attachment write failed' };
            return { ok: true, sys_id: String(aId) };

        case 'attachment.read':
            if (!d.attachment_sys_id) return { _status: 400, ok: false, error: 'data.attachment_sys_id required' };
            var arGr = new GlideRecord('sys_attachment');
            if (!arGr.get(d.attachment_sys_id)) return { _status: 404, ok: false, error: 'Attachment not found' };
            var sa2 = new GlideSysAttachment();
            return { ok: true, file_name: arGr.getValue('file_name'),
                     content_type: arGr.getValue('content_type'), base64: String(sa2.getContentBase64(arGr)) };

        case 'attachment.list':
            if (!d.table || !d.sys_id) return { _status: 400, ok: false, error: 'data.table and data.sys_id required' };
            var alGr = new GlideRecord('sys_attachment');
            alGr.addQuery('table_name', d.table);
            alGr.addQuery('table_sys_id', d.sys_id);
            alGr.query();
            var atts = [];
            while (alGr.next()) {
                atts.push({ sys_id: alGr.getUniqueValue(), file_name: alGr.getValue('file_name'),
                            content_type: alGr.getValue('content_type'), size_bytes: alGr.getValue('size_bytes') });
            }
            return { ok: true, count: atts.length, attachments: atts };

        // ── power tools ────────────────────────────────────────
        case 'script.run':
            if (!d.script) return { _status: 400, ok: false, error: 'data.script required' };
            var result;
            try { eval(d.script); } // jshint ignore:line
            catch (se) { return { ok: false, error: String(se) }; }
            return { ok: true, result: (typeof result !== 'undefined') ? result : null };

        case 'rest.call':
            if (!d.path) return { _status: 400, ok: false, error: 'data.path required' };
            var rcRes = internalRest(d.method || 'GET', d.path,
                (d.body !== undefined ? d.body : null), d.params || {}, d.headers || {});
            delete rcRes._status;
            return rcRes;

        case 'event.fire':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            var evGr = null;
            if (d.table && d.sys_id) { evGr = new GlideRecord(d.table); evGr.get(d.sys_id); }
            gs.eventQueue(d.name, evGr, d.param1 || '', d.param2 || '');
            return { ok: true, event: d.name };

        case 'sys.log':
            gs.info((d.source || APP_SCOPE + '.engine') + ': ' + (d.message || ''));
            return { ok: true };

        case 'cache.flush':
            gs.flushCache();
            return { ok: true, flushed: true };

        // ── engine self-management ─────────────────────────────
        case 'engine.source':
            var esId = engineOperationId(d.operation_sys_id);
            if (!esId) return { _status: 404, ok: false, error: 'Engine Router operation not found' };
            var esGet = platformGet('sys_ws_operation', esId, ['name', 'operation_script'], false);
            if (!esGet.ok || !esGet.body || !esGet.body.result) {
                return { _status: esGet.status || 500, ok: false, error: 'Could not read engine operation', body: esGet.body };
            }
            var esScript = esGet.body.result.operation_script || '';
            return { ok: true, operation_sys_id: esId, name: esGet.body.result.name,
                     bytes: esScript.length,
                     marker_ok: (esScript.indexOf('X-Engine-Key') >= 0 && esScript.indexOf('function dispatch') >= 0) };

        // engine.selfupdate — replace the engine's own operation_script.
        // Safety: the new script must contain structural markers so a blank
        // or unrelated payload can never brick the endpoint.
        case 'engine.selfupdate':
            if (!d.script) return { _status: 400, ok: false, error: 'data.script required' };
            if (d.script.indexOf('X-Engine-Key') < 0 || d.script.indexOf('function dispatch') < 0) {
                return { _status: 400, ok: false, error: 'Safety check failed: script missing engine markers (X-Engine-Key / function dispatch)' };
            }
            var suId = engineOperationId(d.operation_sys_id);
            if (!suId) return { _status: 404, ok: false, error: 'Engine Router operation not found; pass data.operation_sys_id' };
            var suRes = platformUpdate('sys_ws_operation', suId, { operation_script: d.script }, false);
            if (!suRes.ok) return { _status: suRes.status || 500, ok: false, error: 'Self-update failed', status: suRes.status, body: suRes.body };
            return { ok: true, operation_sys_id: suId, bytes: d.script.length, note: 'Engine script replaced. Re-run selftest to confirm.' };

        default:
            return { _status: 400, ok: false, error: 'Unknown op: ' + o };
        }
    }

    // ══════════════════════════════════════════════════════════
    // MAIN — single op or batch
    // ══════════════════════════════════════════════════════════
    function normalize(src) {
        return {
            op:                src.op                 || '',
            table:             src.table              || '',
            data:              src.data               || {},
            query:             src.query              || {},
            limit:             src.limit              || 100,
            fields:            src.fields             || null,
            encoded_query:     src.encoded_query      || '',
            order_by:          src.order_by           || '',
            order_by_desc:     src.order_by_desc      || '',
            display_values:    src.display_values     || false,
            group_by:          src.group_by           || '',
            bypass_rules:      src.bypass_rules       || false,
            platform:          src.platform           || false,
            scope:             (src.scope !== undefined ? src.scope : true),
            use_display_value: src.use_display_value  || null
        };
    }

    try {
        if (body.op === 'batch') {
            var bOps        = body.ops || [];
            var stopOnError = (body.stop_on_error !== false);
            var bResults    = [];
            var hadError    = false;

            for (var bi = 0; bi < bOps.length; bi++) {
                var bCtx = bOps[bi];
                if (stopOnError && hadError) {
                    bResults.push({ op: bCtx.op || '', skipped: true, result: { ok: false, error: 'skipped after prior error' } });
                    continue;
                }
                var bRes;
                try { bRes = dispatch(normalize(bCtx)); }
                catch (be) { bRes = { ok: false, error: String(be) }; }
                if (!bRes.ok) hadError = true;
                var bHttp = bRes._status || 200;
                delete bRes._status;
                bResults.push({ op: bCtx.op || '', status: bHttp, result: bRes });
            }
            response.setStatus(200);
            response.setBody({ ok: !hadError, count: bResults.length, results: bResults });

        } else {
            var res = dispatch(normalize(body));
            var httpStatus = res._status || 200;
            delete res._status;
            response.setStatus(httpStatus);
            response.setBody(res);
        }
    } catch (e) {
        response.setStatus(500);
        response.setBody({ ok: false, error: String(e) });
    }

})(request, response);
