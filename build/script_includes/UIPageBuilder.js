var UIPageBuilder = Class.create();
UIPageBuilder.prototype = {
    initialize: function() {
        this.SCOPE = 'x_infte_ops_int';
        this.UI_PAGE_TABLE = 'sys_ui_page';
        this.audit = new AuditService();
    },

    build: function(creationSpec) {
        var spec = this._normaliseSpec(creationSpec);
        var sysIds = [];

        var name = '' + (spec.page_name || spec.name || '');
        if (!name) {
            this.audit.log('ui_page_builder_rejected', { reason: 'missing_page_name' });
            return { sys_ids: [] };
        }

        var gr = new GlideRecord(this.UI_PAGE_TABLE);
        gr.initialize();
        gr.setValue('name', name);
        gr.setValue('description', '' + (spec.description || spec.display_name || ''));
        gr.setValue('category', '' + (spec.category || 'general'));
        gr.setValue('html', '' + (spec.jelly || spec.html || this._defaultJelly()));
        if (spec.client_script) {
            gr.setValue('client_script', '' + spec.client_script);
        }
        if (spec.processing_script) {
            gr.setValue('processing_script', '' + spec.processing_script);
        }
        gr.setValue('direct', spec.direct ? 'true' : 'false');
        gr.setValue('sys_scope', this._scopeSysId());
        var pageSysId = gr.insert();
        if (pageSysId) {
            sysIds.push('' + pageSysId);
        }

        this.audit.log('ui_page_builder_build', {
            page_name: name,
            sys_ids: sysIds
        });
        return { sys_ids: sysIds };
    },

    remove: function(sysIds) {
        var ids = this._asIdArray(sysIds);
        var i;
        for (i = 0; i < ids.length; i++) {
            this._deleteRecord(ids[i]);
        }
        this.audit.log('ui_page_builder_remove', { sys_ids: ids });
        return true;
    },

    _deleteRecord: function(sysId) {
        var gr = new GlideRecord(this.UI_PAGE_TABLE);
        if (gr.get(sysId)) {
            gr.deleteRecord();
            return true;
        }
        return false;
    },

    _defaultJelly: function() {
        return '<?xml version="1.0" encoding="utf-8" ?>\n' +
            '<j:jelly trim="false" xmlns:j="jelly:core" xmlns:g="glide" ' +
            'xmlns:j2="null" xmlns:g2="null">\n' +
            '  <div class="operations-intelligence-ui-page"></div>\n' +
            '</j:jelly>';
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

    type: 'UIPageBuilder'
};
