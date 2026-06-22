(function() {

    /*
     * Operations Intelligence — Portal Widget Server Script
     * Scope   : x_infte_ops_int
     * Engine  : Rhino ES5 — no const/let, no arrow functions, no template literals
     * Tables  : x_infte_ops_int_person, x_infte_ops_int_group,
     *           x_infte_ops_int_automation, x_infte_ops_int_execution,
     *           x_infte_ops_int_pending_action
     * Roles   : x_infte_ops_int.admin, .leadership, .creator, .user
     */

    function getOiRoles(uSysId) {
        var result  = { admin: false, leadership: false, creator: false, user: false };
        var nameMap = {
            'x_infte_ops_int.admin':      'admin',
            'x_infte_ops_int.leadership': 'leadership',
            'x_infte_ops_int.creator':    'creator',
            'x_infte_ops_int.user':       'user'
        };
        var idToKey = {};
        var rGr = new GlideRecord('sys_user_role');
        rGr.addQuery('name', 'IN', 'x_infte_ops_int.admin,x_infte_ops_int.leadership,x_infte_ops_int.creator,x_infte_ops_int.user');
        rGr.query();
        while (rGr.next()) {
            var rn = '' + rGr.getValue('name');
            if (nameMap[rn]) { idToKey['' + rGr.getUniqueValue()] = nameMap[rn]; }
        }
        var ids = [];
        var k;
        for (k in idToKey) { if (idToKey.hasOwnProperty(k)) { ids.push(k); } }
        if (!ids.length) { return result; }
        var hrGr = new GlideRecord('sys_user_has_role');
        hrGr.addQuery('user', uSysId);
        hrGr.addQuery('role', 'IN', ids.join(','));
        hrGr.query();
        while (hrGr.next()) {
            var rid = '' + hrGr.getValue('role');
            if (idToKey[rid]) { result[idToKey[rid]] = true; }
        }
        return result;
    }

    function getPersonSysId(uSysId) {
        var pGr = new GlideRecord('x_infte_ops_int_person');
        pGr.addQuery('user', uSysId);
        pGr.addQuery('active', true);
        pGr.setLimit(1);
        pGr.query();
        if (pGr.next()) { return '' + pGr.getUniqueValue(); }
        return '';
    }

    function getUserGroups(personSysId) {
        var groups = [];
        if (!personSysId) { return groups; }
        var gGr = new GlideRecord('x_infte_ops_int_group');
        gGr.addQuery('status', 'active');
        gGr.query();
        while (gGr.next()) {
            var members = [];
            try { members = JSON.parse('' + gGr.getValue('members')); } catch (e) { members = []; }
            var i;
            for (i = 0; i < members.length; i++) {
                if ('' + members[i].person_sys_id === personSysId && members[i].status !== 'inactive') {
                    groups.push({
                        sys_id: '' + gGr.getUniqueValue(),
                        name:   '' + gGr.getValue('name'),
                        role:   '' + (members[i].group_role || 'user')
                    });
                    break;
                }
            }
        }
        return groups;
    }

    function loadWorkspace(userGroups) {
        var groupIds = [];
        var j;
        for (j = 0; j < userGroups.length; j++) { groupIds.push(userGroups[j].sys_id); }
        if (groupIds.length === 0) { return { automations: [] }; }

        var automations = [];
        var seen = {};
        var grp = new GlideRecord('x_infte_ops_int_group');
        grp.addQuery('status', 'active');
        grp.query();

        while (grp.next()) {
            var ownerGroupSysId = '' + grp.getUniqueValue();
            if (groupIds.indexOf(ownerGroupSysId) === -1) { continue; }
            var ownerGroupName = '' + grp.getValue('name');
            var grpAutomations = [];
            try { grpAutomations = JSON.parse('' + grp.getValue('automations')); } catch (e) { grpAutomations = []; }
            var wi;
            for (wi = 0; wi < grpAutomations.length; wi++) {
                if (grpAutomations[wi].approval_status !== 'approved') { continue; }
                var autoSysId = '' + grpAutomations[wi].automation_sys_id;
                if (seen[autoSysId]) { continue; }
                seen[autoSysId] = true;
                var autoRec = new GlideRecord('x_infte_ops_int_automation');
                if (!autoRec.get(autoSysId) || autoRec.getValue('status') !== 'published') { continue; }
                automations.push({
                    sys_id:             autoSysId,
                    number:             '' + autoRec.getValue('number'),
                    name:               '' + autoRec.getValue('name'),
                    short_description:  '' + autoRec.getValue('short_description'),
                    category_color:     '' + (autoRec.getValue('category_color') || '#00BF6F'),
                    category_icon:      '' + (autoRec.getValue('category_icon')  || 'fa-bolt'),
                    usage_count:        parseInt('' + autoRec.getValue('usage_count'), 10) || 0,
                    schedule_active:    autoRec.getValue('schedule_active') === '1' || autoRec.getValue('schedule_active') === 'true',
                    owner_group:        ownerGroupName,
                    owner_group_sys_id: ownerGroupSysId
                });
            }
        }
        return { automations: automations };
    }

    function loadDeliverables(personSysId) {
        var deliverables = [];
        if (!personSysId) { return { deliverables: deliverables }; }
        try {
            var dGr = new GlideRecord('x_infte_ops_int_managed_artifact');
            dGr.addQuery('created_by_person', personSysId);
            dGr.addQuery('status', '!=', 'archived');
            dGr.orderByDesc('sys_created_on');
            dGr.setLimit(100);
            dGr.query();
            while (dGr.next()) {
                var artifactType = '' + dGr.getValue('artifact_type');
                var targetSysId  = '' + (dGr.getValue('target_sys_id') || '');
                var targetUrl    = '';
                deliverables.push({
                    sys_id:        '' + dGr.getUniqueValue(),
                    display_name:  '' + (dGr.getValue('display_name') || 'Unnamed'),
                    artifact_type: artifactType,
                    status:        '' + (dGr.getValue('status') || 'active'),
                    target_sys_id: targetSysId,
                    target_url:    targetUrl,
                    created_at:    '' + dGr.getDisplayValue('sys_created_on')
                });
            }
        } catch (e) { deliverables = []; }
        return { deliverables: deliverables };
    }

    function createManagedArtifact(name, artifactType, personSysId, targetSysId, configObj) {
        try {
            var aRec = new GlideRecord('x_infte_ops_int_managed_artifact');
            aRec.initialize();
            aRec.setValue('display_name', name);
            aRec.setValue('artifact_type', artifactType);
            aRec.setValue('created_by_person', personSysId);
            aRec.setValue('status', 'active');
            if (targetSysId) { aRec.setValue('target_sys_id', targetSysId); }
            if (configObj) { try { aRec.setValue('config', JSON.stringify(configObj)); } catch (ce) {} }
            var newId = '' + aRec.insert();
            return newId || null;
        } catch (e) { return null; }
    }

    function createReport(collected, personSysId) {
        var rName = '' + (collected.name || 'Untitled Report');
        try {
            var aId = createManagedArtifact(rName, 'report', personSysId, null, collected);
            if (!aId) { return { ok: false, error: 'Failed to create report record.' }; }
            return { ok: true, name: rName, type: 'report', sys_id: aId, url: '', artifact_sys_id: aId };
        } catch (e) { return { ok: false, error: '' + e }; }
    }

    function createDashboard(collected, personSysId) {
        var dName = '' + (collected.name || 'Untitled Dashboard');
        try {
            var aId = createManagedArtifact(dName, 'dashboard', personSysId, null, collected);
            if (!aId) { return { ok: false, error: 'Failed to create dashboard record.' }; }
            return { ok: true, name: dName, type: 'dashboard', sys_id: aId, url: '', artifact_sys_id: aId };
        } catch (e) { return { ok: false, error: '' + e }; }
    }

    function createDataAlert(collected, personSysId) {
        var aName = '' + (collected.name || 'Untitled Alert');
        try {
            var aId = createManagedArtifact(aName, 'data_alert', personSysId, null, collected);
            if (!aId) { return { ok: false, error: 'Failed to create alert record.' }; }
            return { ok: true, name: aName, type: 'data_alert', sys_id: aId, url: '', artifact_sys_id: aId };
        } catch (e) { return { ok: false, error: '' + e }; }
    }

    function createNotificationRule(collected, personSysId) {
        var rName = '' + (collected.name || 'Untitled Notification Rule');
        try {
            var aId = createManagedArtifact(rName, 'notification_rule', personSysId, null, collected);
            if (!aId) { return { ok: false, error: 'Failed to create notification rule record.' }; }
            return { ok: true, name: rName, type: 'notification_rule', sys_id: aId, url: '', artifact_sys_id: aId };
        } catch (e) { return { ok: false, error: '' + e }; }
    }

    function searchCatalog(query, limitNum) {
        var items = [];
        try {
            var catGr = new GlideRecord('sc_cat_item');
            catGr.addQuery('active', true);
            catGr.addQuery('visible_standalone', true);
            var qStrCat = ('' + query).toLowerCase();
            var catQc = catGr.addQuery('name', 'CONTAINS', qStrCat);
            catQc.addOrCondition('short_description', 'CONTAINS', qStrCat);
            catGr.orderBy('name');
            catGr.setLimit(limitNum || 6);
            catGr.query();
            while (catGr.next()) {
                items.push({
                    sys_id:            '' + catGr.getUniqueValue(),
                    name:              '' + catGr.getValue('name'),
                    short_description: '' + (catGr.getValue('short_description') || ''),
                    category:          '' + (catGr.getDisplayValue('category') || ''),
                    url:               '/sp?id=sc_cat_item&sys_id=' + catGr.getUniqueValue()
                });
            }
        } catch (e) { items = []; }
        return items;
    }

    function searchKnowledge(query, limitNum) {
        var items = [];
        try {
            var kbGr = new GlideRecord('kb_knowledge');
            kbGr.addQuery('active', true);
            kbGr.addQuery('workflow_state', 'published');
            var qStrKb = ('' + query).toLowerCase();
            var kbQc = kbGr.addQuery('short_description', 'CONTAINS', qStrKb);
            kbQc.addOrCondition('text', 'CONTAINS', qStrKb);
            kbGr.orderByDesc('sys_updated_on');
            kbGr.setLimit(limitNum || 6);
            kbGr.query();
            while (kbGr.next()) {
                items.push({
                    sys_id:              '' + kbGr.getUniqueValue(),
                    number:              '' + (kbGr.getValue('number') || ''),
                    title:               '' + (kbGr.getValue('short_description') || ''),
                    kb_knowledge_base:   '' + (kbGr.getDisplayValue('kb_knowledge_base') || ''),
                    url:                 '/sp?id=kb_article&sys_id=' + kbGr.getUniqueValue()
                });
            }
        } catch (e) { items = []; }
        return items;
    }

    function loadUserRequests(uSysId, limitNum) {
        var items = [];
        try {
            var reqGr = new GlideRecord('sc_request');
            reqGr.addQuery('requested_for', uSysId);
            reqGr.orderByDesc('opened_at');
            reqGr.setLimit(limitNum || 20);
            reqGr.query();
            while (reqGr.next()) {
                items.push({
                    sys_id:            '' + reqGr.getUniqueValue(),
                    number:            '' + reqGr.getValue('number'),
                    short_description: '' + (reqGr.getValue('short_description') || ''),
                    state:             '' + reqGr.getDisplayValue('state'),
                    stage:             '' + (reqGr.getDisplayValue('stage') || ''),
                    opened_at:         '' + reqGr.getDisplayValue('opened_at'),
                    url:               '/sp?id=ticket&table=sc_request&sys_id=' + reqGr.getUniqueValue()
                });
            }
        } catch (e) { items = []; }
        return items;
    }

    function loadUserIncidents(uSysId, limitNum) {
        var items = [];
        try {
            var incGr = new GlideRecord('incident');
            incGr.addQuery('caller_id', uSysId);
            incGr.addQuery('active', true);
            incGr.orderByDesc('opened_at');
            incGr.setLimit(limitNum || 10);
            incGr.query();
            while (incGr.next()) {
                items.push({
                    sys_id:            '' + incGr.getUniqueValue(),
                    number:            '' + incGr.getValue('number'),
                    short_description: '' + (incGr.getValue('short_description') || ''),
                    state:             '' + incGr.getDisplayValue('state'),
                    priority:          '' + incGr.getDisplayValue('priority'),
                    opened_at:         '' + incGr.getDisplayValue('opened_at'),
                    url:               '/sp?id=ticket&table=incident&sys_id=' + incGr.getUniqueValue()
                });
            }
        } catch (e) { items = []; }
        return items;
    }

    function loadUserApprovals(uSysId, limitNum) {
        var items = [];
        try {
            var apGr = new GlideRecord('sysapproval_approver');
            apGr.addQuery('approver', uSysId);
            apGr.addQuery('state', 'requested');
            apGr.orderByDesc('sys_created_on');
            apGr.setLimit(limitNum || 10);
            apGr.query();
            while (apGr.next()) {
                var docId    = '' + apGr.getValue('sysapproval');
                var docTable = '' + apGr.getValue('source_table');
                items.push({
                    sys_id:            '' + apGr.getUniqueValue(),
                    short_description: '' + (apGr.getDisplayValue('sysapproval') || apGr.getValue('comments') || 'Approval Request'),
                    state:             '' + apGr.getDisplayValue('state'),
                    opened_at:         '' + apGr.getDisplayValue('sys_created_on'),
                    document_sys_id:   docId,
                    document_table:    docTable,
                    url:               '/sp?id=ticket&table=' + docTable + '&sys_id=' + docId
                });
            }
        } catch (e) { items = []; }
        return items;
    }

    function loadStudio(personSysId) {
        var deliverableTypes = [];
        var artifacts = [];
        var studioGroups = [];
        try {
            var dtGr = new GlideRecord('x_infte_ops_int_deliverable_type');
            dtGr.addQuery('active', true);
            dtGr.orderBy('name');
            dtGr.query();
            while (dtGr.next()) {
                deliverableTypes.push({
                    sys_id: '' + dtGr.getUniqueValue(),
                    name:   '' + dtGr.getValue('name'),
                    icon:   '' + (dtGr.getValue('icon') || 'fa-cube')
                });
            }
            var artGr = new GlideRecord('x_infte_ops_int_managed_artifact');
            artGr.addQuery('created_by_person', personSysId);
            artGr.addQuery('status', 'draft');
            artGr.orderByDesc('updated_at');
            artGr.setLimit(20);
            artGr.query();
            while (artGr.next()) {
                artifacts.push({
                    sys_id:        '' + artGr.getUniqueValue(),
                    number:        '' + artGr.getValue('number'),
                    display_name:  '' + artGr.getValue('display_name'),
                    artifact_type: '' + artGr.getValue('artifact_type'),
                    status:        '' + artGr.getValue('status'),
                    updated_at:    '' + artGr.getDisplayValue('updated_at')
                });
            }
            var sgGr = new GlideRecord('x_infte_ops_int_group');
            sgGr.addQuery('status', 'active');
            sgGr.orderBy('name');
            sgGr.query();
            while (sgGr.next()) {
                studioGroups.push({
                    sys_id: '' + sgGr.getUniqueValue(),
                    name:   '' + sgGr.getValue('name')
                });
            }
        } catch (e) {
            deliverableTypes = [];
            artifacts = [];
            studioGroups = [];
        }
        return { deliverable_types: deliverableTypes, artifacts: artifacts, studio_groups: studioGroups };
    }

    function loadGovernance(personSysId, isAdmin) {
        var pendingActions = [];
        var paGr = new GlideRecord('x_infte_ops_int_pending_action');
        paGr.addQuery('status', 'pending');
        if (!isAdmin) { paGr.addQuery('assigned_to', personSysId); }
        paGr.orderBy('sys_created_on');
        paGr.setLimit(50);
        paGr.query();
        while (paGr.next()) {
            var subjectSysId = '' + paGr.getValue('subject_user');
            var subjectName = '';
            if (subjectSysId) {
                var sGr = new GlideRecord('sys_user');
                if (sGr.get(subjectSysId)) { subjectName = '' + sGr.getDisplayValue('name'); }
            }
            pendingActions.push({
                sys_id:            '' + paGr.getUniqueValue(),
                type:              '' + paGr.getValue('action_type'),
                description:       '' + paGr.getValue('description'),
                subject_user_name: subjectName,
                created:           '' + paGr.getDisplayValue('sys_created_on')
            });
        }

        var groups = [];
        var grpGr = new GlideRecord('x_infte_ops_int_group');
        grpGr.addQuery('status', 'active');
        grpGr.orderBy('name');
        grpGr.query();
        while (grpGr.next()) {
            var grpId = '' + grpGr.getUniqueValue();
            var members = [];
            try { members = JSON.parse('' + grpGr.getValue('members')); } catch (e) { members = []; }

            if (!isAdmin) {
                var isMember = false;
                var mi;
                for (mi = 0; mi < members.length; mi++) {
                    if ('' + members[mi].person_sys_id === personSysId && members[mi].status !== 'inactive') {
                        isMember = true;
                        break;
                    }
                }
                if (!isMember) { continue; }
            }

            var activeMemberCount = 0;
            var mci;
            for (mci = 0; mci < members.length; mci++) {
                if (members[mci].status !== 'inactive') { activeMemberCount++; }
            }

            var grpType = '' + grpGr.getValue('type');
            groups.push({
                sys_id:       grpId,
                name:         '' + grpGr.getValue('name'),
                description:  '' + (grpGr.getValue('description') || ''),
                type:         grpType,
                is_system:    grpType !== 'custom_group',
                member_count: activeMemberCount
            });
        }

        return { pending_actions: pendingActions, groups: groups };
    }

    function loadAssistant(personSysId, userGroups) {
        var stats = {};
        var groupIds = [];
        var gi;
        for (gi = 0; gi < userGroups.length; gi++) { groupIds.push(userGroups[gi].sys_id); }

        var availableCount = 0;
        if (groupIds.length > 0) {
            var agGr = new GlideRecord('x_infte_ops_int_group');
            agGr.addQuery('status', 'active');
            agGr.query();
            while (agGr.next()) {
                if (groupIds.indexOf('' + agGr.getUniqueValue()) === -1) { continue; }
                var agAutos = [];
                try { agAutos = JSON.parse('' + agGr.getValue('automations')); } catch(e) { agAutos = []; }
                var ai;
                for (ai = 0; ai < agAutos.length; ai++) {
                    if (agAutos[ai].approval_status === 'approved') { availableCount++; }
                }
            }
        }
        stats.available_automations = availableCount;
        stats.my_groups             = userGroups.length;

        var myExecAgg = new GlideAggregate('x_infte_ops_int_execution');
        if (personSysId) { myExecAgg.addQuery('triggered_by', personSysId); }
        myExecAgg.addAggregate('COUNT');
        myExecAgg.query();
        stats.my_executions = myExecAgg.next() ? (parseInt('' + myExecAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var todayDt = new GlideDateTime();
        var todayStr = todayDt.getDate().toString() + ' 00:00:00';
        var todayAgg = new GlideAggregate('x_infte_ops_int_execution');
        if (personSysId) { todayAgg.addQuery('triggered_by', personSysId); }
        todayAgg.addQuery('triggered_at', '>=', todayStr);
        todayAgg.addAggregate('COUNT');
        todayAgg.query();
        stats.executions_today = todayAgg.next() ? (parseInt('' + todayAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var recentExecs = [];
        if (personSysId) {
            var reGr = new GlideRecord('x_infte_ops_int_execution');
            reGr.addQuery('triggered_by', personSysId);
            reGr.orderByDesc('triggered_at');
            reGr.setLimit(5);
            reGr.query();
            while (reGr.next()) {
                recentExecs.push({
                    sys_id:         '' + reGr.getUniqueValue(),
                    automation_name: '' + reGr.getDisplayValue('automation'),
                    status:          '' + reGr.getValue('status'),
                    triggered_at:    '' + reGr.getDisplayValue('triggered_at')
                });
            }
        }

        return { stats: stats, recent_executions: recentExecs };
    }

    function loadCommand() {
        var stats = {};

        var pAgg = new GlideAggregate('x_infte_ops_int_person');
        pAgg.addQuery('active', true);
        pAgg.addAggregate('COUNT');
        pAgg.query();
        stats.persons = pAgg.next() ? (parseInt('' + pAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var aAgg = new GlideAggregate('x_infte_ops_int_automation');
        aAgg.addQuery('status', 'published');
        aAgg.addAggregate('COUNT');
        aAgg.query();
        stats.automations = aAgg.next() ? (parseInt('' + aAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var gAgg = new GlideAggregate('x_infte_ops_int_group');
        gAgg.addQuery('status', 'active');
        gAgg.addAggregate('COUNT');
        gAgg.query();
        stats.groups = gAgg.next() ? (parseInt('' + gAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var today = new GlideDateTime();
        var todayStr = today.getDate().toString() + ' 00:00:00';
        var eAgg = new GlideAggregate('x_infte_ops_int_execution');
        eAgg.addQuery('triggered_at', '>=', todayStr);
        eAgg.addAggregate('COUNT');
        eAgg.query();
        stats.executions_today = eAgg.next() ? (parseInt('' + eAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var maintenancePropNames = [
            'x_infte_ops_int.maintenance.workspace',
            'x_infte_ops_int.maintenance.gallery',
            'x_infte_ops_int.maintenance.studio',
            'x_infte_ops_int.maintenance.governance'
        ];
        var maintenance = {};
        var mk;
        for (mk = 0; mk < maintenancePropNames.length; mk++) {
            var propName = maintenancePropNames[mk];
            var propKey  = propName.split('.').pop();
            var prp = new GlideRecord('sys_properties');
            prp.addQuery('name', propName);
            prp.setLimit(1);
            prp.query();
            maintenance[propKey] = prp.next() ? (('' + prp.getValue('value')) === 'true') : false;
        }

        var allGroups = [];
        var cgGr = new GlideRecord('x_infte_ops_int_group');
        cgGr.addQuery('status', 'active');
        cgGr.orderBy('name');
        cgGr.query();
        while (cgGr.next()) {
            allGroups.push({
                sys_id: '' + cgGr.getUniqueValue(),
                name:   '' + cgGr.getValue('name'),
                type:   '' + cgGr.getValue('type')
            });
        }

        return { stats: stats, maintenance: maintenance, groups: allGroups };
    }

    // ── INITIALIZE ────────────────────────────────────────────────────────────

    data.denied       = false;
    data.deniedLogin  = '';
    data.userName     = '';
    data.userInitials = '';
    data.userEmail    = '';
    data.userRole     = '';
    data.sections     = [];
    data.personSysId  = '';
    data.userGroups   = [];

    var userSysId     = gs.getUserID();
    var oiRoles       = getOiRoles(userSysId);
    var hasAdmin      = oiRoles.admin;
    var hasLeadership = oiRoles.leadership;
    var hasCreator    = oiRoles.creator;
    var hasUser       = oiRoles.user;

    if (!hasAdmin && !hasLeadership && !hasCreator && !hasUser) {
        data.denied = true;
        var dGr = new GlideRecord('sys_user');
        if (dGr.get(userSysId)) { data.deniedLogin = '' + dGr.getValue('user_name'); }
        return;
    }

    var su = new GlideRecord('sys_user');
    if (su.get(userSysId)) {
        var fullName  = '' + su.getDisplayValue('name');
        var nameParts = fullName.split(' ');
        var initials  = '';
        if (nameParts.length >= 2) {
            initials = nameParts[0].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].charAt(0).toUpperCase();
        } else if (nameParts.length === 1 && nameParts[0].length > 0) {
            initials = nameParts[0].charAt(0).toUpperCase();
        }
        data.userName     = fullName;
        data.userEmail    = '' + su.getValue('email');
        data.userInitials = initials;
    }

    data.personSysId = getPersonSysId(userSysId);
    data.userGroups  = getUserGroups(data.personSysId);

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
        { id: 'workspace',  label: 'Workspace',             icon: 'fa-th-large', roles: ['admin','leadership','creator','user'] },
        { id: 'gallery',    label: 'Operations Gallery',    icon: 'fa-cube',     roles: ['admin','leadership','creator','user'] },
        { id: 'studio',     label: 'Operations Studio',     icon: 'fa-code',     roles: ['admin','creator'] },
        { id: 'governance', label: 'Operations Governance', icon: 'fa-shield',   roles: ['admin','leadership'] },
        { id: 'command',    label: 'Operations Command',    icon: 'fa-terminal', roles: ['admin'] }
    ];

    var si;
    for (si = 0; si < allSections.length; si++) {
        var sec = allSections[si];
        if (sec.roles.indexOf(data.userRole) !== -1) {
            data.sections.push({ id: sec.id, label: sec.label, icon: sec.icon });
        }
    }

    if (!input) { return; }

    // ── ACTIONS ───────────────────────────────────────────────────────────────

    if (input.action === 'load_section') {
        var section = '' + input.section;
        if (section === 'workspace') {
            data.sectionData = loadWorkspace(data.userGroups);
        } else if (section === 'gallery') {
            data.sectionData = loadDeliverables(data.personSysId);
        } else if (section === 'studio') {
            if (hasCreator || hasAdmin) {
                data.sectionData = loadStudio(data.personSysId);
            }
        } else if (section === 'governance') {
            if (hasLeadership || hasAdmin) {
                data.sectionData = loadGovernance(data.personSysId, hasAdmin);
            }
        } else if (section === 'command') {
            if (hasAdmin) {
                data.sectionData = loadCommand();
            }
        }
        return;
    }

    if (input.action === 'assistant_query') {
        var rawQ = '' + (input.query || '');
        var aq   = rawQ.toLowerCase().trim();

        if (!aq) {
            data.reply = 'Please enter a question or command.';
            data.type  = 'info';
            return;
        }

        function containsAny(str, words) {
            var wi;
            for (wi = 0; wi < words.length; wi++) {
                if (str.indexOf(words[wi]) !== -1) { return true; }
            }
            return false;
        }

        function stripStopWords(str) {
            var stops = ['i','me','my','myself','we','our','ours','ourselves','you','your','yours',
                'the','a','an','and','but','or','for','nor','on','at','to','from','by','with',
                'that','this','these','those','is','are','was','were','be','been','being',
                'have','has','had','do','does','did','will','would','shall','should',
                'may','might','must','can','could','about','of','in','it','its',
                'if','as','up','out','so','also','all','any','just','not','no','get','show','find',
                'please','want','need','tell','give','let','know','see','check','look'];
            var words = str.split(/\s+/);
            var filtered = [];
            var swi;
            for (swi = 0; swi < words.length; swi++) {
                if (stops.indexOf(words[swi]) === -1 && words[swi].length > 1) { filtered.push(words[swi]); }
            }
            return filtered.join(' ');
        }

        function extractIncidentNumber(str) {
            var match = str.match(/\binc\d{7}\b/i);
            return match ? match[0].toUpperCase() : null;
        }

        function matchTopic(aqStr, topicsArray) {
            var ti;
            for (ti = 0; ti < topicsArray.length; ti++) {
                if (containsAny(aqStr, topicsArray[ti].k)) {
                    return topicsArray[ti];
                }
            }
            return null;
        }

        var userFirstName = '';
        if (data.userName) {
            var fnParts = ('' + data.userName).split(' ');
            if (fnParts.length > 0 && fnParts[0]) { userFirstName = fnParts[0]; }
        }

        var TOPICS = [
            { k: ['hello there', 'hiya', 'hey assistant', 'good day', 'greetings to you', 'hi assistant'], r: 'Hello! I am your Operations Assistant. I can help with service requests, incidents, approvals, change and problem management, knowledge articles, automations, executions, group memberships, and platform navigation. What would you like to do?' },
            { k: ['how are you', 'hows it going', 'how is it going', 'how do you do', 'you doing well', 'how are things'], r: 'I am ready and working well, thank you for asking! I am here to help you with requests, incidents, approvals, automations, and anything else across the Operations Intelligence platform. What can I do for you?' },
            { k: ['goodbye', 'bye now', 'see you', 'see ya', 'farewell', 'talk later', 'catch you later', 'have a good day'], r: 'Goodbye! It was a pleasure assisting you. Come back any time you need help with requests, incidents, approvals, or automations. Have a great day!' },
            { k: ['what is your name', 'whats your name', 'who are you', 'introduce yourself', 'your name'], r: 'I am your Operations Assistant, built into the Operations Intelligence portal. I help you navigate service management, run automations, and find answers across the platform. How can I help?' },
            { k: ['are you a bot', 'are you human', 'are you an ai', 'are you real', 'are you a robot', 'are you a person'], r: 'I am the Operations Assistant, a digital helper inside the Operations Intelligence portal. I am here around the clock to help you with requests, incidents, approvals, and automations. What do you need?' },
            { k: ['you are amazing', 'youre amazing', 'great job', 'well done', 'awesome work', 'you are great', 'youre the best', 'nicely done', 'good bot'], r: 'Thank you, that is very kind! I am always glad to help. Let me know what else you need and I will do my best.' },
            { k: ['i am frustrated', 'im frustrated', 'this is broken', 'nothing works', 'so annoying', 'this is useless', 'i am stuck', 'im stuck', 'this is frustrating'], r: 'I understand, and I am sorry this has been frustrating. Let me help you fix it. Tell me what you are trying to do, or say "Create an incident" to log the issue with IT and get it tracked. We will get this sorted.' },
            { k: ['sorry', 'excuse me', 'my apologies', 'my bad', 'pardon me'], r: 'No problem at all! There is nothing to apologise for. Just let me know what you would like to do and I will help right away.' },
            { k: ['tell me a joke', 'say something funny', 'make me laugh', 'know any jokes', 'a joke please'], r: 'Here is one: Why did the incident cross the road? To get escalated on the other side! Now, back to business, how can I help you with your requests or tickets today?' },
            { k: ['what day is it', 'what time is it', 'what is the date', 'current time', 'todays date', 'what is today'], r: 'I do not track live clock or calendar details reliably, but you can always see the current date and time in the top corner of the portal. Is there a request, incident, or automation I can help you with?' },
            { k: ['repeat that', 'say again', 'say that again', 'pardon', 'come again', 'i did not catch that', 'didnt catch that'], r: 'Of course, let me know what you would like me to clarify. You can also rephrase your question and I will do my best to help with requests, incidents, approvals, or knowledge articles.' },
            { k: ['report a problem', 'log an issue with it', 'open a new ticket', 'raise a new ticket', 'i need to report', 'start an incident'], r: 'To report an issue, open the Service Portal and choose "Report an Issue" at /sp?id=new_call. Include a clear description, when it started, how many people are affected, and any error messages. For critical outages, call the IT helpdesk directly so it can be triaged immediately.' },
            { k: ['incident priority', 'priority levels', 'what is p1', 'what is p2', 'what is p3', 'what is p4', 'critical severity', 'high priority', 'medium priority', 'low priority'], r: 'Incident priority is set from impact and urgency:\n- P1 Critical: major business impact, widespread outage, needs immediate response\n- P2 High: significant impact to a department or key service\n- P3 Moderate: limited impact, normal business operation continues\n- P4 Low: minor inconvenience with an easy workaround\nP1 and P2 attract the fastest SLA targets and the most active communication.' },
            { k: ['incident states', 'incident status', 'what are incident states', 'incident lifecycle', 'incident state meaning'], r: 'Incident states track progress:\n- New: logged, not yet assigned\n- In Progress: actively being worked\n- On Hold: paused, waiting on a user, vendor, or change\n- Resolved: a fix is in place, pending confirmation\n- Closed: confirmed resolved and finalised\nUse "Check INC0001234" to see the current state of a specific incident.' },
            { k: ['assign incident', 'reassign incident', 'transfer incident', 'change assignment', 'assign to someone', 'reassign ticket'], r: 'To reassign an incident, open the record and update the Assignment Group, then the Assigned To field. Add a brief work note explaining why you are reassigning so the next person has context. If you cannot edit assignment, the fulfiller group manager or the service desk can do it for you.' },
            { k: ['escalate incident', 'escalation', 'escalate to management', 'need escalation', 'raise priority', 'escalate ticket'], r: 'To escalate, first add a work note explaining the business impact and urgency, then raise the priority or notify the assignment group manager. For severe or stalled issues, contact the service desk and request management escalation. For a major outage, say "major incident" for the war-room procedure.' },
            { k: ['major incident', 'severity 1', 'all hands', 'war room', 'crisis', 'sev 1', 'sev1', 'bridge call', 'p1 outage'], r: 'Major Incident Management (MIM) handles critical, high-impact events. Steps:\n1. Declare the major incident and notify the MIM coordinator\n2. Open a war room or bridge call\n3. Assign a dedicated communications lead for stakeholder updates\n4. Engage all relevant technical teams in parallel\n5. Track all actions on the incident record\nAfter resolution, a post-incident review is mandatory.' },
            { k: ['incident template', 'incident category', 'categorize incident', 'incident categorization', 'pick a category'], r: 'Choose the category that best matches the affected service, for example Hardware, Software, Network, or Access. Accurate categorisation routes the incident to the right team and improves reporting. If unsure, pick the closest match and the assignment group can re-categorise.' },
            { k: ['work notes', 'additional comments', 'add note to incident', 'internal notes', 'customer comments', 'comments vs work notes'], r: 'There are two note types:\n- Work Notes are internal and visible only to fulfillers and agents\n- Additional Comments (Customer Visible) are sent to the requester and appear in their portal\nUse Additional Comments to update the user, and Work Notes for technical detail and handover context.' },
            { k: ['close incident', 'resolve incident', 'mark resolved', 'resolve a ticket', 'close a ticket', 'complete incident'], r: 'To resolve an incident, set the state to Resolved, choose a resolution code, and write a clear resolution note describing what fixed the issue. The requester is then asked to confirm. After a confirmation window with no objection, the incident moves to Closed automatically.' },
            { k: ['reopen incident', 'issue came back', 'reopening', 'not resolved', 'problem returned', 'reopen ticket'], r: 'If a resolved incident recurs, you can reopen it from the record while it is still in the confirmation window. If it has already closed, raise a new incident and reference the original number in the description so the team has the history. Persistent recurrence may warrant a Problem record.' },
            { k: ['link to problem', 'related problem', 'problem record', 'problem management from incident', 'attach to problem'], r: 'To link an incident to a Problem, open the incident and set the Problem field, or create a new Problem from the incident using the related action. Linking groups recurring incidents under a single root-cause investigation and lets the fix close them together.' },
            { k: ['incident metrics', 'mean time to resolve', 'mttr', 'incident kpis', 'resolution time metrics', 'response time metrics', 'mtti'], r: 'Key incident metrics include:\n- MTTR (Mean Time To Resolve): average time from logged to resolved\n- MTTI (Mean Time To Identify): time to diagnose\n- Volume and backlog by priority\n- SLA compliance percentage\nView these in Performance Analytics dashboards or build a report from the Studio section.' },
            { k: ['on hold incident', 'waiting for vendor', 'waiting for user', 'pending reason', 'why on hold', 'put on hold'], r: 'Setting an incident On Hold requires a reason, typically: Awaiting Caller, Awaiting Vendor, Awaiting Change, or Awaiting Problem. The SLA clock can pause while on hold. Always add a work note explaining what you are waiting for and the expected follow-up date.' },
            { k: ['impact urgency', 'how is priority calculated', 'priority matrix', 'impact and urgency', 'priority formula'], r: 'Priority is derived from a matrix of Impact (how widespread) and Urgency (how time-sensitive). For example, High Impact plus High Urgency yields P1, while Low Impact plus Low Urgency yields P4. Set Impact and Urgency accurately and the priority calculates automatically.' },
            { k: ['sla on incident', 'incident sla breach', 'sla warning on incident', 'incident overdue', 'sla clock'], r: 'Each incident has SLA timers for response and resolution based on its priority. As a target nears breach you receive a warning, and a breach triggers escalation notifications to the assignment group and its manager. Keep the incident moving and use On Hold appropriately to manage the clock.' },
            { k: ['communication plan', 'update stakeholders', 'notify user', 'incident notification', 'keep informed', 'stakeholder update'], r: 'Keep stakeholders informed using Additional Comments for the requester and broadcast updates for major incidents. A good cadence is an update at acknowledgement, at diagnosis, and at resolution, plus regular intervals for P1 events. Assign a communications lead for major incidents.' },
            { k: ['incident history', 'timeline', 'audit trail', 'who made changes', 'change history', 'incident activity log'], r: 'Every incident keeps a full activity log and audit history. Open the record and view the Activity stream to see all field changes, notes, and state transitions with timestamps and the user who made them. This is the authoritative record for handovers and reviews.' },
            { k: ['duplicate incident', 'merge incidents', 'same issue twice', 'consolidate incidents', 'combine tickets'], r: 'If multiple incidents report the same issue, keep one as the primary and mark the others as duplicates referencing the primary number. For widespread events, link the duplicates to a single Problem or major incident so updates and the resolution cascade to all affected users.' },
            { k: ['post mortem', 'pir', 'post incident review', 'incident review', 'lessons learned', 'retrospective'], r: 'A Post-Incident Review (PIR) captures what happened, the timeline, the root cause, and improvement actions. Schedule it soon after resolution for any major incident, invite the responders and service owners, and record action items with owners and due dates so lessons translate into prevention.' },
            { k: ['mass ticket', 'flood of incidents', 'surge', 'many tickets', 'incident storm', 'high ticket volume'], r: 'During an incident surge, look for a common cause and consider declaring a major incident to consolidate effort. Link related tickets to a single Problem or parent so one fix and one communication covers them all, and use a broadcast message to reduce inbound duplicates.' },
            { k: ['browse service catalog', 'view catalog', 'service catalog home', 'what can i request', 'open catalog', 'see the catalog'], r: 'Browse the Service Catalog at /sp?id=sc_home. Items are grouped into categories such as Hardware, Software, Access, and Facilities. Use the search bar at the top to find an item quickly, then open it to see the form and any approval requirements before you submit.' },
            { k: ['submit request', 'raise request', 'order something', 'catalog order', 'place an order', 'how to submit a request'], r: 'To submit a request, open the Service Catalog at /sp?id=sc_home, select the item, complete the form fields, and click Order Now or Add to Cart. After submission you receive a request (REQ) number and one or more requested items (RITMs) to track fulfilment.' },
            { k: ['track my request', 'request status', 'where is my request', 'request update', 'check request', 'request progress'], r: 'To track a request, say "Show my requests" here, or open /sp?id=requests. Each request shows its stage, the requested items, any pending approvals, and the assigned fulfiller. Click an item for its full activity history and expected delivery.' },
            { k: ['cancel request', 'withdraw request', 'remove request', 'stop my request', 'call off request'], r: 'To cancel a request, open it from /sp?id=requests and use the Cancel option if it is still available, or add a comment asking the fulfiller to cancel. Requests already in fulfilment may need fulfiller action to stop, so add a clear note explaining you want to withdraw it.' },
            { k: ['modify request', 'change request details', 'update my request', 'edit my request', 'amend request'], r: 'Once submitted, most request fields are locked, but you can add a comment to the requested item asking the fulfiller to adjust details. If the change is significant, it may be easier to cancel and resubmit. Open your request at /sp?id=requests to add a comment.' },
            { k: ['order on behalf', 'request for someone else', 'submit for colleague', 'proxy request', 'request for another'], r: 'Many catalog items include a "Requested For" field so you can order on behalf of a colleague. Select their name in that field before submitting. If the item lacks that field, contact the service desk to place a proxy order or ask the colleague to submit it themselves.' },
            { k: ['catalog categories', 'catalog sections', 'request types', 'catalog structure', 'types of requests'], r: 'The catalog is organised into categories like Hardware, Software, Access, Facilities, and HR Services. Each category groups related items to make them easy to find. Browse categories from /sp?id=sc_home or use the search bar if you already know the item name.' },
            { k: ['fulfillment', 'delivery', 'when will i get', 'how long does it take', 'estimated delivery', 'delivery time'], r: 'Fulfilment time depends on the item and any approvals. Software access is often same-day, while hardware may take several business days for procurement and setup. Each catalog item shows an estimated delivery, and your request page tracks the live fulfilment stage.' },
            { k: ['request item', 'requested items', 'what is a ritm', 'ritm', 'req vs ritm'], r: 'A Request (REQ) is the overall order, while a Requested Item (RITM) is each individual item within it. One request can contain several RITMs, each fulfilled separately with its own tasks and approvals. Track both from /sp?id=requests.' },
            { k: ['catalog approval', 'request needs approval', 'who approves my request', 'request approval routing', 'approval for catalog'], r: 'Approval routing depends on the item. Many requests route to your manager, and some also require a service or budget owner. You can see required approvals on the item before submitting, and track approval progress on your request page once it is submitted.' },
            { k: ['catalog item not visible', 'item missing from catalog', 'cannot find item', 'item not showing', 'catalog item hidden'], r: 'If an item is missing, it may be restricted to certain roles, groups, or locations, or it may be inactive. Try the catalog search at /sp?id=sc_home, and if you still cannot find it, contact the service desk to confirm your eligibility or request that the item be made available.' },
            { k: ['subscription', 'recurring request', 'renewal', 'recurring item', 'subscription service'], r: 'Some catalog items are subscriptions that recur or require periodic renewal, such as software licences. These are tracked so you receive renewal reminders before expiry. Check your active subscriptions on your request history, or contact the service owner about renewal terms.' },
            { k: ['order guide', 'related items', 'multi-item request', 'bundle request', 'order multiple items'], r: 'An Order Guide bundles several related items into one guided flow, for example a new-hire package with a laptop, accounts, and access. It walks you through each item and submits them together. Look for order guides in the catalog when you need a coordinated set of items.' },
            { k: ['pricing', 'cost', 'chargeback', 'show back', 'catalog price', 'how much does it cost'], r: 'Some catalog items display a price for budgeting or chargeback, where costs are allocated to your department. Where shown, the price appears on the item form. For questions about charges or cost centres, contact the service owner or your finance partner.' },
            { k: ['request closed', 'request completed', 'request fulfilled', 'request received', 'order complete'], r: 'A completed request means all its requested items have been fulfilled and delivered. You will receive a notification, and the request shows as Closed Complete. If you have everything you expected, no action is needed; if something is missing, add a comment or raise a new request.' },
            { k: ['request rejected', 'denied request', 'why was my request rejected', 'request declined', 'rejected order'], r: 'If a request is rejected, the approver usually adds a reason in the comments. Open your request at /sp?id=requests to read it. You can address the reason and submit a new request, or contact the approver directly to discuss before resubmitting.' },
            { k: ['request on hold', 'pending fulfillment', 'fulfillment on hold', 'request paused', 'request waiting'], r: 'A request on hold is typically waiting on information, an approval, stock, or a dependency. Open the requested item to see the hold reason and any fulfiller notes. Add a comment if you can provide what is needed to move it forward.' },
            { k: ['closed incomplete', 'fulfillment issue', 'request failed', 'could not fulfill', 'fulfilment problem'], r: 'If a request closes as incomplete, fulfilment could not be finished as ordered. Read the closing notes on the requested item to understand why. If you still need the item, raise a new request referencing the original, or contact the service desk to escalate.' },
            { k: ['create change', 'raise change', 'new change', 'change ticket request', 'log a change', 'open a change'], r: 'To create a Change Request, open the Service Catalog and search for "Change Request", or use your change tooling at /sp?id=sc_cat_item&sysparm_category=change. Provide a description, justification, implementation plan, back-out plan, risk, and a proposed change window. Choose the change type that fits the work.' },
            { k: ['change types', 'standard change', 'normal change', 'emergency change', 'change categories', 'types of change'], r: 'There are three change types:\n- Standard: pre-approved, low-risk, repeatable, no CAB needed\n- Normal: assessed and approved through the CAB based on risk\n- Emergency: expedited for urgent fixes, with retrospective review\nPick the type that matches the risk and urgency of your work.' },
            { k: ['change approval', 'cab', 'change advisory board', 'change board', 'approve a change', 'change sign off'], r: 'The Change Advisory Board (CAB) reviews normal changes for risk, impact, scheduling, and readiness. Participants typically include change managers, service owners, and technical leads. Submit your change with a complete plan ahead of the CAB so it can be assessed and approved without delay.' },
            { k: ['change window', 'maintenance window', 'scheduled maintenance', 'downtime window', 'change schedule', 'planned downtime'], r: 'Schedule changes within an approved maintenance window to minimise disruption, usually outside core business hours. Record the planned start and end on the change, check for conflicts on the change calendar, and notify affected users in advance of any expected downtime.' },
            { k: ['change risk', 'risk assessment', 'change impact', 'change risk score', 'assess change risk'], r: 'Change risk is assessed from impact, likelihood of failure, scope, and the robustness of the back-out plan. A higher risk score usually requires more approvals and a stricter window. Complete the risk questions honestly so the CAB can make an informed decision.' },
            { k: ['implementation plan', 'implementation steps', 'change procedure', 'how to implement change', 'change steps'], r: 'A good implementation plan lists ordered, specific steps: pre-checks, the change actions, validation steps, and who performs each. Include timings, required access, and decision points. A clear plan speeds CAB approval and reduces errors during execution.' },
            { k: ['rollback', 'back out plan', 'undo change', 'reverse change', 'backout', 'rollback plan'], r: 'Every change should have a back-out plan describing how to restore the previous state if it fails, including the trigger conditions and the steps to revert. Test the back-out where possible. CAB will expect a credible rollback before approving a normal or emergency change.' },
            { k: ['emergency change', 'expedited change', 'urgent change', 'break fix', 'emergency cab', 'ecab'], r: 'An emergency change addresses an urgent issue, such as a P1 fix, with an expedited approval through the Emergency CAB (ECAB). Document the justification, implement quickly with appropriate oversight, and complete a retrospective review afterwards to confirm it was warranted and successful.' },
            { k: ['change freeze', 'freeze period', 'no change period', 'blackout dates', 'change blackout', 'freeze window'], r: 'During a change freeze, only emergency changes are permitted, typically around peak business periods or year-end. Plan non-urgent changes before or after the freeze. Check the change calendar for current blackout dates and seek an exception only for genuine emergencies.' },
            { k: ['change conflict', 'change clash', 'overlapping changes', 'scheduling conflict', 'conflicting change'], r: 'Conflict detection flags changes that overlap on the same configuration items or windows. Review flagged conflicts before scheduling, coordinate with the other change owner, and adjust your window if needed. The change calendar helps you find a clear slot.' },
            { k: ['change task', 'child task', 'change sub-task', 'change tasks', 'break down change'], r: 'Large changes are broken into change tasks so work can be assigned and tracked in sequence. Create tasks for pre-implementation, implementation, validation, and review, assign each to the right team, and order them so dependencies complete first.' },
            { k: ['post implementation review', 'change pir', 'change review', 'did it work', 'change closure review'], r: 'After a change, the Post-Implementation Review confirms whether it met its objective, stayed within the window, and caused no issues. Record the outcome, any deviations, and lessons learned before closing the change. Failed or partially successful changes should capture follow-up actions.' },
            { k: ['change state', 'change lifecycle', 'approve change', 'implement change', 'close change', 'change workflow'], r: 'A change moves through New, Assess, Authorize, Scheduled, Implement, Review, and Closed. It is assessed for risk, authorised by the CAB, scheduled into a window, implemented, reviewed for success, and then closed. Each stage gates the next to keep changes controlled.' },
            { k: ['change model', 'change template', 'pre-approved change', 'standard change template', 'reusable change'], r: 'Change models and templates pre-define the steps, risk, and approvals for routine changes so you do not start from scratch. Standard changes use pre-approved models to skip the CAB. Select an existing model when your work matches a known, repeatable pattern.' },
            { k: ['cab meeting', 'change board meeting', 'cab schedule', 'when is cab', 'cab agenda'], r: 'CAB usually meets on a regular cadence, often weekly, to review upcoming normal changes. Submit your change with a complete plan before the cut-off so it makes the agenda. Be ready to present the impact, risk, window, and back-out plan if asked.' },
            { k: ['rfc', 'request for change', 'rfc process', 'what is rfc', 'raise an rfc'], r: 'RFC stands for Request For Change, the formal record proposing a change to a service or infrastructure. It captures the what, why, when, risk, and plans, and it is the basis for assessment and approval. In this platform, the Change Request record is your RFC.' },
            { k: ['change scope', 'affected cis', 'configuration items in change', 'change scope definition', 'what is affected'], r: 'Define a change scope by listing the affected configuration items (CIs) on the change record. Accurate CI links power conflict detection, impact analysis, and notifications. Use the CMDB to identify dependencies so you capture everything the change could touch.' },
            { k: ['change testing', 'test plan', 'uat', 'change validation', 'test the change', 'validate change'], r: 'Changes should include a test or validation plan describing how you will confirm success, ideally with user acceptance testing (UAT) where users verify the outcome. Define pass and fail criteria up front, and include the validation steps in your implementation plan.' },
            { k: ['change notification', 'inform stakeholders of change', 'change comms', 'notify affected parties', 'change announcement'], r: 'Notify affected users and stakeholders before a change, especially if there is downtime, and again after completion. Use the change record to identify affected CIs and their owners, and send a clear message covering what is changing, when, and the expected impact.' },
            { k: ['change calendar', 'forward schedule of change', 'fsc', 'view change calendar', 'upcoming changes'], r: 'The change calendar, also called the Forward Schedule of Change (FSC), shows all planned changes and their windows. Use it to find a clear slot, avoid conflicts and freezes, and see what else is happening around your proposed time before you schedule.' },
            { k: ['normal change process', 'full change lifecycle', 'complete change process', 'end to end change'], r: 'A normal change runs: create the RFC with plans and risk, assess and authorise through the CAB, schedule into an approved window, implement using change tasks, validate the outcome, complete the post-implementation review, and close. Each step keeps the change controlled and auditable.' },
            { k: ['create problem', 'raise problem', 'problem record', 'log problem', 'new problem', 'open a problem'], r: 'To create a Problem record, use the Problem catalog item or create one from a recurring incident. Capture the symptom, the affected service, linked incidents, and an initial hypothesis. The Problem then drives root-cause analysis and a permanent fix.' },
            { k: ['root cause analysis', 'rca', 'five whys', 'fishbone', 'causal analysis', 'find root cause'], r: 'Root-cause analysis identifies why an issue occurred so it does not recur. Common techniques include the Five Whys (repeatedly asking why) and the Fishbone (Ishikawa) diagram for categorising causes. Document the analysis on the Problem record and validate the cause before committing to a fix.' },
            { k: ['workaround', 'temporary fix', 'interim solution', 'work around', 'stopgap', 'temporary solution'], r: 'A workaround restores service temporarily while the root cause is fixed. Document the workaround on the Problem and the Known Error so the service desk can apply it to related incidents immediately, reducing impact while the permanent fix is developed.' },
            { k: ['known error', 'known error database', 'kedb', 'register known error', 'knownerror'], r: 'A Known Error is a problem with a documented root cause and workaround, stored in the Known Error Database (KEDB). Recording known errors lets agents resolve matching incidents quickly using the proven workaround until the permanent fix is deployed.' },
            { k: ['link incident to problem', 'incidents under problem', 'associate incidents', 'attach incidents to problem'], r: 'Link incidents to a Problem from either record so all symptoms of the same root cause are grouped. This shows the true scale of impact and lets the permanent fix resolve the linked incidents together. Use the related list on the Problem to add or review incidents.' },
            { k: ['problem states', 'problem lifecycle', 'problem status', 'problem workflow', 'problem stages'], r: 'Problem states are New, Assess, Root Cause Analysis, Fix in Progress, Resolved, and Closed. The problem is triaged, investigated for root cause, a fix is built and applied, then it is resolved and closed once the fix is confirmed effective.' },
            { k: ['permanent fix', 'problem resolution', 'fix problem', 'permanent solution', 'solve the problem'], r: 'A permanent fix eliminates the root cause so the issue cannot recur. It often requires a Change Request to implement safely. Record the fix on the Problem, link the change, validate that linked incidents stop recurring, then resolve and close the Problem.' },
            { k: ['problem review', 'problem post mortem', 'review the problem', 'problem retrospective'], r: 'After resolving a problem, review whether the fix worked, the time to resolve, and any process improvements. Capture lessons learned and preventive actions. This closes the loop and feeds continual improvement so similar problems are caught earlier next time.' },
            { k: ['recurring incident', 'repeating issue', 'same incident again', 'keeps happening', 'repeated incident'], r: 'When the same incident recurs, raise a Problem to investigate the root cause rather than repeatedly resolving symptoms. Link the recurring incidents to the Problem so the permanent fix addresses them all and prevents future occurrences.' },
            { k: ['problem priority', 'problem severity', 'set problem priority', 'how urgent is problem'], r: 'Problem priority reflects the impact and frequency of the underlying issue and the value of fixing it. High-impact, frequently recurring problems take priority. Set impact and urgency on the Problem so it is ranked appropriately against other investigations.' },
            { k: ['problem task', 'problem child task', 'problem work task', 'tasks on problem'], r: 'Problem tasks break the investigation and fix into assignable units, such as gather logs, reproduce the issue, or test the fix. Create tasks on the Problem, assign them to the right specialists, and track them to keep the analysis moving forward.' },
            { k: ['problem metrics', 'problem kpis', 'open problems', 'problem backlog', 'problem reporting'], r: 'Useful problem metrics include open problem count, age of the backlog, number of incidents prevented by fixes, and average time to root cause. Track these in Performance Analytics or build a report in the Studio section to monitor the health of problem management.' },
            { k: ['search knowledge base', 'find article', 'kb search', 'look up article', 'knowledge article search', 'search the kb'], r: 'Search the Knowledge Base at /sp?id=kb_home using specific terms from your issue. Try the exact error message or product name for the best matches. You can also ask me directly, for example "How do I reset my password?" and I will surface relevant articles.' },
            { k: ['create kb article', 'write article', 'new knowledge article', 'author kb', 'draft an article'], r: 'To author a knowledge article, open the Knowledge Base, choose the right knowledge base and category, and create a new article with a clear title, summary, and steps. Submit it for review so it can be approved and published. Reuse a template for consistent structure.' },
            { k: ['publish article', 'approve article', 'kb workflow', 'submit for review', 'publish knowledge'], r: 'Articles move through Draft, Review, and Published. After writing, submit for review; a knowledge manager or subject expert approves it, and it becomes Published and searchable. Some bases allow direct publishing for trusted authors depending on governance.' },
            { k: ['kb categories', 'knowledge bases', 'article category', 'knowledge base list', 'organize articles'], r: 'Knowledge is organised into knowledge bases (by domain or team) and categories within them. Place each article in the most relevant base and category so users and search can find it. Browse the structure from /sp?id=kb_home.' },
            { k: ['article feedback', 'rate article', 'article not helpful', 'article wrong', 'article incorrect', 'flag article'], r: 'Each article has feedback controls so you can mark it helpful or not and add comments. If an article is wrong or outdated, flag it so the owner can correct it. Your feedback improves article quality and search ranking for everyone.' },
            { k: ['kb article review', 'article expiry', 'review cycle', 'knowledge review', 'article validity'], r: 'Articles have a review or expiry date so they stay accurate. When an article is due, its owner is prompted to verify and update or retire it. This review cycle keeps the knowledge base trustworthy and prevents stale guidance from circulating.' },
            { k: ['kb article template', 'article structure', 'article format', 'knowledge template', 'how to format article'], r: 'Use the provided article templates for a consistent structure: a clear title, a short summary, prerequisites, numbered steps, and related links. Well-structured articles are easier to follow and rank better in search, so prefer concise, scannable content.' },
            { k: ['attach file to article', 'article attachments', 'image in kb', 'video in article', 'add media to article'], r: 'You can attach files, images, and link videos to articles to clarify steps. Keep attachments relevant and reasonably sized, add descriptive captions, and prefer inline screenshots for procedures. Ensure any media follows your data classification rules before attaching.' },
            { k: ['article versioning', 'update article', 'revise article', 'article version history', 'edit published article'], r: 'Editing a published article typically creates a new version while preserving history, so you can see what changed and revert if needed. Update the content, note the change, and resubmit for review if your governance requires approval before the new version publishes.' },
            { k: ['kb metrics', 'article views', 'popular articles', 'kb analytics', 'knowledge usage'], r: 'Knowledge analytics show article views, search hits, helpfulness ratings, and incidents deflected. Use these to find your most valuable articles and gaps where new content is needed. View them in Performance Analytics or a Studio report.' },
            { k: ['retire article', 'deactivate article', 'remove old article', 'archive article', 'unpublish article'], r: 'To retire an outdated article, set it to Retired or Archived rather than deleting it, so its history is preserved and links do not break. The article stops appearing in search. Replace it with current guidance and point users to the new article where relevant.' },
            { k: ['kb access', 'who can read kb', 'kb permissions', 'restricted articles', 'knowledge access control'], r: 'Article visibility is controlled by the knowledge base and user criteria, so some content is restricted to specific roles, groups, or departments. If you cannot see an article you need, contact the knowledge base owner to confirm your access or request it.' },
            { k: ['related articles', 'suggested articles', 'kb recommendations', 'similar articles', 'linked articles'], r: 'Articles can link to related content, and search and the portal suggest similar articles based on your query. Add related links when authoring to guide readers to next steps. When searching, scan the suggested articles for a faster answer.' },
            { k: ['translate article', 'multilingual kb', 'language support', 'article translation', 'localized knowledge'], r: 'Knowledge can be authored in multiple languages, with translated versions linked to the source article. Users see content in their preferred language where a translation exists. If you need an article in another language, request a translation from the knowledge owner.' },
            { k: ['subscribe to article', 'article notifications', 'follow article', 'watch article', 'article updates'], r: 'You can follow or subscribe to an article to be notified when it changes. This is useful for procedures you rely on. Look for the follow or subscribe control on the article, and manage your subscriptions from your notification preferences.' },
            { k: ['sla definition', 'what is sla', 'service level agreement', 'sla explained', 'define sla'], r: 'A Service Level Agreement (SLA) is a commitment on how quickly a service responds to and resolves work, measured against targets. It defines the metric, the target time, the schedule it runs on, and the conditions that start, pause, and stop the timer.' },
            { k: ['sla target', 'response time target', 'resolution time target', 'sla times', 'how long to resolve', 'target times'], r: 'Typical SLA targets by priority:\n- P1 Critical: ~1 hour response, ~4 hour resolution\n- P2 High: ~4 hour response, ~8 hour resolution\n- P3 Moderate: ~8 hour response, ~3 day resolution\n- P4 Low: ~1 day response, ~5 day resolution\nActual targets follow your organisation\'s SLA definitions.' },
            { k: ['pause sla', 'sla on hold', 'sla paused', 'stop sla clock', 'hold the sla'], r: 'An SLA timer pauses when the record enters a defined pause state, such as On Hold awaiting the caller or a vendor. This stops the clock so time spent waiting on others is not counted against you. Use the correct on-hold reason to trigger the pause.' },
            { k: ['resume sla', 'restart sla', 'continue sla', 'sla resumes', 'unpause sla'], r: 'When a record leaves its pause state, for example moving from On Hold back to In Progress, the SLA timer resumes from where it stopped. Ensure you move the record out of the pause state promptly once you can act again so the clock reflects active work.' },
            { k: ['ola', 'operational level agreement', 'underpinning contract', 'internal agreement', 'ola vs sla'], r: 'An Operational Level Agreement (OLA) is an internal commitment between teams that supports an SLA, while an Underpinning Contract (UC) is a similar commitment with an external supplier. SLAs face the customer; OLAs and UCs make sure internal and vendor support can meet them.' },
            { k: ['business hours', 'sla business time', 'working hours', 'sla calendar', 'holiday schedule', 'sla schedule'], r: 'SLAs run against a schedule, often business hours rather than around the clock, and they respect defined holidays. This means a target measured in business hours pauses overnight and on non-working days, so a same-day target may complete the next morning.' },
            { k: ['sla escalation', 'sla notify manager', 'sla escalation rule', 'escalate on breach', 'sla alerts'], r: 'As an SLA approaches or passes its target, escalation rules notify the assignee, the assignment group, and management so action is taken. Respond to early-warning notifications to avoid breaches, and add notes documenting any legitimate reasons for delay.' },
            { k: ['sla metrics', 'sla compliance', 'sla report', 'sla performance', 'sla dashboard', 'sla achievement'], r: 'SLA compliance is the percentage of records that met their targets over a period. Track it by priority, team, and service in Performance Analytics or a Studio report. Trends in compliance highlight where capacity, process, or workarounds need attention.' },
            { k: ['sla retroactive', 'retroactive breach', 'adjust sla', 'sla correction', 'fix sla'], r: 'If an SLA was attached late or mis-set, it can sometimes be corrected so reporting reflects reality, subject to your governance. Document the reason for any adjustment. For systemic issues, review the SLA definition and conditions rather than adjusting records individually.' },
            { k: ['custom sla', 'create sla', 'new service level', 'sla record', 'define new sla'], r: 'Creating an SLA definition requires admin configuration: define the table and conditions, the start, pause, and stop criteria, the target duration, and the schedule. Test it against sample records before enabling it broadly so it measures exactly the work you intend.' },
            { k: ['what is cmdb', 'configuration management database', 'cmdb explained', 'define cmdb', 'cmdb overview'], r: 'The Configuration Management Database (CMDB) is the trusted record of your IT assets, called Configuration Items (CIs), and the relationships between them. It underpins impact analysis, change conflict detection, and service mapping so you can see what depends on what.' },
            { k: ['configuration item', 'what is a ci', 'cmdb record', 'ci explained', 'define ci'], r: 'A Configuration Item (CI) is any component tracked in the CMDB, such as a server, application, network device, database, or business service. Each CI has attributes and relationships. Accurate CIs let you assess the impact of incidents and changes precisely.' },
            { k: ['ci classes', 'cmdb classes', 'types of ci', 'ci types', 'configuration item classes'], r: 'CIs are grouped into classes such as Hardware (servers, laptops, network gear), Software (applications, databases), and Services (business and technical services). Each class has its own attributes. Classing CIs correctly improves discovery, reporting, and mapping.' },
            { k: ['ci relationships', 'dependency', 'runs on', 'hosted on', 'depends on', 'ci relationship types'], r: 'CI relationships describe dependencies, for example an application Runs On a server, which is Hosted On a hypervisor. These links power impact analysis, so a change or outage on one CI shows everything affected downstream. Keep relationships current for accurate analysis.' },
            { k: ['discovery', 'auto-discovery', 'cmdb discovery', 'discovered cis', 'automatic discovery'], r: 'Discovery automatically finds devices and software on the network and populates or updates the CMDB, reducing manual effort and keeping data current. Discovered CIs include attributes and relationships. Coverage gaps usually mean a credential, range, or probe needs attention.' },
            { k: ['add ci', 'create ci', 'new configuration item', 'register asset', 'manually add ci'], r: 'When discovery does not cover an item, create the CI manually: choose the correct class, fill in key attributes, and add relationships to related CIs. Manual CIs should still follow naming and data standards so they integrate cleanly with discovered data.' },
            { k: ['hardware asset', 'physical asset', 'equipment', 'laptop asset', 'server asset', 'hardware lifecycle'], r: 'Hardware assets are tracked through their lifecycle: ordered, received, in stock, in use, in repair, and retired. Each asset links to a CI and often to an owner and location. Keep status and assignment current so audits and refresh planning are accurate.' },
            { k: ['software asset', 'license', 'sam', 'software license management', 'software licensing', 'license compliance'], r: 'Software Asset Management (SAM) tracks licences, installations, and entitlements to keep you compliant and control cost. It compares what is installed against what is licensed to flag over- or under-use. Report unused licences for reclaim and ensure renewals are planned.' },
            { k: ['procurement', 'purchase order', 'buy new equipment', 'asset procurement', 'order hardware', 'purchase request'], r: 'Procurement turns an approved request into a purchase order, receipt, and an asset record in the CMDB. Start from the catalog request for the item; once approved, fulfilment handles ordering and receiving, and the new asset is registered and assigned to you.' },
            { k: ['decommission', 'retire asset', 'end of life', 'dispose asset', 'retire ci', 'asset disposal'], r: 'Decommissioning retires an asset and its CI: confirm it is no longer in use, remove or update dependent relationships, securely wipe or dispose of the hardware, and set the CI and asset status to Retired. This keeps the CMDB clean and supports secure disposal records.' },
            { k: ['cmdb health', 'stale cis', 'duplicate cis', 'orphaned records', 'cmdb data quality', 'cmdb cleanup'], r: 'CMDB health dashboards flag stale CIs (not updated by discovery), duplicates, and orphans with no relationships. Regularly review and remediate these to keep impact analysis trustworthy. Strong discovery coverage and clear ownership are the best defences against drift.' },
            { k: ['ci attributes', 'ci fields', 'cmdb fields', 'asset fields', 'configuration item attributes'], r: 'Key CI attributes include name, class, status, owner, support group, location, and class-specific details like serial number or version. Complete attributes power assignment, reporting, and impact analysis, so keep at least the core fields populated and accurate.' },
            { k: ['service mapping', 'application mapping', 'business service', 'map a service', 'service map'], r: 'Service mapping discovers and maps the CIs that make up a business service and how they connect, giving you a top-down view from service to infrastructure. This shows exactly what a service depends on, so incidents and changes can be assessed by business impact.' },
            { k: ['infrastructure topology', 'dependency views', 'relationship map', 'topology view', 'dependency map'], r: 'The dependency views and topology maps visualise CI relationships so you can trace upstream and downstream impact. Open a CI and view its map to see what it depends on and what depends on it before you make a change or while diagnosing an outage.' },
            { k: ['affected ci', 'incident affected ci', 'change affected ci', 'link ci to ticket', 'ci on ticket'], r: 'Linking the affected CI on an incident or change connects the work to the asset, enabling impact analysis, conflict detection, and better reporting. Set the Configuration Item field on the ticket, and add additional affected CIs where the work touches more than one.' },
            { k: ['software installation', 'install software', 'application deployment', 'track installs', 'software deployment'], r: 'Software installations are tracked as relationships between software CIs and the devices they run on, often populated by discovery. This shows where an application is deployed for licensing, patching, and impact analysis. Request new installs through the Service Catalog.' },
            { k: ['certificate', 'ssl certificate', 'certificate management', 'cert tracking', 'tls certificate', 'certificate expiry'], r: 'Certificates can be tracked in the CMDB with their expiry dates so you are alerted before they lapse and cause outages. Maintain owners and renewal reminders for each certificate. Treat an expiring certificate as a change to renew it within a controlled window.' },
            { k: ['network device', 'network ci', 'switch', 'router', 'firewall', 'network equipment'], r: 'Network devices such as switches, routers, and firewalls are CIs with relationships to the systems and segments they serve. Discovery typically populates them. Their relationships are vital for tracing connectivity issues and assessing the blast radius of network changes.' },
            { k: ['virtual machine', 'cloud instance', 'vm management', 'virtualization', 'virtual server', 'vm ci'], r: 'Virtual machines and cloud instances are CIs related to their host or cloud account, so you can map workloads to underlying capacity. Discovery and cloud integrations keep them current. Track VMs to manage sprawl, plan capacity, and assess change impact.' },
            { k: ['asset tag', 'barcode', 'asset label', 'physical label', 'tag asset', 'asset identifier'], r: 'Asset tags or barcodes uniquely identify physical assets and link them to their CMDB records, making audits and check-in or check-out fast and reliable. Ensure every tracked device carries its tag, and scan it to update status, location, or assignment.' },
            { k: ['create user', 'new user account', 'add user', 'onboard user', 'user account creation', 'provision user'], r: 'Creating a user is usually an admin or HR-integrated task: capture name, email, department, manager, and the roles or groups required. Where identity is synced from Active Directory, accounts provision automatically. For a new starter, use the onboarding request to provision access.' },
            { k: ['deactivate user', 'remove user', 'offboard user', 'delete account', 'disable user', 'terminate access'], r: 'To offboard a user, deactivate the account rather than deleting it, so history is preserved, then remove roles and group memberships and reclaim assets and licences. Where identity is synced, disabling the source account propagates. Use the offboarding request to coordinate this.' },
            { k: ['reset password', 'forgot password', 'password reset help', 'unlock account', 'locked out', 'cannot log in'], r: 'This platform uses Single Sign-On (SSO) — there is no separate ServiceNow password to reset. All authentication goes through the company identity provider. For access issues:\n1. Verify your company credentials work in other systems (email, Teams, etc.)\n2. If you are locked out of your company account, contact IT Support immediately for identity provider assistance\n3. For MFA issues, contact IT Security — do not attempt to bypass MFA\n4. If your credentials work elsewhere but not here, raise a service request for "Portal Access Issue" via /sp?id=sc_cat_item\n5. For SSO session problems, try clearing browser cookies and opening a fresh browser window' },
            { k: ['assign role', 'give role', 'user role', 'role assignment', 'grant permission', 'add a role'], r: 'Roles grant access to features and data. An admin assigns roles directly on the user, or you receive them through group membership. To request a role, raise an access request in the catalog with a business justification; sensitive roles route for approval before they are granted.' },
            { k: ['group membership', 'add to group', 'join group', 'remove from group', 'group member', 'manage group'], r: 'Group membership often grants roles and routes work and approvals. To join a group, request it through the catalog or ask the group owner to add you. Removing membership withdraws the associated access, so review memberships during role changes and offboarding.' },
            { k: ['user profile', 'edit profile', 'update details', 'change display name', 'my profile details', 'update profile'], r: 'Update your profile from your account settings to correct your display name, contact details, or photo. Some fields, like name and department, may be controlled by HR or identity sync and are read-only. For locked fields, raise a request to have them corrected.' },
            { k: ['delegation', 'out of office', 'delegate approvals', 'delegate tasks', 'set a delegate', 'cover for me'], r: 'Delegation lets a colleague act on your approvals and tasks while you are away. Set a delegate with a start and end date in your profile or preferences, choosing what they can act on. Remember to remove or expire the delegation when you return.' },
            { k: ['impersonation', 'impersonate user', 'act as', 'switch user', 'impersonate', 'view as user'], r: 'Impersonation lets an admin experience the platform exactly as another user to troubleshoot access and visibility. It is an administrative, audited action available from the user menu for authorised admins only. Use it to reproduce a user\'s issue, then stop impersonating.' },
            { k: ['user preferences', 'system preferences', 'settings', 'personalization', 'my settings', 'account preferences'], r: 'Personal preferences such as theme, list density, and default views live in your settings, reachable from your profile menu. Adjusting them tailors the platform to how you work without affecting anyone else. Some preferences also sync across the portal and the agent interface.' },
            { k: ['notification preferences', 'email settings', 'opt out', 'unsubscribe', 'notification bell', 'manage notifications'], r: 'Manage how you are notified from Notification Preferences in your profile. You can choose channels like email or mobile push, and opt in or out of specific notifications where allowed. Critical operational notifications may be mandatory and cannot be disabled.' },
            { k: ['timezone', 'locale', 'language', 'region setting', 'date format', 'change language'], r: 'Set your time zone, language, and date format in your preferences so times and dates display correctly for you. These settings affect how schedules and SLAs appear on your screen. If an option is missing, contact your administrator to enable the locale.' },
            { k: ['multi-factor authentication', 'mfa', 'two factor', '2fa', 'authenticator app', 'enable mfa'], r: 'Multi-Factor Authentication (MFA) adds a second verification step at login, usually a code from an authenticator app or a push approval. Enrol from your security settings or during sign-in when prompted. Keep a backup method in case your primary device is unavailable.' },
            { k: ['single sign-on', 'sso', 'saml', 'login with company account', 'company login', 'federated login'], r: 'Single Sign-On (SSO) lets you log in with your company identity instead of a separate password, using a standard like SAML. When SSO is enabled, choose the company login option and authenticate once. If SSO fails, your account or identity provider may need attention.' },
            { k: ['active directory', 'ldap', 'sync user', 'identity provider', 'ad sync', 'directory sync'], r: 'Active Directory or LDAP integration synchronises user accounts and attributes into the platform, so changes in the directory flow through automatically. This keeps profiles current and supports SSO. If your details are wrong, the fix usually starts in the source directory.' },
            { k: ['user type', 'service account', 'admin account', 'guest user', 'account type', 'types of accounts'], r: 'Account types include standard users, service accounts for integrations and automation, administrative accounts with elevated rights, and limited guest accounts. Each is scoped to its purpose. Service and admin accounts are governed tightly, with restricted use and auditing.' },
            { k: ['license count', 'user licenses', 'active users', 'user count', 'licensing', 'seat usage'], r: 'Licensing is usually based on active users or feature subscriptions. Admins can report on active accounts and feature usage to manage seats and plan renewals. Deactivating leavers and reclaiming unused access keeps licence consumption efficient.' },
            { k: ['approve request', 'reject request', 'approve item', 'approval action', 'how to approve', 'approve or reject'], r: 'To act on an approval, say "Show my approvals" here or open /sp?id=approvals, then review the details and choose Approve or Reject. Add a comment, especially when rejecting, so the requester understands the decision. Your action moves the request to its next step.' },
            { k: ['approval notification', 'approval email', 'got approval request', 'approval request received', 'notified to approve'], r: 'When something needs your approval you receive a notification by email and in the portal with a link to act. Open the approval to see the request, the requester, and any justification before deciding. You can also find all pending approvals at /sp?id=approvals.' },
            { k: ['approval chain', 'multi-level approval', 'sequential approval', 'parallel approval', 'approval levels'], r: 'Approvals can be sequential, where each approver acts in turn, or parallel, where several approve at once. Multi-level chains add approvers for higher value or risk. You can see the full chain and your position in it on the request\'s approval history.' },
            { k: ['approval on behalf', 'delegate approval', 'out of office approval', 'approve for someone', 'delegated approval'], r: 'If a colleague delegates their approvals to you, their pending approvals appear in your queue for the delegation period. Act on them as you would your own, with a clear comment. Delegators set this in their preferences with a start and end date.' },
            { k: ['bulk approve', 'approve multiple', 'mass approval', 'approve all', 'batch approve'], r: 'When you have many similar approvals, you can select multiple in the approvals list and approve them together where the interface allows. Still review each one\'s substance, and reserve bulk approval for low-risk, well-understood requests to keep control.' },
            { k: ['approval history', 'who approved', 'approval trail', 'approval audit', 'approval record'], r: 'Every request keeps an approval history showing each approver, their decision, the timestamp, and any comments. Open the request and view the Approvers related list or activity stream to see the full trail, which is the authoritative audit record of the decision.' },
            { k: ['approval reminder', 're-notify approver', 'remind approver', 'chase approval', 'approval nudge'], r: 'If an approval is overdue, you can send a reminder to the approver, or escalation rules may re-notify them automatically. From the request, use the reminder action where available, or contact the approver directly for time-sensitive items.' },
            { k: ['approval escalation', 'approval timeout', 'auto approve', 'approval deadline reached', 'escalate approval'], r: 'Approvals can escalate or, in some configurations, auto-approve or reject after a timeout to prevent stalls. Reminders fire as the deadline nears. Review the request\'s policy to understand its timeout behaviour, and act promptly to keep control of the decision.' },
            { k: ['approval group', 'group approval', 'any member approves', 'team approval', 'group based approval'], r: 'Group approvals send the request to a group where any member can approve on the group\'s behalf, so absence of one person does not block progress. The approval shows who acted for the group. This is ideal for shared accountability across a team.' },
            { k: ['reject with comments', 'rejection reason', 'why rejected approval', 'document rejection', 'reason for rejection'], r: 'When rejecting, always add a clear comment explaining why and what the requester can change. This turns a rejection into useful feedback and reduces back-and-forth. The requester sees your comment on the request and can address it before resubmitting.' },
            { k: ['resubmit after rejection', 'fix and resubmit', 'resubmit request', 'try again after rejection'], r: 'If your request was rejected, read the approver\'s comments, address the issue, and submit a new request that resolves their concern. Reference the original request if helpful. A clear, complete resubmission is far more likely to be approved quickly.' },
            { k: ['approval sla', 'time to approve', 'approval deadline', 'approval target', 'how long to approve'], r: 'Some approvals have target times so requests do not stall. Approvers receive reminders as the deadline approaches, and overdue approvals may escalate. As an approver, act promptly; as a requester, you can check the approval\'s progress on your request page.' },
            { k: ['approval rules', 'approval policy', 'when is approval needed', 'approval conditions', 'approval requirement'], r: 'Whether approval is required depends on rules tied to the item, its value, risk, or the access requested. Low-risk items may need no approval, while sensitive access routes to managers and owners. You can see required approvals on a catalog item before you submit it.' },
            { k: ['email notification', 'send notification', 'email alert', 'automated email', 'system email', 'how notifications work'], r: 'The platform sends notifications by email and in-portal when relevant events occur, such as an assignment, an approval request, or a status change. Notifications include a link to the record so you can act quickly. Manage which ones you receive in your notification preferences.' },
            { k: ['turn off emails', 'mute notification', 'reduce emails', 'stop notifications', 'too many emails', 'disable notifications'], r: 'To reduce email, open Notification Preferences in your profile and opt out of the non-essential notifications you no longer need. You can often switch some to in-portal or mobile only. Note that critical operational notices may be mandatory and cannot be turned off.' },
            { k: ['missed notification', 'not receiving emails', 'email not sent', 'notification missing', 'no notifications', 'not getting emails'], r: 'If you are missing notifications, check your notification preferences and spam folder, confirm your email address is correct on your profile, and verify you have not opted out. If everything looks right and emails still fail, raise an incident so IT can check delivery.' },
            { k: ['push notification', 'mobile notification', 'app notification', 'phone notification', 'enable push'], r: 'Mobile push notifications alert you on your phone for approvals, assignments, and updates through the mobile app. Enable them in the app settings and your notification preferences, and ensure your device allows notifications for the app at the operating-system level.' },
            { k: ['sms notification', 'text notification', 'text message alert', 'sms alerts', 'receive sms'], r: 'Where enabled, SMS notifications send time-critical alerts by text, useful for on-call and major incidents. Confirm your mobile number is correct on your profile and that SMS is permitted for the relevant notifications. SMS is typically reserved for high-priority events.' },
            { k: ['notification template', 'email template', 'customize notification', 'edit notification', 'notification content'], r: 'Notification content comes from templates that an admin configures, defining the subject, body, and recipients with dynamic fields from the record. To change wording or recipients, an administrator edits the template. Request changes through your platform admin.' },
            { k: ['notification log', 'email log', 'notification history', 'sent emails', 'check email log', 'outbound log'], r: 'Administrators can review the notification or email log to confirm whether a message was generated and sent, and to diagnose delivery issues. If you suspect a missing notification, an admin can check the log for your record to see exactly what happened.' },
            { k: ['watchlist', 'watch', 'follow record', 'add to watch list', 'subscribe to record', 'watch this ticket'], r: 'Add yourself to a record\'s watch list to receive updates even if you are not the assignee, for example to follow a major incident or a request you care about. Use the watch-list control on the record, and remove yourself when you no longer need updates.' },
            { k: ['notification trigger', 'when notification sends', 'notification condition', 'notification event', 'what triggers notification'], r: 'Notifications fire on defined triggers, such as a record being inserted, a field changing, or a specific event being raised, filtered by conditions. This controls exactly who is told and when. Administrators configure these triggers and conditions per notification.' },
            { k: ['outbound email', 'email integration', 'smtp', 'email server', 'outbound mail', 'send mail config'], r: 'Outbound email delivers notifications through the platform\'s mail configuration to your mail server. If outbound email fails platform-wide, notifications stop, so this is an admin-monitored service. Suspected delivery problems should be raised as an incident for investigation.' },
            { k: ['inbound email', 'email to ticket', 'create from email', 'email action', 'reply by email', 'inbound mail'], r: 'Inbound email can create or update records, for example turning an email into an incident or adding your reply as a comment when you respond to a notification. Reply above the marker line so your text is captured. Configuration of inbound actions is an admin task.' },
            { k: ['notification rule', 'notification event registration', 'event trigger', 'register notification', 'event based notification'], r: 'Event-based notifications rely on registered events that the platform raises during processing; a notification then listens for that event and sends to the right recipients. This decouples the trigger from the message. Admins register events and bind notifications to them.' },
            { k: ['create report', 'build a report', 'new report', 'report builder', 'make a report', 'design a report'], r: 'To build a report, open the report designer, choose the source table, pick a type such as list or bar chart, set your filter conditions, and select the fields or grouping to display. Save it and share it with the right audience. In this portal, Creators build reports from the Studio section.' },
            { k: ['report types', 'list report', 'bar chart', 'pie chart', 'time series', 'report visualization', 'chart types'], r: 'Common report types include List for detailed rows, Bar and Column for comparisons, Pie for proportions, Trend and Time Series for change over time, and Pivot for cross-tabulation. Choose the type that best answers your question and reads clearly at a glance.' },
            { k: ['report conditions', 'filter report', 'report query', 'report criteria', 'report filter', 'narrow report'], r: 'Use conditions to focus a report on the rows you care about, for example active incidents assigned to your group this month. Combine filters with AND and OR, and prefer indexed fields for speed. Save common filters so you can reuse them across reports.' },
            { k: ['run report', 'view report', 'execute report', 'generate report', 'open report', 'show report'], r: 'To run a report, open it from the report list or a dashboard and it generates against live data. You can adjust the filter at run time where allowed. For heavy reports, schedule them to run off-peak so interactive performance stays fast.' },
            { k: ['schedule report', 'automated report', 'report subscription', 'send report', 'email report', 'recurring report'], r: 'Schedule a report to run and be emailed on a cadence, such as a weekly summary to your team. Set the frequency, the format, and the recipients. Scheduled delivery keeps stakeholders informed without anyone manually running and sending the report.' },
            { k: ['share report', 'export report', 'download report', 'report pdf', 'excel export', 'export data'], r: 'Share a report by granting access to users or groups, or export it to PDF, Excel, or CSV for offline use. Respect data handling rules when exporting sensitive data. For recurring sharing, a scheduled subscription is usually better than manual exports.' },
            { k: ['performance analytics', 'pa', 'pa widget', 'pa dashboard', 'analytics platform', 'performance analytics overview'], r: 'Performance Analytics (PA) tracks indicators over time using daily snapshots, so you can see trends, targets, and forecasts rather than just a current snapshot. PA powers scorecards and dashboards. Use it when you need historical trends and KPI management, not just point-in-time reports.' },
            { k: ['kpi', 'indicator', 'scorecard', 'target', 'performance indicator', 'define kpi'], r: 'A KPI or indicator is a measured value tracked against a target over time, such as SLA compliance or backlog size. Scorecards drill into an indicator\'s breakdowns and trend. Define indicators with clear targets so progress is visible and improvement is measurable.' },
            { k: ['dashboard', 'dashboard overview', 'create dashboard', 'add widget to dashboard', 'build dashboard', 'dashboard layout'], r: 'Dashboards combine reports, indicators, and widgets on one screen for an at-a-glance view. Create a dashboard, add and arrange widgets, and share it with the relevant audience. In this portal, Creators build dashboards from the Studio section and they appear in the Gallery.' },
            { k: ['report permissions', 'who can see report', 'restrict report', 'share with group', 'report visibility', 'report access'], r: 'Control who sees a report by sharing it with specific users or groups, or publishing it more broadly. Restrict reports that contain sensitive data to the appropriate audience. Always check sharing settings before distributing so the right people, and only them, have access.' },
            { k: ['report list', 'my reports', 'all reports', 'report repository', 'find a report', 'report catalog'], r: 'Find existing reports in the report list, filtered by those you own, those shared with you, and all reports you can access. Search by title or table to avoid rebuilding something that already exists. Reuse and adapt an existing report where you can.' },
            { k: ['report template', 'save report', 'report configuration', 'reuse report', 'clone report'], r: 'Save your report configuration so you can reuse or clone it as a starting point for similar reports, changing only the filter or grouping. This keeps formatting consistent and saves time. Build a small set of trusted templates for your team\'s common needs.' },
            { k: ['chart configuration', 'chart color', 'axis label', 'legend', 'chart formatting', 'style chart'], r: 'Tune a chart with clear axis labels, a sensible legend, and colours that distinguish series without overwhelming the reader. Avoid clutter, label units, and keep the title descriptive. A well-formatted chart communicates the insight in seconds.' },
            { k: ['pivot table', 'matrix report', 'cross tab', 'crosstab', 'pivot report', 'two dimensional report'], r: 'A pivot or matrix report cross-tabulates two dimensions, for example incidents by priority across assignment groups, with counts or sums in the cells. It is ideal for spotting concentrations and gaps. Choose row and column groupings that make the pattern obvious.' },
            { k: ['report drill down', 'interactive report', 'click through', 'drill into report', 'drilldown'], r: 'Interactive reports let you click a bar, slice, or cell to drill into the underlying records. This turns a high-level chart into an investigation tool. Enable drill-down so users can move from the trend to the specific records driving it without building extra reports.' },
            { k: ['ad hoc report', 'quick report', 'one-off report', 'fast report', 'temporary report'], r: 'For a quick answer, build an ad-hoc report directly from a list: apply a filter, group it, and visualise the result without saving a permanent report. This is perfect for one-off questions. Save it only if you will need the same view again.' },
            { k: ['report audit', 'who ran report', 'report usage', 'analytics on reports', 'report statistics'], r: 'Usage data shows which reports are run, how often, and by whom, helping you retire unused reports and promote the valuable ones. Administrators can review this to keep the report catalog lean and ensure popular content stays accurate and performant.' },
            { k: ['application navigator', 'left nav', 'navigation menu', 'app navigator', 'navigate the platform', 'main menu'], r: 'The application navigator on the left lists all modules you can access, grouped by application. Use the filter box at the top to jump straight to a module by name. In this Operations Intelligence portal, use the sidebar to move between Workspace, Gallery, Studio, Governance, and Command.' },
            { k: ['favorites', 'favorite module', 'pin module', 'add to favorites', 'favorite list', 'bookmark module'], r: 'Mark modules and records as favourites so you can reach them in one click. Use the star or pin control next to an item, then find them under your favourites list. Curate your favourites around your daily tasks to cut down on searching.' },
            { k: ['recent records', 'recently viewed', 'history drawer', 'view history', 'recent items', 'recently opened'], r: 'Your history keeps the records you recently opened so you can jump back without searching. Open the history list to revisit recent work. This is handy when you move between several tickets and want to return to one you just had open.' },
            { k: ['global search', 'unified search', 'search bar', 'quick search', 'search everything', 'platform search'], r: 'Global search looks across records and knowledge from one bar. Use specific terms, exact numbers like an incident number, or a phrase in quotes for precision. In the portal, the search and this Assistant both help you find requests, incidents, and articles fast.' },
            { k: ['lists and forms', 'list view', 'form view', 'record view', 'view a record', 'list vs form'], r: 'A list view shows many records as rows for scanning and filtering, while a form view shows one record in detail for reading and editing. Open a row to move from the list to the form. Use lists to find and triage, forms to work an individual item.' },
            { k: ['filter list', 'search list', 'refine results', 'list filter', 'filter records', 'condition builder'], r: 'Refine a list with the filter or condition builder: pick a field, an operator, and a value, and combine conditions with AND and OR. Save filters you use often. A precise filter turns a long list into exactly the records you need to act on.' },
            { k: ['column chooser', 'show hide columns', 'display fields', 'customize columns', 'add column', 'arrange columns'], r: 'Personalise list columns to show the fields that matter to you using the column chooser, then reorder them by preference. This tailors the list to your workflow without affecting other users. Keep the most decision-relevant fields toward the left.' },
            { k: ['personalize form', 'add field to form', 'customize form view', 'rearrange form', 'form layout', 'edit form'], r: 'Where permitted, personalise a form to surface the fields you use most and hide clutter, improving your speed on repetitive work. Personalisation affects only your view. For changes everyone should see, request a configuration change from an administrator instead.' },
            { k: ['reference field', 'lookup field', 'type ahead', 'suggestion field', 'reference lookup', 'autocomplete field'], r: 'A reference field links to another record, like Assigned To pointing at a user. Start typing to see matching suggestions, or use the lookup icon to search. Pick the correct record so relationships, routing, and reporting stay accurate.' },
            { k: ['related list', 'related items', 'child records', 'associated records', 'related records', 'related tab'], r: 'Related lists at the bottom of a form show connected records, such as the tasks, approvals, or affected CIs for a ticket. Use them to see and manage everything attached to the record in one place, and to add or remove related items.' },
            { k: ['ui actions', 'context menu', 'right click menu', 'form buttons', 'header actions', 'record actions'], r: 'Buttons at the top of a form and options in the right-click context menu are UI actions that perform tasks like resolving, assigning, or exporting. The available actions depend on the record and your access. Hover or explore the menu to discover what you can do.' },
            { k: ['tagging', 'tag record', 'categorize record', 'label record', 'add tag', 'record tags'], r: 'Tags are personal or shared labels you attach to records to group and find them, independent of the record\'s own fields. Tag related items with a common label, then filter by that tag to pull them together quickly across lists.' },
            { k: ['saved searches', 'condition bookmark', 'save a filter', 'saved filter', 'bookmark search', 'reuse search'], r: 'Bookmark a filtered list to save a search you run regularly, then reach that exact view in one click from your bookmarks. This is faster than rebuilding the filter each time and keeps your common working sets at your fingertips.' },
            { k: ['keyboard shortcuts', 'hot keys', 'shortcut keys', 'keyboard navigation shortcut', 'shortcuts list', 'quick keys'], r: 'Keyboard shortcuts speed up navigation and form actions, such as saving a record or jumping to search, without reaching for the mouse. Check the platform\'s shortcut reference for the current list. Learning a few high-use shortcuts noticeably improves your speed.' },
            { k: ['dark mode', 'ui theme', 'light dark toggle', 'change theme', 'theme switching', 'color theme'], r: 'Switch between light and dark themes from your preferences or the theme toggle to suit your environment and reduce eye strain. The choice applies to your view only. If a theme option is missing, your administrator may need to enable it.' },
            { k: ['accessibility', 'screen reader', 'high contrast', 'keyboard only', '508', 'accessible navigation'], r: 'The platform supports accessibility features including screen-reader compatibility, keyboard-only navigation, and high-contrast options to meet standards such as Section 508 and WCAG. Enable the options you need in your preferences, and raise an incident if you hit a barrier so it can be addressed.' },
            { k: ['open in new tab', 'separate window', 'new browser tab', 'open record new tab', 'duplicate tab'], r: 'You can open many records and lists in a new tab to keep your current context while you look at something else, using your browser\'s open-in-new-tab action on a link. This is useful when comparing records or referencing one while editing another.' },
            { k: ['bulk edit', 'edit multiple', 'mass update', 'multi-row edit', 'update many records', 'bulk update'], r: 'To update many records at once, select them in a list and use the bulk edit action to set a field across all of them, or use list-edit to change values inline. Take care with mass updates, double-check your selection and the value before applying.' },
            { k: ['print record', 'print list', 'pdf print', 'print a form', 'export to print', 'printable view'], r: 'Use the print or export action to produce a clean copy of a record or list, often as a PDF, for sharing or filing. Choose a printable view where offered so the output omits navigation chrome. Mind data handling rules before printing sensitive records.' },
            { k: ['system settings', 'sys admin settings', 'platform settings', 'admin settings', 'global settings location'], r: 'Administrative and system settings live in dedicated admin modules and system properties, available only to users with the right roles. General users adjust personal options in preferences instead. To change a platform-wide setting, request it from an administrator with a clear reason.' },
            { k: ['service portal', 'portal home', 'go to portal', 'sp home', 'open service portal', 'portal overview'], r: 'The Service Portal is the user-friendly front door to services and support at /sp. From there you can browse the catalog, search knowledge, track requests, and reach support, all in a clean, responsive layout. Bookmark /sp for quick access.' },
            { k: ['portal navigation', 'portal menu', 'catalog portal nav', 'portal sections', 'navigate portal', 'portal links'], r: 'Move around the portal using the top menu and homepage tiles, which lead to the catalog, knowledge, your requests, and support. The search bar spans everything. This Operations Intelligence portal adds a sidebar for Workspace, Gallery, Studio, Governance, and Command.' },
            { k: ['my account portal', 'profile in portal', 'portal profile page', 'account in portal', 'portal settings'], r: 'Open your profile from the portal\'s user menu to view and update your details and preferences. From there you can manage notifications, language, and other personal settings. Some fields may be read-only if they are managed by HR or identity sync.' },
            { k: ['catalog in portal', 'browse catalog portal', 'service catalog portal', 'portal catalog', 'order in portal'], r: 'Browse and order services from the portal catalog at /sp?id=sc_home. Search or browse categories, open an item to complete its form, and submit to receive a request number. Track everything you order from your requests page in the same portal.' },
            { k: ['kb in portal', 'knowledge portal', 'articles portal', 'search kb portal', 'portal knowledge'], r: 'Find help articles in the portal knowledge base at /sp?id=kb_home. Search with specific terms or browse categories, rate articles as helpful, and follow ones you rely on. You can also ask me a how-to question and I will surface relevant articles.' },
            { k: ['request tracking portal', 'my requests portal', 'track requests portal', 'portal requests', 'view orders portal'], r: 'Track everything you have ordered at /sp?id=requests, where each request shows its stage, items, approvals, and assigned fulfiller. Click an item for its full history. You can also say "Show my requests" here and I will list them for you.' },
            { k: ['virtual agent', 'chatbot', 'portal chat', 'va', 'chat assistant', 'conversational support'], r: 'A Virtual Agent or chat assistant answers common questions and performs guided tasks in conversation, escalating to a person when needed. I am the Assistant for this Operations Intelligence portal; ask me about requests, incidents, approvals, knowledge, or automations any time.' },
            { k: ['portal widget', 'sp widget', 'customize portal', 'portal page widget', 'widget configuration', 'add widget portal'], r: 'Portal widgets are the reusable building blocks that render content and behaviour on portal pages. Designers place and configure widgets to compose pages. Changing portal widgets and pages is an administrative or developer task; request changes through your platform team.' },
            { k: ['portal branding', 'portal theme', 'portal colors', 'portal logo', 'brand the portal', 'portal appearance'], r: 'Portal branding, including the logo, colours, and theme, is configured centrally so the portal matches your organisation\'s identity. These are administrative settings. To propose a branding change, raise a request with your platform or communications team.' },
            { k: ['portal page', 'configure page', 'add page', 'sp page', 'create portal page', 'manage portal pages'], r: 'Portal pages are composed of widgets on a responsive grid and managed by designers in the portal tooling. Adding or configuring pages is an administrative task. If you need a new page or section, request it from your platform team with the intended content and audience.' },
            { k: ['portal mobile', 'responsive portal', 'mobile sp', 'portal on phone', 'mobile portal experience'], r: 'The Service Portal is responsive, so it adapts to phones and tablets and you can browse the catalog, track requests, and act on approvals on the go. For an app-like experience with push notifications, also try the dedicated mobile app.' },
            { k: ['portal performance', 'slow portal', 'portal load time', 'portal lagging', 'portal speed'], r: 'If the portal is slow, try clearing your browser cache, checking your network, and disabling heavy browser extensions. Persistent slowness across users may indicate a platform issue, so raise an incident with the time, page, and your location so it can be investigated.' },
            { k: ['portal login', 'portal authentication', 'portal access', 'log into portal', 'portal sign in'], r: 'Access the portal at /sp and sign in with your standard credentials or company SSO. If login fails, confirm your account is active and try a password reset or the SSO option. Repeated access problems should be raised with IT Support.' },
            { k: ['servicenow mobile', 'now mobile', 'mobile app', 'download app', 'get the mobile app', 'install app'], r: 'The mobile app puts key tasks on your phone: act on approvals, view and update tickets, order from the catalog, and get push notifications. Install it from your device\'s app store and sign in with your company credentials or SSO to get started.' },
            { k: ['mobile features', 'what can i do on mobile', 'mobile capabilities', 'mobile functions', 'mobile app features'], r: 'On mobile you can review and act on approvals, log and update incidents, browse and order catalog items, view your requests, and receive push notifications. It is designed for quick actions on the go, with the full portal available when you need more depth.' },
            { k: ['offline mode', 'mobile offline', 'work offline', 'no internet mobile', 'offline access'], r: 'The mobile app supports limited offline use for certain actions, queuing your changes and syncing them when connectivity returns. Capabilities vary by feature, so confirm an action saved once you are back online. For complex work, reconnect to the full portal.' },
            { k: ['mobile push notifications', 'app notifications', 'mobile alerts', 'enable mobile push', 'phone alerts'], r: 'Enable push notifications in the mobile app settings and allow them at the device level so you are alerted to approvals, assignments, and updates instantly. Pair this with your notification preferences to control which events reach your phone.' },
            { k: ['mobile login', 'biometrics', 'fingerprint', 'face id', 'touch id', 'biometric login'], r: 'The mobile app supports quick, secure sign-in with biometrics such as fingerprint or face recognition after your initial login, so you do not retype credentials each time. Enable biometric unlock in the app settings; your device must have biometrics configured.' },
            { k: ['mobile catalog', 'request from mobile', 'mobile request', 'order from phone', 'catalog on mobile'], r: 'Order services from your phone using the mobile app\'s catalog: search or browse, complete the item form, and submit. You then track the request from the app. This is ideal for quick, common requests while away from your desk.' },
            { k: ['approve on mobile', 'mobile approvals', 'approve from phone', 'mobile approve reject', 'approve on the go'], r: 'Approvals are one of the best mobile tasks: open the push notification or the approvals list, review the request, and approve or reject with a comment in a couple of taps. This keeps requests moving even when you are away from your computer.' },
            { k: ['mobile incident', 'log incident from phone', 'incident on mobile', 'report issue mobile', 'create incident mobile'], r: 'You can log an incident from the mobile app: describe the issue, set the category, and submit, attaching a photo of an error if it helps. This is handy for reporting issues the moment they happen, wherever you are.' },
            { k: ['agent workspace mobile', 'mobile agent', 'field agent app', 'agent app', 'onsite agent mobile'], r: 'Field and support agents have a mobile experience tailored to their work, with assigned tasks, location-aware features, and quick updates from the field. If you fulfil work on site, ask your administrator about enabling the agent mobile capabilities for your role.' },
            { k: ['wearable', 'smartwatch', 'apple watch', 'android watch', 'watch notifications', 'wearable support'], r: 'Where supported, key alerts such as approvals and major incident notifications can surface on a paired smartwatch for at-a-glance awareness, with deeper action on your phone. Enable wearable notifications through the mobile app and your watch\'s companion settings.' },
            { k: ['studio', 'application studio', 'app engine', 'develop app', 'create app', 'app development'], r: 'Application development happens in the platform\'s Studio, an integrated environment for building scoped applications with tables, scripts, and UI in one place. Creating applications requires developer roles. Note that this portal\'s "Studio" section is for building Operations Intelligence deliverables, not platform apps.' },
            { k: ['script include', 'server-side script', 'reusable script', 'backend script', 'server script library'], r: 'A Script Include is reusable server-side code, ideal for shared functions and APIs called from business rules, scripts, and other server logic. Keep it scoped, well-named, and free of duplication. Building Script Includes requires developer access in the relevant scope.' },
            { k: ['business rule', 'automated rule', 'server rule', 'trigger rule', 'db rule', 'record rule'], r: 'A Business Rule is server-side logic that runs when records are queried, inserted, updated, or deleted, used to enforce data integrity and automate behaviour. Run them on the appropriate timing (before, after, async, or display) and keep them efficient. They require developer access to create.' },
            { k: ['ui policy', 'form rule', 'mandatory field', 'hide field', 'client rule', 'dynamic form rule'], r: 'A UI Policy dynamically controls a form, making fields mandatory, read-only, or hidden based on conditions, without writing client code. It is the preferred, low-code way to drive form behaviour. Configuring UI Policies requires the appropriate admin or developer access.' },
            { k: ['client script', 'form load', 'field change', 'browser script', 'onload script', 'onchange script'], r: 'A Client Script runs in the browser on events such as form load, field change, or submit, for client-side validation and interactivity. Use it sparingly to keep forms fast, and prefer UI Policies for simple show, hide, and mandatory logic. It requires developer access.' },
            { k: ['application scope', 'app scope', 'scope prefix', 'scoped app', 'namespace', 'scoped application'], r: 'An application scope isolates an app\'s tables, scripts, and configuration under a unique namespace prefix, preventing collisions and protecting platform integrity. Cross-scope access is governed explicitly. This Operations Intelligence solution lives in the x_infte_ops_int scope.' },
            { k: ['update set', 'change capture', 'export config', 'migrate config', 'config migration', 'move changes'], r: 'An Update Set captures configuration changes so they can be moved between instances, for example from development to production. Keep one logical change per set, complete it, and migrate it in order. Data is moved separately from configuration.' },
            { k: ['import set', 'data import', 'csv import', 'excel import', 'import xml', 'load data'], r: 'Import Sets stage external data from files or feeds into a temporary table, then a Transform Map maps and loads it into the target table. Use them for bulk loads and recurring feeds. Validate a sample first and define coalesce fields to avoid duplicates.' },
            { k: ['transform map', 'field mapping', 'coalesce', 'transformation', 'map fields', 'data transform'], r: 'A Transform Map defines how staged import data maps onto target fields, with coalesce fields that match existing records to update rather than duplicate them. Add field maps and any scripting needed, then run a test transform to confirm the result before going live.' },
            { k: ['rest api', 'api integration', 'rest call', 'outbound rest', 'api endpoint', 'consume api'], r: 'To consume an external service, configure an outbound REST message with the endpoint, method, headers, and authentication, then call it from server script or a flow action. Handle responses and errors explicitly. Store credentials securely rather than in code.' },
            { k: ['scripted rest', 'create api', 'rest api endpoint', 'expose api', 'inbound api', 'build api'], r: 'A Scripted REST API exposes your own endpoints so other systems can call the platform, with defined resources, methods, and security. Validate input, enforce access, and return clear responses and status codes. The Operations Intelligence engine is exposed this way under its scope.' },
            { k: ['integration hub', 'spoke', 'flow action', 'api action', 'integrationhub', 'integration spoke'], r: 'IntegrationHub provides pre-built spokes and flow actions to connect to external systems from Flow Designer without custom code, covering common platforms and protocols. Use a spoke where one exists to save effort, and a custom action or REST message where it does not.' },
            { k: ['debug', 'troubleshoot script', 'script debugger', 'break point', 'debug code', 'step through code'], r: 'Debug server logic with the script debugger and breakpoints, and use logging to trace execution and inspect values. Reproduce the issue in a sub-production instance where possible. Check system logs for errors, and narrow the problem with targeted log statements.' },
            { k: ['create table', 'new table', 'extend table', 'table schema', 'define table', 'add a table'], r: 'Create a table in the right application scope, choosing whether to extend an existing table to inherit its fields and behaviour. Define fields with appropriate types, set sensible defaults, and add the access controls the data requires. Table creation needs developer access.' },
            { k: ['add field', 'new field', 'column type', 'field type', 'create field', 'field definition'], r: 'Add a field by choosing a type that fits the data, such as String, Choice, Reference, Date/Time, or True/False, and set its label, length, and any default. Reference fields link records; choice fields constrain values. Plan types carefully because changing them later is harder.' },
            { k: ['data dictionary', 'field definition reference', 'table definition', 'dictionary entry', 'schema reference'], r: 'The data dictionary is the catalog of every table and field, including types, attributes, and defaults. Use it to understand or adjust the underlying schema. Editing dictionary entries is an administrative action that affects all records on the table, so proceed carefully.' },
            { k: ['legacy workflow', 'workflow editor', 'workflow', 'graphical workflow', 'old workflow'], r: 'The legacy graphical Workflow editor orchestrates approvals and tasks for records like requests and changes. New automation should generally use Flow Designer, but you may still maintain existing workflows. Editing workflows requires the appropriate developer access.' },
            { k: ['flow designer', 'create flow', 'automate process', 'orchestration', 'build a flow', 'no code automation'], r: 'Flow Designer is the low-code tool for automating processes with triggers, conditions, and actions, including IntegrationHub spokes for external systems. Use it to replace scripts and legacy workflows with maintainable, visual automation. Building flows requires the relevant access.' },
            { k: ['scheduled job', 'automated job', 'job schedule', 'recurring job', 'cron job', 'scheduled script'], r: 'A Scheduled Job runs a script or task on a defined schedule, such as nightly cleanup or periodic syncs. Set its frequency and keep its work efficient to avoid load. Creating scheduled jobs is an administrative action; ensure each job is necessary and monitored.' },
            { k: ['sys property', 'system property', 'configuration value', 'global setting', 'system property value'], r: 'System properties store configurable values that control platform and application behaviour without code changes. Admins read and set them centrally. In this solution, secrets like the engine key live in scoped system properties and are never committed to source.' },
            { k: ['event registry', 'create event', 'event management config', 'custom event', 'register event', 'event definition'], r: 'The event registry defines named events the platform can raise during processing; scripts queue events and notifications or script actions respond to them. Registering a custom event lets you decouple triggers from downstream actions. This is an administrative configuration task.' },
            { k: ['acl', 'access control', 'security rule', 'data restriction', 'acl rule', 'record security'], r: 'Access Control Lists (ACLs) enforce who can read, write, create, or delete records and fields, evaluated by role and condition. They are the core of platform data security. Design ACLs to grant least privilege, and test them by impersonating affected users.' },
            { k: ['email script', 'notification script', 'dynamic content', 'mail script', 'notification scripting'], r: 'Email scripts inject dynamic content into notifications, letting you build conditional or computed message sections beyond simple field substitution. Keep them lightweight and safe. Editing email scripts is an administrative task tied to the notification templates they serve.' },
            { k: ['domain separation', 'multi-tenant', 'domains', 'domain config', 'tenant isolation'], r: 'Domain separation partitions data and configuration so multiple business units or customers operate in isolation within one instance. It is powerful but adds complexity. Use it only when true tenant isolation is required, and plan the model carefully with experienced architects.' },
            { k: ['instance upgrade', 'patch release', 'family release', 'upgrade planning', 'platform upgrade', 'version upgrade'], r: 'Instances are upgraded to new family releases and patched for fixes and security. Plan upgrades by reviewing skipped customisations, testing in a sub-production clone, and scheduling a maintenance window. Keep customisations upgrade-safe to reduce future effort.' },
            { k: ['application manager', 'plugin', 'activate plugin', 'install app', 'plugins', 'enable feature'], r: 'Plugins and store applications add features to the platform and are activated through the application or plugin manager by an administrator. Activate them first in a sub-production instance to test impact. Request a new plugin or app through your platform team with a clear need.' },
            { k: ['what is operations intelligence', 'about this portal', 'portal overview oi', 'this platform', 'what is this portal'], r: 'Operations Intelligence is your central portal for running automations, building reporting deliverables, and managing operations governance. It brings together your Workspace, the Operations Gallery, Studio, Governance, and Command in one role-aware experience. Ask me anything about using it.' },
            { k: ['workspace section', 'my workspace', 'workspace overview', 'workspace area', 'operations workspace'], r: 'The Workspace is your home for day-to-day operations: it lists the automations available to you through your groups and lets you trigger them and review recent executions. Open Workspace from the sidebar, then say "Show my automations" or "Run [name]" to act.' },
            { k: ['operations gallery', 'gallery', 'my deliverables', 'saved reports', 'my gallery', 'gallery section'], r: 'The Operations Gallery holds the reports and dashboards you and your teams have created as managed deliverables. Open it from the sidebar to view, open, and organise your saved outputs. Deliverables built in Studio appear here once published.' },
            { k: ['studio section', 'create deliverable', 'build report oi', 'oi studio', 'operations studio', 'studio area'], r: 'The Studio section is where Creators and Administrators build managed deliverables such as reports and dashboards. Open Studio from the sidebar, choose the deliverable type, and configure it; completed deliverables publish to the Operations Gallery. This requires the Creator or Administrator role.' },
            { k: ['governance section', 'group management', 'pending actions', 'oi governance', 'operations governance', 'governance area'], r: 'The Governance section is for Leadership and Administrators to manage groups and resolve pending actions such as approvals for automations and access. Open Governance from the sidebar to review and act on items awaiting a decision. This requires the Leadership or Administrator role.' },
            { k: ['command section', 'admin console', 'command console', 'oi admin console', 'operations command', 'command area'], r: 'The Command section is the administration console for Administrators, providing platform-level oversight and controls for Operations Intelligence. Open Command from the sidebar. It is restricted to the Administrator role.' },
            { k: ['operations assistant', 'oi chat', 'assistant features', 'what can the assistant do', 'assistant capabilities'], r: 'I am the Operations Assistant. I can show your incidents, requests, approvals, groups, and executions, search the catalog and knowledge base, explain processes across IT service management, and trigger automations you are entitled to run. Type "help" for a full menu.' },
            { k: ['what is an automation', 'oi automation', 'automate process oi', 'automation definition', 'automation meaning'], r: 'An automation in Operations Intelligence is a packaged, governed operation you can run from your Workspace, executed by the platform\'s engine and recorded as an execution. Automations are made available to you through your groups, with approvals where required.' },
            { k: ['automation catalog', 'available automations', 'my automations', 'automation list', 'list of automations'], r: 'Your available automations come from the groups you belong to. Say "Show my automations" and I will list them with their descriptions and owning groups, or open the Workspace section to browse them. To run one, say "Run [automation name]".' },
            { k: ['run automation', 'trigger automation', 'execute automation', 'fire automation', 'start automation', 'launch automation'], r: 'To run an automation, say "Run [automation name]" and I will trigger it if you are entitled, returning the execution number and status. You can also trigger automations from the Workspace section. Say "Show my automations" first if you are unsure of the exact name.' },
            { k: ['what is execution', 'automation run record', 'execution status', 'execution definition', 'what is an execution'], r: 'An execution is a single run of an automation, with a number, a status such as running, succeeded, or failed, and a record of who triggered it and when. Each time you run an automation a new execution is created so the activity is fully traceable.' },
            { k: ['execution history', 'my executions', 'past runs', 'automation log oi', 'execution log', 'run history'], r: 'To review your recent runs, say "Show recent executions" and I will list your latest automation executions with their status and timestamps. You can also browse execution history from the Workspace. Each execution records its outcome for audit and troubleshooting.' },
            { k: ['oi group', 'operations group', 'group membership oi', 'my oi groups', 'operations intelligence group'], r: 'Operations Intelligence groups control which automations and deliverables you can access and what role you hold within each. Say "What groups am I in?" to see your memberships. To join a group or gain access, contact your administrator or the group owner.' },
            { k: ['oi roles', 'admin role', 'leadership role', 'creator role', 'user role', 'operations intelligence roles'], r: 'Operations Intelligence has four roles:\n- Administrator: full platform control, including the Command console\n- Leadership: governance, group management, and approvals\n- Creator: build reports and dashboards in Studio\n- User: run automations and view the Gallery\nSay "Who am I?" to see your current roles.' },
            { k: ['enroll user', 'add user oi', 'enroll to oi', 'register user oi', 'onboard to operations intelligence'], r: 'Enrolling a user into Operations Intelligence grants them a role and the relevant group memberships so they can access automations and deliverables. This is an administrative action performed in Governance or Command. Contact your administrator to enrol a colleague.' },
            { k: ['unenroll', 'remove user oi', 'deactivate from oi', 'offboard from operations intelligence', 'remove from oi'], r: 'Unenrolling a user removes their Operations Intelligence roles and group memberships so they lose access to automations and deliverables, while history is retained. This is an administrative action. Contact your administrator to unenrol someone, for example when they change roles or leave.' },
            { k: ['managed artifact', 'what is artifact', 'oi artifact', 'deliverable concept', 'managed deliverable'], r: 'A managed artifact is a governed object that Operations Intelligence creates and tracks, such as a report or dashboard deliverable, kept within the application scope and update set. This governance ensures changes are captured, auditable, and portable between instances.' },
            { k: ['create report oi', 'report builder oi', 'oi report', 'build report in studio', 'new oi report'], r: 'To create an Operations Intelligence report, open the Studio section, choose Report as the deliverable type, and follow the builder to name and configure it. Once published, the report appears in your Operations Gallery. This requires the Creator or Administrator role.' },
            { k: ['create dashboard oi', 'dashboard builder oi', 'oi dashboard', 'build dashboard in studio', 'new oi dashboard'], r: 'To create an Operations Intelligence dashboard, open the Studio section, choose Dashboard as the deliverable type, and follow the builder to assemble and configure it. The finished dashboard publishes to your Operations Gallery. This requires the Creator or Administrator role.' },
            { k: ['data alert', 'create alert', 'threshold alert', 'monitoring alert', 'set up alert', 'data threshold'], r: 'A data alert watches a metric and notifies you when it crosses a threshold, so you learn about issues without constantly checking dashboards. Define the condition, threshold, and recipients. Configuring alerts is typically a Creator or Administrator task in the relevant section.' },
            { k: ['notification rule oi', 'alert rule', 'trigger notification oi', 'oi notification rule', 'automated alert rule'], r: 'A notification rule in Operations Intelligence defines when an alert or message is sent and to whom, based on conditions such as an execution failing or a threshold being crossed. Administrators configure these rules so the right people are informed automatically.' },
            { k: ['operations intelligence admin', 'oi admin tasks', 'admin duties', 'administrator responsibilities oi', 'oi administration'], r: 'As an Operations Intelligence Administrator you manage users and roles, groups and their automations, governance approvals, and platform configuration from the Command console. You also oversee the engine, update set, and credentials. Open Command for the full administrative toolset.' },
            { k: ['oi permissions', 'who can do what', 'access control oi', 'permission matrix oi', 'oi access levels'], r: 'Access in Operations Intelligence follows the four roles: Users run automations and view the Gallery; Creators also build deliverables in Studio; Leadership also manages governance and groups; Administrators also use Command and configure the platform. Say "Who am I?" to see your access.' },
            { k: ['maintenance mode', 'portal under maintenance', 'maintenance window oi', 'oi maintenance', 'maintenance mode oi'], r: 'Maintenance mode lets administrators temporarily restrict the portal during planned work so changes are made safely. While active, some functions may be unavailable to general users. Administrators enable and disable it from the Command console and should communicate the window in advance.' },
            { k: ['export application', 'migrate oi', 'move oi instance', 'deploy oi', 'export operations intelligence'], r: 'Operations Intelligence configuration is captured in its update set and application scope so it can be migrated between instances in a controlled way. Administrators export the update set and the scoped application, then import them in order. Credentials are handled separately and never committed to source.' },
            { k: ['update set oi', 'oi configuration export', 'export oi changes', 'oi update set', 'capture oi changes'], r: 'Operations Intelligence maintains a single in-progress update set named Operations Intelligence that captures all configuration changes within its scope. Administrators use it to migrate changes between instances. The engine ensures only this one update set is used for capture.' },
            { k: ['oi api', 'engine api', 'ops int engine', 'api key oi', 'operations intelligence api', 'engine endpoint'], r: 'Operations Intelligence exposes an engine through a scoped Scripted REST endpoint that performs governed operations under the application scope. It authenticates with a key stored in a scoped system property, never in source. Administrators manage and call the engine for configuration tasks.' },
            { k: ['service account oi', 'svc account', 'oi credentials', 'service account operations intelligence', 'integration account oi'], r: 'Operations Intelligence uses a dedicated service account for its engine and integrations, with access scoped strictly to what it needs. Its credentials are stored in scoped system properties and are never committed to source. Administrators govern its use and rotation.' },
            { k: ['script includes oi', 'oi backend', 'oi server logic', 'operations intelligence script', 'oi backend code'], r: 'The Operations Intelligence backend uses scoped Script Includes for its execution engine and shared server logic, all within the x_infte_ops_int scope. This keeps the solution isolated and maintainable. Changes to backend logic are administrative or developer tasks governed by the update set.' },
            { k: ['oi tables', 'custom tables oi', 'oi database', 'oi schema', 'operations intelligence tables', 'oi data model'], r: 'Operations Intelligence stores its data in scoped tables such as groups, automations, executions, and pending actions under the x_infte_ops_int scope. This isolated schema underpins the Workspace, Gallery, Governance, and Command experiences. Schema changes are administrative and captured in the update set.' },
            { k: ['security incident', 'cybersecurity incident', 'breach', 'data breach', 'security alert', 'report security incident'], r: 'If you suspect a security incident or data breach, act fast: do not attempt to investigate alone, preserve evidence, disconnect a compromised device from the network if advised, and report it immediately through the security incident channel or by raising a high-priority incident. Time matters, so escalate without delay.' },
            { k: ['phishing', 'phishing email', 'suspicious email', 'email fraud', 'social engineering', 'report phishing'], r: 'If you receive a suspicious or phishing email, do not click links or open attachments and do not reply. Report it using your organisation\'s phishing report button or by forwarding it to the security team, then delete it. When unsure, treat unexpected requests for credentials or payment as suspicious.' },
            { k: ['malware', 'virus', 'ransomware', 'suspicious software', 'infected computer', 'malware response'], r: 'If you suspect malware or ransomware, disconnect the device from the network immediately to limit spread, do not power it off if asked to preserve evidence, and contact IT Security right away. Do not pay any ransom. Reporting fast gives the team the best chance to contain the threat.' },
            { k: ['password security', 'strong password', 'password policy', 'password requirements', 'password best practice', 'secure password'], r: 'Use long, unique passwords or passphrases for each account, never reuse them, and store them in an approved password manager rather than writing them down. Enable multi-factor authentication wherever possible. Never share your password, and change it immediately if you suspect it is compromised.' },
            { k: ['mfa setup', 'two factor setup', 'multi factor setup', '2fa setup', 'authenticator', 'set up mfa'], r: 'Set up MFA from your security settings: register an authenticator app or your chosen method, then confirm a test code. MFA adds a strong second layer beyond your password. Keep a backup method enrolled in case you lose access to your primary device.' },
            { k: ['data classification', 'sensitive data', 'confidential data', 'pii', 'data protection', 'classify data'], r: 'Classify data by sensitivity, for example Public, Internal, Confidential, and Restricted, and handle each according to policy, with the strongest controls on personal and confidential data. Share sensitive data only with authorised people through approved channels, and never expose it in screenshots or exports.' },
            { k: ['access review', 'entitlement review', 'user access review', 'quarterly review', 'recertification', 'review access'], r: 'Access reviews periodically confirm that each person still needs their roles and group memberships, removing access that is no longer justified. If you are asked to certify access for your team, review each entitlement honestly and revoke anything unnecessary to uphold least privilege.' },
            { k: ['vulnerability', 'security patch', 'patch management', 'cve', 'vulnerability management', 'apply patches'], r: 'Vulnerabilities are tracked and remediated through patching and configuration changes, prioritised by severity and exposure. Keep your devices and software updated, apply prompted patches promptly, and report any system you believe is unpatched or exposed so it can be remediated.' },
            { k: ['security awareness', 'security training', 'phishing simulation', 'awareness training', 'security education'], r: 'Security awareness training and phishing simulations build the habits that keep you and the organisation safe. Complete assigned training on time, treat simulations as practice, and apply what you learn, especially caution with unexpected emails and requests for credentials.' },
            { k: ['insider threat', 'suspicious activity', 'misuse', 'report suspicious', 'unusual behaviour', 'report misuse'], r: 'If you notice suspicious activity or misuse, such as unauthorised access, unusual data movement, or behaviour that breaches policy, report it through the appropriate confidential channel. Do not confront anyone yourself. Prompt, discreet reporting lets the right team investigate properly.' },
            { k: ['gdpr', 'data privacy', 'privacy policy', 'personal data', 'privacy rights', 'data subject'], r: 'Personal data is protected under privacy regulations such as GDPR, which require lawful, limited, and secure processing and uphold individuals\' rights over their data. Handle personal data only for legitimate purposes, minimise what you collect, and route privacy requests to the responsible team.' },
            { k: ['audit', 'compliance audit', 'sox', 'iso 27001', 'security audit', 'audit readiness'], r: 'Audits verify that controls operate as intended against standards such as SOX or ISO 27001. Keep records accurate and complete, follow defined processes, and retain the evidence auditors expect. If you are asked for audit evidence, provide the authoritative records from the platform.' },
            { k: ['leave request', 'time off', 'vacation request', 'pto', 'annual leave', 'sick leave'], r: 'Request leave through your HR system or the HR catalog: choose the leave type and dates, and submit for your manager\'s approval. Check your balance before requesting, and give as much notice as you can for planned leave. For sickness, follow your absence-reporting process.' },
            { k: ['payroll query', 'salary question', 'pay slip', 'paycheck', 'salary inquiry', 'payslip question'], r: 'For pay, salary, or payslip questions, contact the Payroll or HR team, typically through an HR service request so your query is tracked confidentially. Payslips are usually available in your HR or payroll self-service portal. Avoid sharing salary details over insecure channels.' },
            { k: ['benefits', 'health insurance', 'dental', 'vision', 'enrollment', 'benefits package'], r: 'Find and manage your benefits, including health, dental, and vision, through the HR benefits portal, especially during open enrolment windows. For specific questions or to make changes outside enrolment, raise an HR service request so a benefits specialist can assist you.' },
            { k: ['performance review', 'appraisal', 'annual review', '360 review', 'goal setting', 'performance appraisal'], r: 'Performance reviews and goal setting run through your HR or performance system, where you record objectives, gather feedback, and complete appraisals with your manager. Watch for review-cycle deadlines, prepare examples of your impact, and keep goals specific and measurable.' },
            { k: ['training', 'learning', 'course', 'certification', 'skill development', 'lms'], r: 'Access courses and certifications through your Learning Management System (LMS). Enrol in assigned and elective training, track your progress, and record completed certifications. For role-specific training needs, ask your manager or raise an HR request to arrange it.' },
            { k: ['expense claim', 'expense report', 'reimbursement', 'business expenses', 'claim expenses', 'submit expenses'], r: 'Submit expenses through your expense or finance system: itemise costs, attach receipts, and send for manager approval. Follow the expense policy on eligible costs and limits, submit promptly, and keep receipts. Approved claims are reimbursed per your finance schedule.' },
            { k: ['travel request', 'business travel', 'book travel', 'travel approval', 'arrange travel', 'travel booking'], r: 'Arrange business travel through your travel or HR process: get approval, then book within policy using the approved booking channel. Plan ahead for better fares and required approvals, keep receipts for expenses, and check any travel-risk or visa requirements for your destination.' },
            { k: ['work from home', 'remote work', 'wfh policy', 'home working', 'hybrid work', 'remote work policy'], r: 'Remote and hybrid working follows your organisation\'s policy on eligibility, expectations, and equipment. Confirm your arrangement with your manager, ensure you have a secure connection such as VPN, and follow data-protection rules when working away from the office.' },
            { k: ['timesheet', 'time tracking', 'time entry', 'log time', 'hours worked', 'submit timesheet'], r: 'Record your hours in the timesheet or time-tracking system against the correct projects or categories, and submit by the deadline for approval. Enter time accurately and promptly so reporting and any billing are correct. Ask your manager if you are unsure how to allocate time.' },
            { k: ['emergency contact', 'personal details update', 'address change', 'update emergency contact', 'change address'], r: 'Keep your personal details, including your address and emergency contact, current in your HR self-service profile. Accurate details matter for payroll, benefits, and safety. If a field is locked, raise an HR request to have it updated by the HR team.' },
            { k: ['offboarding', 'leaving company', 'resignation', 'handover', 'last day', 'employee exit'], r: 'Offboarding covers handover, returning equipment, and removing access. Work with your manager and HR on a handover plan, return assets, and complete exit steps. IT will deactivate accounts and reclaim licences on your last day, so finish any personal admin beforehand.' },
            { k: ['slow computer', 'pc slow', 'computer performance', 'computer freezing', 'computer lags', 'machine is slow'], r: 'If your computer is slow, restart it first, then close unused applications and browser tabs and check available disk space. Confirm pending updates have finished installing. If it stays slow after a restart, raise an incident with the symptoms and timing so IT can investigate.' },
            { k: ['blue screen', 'bsod', 'system crash', 'crash dump', 'blue screen error', 'computer crashed'], r: 'A blue screen means the system hit a critical error and restarted. Note any error code or message shown, then restart and see if it recurs. If it happens repeatedly, raise an incident with the error code, what you were doing, and how often it occurs so IT can diagnose it.' },
            { k: ['internet not working', 'no internet', 'wifi not connecting', 'network issue', 'offline', 'cannot connect to network'], r: 'For connectivity issues, check whether other devices are affected, confirm Wi-Fi is on and you are joined to the right network, and restart your router or reconnect. Try a wired connection if available. If it persists or affects others, raise an incident noting your location and what you have tried.' },
            { k: ['email not working', 'outlook issue', 'cant send email', 'email problem', 'email down', 'mailbox issue'], r: 'For email problems, check your internet connection, restart the mail app, and confirm the issue is not a single stuck message. Verify you are not over any mailbox limit. If sending or receiving still fails, raise an incident describing whether it affects sending, receiving, or both.' },
            { k: ['printer not working', 'cant print', 'printer offline', 'print issue', 'printing problem', 'printer error'], r: 'If printing fails, confirm the printer is on and shows online, check for paper or toner and any error light, and try printing a test page. Restart the printer and reconnect if needed. If it stays offline, raise an incident with the printer name or location and the error shown.' },
            { k: ['software crash', 'application not working', 'app freezes', 'software error', 'program crashes', 'app keeps closing'], r: 'If an application crashes or freezes, close and reopen it, restart your computer, and confirm it is up to date. Note any error message. If it keeps failing, raise an incident with the application name, the exact error, and the steps that trigger it so IT can reproduce and fix it.' },
            { k: ['microphone not working', 'audio issue', 'sound problem', 'camera not working', 'webcam', 'no sound'], r: 'For audio or camera problems, check the device is connected and selected as the default in your settings, confirm the app has permission to use it, and unmute or raise the volume. Restart the app and test again. If it still fails, raise an incident noting the device and the app affected.' },
            { k: ['second screen', 'dual monitor', 'display not working', 'screen issue', 'monitor problem', 'external display'], r: 'For display issues, reseat the monitor cable at both ends, confirm the monitor is powered on the right input, and check your display settings to detect and arrange screens. Try a different cable or port. If the screen stays blank, raise an incident with the monitor and connection details.' },
            { k: ['keyboard not working', 'mouse not working', 'peripheral not working', 'usb device', 'device not recognized', 'keyboard mouse issue'], r: 'For a keyboard, mouse, or other peripheral, try a different USB port, reconnect or replace batteries for wireless devices, and restart your computer. Test the device on another machine if you can. If it is still not recognised, raise an incident with the device type and model.' },
            { k: ['storage full', 'disk full', 'low disk space', 'hard drive full', 'out of space', 'clear disk space'], r: 'If your disk is full, empty the recycle bin, clear temporary files and downloads, and remove or archive large files you no longer need locally, moving them to approved cloud storage. If you genuinely need more space, raise a request so IT can help with storage or an upgrade.' },
            { k: ['vpn not connecting', 'vpn issue', 'vpn slow', 'remote access problem', 'vpn drops', 'vpn error'], r: 'For VPN trouble, confirm your internet works without the VPN, restart the VPN client, and reconnect, checking you are using the correct profile and credentials. A different network can help if one is blocked. If it still fails, raise an incident with the error and your connection type.' },
            { k: ['mfa not working', 'two factor fail', 'authenticator issue', '2fa problem', 'cant get code', 'mfa locked'], r: 'If MFA is not working, check your device\'s time is correct, try generating a fresh code, and use a backup method if you have one enrolled. Ensure you are approving the right sign-in prompt. If you have lost access to all methods, contact IT Support to verify your identity and reset MFA.' },
            { k: ['phone issue', 'desk phone', 'softphone', 'voip issue', 'phone not working', 'telephony problem'], r: 'For phone problems, check the handset or headset connection and that you are signed in to the softphone, and confirm your network is up since VoIP relies on it. Restart the phone or app. If calls still fail, raise an incident with your extension and whether it affects inbound, outbound, or both.' },
            { k: ['teams issue', 'zoom issue', 'webex issue', 'video call issue', 'meeting problem', 'video conferencing'], r: 'For conferencing problems, check your internet, confirm the app is updated, and verify your camera and microphone are selected and permitted. Rejoin the meeting or use the dial-in option if available. If quality is poor, a wired connection helps; raise an incident if issues persist across meetings.' },
            { k: ['file share', 'shared drive', 'network drive', 'mapped drive', 'access denied file', 'cannot open file'], r: 'For shared-drive access, confirm you are connected to the network or VPN, reconnect the mapped drive, and check you have permission to the folder. An access-denied error usually means a permission issue. Raise a request for access to the specific share if you need it, naming the path.' },
            { k: ['sharepoint', 'onedrive', 'cloud storage', 'file sync', 'sync issue', 'onedrive not syncing'], r: 'For cloud file sync issues, confirm you are signed in, check the sync client status for errors, and ensure you have space and connectivity. Pausing and resuming sync often clears stuck files. If a file will not sync or shows a conflict, note its name and raise an incident.' },
            { k: ['office 365', 'microsoft 365', 'm365', 'o365 issue', 'microsoft apps', 'office apps not working'], r: 'For Microsoft 365 issues, confirm you are signed in with your work account, check the service is not under a known outage, and restart the affected app. Repairing the Office installation can help persistent problems. If it continues, raise an incident naming the specific app and error.' },
            { k: ['access denied', 'permission denied', 'unauthorized', 'no access', '403', 'forbidden'], r: 'An access-denied or unauthorised error means your account lacks permission to that resource. Confirm you are logged in with the right account, and request access through the catalog with a business justification if you genuinely need it. Include the exact resource and error when raising the request.' },
            { k: ['incident sla pause', 'pause incident sla', 'stop incident clock', 'hold incident timer'], r: 'An incident\'s SLA pauses when you move it to a defined On Hold reason such as Awaiting Caller or Awaiting Vendor, so waiting time is not counted against the target. Use the correct reason and a clear work note, and move it back to In Progress as soon as you can act.' },
            { k: ['caller', 'requested for', 'affected user', 'who is affected', 'incident caller'], r: 'The Caller (or Affected User) is the person experiencing the issue, while the person logging it may differ. Set the Caller accurately so updates reach the right user and reporting reflects true impact. Use the Requested For field on requests for the same reason.' },
            { k: ['assignment group', 'support group', 'which team', 'route ticket', 'assign group', 'team queue'], r: 'The Assignment Group is the team responsible for a record, and routing it correctly gets it to the people who can resolve it fastest. Choose the group that owns the affected service. If you are unsure, the service desk can route it, or pick the closest match and add a note.' },
            { k: ['short description', 'description field', 'summarize issue', 'title the ticket', 'ticket summary'], r: 'Write a clear, specific short description that states the symptom and the affected service, for example "Outlook will not send for the Finance team". Use the full description for detail, steps to reproduce, and error messages. Good summaries speed triage and routing.' },
            { k: ['attach screenshot', 'add attachment', 'attach file to ticket', 'upload file', 'add evidence'], r: 'Attach screenshots, logs, or files to a ticket to give the team the evidence they need, using the attachment control on the record. Capture the full error message in your screenshot. Mind data classification, and avoid attaching anything sensitive that is not necessary.' },
            { k: ['reassign group', 'wrong team', 'misrouted ticket', 'sent to wrong group', 'reroute'], r: 'If a ticket reached the wrong team, update the Assignment Group to the correct one and add a work note explaining the reroute so the new team has context. Avoid bouncing tickets without notes, as clear handovers prevent delay and frustration.' },
            { k: ['close code', 'resolution code', 'how resolved', 'resolution category', 'closure code'], r: 'A resolution or close code categorises how a ticket was resolved, such as Fixed, Workaround, or No Fault Found, supporting accurate reporting and trend analysis. Choose the code that genuinely reflects the outcome and always pair it with a clear resolution note.' },
            { k: ['knowledge from incident', 'create kb from ticket', 'article from incident', 'document the fix'], r: 'When you resolve a novel issue, capture the fix as a knowledge article so the next person can self-serve. Many tools let you create an article directly from the resolved incident. A short, clear article reduces future tickets and speeds resolution.' },
            { k: ['catalog search tips', 'find the right item', 'search catalog better', 'catalog not finding'], r: 'When searching the catalog, use the specific item or service name rather than a sentence, try synonyms, and browse the relevant category if search comes up short. If you still cannot find what you need, the service desk can point you to the right item or create a request for you.' },
            { k: ['my open tasks', 'assigned to me', 'my work', 'my queue', 'tasks assigned to me', 'my assignments'], r: 'To see work assigned to you, check your task or queue view, where incidents, requests, and other tasks awaiting your action are listed. In this portal you can also say "Show my incidents", "Show my requests", or "Show my approvals" and I will list them for you.' },
            { k: ['priority change', 'reprioritize', 'bump priority', 'lower priority', 'adjust priority'], r: 'To change a ticket\'s priority, adjust the Impact and Urgency, which recalculates the priority, and add a work note explaining why. Raising priority should reflect genuine business impact; document the justification so the change is clear and auditable.' },
            { k: ['ticket aging', 'old tickets', 'stale tickets', 'backlog cleanup', 'overdue tickets'], r: 'Aging or stale tickets are those untouched for too long and risk breaching SLAs. Review your queue regularly, update or progress the oldest items first, and close anything already resolved. A report grouped by age helps you target the backlog efficiently.' },
            { k: ['cmdb impact analysis', 'impact analysis', 'blast radius', 'what is affected by change', 'dependency impact'], r: 'Impact analysis uses CI relationships to show everything affected by an incident or change, so you can assess the blast radius before acting. Open the affected CI\'s dependency map. Accurate relationships in the CMDB are what make this analysis trustworthy.' },
            { k: ['catalog approval delay', 'approval taking long', 'stuck in approval', 'request not approving'], r: 'If your request is stuck awaiting approval, open it to see who the approver is, then send a reminder where available or contact them directly. Reminders may also fire automatically. For genuinely urgent needs, ask the service desk about an expedited path.' },
            { k: ['knowledge gap', 'no article found', 'missing knowledge', 'suggest article', 'request kb'], r: 'If you searched and found no helpful article, you have spotted a knowledge gap. Raise a request or note suggesting the article, ideally describing the question and the answer you eventually found. This helps the knowledge team fill the gap for the next person.' },
            { k: ['vip user', 'executive support', 'priority user', 'vip ticket', 'executive incident'], r: 'Designated VIP or executive users may receive enhanced support and tighter SLAs. Their tickets are flagged for priority handling and clear communication. If you support VIPs, follow the defined process and keep them proactively updated throughout the issue.' },
            { k: ['service request vs incident', 'difference between request and incident', 'request or incident', 'which one to raise'], r: 'Use an Incident when something is broken or not working as expected, and a Service Request when you want something new, such as access, equipment, or a service. Choosing correctly routes the work to the right process. When unsure, describe the situation and I can point you to the right one.' },
            { k: ['change vs request', 'difference change request', 'when to raise a change', 'change or request'], r: 'Raise a Change when you are modifying a live service or infrastructure that needs control and approval, and a Service Request for standard, low-risk fulfilment like ordering an item or access. Changes go through assessment and scheduling; requests follow catalog fulfilment.' },
            { k: ['problem vs incident', 'difference problem incident', 'when to raise a problem', 'problem or incident'], r: 'An Incident restores service for a specific disruption, while a Problem investigates the underlying root cause to stop incidents recurring. Raise an incident to fix the immediate impact, and a problem when the same issue keeps coming back and needs a permanent fix.' },
            { k: ['self service', 'help yourself', 'self help', 'do it yourself', 'self service options'], r: 'Many tasks are self-service: reset your password, order from the catalog, search knowledge, and track your requests, all without waiting for an agent. Start in the Service Portal at /sp, or ask me here and I will point you straight to the right place.' },
            { k: ['contact details', 'phone number support', 'support hours', 'when is support open', 'support availability'], r: 'Support hours and contact methods vary by service, but you can always reach help through the Service Portal at /sp, raise an incident for issues, and use the catalog for requests. For urgent matters outside hours, use the emergency support line published for your organisation.' },
            { k: ['feedback', 'suggestion', 'feature request', 'improve the portal', 'idea', 'submit feedback'], r: 'Your feedback helps improve the platform. Share suggestions through the feedback channel or by raising a request describing the idea and the benefit. Concrete examples and the problem you are trying to solve make suggestions much easier to act on.' },
            { k: ['status of everything', 'overview of my items', 'summary of my tickets', 'my dashboard summary'], r: 'For a quick overview, ask me "Show my incidents", "Show my requests", and "Show my approvals" to see each area, or open the portal homepage for a combined view. I can pull each list for you here so you can act without navigating away.' },
            { k: ['escalate request', 'urgent request', 'expedite request', 'rush my request', 'speed up request'], r: 'If a request is genuinely urgent, add a comment to it explaining the business need and deadline, and contact the fulfilling team or service desk to ask about expediting. Approvals and stock can limit how fast it moves, so flag urgency early and clearly.' },
            { k: ['cancel automation', 'stop execution', 'abort run', 'halt automation', 'kill execution'], r: 'If you need to stop a running automation, check the execution record for a stop or cancel option, which may depend on the automation and your role. If none is available, contact your administrator. Note the execution number so the right run can be identified quickly.' },
            { k: ['automation failed', 'execution failed', 'run failed', 'why did it fail', 'failed automation'], r: 'If an execution failed, open its record to read the status detail and any error message, which usually points to the cause. You can correct the inputs and run it again. If the failure is unclear or recurring, share the execution number with your administrator for help.' },
            { k: ['automation permissions', 'cant run automation', 'not entitled', 'no automations', 'access to automation'], r: 'You can only run automations made available through your groups. If you cannot see or run one you need, say "What groups am I in?" to check your memberships, then contact your administrator or the group owner to request access to the automation.' },
            { k: ['gallery empty', 'no deliverables', 'nothing in gallery', 'gallery has nothing', 'empty gallery'], r: 'If your Operations Gallery is empty, no reports or dashboards have been shared with you or created under your access yet. Creators build deliverables in the Studio section, which then appear here. Ask a Creator or your administrator to share the deliverables you need.' },
            { k: ['governance approvals', 'pending governance actions', 'approve in governance', 'governance queue'], r: 'The Governance section lists pending actions awaiting a Leadership or Administrator decision, such as approving an automation for a group or an access change. Open Governance from the sidebar to review each item\'s detail and approve or reject it with a comment.' },
            { k: ['command tools', 'admin tools oi', 'command capabilities', 'what is in command', 'administration console'], r: 'The Command console gives Administrators platform-level controls for Operations Intelligence, including oversight of users, groups, automations, executions, and configuration. It is restricted to the Administrator role; open it from the sidebar if you have that access.' },
            { k: ['who can approve automation', 'automation approval', 'approve an automation', 'automation governance'], r: 'Making an automation available to a group typically requires governance approval by Leadership or an Administrator, recorded as a pending action. Once approved, members of that group can run it. Check the Governance section to see automations awaiting approval.' },
            { k: ['reset my mfa', 'lost authenticator', 'new phone mfa', 'mfa device lost', 're-enroll mfa'], r: 'If you lost the device with your authenticator, use a backup method to sign in and re-enrol a new one in your security settings. If you have no backup method, contact IT Support to verify your identity and reset MFA so you can enrol your new device.' },
            { k: ['account disabled', 'account inactive', 'account suspended', 'my account is disabled', 'reactivate account'], r: 'If your account is disabled, it may be due to inactivity, a security action, or an offboarding step. Contact IT Support or your manager to confirm the reason and request reactivation if appropriate. They can verify your identity and restore access where it is warranted.' },
            { k: ['data export', 'bulk export', 'export records', 'download dataset', 'extract data'], r: 'You can export list data to CSV, Excel, or PDF from the list\'s export action, subject to your access and data-handling rules. For large or sensitive extracts, prefer a scheduled report or ask an administrator, and never export confidential data to unapproved locations.' },
            { k: ['scheduled maintenance notice', 'upcoming maintenance', 'planned outage notice', 'maintenance announcement'], r: 'Planned maintenance is announced in advance with the window and expected impact so you can plan around it. Check the portal announcements or your notifications for upcoming maintenance. During the window, some services may be unavailable as described in the notice.' },
            { k: ['report a bug', 'something looks wrong', 'portal error', 'application bug', 'glitch'], r: 'If you hit a bug or error in the portal, note what you were doing, the exact message, and the time, then raise an incident with those details and a screenshot if possible. Reproducible steps help IT fix it quickly. If it blocks critical work, flag the urgency.' },
            { k: ['language not supported', 'wrong language', 'interface language', 'change interface language'], r: 'If the interface shows the wrong language, set your preferred language in your profile preferences. If your language is not listed, your administrator may need to enable it. Date and number formats follow your locale setting, which you can adjust in the same place.' },
            { k: ['notification not actionable', 'approval link broken', 'cant act on notification', 'notification link not working'], r: 'If a notification link does not let you act, try opening the record directly in the portal and acting there, for example from /sp?id=approvals for approvals. If the link is genuinely broken, raise an incident with the notification details so the template can be checked.' },
            { k: ['incident assignment rules', 'auto assignment', 'assignment routing', 'how is incident assigned'], r: 'Incidents route to an assignment group based on category, affected service, or location rules, and within the group a fulfiller picks them up. If routing seems wrong, set the correct group and add a work note. Good categorisation up front drives accurate auto-assignment.' },
            { k: ['incident sla report', 'incident performance report', 'incident dashboard', 'incident analytics'], r: 'Incident performance is best viewed in a dashboard combining volume, backlog, SLA compliance, and resolution time by priority and group. Build one in the Studio section or use Performance Analytics. Trends here reveal where capacity or process needs attention.' },
            { k: ['incident knowledge link', 'attach article to incident', 'resolve with article', 'suggested resolution'], r: 'When working an incident, search knowledge for a matching fix and attach the article to the resolution so the user and future agents benefit. Many tools suggest relevant articles automatically. Linking the article also feeds knowledge analytics on deflection.' },
            { k: ['incident parent child', 'parent incident', 'child incident', 'related incidents', 'incident hierarchy'], r: 'For widespread issues you can set a parent incident and link children to it, so one investigation and resolution covers them all. Updates and closure can cascade from the parent. Use this with major incidents to manage scale without losing individual records.' },
            { k: ['incident sla extension', 'extend sla', 'sla exception', 'sla waiver', 'justify breach'], r: 'If a breach was unavoidable, document the reason clearly in work notes; some organisations allow an SLA exception or waiver subject to governance. Do not adjust records to hide genuine performance issues. Persistent breaches should drive a process or capacity review.' },
            { k: ['who is assigned', 'assignee', 'current owner', 'responsible person', 'ticket owner'], r: 'The Assigned To field shows who currently owns the record, while the Assignment Group shows the responsible team. Open the record or say "Check INC0001234" to see the assignee. If it is unassigned, a group member needs to pick it up.' },
            { k: ['incident closure notes', 'closure notes', 'closing comments', 'final notes', 'wrap up notes'], r: 'Closure notes summarise the resolution for the record and the requester: what was wrong, what fixed it, and any follow-up. Clear closure notes help future diagnosis of similar issues and give the user confidence the matter is genuinely resolved.' },
            { k: ['variable set', 'catalog variables', 'request form fields', 'item questions', 'catalog questions'], r: 'Catalog items collect details through variables, the questions on the order form, so fulfilment has what it needs. Answer them accurately to avoid back-and-forth. If a required field is unclear, hover for help text or contact the service owner before submitting.' },
            { k: ['delivery address', 'where will it be delivered', 'shipping', 'request delivery location', 'collection point'], r: 'Where a request needs a delivery or collection location, the item form includes an address or location field, so set it correctly. For hardware, confirm your current office or home address per policy. If the field is missing, add a comment specifying where you need it.' },
            { k: ['request comments', 'add comment to request', 'message fulfiller', 'request conversation', 'contact fulfiller'], r: 'Use the comments on your requested item to communicate with the fulfiller, ask for an update, or provide extra information. Comments are tracked on the record. Open your request at /sp?id=requests, choose the item, and add your comment there.' },
            { k: ['reorder', 'order again', 'repeat order', 'duplicate request', 'same as last time'], r: 'To reorder something you have had before, open the same catalog item and submit a new request, or find it in your request history and use a reorder option if available. There is no single button to clone all past orders, so resubmit the specific items you need.' },
            { k: ['catalog availability', 'item out of stock', 'temporarily unavailable', 'stock issue', 'backorder'], r: 'If a catalog item is out of stock, your request may go on hold pending availability, with the hold reason shown on the requested item. The fulfilling team manages restock and will progress it when stock arrives. Add a comment if you have an urgent deadline.' },
            { k: ['gift or loan equipment', 'loaner', 'temporary equipment', 'spare device', 'short term equipment'], r: 'For short-term needs, look for a loaner or temporary-equipment item in the catalog, which provides a device for a defined period before return. If none exists, raise a request describing the need and duration so the service desk can arrange a loan.' },
            { k: ['change ticket number', 'change number', 'crq number', 'find a change', 'look up change'], r: 'Change records carry their own numbers, often prefixed CHG, separate from incidents and requests. Search the change list by number or short description to find one. Use the change calendar to see scheduled changes around a date you care about.' },
            { k: ['change owner', 'change manager', 'who owns the change', 'change coordinator', 'change requester'], r: 'A change has a requester who proposes it and often a change manager or coordinator who shepherds it through assessment and scheduling. Responsibilities are recorded on the change. For questions on a specific change, contact the named owner on the record.' },
            { k: ['change priority', 'urgent vs normal change', 'prioritize change', 'change urgency'], r: 'Change priority reflects urgency and business need and influences scheduling and approval speed, but it does not bypass risk assessment except for genuine emergencies. Set it honestly, and use the emergency type only when an urgent fix truly cannot wait for normal scheduling.' },
            { k: ['change attachments', 'attach plan to change', 'change documentation', 'supporting documents change'], r: 'Attach supporting documents such as detailed runbooks, test evidence, or architecture diagrams to the change so the CAB and implementers have full context. Keep attachments current and relevant. Reference them in the implementation and back-out plan fields.' },
            { k: ['change success rate', 'change kpi', 'failed changes', 'change metrics', 'change quality'], r: 'Change metrics include success rate, emergency change ratio, and the proportion causing incidents. A high failure or emergency ratio signals process gaps. Track these in a dashboard to drive better planning, testing, and risk assessment over time.' },
            { k: ['problem owner', 'problem manager', 'who owns the problem', 'problem coordinator'], r: 'A problem has an owner responsible for driving root-cause analysis to a permanent fix, coordinating the technical teams and tasks. Responsibilities are recorded on the problem. For status on a specific problem, contact its owner or review its activity stream.' },
            { k: ['proactive problem', 'prevent incidents', 'trend analysis problem', 'proactive problem management'], r: 'Proactive problem management analyses incident trends to find and fix latent issues before they cause more disruption, rather than waiting for recurrence. Use incident reporting to spot patterns, then raise problems for the highest-impact trends to prevent future incidents.' },
            { k: ['problem closure', 'close the problem', 'problem resolved criteria', 'when to close problem'], r: 'Close a problem once the permanent fix is deployed and verified to stop the linked incidents recurring, and the review is complete. Record the root cause, the fix, and any preventive actions before closing so the knowledge is preserved for the future.' },
            { k: ['knowledge ownership', 'article owner', 'who maintains article', 'knowledge steward'], r: 'Each article has an owner responsible for keeping it accurate through the review cycle. If an article is wrong or outdated, flag it so the owner can act. For a new article in a domain, the relevant knowledge owner or subject expert is the right author.' },
            { k: ['quick answer', 'self help article', 'how-to guide', 'step by step guide', 'instructions article'], r: 'For step-by-step help, search the knowledge base for a how-to article using the specific task name, for example "set up email on a new phone". Ask me the question directly and I will surface matching articles, or browse categories at /sp?id=kb_home.' },
            { k: ['knowledge search not working', 'kb search no results', 'cant find article', 'search returns nothing'], r: 'If knowledge search returns nothing, try fewer or different keywords, an exact error phrase, or browse the relevant category. Spelling and product names matter. If the content genuinely does not exist, you have found a gap worth suggesting to the knowledge team.' },
            { k: ['response sla', 'first response time', 'time to respond', 'acknowledgement sla', 'response target'], r: 'The response SLA measures how quickly a record is acknowledged and worked after it is logged, distinct from the resolution SLA. Meeting response targets reassures users that their issue is in hand. Pick up new assignments promptly to protect this metric.' },
            { k: ['resolution sla', 'time to resolve sla', 'fix time', 'resolution target', 'resolution clock'], r: 'The resolution SLA measures the time from logging to resolution against the priority target, pausing while the record is on a defined hold. Keep the record moving and use on-hold reasons correctly so the clock reflects genuine active work toward a fix.' },
            { k: ['multiple slas', 'which sla applies', 'overlapping sla', 'sla precedence'], r: 'A record can carry several SLAs at once, such as response and resolution, each tracked independently. The applicable definitions depend on the record\'s conditions like priority and service. View the SLA related list on the record to see every timer and its status.' },
            { k: ['ci ownership', 'ci owner', 'support group for ci', 'who owns this server', 'asset owner'], r: 'Each CI should record an owner and a support group so work routes correctly and accountability is clear. If a CI\'s owner is missing or wrong, update it or ask the CMDB team to correct it. Accurate ownership underpins routing, impact analysis, and audits.' },
            { k: ['ci status', 'operational status', 'ci lifecycle status', 'retired ci', 'active ci'], r: 'A CI\'s status, such as In Use, In Maintenance, or Retired, reflects its lifecycle stage and affects reporting and discovery. Keep status current, and set CIs to Retired during decommissioning so they drop out of active impact analysis and inventories.' },
            { k: ['reconcile cmdb', 'cmdb reconciliation', 'data sources', 'authoritative source', 'cmdb accuracy'], r: 'Reconciliation ensures multiple data sources, like discovery and imports, agree on each CI, with a defined authoritative source per attribute to prevent overwrites. This keeps the CMDB trustworthy. Discrepancies usually point to a source or rule needing adjustment.' },
            { k: ['cmdb query', 'find a ci', 'search cmdb', 'look up asset', 'locate configuration item'], r: 'To find a CI, search the CMDB by name, serial number, or asset tag, or browse by class. Open the CI to see its attributes, relationships, and related incidents and changes. The dependency map shows what it connects to for impact analysis.' },
            { k: ['change my role', 'request elevated access', 'admin rights', 'elevated permissions', 'request admin'], r: 'To request additional or elevated access, raise an access request in the catalog with a clear business justification; sensitive roles route for approval before they are granted. Elevated rights follow least privilege, so request only what the task genuinely requires.' },
            { k: ['profile photo', 'change avatar', 'update picture', 'my photo', 'set profile picture'], r: 'Update your profile photo from your account settings where permitted. A recognisable photo helps colleagues identify you in approvals and chats. If the option is unavailable, your photo may be managed centrally and can be updated via an HR or IT request.' },
            { k: ['manager update', 'wrong manager', 'change my manager', 'reporting line', 'update supervisor'], r: 'Your manager is usually sourced from HR or the directory, so corrections start there. If your reporting line is wrong, it affects approvals routed to your manager, so raise an HR request to fix it. Once corrected, future approvals route to the right person.' },
            { k: ['approval comments visible', 'can requester see approval comment', 'approval transparency', 'approver notes'], r: 'Comments you add when approving or rejecting are typically visible to the requester on the request, so write them to be clear and constructive. For sensitive internal context, check whether a work note rather than a customer-visible comment is more appropriate.' },
            { k: ['reassign approval', 'wrong approver', 'approval sent to me by mistake', 'forward approval'], r: 'If an approval reached you in error, do not simply reject it; add a comment explaining and ask the requester or process owner to route it to the correct approver. Where delegation or reassignment is supported, use it. Clear handling avoids blocking the request.' },
            { k: ['approval audit report', 'approvals over time', 'approval metrics', 'approval turnaround'], r: 'Approval metrics such as average turnaround and overdue approvals reveal bottlenecks in your processes. Build a report on the approval table grouped by approver or item to see where requests wait. Faster, well-governed approvals improve the overall experience.' },
            { k: ['digest notification', 'summary email', 'daily digest', 'batched notifications', 'one email per day'], r: 'Some notifications can be batched into a digest so you receive a single summary rather than many individual emails. Where offered, choose the digest option in your notification preferences. This reduces noise while keeping you informed of the day\'s activity.' },
            { k: ['notification recipients', 'who gets notified', 'notification audience', 'cc on notification'], r: 'Each notification defines its recipients, which may include the assignee, watch-list members, the caller, and managers. If the wrong people are notified or someone is missing, the template needs adjustment by an administrator. Watch lists let you add recipients per record.' },
            { k: ['report subscription manage', 'manage scheduled reports', 'stop report email', 'unsubscribe report'], r: 'Manage your report subscriptions to add, change, or stop scheduled deliveries. If you receive a scheduled report you no longer need, ask the owner to remove you or adjust the subscription. Keeping subscriptions tidy reduces inbox clutter and unnecessary processing.' },
            { k: ['report data accuracy', 'report numbers wrong', 'report not matching', 'report discrepancy'], r: 'If a report\'s numbers look wrong, check its filter conditions, the time range, and any access restrictions that limit visible rows, since these commonly explain discrepancies. Compare against the source list with the same filter. If it still differs, ask the report owner to review the definition.' },
            { k: ['homepage', 'responsive dashboard', 'landing page', 'my homepage', 'default dashboard'], r: 'Your homepage or landing dashboard gives an at-a-glance view of the metrics and lists you care about. Configure it with the widgets relevant to your role, and set it as your default. In this portal, the sidebar sections provide your role-specific home views.' },
            { k: ['breadcrumbs', 'navigation trail', 'where am i', 'current location', 'navigation path'], r: 'Breadcrumbs at the top of a record or page show your navigation trail so you can step back to a list or parent record without losing your place. Use them with your history list to move efficiently between related records during an investigation.' },
            { k: ['list view density', 'compact list', 'list display options', 'rows per page', 'list pagination'], r: 'Adjust how many rows a list shows per page and its density to suit your screen and task, using the list controls or your preferences. Showing more rows speeds scanning, while pagination keeps large lists responsive. Combine with filters to focus on what matters.' },
            { k: ['sort list', 'order by column', 'sort records', 'arrange list', 'list sorting'], r: 'Sort a list by clicking a column header, or set the sort order in the filter to bring the most relevant records to the top, for example oldest first to tackle aging work. Combine sorting with grouping and filtering to organise your queue effectively.' },
            { k: ['group by', 'grouped list', 'aggregate list', 'list grouping', 'collapse groups'], r: 'Group a list by a field, such as priority or assignment group, to see counts and collapse sections, turning a flat list into a quick summary. This helps you spot concentrations and work systematically. Expand a group to act on its records.' },
            { k: ['portal search not working', 'sp search no results', 'portal cant find', 'search broken portal'], r: 'If portal search returns nothing useful, try more specific terms, an exact record number, or browse the catalog and knowledge categories directly. You can also ask me here and I will search the catalog and knowledge base for you and return the best matches.' },
            { k: ['portal announcements', 'portal news', 'portal banner', 'portal messages', 'announcements'], r: 'Portal announcements share important news such as planned maintenance, outages, or new services, usually as a banner or news area on the homepage. Check them when you sign in so you are aware of anything that might affect your work that day.' },
            { k: ['secure file sharing', 'share sensitive file', 'encrypt file', 'safe file transfer', 'protect attachment'], r: 'Share sensitive files only through approved, secure channels with appropriate access controls, and avoid emailing confidential data or posting it in open locations. Apply the correct data classification, and when in doubt, ask the security team for the approved method.' },
            { k: ['suspicious link', 'is this link safe', 'check a url', 'clicked a bad link', 'phishing link'], r: 'Do not click links you are unsure about; hover to inspect the real destination and verify the sender through a trusted channel. If you have already clicked a suspicious link or entered credentials, change your password immediately and report it to IT Security.' },
            { k: ['lost device', 'stolen laptop', 'lost phone', 'device theft', 'report lost device'], r: 'If a work device is lost or stolen, report it to IT and Security immediately so they can lock, wipe, or disable access remotely and revoke credentials. Speed limits exposure of any data on the device. Then raise a request for a replacement.' },
            { k: ['clean desk', 'screen lock', 'lock my screen', 'unattended computer', 'workstation security'], r: 'Protect information by locking your screen whenever you step away and keeping sensitive material off your desk and screen, following the clean-desk principle. A quick screen lock prevents unauthorised access to your session and the systems you can reach.' },
            { k: ['org chart', 'who is my manager', 'find a colleague', 'employee directory', 'company directory'], r: 'Find colleagues and reporting lines in the employee directory or org chart, searching by name, team, or role. This is useful for routing requests and finding the right approver or expert. Your own manager appears on your profile under your reporting line.' },
            { k: ['probation', 'new starter checklist', 'first week tasks', 'onboarding checklist', 'induction'], r: 'New starters typically follow an onboarding checklist covering accounts, equipment, training, and introductions. Work through it with your manager, and use the catalog and this Assistant to request what you need. Say "onboarding help" for a quick starter guide.' },
            { k: ['internal job', 'career opportunities', 'transfer role', 'apply internally', 'job posting'], r: 'Internal opportunities and transfers are usually posted in the HR or careers system. Review openings there, discuss interest with your manager where appropriate, and follow the application process. For questions, raise an HR request or contact your HR partner.' },
            { k: ['password manager', 'vault', 'store passwords', 'credential manager', 'remember passwords'], r: 'Use your organisation\'s approved password manager to store unique, strong passwords securely, rather than reusing them or writing them down. It autofills credentials and reduces risk. If you need access to the password manager, raise a request for it.' },
            { k: ['browser issue', 'clear cache', 'browser cache', 'cookies', 'page not loading', 'clear cookies'], r: 'If a web page misbehaves, clear your browser cache and cookies, try a private window, and confirm the browser is up to date and supported. Disabling heavy extensions can help. If the issue is isolated to one site, note the exact URL and error when raising an incident.' },
            { k: ['proxy', 'proxy settings', 'corporate proxy', 'internet through proxy', 'proxy error'], r: 'On the corporate network, internet traffic may route through a proxy, and misconfigured proxy settings can block access. If sites fail to load on the office network but work elsewhere, the proxy or your network profile may be the cause; raise an incident with the symptoms.' },
            { k: ['certificate error', 'ssl error', 'site not secure', 'invalid certificate', 'security warning browser'], r: 'A certificate or SSL warning means the site\'s security certificate could not be validated, which can indicate an expired certificate or a network interception. Do not bypass warnings on sensitive sites. Report the affected site and the exact warning to IT for investigation.' },
            { k: ['slow application', 'app performance', 'application lagging', 'program slow', 'app responding slowly'], r: 'If a specific application is slow, close and reopen it, check your network and device load, and confirm it is updated. Note whether others are affected, which suggests a server-side issue. Raise an incident with the app name, timing, and whether colleagues see it too.' },
            { k: ['update available', 'software update', 'apply update', 'pending updates', 'install updates'], r: 'Apply prompted software and security updates promptly, restarting when asked so they finish installing, as updates fix bugs and vulnerabilities. If an update fails repeatedly or you cannot install one you need, raise an incident with the software and error.' },
            { k: ['admin password', 'local admin', 'install software myself', 'elevated install', 'need admin to install'], r: 'Installing software often requires elevated rights you may not have by default. Request the application through the catalog so it is deployed properly and licensed, or request temporary elevation with justification where that process exists. Avoid unapproved installations.' },
            { k: ['screen sharing', 'remote support', 'it remote into my pc', 'remote assistance', 'share my screen with it'], r: 'For hands-on help, IT can connect to your device with your permission through the approved remote-support tool. You will be asked to accept the session. Only accept remote-support requests you initiated or expected, and confirm the agent\'s identity if unsure.' },
            { k: ['default printer', 'set default printer', 'printer setup', 'add a printer', 'install printer'], r: 'Add or set a default printer from your device\'s printer settings, choosing the correct printer by name or location. For network printers, you may need to be on the office network or VPN. If a printer is not listed, raise a request to have it added.' },
            { k: ['email signature', 'set up signature', 'signature not showing', 'update signature', 'company signature'], r: 'Configure your email signature in your mail application\'s settings, following any corporate signature standard. If a standard signature is provided centrally, apply the supplied template. For help meeting the standard, check the knowledge base or raise a request.' },
            { k: ['calendar sharing', 'share calendar', 'calendar permissions', 'see someones calendar', 'book a room'], r: 'Share your calendar or grant access through your mail and calendar application\'s sharing settings, choosing the right permission level. To view a colleague\'s free or busy time, add their calendar. For room booking, use the calendar\'s room or resource feature.' },
            { k: ['distribution list', 'mailing list', 'group email', 'email a team', 'add to distribution list'], r: 'Distribution lists let you email a whole team with one address. To be added to or removed from a list, or to create one, raise a request specifying the list and the change. Use lists responsibly and avoid reply-all on large audiences.' },
            { k: ['what else can you do', 'more commands', 'other things you do', 'additional help', 'show me more'], r: 'Beyond the basics, I can explain incidents, problems, changes, SLAs, the CMDB, knowledge, security, HR services, and common IT fixes, and I can show your records and run automations you are entitled to. Ask a specific question or type "help" for the menu.' },
            { k: ['you misunderstood', 'that is not what i meant', 'wrong answer', 'not helpful', 'try again'], r: 'I am sorry I missed the mark. Please rephrase with a few specific keywords, for example the system name, the action, or a record number, and I will try again. You can also type "help" to see the kinds of things I can do.' },
            { k: ['talk to a person', 'human agent', 'real person', 'speak to a human', 'live agent'], r: 'If you would like a person, raise an incident or service request and the relevant team will pick it up, or contact the service desk directly through the portal at /sp. For urgent issues, use your published support line. I can also create the right ticket type if you tell me the issue.' },
            { k: ['emergency', 'urgent help', 'critical issue now', 'need help immediately', 'this is urgent'], r: 'For a genuine emergency or critical outage, contact the IT helpdesk directly using your published support line so it is triaged immediately, and say "major incident" if many users are affected. I can guide you to log it, but live emergencies need that direct, fast channel.' },
            { k: ['where is my data', 'data location', 'data residency', 'where is information stored', 'data hosting'], r: 'Questions about where data is stored or processed relate to data residency and hosting arrangements governed by your organisation\'s policies and contracts. For specifics, raise a request to the data protection or platform team, who can confirm the hosting and residency details.' },
            { k: ['cost of service', 'service pricing', 'what does this cost', 'chargeback for service', 'budget for it'], r: 'Costs and chargeback for services are owned by the service owner and finance, and where applicable a catalog item shows a price. For budget questions or cost allocations, contact the service owner or your finance partner through a request so it is tracked.' },
            { k: ['service owner', 'who owns this service', 'responsible team', 'service contact', 'service manager'], r: 'Each service has an owner accountable for its delivery, roadmap, and support arrangements. To find a service owner, check the service record in the CMDB or ask the service desk. For requests or escalations about a service, route them to the owning team.' },
            { k: ['continual improvement', 'process improvement', 'csi', 'improve a process', 'suggest improvement'], r: 'Continual improvement captures ideas to make services and processes better over time, drawing on metrics, reviews, and feedback. Submit improvement suggestions through the feedback or request channel with the problem and proposed benefit so they can be prioritised.' },
            { k: ['audit log', 'who changed this', 'record history meta', 'sys audit', 'field history'], r: 'Most records keep an audit history of field changes with the user and timestamp, viewable in the record\'s activity or history view. This is the authoritative trail for who changed what and when, useful for handovers, troubleshooting, and compliance.' },
            { k: ['data retention', 'how long is data kept', 'retention policy', 'archive records', 'delete old data'], r: 'Data retention is governed by policy, with records kept for a defined period and then archived or purged. For specifics on a record type\'s retention, consult the relevant policy or raise a request to the platform or compliance team for confirmation.' },
            { k: ['incident reminder', 'follow up incident', 'chase incident', 'update on incident', 'any progress'], r: 'To chase an incident, open it and add a customer-visible comment requesting an update, or contact the assignment group. Say "Check INC0001234" here and I will show its current state, priority, assignee, and last update so you know where it stands.' },
            { k: ['incident attachments missing', 'cant attach to incident', 'attachment failed', 'upload failed'], r: 'If you cannot attach a file to an incident, check the file size and type against any limits, and try a different browser or a fresh page load. For large logs, compress them first. If uploads still fail, raise an incident describing the file and the error.' },
            { k: ['catalog item description', 'what does this item do', 'item details', 'about this catalog item'], r: 'Each catalog item includes a description explaining what it provides, any prerequisites, and the expected fulfilment time. Open the item to read it before ordering. If the description is unclear, the service owner can clarify, or ask me and I will search for related items.' },
            { k: ['request approval status', 'is my request approved', 'approval pending on request', 'check approval'], r: 'To see your request\'s approval status, open it at /sp?id=requests and review the approvers and their decisions. If it is pending, you can see who needs to approve. Say "Show my requests" and I will list them so you can drill into the one you mean.' },
            { k: ['change schedule conflict resolution', 'resolve change conflict', 'reschedule change', 'move change window'], r: 'If your change conflicts with another, coordinate with the other change owner and pick a clear slot on the change calendar, then update your window. Document the agreed schedule on both changes. Avoid overlapping work on the same CIs to reduce risk.' },
            { k: ['problem candidate', 'should i raise a problem', 'problem trigger', 'when problem needed'], r: 'Consider raising a problem when incidents recur with the same symptom, a major incident needs a root cause, or a workaround is masking an underlying fault. The aim is to fix the cause permanently. Link the related incidents so the fix resolves them together.' },
            { k: ['knowledge approval pending', 'article stuck in review', 'publish delay', 'article not published'], r: 'If an article is stuck in review, contact the assigned reviewer or knowledge manager to progress it. Ensure it meets the content standards, which speeds approval. Once approved, it becomes searchable. Reviewers may also be reminded automatically as time passes.' },
            { k: ['sla schedule change', 'sla calendar wrong', 'wrong business hours', 'sla timing off'], r: 'If an SLA seems to count time incorrectly, the schedule or holidays applied to it may be wrong. Confirm whether the target should run in business hours or around the clock. Report the specific record and expected behaviour so an administrator can review the SLA definition.' },
            { k: ['cmdb relationship missing', 'no dependencies shown', 'add relationship', 'link cis', 'connect cis'], r: 'If a CI shows no dependencies, its relationships may be missing, which weakens impact analysis. Add the correct relationships on the CI, or ask the CMDB team to populate them, ideally through discovery. Accurate relationships are what make impact analysis reliable.' },
            { k: ['user cannot access', 'colleague has no access', 'grant access to user', 'provision access for someone'], r: 'To grant a colleague access, they or their manager should raise an access request with justification, which routes for approval. As an admin or group owner you can add them to the relevant group or role. Least-privilege still applies, so request only what is needed.' },
            { k: ['approval delegate not working', 'delegation not applying', 'delegate cannot see approvals'], r: 'If a delegate is not receiving approvals, confirm the delegation is active with valid start and end dates and covers approvals specifically. Both parties should check their preferences. If it still fails after the dates are correct, raise an incident for investigation.' },
            { k: ['notification frequency', 'too frequent notifications', 'notification overload', 'reduce alert frequency'], r: 'If you are getting too many notifications, review your preferences and opt out of non-essential ones, switch some to in-portal only, or use a digest where offered. Watch lists you joined also generate updates, so remove yourself from records you no longer need to follow.' },
            { k: ['report scheduling failed', 'scheduled report not sent', 'report email missing', 'report did not arrive'], r: 'If a scheduled report did not arrive, check the schedule is active, the recipients are correct, and your email is not filtering it. The report may have failed to generate if its data source changed. Ask the owner to review the schedule, or raise an incident if delivery is broken.' },
            { k: ['favorites missing', 'lost my favorites', 'favorites not showing', 'restore favorites'], r: 'If your favourites disappeared, confirm you are signed in with the right account, since favourites are per user. They may also be collapsed in the navigation. Re-add any that are genuinely missing. If they vanished unexpectedly across the board, raise an incident.' },
            { k: ['portal slow on mobile', 'mobile portal slow', 'portal lag on phone', 'slow on phone'], r: 'If the portal is slow on your phone, check your mobile connection, close other apps, and try the dedicated mobile app for a faster, app-like experience. Persistent slowness for many users is a platform issue worth raising with details of your device and network.' },
            { k: ['mfa backup codes', 'recovery codes', 'backup authentication', 'lost mfa access', 'mfa recovery'], r: 'Generate and safely store MFA backup or recovery codes from your security settings so you can sign in if you lose your primary device. Treat them like passwords. If you have no codes and lose access, contact IT Support to verify your identity and reset MFA.' },
            { k: ['security policy', 'acceptable use', 'it policy', 'usage policy', 'security rules'], r: 'Acceptable use and security policies define how to use systems and handle data responsibly. Find them in the knowledge base or your policy portal, and follow them in daily work. If a task seems to conflict with policy, pause and check with the security team before proceeding.' },
            { k: ['expense rejected', 'expense query', 'expense not paid', 'reimbursement delay', 'expense status'], r: 'If an expense was rejected or delayed, read the approver\'s or finance team\'s comments for the reason, correct it, and resubmit per the expense policy. For payment timing, check the finance schedule. Raise an HR or finance request if the status is unclear.' },
            { k: ['training overdue', 'mandatory training', 'complete training', 'training deadline', 'assigned course'], r: 'Complete assigned and mandatory training by its deadline in the learning system to stay compliant. Overdue training may be escalated to your manager. If you cannot access a course or the deadline is unrealistic, raise an HR or learning request to resolve it.' },
            { k: ['vpn setup', 'install vpn', 'configure vpn', 'first time vpn', 'get vpn access'], r: 'To get VPN access, request it through the Service Catalog, then install and configure the approved client per the provided guide, signing in with your credentials and MFA. If you already have access but it will not connect, say "VPN not connecting" for troubleshooting steps.' },
            { k: ['wifi setup', 'connect to office wifi', 'corporate wifi', 'join wifi', 'wireless setup'], r: 'To join the corporate Wi-Fi, select the official network and authenticate with your work credentials or a provided certificate, following the setup guide for your device. For guest access, use the guest network. If you cannot connect, raise an incident with your device and location.' },
            { k: ['new phone setup', 'set up work phone', 'mobile device setup', 'enroll device', 'byod setup'], r: 'Setting up a work or personal device for company use usually involves enrolling it in mobile management and installing required apps, following the provided guide. Request enrolment through the catalog if needed. Enrolment applies security policy to protect company data on the device.' },
            { k: ['account expiry', 'password about to expire', 'password expiry warning', 'renew password', 'expiring credentials'], r: 'If your password is about to expire, change it proactively from your security settings or at the next sign-in prompt, choosing a strong, unique password. Doing it before expiry avoids a lockout. If it has already expired, use self-service reset or contact IT Support.' },
            { k: ['shared mailbox', 'team mailbox', 'access shared mailbox', 'group mailbox', 'functional mailbox'], r: 'Shared and team mailboxes let several people manage a common address. To get access, raise a request naming the mailbox and the level of access needed, which routes for the owner\'s approval. Once granted, add the mailbox in your mail application.' },
            { k: ['guest access', 'external user', 'contractor access', 'partner access', 'third party login'], r: 'Granting access to a guest, contractor, or partner follows a governed process with sponsorship and approval, scoped to the minimum needed and time-limited where possible. Raise a request specifying who needs access, to what, and for how long, and it will route for approval.' },
            { k: ['archived ticket', 'old request', 'closed long ago', 'find historical ticket', 'past tickets'], r: 'To find an old or archived ticket, search the relevant list by number, requester, or date range, including closed records. Your history view also holds recently opened items. If a very old record is not visible, retention or archiving may apply; ask the service desk.' },
            { k: ['bulk request', 'order for whole team', 'many users request', 'team onboarding request', 'mass provisioning'], r: 'To equip a whole team, use an order guide if one exists, or raise a request listing each person and what they need, since bulk provisioning often needs coordination. The service desk can advise the most efficient path for larger onboarding or rollouts.' },
            { k: ['recurring meeting issue', 'meeting room booking failed', 'resource booking', 'book equipment', 'reserve a room'], r: 'Book rooms and shared resources through the calendar\'s room or resource feature, checking availability before sending the invite. If a booking fails or a room is double-booked, the resource may be misconfigured; raise a request naming the room so it can be corrected.' },
            { k: ['license request', 'software entitlement', 'need a license', 'assign license', 'request software license'], r: 'To get a software licence, request the application through the catalog, which checks entitlement and assigns a licence as part of fulfilment. If you already have the software but lack a licence, raise a request naming the product so a licence can be allocated.' },
            { k: ['decommission request', 'remove a server', 'retire application', 'shut down service', 'sunset system'], r: 'Decommissioning a system is a controlled change: confirm it is unused, update dependent CIs and relationships, communicate to stakeholders, and execute within a window with a back-out option. Raise a change to plan it, and update the CMDB to retire the CIs afterwards.' },
            { k: ['service request status meaning', 'request stages explained', 'what stage is my request', 'request state meaning'], r: 'Requests progress through stages such as Submitted, Approval, Fulfilment, and Closed Complete. Each requested item can be at a different stage. Open your request at /sp?id=requests to see the current stage and any pending step. Say "Show my requests" and I will list them.' },
            { k: ['incident worklog', 'log activity on incident', 'record actions', 'document work done'], r: 'Record what you do on an incident in work notes as you go, so the activity log captures diagnosis, actions, and decisions with timestamps. Good worklogs make handovers smooth and speed future diagnosis of similar issues. Use customer comments to keep the user updated.' },
            { k: ['change advisory roles', 'cab members', 'who sits on cab', 'change board roles'], r: 'CAB members typically include the change manager, service owners, technical leads, and representatives for risk and security as needed. Each assesses the change from their perspective. Provide a complete plan and risk assessment so the board can decide efficiently.' },
            { k: ['problem workaround communication', 'share workaround', 'publish workaround', 'tell users workaround'], r: 'When a workaround exists, document it on the problem and the known error, and ensure the service desk can apply it to matching incidents. Where appropriate, publish a knowledge article so affected users can self-serve until the permanent fix is deployed.' },
            { k: ['knowledge categories management', 'reorganize kb', 'kb taxonomy', 'knowledge structure change'], r: 'Reorganising knowledge categories and bases is a governance task owned by knowledge managers, balancing findability with maintainability. If the current structure makes articles hard to find, suggest improvements through the feedback channel with examples of what you struggled to locate.' },
            { k: ['sla notification recipients', 'who gets sla alerts', 'sla warning recipients', 'breach notification'], r: 'SLA warning and breach notifications typically go to the assignee, the assignment group, and its manager so action is taken before or right after a target is missed. If the wrong people are notified, the SLA or notification configuration needs an administrator\'s review.' },
            { k: ['cmdb import', 'load cis', 'bulk add cis', 'import configuration items', 'ci data load'], r: 'Bulk-loading CIs uses import sets and transform maps with coalesce fields to update rather than duplicate existing records. Validate a sample first and follow naming and class standards. Where possible, prefer discovery so CIs and relationships stay current automatically.' },
            { k: ['account merge', 'duplicate user account', 'merge users', 'two accounts same person'], r: 'If a person has duplicate accounts, do not simply delete one, as history is attached to each. Raise a request so the identity team can reconcile or merge them correctly, keeping the authoritative account and preserving records. Future duplicates are best prevented at the source directory.' },
            { k: ['approval reassignment audit', 'track delegated approvals', 'delegation history', 'who approved via delegate'], r: 'When a delegate approves on someone\'s behalf, the approval history records both the delegate and the original approver, preserving accountability. Review the approval trail on the request to see exactly who acted and under what delegation. This is the authoritative audit record.' },
            { k: ['notification testing', 'test a notification', 'preview notification', 'send test email'], r: 'Testing a notification is an administrative task: an admin can preview the template and send a test to confirm content and recipients before enabling it broadly. If a notification\'s wording or audience is wrong, request the change so it can be edited and re-tested.' },
            { k: ['report ownership transfer', 'change report owner', 'transfer report', 'reassign report'], r: 'If a report owner leaves or changes role, ownership should transfer so the report stays maintained and shareable. Ask an administrator to reassign ownership, or recreate the report under a current owner. Unowned reports risk going stale, so keep ownership current.' },
            { k: ['list export limits', 'export too large', 'cannot export all rows', 'export row limit'], r: 'Very large list exports may be capped for performance. If your export is truncated, tighten the filter to the rows you actually need, or use a scheduled report for large datasets. For bulk extracts, ask an administrator about the appropriate, supported method.' },
            { k: ['portal accessibility', 'portal screen reader', 'accessible portal', 'portal high contrast'], r: 'The Service Portal supports accessibility, including screen-reader compatibility, keyboard navigation, and high-contrast options. Enable the settings you need in your preferences. If you encounter a barrier in the portal, raise an incident describing it so it can be fixed.' },
            { k: ['mobile sync issue', 'mobile not updating', 'app out of date', 'mobile refresh', 'app not syncing'], r: 'If the mobile app shows stale data, pull to refresh, confirm you are online, and ensure the app is updated to the latest version. Signing out and back in can clear a stuck session. If data still will not sync, raise an incident noting the app version and device.' },
            { k: ['scope conflict', 'cross scope access', 'scope error', 'application access error'], r: 'Cross-scope access is governed explicitly, so an application in one scope cannot freely touch another\'s tables or scripts without permission. A scope error usually means the access is not granted by design. This is a developer and administrator concern, raised as a configuration request.' },
            { k: ['operations intelligence help', 'oi how to', 'how do i use operations intelligence', 'oi getting started', 'oi guide'], r: 'To get started in Operations Intelligence, open the Workspace to run automations, the Operations Gallery to view deliverables, and, if you have the role, Studio to build them, Governance to approve, and Command to administer. Ask me about any section or say "help" for the menu.' },
            { k: ['operations intelligence support', 'oi issue', 'problem with this portal', 'oi not working', 'report oi problem'], r: 'If something in Operations Intelligence is not working, note what you were doing and any error, then contact your platform administrator, who oversees the engine and configuration. For broader IT issues unrelated to this portal, say "Create an incident" and I will guide you.' },
            { k: ['execution details', 'open an execution', 'view execution', 'execution record', 'inspect run'], r: 'To inspect a run, open its execution record to see the automation, status, who triggered it, the timestamps, and any output or error detail. Say "Show recent executions" and I will list your latest runs so you can identify the one you want to examine.' },
            { k: ['group automations', 'automations for my group', 'what can my group run', 'group automation list'], r: 'The automations available to you come from the groups you belong to. Say "Show my automations" to list them with their owning groups, or "What groups am I in?" to see your memberships. To gain access to more, contact the group owner or your administrator.' },
            { k: ['role request oi', 'request creator role', 'request leadership role', 'get oi role', 'elevate oi access'], r: 'Operations Intelligence access is granted through roles and group membership managed by administrators in Governance or Command. To request the Creator, Leadership, or another role, contact your administrator with the business reason, and they can enrol you appropriately.' },
            { k: ['data classification handling', 'handle confidential data', 'restricted data rules', 'data handling'], r: 'Handle each data class per policy, applying the strongest controls to confidential and restricted data: limit access, use approved channels, and avoid exposing it in exports, screenshots, or messages. When unsure of a data item\'s classification, treat it as sensitive and check.' },
            { k: ['secure printing', 'confidential print', 'print release', 'badge to print', 'follow me print'], r: 'Where secure printing is in place, your job holds at the printer until you release it with your badge or PIN, protecting confidential documents from sitting in the tray. If a print job will not release, check you are at an enabled printer and raise an incident if it fails.' },
            { k: ['benefits enrollment deadline', 'open enrollment', 'enroll benefits deadline', 'benefits window'], r: 'Benefits changes are usually made during an open-enrolment window or after a qualifying life event. Watch for the enrolment deadline in the HR portal and make your selections in time. For changes outside the window, raise an HR request explaining the qualifying event.' },
            { k: ['payslip access', 'where is my payslip', 'download payslip', 'view pay statement'], r: 'Access your payslips in the HR or payroll self-service portal, where you can view and download recent statements. If a payslip is missing or looks wrong, raise a confidential payroll request so a specialist can review it. Avoid sharing pay details over insecure channels.' },
            { k: ['device replacement', 'replace broken laptop', 'faulty device', 'swap equipment', 'device exchange'], r: 'If a work device is faulty, raise a request or incident describing the fault so IT can repair or replace it, and ask about a loaner if you need cover meanwhile. Back up your data to approved storage first where possible, and return the faulty device as instructed.' },
            { k: ['data backup', 'back up my files', 'where to save files', 'file backup', 'protect my data'], r: 'Save work files to approved cloud or network storage rather than only on your device, so they are backed up and accessible if your device fails. Local files may not be recoverable. If you are unsure where to store something, check the data-handling guidance or ask IT.' },
            { k: ['guest wifi', 'visitor wifi', 'wifi for guests', 'temporary wifi', 'event wifi'], r: 'Guests connect using the guest Wi-Fi network, which is separate from the corporate network and may require a code or sponsor. For visitors needing more than basic internet, raise a request in advance. Keep corporate credentials off guest networks.' },
            { k: ['conference room tech', 'meeting room equipment', 'room screen not working', 'av in meeting room', 'room booking tech'], r: 'If meeting-room technology such as the screen, camera, or conferencing system is not working, try the room\'s quick-start guide and a cable reseat, then use the room support contact if provided. Raise an incident naming the room and the fault so it is fixed before the next booking.' },
            { k: ['software uninstall', 'remove software', 'uninstall application', 'clean up apps', 'remove program'], r: 'To remove software safely, use the approved software portal or request removal so licences are reclaimed and dependencies are respected, rather than deleting files manually. If an application must go for security or licensing reasons, raise a request naming it.' },
            { k: ['printer toner', 'replace toner', 'out of ink', 'printer consumables', 'order toner'], r: 'When a printer is low on toner or ink, request the consumable through the catalog or notify the team that manages that printer, quoting the printer model so the correct cartridge is ordered. For shared printers, facilities or IT usually maintain a stock.' },
            { k: ['facilities request', 'building issue', 'office maintenance', 'desk move', 'facilities help', 'heating cooling'], r: 'For facilities matters such as a building fault, desk move, or environment issue, raise a facilities request in the catalog describing the location and the problem. For anything unsafe, follow your site\'s safety reporting first, then log the request so it is tracked.' },
            { k: ['parking', 'car park access', 'parking permit', 'reserve parking', 'parking request'], r: 'Parking access and permits are usually arranged through a facilities or HR request, specifying your site and the dates needed. Availability can be limited, so request in advance. For visitor parking, raise the request ahead of the visit with the details.' },
            { k: ['building access', 'door access', 'badge access', 'access card not working', 'enter building'], r: 'Building and door access is tied to your badge. If your badge will not open a door you should reach, raise a request naming the location so access can be granted, or contact site security for immediate help. Report a lost badge promptly so it can be disabled.' },
            { k: ['catering', 'event catering', 'book catering', 'refreshments', 'meeting catering'], r: 'Arrange catering or refreshments for a meeting or event through the relevant facilities or catering request, giving the date, headcount, and any dietary requirements with enough notice. Confirm budget approval where needed before booking.' },
            { k: ['stationery', 'office supplies', 'order supplies', 'desk supplies', 'stationery request'], r: 'Order stationery and office supplies through the catalog or your team\'s supplies process, listing the items and quantity. For shared-area supplies, notify the team that manages them. Keep requests reasonable and grouped to streamline fulfilment.' },
            { k: ['health and safety', 'report a hazard', 'safety concern', 'accident report', 'first aid'], r: 'For a safety hazard or incident, follow your site\'s health-and-safety reporting process first, especially for anything urgent or involving injury, then log a record so it is tracked. Know your nearest first-aider and exits. Treat genuine emergencies with the appropriate emergency services.' },
            { k: ['visitor', 'register a visitor', 'guest arriving', 'book a visitor', 'sign in visitor'], r: 'Register expected visitors in advance through the visitor or reception process, giving their name, company, and arrival time so passes and access are ready. Meet your visitor at reception and follow escort rules. Pre-registration speeds their arrival and keeps the site secure.' },
            { k: ['accessibility request', 'workplace adjustment', 'reasonable adjustment', 'accommodation request', 'assistive technology'], r: 'If you need a workplace adjustment or assistive technology, raise a confidential HR or IT request describing your needs so the right support can be arranged. These requests are handled sensitively. Your manager and HR can help ensure you have what you need to work effectively.' },
            { k: ['survey', 'feedback survey', 'complete survey', 'satisfaction survey', 'rate service'], r: 'After a request or incident closes, you may receive a short satisfaction survey. Completing it helps teams understand what is working and where to improve. Be specific in any comments so the feedback is actionable, and flag anything that needs follow-up.' },
            { k: ['who do i contact', 'right team', 'where to go', 'point of contact', 'responsible contact'], r: 'If you are unsure who to contact, describe what you need and I will point you to the right path, whether that is a catalog item, an incident, an HR request, or the service desk. For services, the owning team is recorded in the CMDB, and the service desk can always route you.' },

            { k: ['email not working', 'outlook not loading', 'cannot send email', 'emails not arriving', 'inbox not updating'], r: 'I am sorry your email is giving you trouble. A few quick checks first: confirm your network connection is up, then fully close and reopen your mail client, and check whether webmail works in a browser. If email is still down, this needs an incident so IT can investigate. Say "Create an incident" and describe whether it affects sending, receiving, or both, and when it started.' },
            { k: ['teams not working', 'teams wont open', 'teams call dropping', 'video call problem', 'cannot join meeting', 'microsoft teams issue'], r: 'Conferencing problems are frustrating, especially mid-meeting. As a first step, try signing out and back in, or join from the browser version instead of the desktop app. If calls keep dropping it may be a network issue. If it persists, say "Create an incident" and note whether it is audio, video, joining, or stability so IT can target the fix.' },
            { k: ['browser keeps crashing', 'cant open browser', 'internet explorer issue', 'chrome issue', 'edge issue', 'browser extension blocking'], r: 'Browser issues often clear up quickly. Try clearing your cache and cookies, disabling recently added extensions, and restarting the browser. If a specific site is broken, try a private or incognito window. If the browser still crashes or will not open, raise it as an incident with the browser name and version and I will help you log it.' },
            { k: ['webcam not working', 'microphone not working', 'no sound', 'audio issue', 'speakers not working', 'headset not working'], r: 'Audio and video gremlins are common. Check that the correct device is selected in your system sound settings and your app settings, confirm the device is plugged in or paired, and try unplugging and reconnecting it. If it is a headset, test it on another port. If it still fails, say "Create an incident" and mention the exact device so IT can help.' },
            { k: ['printer not working', 'printer offline', 'cannot print', 'print job stuck', 'printer queue stuck', 'document not printing'], r: 'Printer trouble is annoying but usually fixable. Try cancelling stuck jobs in the print queue, confirm the printer shows as online and has paper and toner, then restart the print spooler or your machine. If the printer is shared, check that you are connected to the network. If it still will not print, raise an incident with the printer name or location.' },
            { k: ['monitor not working', 'screen flickering', 'second screen not detected', 'resolution issue', 'display issue', 'blank screen'], r: 'Display issues are often a cable or setting. Reseat the video cable at both ends, try a different port, and confirm the monitor is powered on. For a second screen, use your display settings to detect and extend it. Flickering can be a refresh-rate or driver issue. If reseating does not help, say "Create an incident" and describe the symptom.' },
            { k: ['keyboard not working', 'mouse not working', 'keyboard unresponsive', 'mouse lag', 'trackpad issue'], r: 'Let us get your input devices back. For wired devices, try a different USB port; for wireless, check the batteries and re-pair or reinsert the dongle. A quick restart often clears a frozen driver. If a specific key or button is dead, the hardware may need replacing. Say "Create an incident" if it persists, or "I need a keyboard" to request a replacement.' },
            { k: ['laptop running slow', 'computer slow', 'laptop overheating', 'computer freezing', 'app crashing repeatedly', 'running out of storage', 'disk full', 'out of memory'], r: 'A sluggish or overheating machine usually has a few culprits. Close apps you are not using, restart to clear memory, and check your disk space — clearing temporary files and downloads often helps. Overheating can mean blocked vents. If it keeps freezing or you are out of storage, say "Create an incident" and IT can investigate or upgrade your machine.' },
            { k: ['wifi not connecting', 'no internet', 'network is slow', 'network drive not connecting', 'shared drive unavailable', 'cannot reach network drive'], r: 'Connectivity issues are a common pain point. Toggle Wi-Fi off and on, reconnect to the correct network, and restart your router if you are remote. For a network or shared drive, confirm you are on the corporate network or VPN, since drives are often only reachable that way. If you still cannot connect, say "Create an incident" with the network or drive name.' },
            { k: ['vpn not connecting', 'vpn disconnecting', 'vpn error', 'cannot connect to vpn', 'vpn keeps dropping', 'vpn authentication failed'], r: 'VPN problems can block everything else, so let us sort it. Confirm your underlying internet works, then fully quit and relaunch the VPN client and sign in again. Authentication failures usually trace back to your company credentials or MFA, so verify those work elsewhere. If the VPN keeps dropping, say "Create an incident" and note the error message you see.' },

            { k: ['what is the workspace', 'how to use the workspace', 'workspace explained', 'oi workspace', 'workspace section', 'automation cards', 'trigger automation from workspace'], r: 'The Workspace is your personal home in Operations Intelligence. It shows automation cards for everything you are entitled to run through your group memberships. Each card displays the automation name and a short description; click a card to trigger that automation, and you will see the execution number and status. It is the fastest way to run day-to-day automations without leaving the portal.' },
            { k: ['what is the gallery', 'operations gallery', 'view a report', 'open a dashboard', 'gallery deliverables', 'how to use the gallery', 'browse deliverables'], r: 'The Operations Gallery is where finished deliverables live — reports, dashboards, data alerts, and notification rules built in Studio. Open the Gallery from the left sidebar, then click any tile to view a report or open a dashboard. It is read-and-view focused: a curated showcase of the outputs your teams have produced, available to anyone with portal access.' },
            { k: ['what is the studio', 'operations studio', 'who can access studio', 'create a report in studio', 'create a dashboard in studio', 'create a data alert', 'create a notification rule', 'build a deliverable'], r: 'Operations Studio is the build area, available to Creators and Administrators. From the Studio section you can create four deliverable types: Reports, Dashboards, Data Alerts, and Notification Rules. Choose the type, give it a clear name, complete the configuration, and save — your deliverable then appears in the Operations Gallery for others to view. If you need access, ask an administrator for the Creator role.' },
            { k: ['what is governance', 'operations governance', 'who can access governance', 'pending actions', 'approve or reject', 'governance stats', 'governance section'], r: 'Operations Governance is the oversight area for Leadership and Administrators. It surfaces pending actions — items awaiting a governance decision — alongside summary statistics on activity and approvals. From here an authorised reviewer can approve or reject pending items. If you have the Leadership or Administrator role, open Governance from the sidebar; otherwise the approving authority handles these decisions.' },
            { k: ['what is command', 'operations command', 'who can access command', 'manage groups', 'enroll persons', 'manage automations', 'maintenance mode', 'command center', 'command section'], r: 'Operations Command is the administration console, restricted to Administrators. From Command you manage groups, enroll persons, define and manage automations, and toggle maintenance mode, which pauses operations for safe changes. It is the control room of the application. If you are not an administrator, request changes through one and they will action them in Command.' },
            { k: ['person enrollment', 'how to get enrolled', 'what is enrollment', 'after enrollment', 'enroll me', 'get enrolled', 'enrollment process'], r: 'Enrollment is how a ServiceNow user becomes an active person in Operations Intelligence. An administrator enrolls you from the Command section, which creates your person record and lets you be added to groups. Once enrolled and placed in a group, the automations and deliverables tied to that group become available to you in the Workspace. Ask your administrator to enroll you if you are new.' },
            { k: ['what are oi groups', 'groups in operations intelligence', 'group membership', 'roles within a group', 'how group membership works', 'oi group roles'], r: 'Groups in Operations Intelligence bundle people together and grant access to the automations and deliverables assigned to that group. Membership is managed by administrators in the Command section. Within a group your role — such as user, creator, or leadership — determines what you can do, from running automations to building deliverables. Ask "What groups am I in?" to see your current memberships.' },
            { k: ['how automations are defined', 'automation approval status', 'trigger automation from assistant', 'what is an automation', 'automation definition', 'run an automation'], r: 'Automations are defined by administrators in the Command section and tied to an owning group. Each carries an approval status that governs whether it is live. Once approved and assigned to a group you belong to, it appears in your Workspace and you can trigger it there, or right here by saying "Run" followed by the automation name. I will create the execution and report its status back to you.' },
            { k: ['what is an execution', 'execution details', 'execution status', 'execution statuses', 'see execution details', 'execution meaning'], r: 'An execution is a single run of an automation. Every time an automation triggers, the platform creates an execution record with its own number, the automation that ran, who triggered it, the timestamp, and a status that moves through values such as pending, running, completed, or failed. Ask "Show recent executions" to see your latest runs and their current status.' },
            { k: ['types of deliverables', 'what are deliverables', 'reports dashboards data alerts notification rules', 'deliverable types', 'how deliverables appear'], r: 'Deliverables are the outputs Operations Intelligence produces. There are four types: Reports for tabular and analytical views, Dashboards for at-a-glance visual summaries, Data Alerts that watch for conditions and notify, and Notification Rules that route messages on events. Creators build them in Studio, and once saved they appear as tiles in the Operations Gallery for everyone to view.' },
            { k: ['oi roles', 'what can each role do', 'user creator leadership admin', 'role capabilities', 'operations intelligence roles', 'what is my role allowed to do'], r: 'Operations Intelligence has four roles. User: run available automations and view the Gallery and Workspace. Creator: everything a user can do, plus build deliverables in Studio. Leadership: oversight access to Governance, including approving or rejecting pending actions. Administrator: full control through Command — managing groups, enrolling persons, defining automations, and maintenance mode. Ask "What is my role?" to see yours.' },
            { k: ['navigate operations intelligence', 'oi portal sections', 'sidebar sections', 'what sections are there', 'how is the portal organized', 'oi navigation'], r: 'The Operations Intelligence portal is organised into sections you reach from the left sidebar: Workspace (run your automations), Operations Gallery (view deliverables), Operations Studio (build deliverables, Creators and Administrators), Operations Governance (oversight, Leadership and Administrators), and Operations Command (administration, Administrators only). Tell me where you want to go, for example "Go to Gallery", and I will guide you.' },
            { k: ['how to view automation cards', 'workspace cards', 'what the cards show', 'card details', 'automation card meaning'], r: 'Each automation card in the Workspace represents one automation you are entitled to run. The card shows the automation name, a short description of what it does, and the owning group. Clicking a card triggers the automation immediately and returns an execution record so you can track the outcome. If your Workspace is empty, you may need to be added to a group with published automations.' },
            { k: ['how to open a dashboard', 'open dashboard from gallery', 'view dashboard', 'launch dashboard', 'dashboard in gallery'], r: 'To open a dashboard, go to the Operations Gallery from the sidebar and locate the dashboard tile by its name. Click the tile to launch the dashboard view. Dashboards are built by Creators in Studio and surface live visual summaries. If you do not see the dashboard you expect, it may not have been published yet, or it may belong to a group you are not in.' },
            { k: ['how to view a report', 'open report from gallery', 'view report', 'read a report', 'report in gallery'], r: 'To view a report, open the Operations Gallery and click the report tile you want. The report opens with its configured data and layout. Reports are created in Studio by Creators and Administrators. If a report you need is missing, confirm it has been saved and published, or ask the person who built it to make sure it is shared to the right group.' },
            { k: ['how to create a report', 'make a report in studio', 'report creation steps', 'new report deliverable', 'build a report'], r: 'To create a report you need Creator or Administrator access. Open Operations Studio from the sidebar, choose Report as the deliverable type, give it a clear formal name, fill in the configuration for the data you want to show, and save. Your new report then appears as a tile in the Operations Gallery where others can view it.' },
            { k: ['how to create a dashboard', 'make a dashboard in studio', 'dashboard creation steps', 'new dashboard deliverable', 'build a dashboard'], r: 'Creating a dashboard requires Creator or Administrator access. In Operations Studio, select Dashboard as the deliverable type, name it clearly, configure the panels and data sources you want at a glance, and save. The finished dashboard is published to the Operations Gallery so your colleagues can open and view it.' },
            { k: ['how to create a data alert', 'data alert creation', 'new data alert', 'set up a data alert', 'build a data alert'], r: 'Data Alerts watch your data for a condition and notify when it is met. To build one you need Creator or Administrator access. In Operations Studio, choose Data Alert, name it, define the condition to monitor and who should be notified, and save. The alert then runs in the background and appears among your deliverables in the Gallery.' },
            { k: ['how to create a notification rule', 'notification rule creation', 'new notification rule', 'set up a notification rule', 'build a notification rule'], r: 'Notification Rules route messages when defined events occur. Creating one requires Creator or Administrator access. In Operations Studio, select Notification Rule, give it a formal name, set the triggering event and recipients, and save. Once active it sends notifications automatically and is listed with your other deliverables in the Operations Gallery.' },
            { k: ['what pending actions mean', 'governance pending', 'approve in governance', 'reject in governance', 'governance decision'], r: 'In Operations Governance, pending actions are items awaiting a decision from an authorised reviewer. Each shows what is being requested and the context for the decision. A Leadership or Administrator user can approve or reject each one, and the stats panel summarises throughput and outstanding work. If you need something approved, it will surface here for the right person to action.' },
            { k: ['what governance stats show', 'governance statistics', 'governance metrics', 'governance dashboard numbers'], r: 'The statistics in Operations Governance summarise oversight activity: how many actions are pending, how many have been approved or rejected, and the general flow of governed work over time. They give Leadership a quick read on whether anything is waiting and whether the pipeline is healthy. Drill into a pending item from the same screen to act on it.' },
            { k: ['how to manage groups in command', 'manage groups oi', 'add group', 'edit group', 'group management command'], r: 'Group management lives in Operations Command and is an Administrator function. From there you create groups, edit their details, and control which automations and deliverables each group can access. Membership changes also flow from here. If you need a new group or a membership change, ask an administrator to make it in the Command section.' },
            { k: ['how to enroll a person', 'enroll person command', 'add a person to oi', 'person enrollment command', 'onboard person to oi'], r: 'Enrolling a person is done by an Administrator in Operations Command. The administrator selects the ServiceNow user, creates their person record, and can then place them into the appropriate groups. After enrollment the person gains access to the Workspace and the automations and deliverables tied to their groups. Request enrollment from an administrator if you or a colleague need access.' },
            { k: ['how to manage automations in command', 'manage automations oi', 'define automation', 'edit automation', 'automation management command'], r: 'Automations are managed in Operations Command by Administrators. There you define an automation, assign it to an owning group, set its approval status, and maintain it over time. Approved automations assigned to a group appear in members\' Workspaces. If you need a new automation or a change to an existing one, raise it with an administrator who can action it in Command.' },
            { k: ['what maintenance mode does', 'maintenance mode oi', 'enable maintenance mode', 'maintenance mode meaning', 'pause operations'], r: 'Maintenance mode is an Administrator control in Operations Command that temporarily pauses operations so changes can be made safely. While it is on, automation execution is held back to prevent runs during the work. An administrator enables it before maintenance and disables it afterward to resume normal operation. If automations are not running, the platform may be in maintenance mode.' },
            { k: ['what happens after enrollment', 'post enrollment', 'enrolled now what', 'after being enrolled'], r: 'Once you are enrolled and added to one or more groups, Operations Intelligence opens up for you. Your Workspace populates with the automation cards your groups grant, the Operations Gallery shows the deliverables you can view, and any role you hold — user, creator, or leadership — unlocks the matching sections. If your Workspace still looks empty, you may need to be added to a group with published automations.' },
            { k: ['what is studio for', 'studio purpose', 'why use studio', 'studio overview', 'studio capabilities'], r: 'Studio is where Operations Intelligence content is built. Creators and Administrators use it to produce the four deliverable types — Reports, Dashboards, Data Alerts, and Notification Rules — that then appear in the Gallery for the wider audience. Think of Studio as the workshop and the Gallery as the showroom. Open Studio from the sidebar if you hold the Creator or Administrator role.' },
            { k: ['who can see the gallery', 'gallery access', 'gallery permissions', 'can everyone see gallery', 'gallery visibility'], r: 'The Operations Gallery is the view-only showcase of deliverables and is generally available to anyone with portal access, though what you see can depend on the groups a deliverable is shared to. You do not need a special role just to browse and open published reports and dashboards. If a specific item is missing, it may not be published or may be scoped to a group you are not in.' },
            { k: ['command center overview', 'what command shows', 'command dashboard', 'admin console oi', 'command contents'], r: 'Operations Command is the Administrator console and the most powerful section. It shows the levers for running the application: group management, person enrollment, automation definitions and their approval status, and the maintenance-mode switch. Everything that configures who can do what flows through here. It is restricted to Administrators to keep those controls safe.' },
            { k: ['how to see execution details', 'execution record', 'view execution', 'execution drilldown', 'open an execution'], r: 'Every automation run produces an execution record carrying its number, the automation that ran, who triggered it, the timestamp, and the current status. Ask "Show recent executions" here to list your latest runs, and use the Workspace to trigger new ones. The execution status tells you whether a run is pending, running, completed, or failed so you can act if something did not finish.' },
            { k: ['how deliverables appear in gallery', 'deliverable publishing', 'where do deliverables show', 'publish to gallery'], r: 'When a Creator saves a deliverable in Studio, it is published as a tile in the Operations Gallery, labelled by its type — Report, Dashboard, Data Alert, or Notification Rule. From that point anyone with access to the Gallery and the relevant group can open and view it. If a deliverable you built is not visible, confirm it saved successfully and is shared to the right audience.' },

            { k: ['what is a problem record', 'problem vs incident', 'difference between problem and incident', 'problem definition', 'problem management explained'], r: 'A Problem record investigates the underlying cause of one or more incidents. The key difference: an incident is about restoring service for a specific disruption right now, while a Problem is about finding and eliminating the root cause so the disruption stops happening at all. Incidents are reactive and fast; Problems are investigative and lasting. They work together — incidents flag the symptom, the Problem cures it.' },
            { k: ['how incidents link to problems', 'connect incident to problem', 'incidents under a problem', 'associate incident with problem'], r: 'Incidents link to a Problem so every symptom of the same root cause is grouped under one investigation. You set the Problem field on an incident, or create a Problem directly from a recurring incident. This shows the true scale of impact and means that when the permanent fix lands, all the linked incidents can be resolved together rather than one at a time.' },
            { k: ['what is a known error', 'document a known error', 'known error database', 'kedb meaning', 'known error explained'], r: 'A Known Error is a Problem whose root cause has been identified and which has a documented workaround, stored in the Known Error Database. Recording it lets the service desk resolve matching incidents fast using the proven workaround while the permanent fix is being developed. To document one, capture the symptom, the confirmed cause, and the exact workaround steps on the Problem record.' },
            { k: ['what is a workaround', 'publish a workaround', 'temporary fix problem', 'document workaround', 'interim fix'], r: 'A workaround is a temporary way to restore service while the root cause is still being fixed. Document it on the Problem and the Known Error so agents can apply it to related incidents immediately, reducing impact. A good workaround is specific and repeatable: list the exact steps, any prerequisites, and any limitations so anyone can follow it reliably.' },
            { k: ['root cause analysis process', 'rca steps', 'how to find root cause', 'rca method', 'causal analysis process'], r: 'Root cause analysis works through the symptoms to the true cause so the fix is permanent. A common approach is the Five Whys — repeatedly asking why until you reach the underlying cause — or a Fishbone diagram to categorise possible causes. Gather evidence, reproduce the issue if you can, confirm the cause before committing to a fix, and record the analysis on the Problem record.' },
            { k: ['problem states', 'problem lifecycle states', 'problem status values', 'problem stages', 'problem workflow states'], r: 'A Problem moves through New, Assess, Root Cause Analysis, Fix in Progress, Resolved, and Closed. It is logged and triaged in New and Assess, investigated for the cause during Root Cause Analysis, addressed during Fix in Progress (often via a Change), then Resolved once the fix is applied and Closed when it is confirmed effective. Each stage gates the next to keep the investigation disciplined.' },
            { k: ['how to create a problem record', 'create a problem', 'raise a problem', 'log a problem', 'new problem record', 'open a problem ticket'], r: 'To create a Problem, raise it through the Service Catalog or create one directly from a recurring incident using the related action. Capture the symptom, the affected service, the linked incidents, and an initial hypothesis. Once created, the Problem drives root cause analysis and a permanent fix. If the same issue keeps recurring, this is exactly the right path rather than re-resolving incidents.' },
            { k: ['problem review and closure', 'close a problem', 'problem closure', 'review the problem', 'problem retrospective'], r: 'Before closing a Problem, review whether the fix actually worked: confirm the linked incidents have stopped recurring, record the root cause and the solution, and capture any lessons learned and preventive actions. Then move the Problem to Resolved and finally Closed. This closes the loop and feeds continual improvement so similar problems are caught earlier next time.' },
            { k: ['link problem to change', 'problem fix via change', 'change request for problem', 'implement problem fix'], r: 'The permanent fix for a Problem usually needs to be implemented safely, which is what Change Management is for. Link a Change Request to the Problem to deliver the fix through the controlled change process — with risk assessment, approval, a maintenance window, and a back-out plan. Once the change is implemented and validated, resolve the Problem and confirm the linked incidents have stopped.' },
            { k: ['prb number', 'p-number', 'problem number format', 'look up a problem', 'find a problem record'], r: 'Problem records are identified by a number beginning with PRB followed by digits, for example PRB0001234. You can look one up by its number in the platform, much like an incident. If you are tracking a recurring issue, quote the PRB number so everyone references the same investigation, and link any new related incidents to it.' },
            { k: ['problem metrics', 'problem reporting', 'problem kpis', 'open problems count', 'problem backlog metrics'], r: 'Useful Problem metrics include the count of open Problems, the age of the backlog, the number of incidents prevented by completed fixes, and the average time to identify root cause. Track these in Performance Analytics or build a report in Studio. Healthy problem management shows incidents declining as recurring causes are eliminated.' },
            { k: ['what is problem management', 'problem management overview', 'purpose of problem management', 'why problem management'], r: 'Problem Management exists to reduce the number and impact of incidents by finding and removing their underlying causes. Where incident management restores service quickly, problem management asks why it broke and makes sure it does not break again. It turns recurring firefighting into lasting prevention through root cause analysis, known errors, workarounds, and permanent fixes.' },
            { k: ['recurring issue help', 'same issue keeps coming back', 'issue keeps happening', 'repeated incident pattern', 'keeps recurring'], r: 'When the same issue keeps coming back, resolving the incident each time only treats the symptom. The right move is to raise a Problem so the root cause is investigated and permanently fixed, and to link the recurring incidents to it. Say "Create a problem" or raise one from the incident, and the recurring pattern can finally be broken.' },
            { k: ['my problems', 'show my problems', 'problems i raised', 'my problem records', 'problems assigned to me'], r: 'To see Problem records related to you, look in the platform for Problems where you are the opener or the assigned investigator, much as you would for incidents. If you are tracking a specific issue, quote its PRB number. If you need to start a new investigation into a recurring issue, say "Create a problem" and I will point you to the right path.' },
            { k: ['problem investigation', 'investigate a problem', 'problem analysis', 'work a problem', 'diagnose root cause'], r: 'Investigating a Problem means working systematically from symptom to cause. Gather evidence from the linked incidents and logs, form a hypothesis, test it by trying to reproduce the issue, and confirm the cause before designing a fix. Break the work into problem tasks so specialists can be assigned, and document everything on the Problem record so the analysis is auditable.' },

            { k: ['new starter onboarding', 'onboarding request', 'onboard a new employee', 'new employee setup', 'starter request process'], r: 'New starter onboarding is handled through a request that provisions a new colleague\'s access and equipment in one coordinated flow. Look for the onboarding order guide or request in the Service Catalog at /sp?id=sc_home — it walks through accounts, access, and hardware together. Submit it ahead of the start date so everything is ready on day one. I can help you find it; just say "I need to onboard a new employee".' },
            { k: ['what is provisioned automatically', 'automatic provisioning', 'whats set up for new hire', 'auto provisioning onboarding'], r: 'For a new starter, certain accounts and access are usually provisioned automatically once the HR record exists — typically the core identity, email, and standard application access tied to the role and department. Anything beyond the standard set, such as specialised software or elevated access, is requested separately through the catalog. If something expected did not provision, raise an access request and the service desk will sort it.' },
            { k: ['access request for new employee', 'grant access new starter', 'new hire access', 'provision access for employee'], r: 'To grant a new employee access to a specific system, raise an access request in the Service Catalog and use the "Requested For" field to name them. Specify exactly which application or resource and the level of access needed. Manager and resource-owner approval usually applies. Say "I need access for a new employee" and I will help you find the right catalog item.' },
            { k: ['equipment request for new starter', 'new hire equipment', 'hardware for new employee', 'starter laptop request'], r: 'To order equipment for a new starter — a laptop, phone, monitor, or accessories — use the hardware items in the Service Catalog and set the "Requested For" field to the new employee. Order early, since hardware can take several business days to procure and set up. Say "I need a laptop" or "new hire equipment" and I will surface the relevant catalog items.' },
            { k: ['account deactivation offboarding', 'disable account leaver', 'deactivate user', 'offboarding account', 'remove access leaver'], r: 'When someone leaves, their accounts and access must be deactivated promptly for security. This is typically triggered by the HR offboarding record and a service request, which disables the identity, revokes access, and starts license and asset reclamation. Raise the offboarding request as soon as the departure is known so access is removed on the right date. The service desk can expedite urgent cases.' },
            { k: ['license reclamation', 'reclaim license', 'recover software license', 'free up license', 'license recovery offboarding'], r: 'License reclamation recovers software licenses from people who no longer need them — for example, departing employees or those who changed roles — so the licenses can be reassigned and cost is controlled. It is usually part of the offboarding process and Software Asset Management. If you know of unused licenses, flag them through a service request so they can be reclaimed and reused.' },
            { k: ['asset return offboarding', 'return equipment leaver', 'collect hardware leaver', 'asset recovery offboarding', 'hand back laptop'], r: 'When an employee leaves, their assigned hardware — laptop, phone, peripherals — must be returned and the asset records updated. The offboarding process tracks which assets are out and arranges collection or shipment back. Log the return so the asset status moves to in-stock and the device can be wiped, refurbished, and reissued. Raise a service request if you need to arrange a collection.' },
            { k: ['knowledge transfer before departure', 'handover before leaving', 'knowledge handover', 'departure knowledge transfer', 'transition knowledge'], r: 'Knowledge transfer captures what a departing colleague knows so the work continues smoothly. Before their last day, document key processes, contacts, and in-flight work, ideally as knowledge articles so the information is searchable later. A short handover session with the receiving team helps too. Building this into the offboarding checklist prevents knowledge walking out the door.' },
            { k: ['offboarding process', 'employee offboarding', 'leaver process', 'departure process', 'offboard an employee'], r: 'Offboarding wraps up an employee\'s access, equipment, and knowledge as they leave. The key steps are: trigger the HR offboarding record, deactivate accounts and revoke access on the departure date, reclaim software licenses, recover and update hardware assets, and complete knowledge transfer. Raise the offboarding request early so each step lands on time. The service desk can expedite a short-notice departure.' },
            { k: ['onboarding checklist', 'new hire checklist', 'starter checklist', 'onboarding steps', 'what to set up for new hire'], r: 'A solid onboarding checklist covers identity and email account, role-based application access, hardware (laptop, phone, peripherals), any specialised software requests, and group memberships. Use the onboarding order guide in the catalog to coordinate these, submit it before the start date, and confirm everything provisioned on day one. Say "I need to onboard a new employee" and I will point you to the right request.' },

            { k: ['what is an it audit', 'it audit explained', 'audit definition', 'audit overview', 'what does an audit involve'], r: 'An IT audit is an independent examination of your systems, controls, and processes to confirm they operate correctly and comply with policy and regulation. Auditors review evidence such as access records, change history, configurations, and logs against defined controls. The platform helps by maintaining audit trails on records, so most evidence can be produced from the history that is captured automatically.' },
            { k: ['how to prepare for an audit', 'audit preparation', 'get ready for audit', 'prepare audit evidence', 'audit readiness'], r: 'To prepare for an audit, identify which controls are in scope, then gather the supporting evidence: access reviews, change approvals and records, incident handling, and configuration baselines. The platform\'s audit trails and reports make much of this straightforward. Assign owners for each control, address any gaps before the audit, and keep evidence organised so it can be produced on request.' },
            { k: ['what evidence is needed for audit', 'audit evidence', 'evidence for compliance', 'audit documentation', 'proof for auditors'], r: 'Auditors typically want evidence that controls were followed: records of who approved changes, who had access and when access was reviewed, how incidents were handled, and that configurations match the approved baseline. Much of this is captured automatically in record history and audit trails. Reports and the activity log on each record provide the timestamped proof auditors look for.' },
            { k: ['compliance reporting', 'compliance report', 'report on compliance', 'compliance dashboard', 'compliance status report'], r: 'Compliance reporting shows how well controls and policies are being met across the organisation. Build compliance reports and dashboards in the Studio section to track metrics like access review completion, change approval rates, and policy exceptions. These give compliance and leadership a clear, current view and make audit evidence quick to produce when it is requested.' },
            { k: ['risk register', 'what is a risk register', 'log a risk', 'register a risk', 'risk log'], r: 'A risk register is the central list of identified risks, each with its likelihood, impact, owner, and mitigation plan. It lets the organisation see and prioritise its risk exposure in one place. To add to it, raise the risk through your risk or governance process with a clear description and your assessment of likelihood and impact, so it can be tracked and mitigated.' },
            { k: ['risk assessment process', 'assess a risk', 'how to assess risk', 'risk evaluation', 'evaluate risk'], r: 'A risk assessment evaluates a risk by its likelihood and its impact, producing a rating that drives priority. Describe the risk, estimate how likely it is and how severe the consequences would be, then decide whether to mitigate, transfer, accept, or avoid it. Record the assessment in the risk register and assign an owner to track the chosen response.' },
            { k: ['risk mitigation', 'mitigate a risk', 'reduce risk', 'risk treatment', 'risk control'], r: 'Risk mitigation reduces a risk\'s likelihood or impact through controls and actions. Once a risk is assessed, define the mitigation — additional controls, process changes, or safeguards — assign an owner and a due date, and track progress in the risk register. Residual risk that remains after mitigation should be formally accepted by the appropriate authority.' },
            { k: ['regulatory compliance', 'gdpr', 'iso 27001', 'data protection regulation', 'regulatory requirements', 'compliance standards'], r: 'Regulatory compliance means meeting the legal and standards obligations that apply to your data and operations, such as GDPR for personal data and ISO 27001 for information security management. The platform supports this with audit trails, access controls, and reporting that evidence the required controls. For specific regulatory questions, work with your compliance or data protection team, who own the formal requirements.' },
            { k: ['data retention policy', 'data retention', 'how long to keep data', 'retention rules', 'retain records'], r: 'Data retention policies define how long different types of records and data must be kept and when they should be securely disposed of, balancing legal, regulatory, and business needs. Follow your organisation\'s retention schedule for each data category. If you are unsure how long to keep something or when to delete it, check with your compliance or records management team before acting.' },
            { k: ['audit trail', 'audit log', 'who changed what', 'record history audit', 'evidence trail'], r: 'An audit trail is the captured history of changes on a record — every field change, note, and state transition with a timestamp and the user who made it. It is the authoritative evidence for reviews and audits. Open any record\'s activity stream to see its trail. This automatic history is one of the strongest sources of compliance evidence the platform provides.' },
            { k: ['compliance dashboard', 'compliance metrics', 'compliance kpis', 'governance dashboard compliance', 'track compliance'], r: 'A compliance dashboard brings key control metrics into one view — access review completion, change approval adherence, open policy exceptions, and audit findings status. Build one in the Studio section so compliance and leadership can monitor posture at a glance and spot gaps early. Pair it with reports for the detail behind each metric.' },
            { k: ['policy exception request', 'request a policy exception', 'exception to policy', 'waiver request', 'policy waiver'], r: 'A policy exception is a formal, approved deviation from a standard policy where a justified business need exists. To request one, raise it through your governance or compliance process with a clear justification, the scope and duration, and the compensating controls that manage the residual risk. Exceptions should be time-bound and reviewed, not permanent, and recorded so auditors can see they were approved.' },
            { k: ['what is risk management', 'risk management overview', 'manage risk', 'risk process', 'enterprise risk'], r: 'Risk management is the disciplined practice of identifying, assessing, treating, and monitoring risks so the organisation can pursue its goals safely. It runs a cycle: spot the risk, assess likelihood and impact, decide a response (mitigate, transfer, accept, or avoid), and track it in the risk register. Good risk management turns uncertainty into managed, owned decisions.' },
            { k: ['business impact of risk', 'risk impact assessment', 'consequence of risk', 'impact rating', 'risk consequences'], r: 'The impact of a risk measures how severe the consequences would be if it materialised — financial loss, service disruption, regulatory penalty, or reputational harm. Combined with likelihood, it produces the risk rating that drives priority. Be honest and specific when rating impact so high-consequence risks get the attention and mitigation they warrant.' },
            { k: ['security compliance', 'information security compliance', 'security controls audit', 'infosec compliance', 'security policy compliance'], r: 'Security compliance confirms that information security controls — access management, change control, monitoring, and incident response — are in place and operating. Frameworks such as ISO 27001 set the expectations, and the platform evidences many controls through audit trails and reports. Work with your information security team for the formal control set, and use Studio reports to demonstrate adherence.' },

            { k: ['what is an api', 'api explained', 'api meaning', 'application programming interface', 'what does api mean'], r: 'An API, or Application Programming Interface, is a defined way for two systems to talk to each other programmatically. Instead of a person clicking screens, one system sends a structured request to another and gets a structured response back. APIs are how integrations exchange data automatically and reliably — for example, pulling records from one platform into another without manual re-entry.' },
            { k: ['rest api basics', 'what is rest', 'rest api explained', 'restful api', 'rest endpoint'], r: 'REST is the most common style of web API. A client sends an HTTP request — typically GET to read, POST to create, PUT or PATCH to update, and DELETE to remove — to a URL endpoint, and the server responds, usually with JSON data. ServiceNow exposes REST APIs for its tables and scripted endpoints, which is how external systems read and write platform data securely.' },
            { k: ['integration hub', 'what is integration hub', 'integrationhub', 'integration hub explained', 'ih spokes'], r: 'IntegrationHub is the platform\'s integration framework. It lets you connect to external systems from within flows using pre-built actions, so you can call other services without writing low-level code. It packages connectivity into reusable steps, making it faster to automate processes that span multiple systems. Administrators and developers configure IntegrationHub connections centrally.' },
            { k: ['spoke connector', 'what is a spoke', 'integration spoke', 'spoke explained', 'connector spoke'], r: 'A spoke is a packaged set of IntegrationHub actions for a specific external system or service — think of it as a ready-made connector. Instead of building calls from scratch, you drop the spoke\'s actions into a flow to interact with that system. Spokes speed up integration by providing tested, reusable steps for common platforms and tools.' },
            { k: ['mid server', 'what is a mid server', 'mid server explained', 'management instrumentation', 'mid server purpose'], r: 'A MID Server (Management, Instrumentation, and Discovery) is a lightweight application that runs inside your network and acts as a secure bridge between the cloud platform and your internal systems. It lets the platform reach on-premises resources for Discovery, integrations, and orchestration without exposing them directly to the internet. Administrators deploy and manage MID Servers.' },
            { k: ['web service integration', 'soap integration', 'consume web service', 'web service api', 'integrate web service'], r: 'A web service integration connects the platform to another system over standard web protocols, classically SOAP using XML, or more commonly today REST using JSON. The platform can both consume external web services and expose its own. Choose REST for new integrations where possible; reserve SOAP for systems that only offer that interface. Administrators and developers configure these securely.' },
            { k: ['import sets', 'what is an import set', 'import set explained', 'data import', 'bulk import data'], r: 'Import Sets are the platform\'s mechanism for bringing external data in, typically from a file or another system, into a staging table first. From there a Transform Map maps and loads the data into the real target tables with validation and coalescing to avoid duplicates. Import Sets are ideal for bulk loads and recurring data feeds where you want a controlled, repeatable import.' },
            { k: ['etl basics', 'what is etl', 'extract transform load', 'etl explained', 'data etl'], r: 'ETL stands for Extract, Transform, Load — the pattern of pulling data from a source, reshaping it to fit the destination, and loading it in. On this platform that pattern maps to Import Sets (extract into staging) and Transform Maps (transform and load into target tables). Understanding ETL helps you design clean, reliable data feeds rather than ad-hoc copies.' },
            { k: ['what is an integration', 'system integration', 'connect two systems', 'integration overview', 'integrate systems'], r: 'An integration connects two or more systems so they share data or trigger actions automatically, removing manual re-keying and keeping information consistent. It can be real-time (an API call when something happens) or scheduled (a periodic data sync). On this platform, integrations are built with REST and SOAP web services, IntegrationHub spokes, Import Sets, and MID Servers for on-premises reach.' },
            { k: ['api authentication', 'api auth', 'secure an api', 'api credentials', 'api token', 'authenticate api call'], r: 'API authentication proves who is calling so the system can authorise the request. Common methods include basic credentials, OAuth tokens, and API keys, sent securely over HTTPS. On this platform, integration accounts and OAuth are configured by administrators, and credentials are stored securely rather than hard-coded. Never embed secrets in shared scripts — use the platform\'s credential storage.' },

            { k: ['what is business continuity', 'business continuity explained', 'bc plan', 'business continuity overview', 'continuity planning'], r: 'Business continuity is the discipline of keeping critical operations running, or quickly restoring them, through a serious disruption such as an outage, disaster, or other crisis. It centres on a plan that identifies essential functions, the resources they need, and how to maintain or recover them. The goal is to limit downtime and impact so the organisation keeps serving its customers.' },
            { k: ['disaster recovery plan', 'dr plan', 'disaster recovery explained', 'recover from disaster', 'dr strategy'], r: 'A Disaster Recovery (DR) plan is the technical playbook for restoring IT systems and data after a major failure or disaster. It defines what to recover, in what order, using which backups and standby systems, and who does what. DR is the IT-focused part of business continuity, with the aim of bringing services back within agreed recovery targets after an incident.' },
            { k: ['what is failover', 'failover explained', 'automatic failover', 'failover process', 'failover meaning'], r: 'Failover is the automatic or manual switch from a failed system to a standby one so service continues with minimal disruption. When the primary component fails, traffic moves to a healthy replica or secondary site. Well-designed failover keeps services available during hardware faults, outages, or maintenance, and is a core building block of resilient, highly available systems.' },
            { k: ['recovery time objective', 'rto', 'what is rto', 'rto explained', 'recovery time'], r: 'The Recovery Time Objective (RTO) is the maximum acceptable time a service can be down before it must be restored after a disruption. It answers "how quickly must this be back?" A tighter RTO demands more investment in redundancy and automation. RTO is set per service based on its business criticality and drives the design of recovery and failover.' },
            { k: ['recovery point objective', 'rpo', 'what is rpo', 'rpo explained', 'data loss tolerance'], r: 'The Recovery Point Objective (RPO) is the maximum amount of data loss, measured in time, that is acceptable after a disruption. It answers "how much recent data can we afford to lose?" An RPO of one hour means backups or replication must capture data at least hourly. RPO drives backup frequency and replication design and is set per service by business need.' },
            { k: ['dr testing', 'disaster recovery test', 'test the dr plan', 'dr drill', 'recovery testing'], r: 'DR testing exercises the disaster recovery plan to confirm it actually works before a real disaster strikes. Tests range from a tabletop walkthrough to a full failover to the recovery site. Each test validates that systems recover within their RTO and RPO and reveals gaps to fix. Treat planned DR tests as changes, schedule them in a window, and capture the results.' },
            { k: ['crisis communication', 'crisis comms', 'communicate during crisis', 'emergency communication', 'crisis communication plan'], r: 'Crisis communication keeps stakeholders informed during a serious disruption. A good plan names a communications lead, defines the audiences (staff, customers, leadership), the channels, and a cadence of clear, honest updates. During a major incident, assign someone solely to communication so responders can focus on the fix while everyone affected gets timely, consistent information.' },
            { k: ['business impact analysis', 'bia', 'what is bia', 'impact analysis business', 'bia explained'], r: 'A Business Impact Analysis (BIA) identifies the organisation\'s critical functions and the consequences of their disruption over time, which in turn sets the recovery priorities and the RTO and RPO for each service. It answers what matters most, how quickly it must come back, and how much data loss is tolerable. The BIA is the foundation that business continuity and DR plans are built on.' },
            { k: ['high availability', 'what is high availability', 'ha explained', 'highly available', 'availability design'], r: 'High availability (HA) is designing systems to minimise downtime by removing single points of failure, using redundancy, clustering, and automatic failover. Where DR is about recovering after a disaster, HA is about avoiding outages in the first place through resilient architecture. The two complement each other: HA keeps day-to-day service up, while DR handles the larger disasters.' },
            { k: ['backup and restore', 'data backup', 'restore from backup', 'backup strategy', 'backup explained'], r: 'Backups are copies of data taken on a schedule so information can be restored after loss or corruption. A sound strategy aligns backup frequency to the RPO, keeps copies in more than one location, and is tested by performing real restores. A backup you have never restored from is a hope, not a plan — so periodic restore tests are essential to genuine resilience.' },

            { k: ['flow designer', 'how to use flow designer', 'what is flow designer', 'build a flow', 'create a flow', 'flow designer explained'], r: 'Flow Designer is the platform\'s no-code tool for automating processes. You build a flow by setting a trigger (such as a record being created) and then adding a sequence of actions and conditions, often using IntegrationHub for external steps. It lets you automate approvals, notifications, and tasks without scripting. Administrators and developers typically build flows; ask one if you need a new automated process.' },
            { k: ['what is integrationhub navigation', 'find integrationhub', 'integrationhub module', 'where is integrationhub'], r: 'IntegrationHub is the integration framework you use from inside Flow Designer to connect to external systems with pre-built actions called spokes. You will find it through Flow Designer when adding actions, and its configuration lives in the platform\'s integration settings, managed by administrators. It saves you from writing low-level integration code for common systems.' },
            { k: ['how to use the update set', 'what is an update set', 'update set explained', 'capture changes update set', 'update set navigation'], r: 'An Update Set is a container that captures configuration changes so they can be moved between instances, for example from development to production. You select an active update set, make your configuration changes, and they are recorded into it for review and migration. In Operations Intelligence the engine maintains a single update set named Operations Intelligence for its configuration work.' },
            { k: ['application navigator', 'what is the application navigator', 'left navigation menu', 'nav menu', 'application navigator explained'], r: 'The Application Navigator is the menu, usually on the left of the main platform interface, that lists applications and their modules. You use it to jump to any area of the platform. The filter box at the top lets you type part of a module name to find it instantly, which is the fastest way to navigate rather than scrolling through the full tree.' },
            { k: ['find a module in the navigator', 'search the navigator', 'filter navigator', 'locate a module', 'navigator filter'], r: 'To find a module quickly, click into the filter box at the top of the Application Navigator and start typing part of its name — the list narrows as you type. This is far faster than expanding applications one by one. If you cannot see a module you expect, you may not have the role required to access it; ask an administrator if you believe you should.' },
            { k: ['agent workspace', 'what is agent workspace', 'agent workspace explained', 'workspace for agents', 'fulfiller workspace'], r: 'Agent Workspace is a modern, tabbed interface designed for fulfillers who work many records at once, such as service desk agents. It brings lists, records, and tools into a single streamlined view with contextual side panels, making it efficient to triage and resolve work. It is distinct from the Operations Intelligence Workspace section, which is for running your automations.' },
            { k: ['workspace board', 'how to use the workspace board', 'board view', 'kanban board', 'workspace board explained'], r: 'A workspace board presents records as cards arranged in columns, often by state, so you can see and manage work at a glance and drag items between stages. It is a visual, Kanban-style way to track a queue. Use it when you want a quick read on where work sits and to move items through their lifecycle without opening each record individually.' },
            { k: ['what is a gliderecord', 'gliderecord explained', 'gliderecord basics', 'query records script', 'gliderecord meaning'], r: 'GlideRecord is the platform\'s server-side API for working with table data in scripts. You instantiate it for a table, add query conditions, run the query, and then iterate over the results to read or update fields. It is the standard way developers read and write records programmatically. Day to day you will not need it, but it underpins much of the automation behind the scenes.' },
            { k: ['list editing', 'how to use list editing', 'edit in list', 'inline edit list', 'list edit explained'], r: 'List editing lets you change field values directly in a list view without opening each record. Double-click a cell to edit it inline, which is handy for quick bulk updates across several records. Your permissions still apply, so you can only edit fields and records you are allowed to. It is a fast way to make small corrections across many rows.' },
            { k: ['what is a related list', 'related list explained', 'related lists', 'related records', 'related list meaning'], r: 'A Related List appears at the bottom of a record and shows other records connected to it — for example, the incidents linked to a Problem, or the tasks under a request. From a related list you can view, add, or remove the connected records without leaving the parent. They make relationships between records visible and editable in one place.' },
            { k: ['how are sys_ids used', 'what is a sys_id', 'sys_id explained', 'sys id meaning', 'unique identifier record'], r: 'A sys_id is the unique 32-character identifier the platform assigns to every record. It never changes and is how records are referenced internally, in URLs, and in scripts — far more reliably than a display name, which can repeat or change. When you link records or build integrations, the sys_id is the dependable key that points to exactly one record.' },
            { k: ['what is a ui page', 'ui page explained', 'ui page meaning', 'custom ui page', 'ui pages'], r: 'A UI Page is a custom page built on the platform using HTML and Jelly markup, used when standard forms and lists are not enough — for example, a bespoke interface or a custom dialog. Developers create UI Pages to deliver tailored experiences. Most users interact with the more modern Service Portal widgets instead, but UI Pages remain available for custom needs.' },
            { k: ['script editor', 'how to use the script editor', 'script editor explained', 'edit script', 'syntax editor'], r: 'The Script Editor is the in-platform code editor used to write and edit server-side and client-side scripts, with syntax highlighting and validation. Developers use it in Business Rules, Script Includes, and similar artifacts. On this platform, scripts must follow ES5 because the engine does not support newer JavaScript syntax, so keep to var, function declarations, and string concatenation.' },
            { k: ['what are transform maps', 'transform map explained', 'transform map', 'map import data', 'data transformation map'], r: 'A Transform Map defines how data from an Import Set staging table maps into a target table — which source column fills which field, how to coalesce on a key to avoid duplicates, and any scripted transformations along the way. It is the second half of an Import Set load: the staging table extracts the data and the Transform Map shapes and loads it into the real records.' },
            { k: ['platform navigation help', 'how to get around', 'navigate the platform', 'find things in servicenow', 'navigation tips'], r: 'To get around the platform efficiently, use the Application Navigator filter to jump straight to a module by typing its name, use lists with filters to find records, and open a record\'s Related Lists to reach connected items. In the Operations Intelligence portal specifically, use the left sidebar sections — Workspace, Gallery, Studio, Governance, and Command — and just ask me where you want to go.' },

            { k: ['team distribution list', 'set up distribution list', 'create distribution list', 'group email list', 'team mailing list'], r: 'A team distribution list lets you email a whole group with one address. Setting one up is usually a service request: raise it in the Service Catalog, specifying the list name, owner, and initial members. The messaging or identity team provisions it. Say "I need a distribution list" and I will help you find the right catalog item to get it created.' },
            { k: ['share a knowledge article', 'share kb article with team', 'send article to colleague', 'distribute knowledge article', 'share documentation'], r: 'To share a knowledge article with your team, open the article in the Knowledge Base and copy its link, then send it through your usual channel — email, chat, or a team space. For articles people will rely on, suggest they follow or subscribe to it so they are notified of updates. If the article is restricted, confirm your colleagues have access to that knowledge base.' },
            { k: ['announce a maintenance window', 'maintenance announcement', 'notify maintenance window', 'communicate downtime', 'maintenance notice'], r: 'To announce a maintenance window, notify affected users in advance with the date, time, expected duration, and impact. If the work is a change, use the change record to identify affected services and their owners, and send the notice through your standard channel or a broadcast. Clear, early communication reduces surprise tickets when the maintenance begins.' },
            { k: ['broadcast notification', 'set up a broadcast', 'send a broadcast message', 'mass notification', 'company-wide notice'], r: 'A broadcast notification sends a single message to a wide audience at once, useful for outages, maintenance, or important announcements. On this platform you can use Notification Rules built in Studio for event-driven messages, or work with the team that owns broadcast messaging for company-wide notices. During a major incident, a broadcast also cuts down duplicate inbound tickets.' },
            { k: ['collaboration in incidents', 'collaborate on an incident', 'work together on ticket', 'incident teamwork', 'multiple people on incident'], r: 'Collaborating on an incident is done through the record itself: use Work Notes for internal technical discussion and handover context, add the right people to the assignment group, and create child tasks to split the work. Keep the requester updated with Additional Comments. Everything stays on the record so anyone joining can pick up the full history instantly.' },
            { k: ['assign work to a team', 'assign to a group', 'route to a team', 'delegate to team', 'assign task to group'], r: 'To assign work to a team, set the Assignment Group on the record first, then optionally the individual in Assigned To. Setting the group routes the item to that team\'s queue where a member can pick it up. Add a brief work note explaining the context so whoever takes it has what they need. The group manager can rebalance if needed.' },
            { k: ['team performance reports', 'team metrics report', 'report on team performance', 'group performance', 'team kpis'], r: 'To report on a team\'s performance, build a report or dashboard in the Studio section filtered to that team — common measures include volume handled, resolution time, SLA compliance, and backlog. Published to the Gallery, it gives the team and its leadership a clear, current view. Performance Analytics can add trend lines over time for deeper insight.' },
            { k: ['collaboration tools', 'how to collaborate', 'teamwork features', 'work with colleagues', 'collaboration overview'], r: 'The platform supports collaboration through shared records with full history, work notes and comments, assignment to groups and individuals, child tasks for splitting effort, and knowledge articles for capturing reusable answers. In Operations Intelligence, groups bundle people for shared access to automations and deliverables. Tell me what you are trying to coordinate and I will point you to the right feature.' },
            { k: ['notify a colleague', 'tag someone', 'mention a colleague', 'alert a teammate', 'loop someone in'], r: 'To bring a colleague into a piece of work, add them to the assignment or, on records that support it, mention them in a work note or comment so they are notified. For requests, use the watch list to keep someone informed without assigning them. Keeping the conversation on the record means the person you loop in sees the full context immediately.' },
            { k: ['team space', 'shared workspace team', 'team collaboration space', 'collaborative area', 'team hub'], r: 'For a shared place where a team coordinates work, the platform offers group queues, shared lists and boards, and Related Lists that surface connected records. In Operations Intelligence, a group is your team\'s shared context for automations and deliverables. If you need a dedicated collaboration space provisioned, raise a service request describing what the team needs.' },

            { k: ['raise a vendor request', 'vendor request', 'new vendor', 'onboard a vendor', 'request a supplier', 'add a vendor'], r: 'To raise a vendor or supplier request — onboarding a new vendor, requesting their services, or setting up access — use the Service Catalog and provide the vendor details, the service required, and the business justification. Procurement and vendor management review it. Say "I need to onboard a vendor" or "vendor request" and I will help you find the right catalog item.' },
            { k: ['contract renewal', 'renew a contract', 'contract renewal process', 'extend a contract', 'contract expiry renewal'], r: 'Contract renewals should be handled before the expiry date to avoid a lapse in service. The contract record tracks the end date and can trigger renewal reminders ahead of time. When a renewal is due, review the terms and usage, decide whether to renew, renegotiate, or let it lapse, and route it through procurement. Set reminders well in advance so nothing expires unnoticed.' },
            { k: ['vendor assessment', 'assess a vendor', 'vendor evaluation', 'supplier assessment', 'vendor due diligence'], r: 'A vendor assessment evaluates a supplier\'s suitability, security, and reliability before or during engagement, covering areas like security posture, financial stability, compliance, and performance history. Document the assessment so the decision is auditable. For new vendors, complete due diligence before granting access or signing, and reassess periodically for ongoing critical suppliers.' },
            { k: ['sla with vendors', 'underpinning contract', 'vendor sla', 'supplier sla', 'uc vendor agreement'], r: 'A vendor SLA, formalised as an Underpinning Contract (UC), is the commitment a supplier makes that supports your own customer-facing SLAs. If your service promises a four-hour fix but depends on a vendor, the underpinning contract must guarantee the vendor responds fast enough to keep that promise. Track UCs alongside your SLAs so the chain of commitments holds together.' },
            { k: ['third-party access management', 'vendor access', 'grant vendor access', 'manage external access', 'supplier access control'], r: 'Third-party access must be controlled carefully: grant vendors only the access they need, for only as long as they need it, with approval and a clear owner. Use access requests to provision it, set expiry where possible, and review it regularly. Promptly revoke access when an engagement ends. Raise an access request specifying the vendor, the systems, and the duration.' },
            { k: ['vendor performance', 'supplier performance', 'track vendor performance', 'vendor scorecard', 'measure vendor'], r: 'Vendor performance is tracked against the commitments in their contract and underpinning SLAs — measures like response and resolution times, availability, and quality. Build a report or dashboard in Studio to monitor it, and review the results with the vendor periodically. Consistent underperformance against the underpinning contract should trigger a formal conversation or escalation.' },
            { k: ['contract expiry alerts', 'contract expiry', 'expiring contracts', 'contract reminder', 'notify contract expiry'], r: 'Contract expiry alerts warn you before a contract or its underpinning SLA lapses so you can renew, renegotiate, or replace it in good time. The contract record holds the end date, and a Data Alert or Notification Rule built in Studio can flag upcoming expiries. Setting these up prevents the service gap and scramble that come from a contract quietly expiring.' },
            { k: ['what is contract management', 'contract management overview', 'manage contracts', 'contract lifecycle', 'contracts explained'], r: 'Contract management is the practice of tracking agreements with vendors across their lifecycle — from negotiation and signing, through active management against the agreed terms and SLAs, to renewal or termination. Keeping contracts, end dates, and underpinning SLAs recorded lets you manage cost, ensure suppliers meet their commitments, and avoid surprise expiries. Procurement usually owns the process.' },
            { k: ['vendor escalation', 'escalate to vendor', 'supplier escalation', 'vendor not meeting sla', 'escalate with supplier'], r: 'When a vendor is not meeting its underpinning contract, escalate through the agreed channel: document the breach against the SLA, raise it with the vendor\'s account manager, and involve your own vendor management or procurement team. Keep the evidence — response times and missed targets — on record. A clear, documented escalation is far more effective than an informal complaint.' },
            { k: ['procurement process', 'how to procure', 'procurement steps', 'buy from a vendor', 'purchasing process'], r: 'Procurement turns an approved need into a purchase: it typically starts with a catalog request, gathers the necessary approvals (including budget), raises a purchase order with the vendor, and records receipt and the resulting asset or contract. Start from the relevant catalog item and the process guides the rest. Say "I need to purchase something" and I will point you to the right request.' },

            { k: ['it chargeback', 'chargeback explained', 'cost allocation it', 'charge back costs', 'showback'], r: 'IT chargeback allocates the cost of IT services back to the departments that consume them, so each team sees and owns its share of spend. A lighter version, showback, reports the costs without actually billing them. Some catalog items display a price for exactly this purpose. For questions about how charges are calculated or which cost centre applies, contact your finance partner.' },
            { k: ['budget request', 'request a budget', 'it budget request', 'funding request', 'request funding'], r: 'A budget request seeks funding approval for a planned cost — new hardware, software, a project, or a contract. Raise it through the appropriate request with a clear justification, the amount, the cost centre, and the expected benefit. Finance approval usually applies before the spend can proceed. Say "I need budget approval" and I will help you find the right path.' },
            { k: ['cost centre code', 'cost center', 'what is a cost centre', 'cost centre lookup', 'cost code'], r: 'A cost centre is the accounting code that identifies which part of the organisation a cost belongs to, used to allocate spend and run chargeback. When you raise a request that carries cost, you may be asked for your cost centre so the charge lands in the right place. If you do not know yours, your manager or finance partner can tell you the correct code.' },
            { k: ['software license cost', 'license cost management', 'manage license spend', 'reduce license cost', 'software cost control'], r: 'Managing software license cost means matching what you pay for to what you actually use. Software Asset Management compares entitlements against installations to flag over-licensing (wasted spend) and under-licensing (compliance risk). Reclaiming unused licenses and planning renewals around real usage controls cost. Flag licenses you no longer need through a service request so they can be reclaimed.' },
            { k: ['hardware refresh budget', 'hardware refresh', 'equipment refresh budget', 'device refresh', 'refresh cycle budget'], r: 'A hardware refresh budget funds the planned replacement of aging devices on a cycle, before they fail or fall out of support. Asset records and lifecycle status show which devices are due, which feeds the refresh plan and its budget. If your device is at end of life, raise a request to refresh it, and reference the asset so it is tracked against the refresh plan.' },
            { k: ['finance approval for it spend', 'approve it spend', 'finance sign off', 'spend approval', 'it spend authorisation'], r: 'IT spend above a threshold typically needs finance approval before it proceeds. When you raise a request that incurs cost, the approval routing usually includes your manager and a finance or budget owner, who confirm the funds and the justification. You can see required approvals on the catalog item before submitting, and track their progress on your request once it is in.' },
            { k: ['roi of automation', 'automation roi', 'value of automation', 'automation benefit', 'justify automation'], r: 'The ROI of automation comes from the time and errors it removes: every manual run replaced by an automation saves effort and reduces mistakes, which adds up across the team. To make the case, quantify how often a task runs, the time it takes manually, and the cost of errors, then compare against the build effort. In Operations Intelligence, execution history helps evidence how much an automation is actually used.' },
            { k: ['what is financial management', 'it financial management', 'manage it costs', 'itfm', 'it finance overview'], r: 'IT Financial Management is the practice of planning, allocating, and controlling the cost of IT services — budgeting, chargeback or showback, license and asset cost optimisation, and spend approvals. It gives the business visibility of what IT costs and where the money goes, and helps target investment where it delivers the most value. Finance and IT partner to run it.' },
            { k: ['budget tracking', 'track spending', 'monitor budget', 'budget vs actual', 'spend tracking'], r: 'Budget tracking compares planned spend against actual spend so you can see whether you are on track and act before an overrun. Build a report or dashboard in Studio to monitor it by cost centre or category. Pairing budget tracking with chargeback data shows both what was planned and what each team actually consumed, making the numbers transparent and accountable.' },
            { k: ['purchase approval', 'approve a purchase', 'purchase sign off', 'authorise purchase', 'purchase order approval'], r: 'A purchase approval authorises a specific buy before the order is placed. It usually flows from a catalog request through manager and budget-owner approval, confirming both the need and the available funds. You can see the required approvals on the item before you submit, and once submitted, track them on your request. Say "Show my approvals" if you are the one who needs to approve something.' },

            { k: ['create a report', 'build a report', 'new report', 'how to create report', 'report designer', 'reporting tool'], r: 'To build a report in ServiceNow, navigate to Reports > Create New in the Application Navigator, or right-click any list column header and choose a chart type to pre-populate the source. The Report Designer walks you through four tabs: Data (choose table or data source), Type (pick from 27 visualisations), Configure (set grouping, aggregation, and filters), and Style (colours, labels, legend). Click Run to preview, then Save when ready.' },
            { k: ['report types', 'types of reports', 'available report types', 'what reports can i build', 'servicenow visualizations', 'report visualizations'], r: 'ServiceNow offers 27 report types:\n- Time series: Trend (line), Area, Spline, Column, Trendbox\n- Bar/comparison: Bar (horizontal), Bar (vertical), Pareto, Funnel, Pyramid\n- Proportion: Pie, Donut, Semi-donut\n- Data tables: List, Pivot (matrix), Multilevel Pivot\n- Density: Heatmap, Box Plot\n- KPIs: Gauge/Dial, Single Score\n- Geographic: Map\n- Special: Calendar, Control Chart, Histogram\nChoose based on your goal: trends over time use Trend or Area; category comparisons use Bar or Pareto; proportions use Pie; matrices use Pivot; large-dataset patterns use Heatmap.' },
            { k: ['bar chart report', 'horizontal bar', 'vertical bar report', 'bar report servicenow', 'bar chart'], r: 'Bar reports compare values across categories. Horizontal bars work best when category names are long or when there are many groups. Vertical bars suit fewer categories with short labels. In the Configure tab, set Group By (the category field, e.g. Priority or Assignment Group) and Aggregate (usually Count). Add Stack By to split each bar into a second dimension. Add a Drilldown report to make bars clickable.' },
            { k: ['pie chart report', 'pie report', 'donut chart', 'donut report', 'pie chart servicenow'], r: 'Pie and Donut reports show proportional distribution of a whole. Best for up to 5 or 6 slices — beyond that, use a Bar report for clarity. In Configure, set Group By to the slice field and Aggregate to Count or Sum. Enable "Show other" to collapse low-count groups into a single Other slice. Avoid pie charts when precise comparison between slices matters; use Bar instead.' },
            { k: ['trend report', 'trend chart', 'line chart', 'time series report', 'incidents over time', 'trend over time'], r: 'Trend reports plot a metric over time using a line. They are ideal for tracking volume, resolution rates, or KPIs week over week or month over month. In Configure, set Trend By to a date field (e.g. Opened, Resolved, Created) and Per to Day, Week, Month, Quarter, or Year. Group By adds multiple lines for comparison. Area and Spline types use the same configuration but with filled or curved lines.' },
            { k: ['pivot table report', 'pivot report', 'matrix report', 'cross tab report', 'multilevel pivot'], r: 'Pivot reports display a two-dimensional matrix of counts or aggregates. Set the first Group By as the row dimension and add a second Group By for columns. This is ideal for cross-referencing two fields, for example State vs Priority across all incidents. A Multilevel Pivot adds a third dimension. The Configure tab shows Add Another Group By once the first is set.' },
            { k: ['heatmap report', 'heat map', 'heatmap chart', 'density chart'], r: 'Heatmap reports use colour intensity to show the density or magnitude of values in a matrix. They are ideal for visualising large datasets and spotting patterns, for example volume of incidents by day of week versus hour of day. Use two Group By fields to define the matrix axes, and set the Aggregate to Count. Darker or more saturated colours indicate higher values.' },
            { k: ['list report', 'tabular report', 'flat list report', 'report as table', 'report columns'], r: 'List reports display records in a simple table with configurable columns — similar to a list view but exportable and shareable as a report. In Configure, select the Columns to display, set Row Count, and add any sort order. Use conditions to filter records. List reports support export to CSV, Excel, XML, and PDF, making them useful for data extracts.' },
            { k: ['report filter', 'report conditions', 'filter report data', 'report query', 'report where clause'], r: 'The Conditions panel at the bottom of the Report Designer is always visible regardless of which tab you are on. Build conditions using field, operator, and value — for example State is In Progress. Dot-walk through reference fields (e.g. Caller.Department.Location) for fine-grained filtering. AND and OR logic are both supported. Dynamic values like the current user can be set using javascript:gs.getUserID().' },
            { k: ['share a report', 'report sharing', 'share report with team', 'publish report', 'report visibility'], r: 'From a report, use the Share button or three-dot menu:\n- Visibility: Me — private to you\n- Visibility: Everyone — all platform users\n- Visibility: Groups/Users — share with specific named groups or users\n- Add to Dashboard — embed the report as a widget\n- Schedule — auto-deliver by email on a set cadence\n- Export — download as PDF, Excel, CSV, XML, PNG, or JPEG\n- Publish — generate a public URL\nRoles: report_group to share with groups, report_global to share with all groups, report_admin to manage all reports.' },
            { k: ['schedule a report', 'scheduled report', 'email report automatically', 'report on a schedule', 'recurring report delivery'], r: 'Scheduled reports automatically deliver by email. From the report, choose Share > Schedule, or navigate to Reports > Scheduled Reports. Set Frequency (Daily, Weekly, Monthly), the delivery Day and Time, Recipients (users, groups, or external email addresses), and Format (PDF for all types; Excel/CSV/XML for lists; PNG/JPEG for charts). The report_scheduler or report_admin role is required.' },
            { k: ['report data source', 'report source', 'data source servicenow', 'reusable report filter', 'shared report conditions'], r: 'A Data Source is a saved, reusable set of filter conditions stored as a named record. Multiple reports can share one Data Source; updating the source updates every report that uses it. Create them at Reports > Administration > Data Sources. Choose Source Type: Data Source in the report designer to select one. You can also save a report\'s conditions as a new Data Source using "Save as Report Source".' },
            { k: ['create dashboard', 'build dashboard', 'new dashboard', 'how to create dashboard', 'servicenow dashboard'], r: 'To create a responsive dashboard, navigate to Dashboards in the Application Navigator > click New. Give it a name and description. Once created, click Edit to add tabs and widgets. Drag widgets to position them and resize by dragging corners. Responsive dashboards adapt to screen size automatically and support multi-column layouts configured per tab.' },
            { k: ['add widget to dashboard', 'dashboard widget', 'add report to dashboard', 'embed report dashboard', 'dashboard content'], r: 'In dashboard Edit mode, click Add Widget to open the widget picker. Available widget types include: Report (embeds any saved report), Single Score (a large KPI number), Gauge (dial or speedometer for thresholds), Clock (live time), List (quick record list), HTML/UI Page, and Performance Analytics widgets (scorecard, breakdown, trend). Drag to reorder; resize by dragging widget edges.' },
            { k: ['dashboard tabs', 'dashboard sections', 'tab on dashboard', 'multiple tabs dashboard', 'organise dashboard'], r: 'Responsive dashboards support multiple tabs to organise content into sections. In Edit mode, click Add Tab to create a new tab, name it, and set its layout (one, two, or three columns). Each tab independently holds widgets and has its own layout. Users navigate tabs from the top of the dashboard.' },
            { k: ['share dashboard', 'dashboard permissions', 'dashboard access', 'dashboard sharing', 'who can see dashboard'], r: 'Open the dashboard and click the Share button. Add users, groups, or roles with either Can Read or Can Edit permission. Roles: admin, dashboard_admin, pa_admin, pa_power_user can see roles in the Sharing panel; pa_admin and pa_power_user can manage any editable dashboard. Important: sharing the dashboard does not automatically share the reports on it — share each underlying report separately with the same audience so its data is visible.' },
            { k: ['homepage vs dashboard', 'homepage difference', 'what is homepage servicenow', 'legacy dashboard', 'responsive dashboard'], r: 'Homepages are the older, non-responsive layout tied to the classic UI. Responsive dashboards are the current standard and adapt to any screen size, support drag-and-drop layout editing, multi-column tabs, and richer widget types. Performance Analytics dashboards are a specialised type using PA scorecard and breakdown widgets. For new work, always build responsive dashboards rather than homepages.' },
            { k: ['performance analytics dashboard', 'pa dashboard', 'scorecard dashboard', 'pa widgets', 'pa scorecard'], r: 'Performance Analytics (PA) dashboards use PA-specific widgets: Scorecards (a KPI with trend, target line, and breakdown), Breakdown widgets (the same score split by a dimension like Priority or Group), and Trend charts (historical data from PA indicators). These require the Performance Analytics plugin and pre-configured indicators with scheduled data collection. Standard report widgets can also be placed alongside PA widgets on the same dashboard.' },
            { k: ['what is performance analytics', 'performance analytics', 'pa servicenow', 'kpi tracking servicenow', 'indicator servicenow'], r: 'Performance Analytics (PA) is a ServiceNow module that collects and stores historical snapshots of KPIs called Indicators. Unlike reports that query live data, PA Indicators are scheduled (daily, weekly, etc.) to capture counts at that moment so you can trend over time. Key components: Indicator (the metric), Data Collector (scheduled job that captures it), Breakdown (dimension to split the score by, e.g. Priority), Threshold (target value), and Analytics Hub or dashboard widgets to visualise.' },
            { k: ['create indicator', 'pa indicator', 'kpi indicator servicenow', 'performance analytics indicator', 'build indicator'], r: 'Create a PA Indicator at Performance Analytics > Indicators > New. Set the Source (table and conditions), the Aggregate (Count, Sum, Avg), the Frequency (how often data is collected), and optionally a Breakdown for drill-down. After saving, run a Data Collector job (Collect Data Now) to populate historical data. The indicator then appears in Analytics Hub and can be added to scorecards and dashboards.' },
            { k: ['predictive intelligence', 'ml servicenow', 'machine learning servicenow', 'now intelligence ml', 'ai categorization'], r: 'Predictive Intelligence uses machine learning to automate text classification on ServiceNow records. Common use cases: auto-categorise incoming incidents by reading the short description, suggest assignment groups, predict priority, and flag similar previous records. It uses Solution Definitions with a training corpus from existing records. After training, activate the solution and attach it to a field using a Prediction policy. Monitor accuracy from the ML Solutions dashboard.' },
            { k: ['similar incidents', 'ai similar records', 'predictive similar', 'duplicate detection ml', 'similar ticket detection'], r: 'The Similarity solution in Predictive Intelligence finds records with similar text to the current record. When enabled on the Incident form, it surfaces a Related Items panel showing the top similar past incidents. This helps agents find prior resolutions quickly. It requires the Predictive Intelligence plugin and a trained Similarity solution configured for the incident table.' },
            { k: ['what is cmdb', 'cmdb explained', 'configuration management database', 'cmdb overview', 'what is a ci'], r: 'The Configuration Management Database (CMDB) is the authoritative repository of Configuration Items (CIs) — every asset, service, and component IT manages. CIs include hardware (servers, laptops, network devices), software applications, cloud resources, and business services. Each CI record captures attributes, relationships to other CIs, and lifecycle state. The CMDB is the foundation for incident routing, change impact analysis, and service mapping.' },
            { k: ['configuration item', 'what is a ci', 'ci record', 'ci attributes', 'configuration item class'], r: 'A Configuration Item (CI) is any component managed in the CMDB. CIs are organised into classes in a hierarchy — the base class is cmdb_ci, with subclasses like cmdb_ci_server, cmdb_ci_computer, cmdb_ci_appl (application), cmdb_ci_service, and hundreds more. Each class adds specific attributes relevant to that type. Use the CMDB Explorer or the cmdb_ci table to view CI records and their relationships.' },
            { k: ['cmdb relationships', 'ci relationships', 'cmdb dependency', 'ci depends on', 'relates to ci'], r: 'CIs are linked by typed relationships stored in the cmdb_rel_ci table. Common relationship types include: Runs On (application runs on a server), Hosted On, Depends On, Connected To, and Virtualised By. Relationships power impact analysis — when a CI fails, the relationship graph shows what services and CIs are downstream. The CMDB Explorer visualises the graph interactively.' },
            { k: ['cmdb health', 'cmdb score', 'cmdb quality', 'ci health check', 'data quality cmdb'], r: 'CMDB Health is measured using three metrics: Completeness (required fields populated), Compliance (adherence to data policies), and Correctness (no duplicates or stale data). The CMDB Health Dashboard at Configuration > CMDB Health shows scores per class and per attribute. Use Identification and Reconciliation Engine (IRE) rules to prevent duplicate CI creation. Schedule regular health runs to maintain quality.' },
            { k: ['service mapping', 'service map', 'application service map', 'what is service mapping', 'map service dependencies'], r: 'Service Mapping automatically discovers the infrastructure that supports each business service by probing your environment. It builds a Service Map — a visual graph of the CIs (servers, databases, middleware, load balancers) and their relationships that compose the service. This powers accurate incident impact, change risk analysis, and availability monitoring. Activate the Discovery and Service Mapping plugins and configure Application Service records to begin.' },
            { k: ['discovery servicenow', 'what is discovery', 'discover hardware', 'auto populate cmdb', 'cmdb population'], r: 'Discovery is the ServiceNow module that probes your network to find and populate CIs automatically. It uses Mid Servers as probes, which run Shazzam (port scanning) and Probe scripts against IP ranges. Discovery populates the CMDB with servers, storage, network devices, applications, databases, and cloud resources. Schedule Discovery runs from Discovery > Discovery Schedules. IRE deduplicates and reconciles incoming data with existing CI records.' },
            { k: ['mid server', 'what is mid server', 'mid server servicenow', 'discovery mid server', 'agent servicenow'], r: 'The Mid Server is a Java agent installed in your on-premises or private network environment that acts as a proxy between ServiceNow and internal resources. It runs Discovery probes, executes Integration Hub spokes for on-prem targets, and enables secure data transfer without opening inbound firewall rules. Install one or more Mid Servers per network segment, and configure them under Mid Server > Servers. High Availability pairs two Mid Servers for redundancy.' },
            { k: ['integration hub', 'integrationhub', 'flow action spokes', 'servicenow spoke', 'integration spoke'], r: 'IntegrationHub extends Flow Designer with pre-built Spokes — packages of Actions for third-party systems. Each Spoke provides trigger and action steps to connect to external tools such as Slack, Microsoft Teams, Jira, GitHub, Salesforce, AWS, Azure, and hundreds more. Use them in Flow Designer flows without writing code. Find available Spokes in the ServiceNow App Store. Custom Spokes can be built using REST, SOAP, or scripted steps.' },
            { k: ['flow designer', 'create a flow', 'servicenow flow', 'flow automation', 'no code automation'], r: 'Flow Designer is the no-code/low-code automation builder in ServiceNow. Build flows with: a Trigger (record-based, schedule, inbound email, or API call), and a sequence of Actions (create/update records, send notifications, call Integration Hub spokes, run scripts). Data pills carry values between steps. Publish flows to activate them. Sub-flows can be reused across multiple parent flows. Access via Flow Designer > Designer.' },
            { k: ['app engine studio', 'aes', 'low code app', 'build an app', 'custom app servicenow', 'citizen developer'], r: 'App Engine Studio (AES) is the low-code development environment for building custom applications without deep platform expertise. It provides guided wizards for creating tables, forms, flows, portals, and roles. Apps built in AES are scoped applications. Citizen developers (business users) can build simple apps; professional developers can extend them in Studio. Navigate to App Engine > App Engine Studio. Deployment uses App Engine Management Center pipelines.' },
            { k: ['security operations', 'secops', 'siem integration servicenow', 'security incident response', 'vulnerability response'], r: 'ServiceNow Security Operations (SecOps) includes:\n- Security Incident Response (SIR): triage, investigate, and resolve security incidents with structured playbooks and cross-team coordination\n- Vulnerability Response (VR): ingest vulnerability scanner results (Qualys, Tenable, Rapid7), prioritise by CMDB impact, and assign remediation tasks\n- Threat Intelligence: enrich records with STIX/TAXII feeds and IOCs\n- Configuration Compliance: assess CI configurations against benchmarks\nAll SecOps work items track state, owner, SLAs, and evidence in a structured record.' },
            { k: ['vulnerability management', 'vulnerability response', 'patch vulnerabilities', 'cve management', 'remediate vulnerability'], r: 'Vulnerability Response ingests scan results from tools like Qualys, Tenable, Rapid7, and Veracode via integration spokes. Each vulnerability is mapped to affected CIs in the CMDB, prioritised by CVSS score and CI criticality, grouped into Vulnerable Items, and assigned to remediation owners. SLA timers track compliance deadlines. Exemptions and exceptions can be documented. Reports track mean time to remediate and compliance posture by group or service.' },
            { k: ['grc servicenow', 'governance risk compliance', 'policy management servicenow', 'risk management servicenow', 'compliance management'], r: 'ServiceNow GRC (Governance, Risk, and Compliance) includes:\n- Policy and Compliance Management: author policies, map to controls, schedule attestations, and track evidence\n- Risk Management: identify, assess, and treat risks with risk registers, risk scoring, and risk response workflows\n- Audit Management: plan audits, assign engagements, collect evidence, and track findings\n- Business Continuity Management: continuity plans, BIA, and recovery procedures\nAll GRC objects relate to entities (departments, applications, services) for continuous control monitoring.' },
            { k: ['hr service delivery', 'hrsd', 'hr case', 'employee service center', 'hr request', 'hr portal'], r: 'HR Service Delivery (HRSD) provides an employee experience layer for HR processes:\n- Employee Center: a unified portal for HR, IT, and facility requests\n- HR Cases: structured records for onboarding, offboarding, leave, payroll, and general HR inquiries\n- Lifecycle Events: guided experiences for complex life events (new hire, promotion, parental leave) that trigger tasks across departments\n- Skills and Journeys: employee development tracking\n- Integrations: connect to HRIS systems (Workday, SAP, Oracle) via Integration Hub\nHR agents work cases in Agent Workspace with SLA tracking and knowledge article surfacing.' },
            { k: ['customer service management', 'csm servicenow', 'customer case', 'external portal', 'b2b service'], r: 'Customer Service Management (CSM) manages B2B and B2C service relationships:\n- Cases: customer-facing tickets with SLA commitments\n- Customer Portal: branded self-service portal for end customers to submit, track, and manage cases\n- Account and Contact hierarchy: model your customer organisation with parent accounts, child accounts, and contacts\n- Entitlements: define service contract terms (SLA, coverage, inclusions) per customer\n- Field Service integration: dispatch technicians when cases require on-site resolution\n- Proactive case creation from IoT events or monitoring alerts' },
            { k: ['field service management', 'fsm servicenow', 'work order', 'dispatcher workspace', 'field technician', 'field service'], r: 'Field Service Management (FSM) manages on-site work:\n- Work Orders (wm_order) contain Work Order Tasks (wm_task) assigned to field technicians\n- Dispatcher Workspace (UI Builder-based) lets dispatchers view, filter, and assign tasks on a calendar\n- Task states: Draft > Assigned > Work in Progress > Complete (or with qualification: Draft > Awaiting Qualification > Qualified > Assigned > WIP > Complete)\n- Scheduling Optimization Engine assigns tasks automatically by skill, location, availability, and travel time\n- Territory Management uses GeoJSON boundaries for geographic dispatch\n- Field agents use the Now Mobile app with offline caching, push notifications, and location tracking\n- Dispatch Groups (type: wm_dispatch) own tasks; Agent Groups (type: wm_work) hold technicians' },
            { k: ['work order servicenow', 'create work order', 'work order task', 'wm order', 'field service work order'], r: 'A Work Order (wm_order) is the parent record grouping field service work. It contains one or more Work Order Tasks (wm_task) that are individually dispatched and completed. Key fields: short_description, priority, state, location, assigned_to, skill_required. Tasks must be in Pending Dispatch state to appear in Dispatcher Workspace. Create them from the Field Service Management module or from a related incident or case.' },
            { k: ['strategic portfolio management', 'spm servicenow', 'project management servicenow', 'demand management', 'it portfolio'], r: 'Strategic Portfolio Management (SPM/ITBM) covers the full investment lifecycle:\n- Demand Management: capture ideas and demands, assess feasibility, approve, and convert to projects\n- Project Management: waterfall (Gantt-based via pm_project), agile (epics/stories/sprints via CWM), or hybrid\n- Resource Management: capacity planning, utilisation dashboards, skill and role matching\n- Financial Management: cost plans (labour and non-labour), benefit tracking, investment objects\n- Goal Framework (Pro): OKR-style goal hierarchy linking strategy to execution\n- Enterprise Agile Planning (Pro): SAFe support with Program Increments and Agile Release Trains\nTwo licensing tiers: Standard (PPM/waterfall focus) and Professional (adds EAP and Strategy Planning Workspace).' },
            { k: ['demand management', 'raise a demand', 'demand record', 'capture demand', 'intake demand'], r: 'Demand Management (dmn_demand table) is the structured intake process for new investments. The lifecycle is: Capture (submit the idea) > Centralize (assign a demand manager) > Assess (feasibility, effort, cost, business case) > Approve (stakeholder sign-off) > Convert (create a project, epic, or product backlog). Demands feed the Strategic Planning Workspace roadmap and link to portfolio goals. Access via Strategic Portfolio Management > Demands.' },
            { k: ['project management servicenow', 'pm project', 'project plan', 'project task servicenow', 'milestone'], r: 'Projects (pm_project) in ServiceNow have three methodology options: Waterfall (Gantt chart with tasks and milestones, PMO-controlled), Agile (epics/stories/sprints via Collaborative Work Management), or Hybrid (PMO timeline with agile team execution). Project Tasks (pm_project_task) hold the work breakdown. Resources are allocated per task. Status Reports (project_status) provide snapshot health views. Navigate to Project > Projects to manage.' },
            { k: ['script include servicenow', 'what is a script include', 'server side script', 'create script include', 'reusable script'], r: 'A Script Include is a reusable server-side JavaScript class. Define it at System Definition > Script Includes. Structure: Class.create() with an initialize function and methods. Call it from Business Rules, Scheduled Jobs, REST API operations, or other Script Includes by instantiating the class: var obj = new MyScriptInclude(); obj.myMethod(). If "Client callable" is checked, it can be called from client scripts via GlideAjax. In scoped apps, prefix global Script Includes with global. (e.g. new global.GlideQuery()).' },
            { k: ['business rule servicenow', 'create business rule', 'what is business rule', 'server automation', 'trigger on table'], r: 'Business Rules run server-side JavaScript on a table when records change. Four types: Before (runs before DB write; changes to current are saved), After (runs after DB write; current changes are NOT re-saved), Async (runs in background after write; preferred over After for performance), Display (runs on form load; uses g_scratchpad to pass data to client). Each rule targets a table and one or more operations: Insert, Update, Delete, or Query. Lower Order values run first. Available variables: current (the record), previous (values before edit), gs (GlideSystem).' },
            { k: ['acl servicenow', 'access control list', 'create acl', 'table security', 'field security servicenow'], r: 'ACLs (Access Control Lists) govern who can read, write, create, or delete records and fields. Navigate to Security > Access Control. Name format: table_name.none (whole record) or table_name.field_name (specific field). Three evaluation layers: Roles (fastest, must have one listed role), Condition (expression must be true), Script (returns answer=true or answer=false) — all three must pass. Use Debug Security Rules (System Diagnostics) to troubleshoot. Avoid GlideRecord queries inside ACL scripts for performance.' },
            { k: ['gliderecord', 'query database', 'gliderecord api', 'server side query', 'servicenow database query'], r: 'GlideRecord is the core server-side API for database operations.\n- Query: var gr = new GlideRecord("table"); gr.addQuery("field","value"); gr.query(); while(gr.next()) { var v = gr.getValue("field"); }\n- Single record: gr.get("sys_id_value") returns boolean\n- Insert: gr.initialize(); gr.setValue("field","value"); gr.insert();\n- Update: gr.setValue("field","value"); gr.update();\n- Delete: gr.deleteRecord();\nUse GlideRecordSecure to enforce ACLs in server-side scripts. Manual checks: gr.canRead(), gr.canWrite().' },
            { k: ['update set', 'what is an update set', 'how to use update set', 'update set migration', 'configuration migration'], r: 'An Update Set is a container that captures configuration changes (Customer Updates) so they can be migrated from one instance to another. To use: navigate to System Update Sets > Local Update Sets > New, give it a name, save, then click "Make This My Current Set". All configuration saves while it is current are captured. When finished: set State to Complete, then Export to XML for migration. In the target: import the XML, Preview (check for conflicts), then Commit to apply.' },
            { k: ['commit update set', 'migrate update set', 'deploy update set', 'update set workflow', 'move config between instances'], r: 'Migration steps from source to target:\n1. In source: complete the update set, click Export to XML\n2. In target: go to Retrieved Update Sets > Import Update Set from XML\n3. Open the retrieved set, click Preview, review any Preview Problems (warnings are acceptable; errors must be resolved)\n4. Click Commit to apply all changes\nBest practices: one update set per user story, never delete update sets, never revert the Default update set, batch child sets under a parent for sprint releases to commit as a single operation.' },
            { k: ['update set best practices', 'update set tips', 'how many update sets', 'update set naming', 'update set guidance'], r: 'Key update set best practices:\n- Name format: Owner — StoryID — Description (e.g. "Maria — STRY0001 — Email Notifications")\n- One update set per user story for easy troubleshooting\n- Keep sets under 100 Customer Updates\n- Never delete update sets — use "Ignore" state in production after committing\n- Never delete Customer Updates (sys_update_xml) — move unwanted ones to Default set instead\n- Use parent-child batching for sprint releases: one parent set, multiple child story sets\n- Always test Dev > UAT > Prod before production deployment\n- Publish checked-out workflows before completing a set' },
            { k: ['client script', 'client side script', 'form automation', 'g_form', 'client scripting'], r: 'Client Scripts run in the browser on ServiceNow forms. Four types: onLoad (runs when form loads), onChange (runs when a specific field changes — signature: function onChange(control, oldValue, newValue, isLoading, isTemplate)), onSubmit (runs on Save — return false to cancel), onCellEdit (runs when a list cell changes). Always use g_form API methods instead of direct DOM access. Key methods: g_form.getValue(), g_form.setValue(), g_form.setDisplay(), g_form.setMandatory(), g_form.setReadOnly(), g_form.showFieldMsg().' },
            { k: ['glidedatetime', 'date time servicenow', 'servicenow date format', 'glide date time', 'now datetime'], r: 'GlideDateTime is the server-side date/time API. In scoped apps, gs.nowDateTime() is blocked — use new GlideDateTime().getValue() instead, which returns the current UTC datetime as a string in format "YYYY-MM-DD HH:MM:SS". To get a display value in the instance timezone use new GlideDateTime().getDisplayValue(). Parse a string: var gdt = new GlideDateTime("2024-01-15 09:00:00"). Add days: gdt.addDays(5). Compare: gdt.before(otherGdt).' },
            { k: ['scoped app', 'application scope', 'scoped application', 'private scope', 'application isolation'], r: 'A scoped application is an isolated ServiceNow app with its own namespace (e.g. x_infte_ops_int). All artifacts — tables, script includes, business rules, ACLs, roles, notifications — belong to the scope. Restrictions in scoped apps include: no gs.nowDateTime() (use GlideDateTime), no eval() (use GlideScopedEvaluator), no direct access to global tables without explicit cross-scope grants. sys_properties is intentionally global and accessible via gs.getProperty()/gs.setProperty(). The scope prevents conflicts with other applications.' },
            { k: ['studio servicenow', 'servicenow studio ide', 'application explorer', 'develop in studio', 'studio ide'], r: 'ServiceNow Studio is the integrated development environment for scoped applications. Access it from System Applications > Studio — it opens in a separate window. The Application Explorer on the left organises files into categories: Data Model, Forms & UI, Logic & Automation, Security, Client Development, Navigation, and Service Portal. Features include syntax highlighting, autocomplete, Log Points (non-invasive logging without modifying scripts), a Script Debugger with breakpoints, and source control integration with GitHub.' },
            { k: ['integration hub spoke', 'build a spoke', 'custom integration', 'rest integration servicenow', 'api integration'], r: 'IntegrationHub Spokes are packaged integrations. Pre-built Spokes are available on the App Store for Slack, Microsoft Teams, Jira, GitHub, Salesforce, AWS, Azure, ServiceNow to ServiceNow, and many more. To call an external REST API, use the REST action in Flow Designer (no spoke needed for basic REST) or build a custom Spoke with Action Designer. For Mid Server-proxied on-premises calls, configure the connection alias to route through a Mid Server.' },
            { k: ['reports navigation', 'where to find reports', 'reporting module', 'run report', 'open a report'], r: 'Reports are accessed via All > Reports in the Application Navigator. Sections include: View/Run (all reports you can access), Create New (report designer), My Reports (only yours), Group (shared via group), Global (shared with everyone), Administration (data sources, scheduled reports, report images). Right-click any list column to create a quick chart. Reports can also be pinned to dashboards and accessed from there.' },
            { k: ['dashboard navigation', 'where are dashboards', 'find dashboards', 'open dashboard', 'dashboards module'], r: 'Dashboards are accessed via All > Dashboards in the Application Navigator, or via the grid icon at the top of the screen in the Now Platform UI. The Dashboards list shows all dashboards you can see. Click a dashboard to view it. Click Edit to modify layout and widgets. Use the three-dot menu for Share, Duplicate, or Delete options. The default homepage shown at login can be set per user from their profile preferences.' },
            { k: ['report aggregation', 'count distinct', 'sum report', 'average report', 'aggregate function report'], r: 'Reports support six aggregation functions set in the Configure tab:\n- Count: total number of matching records\n- Count Distinct: number of unique values in the aggregate field\n- Sum: total of a numeric field (e.g. total duration)\n- Average: mean value of a numeric field\n- Max: highest value\n- Min: lowest value\nChoose Sum, Average, Max, or Min when the aggregation field is a numeric or duration field. Count is the default for most category comparisons.' },
            { k: ['report export', 'download report', 'export to excel', 'report pdf', 'save report as file'], r: 'Any report can be exported from the Share menu or three-dot menu:\n- PDF: all report types, full formatting\n- Excel (.xlsx): all types\n- CSV: list and pivot reports (data only)\n- XML: data export\n- PNG / JPEG: graphical chart types only\nScheduled reports can auto-deliver in any supported format by email. The report_publisher role is needed to generate a public URL for browser-based sharing.' }
        ];

        if (containsAny(aq, ['goodbye','bye bye','bye','see you','see ya','farewell','take care','talk later','catch you later','have a good day','have a good one','signing off','done for now','that is all','thats all','all done','closing','logging off','ttyl','cya'])) {
            data.reply = 'Goodbye' + (userFirstName ? ', ' + userFirstName : '') + '! It was a pleasure helping you. Come back any time you need help with requests, incidents, approvals, automations, or anything else on the platform. Have a great day!';
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['hello','hi there','hey there','good morning','good afternoon','good evening','howdy','greetings','whats up','yo ','hi ','hey ','good day','g\'day','morning','evening','afternoon','sup ','what\'s up','hola','hey you','hi you','alright','allo','bonjour','ciao','namaste','ni hao','salut','hey ho','rise and shine','morning all','whats cracking','whats happening','how goes it','how do you do','whats going on','howdy do','long time no see','nice to meet you','pleasure to meet you','hey buddy','hello friend','hello there','hey friend']) || aq === 'hi' || aq === 'hey' || aq === 'hello' || aq === 'sup' || aq === 'morning' || aq === 'evening' || aq === 'afternoon' || aq === 'yo') {
            var greetNow = ''; try { greetNow = '' + new GlideDateTime().getValue(); } catch (dte) { greetNow = ''; }
            var greetHour = (greetNow.length >= 13) ? parseInt(greetNow.substring(11, 13), 10) : 9;
            if (isNaN(greetHour)) { greetHour = 9; }
            var greetTime = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening';
            data.reply = greetTime + (userFirstName ? ', ' + userFirstName : '') + '! I am your Operations Assistant — here to help with anything on the platform.\n\n' +
                'I can help you with:\n' +
                '- Service requests and catalog items\n' +
                '- Incidents and approvals\n' +
                '- Knowledge articles\n' +
                '- Automations and group memberships\n\n' +
                'Just describe what you need in plain English and I will handle the rest. Type **help** for everything I can do.';
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['thank you','thanks','thank u','appreciate','great job','well done','that helped','that works','sorted','resolved it','cheers','brilliant','perfect','excellent','fantastic','wonderful','great thanks','many thanks','much appreciated','you rock','legend','superb','nice one','spot on','nailed it','you are the best','youre the best','love it','amazing','life saver','saved me'])) {
            data.reply = 'You are very welcome' + (userFirstName ? ', ' + userFirstName : '') + '! Is there anything else I can help you with?';
            data.type  = 'info';
            return;
        }

        if (containsAny(aq, ['help','what can you','what can i','capabilities','commands','guide me','assist me','how to use you','what do you do','list commands','show commands','show me what you can do','what do you know','tell me what you can do','menu','options','what are my options','how does this work','where do i start','getting started','i dont know what to ask','i am new here','im new here','new user','onboarding help','first time','beginner','how to use this','what is this','explain this'])) {
            var isAdminUser = (hasAdmin === true);
            data.reply = 'I am your Operations Assistant. Here is what I can help with:\n\n' +
                '**Your Requests & Tickets**\n' +
                '- "Show my incidents" — active IT tickets\n' +
                '- "Show my requests" — service requests\n' +
                '- "Show my approvals" — items awaiting your approval\n' +
                '- "Create an incident" — report an IT issue\n' +
                '- "INC0001234" — look up a specific ticket\n\n' +
                '**Platform Services**\n' +
                '- "I need a new laptop" — search the Service Catalog\n' +
                '- "Request VPN access" — find access request items\n' +
                '- "How do I use Flow Designer?" — module guidance\n' +
                '- "What is a problem record?" — knowledge questions\n\n' +
                '**Operations Intelligence**\n' +
                '- "Show my automations" — automations you can run\n' +
                '- "Run [automation name]" — trigger an automation\n' +
                '- "Show recent executions" — activity history\n' +
                '- "What groups am I in?" — your OI group memberships\n' +
                '- "Go to Gallery" — navigate to the deliverables gallery\n\n' +
                '**Your Profile**\n' +
                '- "Who am I?" — your profile and roles\n' +
                '- "Service health" — platform status\n\n' +
                (isAdminUser ? '**Administration**\n' +
                '- "Create a report" — build a managed report in Studio\n' +
                '- "Create a dashboard" — build a managed dashboard in Studio\n' +
                '- "Go to Command" — open the administration console\n\n' : '') +
                'You can also just describe a problem in plain English and I will find the right resource. Try it — say something like "my printer is not working" or "I need more storage space".';
            data.type  = 'info';
            return;
        }

        if (containsAny(aq, ['my profile','who am i','my account','my details','my information','about me','my user record','my name','show my profile','what is my role','my access','what can i access','my permissions','what role do i have','am i an admin','what are my roles','my user info','tell me about me','show my info'])) {
            var profRec = new GlideRecord('sys_user');
            var profName = 'Unknown', profEmail = '', profDept = '', profTitle = '';
            if (profRec.get(userSysId)) {
                profName  = '' + profRec.getDisplayValue('name');
                profEmail = '' + (profRec.getValue('email') || '');
                profDept  = '' + (profRec.getDisplayValue('department') || '');
                profTitle = '' + (profRec.getValue('title') || '');
            }
            var roleList = [];
            if (hasAdmin)      { roleList.push('Administrator'); }
            if (hasLeadership) { roleList.push('Leadership'); }
            if (hasCreator)    { roleList.push('Creator'); }
            if (hasUser)       { roleList.push('User'); }
            data.reply = 'Here is your profile, ' + (userFirstName || data.userName || profName) + ':\n\n' +
                'Name: ' + profName + '\n' +
                (profEmail ? 'Email: ' + profEmail + '\n' : '') +
                (profTitle ? 'Title: ' + profTitle + '\n' : '') +
                (profDept  ? 'Department: ' + profDept + '\n' : '') +
                'Roles: ' + (roleList.length ? roleList.join(', ') : 'None assigned') + '\n' +
                'Groups: ' + (data.userGroups.length ? data.userGroups.length + ' group' + (data.userGroups.length === 1 ? '' : 's') : 'None');
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['go to workspace','show workspace','open workspace','take me to workspace','workspace section','go to gallery','show gallery','open gallery','operations gallery','go to studio','show studio','open studio','operations studio','go to governance','show governance','open governance','operations governance','go to command','show command','open command','operations command','navigate to','switch to section','change section'])) {
            if (containsAny(aq, ['studio'])) {
                if (hasCreator || hasAdmin) {
                    data.reply = 'To open Operations Studio, click **Operations Studio** in the left sidebar. From there you can create reports, dashboards, data alerts, and notification rules. Choose the deliverable type, give it a clear name, complete the configuration, and save — it then appears in the Operations Gallery.';
                } else {
                    data.reply = 'Operations Studio is available to Creators and Administrators, and your current access does not include it. To build reports, dashboards, data alerts, or notification rules, ask an administrator for the Creator role. In the meantime, you can view published deliverables in the Operations Gallery.';
                }
            } else if (containsAny(aq, ['governance'])) {
                if (hasLeadership || hasAdmin) {
                    data.reply = 'To open Operations Governance, click **Operations Governance** in the left sidebar. There you can review pending actions, approve or reject them, and see the oversight statistics.';
                } else {
                    data.reply = 'Operations Governance is available to Leadership and Administrators, and your current access does not include it. Governance handles approvals and oversight of pending actions. If you believe you need access, ask an administrator about the Leadership role.';
                }
            } else if (containsAny(aq, ['command'])) {
                if (hasAdmin) {
                    data.reply = 'To open Operations Command, click **Operations Command** in the left sidebar. From there you can manage groups, enroll persons, manage automations, and toggle maintenance mode.';
                } else {
                    data.reply = 'Operations Command is the administration console and is restricted to Administrators. It manages groups, person enrollment, automations, and maintenance mode. If you need a change made there, ask an administrator to action it for you.';
                }
            } else if (containsAny(aq, ['gallery'])) {
                data.reply = 'To open the Operations Gallery, click **Operations Gallery** in the left sidebar. There you can browse and open published deliverables — reports, dashboards, data alerts, and notification rules. Click any tile to view it.';
            } else {
                data.reply = 'To open the Workspace, click **Workspace** in the left sidebar. It shows the automation cards you are entitled to run through your group memberships — click a card to trigger that automation and track its execution.';
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['my incident','my incidents','my issues','open incident','incidents i raised','incident list','show incidents','view incidents','my open ticket','my open tickets','active incident','my active incidents','what tickets do i have','what issues do i have','show my tickets','any tickets','my current incidents','pending incidents','unresolved incidents','in progress incidents','incidents assigned to me','tickets i submitted','issues i logged','track my issues','whats happening with my tickets','how many incidents do i have','what incidents are open'])) {
            var myIncItems = loadUserIncidents(userSysId, 10);
            if (myIncItems.length === 0) {
                data.reply = 'You have no active incidents. If you are experiencing an issue, say "Create an incident" to report it to IT.';
                data.type  = 'info';
            } else {
                data.reply = 'You have ' + myIncItems.length + ' active incident' + (myIncItems.length === 1 ? '' : 's') + '. Click any item to view details:';
                data.type  = 'requests';
                data.items = myIncItems;
            }
            return;
        }

        var incNum = extractIncidentNumber(aq);
        if (incNum) {
            var incLookupGr = new GlideRecord('incident');
            incLookupGr.addQuery('number', incNum);
            incLookupGr.setLimit(1);
            incLookupGr.query();
            if (incLookupGr.next()) {
                var incState    = '' + incLookupGr.getDisplayValue('state');
                var incPriority = '' + incLookupGr.getDisplayValue('priority');
                var incDesc     = '' + (incLookupGr.getValue('short_description') || '');
                var incAssigned = '' + (incLookupGr.getDisplayValue('assigned_to') || 'Unassigned');
                var incUpdated  = '' + incLookupGr.getDisplayValue('sys_updated_on');
                data.reply = 'Incident ' + incNum + ':\n\n' +
                    'Description: ' + (incDesc || 'No description') + '\n' +
                    'State: ' + incState + '\n' +
                    'Priority: ' + incPriority + '\n' +
                    'Assigned to: ' + incAssigned + '\n' +
                    'Last updated: ' + incUpdated + '\n\n' +
                    'Click here to view the full incident: /sp?id=ticket&table=incident&sys_id=' + incLookupGr.getUniqueValue();
                data.type = 'info';
            } else {
                data.reply = 'Incident ' + incNum + ' was not found. Please verify the number and try again.';
                data.type  = 'error';
            }
            return;
        }

        if (containsAny(aq, ['create incident','report incident','log incident','raise incident','new incident','file incident','submit incident','report an issue','log an issue','report issue','create a ticket','raise a ticket','open a ticket','log a ticket','something is broken','not working','server down','system down','i have an issue','i have a problem','technical issue','technical problem','i have an error','something is wrong','having trouble','cant access','cannot access','cannot log','cant log','access denied','getting an error','error message','keeps crashing','keeps failing','its not working','doesnt work','not loading','wont load','wont open','i am stuck','im stuck','need it support','need help with my','having issues with','problem with my','issue with my','broken link','site is down','application down','service not responding','my email is down','outlook is not working','i cannot send emails','teams is not working','teams wont open','video call not working','vpn wont connect','vpn not working','internet is down','no internet','wifi not working','cannot access the internet','network is down','network drive not working','shared drive not accessible','printer not working','cannot print','print job stuck','computer is freezing','laptop is frozen','laptop keeps crashing','computer crashed','blue screen','black screen','screen went black','keyboard is broken','mouse not working','mouse not responding','screen flickering','monitor issue','second screen issue','my application is crashing','software keeps crashing','getting a pop up error','error popup','unexpected error','application not responding','app hangs','app frozen','system is slow','everything is slow','my machine is slow','running really slow','taking forever to load','i am having difficulty','difficulty accessing','having a hard time','trouble with my','issue with my computer','my computer is','something wrong with my','my phone is not','work phone issue','service not working','cannot access the system','system not responding','connection issue','connectivity problem','latency issue','high latency','cant connect','login failed','authentication error','i get an error when','getting errors when','error when trying to','failed to','permission denied','unauthorized','forbidden','403 error','404 error','500 error','portal not loading','page not loading','website down','service unavailable','gateway error','timeout error','request timed out'])) {
            var incKbItems = searchKnowledge(stripStopWords(aq) || aq, 3);
            data.reply = 'I am sorry you are dealing with this — let us get it logged so IT can help. A good first step is to restart the affected app or device, since that clears a surprising number of issues. If that does not fix it, raise an incident at /sp?id=new_call so it is tracked and routed to the right team.\n\n' +
                'When you create the incident, please include:\n' +
                '- A clear description of what is happening\n' +
                '- When it started\n' +
                '- How many people are affected\n' +
                '- Any exact error messages you see\n\n' +
                'For an emergency or a critical outage, call the IT helpdesk directly so it can be triaged immediately.';
            if (incKbItems.length > 0) {
                data.reply += '\n\nI also found knowledge articles that may resolve your issue:';
                data.type  = 'knowledge';
                data.items = incKbItems;
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['my approval','my approvals','pending approval','waiting for my approval','items to approve','need to approve','approval queue','approval list','show approvals','view approvals','what needs approval','awaiting approval','review approvals','what needs my review','pending reviews','need my ok','awaiting my decision','things to approve','approval inbox','any approvals','anything to approve','can i approve something','requests for my approval','waiting on me','items waiting','my to-do approval','approval backlog','approve something','act on approvals'])) {
            var myApprovals = loadUserApprovals(userSysId, 10);
            if (myApprovals.length === 0) {
                data.reply = 'You have no pending approvals at this time. You will be notified when requests require your approval.';
                data.type  = 'info';
            } else {
                data.reply = 'You have ' + myApprovals.length + ' pending approval' + (myApprovals.length === 1 ? '' : 's') + ' waiting for your action:';
                data.type  = 'requests';
                data.items = myApprovals;
            }
            return;
        }

        if (containsAny(aq, ['change request','change ticket','schedule a change','raise a change','create a change','change order','request a change','raise a change','change management','submit a change','new change request','change advisory board','plan a change','change control','crq','chg number','standard change','normal change','emergency change','change record','change template','change model','what is a change','change process','cab meeting','change window','change risk','change freeze','blackout period','change implementation','change rollback','back out plan'])) {
            var changeKbItems = searchKnowledge('change management process', 4);
            data.reply = 'To submit a Change Request, navigate to the Service Catalog and search for "Change Request" or speak with your Change Manager.\n\n' +
                'Change types available:\n' +
                '- Standard Change: Pre-approved, low-risk, repeatable\n' +
                '- Normal Change: Requires Change Advisory Board (CAB) review\n' +
                '- Emergency Change: Expedited for critical issues\n\n' +
                'You can submit a change at: /sp?id=sc_cat_item&sysparm_category=change';
            if (changeKbItems.length > 0) {
                data.reply += '\n\nRelated knowledge articles:';
                data.type  = 'knowledge';
                data.items = changeKbItems;
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['reset my password','forgot my password','password expired','change my password','password reset','locked out','account locked','cannot log in','cant log in','login problem','unlock account','unlock my account','need a new password','i am locked out','login issue','sign in problem','cannot sign in','access problem','account problem','sso error','sso not working','cannot authenticate','authentication problem','my account is locked','forgot credentials','lost access','locked out of account','account disabled','account suspended','account expired','cannot access my account','single sign on issue','sso not working'])) {
            data.reply = 'This platform uses **Single Sign-On (SSO)** — there is no separate ServiceNow password. Your access is tied to your company identity.\n\n' +
                '**If you cannot sign in:**\n' +
                '1. Check your company credentials work in other systems (email, Teams)\n' +
                '2. If your company account is locked, contact IT Support — they handle the identity provider\n' +
                '3. For **MFA issues**, contact IT Security immediately\n' +
                '4. If credentials work elsewhere but not here, raise a request for "Portal Access" at /sp?id=sc_cat_item\n' +
                '5. Try a fresh browser window or clear your cookies for session issues\n\n' +
                '**If your account appears disabled:**\n' +
                'Raise an urgent service request or call the IT helpdesk directly so they can verify with the identity team.';
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['outage','service down','system outage','is down','not available','service unavailable','service status','system status','health check','service health','platform status','what is down','whats down','current outage','known issue','known issues','planned maintenance','anything broken','any known problems','platform having issues','is anything down','whats the status','service health check','system health','any disruptions','disruption','active outage','current issues','problems today','happening right now','emergency outage','any incidents right now','major incident now','service status update'])) {
            var outageSysItems = [];
            try {
                var outageGr = new GlideRecord('cmdb_ci_outage');
                outageGr.addQuery('active', true);
                outageGr.orderByDesc('begin');
                outageGr.setLimit(5);
                outageGr.query();
                while (outageGr.next()) {
                    outageSysItems.push('- ' + ('' + outageGr.getDisplayValue('configuration_item')) + ': ' + ('' + outageGr.getValue('type')) + ' since ' + ('' + outageGr.getDisplayValue('begin')));
                }
            } catch (oe) { outageSysItems = []; }
            if (outageSysItems.length > 0) {
                data.reply = 'Current active outages:\n\n' + outageSysItems.join('\n') + '\n\nFor real-time status updates, contact the IT service desk or check the company status page.';
            } else {
                data.reply = 'No active outages are currently recorded in the system. If you are experiencing an issue, please report it as an incident using "Create an incident" or contact IT Support directly.';
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['my request','my requests','my tickets','my orders','requests i raised','what did i request','show requests','view requests','open request','raised request','submitted request','track my orders','order status','request update','any open orders','submitted requests','request history','past requests','what have i ordered','request tracker','active requests','open requests','my ritms','my req','show me my requests','service requests','my service orders','how is my order going','what is the status of my request','pending requests','unfulfilled requests'])) {
            var reqItems = loadUserRequests(userSysId, 20);
            if (reqItems.length === 0) {
                data.reply = 'You have not raised any service requests yet. Use the Service Catalog to submit requests for equipment, access, or services. Try asking "I need a laptop" to get started.';
                data.type  = 'info';
            } else {
                data.reply = 'Here are your service requests. Click any item to open it in the Service Portal:';
                data.type  = 'requests';
                data.items = reqItems;
            }
            return;
        }

        if (containsAny(aq, ['my group','groups i','which group','what group','am i in','member of','my team','my membership','team member','group member','my teams','my oi group','which groups','what groups','group list','groups i belong to','my team groups','group memberships','what teams am i on','list my groups','show my groups','groups in operations intelligence','oi group membership'])) {
            if (data.userGroups.length === 0) {
                data.reply = 'You are not a member of any Operations Intelligence groups. Contact your administrator to be added to a group.';
            } else {
                var gLines = [];
                var gni;
                for (gni = 0; gni < data.userGroups.length; gni++) {
                    gLines.push('- ' + data.userGroups[gni].name + ' (' + (data.userGroups[gni].role || 'user') + ')');
                }
                data.reply = 'You are a member of ' + data.userGroups.length + ' group' + (data.userGroups.length === 1 ? '' : 's') + ':\n\n' + gLines.join('\n');
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['last execution','recent execution','what ran','did it run','execution log','my execution','execution status','automation history','automation log','recent executions','show executions','run history','automation runs','what has run','execution history','my runs','triggered automations','completed executions','failed executions','execution list','show execution history','what automations ran','automation activity','recent runs','automation results','execution report'])) {
            var seItems = [];
            if (data.personSysId) {
                var seGr = new GlideRecord('x_infte_ops_int_execution');
                seGr.addQuery('triggered_by', data.personSysId);
                seGr.orderByDesc('triggered_at');
                seGr.setLimit(5);
                seGr.query();
                while (seGr.next()) {
                    seItems.push((seItems.length + 1) + '. ' + ('' + seGr.getDisplayValue('automation')) + ' — ' + ('' + seGr.getValue('status')) + ' (' + ('' + seGr.getDisplayValue('triggered_at')) + ')');
                }
            }
            if (seItems.length === 0) {
                data.reply = 'You have no recent automation executions. Trigger an automation from the Workspace to get started.';
            } else {
                data.reply = 'Your most recent automation executions:\n\n' + seItems.join('\n');
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['list automation','show automation','my automation','what automation','available automation','automations available','show me automation','what automations','which automations','all automations','automations i can run','what can i automate','available automations','my automation list','automation catalog','what automations exist','see my automations','view my automations','automations in my group','group automations','what can my group run','list all automations','automation options'])) {
            var listWs = loadWorkspace(data.userGroups);
            if (listWs.automations.length === 0) {
                data.reply = 'You have no automations available. Contact your administrator to be added to a group with published automations.';
            } else {
                var aLines = [];
                var ali;
                for (ali = 0; ali < listWs.automations.length; ali++) {
                    var aa = listWs.automations[ali];
                    aLines.push('- ' + aa.name + (aa.short_description ? ': ' + aa.short_description : '') + ' [Group: ' + (aa.owner_group || 'Not assigned') + ']');
                }
                data.reply = 'You have ' + listWs.automations.length + ' automation' + (listWs.automations.length === 1 ? '' : 's') + ' available:\n\n' + aLines.join('\n') + '\n\nTo trigger one, say "Run [automation name]".';
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['run ','trigger ','execute ','launch ','fire ','start automation','kick off','initiate automation'])) {
            var runWs = loadWorkspace(data.userGroups);
            if (runWs.automations.length === 0) {
                data.reply = 'You have no automations available to run. Contact your administrator.';
                data.type  = 'info';
                return;
            }
            var targetAuto = null;
            var rni;
            for (rni = 0; rni < runWs.automations.length; rni++) {
                var rAutoName = (runWs.automations[rni].name || '').toLowerCase();
                if (rAutoName && aq.indexOf(rAutoName) !== -1) {
                    targetAuto = runWs.automations[rni];
                    break;
                }
            }
            if (!targetAuto) {
                var autoNames = [];
                var ani;
                for (ani = 0; ani < runWs.automations.length; ani++) { autoNames.push('"' + runWs.automations[ani].name + '"'); }
                data.reply = 'Which automation would you like to run? Available: ' + autoNames.join(', ') + '.\n\nExample: "Run ' + (runWs.automations[0] ? runWs.automations[0].name : 'automation name') + '"';
                data.type  = 'info';
                return;
            }
            try {
                var runEngine = new ExecutionEngine();
                var runExecId = runEngine.createExecution(targetAuto.sys_id, {}, targetAuto.owner_group_sys_id);
                if (runExecId) {
                    var runExecRec = new GlideRecord('x_infte_ops_int_execution');
                    if (runExecRec.get(runExecId)) {
                        data.reply = 'Automation "' + targetAuto.name + '" triggered successfully.\nExecution: ' + ('' + runExecRec.getValue('number')) + '\nStatus: ' + ('' + runExecRec.getValue('status'));
                    } else {
                        data.reply = 'Automation "' + targetAuto.name + '" triggered successfully.';
                    }
                    data.type = 'success';
                } else {
                    data.reply = 'Failed to trigger "' + targetAuto.name + '". Please try again from the Workspace.';
                    data.type  = 'error';
                }
            } catch (runErr) {
                data.reply = 'Error triggering "' + targetAuto.name + '": ' + runErr;
                data.type  = 'error';
            }
            return;
        }

        if (containsAny(aq, ['create report','build report','new report','make report','generate report','report builder','i want to build a report','how do i create a report','make me a report','i need a report','generate a new report','report creation','report designer','new report in studio'])) {
            if (!hasCreator && !hasAdmin) {
                data.reply = 'Report creation requires Creator or Administrator access. Contact your administrator to request the Creator role. In the meantime, you can view published reports in the Operations Gallery.';
                data.type  = 'error';
            } else {
                data.reply = 'Happy to help you build a report' + (userFirstName ? ', ' + userFirstName : '') + '. Here is how:\n\n' +
                    '1. Open the **Operations Studio** section from the left sidebar\n' +
                    '2. Select **Report** as the deliverable type\n' +
                    '3. Give it a clear, formal name\n' +
                    '4. Fill in the configuration for the data you want to show\n' +
                    '5. Save\n\n' +
                    'Your completed report then appears as a tile in the Operations Gallery, where colleagues can open and view it.';
                data.type  = 'info';
            }
            return;
        }

        if (containsAny(aq, ['create dashboard','build dashboard','new dashboard','make dashboard','generate dashboard','dashboard builder','i want to build a dashboard','how do i create a dashboard','make me a dashboard','i need a dashboard','generate a new dashboard','dashboard creation','dashboard designer','new dashboard in studio'])) {
            if (!hasCreator && !hasAdmin) {
                data.reply = 'Dashboard creation requires Creator or Administrator access. Contact your administrator to request the Creator role. In the meantime, you can view published dashboards in the Operations Gallery.';
                data.type  = 'error';
            } else {
                data.reply = 'Happy to help you build a dashboard' + (userFirstName ? ', ' + userFirstName : '') + '. Here is how:\n\n' +
                    '1. Open the **Operations Studio** section from the left sidebar\n' +
                    '2. Select **Dashboard** as the deliverable type\n' +
                    '3. Give it a clear, formal name\n' +
                    '4. Configure the panels and data you want at a glance\n' +
                    '5. Save\n\n' +
                    'Your completed dashboard then appears as a tile in the Operations Gallery for colleagues to open and view.';
                data.type  = 'info';
            }
            return;
        }

        if (containsAny(aq, ['my reports','show my reports','my dashboards','show my dashboards','my deliverables','show deliverables','gallery items','what deliverables','view gallery','deliverables i created','reports i created','dashboards i created','my data alerts','my notification rules','what have i built','what did i create','show me what i built','my studio output','completed deliverables'])) {
            var delvData = data.personSysId ? loadDeliverables(data.personSysId) : { deliverables: [] };
            var delvList = delvData.deliverables || [];
            if (delvList.length === 0) {
                data.reply = 'I do not see any deliverables created by you yet. Deliverables — reports, dashboards, data alerts, and notification rules — are built in the **Operations Studio** section (Creators and Administrators) and then appear in the **Operations Gallery** for everyone to view. Open the Gallery from the sidebar to browse what others have published.';
            } else {
                var delvLines = [];
                var dvi;
                for (dvi = 0; dvi < delvList.length; dvi++) {
                    var dv = delvList[dvi];
                    delvLines.push('- ' + (dv.display_name || 'Unnamed') + ' (' + (dv.artifact_type || 'deliverable') + ') — ' + (dv.status || 'active'));
                }
                data.reply = 'Here are the ' + delvList.length + ' deliverable' + (delvList.length === 1 ? '' : 's') + ' you have created:\n\n' + delvLines.join('\n') + '\n\nOpen the **Operations Gallery** from the sidebar to view any of them.';
            }
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['create a problem','raise a problem','new problem record','log a problem','submit a problem','problem management','recurring issue','same issue keeps coming back','issue keeps happening','repeated incident','root cause','known error','find root cause','problem investigation','problem record','what is a problem record','how do i create a problem','prb number','my problems','show my problems','problem ticket'])) {
            var probKbItems = searchKnowledge('problem management root cause', 3);
            data.reply = 'A **Problem record** is for a recurring issue whose root cause is not yet known — it investigates why incidents keep happening so the cause can be permanently removed, rather than resolving the same symptom again and again.\n\n' +
                'To raise one:\n' +
                '1. Create a Problem from a recurring incident using the related action, or raise it at /sp?id=sc_cat_item\n' +
                '2. Capture the symptom, the affected service, and the linked incidents\n' +
                '3. The Problem then drives root cause analysis and a permanent fix\n\n' +
                'Along the way, a **Known Error** documents a confirmed cause and a **workaround** so the service desk can keep impact low while the permanent fix is developed. Problem numbers begin with PRB.';
            if (probKbItems.length > 0) {
                data.reply += '\n\nRelated knowledge articles:';
                data.type  = 'knowledge';
                data.items = probKbItems;
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['i need','i want','request a','order a','order an','get a','get an','need a','need an','request access','can i get','can i have','buy a','purchase','procure','submit a request','raise a request','i would like','id like','can i order','how do i get','how do i request','how can i get','looking for','searching for','trying to get','trying to find','where do i get','where can i find','can someone give me','can you get me','can you order','could i get','would it be possible','i would like to request','can you help me get','is there a way to get','how do i request','where can i request','can i submit a request for','i am looking for','need to procure','need to order','need to purchase','equipment request','access request','software request','license request','tool request','service request','can you find me','find me a','help me find','i require','we require','my team needs','i need help getting','arrange for','set up','provision for me','get provisioned','raise a request for','submit for','order for my team','request on behalf','need access to','get access to','request access to','gain access to'])) {
            var catSearchQ1 = stripStopWords(aq);
            if (!catSearchQ1) { catSearchQ1 = aq; }
            var catItems1 = searchCatalog(catSearchQ1, 6);
            if (catItems1.length === 0 && catSearchQ1 !== aq) { catItems1 = searchCatalog(aq, 6); }
            if (catItems1.length === 0) {
                data.reply = 'I could not find matching catalog items for "' + rawQ + '". Try browsing the Service Catalog at /sp?id=sc_home or rephrase with the specific item name.';
                data.type  = 'info';
            } else {
                data.reply = 'I found ' + catItems1.length + ' catalog item' + (catItems1.length === 1 ? '' : 's') + ' matching your request. Click to open and submit:';
                data.type  = 'catalog';
                data.items = catItems1;
            }
            return;
        }

        if (containsAny(aq, ['laptop','desktop computer','mobile phone','equipment request','vpn access','software request','software license','new application','hardware request','printer request','new monitor','docking station','headset','access badge','remote access','tablet','docking','webcam request','new laptop','replacement laptop','laptop upgrade','desktop setup','new desktop','work from home equipment','home office setup','ergonomic equipment','standing desk','keyboard mouse','office chair','wireless keyboard','bluetooth mouse','usb hub','laptop stand','new phone','work mobile','business phone','phone upgrade','screen','second display','ultrawide','portable monitor','speakers','conference speaker','security camera','ip phone','desk phone','network switch','patch panel','power strip','ups','uninterruptible power'])) {
            var catSearchQ2 = stripStopWords(aq);
            if (!catSearchQ2) { catSearchQ2 = aq; }
            var catItems2 = searchCatalog(catSearchQ2, 6);
            if (catItems2.length === 0 && catSearchQ2 !== aq) { catItems2 = searchCatalog(aq, 6); }
            if (catItems2.length === 0) {
                data.reply = 'I could not find a catalog item matching "' + rawQ + '". Contact the service desk or browse the Service Catalog at /sp?id=sc_home.';
                data.type  = 'info';
            } else {
                data.reply = 'Here are catalog items related to your request. Click to open and submit:';
                data.type  = 'catalog';
                data.items = catItems2;
            }
            return;
        }

        var matchedTopic = matchTopic(aq, TOPICS);
        if (matchedTopic) {
            data.reply = matchedTopic.r;
            data.type  = 'info';
            return;
        }

        if (containsAny(aq, ['how do','how to','what is','what are','explain','procedure','process','policy','knowledge','learn','find information','find out','troubleshoot','problem with','issue with','error with','help with','documentation','steps to','instructions','tutorial','article','faq','guide for','understand','show me how','tell me about','what does'])) {
            var kbSearchQ = stripStopWords(aq);
            if (!kbSearchQ) { kbSearchQ = aq; }
            var kbItems = searchKnowledge(kbSearchQ, 6);
            if (kbItems.length === 0 && kbSearchQ !== aq) { kbItems = searchKnowledge(aq, 6); }
            if (kbItems.length === 0) {
                data.reply = 'I could not find knowledge articles matching "' + rawQ + '". Try rephrasing your question, browse the Knowledge Base at /sp?id=kb_home, or contact the service desk for direct assistance.';
                data.type  = 'info';
            } else {
                data.reply = 'I found ' + kbItems.length + ' knowledge article' + (kbItems.length === 1 ? '' : 's') + ' that may help:';
                data.type  = 'knowledge';
                data.items = kbItems;
            }
            return;
        }

        var fbQ = stripStopWords(aq);
        var fbCatItems = fbQ ? searchCatalog(fbQ, 3) : [];
        var fbKbItems  = fbQ ? searchKnowledge(fbQ, 3) : [];

        if (fbCatItems.length > 0 || fbKbItems.length > 0) {
            data.reply = 'Here is what I found that might help with "' + rawQ + '":';
            if (fbCatItems.length > 0 && fbKbItems.length > 0) {
                data.type  = 'catalog';
                data.items = fbCatItems.concat(fbKbItems);
            } else if (fbCatItems.length > 0) {
                data.type  = 'catalog';
                data.items = fbCatItems;
            } else {
                data.type  = 'knowledge';
                data.items = fbKbItems;
            }
            return;
        }

        var fbLower = aq.toLowerCase();
        if (containsAny(fbLower, ['who','what','when','where','why','which','can','could','would','should','is there','are there','do you','does','how'])) {
            data.reply = 'Good question! I am not able to find a specific answer for "' + rawQ + '" right now. You might find what you need by:\n' +
                '- Searching the Knowledge Base: /sp?id=kb_home\n' +
                '- Browsing the Service Catalog: /sp?id=sc_home\n' +
                '- Raising an incident if something is broken\n\n' +
                'Or rephrase your question and I will try again.';
        } else {
            data.reply = 'I am not quite sure what you need for "' + rawQ + '", but I am here to help. Try:\n' +
                '- **"Show my requests"** — track your service requests\n' +
                '- **"Create an incident"** — report an IT issue\n' +
                '- **"I need [item name]"** — search the catalog\n' +
                '- **"How do I [something]"** — search knowledge articles\n\n' +
                'Just describe what you need in plain English and I will do my best!';
        }
        data.type  = 'info';
        return;
    }

    if (input.action === 'load_user_requests') {
        var lrLimit = input.limit ? parseInt('' + input.limit, 10) : 20;
        data.user_requests = loadUserRequests(userSysId, lrLimit);
        return;
    }

    if (input.action === 'trigger_automation') {
        var autoSysId  = '' + input.automation_sys_id;
        var grpSysId   = input.group_sys_id ? '' + input.group_sys_id : null;

        var permitted = false;
        if (hasAdmin) {
            permitted = true;
        } else if (grpSysId && data.personSysId) {
            var grpChk = new GlideRecord('x_infte_ops_int_group');
            if (grpChk.get(grpSysId)) {
                var chkAutos = [];
                try { chkAutos = JSON.parse('' + grpChk.getValue('automations')); } catch (e) { chkAutos = []; }
                var ci;
                for (ci = 0; ci < chkAutos.length; ci++) {
                    if ('' + chkAutos[ci].automation_sys_id === autoSysId && chkAutos[ci].approval_status === 'approved') {
                        permitted = true;
                        break;
                    }
                }
            }
        }

        if (!permitted) {
            data.triggered = { ok: false, error: 'Not authorised to trigger this automation.' };
            return;
        }

        try {
            var engine    = new ExecutionEngine();
            var execSysId = engine.createExecution(autoSysId, {}, grpSysId);
            if (execSysId) {
                var execRec = new GlideRecord('x_infte_ops_int_execution');
                if (execRec.get(execSysId)) {
                    data.triggered = {
                        ok:     true,
                        sys_id: execSysId,
                        number: '' + execRec.getValue('number'),
                        status: '' + execRec.getValue('status')
                    };
                } else {
                    data.triggered = { ok: true, sys_id: execSysId };
                }
            } else {
                data.triggered = { ok: false, error: 'Execution could not be created.' };
            }
        } catch (trigErr) {
            data.triggered = { ok: false, error: '' + trigErr };
        }
        return;
    }

    if (input.action === 'resolve_action') {
        if (!hasLeadership && !hasAdmin) { data.resolved = false; return; }
        var paId    = '' + input.action_sys_id;
        var verdict = '' + input.resolution;
        if (verdict !== 'approved' && verdict !== 'rejected') { data.resolved = false; return; }
        var paRec = new GlideRecord('x_infte_ops_int_pending_action');
        if (!paRec.get(paId)) { data.resolved = false; return; }
        paRec.setValue('status', verdict);
        paRec.update();
        if (verdict === 'approved') {
            var subjectUserSysId = '' + paRec.getValue('subject_user');
            if (subjectUserSysId) {
                var subjectPersonSysId = getPersonSysId(subjectUserSysId);
                if (subjectPersonSysId) {
                    try {
                        new RoleSyncService().syncPersonRoles(subjectPersonSysId);
                    } catch (rsErr) {
                        gs.warn('Operations Intelligence Portal: RoleSyncService.syncPersonRoles error: ' + rsErr);
                    }
                }
            }
        }
        data.resolved = true;
        return;
    }

    if (input.action === 'step_log') {
        var excSysId = '' + input.execution_sys_id;
        var excRec = new GlideRecord('x_infte_ops_int_execution');
        if (excRec.get(excSysId)) {
            var steps = [];
            try { steps = JSON.parse('' + excRec.getValue('step_log')); } catch (e) { steps = []; }
            data.stepLog = steps;
        } else {
            data.stepLog = [];
        }
        return;
    }

    if (input.action === 'toggle_maintenance') {
        if (!hasAdmin) { return; }
        var tPropName = '' + input.prop_name;
        var tPropVal  = (input.value === true || ('' + input.value) === 'true') ? 'true' : 'false';
        gs.setProperty(tPropName, tPropVal, 'Operations Intelligence');
        data.toggled = true;
        return;
    }

    if (input.action === 'search_users') {
        if (!hasAdmin && !hasLeadership) { data.users = []; return; }
        var srchQ = '' + (input.query || '');
        if (srchQ.length < 2) { data.users = []; return; }
        var uGr = new GlideRecord('sys_user');
        uGr.addQuery('active', true);
        uGr.addQuery('name', 'CONTAINS', srchQ);
        uGr.orderBy('name');
        uGr.setLimit(20);
        uGr.query();
        var users = [];
        while (uGr.next()) {
            var uSid = '' + uGr.getUniqueValue();
            var pChk = new GlideRecord('x_infte_ops_int_person');
            pChk.addQuery('user', uSid);
            pChk.setLimit(1);
            pChk.query();
            var isEnrolled = pChk.next();
            users.push({
                sys_id:           uSid,
                name:             '' + uGr.getDisplayValue('name'),
                user_name:        '' + uGr.getValue('user_name'),
                email:            '' + uGr.getValue('email'),
                already_enrolled: isEnrolled,
                person_sys_id:    isEnrolled ? '' + pChk.getUniqueValue() : ''
            });
        }
        data.users = users;
        return;
    }

    if (input.action === 'list_persons') {
        if (!hasAdmin && !hasLeadership) { data.persons = []; return; }
        var pListGr = new GlideRecord('x_infte_ops_int_person');
        pListGr.orderBy('user.name');
        pListGr.query();
        var persons = [];
        while (pListGr.next()) {
            var pSysId   = '' + pListGr.getUniqueValue();
            var pUserSId = '' + pListGr.getValue('user');
            var pActive  = ('' + pListGr.getValue('active')) === 'true' || ('' + pListGr.getValue('active')) === '1';

            var uRec = new GlideRecord('sys_user');
            var pName = '';
            var uName = '';
            var uEmail = '';
            if (uRec.get(pUserSId)) {
                pName  = '' + uRec.getValue('name');
                uName  = '' + uRec.getValue('user_name');
                uEmail = '' + uRec.getValue('email');
            }

            var pGroups = [];
            var pgGr = new GlideRecord('x_infte_ops_int_group');
            pgGr.addQuery('status', 'active');
            pgGr.query();
            while (pgGr.next()) {
                var pgMems = [];
                try { pgMems = JSON.parse('' + pgGr.getValue('members')); } catch (e) { pgMems = []; }
                var pmi;
                for (pmi = 0; pmi < pgMems.length; pmi++) {
                    if ('' + pgMems[pmi].person_sys_id === pSysId && pgMems[pmi].status !== 'inactive') {
                        pGroups.push({
                            group_sys_id: '' + pgGr.getUniqueValue(),
                            group_name:   '' + pgGr.getValue('name'),
                            group_role:   '' + (pgMems[pmi].group_role || 'user')
                        });
                        break;
                    }
                }
            }

            persons.push({
                sys_id:    pSysId,
                name:      pName,
                user_name: uName,
                email:     uEmail,
                active:    pActive,
                groups:    pGroups
            });
        }
        data.persons = persons;
        return;
    }

    if (input.action === 'enroll_person') {
        if (!hasAdmin) { data.enrolled = { ok: false, error: 'Admin access required.' }; return; }
        var enrollUserSysId  = '' + input.user_sys_id;
        var enrollGroupSysId = input.group_sys_id ? '' + input.group_sys_id : null;
        var enrollRole       = input.group_role   ? '' + input.group_role   : 'user';

        var existPerson = new GlideRecord('x_infte_ops_int_person');
        existPerson.addQuery('user', enrollUserSysId);
        existPerson.setLimit(1);
        existPerson.query();

        var newPersonSysId;
        if (existPerson.next()) {
            newPersonSysId = '' + existPerson.getUniqueValue();
        } else {
            var newPerson = new GlideRecord('x_infte_ops_int_person');
            newPerson.initialize();
            newPerson.setValue('user', enrollUserSysId);
            newPerson.setValue('active', true);
            newPersonSysId = '' + newPerson.insert();
            if (!newPersonSysId) {
                data.enrolled = { ok: false, error: 'Failed to create person record.' };
                return;
            }
        }

        if (enrollGroupSysId) {
            try {
                new GroupManager().addMember(enrollGroupSysId, newPersonSysId, enrollRole, data.personSysId || null);
            } catch (gmErr) {
                gs.warn('Operations Intelligence Portal enroll_person GroupManager.addMember: ' + gmErr);
            }
        }

        var enrolledUserRec = new GlideRecord('sys_user');
        var enrolledName = '';
        if (enrolledUserRec.get(enrollUserSysId)) { enrolledName = '' + enrolledUserRec.getDisplayValue('name'); }

        data.enrolled = {
            ok:            true,
            person_sys_id: newPersonSysId,
            name:          enrolledName
        };
        return;
    }

    if (input.action === 'unenroll_person') {
        if (!hasAdmin) { data.unenrolled = { ok: false }; return; }
        var uePerson = '' + input.person_sys_id;

        var ueGroups = new GlideRecord('x_infte_ops_int_group');
        ueGroups.addQuery('status', 'active');
        ueGroups.query();
        while (ueGroups.next()) {
            var ueMembers = [];
            try { ueMembers = JSON.parse('' + ueGroups.getValue('members')); } catch (e) { ueMembers = []; }
            var uei;
            for (uei = 0; uei < ueMembers.length; uei++) {
                if ('' + ueMembers[uei].person_sys_id === uePerson && ueMembers[uei].status !== 'inactive') {
                    try { new GroupManager().removeMember('' + ueGroups.getUniqueValue(), uePerson); } catch (e) {}
                    break;
                }
            }
        }

        var uePersonRec = new GlideRecord('x_infte_ops_int_person');
        if (uePersonRec.get(uePerson)) {
            uePersonRec.setValue('active', false);
            uePersonRec.update();
        }
        data.unenrolled = { ok: true };
        return;
    }

    if (input.action === 'create_group') {
        if (!hasAdmin && !hasLeadership) { data.created_group = { ok: false, error: 'Admin or Leadership access required.' }; return; }
        var cgName         = '' + (input.name || '');
        var cgDesc         = '' + (input.description || '');
        var cgType         = '' + (input.type || 'custom_group');
        var cgLeadId       = input.lead_person_sys_id   ? '' + input.lead_person_sys_id   : null;
        var cgCreatorId    = input.creator_person_sys_id ? '' + input.creator_person_sys_id : null;
        if (!cgName) { data.created_group = { ok: false, error: 'Name is required.' }; return; }
        try {
            var gm = new GroupManager();
            var newGrpId = gm.createGroup(cgName, cgDesc, cgType, data.personSysId || null, null, data.personSysId || null);
            if (newGrpId) {
                if (cgLeadId)    { try { gm.addMember(newGrpId, cgLeadId,    'lead',    data.personSysId || null); } catch(e) {} }
                if (cgCreatorId) { try { gm.addMember(newGrpId, cgCreatorId, 'creator', data.personSysId || null); } catch(e) {} }
                data.created_group = { ok: true, sys_id: newGrpId, name: cgName };
            } else {
                data.created_group = { ok: false, error: 'Group already exists or could not be created.' };
            }
        } catch (cgErr) {
            data.created_group = { ok: false, error: '' + cgErr };
        }
        return;
    }

    if (input.action === 'delete_group') {
        if (!hasAdmin) { data.deleted_group = { ok: false, error: 'Admin access required.' }; return; }
        var dgSysId = '' + input.group_sys_id;
        var dgRec = new GlideRecord('x_infte_ops_int_group');
        if (!dgRec.get(dgSysId)) { data.deleted_group = { ok: false, error: 'Group not found.' }; return; }
        var dgType = '' + dgRec.getValue('type');
        if (dgType !== 'custom_group') {
            data.deleted_group = { ok: false, error: 'This is a system-managed group and cannot be deleted.' };
            return;
        }
        var dgName = '' + dgRec.getValue('name');
        dgRec.setValue('status', 'archived');
        dgRec.update();
        data.deleted_group = { ok: true, name: dgName };
        return;
    }

    if (input.action === 'list_group_members') {
        if (!hasAdmin && !hasLeadership) { data.group_members = []; return; }
        try {
            data.group_members = new GroupManager().getMembers('' + input.group_sys_id);
        } catch (lgmErr) {
            data.group_members = [];
        }
        return;
    }

    if (input.action === 'add_member') {
        if (!hasAdmin && !hasLeadership) { data.member_added = false; return; }
        try {
            data.member_added = new GroupManager().addMember(
                '' + input.group_sys_id,
                '' + input.person_sys_id,
                '' + (input.group_role || 'user'),
                data.personSysId || null
            );
        } catch (amErr) {
            data.member_added = false;
        }
        return;
    }

    if (input.action === 'remove_member') {
        if (!hasAdmin && !hasLeadership) { data.member_removed = false; return; }
        try {
            data.member_removed = new GroupManager().removeMember(
                '' + input.group_sys_id,
                '' + input.person_sys_id
            );
        } catch (rmErr) {
            data.member_removed = false;
        }
        return;
    }

    if (input.action === 'create_deliverable') {
        var cdFlowId   = '' + (input.flow_id || '');
        var cdCollected = {};
        try { cdCollected = JSON.parse('' + (input.collected || '{}')); } catch (e) { cdCollected = {}; }
        var cdPersonId = data.personSysId;
        if (!cdPersonId) {
            var cdPersonRec = new GlideRecord('x_infte_ops_int_person');
            cdPersonRec.addQuery('user', userSysId);
            cdPersonRec.setLimit(1);
            cdPersonRec.query();
            if (cdPersonRec.next()) {
                cdPersonId = '' + cdPersonRec.getUniqueValue();
            } else {
                var cdNewPerson = new GlideRecord('x_infte_ops_int_person');
                cdNewPerson.initialize();
                cdNewPerson.setValue('user', userSysId);
                cdNewPerson.setValue('active', true);
                cdPersonId = '' + cdNewPerson.insert();
            }
        }
        var cdResult;
        if (cdFlowId === 'report_builder') {
            cdResult = createReport(cdCollected, cdPersonId);
        } else if (cdFlowId === 'dashboard_builder') {
            cdResult = createDashboard(cdCollected, cdPersonId);
        } else if (cdFlowId === 'data_alert') {
            cdResult = createDataAlert(cdCollected, cdPersonId);
        } else if (cdFlowId === 'notification_rule') {
            cdResult = createNotificationRule(cdCollected, cdPersonId);
        } else {
            cdResult = { ok: false, error: 'Unknown flow type.' };
        }
        data.deliverable_result = cdResult;
        return;
    }

    if (input.action === 'delete_deliverable') {
        var ddSysId = '' + input.artifact_sys_id;
        var ddRec = new GlideRecord('x_infte_ops_int_managed_artifact');
        if (!ddRec.get(ddSysId)) { data.deleted_deliverable = { ok: false, error: 'Deliverable not found.' }; return; }
        var ddOwner = '' + ddRec.getValue('created_by_person');
        if (!hasAdmin && ddOwner !== data.personSysId) { data.deleted_deliverable = { ok: false, error: 'Access denied.' }; return; }
        ddRec.setValue('status', 'archived');
        ddRec.update();
        data.deleted_deliverable = { ok: true };
        return;
    }

    if (input.action === 'list_access_members') {
        if (!hasAdmin && !hasLeadership) { data.access_members = {}; return; }
        var lamRoleMap = {};
        var lamRGr = new GlideRecord('sys_user_role');
        lamRGr.addQuery('name', 'IN', 'x_infte_ops_int.admin,x_infte_ops_int.leadership,x_infte_ops_int.creator,x_infte_ops_int.user');
        lamRGr.query();
        while (lamRGr.next()) {
            lamRoleMap['' + lamRGr.getUniqueValue()] = '' + lamRGr.getValue('name');
        }
        var lamAccess = { admin: [], leadership: [], creator: [], user: [] };
        var lamIds = [];
        var lamK;
        for (lamK in lamRoleMap) { if (lamRoleMap.hasOwnProperty(lamK)) { lamIds.push(lamK); } }
        if (lamIds.length > 0) {
            var lamHrGr = new GlideRecord('sys_user_has_role');
            lamHrGr.addQuery('role', 'IN', lamIds.join(','));
            lamHrGr.query();
            while (lamHrGr.next()) {
                var lamRoleSysId = '' + lamHrGr.getValue('role');
                var lamRoleName  = lamRoleMap[lamRoleSysId];
                if (!lamRoleName) { continue; }
                var lamParts     = lamRoleName.split('.');
                var lamRoleKey   = lamParts.length > 1 ? lamParts[lamParts.length - 1] : lamRoleName;
                if (!lamAccess[lamRoleKey]) { continue; }
                var lamUserSysId = '' + lamHrGr.getValue('user');
                var lamUserRec   = new GlideRecord('sys_user');
                if (!lamUserRec.get(lamUserSysId)) { continue; }
                lamAccess[lamRoleKey].push({
                    user_sys_id:            lamUserSysId,
                    name:                   '' + lamUserRec.getDisplayValue('name'),
                    user_name:              '' + lamUserRec.getValue('user_name'),
                    email:                  '' + (lamUserRec.getValue('email') || ''),
                    role_assignment_sys_id: '' + lamHrGr.getUniqueValue()
                });
            }
        }
        data.access_members = lamAccess;
        return;
    }

    if (input.action === 'grant_role') {
        if (!hasAdmin) { data.role_granted = { ok: false, error: 'Admin access required.' }; return; }
        var grUserSysId    = '' + input.user_sys_id;
        var grRoleName     = '' + input.role_name;
        var VALID_GR_ROLES = { admin: true, leadership: true, creator: true, user: true };
        if (!VALID_GR_ROLES[grRoleName]) { data.role_granted = { ok: false, error: 'Invalid role name.' }; return; }
        var grFullName     = 'x_infte_ops_int.' + grRoleName;
        var grRoleRec      = new GlideRecord('sys_user_role');
        grRoleRec.addQuery('name', grFullName);
        grRoleRec.setLimit(1);
        grRoleRec.query();
        if (!grRoleRec.next()) { data.role_granted = { ok: false, error: 'Role record not found.' }; return; }
        var grRoleSysId    = '' + grRoleRec.getUniqueValue();
        var grChkGr        = new GlideRecord('sys_user_has_role');
        grChkGr.addQuery('user', grUserSysId);
        grChkGr.addQuery('role', grRoleSysId);
        grChkGr.setLimit(1);
        grChkGr.query();
        if (grChkGr.next()) {
            var grExistUserRec = new GlideRecord('sys_user');
            var grExistName = '';
            var grExistEmail = '';
            if (grExistUserRec.get(grUserSysId)) { grExistName = '' + grExistUserRec.getDisplayValue('name'); grExistEmail = '' + (grExistUserRec.getValue('email') || ''); }
            data.role_granted = { ok: true, already_had_role: true, role_assignment_sys_id: '' + grChkGr.getUniqueValue(), user_sys_id: grUserSysId, name: grExistName, email: grExistEmail };
            return;
        }
        var grNewHr        = new GlideRecord('sys_user_has_role');
        grNewHr.initialize();
        grNewHr.setValue('user', grUserSysId);
        grNewHr.setValue('role', grRoleSysId);
        grNewHr.setValue('state', 'active');
        var grNewId        = '' + (grNewHr.insert() || '');
        var grUserRec      = new GlideRecord('sys_user');
        var grName         = '';
        var grEmail        = '';
        if (grUserRec.get(grUserSysId)) { grName = '' + grUserRec.getDisplayValue('name'); grEmail = '' + (grUserRec.getValue('email') || ''); }
        data.role_granted = { ok: !!grNewId, role_assignment_sys_id: grNewId, user_sys_id: grUserSysId, name: grName, email: grEmail };
        return;
    }

    if (input.action === 'revoke_role') {
        if (!hasAdmin) { data.role_revoked = { ok: false, error: 'Admin access required.' }; return; }
        var rrSysId = '' + input.role_assignment_sys_id;
        var rrRec   = new GlideRecord('sys_user_has_role');
        if (!rrRec.get(rrSysId)) { data.role_revoked = { ok: false, error: 'Assignment not found.' }; return; }
        rrRec.deleteRecord();
        data.role_revoked = { ok: true };
        return;
    }

    if (input.action === 'list_all_automations') {
        if (!hasAdmin && !hasCreator) { data.all_automations = []; return; }
        var laaGr   = new GlideRecord('x_infte_ops_int_automation');
        laaGr.orderBy('name');
        laaGr.query();
        var laaList = [];
        while (laaGr.next()) {
            laaList.push({
                sys_id:      '' + laaGr.getUniqueValue(),
                name:        '' + laaGr.getValue('name'),
                description: '' + (laaGr.getValue('description') || ''),
                status:      '' + (laaGr.getValue('status') || 'draft'),
                created_on:  '' + laaGr.getDisplayValue('sys_created_on')
            });
        }
        data.all_automations = laaList;
        return;
    }

    if (input.action === 'create_automation') {
        if (!hasAdmin && !hasCreator) { data.created_automation = { ok: false, error: 'Creator or Admin access required.' }; return; }
        var caName      = '' + (input.name || '');
        var caDesc      = '' + (input.description || '');
        var caScript    = '' + (input.script || '');
        var caTarget    = input.target_groups;
        if (!caName) { data.created_automation = { ok: false, error: 'Name is required.' }; return; }
        var caRec       = new GlideRecord('x_infte_ops_int_automation');
        caRec.initialize();
        caRec.setValue('name', caName);
        caRec.setValue('description', caDesc);
        if (caScript) { caRec.setValue('script', caScript); }
        caRec.setValue('status', 'draft');
        caRec.setValue('created_by', userSysId);
        var caId        = '' + (caRec.insert() || '');
        if (!caId) { data.created_automation = { ok: false, error: 'Failed to create automation.' }; return; }
        var caAllGroups = (caTarget === 'all');
        var caGroupIds  = [];
        if (caAllGroups) {
            var caAllGrGr = new GlideRecord('x_infte_ops_int_group');
            caAllGrGr.addQuery('status', 'active');
            caAllGrGr.query();
            while (caAllGrGr.next()) { caGroupIds.push('' + caAllGrGr.getUniqueValue()); }
        } else if (caTarget && caTarget.length) {
            var caTi;
            for (caTi = 0; caTi < caTarget.length; caTi++) { caGroupIds.push('' + caTarget[caTi]); }
        }
        var caGi;
        for (caGi = 0; caGi < caGroupIds.length; caGi++) {
            var caGrRec = new GlideRecord('x_infte_ops_int_group');
            if (!caGrRec.get(caGroupIds[caGi])) { continue; }
            var caExist = [];
            try { caExist = JSON.parse('' + caGrRec.getValue('automations')); } catch(e) { caExist = []; }
            var caAlready = false;
            var caAi;
            for (caAi = 0; caAi < caExist.length; caAi++) {
                if ('' + caExist[caAi].automation_sys_id === caId) { caAlready = true; break; }
            }
            if (!caAlready) {
                caExist.push({ automation_sys_id: caId, approval_status: 'approved' });
                caGrRec.setValue('automations', JSON.stringify(caExist));
                caGrRec.update();
            }
        }
        data.created_automation = { ok: true, sys_id: caId, name: caName };
        return;
    }

    if (input.action === 'publish_automation') {
        if (!hasAdmin && !hasCreator) { data.published_automation = { ok: false, error: 'Creator or Admin access required.' }; return; }
        var paAutoId    = '' + input.automation_sys_id;
        var paAllGroups = (input.target_type === 'all');
        var paGroupIds  = input.group_sys_ids || [];
        var paAutoRec   = new GlideRecord('x_infte_ops_int_automation');
        if (!paAutoRec.get(paAutoId)) { data.published_automation = { ok: false, error: 'Automation not found.' }; return; }
        var paGrGr      = new GlideRecord('x_infte_ops_int_group');
        paGrGr.addQuery('status', 'active');
        if (!paAllGroups && paGroupIds.length > 0) {
            paGrGr.addQuery('sys_id', 'IN', paGroupIds.join(','));
        }
        paGrGr.query();
        var paCount = 0;
        while (paGrGr.next()) {
            var paExist = [];
            try { paExist = JSON.parse('' + paGrGr.getValue('automations')); } catch(e) { paExist = []; }
            var paAlready = false;
            var paBi;
            for (paBi = 0; paBi < paExist.length; paBi++) {
                if ('' + paExist[paBi].automation_sys_id === paAutoId) { paAlready = true; break; }
            }
            if (!paAlready) {
                paExist.push({ automation_sys_id: paAutoId, approval_status: 'approved' });
                paGrGr.setValue('automations', JSON.stringify(paExist));
                paGrGr.update();
                paCount++;
            }
        }
        data.published_automation = { ok: true, groups_updated: paCount };
        return;
    }

})();
