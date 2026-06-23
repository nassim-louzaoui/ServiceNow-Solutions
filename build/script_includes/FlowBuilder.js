var FlowBuilder = Class.create();
FlowBuilder.prototype = {
    initialize: function() {
        this.SCOPE = 'x_infte_ops_int';
        this.FLOW_TABLE = 'sys_hub_flow';
        this.DEFAULT_MAX_ACTIONS = 20;
        this.SAFE_ACTIONS = {
            record_create: true,
            record_update: true,
            set_values: true,
            assign: true,
            send_notification: true,
            wait: true
        };
        this.audit = new AuditService();
    },

    build: function(creationSpec, creatorPersonSysId) {
        var spec = this._normaliseSpec(creationSpec);
        var actions = this._asArray(spec.actions);

        var validation = this.validateActions(actions);
        if (!validation.ok) {
            this.audit.log('flow_builder_rejected', {
                creator_person: '' + creatorPersonSysId,
                reason: validation.reason
            });
            return { sys_ids: [], ok: false, reason: validation.reason };
        }

        var sysIds = [];
        var gr = new GlideRecord(this.FLOW_TABLE);
        gr.initialize();
        gr.setValue('name', '' + (spec.name || spec.display_name || 'Operations Intelligence Flow'));
        gr.setValue('description', '' + (spec.description || ''));
        gr.setValue('type', 'flow');
        gr.setValue('run_as', 'user_who_initiates');
        if (creatorPersonSysId) {
            var creatorUserSysId = this._userForPerson(creatorPersonSysId);
            if (creatorUserSysId) {
                gr.setValue('run_as_user', '' + creatorUserSysId);
            }
        }
        if (spec.trigger) {
            try {
                gr.setValue('trigger_type', '' + (spec.trigger.type || ''));
            } catch (e) {}
        }
        if (spec.definition) {
            try {
                gr.setValue('latest_snapshot', (typeof spec.definition === 'string') ? spec.definition : JSON.stringify(spec.definition));
            } catch (e2) {}
        }
        gr.setValue('active', 'true');
        gr.setValue('sys_scope', this._scopeSysId());
        var flowSysId = gr.insert();
        if (flowSysId) {
            sysIds.push('' + flowSysId);
        }

        this.audit.log('flow_builder_build', {
            creator_person: '' + creatorPersonSysId,
            action_count: actions.length,
            sys_ids: sysIds
        });
        return { sys_ids: sysIds, ok: true };
    },

    validateActions: function(actionsArray) {
        var actions = this._asArray(actionsArray);
        var cap = parseInt(gs.getProperty('x_infte_ops_int.max_flow_actions', '' + this.DEFAULT_MAX_ACTIONS), 10);
        if (isNaN(cap) || cap <= 0) {
            cap = this.DEFAULT_MAX_ACTIONS;
        }
        if (actions.length > cap) {
            return { ok: false, reason: 'action_count_exceeds_cap_' + cap };
        }
        var i;
        for (i = 0; i < actions.length; i++) {
            var action = actions[i];
            var actionType = '' + ((action && action.action_type) ? action.action_type : action);
            if (!this.SAFE_ACTIONS[actionType]) {
                return { ok: false, reason: 'unsafe_action_type_' + actionType };
            }
        }
        return { ok: true, reason: '' };
    },

    deactivate: function(sysIds) {
        var ids = this._asIdArray(sysIds);
        var i;
        for (i = 0; i < ids.length; i++) {
            this._setActive(ids[i], false);
        }
        return true;
    },

    remove: function(sysIds) {
        var ids = this._asIdArray(sysIds);
        var i;
        for (i = 0; i < ids.length; i++) {
            this._deleteRecord(ids[i]);
        }
        this.audit.log('flow_builder_remove', { sys_ids: ids });
        return true;
    },

    _setActive: function(sysId, isActive) {
        var gr = new GlideRecord(this.FLOW_TABLE);
        if (gr.get(sysId)) {
            gr.setValue('active', isActive ? 'true' : 'false');
            gr.update();
            return true;
        }
        return false;
    },

    _deleteRecord: function(sysId) {
        var gr = new GlideRecord(this.FLOW_TABLE);
        if (gr.get(sysId)) {
            gr.deleteRecord();
            return true;
        }
        return false;
    },

    _userForPerson: function(personSysId) {
        var store  = new OIDataStore();
        var person = store.get('persons', personSysId);
        if (person && person.user_sys_id) {
            return '' + person.user_sys_id;
        }
        return null;
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

    type: 'FlowBuilder'
};
