(function() {
    data.error = '';
    data.tiles = [];
    data.is_creator = false;

    var permissions = new PermissionResolver();
    var userSysId = gs.getUserID();
    var personSysId = permissions.getPersonByUser(userSysId);

    if (!personSysId) {
        data.error = 'You are not yet provisioned in Operations Intelligence.';
        return;
    }

    var userGroups = permissions.getUserGroups(userSysId);
    var groupIds = [];
    var isCreatorAnywhere = false;
    var i;
    for (i = 0; i < userGroups.length; i++) {
        groupIds.push(userGroups[i].group_sys_id);
        if (userGroups[i].group_role === 'creator') {
            isCreatorAnywhere = true;
        }
    }

    var hasSystemCreator = permissions.hasRole(userSysId, 'x_infte_ops_int.creator') ||
        permissions.hasRole(userSysId, 'admin');
    var isCreator = isCreatorAnywhere && hasSystemCreator;
    data.is_creator = isCreator;

    function groupHasActiveCustomTable(groupIdList) {
        if (groupIdList.length === 0) {
            return false;
        }
        var ma = new GlideRecord('x_infte_ops_int_managed_artifact');
        ma.addQuery('owner_group', 'IN', groupIdList.join(','));
        ma.addQuery('artifact_type', 'custom_table');
        ma.addQuery('status', 'active');
        ma.setLimit(1);
        ma.query();
        return ma.next();
    }

    var allUserTiles = [
        { id: 'report', label: 'Report or Dashboard', icon: 'fa-bar-chart', pre_intent: 'create_report', description: 'Build a report or Performance Analytics dashboard' },
        { id: 'notification_rule', label: 'Notification Rule', icon: 'fa-bell', pre_intent: 'create_notification', description: 'Send an email when records change' },
        { id: 'scheduled_data_job', label: 'Scheduled Data Report', icon: 'fa-calendar', pre_intent: 'create_scheduled_report', description: 'Deliver data on a recurring schedule' }
    ];

    var creatorTiles = [
        { id: 'flow', label: 'Flow', icon: 'fa-random', pre_intent: 'create_flow', description: 'Automate an event-driven process' },
        { id: 'custom_table', label: 'Custom Table', icon: 'fa-table', pre_intent: 'create_custom_table', description: 'Create a new data table (leadership approval required)' }
    ];

    var uiPageTile = { id: 'ui_page', label: 'UI Page', icon: 'fa-window-maximize', pre_intent: 'create_ui_page', description: 'Build a custom interface over a table (leadership approval required)' };

    for (i = 0; i < allUserTiles.length; i++) {
        data.tiles.push(allUserTiles[i]);
    }

    if (isCreator) {
        for (i = 0; i < creatorTiles.length; i++) {
            data.tiles.push(creatorTiles[i]);
        }
        if (groupHasActiveCustomTable(groupIds)) {
            data.tiles.push(uiPageTile);
        }
    }
})();
