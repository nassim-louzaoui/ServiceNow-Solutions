var AuditService = Class.create();
AuditService.prototype = {
    initialize: function() {
        this.AUDIT_SOURCE = 'x_infte_ops_int.audit';
        this.SYSLOG_TABLE = 'syslog';
    },

    log: function(eventKey, detailsObject) {
        var key = eventKey ? ('' + eventKey) : 'unspecified';
        var payload;
        try {
            payload = (detailsObject === null || detailsObject === undefined) ?
                '{}' : JSON.stringify(detailsObject);
        } catch (e) {
            payload = '{"serialization_error":"' + ('' + e.message).replace(/"/g, "'") + '"}';
        }
        var line = this.AUDIT_SOURCE + ' ' + key + ' ' + payload;
        gs.info(line);
        this._writeSyslog(key, line);
        return true;
    },

    _writeSyslog: function(key, message) {
        try {
            var sl = new GlideRecord(this.SYSLOG_TABLE);
            sl.initialize();
            sl.setValue('source', this.AUDIT_SOURCE);
            sl.setValue('level', '0');
            sl.setValue('message', message);
            sl.insert();
        } catch (e) {
            gs.error(this.AUDIT_SOURCE + ' failed to write syslog record for ' + key +
                ': ' + e.message);
        }
    },

    logAdminAction: function(actionType, tableName, recordSysId, userSysId, notes) {
        var details = {
            action_type: actionType ? ('' + actionType) : '',
            table: tableName ? ('' + tableName) : '',
            record_sys_id: recordSysId ? ('' + recordSysId) : '',
            user_sys_id: userSysId ? ('' + userSysId) : ('' + gs.getUserID()),
            notes: notes ? ('' + notes) : '',
            logged_at: new GlideDateTime().getValue()
        };
        return this.log('admin_action', details);
    },

    getRecent: function(limit) {
        var max = parseInt(limit, 10);
        if (isNaN(max) || max <= 0) {
            max = 20;
        }
        var entries = [];
        var sl = new GlideRecord(this.SYSLOG_TABLE);
        sl.addQuery('source', this.AUDIT_SOURCE);
        sl.orderByDesc('sys_created_on');
        sl.setLimit(max);
        sl.query();
        while (sl.next()) {
            entries.push({
                sys_id: '' + sl.getUniqueValue(),
                created_on: '' + sl.getValue('sys_created_on'),
                source: '' + sl.getValue('source'),
                message: '' + sl.getValue('message')
            });
        }
        return entries;
    },

    type: 'AuditService'
};
