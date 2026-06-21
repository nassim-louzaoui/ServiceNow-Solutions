(function() {
    data.error = '';
    data.cards = [];
    data.selected_group = '';
    data.groups = [];

    var TYPE_ICONS = {
        report: 'fa-bar-chart',
        pa_dashboard: 'fa-dashboard',
        notification_rule: 'fa-bell',
        scheduled_data_job: 'fa-calendar',
        flow: 'fa-random',
        custom_table: 'fa-table',
        ui_page: 'fa-window-maximize'
    };

    var TYPE_LABELS = {
        report: 'Report',
        pa_dashboard: 'Dashboard',
        notification_rule: 'Notification Rule',
        scheduled_data_job: 'Scheduled Data Job',
        flow: 'Flow',
        custom_table: 'Custom Table',
        ui_page: 'UI Page'
    };

    var permissions = new PermissionResolver();
    var userSysId = gs.getUserID();
    var personSysId = permissions.getPersonByUser(userSysId);

    if (!personSysId) {
        data.error = 'You are not yet provisioned in Operations Intelligence.';
        return;
    }

    var userGroups = permissions.getUserGroups(userSysId);
    var groupIds = [];
    var creatorGroupIds = {};
    var i;
    for (i = 0; i < userGroups.length; i++) {
        groupIds.push(userGroups[i].group_sys_id);
        data.groups.push({
            sys_id: userGroups[i].group_sys_id,
            name: userGroups[i].group_name,
            role: userGroups[i].group_role
        });
        if (userGroups[i].group_role === 'creator') {
            creatorGroupIds[userGroups[i].group_sys_id] = true;
        }
    }

    if (groupIds.length === 0) {
        data.error = 'You are not a member of any group yet.';
        return;
    }

    var hasSystemCreator = permissions.hasRole(userSysId, 'x_infte_ops_int.creator') ||
        permissions.hasRole(userSysId, 'admin');

    var requestedGroup = '';
    if (input && input.selected_group) {
        requestedGroup = '' + input.selected_group;
    } else if (options && options.selected_group) {
        requestedGroup = '' + options.selected_group;
    }
    if (requestedGroup && groupIds.indexOf(requestedGroup) === -1) {
        requestedGroup = '';
    }
    data.selected_group = requestedGroup;
    var scopedGroupIds = requestedGroup ? [requestedGroup] : groupIds;

    var ma = new GlideRecord('x_infte_ops_int_managed_artifact');
    ma.addQuery('owner_group', 'IN', scopedGroupIds.join(','));
    ma.addQuery('status', 'active');
    ma.orderByDesc('created_at');
    ma.query();

    while (ma.next()) {
        var artifactType = '' + ma.getValue('artifact_type');
        var ownerGroupSysId = '' + ma.getValue('owner_group');
        var artifactSysIds = parseSysIds('' + ma.getValue('artifact_sys_ids'));

        data.cards.push({
            sys_id: '' + ma.getUniqueValue(),
            number: '' + ma.getValue('number'),
            display_name: '' + ma.getValue('display_name'),
            description: '' + ma.getValue('description'),
            artifact_type: artifactType,
            type_label: TYPE_LABELS[artifactType] || artifactType,
            type_icon: TYPE_ICONS[artifactType] || 'fa-file',
            owner_group: '' + ma.getDisplayValue('owner_group'),
            owner_group_sys_id: ownerGroupSysId,
            created_by: '' + ma.getDisplayValue('created_by_person'),
            created_at: '' + ma.getDisplayValue('created_at'),
            status: '' + ma.getValue('status'),
            primary_sys_id: artifactSysIds.length ? artifactSysIds[0] : '',
            can_manage: hasSystemCreator && creatorGroupIds.hasOwnProperty(ownerGroupSysId)
        });
    }

    function parseSysIds(raw) {
        if (!raw) {
            return [];
        }
        try {
            var parsed = JSON.parse(raw);
            if (parsed && parsed.length) {
                return parsed;
            }
        } catch (e) {
            return [];
        }
        return [];
    }
})();
