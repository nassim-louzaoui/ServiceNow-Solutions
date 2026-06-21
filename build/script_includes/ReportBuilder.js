var ReportBuilder = Class.create();
ReportBuilder.prototype = {
    initialize: function() {
        this.SCOPE = 'x_infte_ops_int';
        this.SYS_REPORT_TABLE = 'sys_report';
        this.PA_DASHBOARD_TABLE = 'pa_dashboards';
        this.audit = new AuditService();
    },

    build: function(creationSpec) {
        var spec = this._normaliseSpec(creationSpec);
        var sysIds = [];

        var reportSysId = this._createReport(spec);
        if (reportSysId) {
            sysIds.push(reportSysId);
        }

        if (('' + (spec.deliverable_type || spec.artifact_type)) === 'pa_dashboard') {
            var dashboardSysId = this._createDashboard(spec, reportSysId);
            if (dashboardSysId) {
                sysIds.push(dashboardSysId);
            }
        }

        this.audit.log('report_builder_build', {
            deliverable_type: '' + (spec.deliverable_type || spec.artifact_type || 'report'),
            sys_ids: sysIds
        });
        return { sys_ids: sysIds };
    },

    _createReport: function(spec) {
        var gr = new GlideRecord(this.SYS_REPORT_TABLE);
        gr.initialize();
        gr.setValue('title', '' + (spec.title || spec.display_name || 'Operations Intelligence Report'));
        gr.setValue('table', '' + (spec.table || 'incident'));
        gr.setValue('field', '' + (spec.group_by_field || spec.field || ''));
        gr.setValue('type', '' + (spec.chart_type || spec.type || 'list'));
        if (spec.aggregate) {
            gr.setValue('aggregate', '' + spec.aggregate);
        }
        if (spec.filter_conditions) {
            gr.setValue('filter', '' + spec.filter_conditions);
        }
        if (spec.is_real_time !== undefined) {
            gr.setValue('is_real_time', spec.is_real_time ? 'true' : 'false');
        }
        gr.setValue('sys_scope', this._scopeSysId());
        gr.setValue('roles', '');
        var sysId = gr.insert();
        return sysId ? '' + sysId : null;
    },

    _createDashboard: function(spec, reportSysId) {
        var gr = new GlideRecord(this.PA_DASHBOARD_TABLE);
        gr.initialize();
        gr.setValue('name', '' + (spec.dashboard_name || spec.display_name || 'Operations Intelligence Dashboard'));
        gr.setValue('description', '' + (spec.description || ''));
        if (spec.tabs) {
            try {
                gr.setValue('tabs', (typeof spec.tabs === 'string') ? spec.tabs : JSON.stringify(spec.tabs));
            } catch (e) {}
        }
        gr.setValue('active', 'true');
        gr.setValue('sys_scope', this._scopeSysId());
        var sysId = gr.insert();
        return sysId ? '' + sysId : null;
    },

    deactivate: function(sysIds) {
        var ids = this._asIdArray(sysIds);
        var i;
        for (i = 0; i < ids.length; i++) {
            this._setActive(this.PA_DASHBOARD_TABLE, ids[i], false);
            this._setActive(this.SYS_REPORT_TABLE, ids[i], false);
        }
        return true;
    },

    remove: function(sysIds) {
        var ids = this._asIdArray(sysIds);
        var i;
        for (i = 0; i < ids.length; i++) {
            this._deleteRecord(this.PA_DASHBOARD_TABLE, ids[i]);
            this._deleteRecord(this.SYS_REPORT_TABLE, ids[i]);
        }
        this.audit.log('report_builder_remove', { sys_ids: ids });
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

    type: 'ReportBuilder'
};
