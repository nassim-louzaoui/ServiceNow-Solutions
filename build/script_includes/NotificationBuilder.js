var NotificationBuilder = Class.create();
NotificationBuilder.prototype = {
    initialize: function() {
        this.SCOPE = 'x_infte_ops_int';
        this.EMAIL_ACTION_TABLE = 'sysevent_email_action';
        this.SYS_REPORT_TABLE = 'sys_report';
        this.SYSAUTO_REPORT_TABLE = 'sysauto_report';
        this.audit = new AuditService();
    },

    buildNotificationRule: function(creationSpec) {
        var spec = this._normaliseSpec(creationSpec);
        var sysIds = [];

        var gr = new GlideRecord(this.EMAIL_ACTION_TABLE);
        gr.initialize();
        gr.setValue('name', '' + (spec.name || spec.display_name || 'Operations Intelligence Notification'));
        gr.setValue('collection', '' + (spec.table || 'incident'));
        gr.setValue('action_insert', spec.fire_on_insert ? 'true' : 'false');
        gr.setValue('action_update', spec.fire_on_update ? 'true' : 'false');
        if (spec.condition) {
            gr.setValue('condition', '' + spec.condition);
        }
        if (spec.advanced_condition) {
            gr.setValue('advanced_condition', '' + spec.advanced_condition);
        }
        gr.setValue('subject', '' + (spec.subject || ''));
        gr.setValue('message', '' + (spec.body || spec.message || ''));
        if (spec.recipient_users) {
            gr.setValue('recipient_users', '' + spec.recipient_users);
        }
        if (spec.recipient_fields) {
            gr.setValue('recipient_fields', '' + spec.recipient_fields);
        }
        gr.setValue('active', 'true');
        gr.setValue('sys_scope', this._scopeSysId());
        var ruleSysId = gr.insert();
        if (ruleSysId) {
            sysIds.push('' + ruleSysId);
        }

        this.audit.log('notification_builder_rule', { sys_ids: sysIds });
        return { sys_ids: sysIds };
    },

    buildScheduledDataJob: function(creationSpec) {
        var spec = this._normaliseSpec(creationSpec);
        var sysIds = [];

        var report = new GlideRecord(this.SYS_REPORT_TABLE);
        report.initialize();
        report.setValue('title', '' + (spec.report_title || spec.display_name || 'Operations Intelligence Scheduled Report'));
        report.setValue('table', '' + (spec.table || 'incident'));
        report.setValue('type', '' + (spec.report_type || 'list'));
        if (spec.field_list) {
            report.setValue('field_list', '' + spec.field_list);
        }
        if (spec.filter_conditions) {
            report.setValue('filter', '' + spec.filter_conditions);
        }
        report.setValue('sys_scope', this._scopeSysId());
        var reportSysId = report.insert();
        if (reportSysId) {
            sysIds.push('' + reportSysId);
        }

        if (reportSysId) {
            var sched = new GlideRecord(this.SYSAUTO_REPORT_TABLE);
            sched.initialize();
            sched.setValue('name', '' + (spec.job_name || spec.display_name || 'Operations Intelligence Scheduled Data Job'));
            sched.setValue('report', '' + reportSysId);
            sched.setValue('run_type', '' + (spec.run_type || 'daily'));
            if (spec.run_time) {
                sched.setValue('run_time', '' + spec.run_time);
            }
            if (spec.run_dayofweek) {
                sched.setValue('run_dayofweek', '' + spec.run_dayofweek);
            }
            if (spec.run_dayofmonth) {
                sched.setValue('run_dayofmonth', '' + spec.run_dayofmonth);
            }
            if (spec.recipient_users) {
                sched.setValue('email_to', '' + spec.recipient_users);
            }
            sched.setValue('active', 'true');
            sched.setValue('sys_scope', this._scopeSysId());
            var schedSysId = sched.insert();
            if (schedSysId) {
                sysIds.push('' + schedSysId);
            }
        }

        this.audit.log('notification_builder_scheduled_job', { sys_ids: sysIds });
        return { sys_ids: sysIds };
    },

    deactivate: function(sysIds) {
        var ids = this._asIdArray(sysIds);
        var i;
        for (i = 0; i < ids.length; i++) {
            this._setActive(this.EMAIL_ACTION_TABLE, ids[i], false);
            this._setActive(this.SYSAUTO_REPORT_TABLE, ids[i], false);
        }
        return true;
    },

    remove: function(sysIds) {
        var ids = this._asIdArray(sysIds);
        var i;
        for (i = 0; i < ids.length; i++) {
            this._deleteRecord(this.SYSAUTO_REPORT_TABLE, ids[i]);
            this._deleteRecord(this.EMAIL_ACTION_TABLE, ids[i]);
            this._deleteRecord(this.SYS_REPORT_TABLE, ids[i]);
        }
        this.audit.log('notification_builder_remove', { sys_ids: ids });
        return true;
    },

    _setActive: function(tableName, sysId, isActive) {
        var gr = new GlideRecord(tableName);
        if (gr.get(sysId)) {
            if (gr.isValidField('active')) {
                gr.setValue('active', isActive ? 'true' : 'false');
                gr.update();
            }
            return true;
        }
        return false;
    },

    _deleteRecord: function(tableName, sysId) {
        var gr = new GlideRecord(tableName);
        if (gr.get(sysId)) {
            gr.deleteRecord();
            return true;
        }
        return false;
    },

    _scopeSysId: function() {
        var scope = new GlideRecord('sys_scope');
        scope.addQuery('scope', this.SCOPE);
        scope.setLimit(1);
        scope.query();
        if (scope.next()) {
            return '' + scope.getUniqueValue();
        }
        return '';
    },

    _normaliseSpec: function(creationSpec) {
        if (creationSpec === null || creationSpec === undefined) {
            return {};
        }
        if (typeof creationSpec === 'string') {
            try {
                return JSON.parse(creationSpec);
            } catch (e) {
                return {};
            }
        }
        return creationSpec;
    },

    _asIdArray: function(sysIds) {
        if (!sysIds) {
            return [];
        }
        if (typeof sysIds === 'string') {
            try {
                var parsed = JSON.parse(sysIds);
                if (parsed && parsed.length !== undefined) {
                    return parsed;
                }
            } catch (e) {}
            return [sysIds];
        }
        if (sysIds.length !== undefined) {
            return sysIds;
        }
        return [];
    },

    type: 'NotificationBuilder'
};
