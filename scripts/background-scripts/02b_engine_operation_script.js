// ============================================================
// OPERATIONS INTELLIGENCE — ENGINE OPERATION SCRIPT v2
// Paste into Studio → Scripted REST → Engine Router resource
// Script field (replace entire content)
// ============================================================
// Resource settings:
//   HTTP Method  : POST   |   Relative Path : /v1
// ============================================================
// PREREQUISITE FOR rest.call:
//   Set x_infte_ops_int.svc_password via property.set before
//   using rest.call. This allows cross-scope platform writes
//   (Script Includes, Business Rules, tables, etc.) by making
//   authenticated calls to the native ServiceNow Table REST API.
// ============================================================
// OPERATIONS:
//   ping              health-check
//   scope.info        instance / user / scope details
//   table.exists      check whether a table exists
//   property.set      write a system property
//   property.get      read a system property
//   property.list     list properties by prefix
//   record.insert     create a record
//   record.update     update records matching query or sys_id
//   record.upsert     insert-or-update
//   record.delete     delete records matching query
//   record.get        fetch one record (by query or data.sys_id)
//   record.query      fetch multiple records
//   record.count      count records matching query
//   record.aggregate  COUNT / SUM / AVG / MIN / MAX queries
//   schema.fields     list all fields for a table
//   script.run        execute arbitrary JS in scope context
//   rest.call         authenticated REST call to this instance
//   event.fire        fire a platform event
//   sys.log           write to system log
//   cache.flush       flush platform caches
//   batch             execute multiple ops in one HTTP call
// ============================================================

(function process(request, response) {
    'use strict';

    // ══════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ══════════════════════════════════════════════════════════
    var K = gs.getProperty('x_infte_ops_int.engine_key', '');
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
    // HELPERS
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
    // with a per-request cache so repeated rows on the same table cost one query.
    var _fieldCache = {};
    function grToObj(gr, fieldsArr, useDisplay) {
        var obj = {};
        var tbl = gr.getTableName();
        var flds = (fieldsArr && fieldsArr.length) ? fieldsArr : null;
        if (!flds) {
            if (!_fieldCache[tbl]) {
                _fieldCache[tbl] = [];
                var dd = new GlideRecord('sys_dictionary');
                dd.addQuery('name', tbl);
                dd.addQuery('element', 'ISNOTEMPTY');
                dd.query();
                while (dd.next()) _fieldCache[tbl].push(dd.getValue('element'));
            }
            flds = _fieldCache[tbl];
        }
        for (var i = 0; i < flds.length; i++) {
            try {
                obj[flds[i]] = useDisplay ? gr.getDisplayValue(flds[i]) : gr.getValue(flds[i]);
            } catch (e) { /* skip unreadable fields */ }
        }
        return obj;
    }

    function instanceBase() {
        var u = gs.getProperty('glide.servlet.uri', '');
        if (!u) {
            var n = gs.getProperty('instance_name', '');
            u = 'https://' + n + '.service-now.com';
        }
        return u.replace(/\/$/, '');
    }

    // Make an internal REST call authenticated as the service account.
    // This runs at the platform level, bypassing the scoped app sandbox,
    // enabling writes to sys_script_include, sys_business_rule, sys_db_object, etc.
    // Requires x_infte_ops_int.svc_password property to be set.
    function internalRest(method, path, payload, qParams, extraHeaders) {
        var pwd = gs.getProperty('x_infte_ops_int.svc_password', '');
        if (!pwd) {
            return { _status: 503, ok: false,
                error: 'x_infte_ops_int.svc_password not set. Call property.set with key=x_infte_ops_int.svc_password first.' };
        }
        var rm;
        try { rm = new sn_ws.RESTMessageV2(); }
        catch (e) { return { _status: 503, ok: false, error: 'REST plugin unavailable: ' + String(e) }; }

        rm.setHttpMethod(method.toUpperCase());

        var url = instanceBase() + path;
        if (qParams && typeof qParams === 'object') {
            var parts = [];
            for (var pk in qParams) {
                if (qParams.hasOwnProperty(pk)) {
                    parts.push(encodeURIComponent(String(pk)) + '=' + encodeURIComponent(String(qParams[pk])));
                }
            }
            if (parts.length) url += (path.indexOf('?') >= 0 ? '&' : '?') + parts.join('&');
        }
        rm.setEndpoint(url);
        rm.setBasicAuth('svc_operations_intelligence_api', pwd);
        rm.setRequestHeader('Accept', 'application/json');
        rm.setRequestHeader('Content-Type', 'application/json');
        if (extraHeaders && typeof extraHeaders === 'object') {
            for (var hk in extraHeaders) {
                if (extraHeaders.hasOwnProperty(hk)) rm.setRequestHeader(hk, String(extraHeaders[hk]));
            }
        }
        var meth = method.toUpperCase();
        if (payload !== null && payload !== undefined && meth !== 'GET' && meth !== 'DELETE') {
            rm.setRequestBody(JSON.stringify(payload));
        }

        var r       = rm.execute();
        var status  = parseInt(r.getStatusCode(), 10) || 0;
        var respBody;
        try { respBody = JSON.parse(r.getBody()); }
        catch (e) { respBody = { raw: r.getBody() }; }

        // _status controls outer HTTP response (always 200 — engine call succeeded).
        // Caller reads .status for the inner REST call's HTTP status.
        return { _status: 200, ok: (status >= 200 && status < 300), status: status, body: respBody };
    }

    // ══════════════════════════════════════════════════════════
    // OP DISPATCHER — called for single ops and each batch item
    // Returns a plain object; _status key (if present) controls
    // the outer HTTP response code and is stripped before sending.
    // ══════════════════════════════════════════════════════════
    function dispatch(ctx) {
        var o  = ctx.op    || '';
        var t  = ctx.table || '';
        var d  = ctx.data  || {};
        var q  = ctx.query || {};
        var l  = parseInt(ctx.limit, 10) || 100;
        var dv = !!ctx.display_values;

        // ── ping ───────────────────────────────────────────────
        if (o === 'ping') {
            return { ok: true, pong: true,
                     scope: gs.getCurrentScopeName(),
                     ts: new GlideDateTime().getDisplayValue() };
        }

        // ── scope.info ─────────────────────────────────────────
        if (o === 'scope.info') {
            return { ok: true,
                     scope:    gs.getCurrentScopeName(),
                     user:     gs.getUserName(),
                     is_admin: gs.hasRole('admin'),
                     instance: gs.getProperty('instance_name', 'unknown'),
                     base_url: instanceBase() };
        }

        // ── table.exists ───────────────────────────────────────
        if (o === 'table.exists') {
            var chk = new GlideRecord('sys_db_object');
            chk.addQuery('name', t);
            chk.setLimit(1);
            chk.query();
            return { ok: true, exists: !!chk.next() };
        }

        // ── property.set ───────────────────────────────────────
        if (o === 'property.set') {
            var pKey = d.key || '';
            if (!pKey) return { _status: 400, ok: false, error: 'data.key required' };
            gs.setProperty(pKey, d.value !== undefined ? String(d.value) : '', d.description || '');
            return { ok: true, key: pKey };
        }

        // ── property.get ───────────────────────────────────────
        if (o === 'property.get') {
            var gKey = d.key || '';
            if (!gKey) return { _status: 400, ok: false, error: 'data.key required' };
            return { ok: true, key: gKey, value: gs.getProperty(gKey, null) };
        }

        // ── property.list ──────────────────────────────────────
        if (o === 'property.list') {
            var prefix = d.prefix || '';
            var plGr = new GlideRecord('sys_properties');
            if (prefix) plGr.addQuery('name', 'STARTSWITH', prefix);
            plGr.setLimit(l);
            plGr.query();
            var props = [];
            while (plGr.next()) {
                props.push({ key:         plGr.getValue('name'),
                             value:       plGr.getValue('value'),
                             description: plGr.getValue('description') });
            }
            return { ok: true, count: props.length, properties: props };
        }

        // ── record.insert ──────────────────────────────────────
        if (o === 'record.insert') {
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var ins = new GlideRecord(t);
            ins.initialize();
            for (var fi in d) {
                if (!d.hasOwnProperty(fi)) continue;
                try {
                    if (ctx.use_display_value && ctx.use_display_value[fi]) {
                        ins[fi].setDisplayValue(d[fi]);
                    } else {
                        ins.setValue(fi, d[fi]);
                    }
                } catch (e) { /* skip unwritable */ }
            }
            if (ctx.bypass_rules) { ins.setWorkflow(false); ins.autoSysFields(false); }
            var newId = ins.insert();
            if (newId) return { ok: true, sys_id: String(newId) };
            return { _status: 500, ok: false, error: 'Insert failed',
                     last_error: ins.getLastErrorMessage ? String(ins.getLastErrorMessage()) : 'n/a' };
        }

        // ── record.update ──────────────────────────────────────
        if (o === 'record.update') {
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            if (d.sys_id) {
                var updById = new GlideRecord(t);
                if (!updById.get(d.sys_id)) return { _status: 404, ok: false, error: 'Record not found' };
                for (var ufId in d) {
                    if (d.hasOwnProperty(ufId) && ufId !== 'sys_id') updById.setValue(ufId, d[ufId]);
                }
                updById.update();
                return { ok: true, updated: 1, sys_id: updById.getUniqueValue() };
            }
            var upd = buildGr(t, q);
            if (ctx.encoded_query) upd.addEncodedQuery(ctx.encoded_query);
            upd.query();
            var updCount = 0;
            while (upd.next()) {
                for (var uf in d) { if (d.hasOwnProperty(uf)) upd.setValue(uf, d[uf]); }
                upd.update();
                updCount++;
            }
            return { ok: true, updated: updCount };
        }

        // ── record.upsert ──────────────────────────────────────
        if (o === 'record.upsert') {
            if (!t) return { _status: 400, ok: false, error: 'table required' };
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
            var upsId = ins2.insert();
            return { ok: true, action: 'inserted', sys_id: String(upsId) };
        }

        // ── record.delete ──────────────────────────────────────
        if (o === 'record.delete') {
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var del = buildGr(t, q);
            if (ctx.encoded_query) del.addEncodedQuery(ctx.encoded_query);
            del.query();
            var delCount = 0;
            while (del.next()) { del.deleteRecord(); delCount++; }
            return { ok: true, deleted: delCount };
        }

        // ── record.get ─────────────────────────────────────────
        if (o === 'record.get') {
            if (!t) return { _status: 400, ok: false, error: 'table required' };
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
        }

        // ── record.query ───────────────────────────────────────
        if (o === 'record.query') {
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var qGr = buildGr(t, q);
            if (ctx.encoded_query) qGr.addEncodedQuery(ctx.encoded_query);
            if (ctx.order_by)      qGr.orderBy(ctx.order_by);
            if (ctx.order_by_desc) qGr.orderByDesc(ctx.order_by_desc);
            qGr.setLimit(l);
            qGr.query();
            var rows = [];
            while (qGr.next()) rows.push(grToObj(qGr, ctx.fields || null, dv));
            return { ok: true, count: rows.length, records: rows };
        }

        // ── record.count ───────────────────────────────────────
        if (o === 'record.count') {
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var cGr = buildGr(t, q);
            if (ctx.encoded_query) cGr.addEncodedQuery(ctx.encoded_query);
            cGr.query();
            return { ok: true, count: cGr.getRowCount() };
        }

        // ── record.aggregate ───────────────────────────────────
        // d.type  : COUNT (default) | SUM | AVG | MIN | MAX
        // d.field : field to aggregate (omit for plain COUNT)
        // ctx.group_by : field to group results by
        if (o === 'record.aggregate') {
            if (!t) return { _status: 400, ok: false, error: 'table required' };
            var agg = new GlideAggregate(t);
            for (var af in q) { if (q.hasOwnProperty(af)) agg.addQuery(af, q[af]); }
            if (ctx.encoded_query) agg.addEncodedQuery(ctx.encoded_query);
            var aggType  = (d.type  || 'COUNT').toUpperCase();
            var aggField = d.field  || '';
            var groupBy  = ctx.group_by || '';
            if (aggField) agg.addAggregate(aggType, aggField);
            else          agg.addAggregate('COUNT');
            if (groupBy)  agg.groupBy(groupBy);
            agg.query();
            var aggRows = [];
            while (agg.next()) {
                var aggRow = {};
                if (groupBy) aggRow[groupBy] = agg.getValue(groupBy);
                aggRow.value = aggField ? agg.getAggregate(aggType, aggField)
                                        : agg.getAggregate('COUNT');
                aggRows.push(aggRow);
            }
            return { ok: true, count: aggRows.length, rows: aggRows };
        }

        // ── schema.fields ──────────────────────────────────────
        if (o === 'schema.fields') {
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
                    read_only:     sfGr.getValue('read_only')
                });
            }
            return { ok: true, table: t, count: sfFields.length, fields: sfFields };
        }

        // ── script.run ─────────────────────────────────────────
        // Execute arbitrary JavaScript in the x_infte_ops_int scope context.
        // Set a 'result' variable inside the script to return a value.
        // Subject to the same sandbox restrictions as the engine itself.
        // For cross-scope writes use rest.call instead.
        if (o === 'script.run') {
            var code = d.script || '';
            if (!code) return { _status: 400, ok: false, error: 'data.script required' };
            var result = undefined;
            var scriptError = null;
            try {
                eval(code); // jshint ignore:line
            } catch (se) {
                scriptError = String(se);
            }
            if (scriptError) return { ok: false, error: scriptError };
            return { ok: true, result: (typeof result !== 'undefined') ? result : null };
        }

        // ── rest.call ──────────────────────────────────────────
        // Make an authenticated REST call to the ServiceNow instance.
        // Runs at platform level — bypasses the scoped app code sandbox.
        // Use this to create/update Script Includes, Business Rules,
        // tables, ACLs, and any other platform artifact.
        //
        // data.method  : GET | POST | PUT | PATCH | DELETE
        // data.path    : /api/now/table/sys_script_include  (etc.)
        // data.body    : request body (serialised automatically)
        // data.params  : { sysparm_fields: 'name,sys_id', ... }
        // data.headers : extra request headers
        if (o === 'rest.call') {
            var rcMethod  = d.method  || 'GET';
            var rcPath    = d.path    || '';
            var rcPayload = (d.body    !== undefined) ? d.body    : null;
            var rcParams  = d.params  || {};
            var rcHeaders = d.headers || {};
            if (!rcPath) return { _status: 400, ok: false, error: 'data.path required' };
            var rcRes = internalRest(rcMethod, rcPath, rcPayload, rcParams, rcHeaders);
            delete rcRes._status;
            return rcRes;
        }

        // ── event.fire ─────────────────────────────────────────
        if (o === 'event.fire') {
            var evName = d.name || '';
            if (!evName) return { _status: 400, ok: false, error: 'data.name required' };
            var evGr = null;
            if (d.table && d.sys_id) {
                evGr = new GlideRecord(d.table);
                evGr.get(d.sys_id);
            }
            gs.eventQueue(evName, evGr, d.param1 || '', d.param2 || '');
            return { ok: true, event: evName };
        }

        // ── sys.log ────────────────────────────────────────────
        if (o === 'sys.log') {
            var logMsg = d.message || '';
            var logSrc = d.source  || 'x_infte_ops_int.engine';
            gs.info(logSrc + ': ' + logMsg);
            return { ok: true };
        }

        // ── cache.flush ────────────────────────────────────────
        if (o === 'cache.flush') {
            gs.flushCache();
            return { ok: true, flushed: true };
        }

        return { _status: 400, ok: false, error: 'Unknown op: ' + o };
    }

    // ══════════════════════════════════════════════════════════
    // MAIN — dispatch single op or batch
    // ══════════════════════════════════════════════════════════
    try {
        var op = body.op || '';

        if (op === 'batch') {
            var bOps        = body.ops || [];
            var stopOnError = (body.stop_on_error !== false);
            var bResults    = [];
            var hadError    = false;

            for (var bi = 0; bi < bOps.length; bi++) {
                var bCtx = bOps[bi];
                if (stopOnError && hadError) {
                    bResults.push({ op: bCtx.op || '', skipped: true, ok: false });
                    continue;
                }
                var bRes = {};
                try { bRes = dispatch(bCtx); }
                catch (be) { bRes = { ok: false, error: String(be) }; }
                if (!bRes.ok) hadError = true;
                var bHttp = bRes._status || 200;
                delete bRes._status;
                bResults.push({ op: bCtx.op || '', status: bHttp, result: bRes });
            }

            response.setStatus(200);
            response.setBody({ ok: !hadError, results: bResults });

        } else {
            var ctx = {
                op:                op,
                table:             body.table              || '',
                data:              body.data               || {},
                query:             body.query              || {},
                limit:             body.limit              || 100,
                fields:            body.fields             || null,
                encoded_query:     body.encoded_query      || '',
                order_by:          body.order_by           || '',
                order_by_desc:     body.order_by_desc      || '',
                display_values:    body.display_values     || false,
                group_by:          body.group_by           || '',
                bypass_rules:      body.bypass_rules       || false,
                use_display_value: body.use_display_value  || null
            };
            var res = dispatch(ctx);
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
