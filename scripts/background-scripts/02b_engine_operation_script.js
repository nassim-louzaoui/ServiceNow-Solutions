// ============================================================
// OPERATIONS INTELLIGENCE — ENGINE (Enhanced)
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
//   DIAGNOSTICS  ping · help · now · scope.info · selftest · engine.status
//   DISCOVERY    meta.tables · meta.script_includes · meta.business_rules ·
//                meta.notifications · meta.widgets · meta.jobs · meta.acls ·
//                meta.all · table.exists · schema.fields · table.schema
//   DDL          schema.table.create · schema.table.delete ·
//                schema.add_field · schema.field.update · schema.field.delete ·
//                schema.add_choice · schema.set_autonumber · schema.index.create
//   PROPERTIES   property.set · property.get · property.list · property.delete
//   RECORDS      record.insert · record.insert_many · record.update · record.patch ·
//                record.upsert · record.delete · record.bulk_delete · record.get ·
//                record.find · record.query · record.clone · record.count ·
//                record.aggregate  (add "platform":true to write to ANY table)
//   ACL          acl.create · acl.delete · acl.list
//   ACCESS       role.grant · role.revoke · user.roles
//   USERS        user.create · user.get · user.update
//   GROUPS       group.create · group.add_member · group.remove_member · group.members
//   UPDATE SETS  update_set.create · update_set.activate · update_set.list
//   ARTIFACTS    artifact.script_include · artifact.business_rule ·
//                artifact.notification · artifact.scheduled_job ·
//                artifact.client_script · artifact.ui_action · artifact.widget
//   FILES        attachment.write · attachment.read · attachment.list · attachment.delete
//   POWER        script.run · rest.call · event.fire · sys.log · cache.flush · sys.id
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

    function resolveGroup(idOrName) {
        if (!idOrName) return null;
        var g = new GlideRecord('sys_user_group');
        if (String(idOrName).length === 32 && g.get(idOrName)) return g.getUniqueValue();
        g = new GlideRecord('sys_user_group');
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

    function platformQuery(tbl, encQ, fields, limit, orderBy, orderByDesc, displayValues, offset) {
        var query = encQ || '';
        if (orderBy)     query += (query ? '^' : '') + 'ORDERBY' + orderBy;
        if (orderByDesc) query += (query ? '^' : '') + 'ORDERBYDESC' + orderByDesc;
        var params = { sysparm_limit: limit || 100,
                       sysparm_display_value: displayValues ? 'true' : 'false' };
        if (query)               params.sysparm_query  = query;
        if (fields && fields.length) params.sysparm_fields = fields.join(',');
        if (offset > 0)          params.sysparm_offset = offset;
        return internalRest('GET', '/api/now/table/' + tbl, null, params, null);
    }

    function tableInsert(tbl, payload, displayValues) {
        return platformInsert(tbl, payload, displayValues, false);
    }

    // ── Artifact upsert: find by name/key, update or insert ───
    // matchField: the field to search on (e.g. 'name', 'api_name')
    // Returns { ok, action, sys_id }
    function artifactUpsert(tbl, matchField, matchValue, payload, scopeAuto) {
        var existing = platformQuery(tbl, matchField + '=' + matchValue, ['sys_id'], 1, '', '', false, 0);
        if (!existing.ok) return { ok: false, error: 'Query failed', body: existing.body };
        var rows = (existing.body && existing.body.result) ? existing.body.result : [];
        if (rows.length) {
            var upd = platformUpdate(tbl, rows[0].sys_id, payload, false);
            if (!upd.ok) return { ok: false, error: 'Update failed', status: upd.status, body: upd.body };
            return { ok: true, action: 'updated', sys_id: rows[0].sys_id };
        }
        if (scopeAuto && payload.sys_scope === undefined) payload.sys_scope = appScopeSysId();
        var ins = internalRest('POST', '/api/now/table/' + tbl, payload, null, null);
        if (!ins.ok) return { ok: false, error: 'Insert failed', status: ins.status, body: ins.body };
        var newId = (ins.body && ins.body.result) ? ins.body.result.sys_id : '';
        return { ok: true, action: 'inserted', sys_id: newId };
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

    // ── Collect all artifacts for a given table/scope ──────────
    function metaList(tbl, fields, labelField) {
        var appId = appScopeSysId();
        var gr = new GlideRecord(tbl);
        gr.addQuery('sys_scope', appId);
        gr.orderBy(labelField || 'name');
        gr.query();
        var rows = [];
        while (gr.next()) {
            var row = { sys_id: gr.getUniqueValue() };
            for (var fi = 0; fi < fields.length; fi++) {
                try { row[fields[fi]] = gr.getValue(fields[fi]); } catch (e) {}
            }
            rows.push(row);
        }
        return rows;
    }

    // ══════════════════════════════════════════════════════════
    // OP CATALOG
    // ══════════════════════════════════════════════════════════
    var OP_CATALOG = [
        // DIAGNOSTICS
        ['ping',                   'health-check'],
        ['help',                   'list every op with description'],
        ['now',                    'server date-time (UTC + display)'],
        ['scope.info',             'instance / user / scope / capability details'],
        ['selftest',               'prove read + write + platform-write end-to-end'],
        ['engine.status',          'health, config, and artifact inventory summary'],
        // DISCOVERY
        ['meta.tables',            'list tables in the application scope'],
        ['meta.script_includes',   'list Script Includes in scope'],
        ['meta.business_rules',    'list Business Rules in scope'],
        ['meta.notifications',     'list Notifications in scope'],
        ['meta.widgets',           'list Service Portal widgets in scope'],
        ['meta.jobs',              'list Scheduled Jobs in scope'],
        ['meta.acls',              'list ACLs for a table (table required)'],
        ['meta.all',               'full artifact inventory across all types'],
        ['table.exists',           'check whether a table exists'],
        ['schema.fields',          'list all fields for a table with metadata'],
        ['table.schema',           'full schema dump: fields + choices + autonumber'],
        // DDL
        ['schema.table.create',    'create a scoped table (sys_db_object)'],
        ['schema.table.delete',    'delete a table by name or sys_id'],
        ['schema.add_field',       'add a field to a table (sys_dictionary)'],
        ['schema.field.update',    'update an existing field\'s properties'],
        ['schema.field.delete',    'remove a field from a table'],
        ['schema.add_choice',      'add a choice value (sys_choice)'],
        ['schema.set_autonumber',  'configure auto-numbering (sys_number)'],
        ['schema.index.create',    'create a database index (sys_db_index)'],
        // PROPERTIES
        ['property.set',           'write a system property (or batch array)'],
        ['property.get',           'read a system property'],
        ['property.list',          'list properties by prefix'],
        ['property.delete',        'delete a system property'],
        // RECORDS
        ['record.insert',          'create one record (+platform)'],
        ['record.insert_many',     'create many records in one call (+platform)'],
        ['record.update',          'update by sys_id or query (+platform)'],
        ['record.patch',           'merge-update: only supplied fields change (+platform)'],
        ['record.upsert',          'insert-or-update (+platform)'],
        ['record.delete',          'delete records matching query (+platform)'],
        ['record.bulk_delete',     'count-gated delete: requires confirm:true (+platform)'],
        ['record.get',             'fetch one record (+platform)'],
        ['record.find',            'find by display value / name field'],
        ['record.query',           'fetch many records with pagination (+platform)'],
        ['record.clone',           'duplicate a record (optionally override fields)'],
        ['record.count',           'count records matching query'],
        ['record.aggregate',       'COUNT / SUM / AVG / MIN / MAX with multi group_by'],
        // ACL
        ['acl.create',             'create an ACL rule (sys_security_acl)'],
        ['acl.delete',             'delete an ACL rule by sys_id'],
        ['acl.list',               'list ACLs for a table/operation'],
        // ACCESS
        ['role.grant',             'grant a role to a user (idempotent)'],
        ['role.revoke',            'revoke a role from a user'],
        ['user.roles',             'list a user\'s roles'],
        // USERS
        ['user.create',            'create a sys_user account'],
        ['user.get',               'get user record by user_name or sys_id'],
        ['user.update',            'update a user account'],
        // GROUPS
        ['group.create',           'create a sys_user_group'],
        ['group.add_member',       'add a user to a group (idempotent)'],
        ['group.remove_member',    'remove a user from a group'],
        ['group.members',          'list all members of a group'],
        // UPDATE SETS
        ['update_set.create',      'create an update set'],
        ['update_set.activate',    'set an update set to in-progress state'],
        ['update_set.list',        'list update sets by state'],
        // ARTIFACTS
        ['artifact.script_include','create or update a Script Include'],
        ['artifact.business_rule', 'create or update a Business Rule'],
        ['artifact.notification',  'create or update a Notification'],
        ['artifact.scheduled_job', 'create or update a Scheduled Script Execution'],
        ['artifact.client_script', 'create or update a Client Script'],
        ['artifact.ui_action',     'create or update a UI Action'],
        ['artifact.widget',        'create or update a Service Portal widget'],
        // FILES
        ['attachment.write',       'attach base64 content to a record'],
        ['attachment.read',        'read attachment content as base64'],
        ['attachment.list',        'list a record\'s attachments'],
        ['attachment.delete',      'delete an attachment by sys_id'],
        // POWER
        ['script.run',             'execute JS in scope context; set var result to return data'],
        ['rest.call',              'authenticated internal REST call (any method/path)'],
        ['event.fire',             'fire a platform event via gs.eventQueue'],
        ['sys.log',                'write to the application system log'],
        ['cache.flush',            'flush all platform caches'],
        ['sys.id',                 'resolve artifact name → sys_id by type'],
        // ENGINE
        ['engine.source',          'inspect the engine\'s stored script and size'],
        ['engine.selfupdate',      'replace the engine\'s own script (safety-checked)'],
        // BATCH
        ['batch',                  'run many ops in one HTTP call (stop_on_error flag)']
    ];

    // ══════════════════════════════════════════════════════════
    // OP DISPATCHER
    // ══════════════════════════════════════════════════════════
    function dispatch(ctx) {
        var o  = ctx.op    || '';
        var t  = ctx.table || '';
        var d  = ctx.data  || {};
        var q  = ctx.query || {};
        var l  = Math.min(parseInt(ctx.limit, 10) || 100, MAX_LIMIT);
        var dv = !!ctx.display_values;
        var pf = !!ctx.platform;
        var sc = (ctx.scope !== false);
        var off = Math.max(parseInt(ctx.offset, 10) || 0, 0);

        switch (o) {

        // ── DIAGNOSTICS ────────────────────────────────────────

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
            return { ok: true, utc: gdt.getValue(), display: gdt.getDisplayValue(),
                     numeric: String(gdt.getNumericValue()) };

        case 'scope.info':
            return { ok: true, scope: gs.getCurrentScopeName(), user: gs.getUserName(),
                     is_admin: gs.hasRole('admin'), app_scope: APP_SCOPE,
                     app_sys_id: appScopeSysId(),
                     platform_writes_enabled: !!gs.getProperty(APP_SCOPE + '.svc_password', ''),
                     instance: gs.getProperty('instance_name', 'unknown'),
                     base_url: instanceBase() };

        case 'selftest':
            var matrix = {}, allOk = true;
            matrix.svc_password_set    = !!gs.getProperty(APP_SCOPE + '.svc_password', '');
            matrix.engine_key_set      = !!gs.getProperty(APP_SCOPE + '.engine_key', '');
            matrix.is_admin            = gs.hasRole('admin');
            matrix.app_scope_resolved  = !!appScopeSysId();
            try {
                var stR = new GlideRecord('sys_user'); stR.setLimit(1); stR.query();
                matrix.scoped_read = stR.next();
            } catch (e) { matrix.scoped_read = false; matrix.scoped_read_err = String(e); }
            try {
                var stKey = APP_SCOPE + '.__selftest';
                gs.setProperty(stKey, 'ok-' + new GlideDateTime().getNumericValue());
                matrix.scoped_write = (gs.getProperty(stKey, '').indexOf('ok-') === 0);
            } catch (e) { matrix.scoped_write = false; matrix.scoped_write_err = String(e); }
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
            var selfKeys = ['svc_password_set','engine_key_set','is_admin','app_scope_resolved',
                            'scoped_read','scoped_write','platform_write','platform_read','platform_delete'];
            for (var si = 0; si < selfKeys.length; si++) { if (!matrix[selfKeys[si]]) allOk = false; }
            return { ok: allOk, capability: matrix,
                     summary: allOk ? 'Fully autonomous: build + maintenance ready.'
                                    : 'One or more capabilities unavailable — see capability matrix.' };

        case 'engine.status':
            var estables = metaList('sys_db_object', ['name', 'label'], 'name');
            var esis     = metaList('sys_script_include', ['name', 'api_name', 'active'], 'name');
            var esbr     = metaList('sys_script', ['name', 'collection', 'active'], 'name');
            var esnotif  = metaList('sysevent_email_action', ['name', 'active'], 'name');
            var eswidget = metaList('sp_widget', ['name', 'id', 'active'], 'name');
            var esjobs   = metaList('sysauto_script', ['name', 'active'], 'name');
            return {
                ok: true,
                scope: APP_SCOPE,
                instance: gs.getProperty('instance_name', 'unknown'),
                base_url: instanceBase(),
                user: gs.getUserName(),
                is_admin: gs.hasRole('admin'),
                platform_writes_enabled: !!gs.getProperty(APP_SCOPE + '.svc_password', ''),
                engine_key_configured: !!gs.getProperty(APP_SCOPE + '.engine_key', ''),
                op_count: OP_CATALOG.length,
                inventory: {
                    tables:          { count: estables.length },
                    script_includes: { count: esis.length,    items: esis },
                    business_rules:  { count: esbr.length,    items: esbr },
                    notifications:   { count: esnotif.length, items: esnotif },
                    widgets:         { count: eswidget.length,items: eswidget },
                    scheduled_jobs:  { count: esjobs.length,  items: esjobs }
                }
            };

        // ── DISCOVERY ──────────────────────────────────────────

        case 'meta.tables':
            var mtRows = metaList('sys_db_object', ['name', 'label'], 'name');
            return { ok: true, count: mtRows.length, tables: mtRows };

        case 'meta.script_includes':
            var msiRows = metaList('sys_script_include', ['name', 'api_name', 'active', 'client_callable'], 'name');
            return { ok: true, count: msiRows.length, script_includes: msiRows };

        case 'meta.business_rules':
            var mbrRows = metaList('sys_script', ['name', 'collection', 'active', 'when', 'order'], 'name');
            return { ok: true, count: mbrRows.length, business_rules: mbrRows };

        case 'meta.notifications':
            var mnotifRows = metaList('sysevent_email_action', ['name', 'active', 'event_name'], 'name');
            return { ok: true, count: mnotifRows.length, notifications: mnotifRows };

        case 'meta.widgets':
            var mwRows = metaList('sp_widget', ['name', 'id', 'active'], 'name');
            return { ok: true, count: mwRows.length, widgets: mwRows };

        case 'meta.jobs':
            var mjRows = metaList('sysauto_script', ['name', 'active', 'run_type', 'run_time'], 'name');
            return { ok: true, count: mjRows.length, scheduled_jobs: mjRows };

        case 'meta.acls':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var maGr = new GlideRecord('sys_security_acl');
            maGr.addQuery('name', t);
            maGr.orderBy('operation');
            maGr.query();
            var aclRows = [];
            while (maGr.next()) {
                aclRows.push({ sys_id: maGr.getUniqueValue(), operation: maGr.getValue('operation'),
                    active: maGr.getValue('active'), admin_overrides: maGr.getValue('admin_overrides'),
                    condition: maGr.getValue('condition') });
            }
            return { ok: true, table: t, count: aclRows.length, acls: aclRows };

        case 'meta.all':
            var allAppId = appScopeSysId();
            var allResult = {};
            var allTypes = [
                { key: 'tables',          tbl: 'sys_db_object',       fields: ['name','label'] },
                { key: 'script_includes', tbl: 'sys_script_include',  fields: ['name','api_name','active'] },
                { key: 'business_rules',  tbl: 'sys_script',          fields: ['name','collection','active','when'] },
                { key: 'client_scripts',  tbl: 'sys_script_client',   fields: ['name','table','type','active'] },
                { key: 'ui_actions',      tbl: 'sys_ui_action',       fields: ['name','table','active'] },
                { key: 'notifications',   tbl: 'sysevent_email_action',fields: ['name','active','event_name'] },
                { key: 'scheduled_jobs',  tbl: 'sysauto_script',      fields: ['name','active','run_type'] },
                { key: 'widgets',         tbl: 'sp_widget',           fields: ['name','id','active'] },
                { key: 'properties',      tbl: 'sys_properties',      fields: ['name','value'] }
            ];
            for (var ati = 0; ati < allTypes.length; ati++) {
                var at = allTypes[ati];
                var atGr = new GlideRecord(at.tbl);
                if (at.tbl === 'sys_properties') {
                    atGr.addQuery('name', 'STARTSWITH', APP_SCOPE);
                } else {
                    atGr.addQuery('sys_scope', allAppId);
                }
                atGr.orderBy('name');
                atGr.query();
                var atRows = [];
                while (atGr.next()) {
                    var atRow = { sys_id: atGr.getUniqueValue() };
                    for (var afi = 0; afi < at.fields.length; afi++) {
                        try { atRow[at.fields[afi]] = atGr.getValue(at.fields[afi]); } catch (e) {}
                    }
                    atRows.push(atRow);
                }
                allResult[at.key] = { count: atRows.length, items: atRows };
            }
            return { ok: true, scope: APP_SCOPE, inventory: allResult };

        case 'table.exists':
            var chk = new GlideRecord('sys_db_object');
            chk.addQuery('name', t);
            chk.setLimit(1);
            chk.query();
            return { ok: true, table: t, exists: !!chk.next() };

        case 'schema.fields':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var sfGr = new GlideRecord('sys_dictionary');
            sfGr.addQuery('name', t);
            sfGr.addQuery('element', 'ISNOTEMPTY');
            sfGr.orderBy('element');
            sfGr.query();
            var sfFields = [];
            while (sfGr.next()) {
                sfFields.push({
                    element:       sfGr.getValue('element'),
                    column_label:  sfGr.getValue('column_label'),
                    internal_type: sfGr.getValue('internal_type'),
                    max_length:    sfGr.getValue('max_length'),
                    mandatory:     sfGr.getValue('mandatory'),
                    default_value: sfGr.getValue('default_value'),
                    reference:     sfGr.getValue('reference'),
                    read_only:     sfGr.getValue('read_only'),
                    choice:        sfGr.getValue('choice'),
                    sys_id:        sfGr.getUniqueValue()
                });
            }
            return { ok: true, table: t, count: sfFields.length, fields: sfFields };

        case 'table.schema':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            // fields
            var tsFieldGr = new GlideRecord('sys_dictionary');
            tsFieldGr.addQuery('name', t);
            tsFieldGr.addQuery('element', 'ISNOTEMPTY');
            tsFieldGr.orderBy('element');
            tsFieldGr.query();
            var tsFields = [];
            while (tsFieldGr.next()) {
                tsFields.push({
                    element: tsFieldGr.getValue('element'),
                    column_label: tsFieldGr.getValue('column_label'),
                    internal_type: tsFieldGr.getValue('internal_type'),
                    max_length: tsFieldGr.getValue('max_length'),
                    mandatory: tsFieldGr.getValue('mandatory'),
                    default_value: tsFieldGr.getValue('default_value'),
                    reference: tsFieldGr.getValue('reference'),
                    read_only: tsFieldGr.getValue('read_only'),
                    choice: tsFieldGr.getValue('choice')
                });
            }
            // choices
            var tsChoiceGr = new GlideRecord('sys_choice');
            tsChoiceGr.addQuery('name', t);
            tsChoiceGr.orderBy('element');
            tsChoiceGr.orderBy('sequence');
            tsChoiceGr.query();
            var tsChoices = {};
            while (tsChoiceGr.next()) {
                var chEl = tsChoiceGr.getValue('element');
                if (!tsChoices[chEl]) tsChoices[chEl] = [];
                tsChoices[chEl].push({
                    value: tsChoiceGr.getValue('value'),
                    label: tsChoiceGr.getValue('label'),
                    sequence: tsChoiceGr.getValue('sequence')
                });
            }
            // autonumber
            var tsNumGr = new GlideRecord('sys_number');
            tsNumGr.addQuery('category', t);
            tsNumGr.setLimit(1);
            tsNumGr.query();
            var tsNum = tsNumGr.next() ? { prefix: tsNumGr.getValue('prefix'),
                current: tsNumGr.getValue('number') } : null;
            return { ok: true, table: t, field_count: tsFields.length,
                     fields: tsFields, choices: tsChoices, autonumber: tsNum };

        // ── DDL ────────────────────────────────────────────────

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
            if (d.name_field)  stPayload.name_field  = d.name_field;
            if (d.super_class) stPayload.super_class = d.super_class;
            var stRes = tableInsert('sys_db_object', stPayload, false);
            if (!stRes.ok) { delete stRes._status; return stRes; }
            var stCreatedName = (stRes.body && stRes.body.result) ? stRes.body.result.name : '(unknown)';
            return { ok: true, full_name: stFullName, created_name: stCreatedName,
                     sys_id: stRes.sys_id || '', name_ok: stCreatedName === stFullName };

        case 'schema.table.delete':
            if (!t && !d.sys_id) return { _status: 400, ok: false, error: 'table name or data.sys_id required' };
            var stdGr = new GlideRecord('sys_db_object');
            if (d.sys_id) {
                if (!stdGr.get(d.sys_id)) return { _status: 404, ok: false, error: 'Table not found by sys_id' };
            } else {
                stdGr.addQuery('name', t);
                stdGr.setLimit(1);
                stdGr.query();
                if (!stdGr.next()) return { _status: 404, ok: false, error: 'Table not found: ' + t };
            }
            var stdId = stdGr.getUniqueValue();
            var stdName = stdGr.getValue('name');
            var stdDel = platformDelete('sys_db_object', stdId);
            if (!stdDel.ok) return { ok: false, error: 'Delete failed', status: stdDel.status, body: stdDel.body };
            return { ok: true, deleted_table: stdName, sys_id: stdId };

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

        case 'schema.field.update':
            if (!t)         return { _status: 400, ok: false, error: 'table required' };
            if (!d.element) return { _status: 400, ok: false, error: 'data.element required' };
            var sfuGr = new GlideRecord('sys_dictionary');
            sfuGr.addQuery('name', t);
            sfuGr.addQuery('element', d.element);
            sfuGr.setLimit(1);
            sfuGr.query();
            if (!sfuGr.next()) return { _status: 404, ok: false, error: 'Field not found: ' + t + '.' + d.element };
            var sfuId = sfuGr.getUniqueValue();
            var sfuPayload = {};
            var sfuAllowed = ['column_label','max_length','mandatory','default_value','choice','read_only','reference'];
            for (var sfui = 0; sfui < sfuAllowed.length; sfui++) {
                var sfuk = sfuAllowed[sfui];
                if (d[sfuk] !== undefined) sfuPayload[sfuk] = String(d[sfuk]);
            }
            if (!Object.keys(sfuPayload).length) return { _status: 400, ok: false, error: 'No updatable fields supplied' };
            var sfuRes = platformUpdate('sys_dictionary', sfuId, sfuPayload, false);
            if (!sfuRes.ok) return { ok: false, error: 'Update failed', status: sfuRes.status, body: sfuRes.body };
            return { ok: true, sys_id: sfuId, table: t, element: d.element, updated: sfuPayload };

        case 'schema.field.delete':
            if (!t)         return { _status: 400, ok: false, error: 'table required' };
            if (!d.element) return { _status: 400, ok: false, error: 'data.element required' };
            var sfdGr = new GlideRecord('sys_dictionary');
            sfdGr.addQuery('name', t);
            sfdGr.addQuery('element', d.element);
            sfdGr.setLimit(1);
            sfdGr.query();
            if (!sfdGr.next()) return { _status: 404, ok: false, error: 'Field not found: ' + t + '.' + d.element };
            var sfdId = sfdGr.getUniqueValue();
            var sfdDel = platformDelete('sys_dictionary', sfdId);
            if (!sfdDel.ok) return { ok: false, error: 'Delete failed', status: sfdDel.status, body: sfdDel.body };
            return { ok: true, deleted_field: d.element, table: t, sys_id: sfdId };

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

        case 'schema.index.create':
            if (!t)          return { _status: 400, ok: false, error: 'table required' };
            if (!d.columns)  return { _status: 400, ok: false, error: 'data.columns (comma-separated) required' };
            var siPayload = {
                tablename: t,
                columns: d.columns,
                unique: d.unique ? 'true' : 'false',
                sys_scope: appScopeSysId()
            };
            var siRes = tableInsert('sys_db_index', siPayload, false);
            delete siRes._status;
            return siRes;

        // ── PROPERTIES ─────────────────────────────────────────

        case 'property.set':
            // supports single {key, value} or array [{key,value},...]
            if (Array.isArray(d)) {
                var psBatch = [], psFail = 0;
                for (var pbi = 0; pbi < d.length; pbi++) {
                    var pb = d[pbi];
                    if (!pb.key) { psBatch.push({ ok: false, error: 'missing key', index: pbi }); psFail++; continue; }
                    gs.setProperty(pb.key, pb.value !== undefined ? String(pb.value) : '', pb.description || '');
                    psBatch.push({ ok: true, key: pb.key });
                }
                return { ok: psFail === 0, set: psBatch.length - psFail, failed: psFail, results: psBatch };
            }
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

        case 'property.delete':
            if (!d.key) return { _status: 400, ok: false, error: 'data.key required' };
            var pdGr = new GlideRecord('sys_properties');
            pdGr.addQuery('name', d.key);
            pdGr.setLimit(1);
            pdGr.query();
            if (!pdGr.next()) return { _status: 404, ok: false, error: 'Property not found: ' + d.key };
            pdGr.deleteRecord();
            return { ok: true, deleted_key: d.key };

        // ── RECORDS ────────────────────────────────────────────

        case 'record.insert':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                var pIns = platformInsert(t, d, dv, sc);
                if (pIns.ok) return { ok: true, sys_id: pIns.sys_id, via: 'platform' };
                return { _status: pIns.status || 500, ok: false, error: 'Platform insert failed',
                         status: pIns.status, body: pIns.body };
            }
            var riGr = new GlideRecord(t);
            riGr.initialize();
            for (var rif in d) {
                if (!d.hasOwnProperty(rif)) continue;
                try {
                    if (ctx.use_display_value && ctx.use_display_value[rif]) riGr[rif].setDisplayValue(d[rif]);
                    else riGr.setValue(rif, d[rif]);
                } catch (e) {}
            }
            if (ctx.bypass_rules) { riGr.setWorkflow(false); riGr.autoSysFields(false); }
            var riNewId = riGr.insert();
            if (riNewId) return { ok: true, sys_id: String(riNewId) };
            return { _status: 500, ok: false, error: 'Insert failed',
                     last_error: riGr.getLastErrorMessage ? String(riGr.getLastErrorMessage()) : 'n/a' };

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
                    var imx = im.insert();
                    imId = imx ? String(imx) : null;
                }
                if (imId) imIds.push(imId); else { imIds.push(null); imFail++; }
            }
            return { ok: imFail === 0, inserted: imIds.length - imFail, failed: imFail, sys_ids: imIds };

        case 'record.update':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                if (d.sys_id) {
                    var pud = {}; for (var puk1 in d) { if (d.hasOwnProperty(puk1) && puk1 !== 'sys_id') pud[puk1] = d[puk1]; }
                    var puu = platformUpdate(t, d.sys_id, pud, dv);
                    if (puu.ok) return { ok: true, updated: 1, sys_id: d.sys_id, via: 'platform' };
                    return { _status: puu.status || 500, ok: false, error: 'Platform update failed', status: puu.status, body: puu.body };
                }
                var pEnc = encodeQuery(q, ctx.encoded_query);
                if (!pEnc) return { _status: 400, ok: false, error: 'platform update needs data.sys_id, query, or encoded_query' };
                var pql = platformQuery(t, pEnc, ['sys_id'], l, '', '', false, off);
                if (!pql.ok) return { _status: pql.status || 500, ok: false, error: 'Platform query failed', body: pql.body };
                var pRows = (pql.body && pql.body.result) ? pql.body.result : [];
                var pdat = {}; for (var puk2 in d) { if (d.hasOwnProperty(puk2)) pdat[puk2] = d[puk2]; }
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
                upd.update(); updCount++;
            }
            return { ok: true, updated: updCount };

        case 'record.patch':
            // Same as update but intent is explicit: only supplied fields change.
            // Identical implementation — the distinction is semantic for the caller.
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (!d.sys_id && !ctx.encoded_query && (!q || !Object.keys(q).length)) {
                return { _status: 400, ok: false, error: 'data.sys_id, query, or encoded_query required to scope the patch' };
            }
            if (pf) {
                if (d.sys_id) {
                    var ppd = {}; for (var ppk in d) { if (d.hasOwnProperty(ppk) && ppk !== 'sys_id') ppd[ppk] = d[ppk]; }
                    var ppu = platformUpdate(t, d.sys_id, ppd, dv);
                    if (ppu.ok) return { ok: true, patched: 1, sys_id: d.sys_id, via: 'platform' };
                    return { _status: ppu.status || 500, ok: false, error: 'Platform patch failed', status: ppu.status, body: ppu.body };
                }
                var ppEnc = encodeQuery(q, ctx.encoded_query);
                var ppql  = platformQuery(t, ppEnc, ['sys_id'], l, '', '', false, off);
                if (!ppql.ok) return { _status: ppql.status || 500, ok: false, error: 'Platform query failed', body: ppql.body };
                var ppRows = (ppql.body && ppql.body.result) ? ppql.body.result : [];
                var ppData = {}; for (var ppd2 in d) { if (d.hasOwnProperty(ppd2)) ppData[ppd2] = d[ppd2]; }
                var ppCount = 0;
                for (var ppi = 0; ppi < ppRows.length; ppi++) {
                    if (platformUpdate(t, ppRows[ppi].sys_id, ppData, dv).ok) ppCount++;
                }
                return { ok: true, patched: ppCount, via: 'platform' };
            }
            var patchGr = buildGr(t, q);
            if (d.sys_id) patchGr.addQuery('sys_id', d.sys_id);
            if (ctx.encoded_query) patchGr.addEncodedQuery(ctx.encoded_query);
            patchGr.query();
            var patchCount = 0;
            while (patchGr.next()) {
                for (var pf2 in d) { if (d.hasOwnProperty(pf2) && pf2 !== 'sys_id') patchGr.setValue(pf2, d[pf2]); }
                if (ctx.bypass_rules) patchGr.setWorkflow(false);
                patchGr.update(); patchCount++;
            }
            return { ok: true, patched: patchCount };

        case 'record.upsert':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                var uEnc = encodeQuery(q, ctx.encoded_query);
                if (!uEnc) return { _status: 400, ok: false, error: 'platform upsert needs a query or encoded_query to match on' };
                var uq = platformQuery(t, uEnc, ['sys_id'], 1, '', '', false, 0);
                if (!uq.ok) return { _status: uq.status || 500, ok: false, error: 'Platform query failed', body: uq.body };
                var uRows = (uq.body && uq.body.result) ? uq.body.result : [];
                if (uRows.length) {
                    var puu2 = platformUpdate(t, uRows[0].sys_id, d, dv);
                    if (puu2.ok) return { ok: true, action: 'updated', sys_id: uRows[0].sys_id, via: 'platform' };
                    return { _status: puu2.status || 500, ok: false, error: 'Platform update failed', status: puu2.status, body: puu2.body };
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
                var dq = platformQuery(t, dEnc, ['sys_id'], l, '', '', false, off);
                if (!dq.ok) return { _status: dq.status || 500, ok: false, error: 'Platform query failed', body: dq.body };
                var dRows = (dq.body && dq.body.result) ? dq.body.result : [];
                var pDel = 0;
                for (var di = 0; di < dRows.length; di++) {
                    if (platformDelete(t, dRows[di].sys_id).ok) pDel++;
                }
                return { ok: true, deleted: pDel, via: 'platform' };
            }
            var delGr = buildGr(t, q);
            if (d.sys_id) delGr.addQuery('sys_id', d.sys_id);
            if (ctx.encoded_query) delGr.addEncodedQuery(ctx.encoded_query);
            delGr.query();
            var delCount = 0;
            while (delGr.next()) { delGr.deleteRecord(); delCount++; }
            return { ok: true, deleted: delCount };

        case 'record.bulk_delete':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (!ctx.encoded_query && (!q || !Object.keys(q).length)) {
                return { _status: 400, ok: false, error: 'Refusing unbounded bulk_delete: provide query or encoded_query' };
            }
            // Count first for safety
            var bdGr = buildGr(t, q);
            if (ctx.encoded_query) bdGr.addEncodedQuery(ctx.encoded_query);
            bdGr.query();
            var bdCount = bdGr.getRowCount();
            if (!ctx.confirm) {
                return { ok: false, _status: 400,
                    error: 'Add "confirm": true to proceed. This will delete ' + bdCount + ' record(s) from ' + t + '.' };
            }
            var bdDeleted = 0;
            var bdGr2 = buildGr(t, q);
            if (ctx.encoded_query) bdGr2.addEncodedQuery(ctx.encoded_query);
            bdGr2.query();
            while (bdGr2.next()) { bdGr2.deleteRecord(); bdDeleted++; }
            return { ok: true, deleted: bdDeleted, table: t };

        case 'record.get':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                if (d.sys_id) {
                    var pg = platformGet(t, d.sys_id, ctx.fields || null, dv);
                    if (pg.ok && pg.body && pg.body.result) return { ok: true, record: pg.body.result, via: 'platform' };
                    return { _status: 404, ok: false, error: 'Not found', body: pg.body };
                }
                var gEnc = encodeQuery(q, ctx.encoded_query);
                var pgq = platformQuery(t, gEnc, ctx.fields || null, 1, ctx.order_by, ctx.order_by_desc, dv, 0);
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

        case 'record.find':
            // Search a table for a record by display value (value field or name field)
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (!d.value) return { _status: 400, ok: false, error: 'data.value required' };
            var rfField = d.field || 'name';
            var rfGr = new GlideRecord(t);
            rfGr.addQuery(rfField, 'CONTAINS', d.value);
            if (ctx.encoded_query) rfGr.addEncodedQuery(ctx.encoded_query);
            rfGr.setLimit(l);
            rfGr.query();
            var rfRows = [];
            while (rfGr.next()) rfRows.push(grToObj(rfGr, ctx.fields || [rfField, 'sys_id'], dv));
            return { ok: true, count: rfRows.length, records: rfRows };

        case 'record.query':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (pf) {
                var qEnc = encodeQuery(q, ctx.encoded_query);
                var pq = platformQuery(t, qEnc, ctx.fields || null, l, ctx.order_by, ctx.order_by_desc, dv, off);
                if (!pq.ok) return { _status: pq.status || 500, ok: false, error: 'Platform query failed', body: pq.body };
                var pqRows = (pq.body && pq.body.result) ? pq.body.result : [];
                return { ok: true, count: pqRows.length, records: pqRows, offset: off, via: 'platform' };
            }
            var qGr = buildGr(t, q);
            if (ctx.encoded_query) qGr.addEncodedQuery(ctx.encoded_query);
            if (ctx.order_by)      qGr.orderBy(ctx.order_by);
            if (ctx.order_by_desc) qGr.orderByDesc(ctx.order_by_desc);
            if (off > 0)           qGr.chooseWindow(off, off + l);
            qGr.setLimit(l);
            qGr.query();
            var qRows = [];
            while (qGr.next()) qRows.push(grToObj(qGr, ctx.fields || null, dv));
            return { ok: true, count: qRows.length, records: qRows, offset: off };

        case 'record.clone':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (!d.sys_id) return { _status: 400, ok: false, error: 'data.sys_id of record to clone required' };
            var clSrc = new GlideRecord(t);
            if (!clSrc.get(d.sys_id)) return { _status: 404, ok: false, error: 'Source record not found' };
            var clNew = new GlideRecord(t);
            clNew.initialize();
            var clFields = tableFields(t);
            for (var cli = 0; cli < clFields.length; cli++) {
                var clf = clFields[cli];
                if (clf === 'sys_id' || clf === 'sys_created_by' || clf === 'sys_created_on' ||
                    clf === 'sys_updated_by' || clf === 'sys_updated_on') continue;
                try { clNew.setValue(clf, clSrc.getValue(clf)); } catch (e) {}
            }
            // Apply any override fields from data (except sys_id)
            if (d.override && typeof d.override === 'object') {
                for (var clo in d.override) {
                    if (d.override.hasOwnProperty(clo) && clo !== 'sys_id') {
                        try { clNew.setValue(clo, d.override[clo]); } catch (e) {}
                    }
                }
            }
            var clNewId = clNew.insert();
            if (!clNewId) return { _status: 500, ok: false, error: 'Clone insert failed' };
            return { ok: true, cloned_from: d.sys_id, sys_id: String(clNewId) };

        case 'record.count':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var cGr = buildGr(t, q);
            if (ctx.encoded_query) cGr.addEncodedQuery(ctx.encoded_query);
            cGr.query();
            return { ok: true, table: t, count: cGr.getRowCount() };

        case 'record.aggregate':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var agg = new GlideAggregate(t);
            for (var aqf in q) { if (q.hasOwnProperty(aqf)) agg.addQuery(aqf, q[aqf]); }
            if (ctx.encoded_query) agg.addEncodedQuery(ctx.encoded_query);
            var aggType  = (d.type || 'COUNT').toUpperCase();
            var aggField = d.field || '';
            var aggGroupBy = ctx.group_by;   // string or array
            if (aggField) agg.addAggregate(aggType, aggField); else agg.addAggregate('COUNT');
            if (Array.isArray(aggGroupBy)) {
                for (var aggi = 0; aggi < aggGroupBy.length; aggi++) agg.groupBy(aggGroupBy[aggi]);
            } else if (aggGroupBy) {
                agg.groupBy(aggGroupBy);
            }
            if (ctx.order_by) agg.orderBy(ctx.order_by);
            agg.query();
            var aggRows = [];
            while (agg.next()) {
                var aggRow = {};
                if (Array.isArray(aggGroupBy)) {
                    for (var aggi2 = 0; aggi2 < aggGroupBy.length; aggi2++) {
                        aggRow[aggGroupBy[aggi2]] = agg.getValue(aggGroupBy[aggi2]);
                    }
                } else if (aggGroupBy) {
                    aggRow[aggGroupBy] = agg.getValue(aggGroupBy);
                }
                aggRow.value = aggField ? agg.getAggregate(aggType, aggField) : agg.getAggregate('COUNT');
                aggRows.push(aggRow);
            }
            return { ok: true, type: aggType, field: aggField, count: aggRows.length, rows: aggRows };

        // ── ACL ────────────────────────────────────────────────

        case 'acl.create':
            if (!t)          return { _status: 400, ok: false, error: 'table required' };
            if (!d.operation) return { _status: 400, ok: false, error: 'data.operation required (read/write/create/delete/execute)' };
            var aclPayload = {
                name:             t,
                operation:        d.operation,
                active:           d.active !== false ? 'true' : 'false',
                admin_overrides:  d.admin_overrides !== false ? 'true' : 'false',
                type:             d.type || 'record',
                sys_scope:        appScopeSysId()
            };
            if (d.script)    aclPayload.script    = d.script;
            if (d.condition) aclPayload.condition = d.condition;
            if (d.roles)     aclPayload.roles      = d.roles;
            var aclRes = artifactUpsert('sys_security_acl', 'name^operation', t + '^' + d.operation, aclPayload, true);
            return aclRes;

        case 'acl.delete':
            if (!d.sys_id) return { _status: 400, ok: false, error: 'data.sys_id required' };
            var aclDelRes = platformDelete('sys_security_acl', d.sys_id);
            if (!aclDelRes.ok) return { ok: false, error: 'Delete failed', status: aclDelRes.status, body: aclDelRes.body };
            return { ok: true, deleted_acl: d.sys_id };

        case 'acl.list':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var aclLGr = new GlideRecord('sys_security_acl');
            aclLGr.addQuery('name', t);
            if (d.operation) aclLGr.addQuery('operation', d.operation);
            aclLGr.orderBy('operation');
            aclLGr.query();
            var aclList = [];
            while (aclLGr.next()) {
                aclList.push({ sys_id: aclLGr.getUniqueValue(), operation: aclLGr.getValue('operation'),
                    active: aclLGr.getValue('active'), admin_overrides: aclLGr.getValue('admin_overrides'),
                    type: aclLGr.getValue('type'), condition: aclLGr.getValue('condition'),
                    script: aclLGr.getValue('script') });
            }
            return { ok: true, table: t, count: aclList.length, acls: aclList };

        // ── ACCESS (roles) ─────────────────────────────────────

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

        // ── USERS ──────────────────────────────────────────────

        case 'user.create':
            if (!d.user_name) return { _status: 400, ok: false, error: 'data.user_name required' };
            var ucExist = new GlideRecord('sys_user');
            ucExist.addQuery('user_name', d.user_name);
            ucExist.setLimit(1);
            ucExist.query();
            if (ucExist.next()) return { ok: true, skipped: true, reason: 'user exists', sys_id: ucExist.getUniqueValue() };
            var ucPayload = { user_name: d.user_name };
            var ucFields = ['first_name','last_name','email','title','department','active','password_needs_reset','locked_out'];
            for (var uci = 0; uci < ucFields.length; uci++) {
                if (d[ucFields[uci]] !== undefined) ucPayload[ucFields[uci]] = String(d[ucFields[uci]]);
            }
            if (d.active === undefined) ucPayload.active = 'true';
            var ucRes = platformInsert('sys_user', ucPayload, false, false);
            if (!ucRes.ok) return { ok: false, error: 'User create failed', status: ucRes.status, body: ucRes.body };
            return { ok: true, action: 'inserted', sys_id: ucRes.sys_id, user_name: d.user_name };

        case 'user.get':
            var ugId = resolveUser(d.user || d.user_name || d.sys_id);
            if (!ugId) return { _status: 404, ok: false, error: 'User not found' };
            var ugFlds = ctx.fields || ['user_name','first_name','last_name','email','active','title','department'];
            var ugRes = platformGet('sys_user', ugId, ugFlds, dv);
            if (!ugRes.ok) return { _status: 404, ok: false, error: 'User not found', body: ugRes.body };
            return { ok: true, record: ugRes.body.result };

        case 'user.update':
            var uuId = resolveUser(d.user || d.user_name || d.sys_id);
            if (!uuId) return { _status: 404, ok: false, error: 'User not found' };
            var uuPayload = {};
            var uuAllowed = ['first_name','last_name','email','title','department','active','locked_out','password_needs_reset'];
            for (var uui = 0; uui < uuAllowed.length; uui++) {
                if (d[uuAllowed[uui]] !== undefined) uuPayload[uuAllowed[uui]] = String(d[uuAllowed[uui]]);
            }
            if (!Object.keys(uuPayload).length) return { _status: 400, ok: false, error: 'No updatable fields supplied' };
            var uuRes = platformUpdate('sys_user', uuId, uuPayload, false);
            if (!uuRes.ok) return { ok: false, error: 'Update failed', status: uuRes.status, body: uuRes.body };
            return { ok: true, sys_id: uuId, updated: uuPayload };

        // ── GROUPS ─────────────────────────────────────────────

        case 'group.create':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            var gcExist = new GlideRecord('sys_user_group');
            gcExist.addQuery('name', d.name);
            gcExist.setLimit(1);
            gcExist.query();
            if (gcExist.next()) return { ok: true, skipped: true, reason: 'group exists', sys_id: gcExist.getUniqueValue() };
            var gcPayload = { name: d.name, active: d.active !== false ? 'true' : 'false' };
            if (d.description) gcPayload.description = d.description;
            if (d.email)       gcPayload.email       = d.email;
            if (d.manager)     gcPayload.manager     = resolveUser(d.manager) || d.manager;
            var gcRes = platformInsert('sys_user_group', gcPayload, false, false);
            if (!gcRes.ok) return { ok: false, error: 'Group create failed', status: gcRes.status, body: gcRes.body };
            return { ok: true, action: 'inserted', sys_id: gcRes.sys_id, name: d.name };

        case 'group.add_member':
            var gamGid = resolveGroup(d.group), gamUid = resolveUser(d.user);
            if (!gamGid) return { _status: 404, ok: false, error: 'Group not found: ' + d.group };
            if (!gamUid) return { _status: 404, ok: false, error: 'User not found: ' + d.user };
            var gamEx = new GlideRecord('sys_user_grmember');
            gamEx.addQuery('group', gamGid);
            gamEx.addQuery('user', gamUid);
            gamEx.setLimit(1);
            gamEx.query();
            if (gamEx.next()) return { ok: true, skipped: true, reason: 'already a member', sys_id: gamEx.getUniqueValue() };
            var gamRes = tableInsert('sys_user_grmember', { group: gamGid, user: gamUid }, false);
            delete gamRes._status;
            return gamRes;

        case 'group.remove_member':
            var grmGid = resolveGroup(d.group), grmUid = resolveUser(d.user);
            if (!grmGid) return { _status: 404, ok: false, error: 'Group not found: ' + d.group };
            if (!grmUid) return { _status: 404, ok: false, error: 'User not found: ' + d.user };
            var grmGr = new GlideRecord('sys_user_grmember');
            grmGr.addQuery('group', grmGid);
            grmGr.addQuery('user', grmUid);
            grmGr.query();
            var grmCount = 0;
            while (grmGr.next()) { grmGr.deleteRecord(); grmCount++; }
            return { ok: true, removed: grmCount };

        case 'group.members':
            var gmGid = resolveGroup(d.group);
            if (!gmGid) return { _status: 404, ok: false, error: 'Group not found: ' + d.group };
            var gmGr = new GlideRecord('sys_user_grmember');
            gmGr.addQuery('group', gmGid);
            gmGr.query();
            var members = [];
            while (gmGr.next()) {
                members.push({ sys_id: gmGr.getUniqueValue(),
                    user_name: gmGr.getDisplayValue('user'),
                    user_sys_id: gmGr.getValue('user') });
            }
            return { ok: true, group: d.group, count: members.length, members: members };

        // ── UPDATE SETS ────────────────────────────────────────

        case 'update_set.create':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            var usExist = new GlideRecord('sys_update_set');
            usExist.addQuery('name', d.name);
            usExist.setLimit(1);
            usExist.query();
            if (usExist.next()) return { ok: true, skipped: true, reason: 'update set exists',
                sys_id: usExist.getUniqueValue(), state: usExist.getValue('state') };
            var usPayload = { name: d.name, state: 'in progress', description: d.description || '' };
            if (d.application) usPayload.application = d.application || appScopeSysId();
            var usRes = platformInsert('sys_update_set', usPayload, false, false);
            if (!usRes.ok) return { ok: false, error: 'Create failed', status: usRes.status, body: usRes.body };
            return { ok: true, action: 'inserted', sys_id: usRes.sys_id, name: d.name };

        case 'update_set.activate':
            if (!d.name && !d.sys_id) return { _status: 400, ok: false, error: 'data.name or data.sys_id required' };
            var usaGr = new GlideRecord('sys_update_set');
            if (d.sys_id) {
                if (!usaGr.get(d.sys_id)) return { _status: 404, ok: false, error: 'Update set not found' };
            } else {
                usaGr.addQuery('name', d.name);
                usaGr.setLimit(1);
                usaGr.query();
                if (!usaGr.next()) return { _status: 404, ok: false, error: 'Update set not found: ' + d.name };
            }
            var usaId = usaGr.getUniqueValue();
            var usaRes = platformUpdate('sys_update_set', usaId, { state: 'in progress' }, false);
            if (!usaRes.ok) return { ok: false, error: 'Activate failed', status: usaRes.status, body: usaRes.body };
            return { ok: true, sys_id: usaId, state: 'in progress' };

        case 'update_set.list':
            var uslGr = new GlideRecord('sys_update_set');
            if (d.state) uslGr.addQuery('state', d.state);
            uslGr.orderByDesc('sys_updated_on');
            uslGr.setLimit(l);
            uslGr.query();
            var uslRows = [];
            while (uslGr.next()) {
                uslRows.push({ sys_id: uslGr.getUniqueValue(), name: uslGr.getValue('name'),
                    state: uslGr.getValue('state'), description: uslGr.getValue('description'),
                    sys_updated_on: uslGr.getValue('sys_updated_on') });
            }
            return { ok: true, count: uslRows.length, update_sets: uslRows };

        // ── ARTIFACTS ──────────────────────────────────────────

        case 'artifact.script_include':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            if (!d.script) return { _status: 400, ok: false, error: 'data.script required' };
            var siPayload2 = {
                name:            d.name,
                api_name:        d.api_name || d.name,
                script:          d.script,
                active:          d.active !== false ? 'true' : 'false',
                client_callable: d.client_callable ? 'true' : 'false',
                access:          d.access || 'package_private',
                sys_scope:       appScopeSysId()
            };
            var siRes2 = artifactUpsert('sys_script_include', 'name', d.name, siPayload2, true);
            return siRes2;

        case 'artifact.business_rule':
            if (!d.name)       return { _status: 400, ok: false, error: 'data.name required' };
            if (!d.collection) return { _status: 400, ok: false, error: 'data.collection (table name) required' };
            if (!d.script)     return { _status: 400, ok: false, error: 'data.script required' };
            var brPayload = {
                name:             d.name,
                collection:       d.collection,
                script:           d.script,
                active:           d.active !== false ? 'true' : 'false',
                when:             d.when || 'after',
                order:            String(d.order || 100),
                insert:           d.insert    !== false ? 'true' : 'false',
                update:           d.update    !== false ? 'true' : 'false',
                delete:           d.delete    !== false ? 'true' : 'false',
                query:            d.query     ? 'true' : 'false',
                add_message:      d.add_message ? 'true' : 'false',
                sys_scope:        appScopeSysId()
            };
            if (d.condition)        brPayload.condition        = d.condition;
            if (d.filter_condition) brPayload.filter_condition = d.filter_condition;
            var brRes = artifactUpsert('sys_script', 'name^collection', d.name + '^' + d.collection, brPayload, true);
            return brRes;

        case 'artifact.notification':
            if (!d.name)       return { _status: 400, ok: false, error: 'data.name required' };
            if (!d.event_name) return { _status: 400, ok: false, error: 'data.event_name required' };
            var notifPayload = {
                name:        d.name,
                event_name:  d.event_name,
                active:      d.active !== false ? 'true' : 'false',
                sys_scope:   appScopeSysId()
            };
            if (d.subject)          notifPayload.subject          = d.subject;
            if (d.message_html)     notifPayload.message_html     = d.message_html;
            if (d.condition)        notifPayload.condition        = d.condition;
            if (d.recipient_groups) notifPayload.recipient_groups = d.recipient_groups;
            if (d.recipient_users)  notifPayload.recipient_users  = d.recipient_users;
            var notifRes = artifactUpsert('sysevent_email_action', 'name', d.name, notifPayload, true);
            return notifRes;

        case 'artifact.scheduled_job':
            if (!d.name)   return { _status: 400, ok: false, error: 'data.name required' };
            if (!d.script) return { _status: 400, ok: false, error: 'data.script required' };
            var sjPayload = {
                name:      d.name,
                script:    d.script,
                active:    d.active !== false ? 'true' : 'false',
                run_type:  d.run_type || 'on_demand',
                sys_scope: appScopeSysId()
            };
            if (d.run_time)       sjPayload.run_time        = d.run_time;
            if (d.run_period)     sjPayload.run_period      = d.run_period;
            if (d.run_dayofweek)  sjPayload.run_dayofweek   = d.run_dayofweek;
            if (d.run_dayofmonth) sjPayload.run_dayofmonth  = d.run_dayofmonth;
            var sjRes = artifactUpsert('sysauto_script', 'name', d.name, sjPayload, true);
            return sjRes;

        case 'artifact.client_script':
            if (!d.name)  return { _status: 400, ok: false, error: 'data.name required' };
            if (!d.table) return { _status: 400, ok: false, error: 'data.table required' };
            if (!d.type)  return { _status: 400, ok: false, error: 'data.type required (onLoad/onChange/onSubmit/onCellEdit)' };
            var csPayload = {
                name:       d.name,
                table:      d.table,
                type:       d.type,
                script:     d.script || '',
                active:     d.active !== false ? 'true' : 'false',
                sys_scope:  appScopeSysId()
            };
            if (d.field_name) csPayload.field_name = d.field_name;
            if (d.view)       csPayload.view       = d.view;
            if (d.condition)  csPayload.condition  = d.condition;
            var csRes = artifactUpsert('sys_script_client', 'name^table^type', d.name + '^' + d.table + '^' + d.type, csPayload, true);
            return csRes;

        case 'artifact.ui_action':
            if (!d.name)  return { _status: 400, ok: false, error: 'data.name required' };
            if (!d.table) return { _status: 400, ok: false, error: 'data.table required' };
            var uaPayload = {
                name:        d.name,
                table:       d.table,
                active:      d.active !== false ? 'true' : 'false',
                action_name: d.action_name || '',
                type:        d.type || 'button',
                sys_scope:   appScopeSysId()
            };
            if (d.script)       uaPayload.script       = d.script;
            if (d.condition)    uaPayload.condition    = d.condition;
            if (d.hint)         uaPayload.hint         = d.hint;
            if (d.list_action !== undefined) uaPayload.list_action = d.list_action ? 'true' : 'false';
            if (d.form_button !== undefined) uaPayload.form_button = d.form_button ? 'true' : 'false';
            var uaRes = artifactUpsert('sys_ui_action', 'name^table', d.name + '^' + d.table, uaPayload, true);
            return uaRes;

        case 'artifact.widget':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            if (!d.id)   return { _status: 400, ok: false, error: 'data.id (widget ID slug) required' };
            var wPayload = {
                name:          d.name,
                id:            d.id,
                active:        d.active !== false ? 'true' : 'false',
                sys_scope:     appScopeSysId()
            };
            if (d.template      !== undefined) wPayload.template      = d.template;
            if (d.client_script !== undefined) wPayload.client_script = d.client_script;
            if (d.server_script !== undefined) wPayload.server_script = d.server_script;
            if (d.css           !== undefined) wPayload.css           = d.css;
            if (d.option_schema !== undefined) wPayload.option_schema = typeof d.option_schema === 'string'
                ? d.option_schema : JSON.stringify(d.option_schema);
            if (d.demo_data     !== undefined) wPayload.demo_data     = typeof d.demo_data === 'string'
                ? d.demo_data : JSON.stringify(d.demo_data);
            var wRes = artifactUpsert('sp_widget', 'id', d.id, wPayload, true);
            return wRes;

        // ── FILES ──────────────────────────────────────────────

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
                     content_type: arGr.getValue('content_type'),
                     size_bytes: arGr.getValue('size_bytes'),
                     base64: String(sa2.getContentBase64(arGr)) };

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

        case 'attachment.delete':
            if (!d.attachment_sys_id) return { _status: 400, ok: false, error: 'data.attachment_sys_id required' };
            var adGr = new GlideRecord('sys_attachment');
            if (!adGr.get(d.attachment_sys_id)) return { _status: 404, ok: false, error: 'Attachment not found' };
            adGr.deleteRecord();
            return { ok: true, deleted_attachment: d.attachment_sys_id };

        // ── POWER ──────────────────────────────────────────────

        case 'script.run':
            if (!d.script) return { _status: 400, ok: false, error: 'data.script required' };
            var srResult;
            try {
                eval(d.script); // jshint ignore:line
            } catch (se) {
                return { ok: false, error: String(se) };
            }
            return { ok: true, result: (typeof srResult !== 'undefined') ? srResult : null };

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

        case 'sys.id':
            // Resolve artifact name → sys_id by type
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            var sidType = d.type || 'sys_script_include';
            var sidField = d.field || 'name';
            var sidMap = {
                'script_include':  { tbl: 'sys_script_include',   field: 'name' },
                'business_rule':   { tbl: 'sys_script',           field: 'name' },
                'notification':    { tbl: 'sysevent_email_action', field: 'name' },
                'scheduled_job':   { tbl: 'sysauto_script',       field: 'name' },
                'client_script':   { tbl: 'sys_script_client',    field: 'name' },
                'ui_action':       { tbl: 'sys_ui_action',        field: 'name' },
                'widget':          { tbl: 'sp_widget',            field: 'id' },
                'table':           { tbl: 'sys_db_object',        field: 'name' },
                'role':            { tbl: 'sys_user_role',        field: 'name' },
                'group':           { tbl: 'sys_user_group',       field: 'name' },
                'user':            { tbl: 'sys_user',             field: 'user_name' },
                'update_set':      { tbl: 'sys_update_set',       field: 'name' },
                'acl':             { tbl: 'sys_security_acl',     field: 'name' }
            };
            var sidDef = sidMap[sidType];
            var sidTbl = sidDef ? sidDef.tbl : sidType;
            var sidFld = (sidDef ? sidDef.field : sidField);
            var sidGr = new GlideRecord(sidTbl);
            sidGr.addQuery(sidFld, d.name);
            sidGr.setLimit(1);
            sidGr.query();
            if (!sidGr.next()) return { _status: 404, ok: false, error: 'Not found: ' + d.name + ' in ' + sidTbl };
            return { ok: true, type: sidType, name: d.name, sys_id: sidGr.getUniqueValue(), table: sidTbl };

        // ── ENGINE ─────────────────────────────────────────────

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

        case 'engine.selfupdate':
            if (!d.script) return { _status: 400, ok: false, error: 'data.script required' };
            if (d.script.indexOf('X-Engine-Key') < 0 || d.script.indexOf('function dispatch') < 0) {
                return { _status: 400, ok: false,
                    error: 'Safety check failed: script missing engine markers (X-Engine-Key / function dispatch)' };
            }
            var suId = engineOperationId(d.operation_sys_id);
            if (!suId) return { _status: 404, ok: false, error: 'Engine Router operation not found; pass data.operation_sys_id' };
            var suRes = platformUpdate('sys_ws_operation', suId, { operation_script: d.script }, false);
            if (!suRes.ok) return { _status: suRes.status || 500, ok: false, error: 'Self-update failed', status: suRes.status, body: suRes.body };
            return { ok: true, operation_sys_id: suId, bytes: d.script.length,
                     note: 'Engine script replaced. Re-run selftest to confirm.' };

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
            offset:            src.offset             || 0,
            fields:            src.fields             || null,
            encoded_query:     src.encoded_query      || '',
            order_by:          src.order_by           || '',
            order_by_desc:     src.order_by_desc      || '',
            display_values:    src.display_values     || false,
            group_by:          src.group_by           || '',
            bypass_rules:      src.bypass_rules       || false,
            platform:          src.platform           || false,
            scope:             (src.scope !== undefined ? src.scope : true),
            use_display_value: src.use_display_value  || null,
            confirm:           src.confirm            || false
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
