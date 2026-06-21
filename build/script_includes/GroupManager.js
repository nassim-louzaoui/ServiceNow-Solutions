var GroupManager = Class.create();
GroupManager.prototype = {
    initialize: function() {
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.GROUP_TABLE  = 'x_infte_ops_int_group';
        this.ROLE_CREATOR = 'x_infte_ops_int.creator';
    },

    _parseJson: function(raw, fallback) {
        if (!raw) { return fallback; }
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    },

    createGroup: function(name, description, type, ownerPersonSysId, parentGroupSysId, createdByPersonSysId) {
        if (!name) {
            gs.error('x_infte_ops_int GroupManager.createGroup called without a name');
            return null;
        }
        var existing = new GlideRecord(this.GROUP_TABLE);
        existing.addQuery('name', name);
        existing.addQuery('status', '!=', 'archived');
        existing.setLimit(1);
        existing.query();
        if (existing.next()) {
            return '' + existing.getUniqueValue();
        }

        var gr = new GlideRecord(this.GROUP_TABLE);
        gr.initialize();
        gr.setValue('name', name);
        if (description) { gr.setValue('description', description); }
        gr.setValue('type', type || 'custom_group');
        if (ownerPersonSysId) { gr.setValue('owner', ownerPersonSysId); }
        if (parentGroupSysId) { gr.setValue('parent_group', parentGroupSysId); }
        if (createdByPersonSysId) { gr.setValue('created_by_person', createdByPersonSysId); }
        gr.setValue('created_at', new GlideDateTime().getValue());
        gr.setValue('status', 'active');
        gr.setValue('members', '[]');
        gr.setValue('automations', '[]');
        var sysId = gr.insert();
        return sysId ? '' + sysId : null;
    },

    addMember: function(groupSysId, personSysId, groupRole, addedByPersonSysId) {
        if (!groupSysId || !personSysId) {
            gs.error('x_infte_ops_int GroupManager.addMember missing group or person');
            return false;
        }
        var role = groupRole || 'user';
        var gr = new GlideRecord(this.GROUP_TABLE);
        if (!gr.get(groupSysId)) { return false; }

        var members = this._parseJson('' + gr.getValue('members'), []);
        var i;
        var found = false;
        for (i = 0; i < members.length; i++) {
            if ('' + members[i].person_sys_id === '' + personSysId) {
                members[i].group_role = role;
                members[i].status = 'active';
                found = true;
                break;
            }
        }
        if (!found) {
            members.push({
                person_sys_id: '' + personSysId,
                group_role:    role,
                added_by:      '' + (addedByPersonSysId || ''),
                added_at:      new GlideDateTime().getValue(),
                status:        'active'
            });
        }
        gr.setValue('members', JSON.stringify(members));
        gr.update();

        if (role === 'creator') {
            this._ensureCreatorSystemRole(personSysId);
        }
        return true;
    },

    _ensureCreatorSystemRole: function(personSysId) {
        var person = new GlideRecord(this.PERSON_TABLE);
        if (!person.get(personSysId)) { return false; }
        var userSysId = '' + person.getValue('user');
        if (!userSysId) { return false; }

        var roleGr = new GlideRecord('sys_user_role');
        roleGr.addQuery('name', this.ROLE_CREATOR);
        roleGr.setLimit(1);
        roleGr.query();
        if (!roleGr.next()) { return false; }
        var roleSysId = '' + roleGr.getUniqueValue();

        var existing = new GlideRecord('sys_user_has_role');
        existing.addQuery('user', userSysId);
        existing.addQuery('role', roleSysId);
        existing.setLimit(1);
        existing.query();
        if (existing.next()) { return true; }

        var has = new GlideRecord('sys_user_has_role');
        has.initialize();
        has.setValue('user', userSysId);
        has.setValue('role', roleSysId);
        has.insert();
        return true;
    },

    removeMember: function(groupSysId, personSysId) {
        if (!groupSysId || !personSysId) { return false; }
        var gr = new GlideRecord(this.GROUP_TABLE);
        if (!gr.get(groupSysId)) { return false; }

        var members = this._parseJson('' + gr.getValue('members'), []);
        var updated = false;
        var i;
        for (i = 0; i < members.length; i++) {
            if ('' + members[i].person_sys_id === '' + personSysId && members[i].status !== 'inactive') {
                members[i].status = 'inactive';
                updated = true;
            }
        }
        if (updated) {
            gr.setValue('members', JSON.stringify(members));
            gr.update();
        }
        return updated;
    },

    getMembers: function(groupSysId) {
        if (!groupSysId) { return []; }
        var gr = new GlideRecord(this.GROUP_TABLE);
        if (!gr.get(groupSysId)) { return []; }

        var members = this._parseJson('' + gr.getValue('members'), []);
        var result = [];
        var i;
        for (i = 0; i < members.length; i++) {
            if (members[i].status !== 'inactive') {
                var personName = '';
                var pGr = new GlideRecord(this.PERSON_TABLE);
                if (pGr.get(members[i].person_sys_id)) {
                    personName = '' + pGr.getDisplayValue('user');
                }
                result.push({
                    person_sys_id: '' + members[i].person_sys_id,
                    person_name:   personName,
                    group_role:    '' + (members[i].group_role || 'user'),
                    added_at:      '' + (members[i].added_at || '')
                });
            }
        }
        return result;
    },

    addAutomation: function(groupSysId, automationSysId, addedByPersonSysId) {
        if (!groupSysId || !automationSysId) { return false; }
        var gr = new GlideRecord(this.GROUP_TABLE);
        if (!gr.get(groupSysId)) { return false; }

        var automations = this._parseJson('' + gr.getValue('automations'), []);
        var i;
        for (i = 0; i < automations.length; i++) {
            if ('' + automations[i].automation_sys_id === '' + automationSysId) {
                automations[i].approval_status = 'pending';
                gr.setValue('automations', JSON.stringify(automations));
                gr.update();
                return true;
            }
        }
        automations.push({
            automation_sys_id: '' + automationSysId,
            approval_status:   'pending',
            added_by:          '' + (addedByPersonSysId || ''),
            added_at:          new GlideDateTime().getValue(),
            approved_by:       '',
            approved_at:       '',
            rejected_reason:   ''
        });
        gr.setValue('automations', JSON.stringify(automations));
        gr.update();
        return true;
    },

    approveAutomation: function(groupSysId, automationSysId, approvedByPersonSysId) {
        if (!groupSysId || !automationSysId) { return false; }
        var gr = new GlideRecord(this.GROUP_TABLE);
        if (!gr.get(groupSysId)) { return false; }

        var automations = this._parseJson('' + gr.getValue('automations'), []);
        var updated = false;
        var i;
        for (i = 0; i < automations.length; i++) {
            if ('' + automations[i].automation_sys_id === '' + automationSysId) {
                automations[i].approval_status = 'approved';
                automations[i].approved_by = '' + (approvedByPersonSysId || '');
                automations[i].approved_at = new GlideDateTime().getValue();
                updated = true;
                break;
            }
        }
        if (updated) {
            gr.setValue('automations', JSON.stringify(automations));
            gr.update();
        }
        return updated;
    },

    getChildGroups: function(parentGroupSysId) {
        var children = [];
        if (!parentGroupSysId) { return children; }
        var gr = new GlideRecord(this.GROUP_TABLE);
        gr.addQuery('parent_group', parentGroupSysId);
        gr.addQuery('status', '!=', 'archived');
        gr.query();
        while (gr.next()) {
            children.push({
                group_sys_id: '' + gr.getUniqueValue(),
                name:   '' + gr.getValue('name'),
                type:   '' + gr.getValue('type'),
                status: '' + gr.getValue('status')
            });
        }
        return children;
    },

    archiveGroup: function(groupSysId) {
        if (!groupSysId) { return false; }
        var gr = new GlideRecord(this.GROUP_TABLE);
        if (!gr.get(groupSysId)) { return false; }
        gr.setValue('status', 'archived');
        gr.update();
        return true;
    },

    getLeadershipGroupFor: function(leaderPersonSysId) {
        if (!leaderPersonSysId) { return null; }
        var gr = new GlideRecord(this.GROUP_TABLE);
        gr.addQuery('owner', leaderPersonSysId);
        gr.addQuery('type', 'leadership_group');
        gr.addQuery('status', 'active');
        gr.setLimit(1);
        gr.query();
        if (gr.next()) { return '' + gr.getUniqueValue(); }
        return null;
    },

    type: 'GroupManager'
};
