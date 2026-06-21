(function() {

    var userSysId = gs.getUserID();

    var hasAdmin      = gs.hasRole('x_infte_ops_int.admin');
    var hasLeadership = gs.hasRole('x_infte_ops_int.leadership');
    var hasCreator    = gs.hasRole('x_infte_ops_int.creator');
    var hasUser       = gs.hasRole('x_infte_ops_int.user');

    if (!hasAdmin && !hasLeadership && !hasCreator && !hasUser) {
        data.denied = true;
        return;
    }

    data.denied = false;

    var su = new GlideRecord('sys_user');
    su.get(userSysId);
    var fullName  = '' + su.getDisplayValue('name');
    var userEmail = '' + su.getValue('email');
    var nameParts = fullName.split(' ');
    var initials  = '';
    if (nameParts.length >= 2) {
        initials = nameParts[0].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].charAt(0).toUpperCase();
    } else if (nameParts.length === 1) {
        initials = nameParts[0].charAt(0).toUpperCase();
    }

    data.userName   = fullName;
    data.userEmail  = userEmail;
    data.userInitials = initials;

    var pr = new PermissionResolver();
    data.personSysId = pr.getPersonByUser(userSysId) || '';

    if (hasAdmin) {
        data.userRole = 'admin';
    } else if (hasLeadership) {
        data.userRole = 'leadership';
    } else if (hasCreator) {
        data.userRole = 'creator';
    } else {
        data.userRole = 'user';
    }

    var allSections = [
        { id: 'workspace',  label: 'Workspace',   icon: 'fa-th-large',    roles: ['admin','leadership','creator','user'] },
        { id: 'activity',   label: 'My Activity',  icon: 'fa-history',     roles: ['admin','leadership','creator','user'] },
        { id: 'studio',     label: 'Studio',       icon: 'fa-code',        roles: ['admin','creator'] },
        { id: 'governance', label: 'Governance',   icon: 'fa-shield',      roles: ['admin','leadership'] },
        { id: 'command',    label: 'Command',      icon: 'fa-terminal',    roles: ['admin'] }
    ];

    data.sections = [];
    var i;
    for (i = 0; i < allSections.length; i++) {
        var sec = allSections[i];
        if (sec.roles.indexOf(data.userRole) !== -1) {
            data.sections.push({ id: sec.id, label: sec.label, icon: sec.icon });
        }
    }

    data.initialSection = data.sections.length > 0 ? data.sections[0].id : '';

    var groups = pr.getUserGroups(userSysId);
    data.userGroups = [];
    if (groups && groups.length) {
        for (i = 0; i < groups.length; i++) {
            data.userGroups.push({
                sys_id: '' + groups[i].group_sys_id,
                name:   '' + groups[i].group_name,
                role:   '' + groups[i].group_role
            });
        }
    }

    if (!input) {
        return;
    }

    if (input.action === 'step_log') {
        var excSysId = '' + input.execution_sys_id;
        var exc = new GlideRecord('x_infte_ops_int_execution');
        if (exc.get(excSysId)) {
            var rawLog = '' + exc.getValue('step_log');
            var steps = [];
            try { steps = JSON.parse(rawLog); } catch (e) { steps = []; }
            data.stepLog = steps;
        } else {
            data.stepLog = [];
        }
        return;
    }

    if (input.action === 'toggle_maintenance') {
        if (!hasAdmin) { return; }
        var propName = '' + input.prop_name;
        var propRec = new GlideRecord('sys_properties');
        propRec.addQuery('name', propName);
        propRec.setLimit(1);
        propRec.query();
        if (propRec.next()) {
            var curVal = '' + propRec.getValue('value');
            propRec.setValue('value', curVal === 'true' ? 'false' : 'true');
            propRec.update();
        }
        return;
    }

    if (input.action === 'load_section') {
        var section = '' + input.section;
        var personId = '' + data.personSysId;

        if (section === 'workspace') {
            data.sectionData = loadWorkspace(data.userGroups, personId);
        } else if (section === 'activity') {
            data.sectionData = loadActivity(personId);
        } else if (section === 'studio') {
            if (hasCreator || hasAdmin) {
                data.sectionData = loadStudio(personId);
            }
        } else if (section === 'governance') {
            if (hasLeadership || hasAdmin) {
                data.sectionData = loadGovernance(personId);
            }
        } else if (section === 'command') {
            if (hasAdmin) {
                data.sectionData = loadCommand();
            }
        }
        return;
    }

    function loadWorkspace(userGroups, personId) {
        var groupIds = [];
        var j;
        for (j = 0; j < userGroups.length; j++) {
            groupIds.push(userGroups[j].sys_id);
        }
        if (groupIds.length === 0) {
            return { automations: [] };
        }

        var automations = [];
        var seen = {};

        var grp = new GlideRecord('x_infte_ops_int_group');
        grp.addQuery('status', 'active');
        grp.query();

        while (grp.next()) {
            var ownerGroupSysId = '' + grp.getUniqueValue();
            if (groupIds.indexOf(ownerGroupSysId) === -1) { continue; }
            var ownerGroupName = '' + grp.getValue('name');
            var grpAutomationsRaw = '' + grp.getValue('automations');
            var grpAutomationsArr = [];
            try { grpAutomationsArr = JSON.parse(grpAutomationsRaw); } catch (e) { grpAutomationsArr = []; }
            var wi;
            for (wi = 0; wi < grpAutomationsArr.length; wi++) {
                if ('' + grpAutomationsArr[wi].approval_status !== 'approved') { continue; }
                var autoSysId = '' + grpAutomationsArr[wi].automation_sys_id;
                if (seen[autoSysId]) { continue; }
                seen[autoSysId] = true;

                var autoRec = new GlideRecord('x_infte_ops_int_automation');
                if (!autoRec.get(autoSysId)) { continue; }
                if (autoRec.getValue('status') !== 'published') { continue; }

                var schedActive = autoRec.getValue('schedule_active') == '1' || autoRec.getValue('schedule_active') === 'true';

                automations.push({
                    sys_id:            autoSysId,
                    number:            '' + autoRec.getValue('number'),
                    name:              '' + autoRec.getValue('name'),
                    short_description: '' + autoRec.getValue('short_description'),
                    category_color:    '' + (autoRec.getValue('category_color') || '#0072CE'),
                    category_icon:     '' + (autoRec.getValue('category_icon')  || 'fa-bolt'),
                    usage_count:       parseInt('' + autoRec.getValue('usage_count'), 10) || 0,
                    schedule_active:   schedActive,
                    owner_group:       ownerGroupName,
                    owner_group_sys_id: ownerGroupSysId
                });
            }
        }

        return { automations: automations };
    }

    function loadActivity(personId) {
        var executions = [];
        var exc = new GlideRecord('x_infte_ops_int_execution');
        exc.addQuery('triggered_by', personId);
        exc.orderByDesc('triggered_at');
        exc.setLimit(100);
        exc.query();

        while (exc.next()) {
            executions.push({
                sys_id:        '' + exc.getUniqueValue(),
                number:        '' + exc.getValue('number'),
                automation:    '' + exc.getDisplayValue('automation'),
                status:        '' + exc.getValue('status'),
                channel:       '' + exc.getValue('channel'),
                triggered_at:  '' + exc.getDisplayValue('triggered_at'),
                completed_at:  '' + exc.getDisplayValue('completed_at'),
                is_test:       exc.getValue('is_test') == '1' || exc.getValue('is_test') === 'true'
            });
        }

        return { executions: executions };
    }

    function loadStudio(personId) {
        var copilot = {
            token_status:          '',
            github_connected_at:   '',
            github_last_validated: '',
            show_banner:           false
        };

        var personRec = new GlideRecord('x_infte_ops_int_person');
        if (personRec.get(personId)) {
            copilot.token_status          = '' + personRec.getValue('token_status');
            copilot.github_connected_at   = '' + personRec.getDisplayValue('github_connected_at');
            copilot.github_last_validated = '' + personRec.getDisplayValue('github_last_validated');
            copilot.show_banner           = (copilot.token_status !== 'active');
        }

        var drafts = [];
        var ucr = new GlideRecord('x_infte_ops_int_use_case_request');
        ucr.addQuery('submitted_by', personId);
        ucr.addQuery('status', 'IN', 'draft,submitted,in_review');
        ucr.orderByDesc('sys_updated_on');
        ucr.setLimit(20);
        ucr.query();
        while (ucr.next()) {
            drafts.push({
                sys_id:   '' + ucr.getUniqueValue(),
                number:   '' + ucr.getValue('number'),
                title:    '' + ucr.getValue('title'),
                status:   '' + ucr.getValue('status'),
                type:     'use_case',
                updated:  '' + ucr.getDisplayValue('sys_updated_on')
            });
        }

        var art = new GlideRecord('x_infte_ops_int_managed_artifact');
        art.addQuery('created_by_person', personId);
        art.addQuery('status', 'draft');
        art.orderByDesc('updated_at');
        art.setLimit(20);
        art.query();
        while (art.next()) {
            drafts.push({
                sys_id:   '' + art.getUniqueValue(),
                number:   '' + art.getValue('number'),
                title:    '' + art.getValue('display_name'),
                status:   '' + art.getValue('status'),
                type:     '' + art.getValue('artifact_type'),
                updated:  '' + art.getDisplayValue('updated_at')
            });
        }

        var cards = [
            { id: 'use_case',  icon: 'fa-lightbulb-o', label: 'New Use Case',    action: 'new_use_case' },
            { id: 'artifact',  icon: 'fa-cube',        label: 'New Artifact',    action: 'new_artifact' },
            { id: 'token',     icon: 'fa-github',      label: 'GitHub Token',    action: 'manage_token' }
        ];

        return { copilot: copilot, cards: cards, drafts: drafts };
    }

    function loadGovernance(personId) {
        var pending = [];
        var pa = new GlideRecord('x_infte_ops_int_pending_action');
        pa.addQuery('status', 'pending');
        pa.addQuery('assigned_to', personId);
        pa.orderBy('created_at');
        pa.setLimit(50);
        pa.query();
        while (pa.next()) {
            pending.push({
                sys_id:       '' + pa.getUniqueValue(),
                number:       '' + pa.getValue('number'),
                action_type:  '' + pa.getValue('action_type'),
                subject_user: '' + pa.getDisplayValue('subject_user'),
                created_at:   '' + pa.getDisplayValue('created_at'),
                status:       '' + pa.getValue('status')
            });
        }

        var groups = [];
        var grp = new GlideRecord('x_infte_ops_int_group');
        grp.addQuery('status', 'active');
        grp.orderBy('name');
        grp.query();
        while (grp.next()) {
            var grpId = '' + grp.getUniqueValue();

            var autoCount = 0;
            var grpAutomationsRaw2 = '' + grp.getValue('automations');
            var grpAutomationsArr2 = [];
            try { grpAutomationsArr2 = JSON.parse(grpAutomationsRaw2); } catch (e) { grpAutomationsArr2 = []; }
            autoCount = grpAutomationsArr2.length;

            groups.push({
                sys_id:     grpId,
                name:       '' + grp.getValue('name'),
                description: '' + grp.getValue('description'),
                type:       '' + grp.getValue('type'),
                automation_count: autoCount
            });
        }

        return { pending: pending, groups: groups };
    }

    function loadCommand() {
        var stats = {};

        var pAgg = new GlideAggregate('x_infte_ops_int_person');
        pAgg.addQuery('active', 'true');
        pAgg.addAggregate('COUNT');
        pAgg.query();
        stats.person_count = 0;
        if (pAgg.next()) {
            stats.person_count = parseInt('' + pAgg.getAggregate('COUNT'), 10) || 0;
        }

        var aAgg = new GlideAggregate('x_infte_ops_int_automation');
        aAgg.addQuery('status', 'published');
        aAgg.addAggregate('COUNT');
        aAgg.query();
        stats.automation_count = 0;
        if (aAgg.next()) {
            stats.automation_count = parseInt('' + aAgg.getAggregate('COUNT'), 10) || 0;
        }

        var today = new GlideDateTime();
        var todayDateStr = today.getDate().toString();
        var todayStart = todayDateStr + ' 00:00:00';

        var eAgg = new GlideAggregate('x_infte_ops_int_execution');
        eAgg.addQuery('triggered_at', '>=', todayStart);
        eAgg.addAggregate('COUNT');
        eAgg.query();
        stats.executions_today = 0;
        if (eAgg.next()) {
            stats.executions_today = parseInt('' + eAgg.getAggregate('COUNT'), 10) || 0;
        }

        var gAgg = new GlideAggregate('x_infte_ops_int_group');
        gAgg.addQuery('status', 'active');
        gAgg.addAggregate('COUNT');
        gAgg.query();
        stats.group_count = 0;
        if (gAgg.next()) {
            stats.group_count = parseInt('' + gAgg.getAggregate('COUNT'), 10) || 0;
        }

        var maintenancePropNames = [
            'x_infte_ops_int.maintenance.portal',
            'x_infte_ops_int.maintenance.engine',
            'x_infte_ops_int.maintenance.studio',
            'x_infte_ops_int.maintenance.executions'
        ];

        var maintenance = [];
        var k;
        for (k = 0; k < maintenancePropNames.length; k++) {
            var propName = maintenancePropNames[k];
            var propRec = new GlideRecord('sys_properties');
            propRec.addQuery('name', propName);
            propRec.setLimit(1);
            propRec.query();
            var enabled = false;
            if (propRec.next()) {
                enabled = propRec.getValue('value') === 'true';
            }
            var labelParts = propName.split('.');
            var rawLabel = labelParts[labelParts.length - 1];
            var label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) + ' Maintenance';
            maintenance.push({
                prop_name: propName,
                label:     label,
                enabled:   enabled
            });
        }

        return { stats: stats, maintenance: maintenance };
    }

})();
