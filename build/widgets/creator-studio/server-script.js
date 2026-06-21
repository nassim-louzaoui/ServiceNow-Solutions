(function() {
    data.cards = [
        { id: 'build_automation', title: 'Build an Automation', description: 'Design a multi-step automation in plain English.', icon: 'cog', pre_intent: 'create_automation' },
        { id: 'create_report', title: 'Create a Report or Dashboard', description: 'Build a report or Performance Analytics dashboard.', icon: 'bar-chart', pre_intent: 'create_report' },
        { id: 'create_notification', title: 'Set Up a Notification', description: 'Create a notification rule for a table event.', icon: 'mail', pre_intent: 'create_notification_rule' },
        { id: 'create_flow', title: 'Create a Flow', description: 'Design an event-driven flow for your group.', icon: 'workflow', pre_intent: 'create_flow' },
        { id: 'create_table', title: 'Request a Custom Table', description: 'Request a new custom table (leadership approval required).', icon: 'table', pre_intent: 'create_custom_table' }
    ];

    var userSysId = gs.getUserID();
    var pr = new PermissionResolver();
    data.role = pr.getSystemRole(userSysId);
    data.personSysId = pr.getPersonByUser(userSysId);
    data.isCreator = pr.hasRole(userSysId, 'x_infte_ops_int.creator');

    data.drafts = [];
    data.published = [];
    data.copilot = { token_status: 'none', show_banner: false, connected_at: '', last_validated_at: '' };

    if (!data.personSysId) {
        return;
    }

    var creatorGroupSysIds = _creatorGroupSysIds(data.personSysId);

    _loadCopilotStatus(data.personSysId);
    _loadDrafts(data.personSysId);
    _loadPublished(creatorGroupSysIds);

    function _creatorGroupSysIds(personSysId) {
        var ids = [];
        var grp = new GlideRecord('x_infte_ops_int_group');
        grp.addQuery('status', 'active');
        grp.query();
        while (grp.next()) {
            var membersRaw = '' + grp.getValue('members');
            var membersArr = [];
            try { membersArr = JSON.parse(membersRaw); } catch (e) { membersArr = []; }
            var i;
            for (i = 0; i < membersArr.length; i++) {
                if ('' + membersArr[i].person_sys_id === '' + personSysId &&
                    '' + membersArr[i].role === 'creator' &&
                    '' + membersArr[i].status === 'active') {
                    ids.push('' + grp.getUniqueValue());
                    break;
                }
            }
        }
        return ids;
    }

    function _loadCopilotStatus(personSysId) {
        var person = new GlideRecord('x_infte_ops_int_person');
        if (!person.get(personSysId)) {
            data.copilot.token_status = 'none';
            data.copilot.show_banner = true;
            return;
        }
        var status = '' + person.getValue('token_status');
        data.copilot.token_status = status || 'none';
        data.copilot.connected_at = '' + person.getValue('github_connected_at');
        data.copilot.last_validated_at = '' + person.getValue('github_last_validated');
        data.copilot.show_banner = (status !== 'active');
    }

    function _loadDrafts(personSysId) {
        var ucr = new GlideRecord('x_infte_ops_int_use_case_request');
        ucr.addQuery('submitted_by', personSysId);
        ucr.addQuery('status', 'IN', 'draft,submitted,in_review');
        ucr.orderByDesc('sys_updated_on');
        ucr.query();
        while (ucr.next()) {
            data.drafts.push({
                type: 'automation',
                sys_id: '' + ucr.getUniqueValue(),
                number: '' + ucr.getValue('number'),
                title: '' + ucr.getValue('title'),
                status: '' + ucr.getValue('status'),
                updated_on: '' + ucr.getValue('sys_updated_on'),
                resume_intent: 'resume_automation'
            });
        }

        var ma = new GlideRecord('x_infte_ops_int_managed_artifact');
        ma.addQuery('created_by_person', personSysId);
        ma.addQuery('status', 'draft');
        ma.orderByDesc('updated_at');
        ma.query();
        while (ma.next()) {
            data.drafts.push({
                type: 'artifact',
                sys_id: '' + ma.getUniqueValue(),
                number: '' + ma.getValue('number'),
                title: '' + ma.getValue('display_name'),
                artifact_type: '' + ma.getValue('artifact_type'),
                status: '' + ma.getValue('status'),
                updated_on: '' + ma.getValue('updated_at'),
                resume_intent: 'resume_artifact'
            });
        }
    }

    function _loadPublished(groupSysIds) {
        if (!groupSysIds.length) {
            return;
        }
        var auto = new GlideRecord('x_infte_ops_int_automation');
        auto.addQuery('owner_group', 'IN', groupSysIds.join(','));
        auto.addQuery('status', 'published');
        auto.orderByDesc('usage_count');
        auto.query();
        while (auto.next()) {
            data.published.push({
                sys_id: '' + auto.getUniqueValue(),
                number: '' + auto.getValue('number'),
                name: '' + auto.getValue('name'),
                short_description: '' + auto.getValue('short_description'),
                version: '' + auto.getValue('version'),
                usage_count: parseInt(auto.getValue('usage_count') || '0', 10),
                owner_group: '' + auto.getDisplayValue('owner_group')
            });
        }
    }
})();
