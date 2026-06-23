var RoleSyncService = Class.create();
RoleSyncService.prototype = {
    initialize: function() {
        this.ROLE_MAP = {
            'admin':      'x_infte_ops_int.admin',
            'leadership': 'x_infte_ops_int.leadership',
            'creator':    'x_infte_ops_int.creator',
            'user':       'x_infte_ops_int.user'
        };
        this._roleCache = {};
        this._store     = new OIDataStore();
    },

    syncPersonRoles: function(personSysId) {
        if (!personSysId) { return false; }
        var userSysId = this._getUserForPerson(personSysId);
        if (!userSysId) { return false; }
        var needed = this._getNeededRoles(personSysId);
        var keys   = ['admin', 'leadership', 'creator', 'user'];
        var i;
        for (i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (needed[k]) {
                this._grantRole(userSysId, this.ROLE_MAP[k]);
            } else {
                this._revokeRole(userSysId, this.ROLE_MAP[k]);
            }
        }
        return true;
    },

    syncGroupMembers: function(groupSysId) {
        if (!groupSysId) { return; }
        var grp = this._store.get('groups', groupSysId);
        if (!grp) { return; }
        var members   = grp.members || [];
        var processed = {};
        var i;
        for (i = 0; i < members.length; i++) {
            var pid = '' + members[i].person_sys_id;
            if (pid && !processed[pid]) {
                processed[pid] = true;
                this.syncPersonRoles(pid);
            }
        }
    },

    syncAllRoles: function() {
        var persons = this._store.find('persons', function(p) {
            return p.active !== false && p.active !== 'false';
        });
        var count = 0;
        var i;
        for (i = 0; i < persons.length; i++) {
            this.syncPersonRoles('' + persons[i].sys_id);
            count++;
        }
        return count;
    },

    revokeAllOiRoles: function(userSysId) {
        if (!userSysId) { return; }
        var keys = ['admin', 'leadership', 'creator', 'user'];
        var i;
        for (i = 0; i < keys.length; i++) {
            this._revokeRole(userSysId, this.ROLE_MAP[keys[i]]);
        }
    },

    _getNeededRoles: function(personSysId) {
        var needed = { admin: false, leadership: false, creator: false, user: false };
        var pid    = '' + personSysId;
        var groups = this._store.find('groups', function(g) {
            return g.status === 'active';
        });
        var i, j, members, role;
        for (i = 0; i < groups.length; i++) {
            members = groups[i].members || [];
            for (j = 0; j < members.length; j++) {
                if ('' + members[j].person_sys_id === pid && members[j].status !== 'inactive') {
                    role = '' + (members[j].group_role || 'user');
                    if (needed.hasOwnProperty(role)) { needed[role] = true; }
                }
            }
        }
        return needed;
    },

    _getUserForPerson: function(personSysId) {
        var person = this._store.get('persons', personSysId);
        if (!person) { return null; }
        var uid = '' + (person.user_sys_id || '');
        return uid || null;
    },

    _getRoleSysId: function(roleName) {
        if (this._roleCache[roleName]) { return this._roleCache[roleName]; }
        var roleGr = new GlideRecord('sys_user_role');
        roleGr.addQuery('name', roleName);
        roleGr.setLimit(1);
        roleGr.query();
        if (!roleGr.next()) { return null; }
        var sid = '' + roleGr.getUniqueValue();
        this._roleCache[roleName] = sid;
        return sid;
    },

    _grantRole: function(userSysId, roleName) {
        var roleSysId = this._getRoleSysId(roleName);
        if (!roleSysId) { return false; }
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

    _revokeRole: function(userSysId, roleName) {
        var roleSysId = this._getRoleSysId(roleName);
        if (!roleSysId) { return false; }
        var existing = new GlideRecord('sys_user_has_role');
        existing.addQuery('user', userSysId);
        existing.addQuery('role', roleSysId);
        existing.query();
        var sysIds = [];
        while (existing.next()) {
            sysIds.push('' + existing.getUniqueValue());
        }
        if (sysIds.length === 0) { return false; }
        var baseUri = '' + gs.getProperty('glide.servlet.uri');
        var svcPwd  = '' + gs.getProperty('x_infte_ops_int.svc_password');
        var svcUser = 'svc_operations_intelligence_api';
        var i;
        for (i = 0; i < sysIds.length; i++) {
            var rm = new sn_ws.RESTMessageV2();
            rm.setHttpMethod('DELETE');
            rm.setEndpoint(baseUri + 'api/now/table/sys_user_has_role/' + sysIds[i]);
            rm.setBasicAuth(svcUser, svcPwd);
            rm.execute();
        }
        return true;
    },

    type: 'RoleSyncService'
};
