(function() {
    data.branding = 'Operations Intelligence';
    data.accessDenied = false;

    var userSysId = gs.getUserID();

    var OI_ROLES = [
        'x_infte_ops_int.user',
        'x_infte_ops_int.creator',
        'x_infte_ops_int.leadership'
    ];
    var hasOiRole = false;
    var r;
    for (r = 0; r < OI_ROLES.length; r++) {
        if (gs.hasRole(OI_ROLES[r])) {
            hasOiRole = true;
            break;
        }
    }

    if (!hasOiRole) {
        data.accessDenied = true;
        data.userName = '';
        data.userInitials = '';
        data.role = '';
        data.groups = [];
        data.sections = [];
        data.defaultSection = '';
        return;
    }

    var pr = new PermissionResolver();
    data.role = pr.getSystemRole(userSysId);
    data.groups = pr.getUserGroups(userSysId);

    var su = new GlideRecord('sys_user');
    if (su.get(userSysId)) {
        data.userName = '' + su.getDisplayValue('name');
        data.userInitials = _initials('' + su.getDisplayValue('name'));
    } else {
        data.userName = '';
        data.userInitials = '';
    }

    var sections = [
        { id: 'workspace',  label: 'Workspace',   roles: ['user', 'creator', 'leadership', 'admin'] },
        { id: 'activity',   label: 'My Activity',  roles: ['user', 'creator', 'leadership', 'admin'] },
        { id: 'studio',     label: 'Studio',       roles: ['creator'] },
        { id: 'governance', label: 'Governance',   roles: ['leadership'] },
        { id: 'command',    label: 'Command',      roles: ['admin'] }
    ];

    var mm = new MaintenanceManager();

    data.sections = [];
    var i;
    for (i = 0; i < sections.length; i++) {
        var sec = sections[i];
        if (_roleCanSee(data.role, sec.roles)) {
            data.sections.push({
                id: sec.id,
                label: sec.label,
                in_maintenance: mm.isInMaintenance(sec.id)
            });
        }
    }

    data.defaultSection = data.sections.length > 0 ? data.sections[0].id : 'workspace';

    function _roleCanSee(role, allowedRoles) {
        var j;
        for (j = 0; j < allowedRoles.length; j++) {
            if (allowedRoles[j] === role) {
                return true;
            }
        }
        return false;
    }

    function _initials(fullName) {
        if (!fullName) {
            return '';
        }
        var parts = fullName.split(' ');
        var result = '';
        var k;
        for (k = 0; k < parts.length && result.length < 2; k++) {
            if (parts[k].length > 0) {
                result += parts[k].charAt(0).toUpperCase();
            }
        }
        return result;
    }
})();
