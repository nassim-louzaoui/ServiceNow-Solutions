(function() {
    data.authorized = false;
    data.entries = [];
    data.filters = { event_key: '', user: '', date_from: '', date_to: '' };
    data.event_keys = [];

    var userSysId = gs.getUserID();
    var pr = new PermissionResolver();
    data.role = pr.getSystemRole(userSysId);

    if (!pr.hasRole(userSysId, 'admin')) {
        data.message = 'The Audit Log Viewer is available to administrators only.';
        return;
    }
    data.authorized = true;

    var AUDIT_SOURCE = 'x_infte_ops_int.audit';
    var SYSLOG_TABLE = 'syslog';
    var ROW_LIMIT = 200;

    if (input && input.filters) {
        data.filters.event_key = input.filters.event_key ? ('' + input.filters.event_key).trim() : '';
        data.filters.user = input.filters.user ? ('' + input.filters.user).trim() : '';
        data.filters.date_from = input.filters.date_from ? ('' + input.filters.date_from).trim() : '';
        data.filters.date_to = input.filters.date_to ? ('' + input.filters.date_to).trim() : '';
    }

    var sl = new GlideRecord(SYSLOG_TABLE);
    sl.addQuery('source', AUDIT_SOURCE);
    if (data.filters.date_from) {
        sl.addQuery('sys_created_on', '>=', data.filters.date_from);
    }
    if (data.filters.date_to) {
        sl.addQuery('sys_created_on', '<=', data.filters.date_to);
    }
    sl.orderByDesc('sys_created_on');
    sl.setLimit(ROW_LIMIT);
    sl.query();

    var keySet = {};
    while (sl.next()) {
        var message = '' + sl.getValue('message');
        var parsed = _parseAuditLine(message);

        if (data.filters.event_key && parsed.event_key.toLowerCase().indexOf(data.filters.event_key.toLowerCase()) === -1) {
            continue;
        }

        var detailsText = parsed.details_pretty;
        if (data.filters.user) {
            var needle = data.filters.user.toLowerCase();
            var hay = (parsed.user_sys_id + ' ' + detailsText).toLowerCase();
            if (hay.indexOf(needle) === -1) {
                continue;
            }
        }

        keySet[parsed.event_key] = true;
        data.entries.push({
            sys_id: '' + sl.getUniqueValue(),
            created_on: '' + sl.getValue('sys_created_on'),
            event_key: parsed.event_key,
            user_sys_id: parsed.user_sys_id,
            user_name: parsed.user_name,
            details_pretty: detailsText
        });
    }

    var keys = [];
    var k;
    for (k in keySet) {
        if (keySet.hasOwnProperty(k)) {
            keys.push(k);
        }
    }
    keys.sort();
    data.event_keys = keys;

    function _parseAuditLine(message) {
        var result = { event_key: '', details_pretty: '', user_sys_id: '', user_name: '' };
        var body = message;
        if (body.indexOf(AUDIT_SOURCE) === 0) {
            body = body.substring(AUDIT_SOURCE.length).replace(/^\s+/, '');
        }
        var spaceIdx = body.indexOf(' ');
        if (spaceIdx === -1) {
            result.event_key = body;
            return result;
        }
        result.event_key = body.substring(0, spaceIdx);
        var payloadText = body.substring(spaceIdx + 1);
        var obj = null;
        try {
            obj = JSON.parse(payloadText);
        } catch (e) {
            obj = null;
        }
        if (obj && typeof obj === 'object') {
            result.user_sys_id = _firstNonEmpty(obj.user_sys_id, obj.triggered_by, obj.initiated_by, obj.cleared_by);
            result.user_name = _resolveUserName(result.user_sys_id);
            var pretty = [];
            var p;
            for (p in obj) {
                if (obj.hasOwnProperty(p)) {
                    pretty.push(p + ': ' + _stringify(obj[p]));
                }
            }
            result.details_pretty = pretty.join('  |  ');
        } else {
            result.details_pretty = payloadText;
        }
        return result;
    }

    function _firstNonEmpty() {
        var i;
        for (i = 0; i < arguments.length; i++) {
            if (arguments[i] !== null && arguments[i] !== undefined && ('' + arguments[i]) !== '') {
                return '' + arguments[i];
            }
        }
        return '';
    }

    function _stringify(value) {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch (e) {
                return '' + value;
            }
        }
        return '' + value;
    }

    function _resolveUserName(sysId) {
        if (!sysId) {
            return '';
        }
        var su = new GlideRecord('sys_user');
        if (su.get(sysId)) {
            return '' + su.getDisplayValue('name');
        }
        return '';
    }
})();
