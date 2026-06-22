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
                    short_description: '' + (apGr.getValue('approver_id') || 'Approval Request'),
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
        } catch (e) {
            deliverableTypes = [];
            artifacts = [];
        }
        return { deliverable_types: deliverableTypes, artifacts: artifacts };
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
                'please','could','want','need','tell','give','let','know','see','check','look'];
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

        if (containsAny(aq, ['hello','hi there','hey there','good morning','good afternoon','good evening','howdy','greetings','what\'s up','whats up','yo ','hi ','hey ']) || aq === 'hi' || aq === 'hey' || aq === 'hello') {
            var greetHour = parseInt(gs.nowDateTime().substring(11, 13), 10) || 9;
            var greetTime = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening';
            data.reply = greetTime + '! I am your Operations Assistant. I can help you with:\n\n' +
                '- Service requests and catalog items\n' +
                '- Incidents and approvals\n' +
                '- Knowledge base articles\n' +
                '- Automations and executions\n' +
                '- Groups, teams, and memberships\n\n' +
                'What would you like to do today? Type "help" for a full list of capabilities.';
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['thank you','thanks','thank','appreciate','great job','well done','perfect','awesome','excellent','cheers','that helped','that works','sorted','resolved'])) {
            data.reply = 'You are welcome! Is there anything else I can help you with?';
            data.type  = 'info';
            return;
        }

        if (containsAny(aq, ['help','what can you','what can i','capabilities','commands','guide me','guide','assist','how to use','what do you do','list commands','show commands','what do you know','what are you'])) {
            var isAdminUser = (hasAdmin === true);
            data.reply = 'I am your Operations Assistant. Here is what I can help you with:\n\n' +
                'Service Requests:\n' +
                '- "Show my requests" — view your open service requests\n' +
                '- "I need a new laptop" — search and submit catalog items\n' +
                '- "Request VPN access" — find access request catalog items\n\n' +
                'Incidents:\n' +
                '- "Show my incidents" — list your open incidents\n' +
                '- "Create an incident" — report a new issue to IT\n' +
                '- "Check INC0001234" — look up a specific incident\n\n' +
                'Approvals:\n' +
                '- "Show my approvals" — view requests waiting for your approval\n\n' +
                'Knowledge Base:\n' +
                '- "How do I reset my password?" — find how-to articles\n' +
                '- "What is the VPN procedure?" — search documentation\n\n' +
                'Automations:\n' +
                '- "Show my automations" — list available automations\n' +
                '- "Run [automation name]" — trigger an automation\n' +
                '- "Show recent executions" — view activity history\n\n' +
                'Account & Profile:\n' +
                '- "Who am I?" — show your profile information\n' +
                '- "What groups am I in?" — list your group memberships\n\n' +
                'Self-Service:\n' +
                '- "Reset my password" — password reset guidance\n' +
                '- "I am locked out" — account unlock options\n' +
                '- "Onboarding help" — new employee resources\n\n' +
                (isAdminUser ? 'Administration (admin only):\n' +
                '- "Create a report" — create a managed report\n' +
                '- "Create a dashboard" — create a managed dashboard\n' +
                '- "Service health" — check system status\n\n' : '') +
                'Contact:\n' +
                '- "Contact the service desk" — reach IT support';
            data.type  = 'info';
            return;
        }

        if (containsAny(aq, ['my profile','who am i','my account','my details','my information','my name','my email','my username','about me','my user'])) {
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
            data.reply = 'Your Profile:\n\n' +
                'Name: ' + profName + '\n' +
                (profEmail ? 'Email: ' + profEmail + '\n' : '') +
                (profTitle ? 'Title: ' + profTitle + '\n' : '') +
                (profDept  ? 'Department: ' + profDept + '\n' : '') +
                'Roles: ' + (roleList.length ? roleList.join(', ') : 'None assigned') + '\n' +
                'Groups: ' + (data.userGroups.length ? data.userGroups.length + ' group' + (data.userGroups.length === 1 ? '' : 's') : 'None');
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['my incident','my incidents','my issues','open incident','incidents i raised','incident list','show incidents','view incidents','check my incident','my open ticket','my open tickets','active incident'])) {
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

        if (containsAny(aq, ['create incident','report incident','log incident','raise incident','new incident','open incident','file incident','submit incident','report an issue','log an issue','report issue','create a ticket','raise a ticket','open a ticket','log a ticket','something is broken','not working','broken','server down','system down','i have an issue','i have a problem','technical issue','technical problem'])) {
            var incKbItems = searchKnowledge(stripStopWords(aq) || aq, 3);
            data.reply = 'To report an incident with IT, go to the Service Portal and select "Report an Issue" or click here: /sp?id=new_call\n\n' +
                'When creating your incident, please include:\n' +
                '- A clear description of the issue\n' +
                '- When it started\n' +
                '- How many people are affected\n' +
                '- Any error messages you see\n\n' +
                'For emergencies or critical outages, call the IT helpdesk directly.';
            if (incKbItems.length > 0) {
                data.reply += '\n\nI also found knowledge articles that may resolve your issue:';
                data.type  = 'knowledge';
                data.items = incKbItems;
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['my approval','my approvals','pending approval','waiting for my approval','items to approve','approve request','approve something','need to approve','approval queue','approval list','show approvals','view approvals','what needs approval','awaiting approval'])) {
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

        if (containsAny(aq, ['change request','change ticket','change management','crtq','crq','schedule change','raise a change','create a change','change order','request a change','change advisory','cab','emergency change','standard change','normal change'])) {
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

        if (containsAny(aq, ['reset password','forgot password','password expired','change password','password reset','locked out','account locked','cannot log in','can\'t log in','login problem','password problem','unlock account','unlock my account','need new password','password help','i am locked out'])) {
            var pwKbItems = searchKnowledge('password reset', 4);
            data.reply = 'Password and account help:\n\n' +
                '1. Self-service password reset: /sp?id=self_service_pw_reset\n' +
                '2. If your account is locked, wait 15 minutes and try again, or contact IT Support\n' +
                '3. For Active Directory password resets, use the company self-service portal\n\n' +
                'IT Support contact: Raise a service request for "Account Access" in the Service Catalog, or call the helpdesk for immediate assistance.';
            if (pwKbItems.length > 0) {
                data.reply += '\n\nKnowledge articles on password management:';
                data.type  = 'knowledge';
                data.items = pwKbItems;
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['outage','service down','system outage','is down','not available','service unavailable','maintenance window','service status','system status','health check','service health','platform status','what is down','what\'s down','current outage','known issue','known issues','planned maintenance'])) {
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

        if (containsAny(aq, ['onboarding','new employee','getting started','new starter','new joiner','first day','orientation','setup my account','setup account','new hire','join the team','new member','start working','where do i start','i am new'])) {
            var onboardItems = searchCatalog('onboarding', 3);
            var onboardKb    = searchKnowledge('onboarding new employee', 3);
            data.reply = 'Welcome! Here are resources to help you get started:\n\n' +
                '1. Service Catalog — Request your equipment and system access\n' +
                '2. Knowledge Base — Find how-to guides and IT policies\n' +
                '3. Operations Intelligence Portal — Your central hub for automations and reporting\n\n' +
                'Suggested first steps:\n' +
                '- Request a laptop: say "I need a laptop"\n' +
                '- Request system access: say "Request access to [system name]"\n' +
                '- Find policies: say "How do I [topic]?"';
            if (onboardItems.length > 0 || onboardKb.length > 0) {
                data.reply += '\n\nOnboarding resources found:';
                data.type  = onboardItems.length > 0 ? 'catalog' : 'knowledge';
                data.items = onboardItems.concat(onboardKb);
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['sla','breach','breached','overdue','past due','sla breach','missing sla','service level','response time','resolution time','sla target','sla status','first response'])) {
            var slaKbItems = searchKnowledge('service level agreement', 3);
            data.reply = 'Service Level Agreements (SLAs) define target response and resolution times for incidents and requests.\n\n' +
                'Typical SLA targets:\n' +
                '- Priority 1 (Critical): 1 hour response, 4 hour resolution\n' +
                '- Priority 2 (High): 4 hour response, 8 hour resolution\n' +
                '- Priority 3 (Medium): 8 hour response, 3 day resolution\n' +
                '- Priority 4 (Low): 1 day response, 5 day resolution\n\n' +
                'To check SLA status on a specific ticket, say "Check INC[number]" or view your incidents with "Show my incidents".';
            if (slaKbItems.length > 0) {
                data.reply += '\n\nSLA knowledge articles:';
                data.type  = 'knowledge';
                data.items = slaKbItems;
            } else {
                data.type = 'info';
            }
            return;
        }

        if (containsAny(aq, ['navigate to','where is','where can i find','how do i get to','go to','open the','take me to','show me the','portal section','dashboard section','workspace section','gallery section','studio section','command section'])) {
            data.reply = 'Operations Intelligence Portal navigation:\n\n' +
                '- Workspace — Your automations and executions\n' +
                '- Operations Gallery — Your saved reports and dashboards\n' +
                '- Studio — Build and manage deliverables (Creators)\n' +
                '- Governance — Group management and approvals (Leadership)\n' +
                '- Command — Administration console (Admins)\n\n' +
                'Use the navigation sidebar on the left to switch between sections. The Assistant is always available via the chat icon.';
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['contact support','contact the service desk','call support','reach support','speak to someone','talk to a human','escalate','need help from a human','contact it','it support','helpdesk','help desk','service desk contact','support contact','how to contact'])) {
            data.reply = 'To reach IT Support:\n\n' +
                '- Service Portal: /sp — Browse and submit service requests\n' +
                '- Create an incident: Say "Create an incident" to report an issue\n' +
                '- Urgent issues: Call your IT helpdesk or support line\n' +
                '- Email: Submit requests via the Service Catalog for non-urgent needs\n\n' +
                'For Operations Intelligence platform issues specifically, contact your platform administrator.';
            data.type = 'info';
            return;
        }

        if (containsAny(aq, ['create report','build report','new report','make report','add report','generate report','report builder'])) {
            if (!hasCreator && !hasAdmin) {
                data.reply = 'Report creation requires Creator or Administrator access. Contact your administrator to request the Creator role.';
                data.type  = 'error';
            } else {
                data.reply = 'To create a new report, navigate to the Studio section from the sidebar and select "Report" as your deliverable type. The report builder will guide you through naming and configuring your report.\n\nYour completed reports will appear in the Operations Gallery.';
                data.type  = 'info';
            }
            return;
        }

        if (containsAny(aq, ['create dashboard','build dashboard','new dashboard','make dashboard','add dashboard','generate dashboard','dashboard builder'])) {
            if (!hasCreator && !hasAdmin) {
                data.reply = 'Dashboard creation requires Creator or Administrator access. Contact your administrator to request the Creator role.';
                data.type  = 'error';
            } else {
                data.reply = 'To create a new dashboard, navigate to the Studio section from the sidebar and select "Dashboard" as your deliverable type. The dashboard builder will guide you through the configuration.\n\nYour completed dashboards will appear in the Operations Gallery.';
                data.type  = 'info';
            }
            return;
        }

        if (containsAny(aq, ['my request','my requests','my tickets','my orders','requests i raised','what did i request','show requests','view requests','open request','raised request','submitted request'])) {
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

        if (containsAny(aq, ['my group','groups i','which group','what group','am i in','member of','my team','my membership','team member','group member','my teams'])) {
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

        if (containsAny(aq, ['last execution','recent execution','history','activity','what ran','did it run','what happened','execution log','my execution','execution status','automation history','automation log'])) {
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

        if (containsAny(aq, ['list automation','show automation','my automation','what automation','available automation','automations available','show me automation','what automations','which automations','all automations'])) {
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
                if (aq.indexOf(rAutoName) !== -1) {
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

        if (containsAny(aq, ['i need','i want','request a','order a','order an','get a','get an','need a','need an','access to','request access','can i get','can i have','how to order','how do i order','how do i request','buy a','purchase','procure','submit a request','raise a request'])) {
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

        if (containsAny(aq, ['laptop','computer','phone','mobile','equipment','vpn','software','license','application','hardware','printer','monitor','mouse','keyboard','headset','desk','badge','account','permission','catalog item','service catalog','wifi','network access','remote access','tablet','charger','cable','docking station','webcam','microphone'])) {
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

        if (containsAny(aq, ['how do','how to','what is','what are','explain','procedure','process','policy','knowledge','learn','find information','find out','troubleshoot','fix','problem with','issue with','error with','help with','documentation','steps to','instructions','tutorial','article','faq','guide for','understand','show me how','can you explain','tell me about','what does'])) {
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
            data.reply = 'I found some resources that might help with "' + rawQ + '":';
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

        data.reply = 'I am not sure how to help with "' + rawQ + '". You can try:\n\n' +
            '- "Show my incidents" — view your active incidents\n' +
            '- "Show my approvals" — view pending approvals\n' +
            '- "I need a laptop" — search the Service Catalog\n' +
            '- "How do I reset my password?" — search the Knowledge Base\n' +
            '- "Show my automations" — list available automations\n' +
            '- "Contact support" — reach IT support\n\n' +
            'Type "help" for all capabilities.';
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
        var tPropRec = new GlideRecord('sys_properties');
        tPropRec.addQuery('name', tPropName);
        tPropRec.setLimit(1);
        tPropRec.query();
        if (tPropRec.next()) {
            tPropRec.setValue('value', tPropVal);
            tPropRec.update();
        } else {
            var tPropNew = new GlideRecord('sys_properties');
            tPropNew.initialize();
            tPropNew.setValue('name', tPropName);
            tPropNew.setValue('value', tPropVal);
            tPropNew.insert();
        }
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
        if (!hasAdmin) { data.created_group = { ok: false, error: 'Admin access required.' }; return; }
        var cgName = '' + (input.name || '');
        var cgDesc = '' + (input.description || '');
        var cgType = '' + (input.type || 'custom_group');
        if (!cgName) { data.created_group = { ok: false, error: 'Name is required.' }; return; }
        try {
            var gm = new GroupManager();
            var newGrpId = gm.createGroup(cgName, cgDesc, cgType, data.personSysId || null, null, data.personSysId || null);
            if (newGrpId) {
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
        var cdResult;
        if (cdFlowId === 'report_builder') {
            cdResult = createReport(cdCollected, data.personSysId);
        } else if (cdFlowId === 'dashboard_builder') {
            cdResult = createDashboard(cdCollected, data.personSysId);
        } else if (cdFlowId === 'data_alert') {
            cdResult = createDataAlert(cdCollected, data.personSysId);
        } else if (cdFlowId === 'notification_rule') {
            cdResult = createNotificationRule(cdCollected, data.personSysId);
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

})();
