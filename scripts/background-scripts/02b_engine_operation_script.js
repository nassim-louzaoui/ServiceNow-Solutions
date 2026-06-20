// =============================================================================
// OPERATIONS INTELLIGENCE — ENGINE
// Scope    : x_infte_ops_int
// Endpoint : POST /api/x_infte_ops_int/ops_int_engine/v1
// Auth     : Header X-Engine-Key must match system property x_infte_ops_int.engine_key
// =============================================================================
// All requests are JSON. Single op: { "op": "<name>", "data": { ... } }
// Batch: { "op": "batch", "ops": [ { "op": "...", "data": {} } ] }
// Add "platform": true to any record operation to execute as the service account,
// bypassing the scoped sandbox. All artifacts are scoped to x_infte_ops_int.
// =============================================================================
// OPERATIONS (117) — send { "op": "help" } for the live annotated list
//   DIAGNOSTICS   ping · now · scope.info · engine.status · selftest · help · sys.version
//   DISCOVERY     meta.tables · meta.script_includes · meta.business_rules ·
//                 meta.notifications · meta.widgets · meta.jobs · meta.acls · meta.all ·
//                 meta.ui_pages · meta.portal_pages · meta.catalog_items · meta.app_menus ·
//                 meta.app_modules · meta.events · meta.roles · meta.portals ·
//                 table.exists · schema.fields · table.schema
//   DDL           schema.table.create · schema.table.delete · schema.table.extend ·
//                 schema.add_field · schema.field.update · schema.field.delete ·
//                 schema.add_choice · schema.choice.update · schema.choice.delete ·
//                 schema.set_autonumber · schema.index.create
//   PROPERTIES    property.set · property.get · property.list · property.delete
//   RECORDS       record.insert · record.insert_many · record.update · record.patch ·
//                 record.upsert · record.delete · record.bulk_delete · record.get ·
//                 record.find · record.query · record.clone · record.count ·
//                 record.aggregate · record.history · record.exists · record.read_many ·
//                 table.truncate
//   ACL           acl.create · acl.delete · acl.list
//   ACCESS        role.grant · role.revoke · user.roles
//   USERS         user.create · user.get · user.update · user.search
//   GROUPS        group.create · group.add_member · group.remove_member · group.members ·
//                 group.search
//   UPDATE SETS   update_set.create · update_set.activate · update_set.list
//   ARTIFACTS     artifact.script_include · artifact.business_rule · artifact.notification ·
//                 artifact.scheduled_job · artifact.client_script · artifact.ui_action ·
//                 artifact.widget · artifact.ui_page · artifact.sp_page ·
//                 artifact.sp_container · artifact.sp_row · artifact.sp_column ·
//                 artifact.sp_instance · artifact.sp_theme · artifact.app_menu ·
//                 artifact.app_module · artifact.catalog_item · artifact.catalog_variable ·
//                 artifact.ui_policy · artifact.ui_policy_action · artifact.event_registry ·
//                 artifact.report · artifact.role · artifact.sp_portal
//   FILES         attachment.write · attachment.read · attachment.list · attachment.delete
//   POWER         script.run · rest.call · event.fire · sys.log · cache.flush · sys.id ·
//                 note.add
//   WORKFLOW      workflow.start · workflow.cancel
//   EMAIL         email.send
//   ENGINE        engine.source · engine.selfupdate
//   BATCH         batch
// =============================================================================

(function process(request, response) {
    'use strict';

    var APP_SCOPE = 'x_infte_ops_int';
    var SVC_USER  = 'svc_operations_intelligence_api';
    var MAX_LIMIT = 10000;

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

    var body = {};
    try {
        body = JSON.parse(request.body.dataString);
    } catch (e) {
        response.setStatus(400);
        response.setBody({ ok: false, error: 'Invalid JSON body' });
        return;
    }
    response.setContentType('application/json');


    function buildGr(tbl, qry) {
        var gr = new GlideRecord(tbl);
        if (qry && typeof qry === 'object') {
            for (var f in qry) {
                if (qry.hasOwnProperty(f)) gr.addQuery(f, qry[f]);
            }
        }
        return gr;
    }

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

    function isSysId(v) { return /^[0-9a-f]{32}$/i.test(String(v)); }

    function resolveUser(idOrName) {
        if (!idOrName) return null;
        var g = new GlideRecord('sys_user');
        if (isSysId(idOrName) && g.get(idOrName)) return g.getUniqueValue();
        g = new GlideRecord('sys_user');
        g.addQuery('user_name', idOrName);
        g.setLimit(1);
        g.query();
        return g.next() ? g.getUniqueValue() : null;
    }

    function resolveRole(idOrName) {
        if (!idOrName) return null;
        var g = new GlideRecord('sys_user_role');
        if (isSysId(idOrName) && g.get(idOrName)) return g.getUniqueValue();
        g = new GlideRecord('sys_user_role');
        g.addQuery('name', idOrName);
        g.setLimit(1);
        g.query();
        return g.next() ? g.getUniqueValue() : null;
    }

    function resolveGroup(idOrName) {
        if (!idOrName) return null;
        var g = new GlideRecord('sys_user_group');
        if (isSysId(idOrName) && g.get(idOrName)) return g.getUniqueValue();
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

    function artifactUpsert(tbl, encodedQuery, payload, scopeAuto) {
        var existing = platformQuery(tbl, encodedQuery, ['sys_id'], 1, '', '', false, 0);
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

    function engineOperationId(override) {
        if (override) return override;
        var ws = new GlideRecord('sys_ws_operation');
        ws.addEncodedQuery('sys_scope.scope=' + APP_SCOPE + '^web_service_definition.name=Operations Intelligence Engine');
        ws.setLimit(1);
        ws.query();
        if (ws.next()) return ws.getUniqueValue();
        var ws2 = new GlideRecord('sys_ws_operation');
        ws2.addQuery('name', 'Engine Router');
        ws2.setLimit(1);
        ws2.query();
        return ws2.next() ? ws2.getUniqueValue() : '';
    }

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

    var OP_CATALOG = [
        ['ping',                   'health-check'],
        ['help',                   'list every op with description'],
        ['now',                    'server date-time (UTC + display)'],
        ['scope.info',             'instance / user / scope / capability details'],
        ['selftest',               'prove read + write + platform-write end-to-end'],
        ['engine.status',          'health, config, and artifact inventory summary'],
        ['meta.tables',            'list tables in the application scope'],
        ['meta.script_includes',   'list Script Includes in scope'],
        ['meta.business_rules',    'list Business Rules in scope'],
        ['meta.notifications',     'list Notifications in scope'],
        ['meta.widgets',           'list Service Portal widgets in scope'],
        ['meta.jobs',              'list Scheduled Jobs in scope'],
        ['meta.acls',              'list ACLs for a table (table required)'],
        ['meta.all',               'full artifact inventory across all types'],
        ['meta.ui_pages',          'list UI Pages in scope (sys_ui_page)'],
        ['meta.portal_pages',      'list Service Portal pages in scope (sp_page)'],
        ['meta.catalog_items',     'list Service Catalog items in scope (sc_cat_item)'],
        ['meta.app_menus',         'list Application Menus in scope (sys_app_application)'],
        ['meta.app_modules',       'list Application Modules in scope (sys_app_module)'],
        ['meta.events',            'list registered platform events in scope (sysevent_register)'],
        ['meta.roles',             'list Roles defined in the application scope'],
        ['meta.portals',           'list Service Portal portals in scope (sp_portal)'],
        ['sys.version',            'return platform build name, date, and instance info'],
        ['table.exists',           'check whether a table exists'],
        ['schema.fields',          'list all fields for a table with metadata'],
        ['table.schema',           'full schema dump: fields + choices + autonumber'],
        ['schema.table.create',    'create a scoped table (sys_db_object)'],
        ['schema.table.delete',    'delete a table by name or sys_id'],
        ['schema.table.extend',    'set a table\'s parent (super_class) for inheritance'],
        ['schema.add_field',       'add a field to a table (sys_dictionary)'],
        ['schema.field.update',    'update an existing field\'s properties'],
        ['schema.field.delete',    'remove a field from a table'],
        ['schema.add_choice',      'add a choice value (sys_choice)'],
        ['schema.choice.update',   'update label/sequence of an existing choice (sys_choice)'],
        ['schema.choice.delete',   'delete a choice value (sys_choice)'],
        ['schema.set_autonumber',  'configure auto-numbering (sys_number)'],
        ['schema.index.create',    'create a database index (sys_db_index)'],
        ['property.set',           'write a system property (or batch array)'],
        ['property.get',           'read a system property'],
        ['property.list',          'list properties by prefix'],
        ['property.delete',        'delete a system property'],
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
        ['record.count',           'count records matching query (GlideAggregate)'],
        ['record.aggregate',       'COUNT / SUM / AVG / MIN / MAX with multi group_by'],
        ['record.history',         'audit trail: sys_audit + sys_journal_field for a record'],
        ['table.truncate',         'delete every row in a table (requires confirm:true)'],
        ['record.exists',          'check whether a record matching a query exists'],
        ['record.read_many',       'fetch multiple records by sys_ids array in one call (+platform)'],
        ['acl.create',             'create an ACL rule (sys_security_acl)'],
        ['acl.delete',             'delete an ACL rule by sys_id'],
        ['acl.list',               'list ACLs for a table/operation'],
        ['role.grant',             'grant a role to a user (idempotent)'],
        ['role.revoke',            'revoke a role from a user'],
        ['user.roles',             'list a user\'s roles'],
        ['user.create',            'create a sys_user account'],
        ['user.get',               'get user record by user_name or sys_id'],
        ['user.update',            'update a user account'],
        ['user.search',            'search users by query/email/first_name/last_name/department'],
        ['group.create',           'create a sys_user_group'],
        ['group.add_member',       'add a user to a group (idempotent)'],
        ['group.remove_member',    'remove a user from a group'],
        ['group.members',          'list all members of a group'],
        ['group.search',           'search groups by name or query string'],
        ['update_set.create',      'create an update set'],
        ['update_set.activate',    'set an update set to in-progress state'],
        ['update_set.list',        'list update sets by state'],
        ['artifact.script_include',  'create or update a Script Include'],
        ['artifact.business_rule',   'create or update a Business Rule'],
        ['artifact.notification',    'create or update a Notification'],
        ['artifact.scheduled_job',   'create or update a Scheduled Script Execution'],
        ['artifact.client_script',   'create or update a Client Script'],
        ['artifact.ui_action',       'create or update a UI Action'],
        ['artifact.widget',          'create or update a Service Portal widget'],
        ['artifact.ui_page',         'create or update a UI Page (sys_ui_page)'],
        ['artifact.sp_page',         'create or update a Service Portal page (sp_page)'],
        ['artifact.sp_container',    'insert a Service Portal container into a page'],
        ['artifact.sp_row',          'insert a Service Portal row into a container'],
        ['artifact.sp_column',       'insert a Service Portal column into a row'],
        ['artifact.sp_instance',     'insert a widget instance into a column'],
        ['artifact.sp_theme',        'create or update a Service Portal theme'],
        ['artifact.app_menu',        'create or update an Application Menu (sys_app_application)'],
        ['artifact.app_module',      'create or update an Application Module (sys_app_module)'],
        ['artifact.catalog_item',    'create or update a Service Catalog item (sc_cat_item)'],
        ['artifact.catalog_variable','create or update a catalog item variable (item_option_new)'],
        ['artifact.ui_policy',       'create or update a UI Policy (sys_ui_policy)'],
        ['artifact.ui_policy_action','create or update a UI Policy Action (sys_ui_policy_action)'],
        ['artifact.event_registry',  'create or update a registered event (sysevent_register)'],
        ['artifact.report',          'create or update a Report (sys_report)'],
        ['artifact.role',            'create or update a scoped Role (sys_user_role)'],
        ['artifact.sp_portal',       'create or update a Service Portal portal (sp_portal)'],
        ['attachment.write',       'attach base64 content to a record'],
        ['attachment.read',        'read attachment content as base64'],
        ['attachment.list',        'list a record\'s attachments'],
        ['attachment.delete',      'delete an attachment by sys_id'],
        ['script.run',             'execute JS in scope context; set var result to return data'],
        ['rest.call',              'authenticated internal REST call (any method/path)'],
        ['event.fire',             'fire a platform event via gs.eventQueue'],
        ['sys.log',                'write to the application system log'],
        ['cache.flush',            'flush all platform caches'],
        ['sys.id',                 'resolve artifact name → sys_id by type'],
        ['note.add',               'add a work note or comment to any record'],
        ['workflow.start',         'trigger a Flow Designer flow by name with inputs'],
        ['workflow.cancel',        'cancel a running flow instance by sys_id'],
        ['email.send',             'send an outbound email via GlideEmailOutbound'],
        ['engine.source',          'inspect the engine\'s stored script and size'],
        ['engine.selfupdate',      'replace the engine\'s own script (safety-checked)'],
        ['batch',                  'run many ops in one HTTP call (stop_on_error flag)']
    ];

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
                var stClean = new GlideRecord('sys_properties');
                stClean.addQuery('name', stKey);
                stClean.query();
                if (stClean.next()) stClean.deleteRecord();
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
            var estables  = metaList('sys_db_object',        ['name','label'],                   'name');
            var esis      = metaList('sys_script_include',   ['name','api_name','active'],        'name');
            var esbr      = metaList('sys_script',           ['name','collection','active'],      'name');
            var escs      = metaList('sys_script_client',    ['name','table','type','active'],    'name');
            var esua      = metaList('sys_ui_action',        ['name','table','active'],           'name');
            var esnotif   = metaList('sysevent_email_action',['name','active','event_name'],      'name');
            var esjobs    = metaList('sysauto_script',       ['name','active','run_type'],        'name');
            var eswidget  = metaList('sp_widget',            ['name','id','active'],              'name');
            var esuipg    = metaList('sys_ui_page',          ['name','category'],                 'name');
            var esrpt     = metaList('sys_report',           ['title','table','type'],            'title');
            var escat     = metaList('sc_cat_item',          ['name','active'],                   'name');
            var esacl     = metaList('sys_security_acl',     ['name','operation','active'],       'name');
            return {
                ok: true,
                scope: APP_SCOPE,
                instance: gs.getProperty('instance_name', 'unknown'),
                base_url: instanceBase(),
                user: gs.getUserName(),
                is_admin: gs.hasRole('admin'),
                platform_writes_enabled: !!gs.getProperty(APP_SCOPE + '.svc_password', ''),
                engine_key_configured:   !!gs.getProperty(APP_SCOPE + '.engine_key', ''),
                op_count: OP_CATALOG.length,
                inventory: {
                    tables:          { count: estables.length },
                    script_includes: { count: esis.length,     items: esis },
                    business_rules:  { count: esbr.length,     items: esbr },
                    client_scripts:  { count: escs.length,     items: escs },
                    ui_actions:      { count: esua.length,     items: esua },
                    notifications:   { count: esnotif.length,  items: esnotif },
                    scheduled_jobs:  { count: esjobs.length,   items: esjobs },
                    widgets:         { count: eswidget.length, items: eswidget },
                    ui_pages:        { count: esuipg.length,   items: esuipg },
                    reports:         { count: esrpt.length,    items: esrpt },
                    catalog_items:   { count: escat.length,    items: escat },
                    acls:            { count: esacl.length,    items: esacl }
                }
            };

        case 'sys.version':
            return { ok: true,
                build_name:  gs.getProperty('glide.buildname', 'unknown'),
                build_date:  gs.getProperty('glide.builddate', 'unknown'),
                build_tag:   gs.getProperty('glide.build.tag', 'unknown'),
                patch:       gs.getProperty('glide.build.patch', 'unknown'),
                instance:    gs.getProperty('instance_name', 'unknown'),
                base_url:    instanceBase() };


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
                { key: 'tables',            tbl: 'sys_db_object',         fields: ['name','label'],                        sort: 'name' },
                { key: 'script_includes',   tbl: 'sys_script_include',    fields: ['name','api_name','active'],            sort: 'name' },
                { key: 'business_rules',    tbl: 'sys_script',            fields: ['name','collection','active','when'],   sort: 'name' },
                { key: 'client_scripts',    tbl: 'sys_script_client',     fields: ['name','table','type','active'],        sort: 'name' },
                { key: 'ui_actions',        tbl: 'sys_ui_action',         fields: ['name','table','active'],               sort: 'name' },
                { key: 'ui_policies',       tbl: 'sys_ui_policy',         fields: ['short_description','table','active'],  sort: 'short_description' },
                { key: 'notifications',     tbl: 'sysevent_email_action', fields: ['name','active','event_name'],          sort: 'name' },
                { key: 'scheduled_jobs',    tbl: 'sysauto_script',        fields: ['name','active','run_type'],            sort: 'name' },
                { key: 'widgets',           tbl: 'sp_widget',             fields: ['name','id','active'],                  sort: 'name' },
                { key: 'ui_pages',          tbl: 'sys_ui_page',           fields: ['name','category'],                     sort: 'name' },
                { key: 'portal_pages',      tbl: 'sp_page',               fields: ['id','title','draft'],                  sort: 'id' },
                { key: 'portal_themes',     tbl: 'sp_theme',              fields: ['name'],                                sort: 'name' },
                { key: 'app_menus',         tbl: 'sys_app_application',   fields: ['title','active'],                      sort: 'title' },
                { key: 'app_modules',       tbl: 'sys_app_module',        fields: ['title','active','link_type'],          sort: 'title' },
                { key: 'catalog_items',     tbl: 'sc_cat_item',           fields: ['name','active','short_description'],   sort: 'name' },
                { key: 'event_registries',  tbl: 'sysevent_register',     fields: ['event_name','description','table'],    sort: 'event_name' },
                { key: 'reports',           tbl: 'sys_report',            fields: ['title','table','type'],                sort: 'title' },
                { key: 'acls',              tbl: 'sys_security_acl',      fields: ['name','operation','active'],           sort: 'name' },
                { key: 'properties',        tbl: 'sys_properties',        fields: ['name','value'],                        sort: 'name' },
                { key: 'roles',             tbl: 'sys_user_role',         fields: ['name','description','grantable'],       sort: 'name' },
                { key: 'portals',           tbl: 'sp_portal',             fields: ['title','url_suffix'],                   sort: 'title' }
            ];
            for (var ati = 0; ati < allTypes.length; ati++) {
                var at = allTypes[ati];
                var atGr = new GlideRecord(at.tbl);
                if (at.tbl === 'sys_properties') {
                    atGr.addQuery('name', 'STARTSWITH', APP_SCOPE);
                } else {
                    atGr.addQuery('sys_scope', allAppId);
                }
                atGr.orderBy(at.sort);
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

        case 'meta.ui_pages':
            var muipRows = metaList('sys_ui_page', ['name', 'category', 'direct'], 'name');
            return { ok: true, count: muipRows.length, ui_pages: muipRows };

        case 'meta.portal_pages':
            var mppRows = metaList('sp_page', ['id', 'title', 'draft', 'internal'], 'id');
            return { ok: true, count: mppRows.length, portal_pages: mppRows };

        case 'meta.catalog_items':
            var mciRows = metaList('sc_cat_item', ['name', 'short_description', 'active', 'category'], 'name');
            return { ok: true, count: mciRows.length, catalog_items: mciRows };

        case 'meta.app_menus':
            var mamRows = metaList('sys_app_application', ['title', 'active', 'category'], 'title');
            return { ok: true, count: mamRows.length, app_menus: mamRows };

        case 'meta.app_modules':
            var mamodRows = metaList('sys_app_module', ['title', 'active', 'application', 'link_type', 'order'], 'title');
            return { ok: true, count: mamodRows.length, app_modules: mamodRows };

        case 'meta.events':
            var mevRows = metaList('sysevent_register', ['event_name', 'description', 'table', 'fired_by'], 'event_name');
            return { ok: true, count: mevRows.length, events: mevRows };

        case 'meta.roles':
            var mroRows = metaList('sys_user_role', ['name', 'description', 'grantable', 'elevated_privilege'], 'name');
            return { ok: true, count: mroRows.length, roles: mroRows };

        case 'meta.portals':
            var mporRows = metaList('sp_portal', ['title', 'url_suffix'], 'title');
            return { ok: true, count: mporRows.length, portals: mporRows };

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
            var tsNumGr = new GlideRecord('sys_number');
            tsNumGr.addQuery('category', t);
            tsNumGr.setLimit(1);
            tsNumGr.query();
            var tsNum = tsNumGr.next() ? { prefix: tsNumGr.getValue('prefix'),
                current: tsNumGr.getValue('number') } : null;
            return { ok: true, table: t, field_count: tsFields.length,
                     fields: tsFields, choices: tsChoices, autonumber: tsNum };


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

        case 'schema.table.extend':
            if (!t)          return { _status: 400, ok: false, error: 'table (child table name) required' };
            if (!d.parent)   return { _status: 400, ok: false, error: 'data.parent (parent table name) required' };
            var steChild = new GlideRecord('sys_db_object');
            steChild.addQuery('name', t);
            steChild.setLimit(1);
            steChild.query();
            if (!steChild.next()) return { _status: 404, ok: false, error: 'Child table not found: ' + t };
            var steChildId = steChild.getUniqueValue();
            var steParent = new GlideRecord('sys_db_object');
            steParent.addQuery('name', d.parent);
            steParent.setLimit(1);
            steParent.query();
            if (!steParent.next()) return { _status: 404, ok: false, error: 'Parent table not found: ' + d.parent };
            var steParentId = steParent.getUniqueValue();
            var steRes = platformUpdate('sys_db_object', steChildId, { super_class: steParentId }, false);
            if (!steRes.ok) return { ok: false, error: 'Extend failed', status: steRes.status, body: steRes.body };
            return { ok: true, table: t, extends: d.parent, child_sys_id: steChildId, parent_sys_id: steParentId };

        case 'schema.choice.update':
            if (!t)         return { _status: 400, ok: false, error: 'table required' };
            if (!d.element) return { _status: 400, ok: false, error: 'data.element required' };
            if (!d.value)   return { _status: 400, ok: false, error: 'data.value required' };
            var scuGr = new GlideRecord('sys_choice');
            scuGr.addQuery('name', t);
            scuGr.addQuery('element', d.element);
            scuGr.addQuery('value', d.value);
            scuGr.setLimit(1);
            scuGr.query();
            if (!scuGr.next()) return { _status: 404, ok: false, error: 'Choice not found: ' + t + '.' + d.element + '=' + d.value };
            var scuId = scuGr.getUniqueValue();
            var scuPayload = {};
            if (d.label    !== undefined) scuPayload.label    = String(d.label);
            if (d.sequence !== undefined) scuPayload.sequence = String(d.sequence);
            if (!Object.keys(scuPayload).length) return { _status: 400, ok: false, error: 'No updatable fields: supply data.label or data.sequence' };
            var scuRes = platformUpdate('sys_choice', scuId, scuPayload, false);
            if (!scuRes.ok) return { ok: false, error: 'Update failed', status: scuRes.status, body: scuRes.body };
            return { ok: true, sys_id: scuId, table: t, element: d.element, value: d.value, updated: scuPayload };

        case 'schema.choice.delete':
            if (!t)         return { _status: 400, ok: false, error: 'table required' };
            if (!d.element) return { _status: 400, ok: false, error: 'data.element required' };
            if (!d.value)   return { _status: 400, ok: false, error: 'data.value required' };
            var scdGr = new GlideRecord('sys_choice');
            scdGr.addQuery('name', t);
            scdGr.addQuery('element', d.element);
            scdGr.addQuery('value', d.value);
            scdGr.setLimit(1);
            scdGr.query();
            if (!scdGr.next()) return { _status: 404, ok: false, error: 'Choice not found: ' + t + '.' + d.element + '=' + d.value };
            var scdId = scdGr.getUniqueValue();
            var scdDel = platformDelete('sys_choice', scdId);
            if (!scdDel.ok) return { ok: false, error: 'Delete failed', status: scdDel.status, body: scdDel.body };
            return { ok: true, deleted_choice: d.value, element: d.element, table: t, sys_id: scdId };


        case 'property.set':
            if (Array.isArray(d)) {
                var psBatch = [], psFail = 0;
                for (var pbi = 0; pbi < d.length; pbi++) {
                    var pb = d[pbi];
                    if (!pb.key) { psBatch.push({ ok: false, error: 'missing key', index: pbi }); psFail++; continue; }
                    if (pb.type) {
                        var pbPayload = { name: pb.key, value: pb.value !== undefined ? String(pb.value) : '', type: pb.type };
                        if (pb.description) pbPayload.description = pb.description;
                        var pbExist = platformQuery('sys_properties', 'name=' + pb.key, ['sys_id'], 1, '', '', false, 0);
                        var pbRows = (pbExist.ok && pbExist.body && pbExist.body.result) ? pbExist.body.result : [];
                        var pbR = pbRows.length ? platformUpdate('sys_properties', pbRows[0].sys_id, pbPayload, false)
                                                 : platformInsert('sys_properties', pbPayload, false, false);
                        if (!pbR.ok) { psBatch.push({ ok: false, error: 'typed set failed', key: pb.key }); psFail++; continue; }
                    } else {
                        gs.setProperty(pb.key, pb.value !== undefined ? String(pb.value) : '', pb.description || '');
                    }
                    psBatch.push({ ok: true, key: pb.key });
                }
                return { ok: psFail === 0, set: psBatch.length - psFail, failed: psFail, results: psBatch };
            }
            if (!d.key) return { _status: 400, ok: false, error: 'data.key required' };
            if (d.type) {
                var psPayload = { name: d.key, value: d.value !== undefined ? String(d.value) : '', type: d.type };
                if (d.description) psPayload.description = d.description;
                var psExist = platformQuery('sys_properties', 'name=' + d.key, ['sys_id'], 1, '', '', false, 0);
                var psRows = (psExist.ok && psExist.body && psExist.body.result) ? psExist.body.result : [];
                var psR = psRows.length ? platformUpdate('sys_properties', psRows[0].sys_id, psPayload, false)
                                        : platformInsert('sys_properties', psPayload, false, false);
                if (!psR.ok) return { ok: false, error: 'Typed property set failed', status: psR.status, body: psR.body };
                return { ok: true, key: d.key, type: d.type };
            }
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
            if (!ctx.encoded_query && (!q || !Object.keys(q).length)) {
                return { _status: 400, ok: false, error: 'Upsert requires query or encoded_query to match existing records; provide at least one filter field' };
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
            var ins2Id = ins2.insert();
            if (!ins2Id) return { _status: 500, ok: false, error: 'Upsert insert failed', last_error: ins2.getLastErrorMessage ? String(ins2.getLastErrorMessage()) : 'n/a' };
            return { ok: true, action: 'inserted', sys_id: String(ins2Id) };

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
            var bdAgg = new GlideAggregate(t);
            for (var bdqf in q) { if (q.hasOwnProperty(bdqf)) bdAgg.addQuery(bdqf, q[bdqf]); }
            if (ctx.encoded_query) bdAgg.addEncodedQuery(ctx.encoded_query);
            bdAgg.addAggregate('COUNT');
            bdAgg.query();
            var bdCount = bdAgg.next() ? parseInt(bdAgg.getAggregate('COUNT'), 10) : 0;
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
            if (off > 0) { qGr.chooseWindow(off, off + l); } else { qGr.setLimit(l); }
            qGr.query();
            var qRows = [];
            while (qGr.next()) qRows.push(grToObj(qGr, ctx.fields || null, dv));
            var qTotal = null;
            if (ctx.include_total) {
                var qtAgg = new GlideAggregate(t);
                for (var qtf in q) { if (q.hasOwnProperty(qtf)) qtAgg.addQuery(qtf, q[qtf]); }
                if (ctx.encoded_query) qtAgg.addEncodedQuery(ctx.encoded_query);
                qtAgg.addAggregate('COUNT');
                qtAgg.query();
                qTotal = qtAgg.next() ? parseInt(qtAgg.getAggregate('COUNT'), 10) : 0;
            }
            return { ok: true, count: qRows.length, records: qRows, offset: off, total: qTotal };

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
            var cAgg = new GlideAggregate(t);
            for (var cqf in q) { if (q.hasOwnProperty(cqf)) cAgg.addQuery(cqf, q[cqf]); }
            if (ctx.encoded_query) cAgg.addEncodedQuery(ctx.encoded_query);
            cAgg.addAggregate('COUNT');
            cAgg.query();
            var cTotal = cAgg.next() ? parseInt(cAgg.getAggregate('COUNT'), 10) : 0;
            return { ok: true, table: t, count: cTotal };

        case 'record.aggregate':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var agg = new GlideAggregate(t);
            for (var aqf in q) { if (q.hasOwnProperty(aqf)) agg.addQuery(aqf, q[aqf]); }
            if (ctx.encoded_query) agg.addEncodedQuery(ctx.encoded_query);
            var aggType  = (d.type || 'COUNT').toUpperCase();
            var aggField = d.field || '';
            var aggGroupBy = ctx.group_by;
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

        case 'record.history':
            if (!t)        return { _status: 400, ok: false, error: 'table required' };
            if (!d.sys_id) return { _status: 400, ok: false, error: 'data.sys_id required' };
            var rhAuditGr = new GlideRecord('sys_audit');
            rhAuditGr.addQuery('tablename', t);
            rhAuditGr.addQuery('documentkey', d.sys_id);
            rhAuditGr.orderByDesc('sys_created_on');
            rhAuditGr.setLimit(l);
            rhAuditGr.query();
            var rhAudit = [];
            while (rhAuditGr.next()) {
                rhAudit.push({
                    sys_id:       rhAuditGr.getUniqueValue(),
                    fieldname:    rhAuditGr.getValue('fieldname'),
                    oldvalue:     rhAuditGr.getValue('oldvalue'),
                    newvalue:     rhAuditGr.getValue('newvalue'),
                    sys_created_by: rhAuditGr.getValue('sys_created_by'),
                    sys_created_on: rhAuditGr.getValue('sys_created_on')
                });
            }
            var rhJrnGr = new GlideRecord('sys_journal_field');
            rhJrnGr.addQuery('name', t);
            rhJrnGr.addQuery('element_id', d.sys_id);
            rhJrnGr.orderByDesc('sys_created_on');
            rhJrnGr.setLimit(l);
            rhJrnGr.query();
            var rhJournal = [];
            while (rhJrnGr.next()) {
                rhJournal.push({
                    sys_id:       rhJrnGr.getUniqueValue(),
                    element:      rhJrnGr.getValue('element'),
                    value:        rhJrnGr.getValue('value'),
                    sys_created_by: rhJrnGr.getValue('sys_created_by'),
                    sys_created_on: rhJrnGr.getValue('sys_created_on')
                });
            }
            return { ok: true, table: t, sys_id: d.sys_id,
                     audit: rhAudit, journal: rhJournal };

        case 'table.truncate':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var ttAgg = new GlideAggregate(t);
            ttAgg.addAggregate('COUNT');
            ttAgg.query();
            var ttTotal = ttAgg.next() ? parseInt(ttAgg.getAggregate('COUNT'), 10) : 0;
            if (!ctx.confirm) {
                return { ok: false, _status: 400,
                    error: 'Add "confirm": true to proceed. This will delete all ' + ttTotal + ' record(s) from ' + t + '.' };
            }
            var ttDeleted = 0;
            var ttGr = new GlideRecord(t);
            ttGr.query();
            while (ttGr.next()) { ttGr.deleteRecord(); ttDeleted++; }
            return { ok: true, table: t, deleted: ttDeleted };


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
            var aclRes = artifactUpsert('sys_security_acl', 'name=' + t + '^operation=' + d.operation, aclPayload, true);
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


        case 'user.create':
            if (!d.user_name) return { _status: 400, ok: false, error: 'data.user_name required' };
            var ucExist = new GlideRecord('sys_user');
            ucExist.addQuery('user_name', d.user_name);
            ucExist.setLimit(1);
            ucExist.query();
            if (ucExist.next()) return { ok: true, skipped: true, reason: 'user exists', sys_id: ucExist.getUniqueValue() };
            var ucPayload = { user_name: d.user_name };
            var ucFields = ['first_name','last_name','email','title','department','active','password_needs_reset','locked_out','phone','mobile_phone','time_zone'];
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
            var uuAllowed = ['first_name','last_name','email','title','department','active','locked_out','password_needs_reset','phone','mobile_phone','time_zone'];
            for (var uui = 0; uui < uuAllowed.length; uui++) {
                if (d[uuAllowed[uui]] !== undefined) uuPayload[uuAllowed[uui]] = String(d[uuAllowed[uui]]);
            }
            if (!Object.keys(uuPayload).length) return { _status: 400, ok: false, error: 'No updatable fields supplied' };
            var uuRes = platformUpdate('sys_user', uuId, uuPayload, false);
            if (!uuRes.ok) return { ok: false, error: 'Update failed', status: uuRes.status, body: uuRes.body };
            return { ok: true, sys_id: uuId, updated: uuPayload };


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


        case 'artifact.script_include':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            if (!d.script) return { _status: 400, ok: false, error: 'data.script required' };
            var siApiName = d.api_name || d.name;
            if (siApiName.indexOf('.') < 0) siApiName = APP_SCOPE + '.' + siApiName;
            var siPayload2 = {
                name:            d.name,
                api_name:        siApiName,
                script:          d.script,
                active:          d.active !== false ? 'true' : 'false',
                client_callable: d.client_callable ? 'true' : 'false',
                access:          d.access || 'package_private',
                sys_scope:       appScopeSysId()
            };
            var siRes2 = artifactUpsert('sys_script_include', 'name=' + d.name, siPayload2, true);
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
            var brRes = artifactUpsert('sys_script', 'name=' + d.name + '^collection=' + d.collection, brPayload, true);
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
            if (d.message_text)     notifPayload.message_text     = d.message_text;
            if (d.importance)       notifPayload.importance       = d.importance;
            if (d.send_when)        notifPayload.send_when        = d.send_when;
            if (d.condition)        notifPayload.condition        = d.condition;
            if (d.recipient_groups) notifPayload.recipient_groups = d.recipient_groups;
            if (d.recipient_users)  notifPayload.recipient_users  = d.recipient_users;
            var notifRes = artifactUpsert('sysevent_email_action', 'name=' + d.name, notifPayload, true);
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
            var sjRes = artifactUpsert('sysauto_script', 'name=' + d.name, sjPayload, true);
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
            var csRes = artifactUpsert('sys_script_client', 'name=' + d.name + '^table=' + d.table + '^type=' + d.type, csPayload, true);
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
            var uaRes = artifactUpsert('sys_ui_action', 'name=' + d.name + '^table=' + d.table, uaPayload, true);
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
            var wRes = artifactUpsert('sp_widget', 'id=' + d.id, wPayload, true);
            return wRes;

        case 'artifact.ui_page':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            var uipPayload = { name: d.name, sys_scope: appScopeSysId() };
            if (d.category         !== undefined) uipPayload.category          = d.category;
            if (d.html             !== undefined) uipPayload.html              = d.html;
            if (d.client           !== undefined) uipPayload.client            = d.client;
            if (d.server           !== undefined) uipPayload.server            = d.server;
            if (d.processing_script!== undefined) uipPayload.processing_script = d.processing_script;
            return artifactUpsert('sys_ui_page', 'name=' + d.name, uipPayload, true);

        case 'artifact.sp_page':
            if (!d.id) return { _status: 400, ok: false, error: 'data.id (page slug) required' };
            var sppPayload = { id: d.id, sys_scope: appScopeSysId() };
            if (d.title    !== undefined) sppPayload.title    = d.title;
            if (d.draft    !== undefined) sppPayload.draft    = d.draft ? 'true' : 'false';
            if (d.internal !== undefined) sppPayload.internal = d.internal ? 'true' : 'false';
            return artifactUpsert('sp_page', 'id=' + d.id, sppPayload, true);

        case 'artifact.sp_container':
            if (!d.page_sys_id) return { _status: 400, ok: false, error: 'data.page_sys_id required' };
            var spcPayload = {
                sp_page:       d.page_sys_id,
                order:         String(d.order || 100),
                bootstrap_alt: d.bootstrap_alt ? 'true' : 'false',
                width:         d.width || 'container',
                sys_scope:     appScopeSysId()
            };
            var spcRes = platformInsert('sp_container', spcPayload, false, true);
            if (!spcRes.ok) return { ok: false, error: 'sp_container insert failed', status: spcRes.status, body: spcRes.body };
            return { ok: true, action: 'inserted', sys_id: spcRes.sys_id };

        case 'artifact.sp_row':
            if (!d.container_sys_id) return { _status: 400, ok: false, error: 'data.container_sys_id required' };
            var sprPayload = {
                sp_container: d.container_sys_id,
                order:        String(d.order || 100),
                sys_scope:    appScopeSysId()
            };
            var sprRes = platformInsert('sp_row', sprPayload, false, true);
            if (!sprRes.ok) return { ok: false, error: 'sp_row insert failed', status: sprRes.status, body: sprRes.body };
            return { ok: true, action: 'inserted', sys_id: sprRes.sys_id };

        case 'artifact.sp_column':
            if (!d.row_sys_id) return { _status: 400, ok: false, error: 'data.row_sys_id required' };
            var spcolPayload = {
                sp_row:   d.row_sys_id,
                order:    String(d.order || 100),
                sys_scope: appScopeSysId()
            };
            if (d.size_md !== undefined) spcolPayload.size_md = String(d.size_md);
            if (d.size_sm !== undefined) spcolPayload.size_sm = String(d.size_sm);
            if (d.size_xs !== undefined) spcolPayload.size_xs = String(d.size_xs);
            if (d.size_lg !== undefined) spcolPayload.size_lg = String(d.size_lg);
            var spcolRes = platformInsert('sp_column', spcolPayload, false, true);
            if (!spcolRes.ok) return { ok: false, error: 'sp_column insert failed', status: spcolRes.status, body: spcolRes.body };
            return { ok: true, action: 'inserted', sys_id: spcolRes.sys_id };

        case 'artifact.sp_instance':
            if (!d.column_sys_id) return { _status: 400, ok: false, error: 'data.column_sys_id required' };
            if (!d.widget_sys_id) return { _status: 400, ok: false, error: 'data.widget_sys_id required' };
            var spinPayload = {
                sp_column:  d.column_sys_id,
                widget:     d.widget_sys_id,
                order:      String(d.order || 100),
                sys_scope:  appScopeSysId()
            };
            if (d.title      !== undefined) spinPayload.title      = d.title;
            if (d.hide_title !== undefined) spinPayload.hide_title = d.hide_title ? 'true' : 'false';
            if (d.css_class  !== undefined) spinPayload.css_class  = d.css_class;
            if (d.options    !== undefined) spinPayload.options     = typeof d.options === 'string'
                ? d.options : JSON.stringify(d.options);
            var spinRes = platformInsert('sp_instance', spinPayload, false, true);
            if (!spinRes.ok) return { ok: false, error: 'sp_instance insert failed', status: spinRes.status, body: spinRes.body };
            return { ok: true, action: 'inserted', sys_id: spinRes.sys_id };

        case 'artifact.sp_theme':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            var sptPayload = { name: d.name, sys_scope: appScopeSysId() };
            if (d.css_variables  !== undefined) sptPayload.css_variables  = d.css_variables;
            if (d.fixed_header   !== undefined) sptPayload.fixed_header   = d.fixed_header ? 'true' : 'false';
            if (d.navbar_inverse !== undefined) sptPayload.navbar_inverse = d.navbar_inverse ? 'true' : 'false';
            return artifactUpsert('sp_theme', 'name=' + d.name, sptPayload, true);

        case 'artifact.app_menu':
            if (!d.title) return { _status: 400, ok: false, error: 'data.title required' };
            var amPayload = {
                title:     d.title,
                active:    d.active !== false ? 'true' : 'false',
                sys_scope: appScopeSysId()
            };
            if (d.category !== undefined) amPayload.category = d.category;
            if (d.roles    !== undefined) amPayload.roles    = d.roles;
            return artifactUpsert('sys_app_application', 'title=' + d.title, amPayload, true);

        case 'artifact.app_module':
            if (!d.title)           return { _status: 400, ok: false, error: 'data.title required' };
            if (!d.application_sys_id) return { _status: 400, ok: false, error: 'data.application_sys_id required' };
            var amodPayload = {
                title:       d.title,
                application: d.application_sys_id,
                active:      d.active !== false ? 'true' : 'false',
                link_type:   d.link_type || 'LIST',
                order:       String(d.order || 100),
                sys_scope:   appScopeSysId()
            };
            if (d.table     !== undefined) amodPayload.table  = d.table;
            if (d.filter    !== undefined) amodPayload.filter = d.filter;
            if (d.url       !== undefined) amodPayload.url    = d.url;
            if (d.roles     !== undefined) amodPayload.roles  = d.roles;
            return artifactUpsert('sys_app_module', 'title=' + d.title + '^application=' + d.application_sys_id, amodPayload, true);

        case 'artifact.catalog_item':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            var catPayload = {
                name:              d.name,
                active:            d.active !== false ? 'true' : 'false',
                sys_scope:         appScopeSysId()
            };
            if (d.short_description !== undefined) catPayload.short_description = d.short_description;
            if (d.description       !== undefined) catPayload.description       = d.description;
            if (d.category          !== undefined) catPayload.category          = d.category;
            if (d.price             !== undefined) catPayload.price             = String(d.price);
            if (d.picture           !== undefined) catPayload.picture           = d.picture;
            return artifactUpsert('sc_cat_item', 'name=' + d.name, catPayload, true);

        case 'artifact.catalog_variable':
            if (!d.name)        return { _status: 400, ok: false, error: 'data.name required' };
            if (!d.cat_item_sys_id) return { _status: 400, ok: false, error: 'data.cat_item_sys_id required' };
            var cvPayload = {
                name:          d.name,
                cat_item:      d.cat_item_sys_id,
                question_text: d.question_text || d.name,
                type:          String(d.type !== undefined ? d.type : 6),
                order:         String(d.order || 100),
                active:        d.active !== false ? 'true' : 'false',
                mandatory:     d.mandatory ? 'true' : 'false',
                sys_scope:     appScopeSysId()
            };
            if (d.default_value !== undefined) cvPayload.default_value = String(d.default_value);
            if (d.help_text     !== undefined) cvPayload.help_text     = d.help_text;
            return artifactUpsert('item_option_new', 'name=' + d.name + '^cat_item=' + d.cat_item_sys_id, cvPayload, true);

        case 'artifact.ui_policy':
            if (!d.short_description) return { _status: 400, ok: false, error: 'data.short_description required' };
            if (!d.table)             return { _status: 400, ok: false, error: 'data.table required' };
            var uipolicPayload = {
                short_description: d.short_description,
                table:             d.table,
                active:            d.active !== false ? 'true' : 'false',
                sys_scope:         appScopeSysId()
            };
            if (d.run_scripts  !== undefined) uipolicPayload.run_scripts  = d.run_scripts ? 'true' : 'false';
            if (d.on_load      !== undefined) uipolicPayload.on_load      = d.on_load ? 'true' : 'false';
            if (d.script_true  !== undefined) uipolicPayload.script_true  = d.script_true;
            if (d.script_false !== undefined) uipolicPayload.script_false = d.script_false;
            if (d.reverse      !== undefined) uipolicPayload.reverse      = d.reverse ? 'true' : 'false';
            if (d.conditions   !== undefined) uipolicPayload.conditions   = d.conditions;
            return artifactUpsert('sys_ui_policy', 'short_description=' + d.short_description + '^table=' + d.table, uipolicPayload, true);

        case 'artifact.ui_policy_action':
            if (!d.ui_policy_sys_id) return { _status: 400, ok: false, error: 'data.ui_policy_sys_id required' };
            if (!d.field)            return { _status: 400, ok: false, error: 'data.field required' };
            var uipaPayload = {
                ui_policy:  d.ui_policy_sys_id,
                field:      d.field,
                sys_scope:  appScopeSysId()
            };
            if (d.mandatory  !== undefined) uipaPayload.mandatory  = d.mandatory;
            if (d.visible    !== undefined) uipaPayload.visible     = d.visible;
            if (d.read_only  !== undefined) uipaPayload.read_only   = d.read_only;
            return artifactUpsert('sys_ui_policy_action', 'ui_policy=' + d.ui_policy_sys_id + '^field=' + d.field, uipaPayload, true);

        case 'artifact.event_registry':
            if (!d.event_name) return { _status: 400, ok: false, error: 'data.event_name required' };
            var evRegPayload = {
                event_name: d.event_name,
                sys_scope:  appScopeSysId()
            };
            if (d.description !== undefined) evRegPayload.description = d.description;
            if (d.table       !== undefined) evRegPayload.table       = d.table;
            if (d.fired_by    !== undefined) evRegPayload.fired_by    = d.fired_by;
            return artifactUpsert('sysevent_register', 'event_name=' + d.event_name, evRegPayload, true);

        case 'artifact.report':
            if (!d.title) return { _status: 400, ok: false, error: 'data.title required' };
            if (!t)       return { _status: 400, ok: false, error: 'table required' };
            var rptPayload = {
                title:     d.title,
                table:     t,
                type:      d.type || 'list',
                sys_scope: appScopeSysId()
            };
            if (d.filter      !== undefined) rptPayload.filter      = d.filter;
            if (d.field       !== undefined) rptPayload.field       = d.field;
            if (d.group_by    !== undefined) rptPayload.group_by    = d.group_by;
            if (d.aggregation !== undefined) rptPayload.aggregation = d.aggregation;
            return artifactUpsert('sys_report', 'title=' + d.title + '^table=' + t, rptPayload, true);

        case 'artifact.role':
            if (!d.name) return { _status: 400, ok: false, error: 'data.name required' };
            var arPayload = {
                name:               d.name,
                description:        d.description || '',
                elevated_privilege: d.elevated_privilege ? 'true' : 'false',
                grantable:          d.grantable !== false ? 'true' : 'false',
                sys_scope:          appScopeSysId()
            };
            return artifactUpsert('sys_user_role', 'name=' + d.name, arPayload, true);

        case 'artifact.sp_portal':
            if (!d.title) return { _status: 400, ok: false, error: 'data.title required' };
            var spportalPayload = {
                title:     d.title,
                sys_scope: appScopeSysId()
            };
            if (d.url_suffix     !== undefined) spportalPayload.url_suffix         = d.url_suffix;
            if (d.theme          !== undefined) spportalPayload.theme              = d.theme;
            if (d.homepage       !== undefined) spportalPayload.homepage           = d.homepage;
            if (d.default_page   !== undefined) spportalPayload.homepage           = d.default_page;
            if (d.login_page     !== undefined) spportalPayload.login_page         = d.login_page;
            if (d.knowledge_base !== undefined) spportalPayload.kb_knowledge_base  = d.knowledge_base;
            if (d.css            !== undefined) spportalPayload.css                = d.css;
            return artifactUpsert('sp_portal', 'title=' + d.title, spportalPayload, true);


        case 'user.search':
            var usGr = new GlideRecord('sys_user');
            if (d.query) {
                usGr.addEncodedQuery('user_nameCONTAINS' + d.query + '^ORfirst_nameCONTAINS' + d.query + '^ORlast_nameCONTAINS' + d.query + '^ORemailCONTAINS' + d.query);
            }
            if (d.email)      usGr.addQuery('email',      'CONTAINS',    d.email);
            if (d.first_name) usGr.addQuery('first_name', 'STARTSWITH',  d.first_name);
            if (d.last_name)  usGr.addQuery('last_name',  'STARTSWITH',  d.last_name);
            if (d.department) usGr.addQuery('department.name', 'CONTAINS', d.department);
            if (d.active !== undefined) usGr.addQuery('active', d.active ? 'true' : 'false');
            usGr.setLimit(l);
            usGr.orderBy('user_name');
            usGr.query();
            var usRows = [];
            while (usGr.next()) {
                usRows.push({ sys_id: usGr.getUniqueValue(), user_name: usGr.getValue('user_name'),
                    first_name: usGr.getValue('first_name'), last_name: usGr.getValue('last_name'),
                    email: usGr.getValue('email'), active: usGr.getValue('active'),
                    title: usGr.getValue('title') });
            }
            return { ok: true, count: usRows.length, users: usRows };


        case 'group.search':
            var gsGr = new GlideRecord('sys_user_group');
            if (d.query) gsGr.addEncodedQuery('nameCONTAINS' + d.query + '^ORdescriptionCONTAINS' + d.query);
            if (d.name)  gsGr.addQuery('name', 'CONTAINS', d.name);
            if (d.active !== undefined) gsGr.addQuery('active', d.active ? 'true' : 'false');
            gsGr.setLimit(l);
            gsGr.orderBy('name');
            gsGr.query();
            var gsRows = [];
            while (gsGr.next()) {
                gsRows.push({ sys_id: gsGr.getUniqueValue(), name: gsGr.getValue('name'),
                    description: gsGr.getValue('description'), active: gsGr.getValue('active'),
                    email: gsGr.getValue('email') });
            }
            return { ok: true, count: gsRows.length, groups: gsRows };

        case 'record.exists':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var reGr = buildGr(t, q);
            if (d.sys_id) reGr.addQuery('sys_id', d.sys_id);
            if (ctx.encoded_query) reGr.addEncodedQuery(ctx.encoded_query);
            reGr.setLimit(1);
            reGr.query();
            var reExists = reGr.next();
            return { ok: true, table: t, exists: reExists, sys_id: reExists ? reGr.getUniqueValue() : null };

        case 'record.read_many':
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var rmmIds = d.sys_ids || [];
            if (!rmmIds.length) return { _status: 400, ok: false, error: 'data.sys_ids (array of sys_ids) required' };
            var rmmRows = [];
            if (pf) {
                var rmmQ = platformQuery(t, 'sys_idIN' + rmmIds.join(','), ctx.fields || null, rmmIds.length + 1, '', '', dv, 0);
                if (!rmmQ.ok) return { _status: rmmQ.status || 500, ok: false, error: 'Platform query failed', body: rmmQ.body };
                rmmRows = (rmmQ.body && rmmQ.body.result) ? rmmQ.body.result : [];
                return { ok: true, count: rmmRows.length, records: rmmRows, via: 'platform' };
            }
            var rmmGr = new GlideRecord(t);
            rmmGr.addQuery('sys_id', 'IN', rmmIds.join(','));
            rmmGr.setLimit(rmmIds.length + 1);
            rmmGr.query();
            while (rmmGr.next()) rmmRows.push(grToObj(rmmGr, ctx.fields || null, dv));
            return { ok: true, count: rmmRows.length, records: rmmRows };

        case 'note.add':
            if (!t)        return { _status: 400, ok: false, error: 'table required' };
            if (!d.sys_id) return { _status: 400, ok: false, error: 'data.sys_id required' };
            if (!d.value)  return { _status: 400, ok: false, error: 'data.value (note text) required' };
            var noteGr = new GlideRecord(t);
            if (!noteGr.get(d.sys_id)) return { _status: 404, ok: false, error: 'Record not found' };
            var noteField = (d.type === 'comment') ? 'comments' : 'work_notes';
            noteGr.setValue(noteField, d.value);
            noteGr.setWorkflow(false);
            noteGr.update();
            return { ok: true, table: t, sys_id: d.sys_id, type: d.type || 'work_note', field_used: noteField };


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


        case 'script.run':
            if (!d.script) return { _status: 400, ok: false, error: 'data.script required' };
            try {
                var _srOpId = engineOperationId(d.operation_sys_id);
                if (!_srOpId) return { _status: 500, ok: false, error: 'Engine operation record not found; pass data.operation_sys_id to override' };
                var _srGR = new GlideRecord('sys_ws_operation');
                if (!_srGR.get(_srOpId)) return { _status: 500, ok: false, error: 'Could not load engine operation record' };
                var _srEval = new GlideScopedEvaluator();
                _srEval.putVariable('_result_str', '');
                var _srWrapped = 'var result; try { ' + d.script + ' } catch (_srEx) {} if (typeof result !== "undefined") { _result_str = JSON.stringify(result); }';
                _srGR.setValue('operation_script', _srWrapped);
                _srEval.evaluateScript(_srGR, 'operation_script', null);
                var _srRawStr = _srEval.getVariable('_result_str');
                var _srResultStr = String(_srRawStr === null || _srRawStr === undefined ? '' : _srRawStr);
                if (_srResultStr === '' || _srResultStr === 'null' || _srResultStr === 'undefined') {
                    return { ok: true, result: null };
                }
                try { return { ok: true, result: JSON.parse(_srResultStr) }; }
                catch (_srPe) { return { ok: true, result: _srResultStr }; }
            } catch (_srSe) { return { ok: false, error: String(_srSe) }; }

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
                'ui_policy':       { tbl: 'sys_ui_policy',        field: 'short_description' },
                'widget':          { tbl: 'sp_widget',            field: 'id' },
                'ui_page':         { tbl: 'sys_ui_page',          field: 'name' },
                'sp_page':         { tbl: 'sp_page',              field: 'id' },
                'sp_theme':        { tbl: 'sp_theme',             field: 'name' },
                'sp_portal':       { tbl: 'sp_portal',            field: 'url_suffix' },
                'app_menu':        { tbl: 'sys_app_application',  field: 'title' },
                'app_module':      { tbl: 'sys_app_module',       field: 'title' },
                'catalog_item':    { tbl: 'sc_cat_item',          field: 'name' },
                'event_registry':  { tbl: 'sysevent_register',    field: 'event_name' },
                'report':          { tbl: 'sys_report',           field: 'title' },
                'table':           { tbl: 'sys_db_object',        field: 'name' },
                'role':            { tbl: 'sys_user_role',        field: 'name' },
                'group':           { tbl: 'sys_user_group',       field: 'name' },
                'user':            { tbl: 'sys_user',             field: 'user_name' },
                'update_set':      { tbl: 'sys_update_set',       field: 'name' },
                'acl':             { tbl: 'sys_security_acl',     field: 'name' },
                'catalog_variable':{ tbl: 'item_option_new',      field: 'name' },
                'attachment':      { tbl: 'sys_attachment',       field: 'file_name' },
                'property':        { tbl: 'sys_properties',       field: 'name' }
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


        case 'workflow.start':
            if (!d.flow) return { _status: 400, ok: false, error: 'data.flow (flow sys_name or sys_id) required' };
            var wfPath = '/api/sn_fd/flow/' + encodeURIComponent(d.flow) + '/execute';
            var wfRes = internalRest('POST', wfPath, { inputs: d.inputs || {} }, null, null);
            if (!wfRes.ok) return { ok: false, error: 'Flow trigger failed', status: wfRes.status, body: wfRes.body };
            return { ok: true, flow: d.flow, body: wfRes.body };

        case 'workflow.cancel':
            if (!d.instance_sys_id) return { _status: 400, ok: false, error: 'data.instance_sys_id required' };
            var wcRes = internalRest('DELETE', '/api/sn_fd/flow_instances/' + d.instance_sys_id, null, null, null);
            if (!wcRes.ok) return { ok: false, error: 'Flow cancel failed', status: wcRes.status, body: wcRes.body };
            return { ok: true, cancelled_instance: d.instance_sys_id };


        case 'email.send':
            if (!d.to)      return { _status: 400, ok: false, error: 'data.to required' };
            if (!d.subject) return { _status: 400, ok: false, error: 'data.subject required' };
            var emHtml = d.html || d.body || '';
            var emText = d.text_body || '';
            if (!emHtml && !emText) return { _status: 400, ok: false, error: 'data.body (HTML) or data.text_body (plain) required' };
            try {
                var em = new GlideEmailOutbound();
                em.setTo(d.to);
                em.setSubject(d.subject);
                if (d.from) em.setFrom(d.from);
                if (d.cc)   em.setCc(d.cc);
                if (d.bcc)  em.addAddress('bcc', d.bcc);
                if (emHtml) em.setBody(emHtml);
                if (emText) em.setBodyText(emText);
                em.save();
                return { ok: true, to: d.to, subject: d.subject };
            } catch (emErr) {
                return { ok: false, error: 'Email send failed: ' + String(emErr) };
            }


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
            confirm:           src.confirm            || false,
            include_total:     src.include_total      || false
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
                var bEntry = { op: bCtx.op || '', status: bHttp, result: bRes };
                if (bCtx.label) bEntry.label = bCtx.label;
                bResults.push(bEntry);
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
