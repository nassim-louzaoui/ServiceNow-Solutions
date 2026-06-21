var GroupManager = Class.create();
GroupManager.prototype = {
    initialize: function() {
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.GROUP_TABLE = 'x_infte_ops_int_group';
        this.GROUP_MEMBER_TABLE = 'x_infte_ops_int_group_member';
        this.ROLE_CREATOR = 'x_infte_ops_int.creator';
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
        if (description) {
            gr.setValue('description', description);
        }
        gr.setValue('type', type || 'custom_group');
        if (ownerPersonSysId) {
            gr.setValue('owner', ownerPersonSysId);
        }
        if (parentGroupSysId) {
            gr.setValue('parent_group', parentGroupSysId);
        }
        if (createdByPersonSysId) {
            gr.setValue('created_by_person', createdByPersonSysId);
        }
        gr.setValue('created_at', new GlideDateTime().getValue());
        gr.setValue('status', 'active');
        var sysId = gr.insert();
        if (sysId) {
            gs.info('x_infte_ops_int GroupManager created group ' + name + ' (' + sysId + ')');
        }
        return sysId ? '' + sysId : null;
    },

    addMember: function(groupSysId, personSysId, groupRole, addedByPersonSysId) {
        if (!groupSysId || !personSysId) {
            gs.error('x_infte_ops_int GroupManager.addMember missing group or person');
            return null;
        }
        var role = groupRole || 'user';

        var existing = new GlideRecord(this.GROUP_MEMBER_TABLE);
        existing.addQuery('group', groupSysId);
        existing.addQuery('member', personSysId);
        existing.addQuery('status', 'active');
        existing.setLimit(1);
        existing.query();
        var memberSysId;
        if (existing.next()) {
            memberSysId = '' + existing.getUniqueValue();
            if (existing.getValue('group_role') !== role) {
                existing.setValue('group_role', role);
                existing.update();
            }
        } else {
            var gm = new GlideRecord(this.GROUP_MEMBER_TABLE);
            gm.initialize();
            gm.setValue('group', groupSysId);
            gm.setValue('member', personSysId);
            gm.setValue('group_role', role);
            if (addedByPersonSysId) {
                gm.setValue('added_by', addedByPersonSysId);
            }
            gm.setValue('added_at', new GlideDateTime().getValue());
            gm.setValue('status', 'active');
            memberSysId = gm.insert();
            memberSysId = memberSysId ? '' + memberSysId : null;
        }

        if (role === 'creator') {
            this._ensureCreatorSystemRole(personSysId);
        }
        return memberSysId;
    },

    _ensureCreatorSystemRole: function(personSysId) {
        var person = new GlideRecord(this.PERSON_TABLE);
        if (!person.get(personSysId)) {
            return false;
        }
        var userSysId = '' + person.getValue('user');
        if (!userSysId) {
            return false;
        }
        var roleGr = new GlideRecord('sys_user_role');
        roleGr.addQuery('name', this.ROLE_CREATOR);
        roleGr.setLimit(1);
        roleGr.query();
        if (!roleGr.next()) {
            gs.error('x_infte_ops_int GroupManager could not find role ' + this.ROLE_CREATOR);
            return false;
        }
        var roleSysId = '' + roleGr.getUniqueValue();

        var existing = new GlideRecord('sys_user_has_role');
        existing.addQuery('user', userSysId);
        existing.addQuery('role', roleSysId);
        existing.setLimit(1);
        existing.query();
        if (existing.next()) {
            return true;
        }
        var has = new GlideRecord('sys_user_has_role');
        has.initialize();
        has.setValue('user', userSysId);
        has.setValue('role', roleSysId);
        has.insert();
        gs.info('x_infte_ops_int GroupManager granted creator system role to user ' + userSysId);
        return true;
    },

    removeMember: function(groupSysId, personSysId) {
        if (!groupSysId || !personSysId) {
            return false;
        }
        var gm = new GlideRecord(this.GROUP_MEMBER_TABLE);
        gm.addQuery('group', groupSysId);
        gm.addQuery('member', personSysId);
        gm.addQuery('status', 'active');
        gm.query();
        var updated = false;
        while (gm.next()) {
            gm.setValue('status', 'inactive');
            gm.update();
            updated = true;
        }
        return updated;
    },

    getMembers: function(groupSysId) {
        var members = [];
        if (!groupSysId) {
            return members;
        }
        var gm = new GlideRecord(this.GROUP_MEMBER_TABLE);
        gm.addQuery('group', groupSysId);
        gm.addQuery('status', 'active');
        gm.query();
        while (gm.next()) {
            members.push({
                member_record_sys_id: '' + gm.getUniqueValue(),
                person_sys_id: '' + gm.getValue('member'),
                person_name: '' + gm.getDisplayValue('member'),
                group_role: '' + gm.getValue('group_role'),
                added_at: '' + gm.getValue('added_at')
            });
        }
        return members;
    },

    getChildGroups: function(parentGroupSysId) {
        var children = [];
        if (!parentGroupSysId) {
            return children;
        }
        var gr = new GlideRecord(this.GROUP_TABLE);
        gr.addQuery('parent_group', parentGroupSysId);
        gr.addQuery('status', '!=', 'archived');
        gr.query();
        while (gr.next()) {
            children.push({
                group_sys_id: '' + gr.getUniqueValue(),
                name: '' + gr.getValue('name'),
                type: '' + gr.getValue('type'),
                status: '' + gr.getValue('status')
            });
        }
        return children;
    },

    archiveGroup: function(groupSysId) {
        if (!groupSysId) {
            return false;
        }
        var gr = new GlideRecord(this.GROUP_TABLE);
        if (!gr.get(groupSysId)) {
            return false;
        }
        gr.setValue('status', 'archived');
        gr.update();
        gs.info('x_infte_ops_int GroupManager archived group ' + groupSysId);
        return true;
    },

    getLeadershipGroupFor: function(leaderPersonSysId) {
        if (!leaderPersonSysId) {
            return null;
        }
        var gr = new GlideRecord(this.GROUP_TABLE);
        gr.addQuery('owner', leaderPersonSysId);
        gr.addQuery('type', 'leadership_group');
        gr.addQuery('status', 'active');
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            return '' + gr.getUniqueValue();
        }
        return null;
    },

    type: 'GroupManager'
};
