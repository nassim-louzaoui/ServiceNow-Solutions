var PermissionResolver = Class.create();
PermissionResolver.prototype = {
    initialize: function() {
        this.ROLE_OI_ADMIN   = 'x_infte_ops_int.admin';
        this.ROLE_DEVELOPER  = 'x_infte_ops_int.developer';
        this.ROLE_LEADERSHIP = 'x_infte_ops_int.leadership';
        this.ROLE_CREATOR    = 'x_infte_ops_int.creator';
        this.ROLE_USER       = 'x_infte_ops_int.user';
    },

    _resolveUserId: function(userSysId) {
        if (userSysId === null || userSysId === undefined || userSysId === '') {
            return gs.getUserID();
        }
        return '' + userSysId;
    },

    getSystemRole: function(userSysId) {
        var uid = this._resolveUserId(userSysId);
        if (this._userHasRole(uid, this.ROLE_OI_ADMIN))   { return 'admin'; }
        if (this._userHasRole(uid, this.ROLE_DEVELOPER))  { return 'developer'; }
        if (this._userHasRole(uid, this.ROLE_LEADERSHIP)) { return 'leadership'; }
        if (this._userHasRole(uid, this.ROLE_CREATOR))    { return 'creator'; }
        return 'user';
    },

    _userHasRole: function(userSysId, role) {
        var current = gs.getUserID();
        if ('' + userSysId === '' + current) {
            return gs.hasRole(role);
        }
        var gu = gs.getUser().getUserByID(userSysId);
        if (!gu) { return false; }
        return gu.hasRole(role);
    },

    hasRole: function(userSysId, role) {
        var uid = this._resolveUserId(userSysId);
        return this._userHasRole(uid, role);
    },

    getPersonByUser: function(userSysId) {
        var uid   = this._resolveUserId(userSysId);
        var store = new OIDataStore();
        var found = store.find('persons', function(p) {
            return ('' + p.user_sys_id) === uid && p.active !== false;
        });
        if (found.length > 0) { return '' + found[0].sys_id; }
        return null;
    },

    getUserGroups: function(userSysId) {
        var groups      = [];
        var personSysId = this.getPersonByUser(userSysId);
        if (!personSysId) { return groups; }

        var store     = new OIDataStore();
        var allGroups = store.find('groups', function(g) { return g.status === 'active'; });
        var i, grp, members, j;
        for (i = 0; i < allGroups.length; i++) {
            grp     = allGroups[i];
            members = grp.members || [];
            for (j = 0; j < members.length; j++) {
                if ('' + members[j].person_sys_id === personSysId && members[j].status !== 'inactive') {
                    groups.push({
                        group_sys_id: '' + grp.sys_id,
                        group_name:   '' + grp.name,
                        group_role:   '' + (members[j].group_role || 'user')
                    });
                    break;
                }
            }
        }
        return groups;
    },

    getGroupRole: function(userSysId, groupSysId) {
        var personSysId = this.getPersonByUser(userSysId);
        if (!personSysId) { return null; }

        var store = new OIDataStore();
        var grp   = store.get('groups', groupSysId);
        if (!grp) { return null; }

        var members = grp.members || [];
        var i;
        for (i = 0; i < members.length; i++) {
            if ('' + members[i].person_sys_id === personSysId && members[i].status !== 'inactive') {
                return '' + (members[i].group_role || 'user');
            }
        }
        return null;
    },

    isMemberOf: function(userSysId, groupSysId) {
        return this.getGroupRole(userSysId, groupSysId) !== null;
    },

    canManageGroup: function(userSysId, groupSysId) {
        var uid = this._resolveUserId(userSysId);
        if (this._userHasRole(uid, this.ROLE_OI_ADMIN)) { return true; }
        if (!this._userHasRole(uid, this.ROLE_LEADERSHIP)) { return false; }
        var personSysId = this.getPersonByUser(uid);
        if (!personSysId) { return false; }

        var store = new OIDataStore();
        var grp   = store.get('groups', groupSysId);
        if (!grp) { return false; }
        return '' + grp.owner === personSysId;
    },

    type: 'PermissionResolver'
};
