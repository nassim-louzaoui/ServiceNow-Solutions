var TableBuilder = Class.create();
TableBuilder.prototype = {
    initialize: function() {
        this.SCOPE = 'x_infte_ops_int';
        this.SCOPE_PREFIX = 'x_infte_ops_int_';
        this.DB_OBJECT_TABLE = 'sys_db_object';
        this.DICTIONARY_TABLE = 'sys_dictionary';
        this.audit = new AuditService();
    },

    build: function(creationSpec) {
        var spec = this._normaliseSpec(creationSpec);
        var sysIds = [];

        var internalName = this._applyScopePrefix('' + (spec.table_name || spec.name || ''));
        if (!internalName || internalName === this.SCOPE_PREFIX) {
            this.audit.log('table_builder_rejected', { reason: 'missing_table_name' });
            return { sys_ids: [] };
        }

        var label = '' + (spec.label || spec.display_name || 'Operations Intelligence Table');

        var dbo = new GlideRecord(this.DB_OBJECT_TABLE);
        dbo.initialize();
        dbo.setValue('name', internalName);
        dbo.setValue('label', label);
        if (spec.extends_table) {
            dbo.setValue('super_class', '' + spec.extends_table);
        }
        dbo.setValue('sys_scope', this._scopeSysId());
        var tableSysId = dbo.insert();
        if (!tableSysId) {
            this.audit.log('table_builder_rejected', { reason: 'db_object_insert_failed', table: internalName });
            return { sys_ids: [] };
        }
        sysIds.push('' + tableSysId);

        var fields = this._asArray(spec.fields);
        var i;
        for (i = 0; i < fields.length; i++) {
            var fieldSysId = this._createField(internalName, fields[i]);
            if (fieldSysId) {
                sysIds.push('' + fieldSysId);
            }
        }

        this.audit.log('table_builder_build', {
            table: internalName,
            field_count: fields.length,
            sys_ids: sysIds
        });
        return { sys_ids: sysIds };
    },

    _createField: function(tableName, fieldSpec) {
        if (!fieldSpec) {
            return null;
        }
        var elementName = '' + (fieldSpec.element || fieldSpec.name || '');
        if (!elementName) {
            return null;
        }
        var dict = new GlideRecord(this.DICTIONARY_TABLE);
        dict.initialize();
        dict.setValue('name', tableName);
        dict.setValue('element', elementName);
        dict.setValue('column_label', '' + (fieldSpec.label || elementName));
        dict.setValue('internal_type', '' + (fieldSpec.type || 'string'));
        var maxLength = parseInt(fieldSpec.max_length, 10);
        if (!isNaN(maxLength) && maxLength > 0) {
            dict.setValue('max_length', '' + maxLength);
        } else if (('' + (fieldSpec.type || 'string')) === 'string') {
            dict.setValue('max_length', '255');
        }
        dict.setValue('mandatory', fieldSpec.mandatory ? 'true' : 'false');
        if (fieldSpec.reference) {
            dict.setValue('reference', '' + fieldSpec.reference);
        }
        dict.setValue('sys_scope', this._scopeSysId());
        var sysId = dict.insert();
        return sysId ? '' + sysId : null;
    },

    remove: function(sysIds) {
        var ids = this._asIdArray(sysIds);
        var i;
        for (i = 0; i < ids.length; i++) {
            this._deleteRecord(this.DICTIONARY_TABLE, ids[i]);
        }
        for (i = 0; i < ids.length; i++) {
            this._deleteRecord(this.DB_OBJECT_TABLE, ids[i]);
        }
        this.audit.log('table_builder_remove', { sys_ids: ids });
        return true;
    },

    _deleteRecord: function(tableName, sysId) {
        var gr = new GlideRecord(tableName);
        if (gr.get(sysId)) {
            gr.deleteRecord();
            return true;
        }
        return false;
    },

    _applyScopePrefix: function(name) {
        var clean = ('' + name).toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (!clean) {
            return this.SCOPE_PREFIX;
        }
        if (clean.indexOf(this.SCOPE_PREFIX) === 0) {
            return clean;
        }
        if (clean.indexOf('u_') === 0) {
            clean = clean.substring(2);
        }
        return this.SCOPE_PREFIX + clean;
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

    _asArray: function(value) {
        if (value && value.length !== undefined && typeof value !== 'string') {
            return value;
        }
        return [];
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

    type: 'TableBuilder'
};
