var PermissionResolver = Class.create();
PermissionResolver.prototype = {
    initialize: function() {
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.GROUP_TABLE = 'x_infte_ops_int_group';
        this.GROUP_MEMBER_TABLE = 'x_infte_ops_int_group_member';
        this.ROLE_ADMIN = 'admin';
        this.ROLE_LEADERSHIP = 'x_infte_ops_int.leadership';
        this.ROLE_CREATOR = 'x_infte_ops_int.creator';
        this.ROLE_USER = 'x_infte_ops_int.user';
    },

    _resolveUserId: function(userSysId) {
        if (userSysId === null || userSysId === undefined || userSysId === '') {
            return gs.getUserID();
        }
        return '' + userSysId;
    },

    getSystemRole: function(userSysId) {
        var uid = this._resolveUserId(userSysId);
        if (gs.getUser().getUserByID(uid) && this._userHasRole(uid, this.ROLE_ADMIN)) {
            return 'admin';
        }
        if (this._userHasRole(uid, this.ROLE_LEADERSHIP)) {
            return 'leadership';
        }
        if (this._userHasRole(uid, this.ROLE_CREATOR)) {
            return 'creator';
        }
        return 'user';
    },

    _userHasRole: function(userSysId, role) {
        var current = gs.getUserID();
        if ('' + userSysId === '' + current) {
            return gs.hasRole(role);
        }
        var gu = gs.getUser().getUserByID(userSysId);
        if (!gu) {
            return false;
        }
        return gu.hasRole(role);
    },

    hasRole: function(userSysId, role) {
        var uid = this._resolveUserId(userSysId);
        return this._userHasRole(uid, role);
    },

    getPersonByUser: function(userSysId) {
        var uid = this._resolveUserId(userSysId);
        var gr = new GlideRecord(this.PERSON_TABLE);
        gr.addQuery('user', uid);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            return '' + gr.getUniqueValue();
        }
        return null;
    },

    getUserGroups: function(userSysId) {
        var groups = [];
        var personSysId = this.getPersonByUser(userSysId);
        if (!personSysId) {
            return groups;
        }
        var gm = new GlideRecord(this.GROUP_MEMBER_TABLE);
        gm.addQuery('member', personSysId);
        gm.addQuery('status', 'active');
        gm.query();
        while (gm.next()) {
            var groupSysId = '' + gm.getValue('group');
            var groupName = '';
            var grp = new GlideRecord(this.GROUP_TABLE);
            if (grp.get(groupSysId)) {
                groupName = '' + grp.getValue('name');
            }
            groups.push({
                group_sys_id: groupSysId,
                group_name: groupName,
                group_role: '' + gm.getValue('group_role')
            });
        }
        return groups;
    },

    getGroupRole: function(userSysId, groupSysId) {
        var personSysId = this.getPersonByUser(userSysId);
        if (!personSysId) {
            return null;
        }
        var gm = new GlideRecord(this.GROUP_MEMBER_TABLE);
        gm.addQuery('member', personSysId);
        gm.addQuery('group', groupSysId);
        gm.addQuery('status', 'active');
        gm.setLimit(1);
        gm.query();
        if (gm.next()) {
            return '' + gm.getValue('group_role');
        }
        return null;
    },

    isMemberOf: function(userSysId, groupSysId) {
        return this.getGroupRole(userSysId, groupSysId) !== null;
    },

    canManageGroup: function(userSysId, groupSysId) {
        var uid = this._resolveUserId(userSysId);
        if (this._userHasRole(uid, this.ROLE_ADMIN)) {
            return true;
        }
        if (!this._userHasRole(uid, this.ROLE_LEADERSHIP)) {
            return false;
        }
        var personSysId = this.getPersonByUser(uid);
        if (!personSysId) {
            return false;
        }
        var grp = new GlideRecord(this.GROUP_TABLE);
        if (!grp.get(groupSysId)) {
            return false;
        }
        return '' + grp.getValue('owner') === '' + personSysId;
    },

    type: 'PermissionResolver'
};
