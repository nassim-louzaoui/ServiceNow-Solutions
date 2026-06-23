var MaintenanceManager = Class.create();
MaintenanceManager.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    ajaxIsInMaintenance: function() {
        var section = this.getParameter('sysparm_section') || '';
        return '' + this._isInMaintenance(section);
    },

    ajaxGetStatus: function() {
        return JSON.stringify(this._getStatus());
    },

    ajaxSetMaintenance: function() {
        if (!gs.hasRole('admin')) {
            return JSON.stringify({ error: 'Unauthorized — admin role required' });
        }
        var sections = [];
        try { sections = JSON.parse(this.getParameter('sysparm_sections') || '[]'); } catch (e) { sections = []; }
        var message  = this.getParameter('sysparm_message')   || '';
        var returnAt = this.getParameter('sysparm_return_at') || '';
        this._setMaintenance(sections, message, returnAt);
        return JSON.stringify({ success: true, sections: sections });
    },

    ajaxClearMaintenance: function() {
        if (!gs.hasRole('admin')) {
            return JSON.stringify({ error: 'Unauthorized — admin role required' });
        }
        var sections = [];
        try { sections = JSON.parse(this.getParameter('sysparm_sections') || '["all"]'); } catch (e) { sections = ['all']; }
        this._clearMaintenance(sections);
        return JSON.stringify({ success: true });
    },

    ajaxGetExportURL: function() {
        if (!gs.hasRole('admin')) {
            return JSON.stringify({ error: 'Unauthorized — admin role required' });
        }
        var url = this._getExportURL();
        return JSON.stringify({ url: url });
    },

    setMaintenance: function(sections, message, returnAt) {
        this._setMaintenance(sections, message, returnAt);
    },

    clearMaintenance: function(sections) {
        this._clearMaintenance(sections);
    },

    isInMaintenance: function(section) {
        return this._isInMaintenance(section);
    },

    getStatus: function() {
        return this._getStatus();
    },

    getExportURL: function() {
        return this._getExportURL();
    },

    _scope: function() {
        return gs.getCurrentScopeName();
    },

    _getProp: function(suffix, defaultVal) {
        return gs.getProperty(this._scope() + '.' + suffix, defaultVal !== undefined ? defaultVal : '');
    },

    _setProp: function(suffix, value) {
        gs.setProperty(this._scope() + '.' + suffix, value);
    },

    _getActiveSections: function() {
        try {
            return JSON.parse(this._getProp('maintenance_sections', '[]'));
        } catch (e) {
            return [];
        }
    },

    _setMaintenance: function(sections, message, returnAt) {
        var existing = this._getActiveSections();
        var newSections;

        if (sections.indexOf('all') !== -1) {
            newSections = ['all'];
        } else {
            var merged = [];
            var ei;
            for (ei = 0; ei < existing.length; ei++) {
                if (existing[ei] !== 'all') {
                    merged.push(existing[ei]);
                }
            }
            var si;
            for (si = 0; si < sections.length; si++) {
                if (merged.indexOf(sections[si]) === -1) {
                    merged.push(sections[si]);
                }
            }
            newSections = merged;
        }

        var now = new GlideDateTime();
        this._setProp('maintenance_sections',    JSON.stringify(newSections));
        this._setProp('maintenance_message',     message  || '');
        this._setProp('maintenance_return_at',   returnAt || '');
        this._setProp('maintenance_initiated_by', gs.getUserID());
        this._setProp('maintenance_initiated_at', now.getDisplayValue());

        new AuditService().log('maintenance_enabled', {
            sections:     JSON.stringify(newSections),
            message:      message  || '',
            returnAt:     returnAt || '',
            initiated_by: gs.getUserID(),
            initiated_at: now.getDisplayValue()
        });
    },

    _clearMaintenance: function(sections) {
        var clearedBy = gs.getUserID();
        var now       = new GlideDateTime();

        if (sections.indexOf('all') !== -1) {
            this._setProp('maintenance_sections',    '[]');
            this._setProp('maintenance_message',     '');
            this._setProp('maintenance_return_at',   '');
            this._setProp('maintenance_initiated_by', '');
            this._setProp('maintenance_initiated_at', '');
        } else {
            var existing = this._getActiveSections();
            var updated  = [];
            var i;
            for (i = 0; i < existing.length; i++) {
                if (sections.indexOf(existing[i]) === -1) {
                    updated.push(existing[i]);
                }
            }
            this._setProp('maintenance_sections', JSON.stringify(updated));
        }

        new AuditService().log('maintenance_disabled', {
            sections_cleared: JSON.stringify(sections),
            cleared_by:       clearedBy,
            cleared_at:       now.getDisplayValue()
        });
    },

    _isInMaintenance: function(section) {
        var sections = this._getActiveSections();
        return sections.indexOf('all') !== -1 || sections.indexOf(section) !== -1;
    },

    _getStatus: function() {
        return {
            sections:    this._getActiveSections(),
            message:     this._getProp('maintenance_message',     ''),
            returnAt:    this._getProp('maintenance_return_at',   ''),
            initiatedBy: this._getProp('maintenance_initiated_by', ''),
            initiatedAt: this._getProp('maintenance_initiated_at', '')
        };
    },

    _getExportURL: function() {
        var scope = this._scope();
        var audit = new AuditService();
        var now   = new GlideDateTime();

        var gr = new GlideRecord('sys_app');
        gr.addQuery('scope', scope);
        gr.setLimit(1);
        gr.query();

        if (!gr.next()) {
            audit.log('app_export_triggered', {
                error:        'sys_app record not found for scope: ' + scope,
                triggered_by: gs.getUserID(),
                triggered_at: now.getDisplayValue()
            });
            return null;
        }

        var appSysId = gr.getUniqueValue();
        audit.log('app_export_triggered', {
            app_sys_id:   appSysId,
            triggered_by: gs.getUserID(),
            triggered_at: now.getDisplayValue()
        });

        return 'sys_app_export.do?sysparm_record_id=' + appSysId;
    },

    type: 'MaintenanceManager'
});
