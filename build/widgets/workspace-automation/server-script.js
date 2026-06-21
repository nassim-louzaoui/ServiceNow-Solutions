(function() {
    data.error = '';
    data.groups = [];
    data.cards = [];
    data.selected_group = '';

    var permissions = new PermissionResolver();
    var userSysId = gs.getUserID();
    var personSysId = permissions.getPersonByUser(userSysId);

    if (!personSysId) {
        data.error = 'You are not yet provisioned in Operations Intelligence. Please contact your manager to be added to a group.';
        return;
    }

    var userGroups = permissions.getUserGroups(userSysId);
    var groupIds = [];
    var i;
    for (i = 0; i < userGroups.length; i++) {
        data.groups.push({
            sys_id: userGroups[i].group_sys_id,
            name: userGroups[i].group_name,
            role: userGroups[i].group_role
        });
        groupIds.push(userGroups[i].group_sys_id);
    }

    if (groupIds.length === 0) {
        data.error = 'You are not a member of any group yet.';
        return;
    }

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

    function parseJson(raw, fallback) {
        if (!raw) { return fallback; }
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    }

    var seen = {};
    var ga = new GlideRecord('x_infte_ops_int_group_automation');
    ga.addQuery('group', 'IN', scopedGroupIds.join(','));
    ga.addQuery('approval_status', 'approved');
    ga.orderByDesc('added_at');
    ga.query();

    while (ga.next()) {
        var automationSysId = '' + ga.getValue('automation');
        if (seen[automationSysId]) {
            continue;
        }
        var auto = new GlideRecord('x_infte_ops_int_automation');
        if (!auto.get(automationSysId)) {
            continue;
        }
        if (auto.getValue('status') !== 'published') {
            continue;
        }
        seen[automationSysId] = true;

        var scheduleActive = auto.getValue('schedule_active') == '1' || auto.getValue('schedule_active') === 'true';
        var ownerGroupSysId = '' + ga.getValue('group');
        var ownerGroupName = '';
        var ogr = new GlideRecord('x_infte_ops_int_group');
        if (ogr.get(ownerGroupSysId)) {
            ownerGroupName = '' + ogr.getValue('name');
        }

        var card = {
            sys_id: automationSysId,
            number: '' + auto.getValue('number'),
            name: '' + auto.getValue('name'),
            short_description: '' + auto.getValue('short_description'),
            category_color: '' + (auto.getValue('category_color') || '#6366F1'),
            category_icon: '' + (auto.getValue('category_icon') || ''),
            usage_count: parseInt('' + auto.getValue('usage_count'), 10) || 0,
            estimated_time_saved: parseInt('' + auto.getValue('estimated_time_saved'), 10) || 0,
            trigger_type: scheduleActive ? 'event_driven' : 'on_demand',
            owner_group: ownerGroupName,
            owner_group_sys_id: ownerGroupSysId,
            fired_this_month: scheduleActive ? firedThisMonth(automationSysId) : 0,
            active: auto.getValue('active') == '1' || auto.getValue('active') === 'true'
        };
        data.cards.push(card);
    }

    if (input && input.action === 'flow_detail' && input.automation_sys_id) {
        data.flow_detail = buildFlowDetail('' + input.automation_sys_id);
    }

    function firedThisMonth(automationSysId) {
        var start = new GlideDateTime();
        start.setDisplayValue(start.getDate() + ' 00:00:00');
        var monthStart = new GlideDateTime();
        monthStart.setValue(start.getValue());
        var dateStr = monthStart.getDate().toString();
        var firstOfMonth = dateStr.substring(0, 7) + '-01 00:00:00';
        var exc = new GlideAggregate('x_infte_ops_int_execution');
        exc.addQuery('automation', automationSysId);
        exc.addQuery('triggered_at', '>=', firstOfMonth);
        exc.addQuery('is_test', false);
        exc.addAggregate('COUNT');
        exc.query();
        if (exc.next()) {
            return parseInt('' + exc.getAggregate('COUNT'), 10) || 0;
        }
        return 0;
    }

    function buildFlowDetail(automationSysId) {
        var detail = {
            automation_sys_id: automationSysId,
            name: '',
            short_description: '',
            trigger_condition: '',
            action_summary: '',
            recent_activity: []
        };
        var auto = new GlideRecord('x_infte_ops_int_automation');
        if (!auto.get(automationSysId)) {
            return detail;
        }
        detail.name = '' + auto.getValue('name');
        detail.short_description = '' + auto.getValue('short_description');

        var schedType = '' + auto.getValue('schedule_type');
        if (schedType === 'recurring') {
            detail.trigger_condition = 'Recurring schedule: ' + ('' + auto.getValue('cron_expression'));
        } else if (schedType === 'one_time') {
            detail.trigger_condition = 'One time: ' + ('' + auto.getDisplayValue('run_at'));
        }

        var steps = parseJson('' + auto.getValue('step_definitions'), []);
        var stepNames = [];
        var j;
        for (j = 0; j < steps.length; j++) {
            if (steps[j].active !== false && steps[j].name) {
                stepNames.push('' + steps[j].name);
            }
        }
        detail.action_summary = stepNames.join(' → ');

        var exc = new GlideRecord('x_infte_ops_int_execution');
        exc.addQuery('automation', automationSysId);
        exc.orderByDesc('triggered_at');
        exc.setLimit(10);
        exc.query();
        while (exc.next()) {
            detail.recent_activity.push({
                number: '' + exc.getValue('number'),
                triggered_at: '' + exc.getDisplayValue('triggered_at'),
                status: '' + exc.getValue('status')
            });
        }
        return detail;
    }
})();
