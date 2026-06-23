var GroupManager = Class.create();
GroupManager.prototype = {
    initialize: function() {
        this._store = new OIDataStore();
    },

    createGroup: function(name, description, type, ownerPersonSysId, parentGroupSysId, createdByPersonSysId) {
        if (!name) {
            gs.error('x_infte_ops_int GroupManager.createGroup called without a name');
            return null;
        }
        var n = '' + name;
        var existing = this._store.find('groups', function(g) {
            return g.name === n && g.status !== 'archived';
        });
        if (existing.length > 0) { return '' + existing[0].sys_id; }

        var grp = {
            sys_id:            this._store.generateId(),
            name:              n,
            description:       '' + (description || ''),
            type:              '' + (type || 'custom_group'),
            owner:             '' + (ownerPersonSysId || ''),
            parent_group:      '' + (parentGroupSysId || ''),
            created_by_person: '' + (createdByPersonSysId || ''),
            created_at:        new GlideDateTime().getValue(),
            status:            'active',
            members:           [],
            automations:       []
        };
        this._store.upsert('groups', grp);
        return grp.sys_id;
    },

    addMember: function(groupSysId, personSysId, groupRole, addedByPersonSysId) {
        if (!groupSysId || !personSysId) {
            gs.error('x_infte_ops_int GroupManager.addMember missing group or person');
            return false;
        }
        var grp = this._store.get('groups', groupSysId);
        if (!grp) { return false; }

        var role    = groupRole || 'user';
        var members = grp.members || [];
        var i, found = false;
        for (i = 0; i < members.length; i++) {
            if ('' + members[i].person_sys_id === '' + personSysId) {
                members[i].group_role = role;
                members[i].status     = 'active';
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
        grp.members = members;
        this._store.upsert('groups', grp);
        try { new RoleSyncService().syncPersonRoles(personSysId); } catch(e) {
            gs.warn('x_infte_ops_int GroupManager.addMember role sync: ' + e);
        }
        return true;
    },

    removeMember: function(groupSysId, personSysId) {
        if (!groupSysId || !personSysId) { return false; }
        var grp = this._store.get('groups', groupSysId);
        if (!grp) { return false; }

        var members = grp.members || [];
        var updated = false;
        var i;
        for (i = 0; i < members.length; i++) {
            if ('' + members[i].person_sys_id === '' + personSysId && members[i].status !== 'inactive') {
                members[i].status = 'inactive';
                updated = true;
            }
        }
        if (updated) {
            grp.members = members;
            this._store.upsert('groups', grp);
            try { new RoleSyncService().syncPersonRoles(personSysId); } catch(e) {
                gs.warn('x_infte_ops_int GroupManager.removeMember role sync: ' + e);
            }
        }
        return updated;
    },

    getMembers: function(groupSysId) {
        if (!groupSysId) { return []; }
        var grp = this._store.get('groups', groupSysId);
        if (!grp) { return []; }

        var members = grp.members || [];
        var result  = [];
        var i;
        for (i = 0; i < members.length; i++) {
            if (members[i].status === 'inactive') { continue; }
            var personName  = '';
            var personEmail = '';
            var person = this._store.get('persons', '' + members[i].person_sys_id);
            if (person && person.user_sys_id) {
                var uGr = new GlideRecord('sys_user');
                if (uGr.get('' + person.user_sys_id)) {
                    personName  = '' + uGr.getValue('name');
                    personEmail = '' + uGr.getValue('email');
                }
            }
            result.push({
                person_sys_id: '' + members[i].person_sys_id,
                person_name:   personName,
                person_email:  personEmail,
                group_role:    '' + (members[i].group_role || 'user'),
                added_at:      '' + (members[i].added_at || '')
            });
        }
        return result;
    },

    addAutomation: function(groupSysId, automationSysId, addedByPersonSysId) {
        if (!groupSysId || !automationSysId) { return false; }
        var grp = this._store.get('groups', groupSysId);
        if (!grp) { return false; }

        var automations = grp.automations || [];
        var aid = '' + automationSysId;
        var i;
        for (i = 0; i < automations.length; i++) {
            if ('' + automations[i].automation_sys_id === aid) {
                automations[i].approval_status = 'pending';
                grp.automations = automations;
                this._store.upsert('groups', grp);
                return true;
            }
        }
        automations.push({
            automation_sys_id: aid,
            approval_status:   'pending',
            added_by:          '' + (addedByPersonSysId || ''),
            added_at:          new GlideDateTime().getValue(),
            approved_by:       '',
            approved_at:       '',
            rejected_reason:   ''
        });
        grp.automations = automations;
        this._store.upsert('groups', grp);
        return true;
    },

    approveAutomation: function(groupSysId, automationSysId, approvedByPersonSysId) {
        if (!groupSysId || !automationSysId) { return false; }
        var grp = this._store.get('groups', groupSysId);
        if (!grp) { return false; }

        var automations = grp.automations || [];
        var aid     = '' + automationSysId;
        var updated = false;
        var i;
        for (i = 0; i < automations.length; i++) {
            if ('' + automations[i].automation_sys_id === aid) {
                automations[i].approval_status = 'approved';
                automations[i].approved_by     = '' + (approvedByPersonSysId || '');
                automations[i].approved_at     = new GlideDateTime().getValue();
                updated = true;
                break;
            }
        }
        if (updated) {
            grp.automations = automations;
            this._store.upsert('groups', grp);
        }
        return updated;
    },

    getChildGroups: function(parentGroupSysId) {
        if (!parentGroupSysId) { return []; }
        var pid      = '' + parentGroupSysId;
        var children = this._store.find('groups', function(g) {
            return '' + g.parent_group === pid && g.status !== 'archived';
        });
        var result = [];
        var i;
        for (i = 0; i < children.length; i++) {
            result.push({
                group_sys_id: '' + children[i].sys_id,
                name:         '' + children[i].name,
                type:         '' + children[i].type,
                status:       '' + children[i].status
            });
        }
        return result;
    },

    archiveGroup: function(groupSysId) {
        if (!groupSysId) { return false; }
        var grp = this._store.get('groups', groupSysId);
        if (!grp) { return false; }
        grp.status = 'archived';
        this._store.upsert('groups', grp);
        return true;
    },

    getLeadershipGroupFor: function(leaderPersonSysId) {
        if (!leaderPersonSysId) { return null; }
        var lpid  = '' + leaderPersonSysId;
        var found = this._store.find('groups', function(g) {
            return '' + g.owner === lpid && g.type === 'leadership_group' && g.status === 'active';
        });
        if (found.length > 0) { return '' + found[0].sys_id; }
        return null;
    },

    type: 'GroupManager'
};
