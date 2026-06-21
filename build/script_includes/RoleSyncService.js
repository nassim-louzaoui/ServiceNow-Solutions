var RoleSyncService = Class.create();
RoleSyncService.prototype = {
    initialize: function() {
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.GROUP_TABLE  = 'x_infte_ops_int_group';
        this.ROLE_MAP = {
            'admin':      'x_infte_ops_int.admin',
            'leadership': 'x_infte_ops_int.leadership',
            'creator':    'x_infte_ops_int.creator',
            'user':       'x_infte_ops_int.user'
        };
        this._roleCache = {};
    },

    syncPersonRoles: function(personSysId) {
        if (!personSysId) { return false; }
        var userSysId = this._getUserForPerson(personSysId);
        if (!userSysId) { return false; }
        var needed = this._getNeededRoles(personSysId);
        var keys = ['admin', 'leadership', 'creator', 'user'];
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
        var grp = new GlideRecord(this.GROUP_TABLE);
        if (!grp.get(groupSysId)) { return; }
        var members = [];
        try { members = JSON.parse('' + grp.getValue('members')); } catch(e) {}
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
        var persons = new GlideRecord(this.PERSON_TABLE);
        persons.addQuery('active', 'true');
        persons.query();
        var count = 0;
        while (persons.next()) {
            this.syncPersonRoles('' + persons.getUniqueValue());
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
        var grp = new GlideRecord(this.GROUP_TABLE);
        grp.addQuery('status', 'active');
        grp.query();
        while (grp.next()) {
            var members = [];
            try { members = JSON.parse('' + grp.getValue('members')); } catch(e) {}
            var i;
            for (i = 0; i < members.length; i++) {
                if ('' + members[i].person_sys_id === '' + personSysId &&
                        members[i].status !== 'inactive') {
                    var role = '' + (members[i].group_role || 'user');
                    if (needed.hasOwnProperty(role)) { needed[role] = true; }
                }
            }
        }
        return needed;
    },

    _getUserForPerson: function(personSysId) {
        var p = new GlideRecord(this.PERSON_TABLE);
        if (!p.get(personSysId)) { return null; }
        var uid = '' + p.getValue('user');
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
        var svcPwd = '' + gs.getProperty('x_infte_ops_int.svc_password');
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
