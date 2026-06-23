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
        var result  = { admin: false, developer: false, leadership: false, creator: false, user: false };
        var nameMap = {
            'x_infte_ops_int.admin':      'admin',
            'x_infte_ops_int.developer':  'developer',
            'x_infte_ops_int.leadership': 'leadership',
            'x_infte_ops_int.creator':    'creator',
            'x_infte_ops_int.user':       'user'
        };
        var idToKey = {};
        var rGr = new GlideRecord('sys_user_role');
        rGr.addQuery('name', 'IN', 'x_infte_ops_int.admin,x_infte_ops_int.developer,x_infte_ops_int.leadership,x_infte_ops_int.creator,x_infte_ops_int.user');
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

        var catalogCategories = loadCatalogCategories();
        return { stats: stats, maintenance: maintenance, groups: allGroups, catalog_categories: catalogCategories };
    }

    function loadCatalogCategories() {
        var categories = [];
        try {
            var catGr = new GlideRecord('x_infte_ops_int_catalog_category');
            catGr.addQuery('active', true);
            catGr.orderBy('sort_order');
            catGr.orderBy('name');
            catGr.query();
            while (catGr.next()) {
                var catId = '' + catGr.getUniqueValue();
                var items = [];
                var itemGr = new GlideRecord('x_infte_ops_int_catalog_item');
                itemGr.addQuery('category', catId);
                itemGr.addQuery('active', true);
                itemGr.orderBy('sort_order');
                itemGr.orderBy('name');
                itemGr.query();
                while (itemGr.next()) {
                    items.push({
                        sys_id:      '' + itemGr.getUniqueValue(),
                        name:        '' + itemGr.getValue('name'),
                        description: '' + (itemGr.getValue('description') || ''),
                        action_type: '' + (itemGr.getValue('action_type') || ''),
                        action_value: '' + (itemGr.getValue('action_value') || ''),
                        sort_order:  parseInt('' + itemGr.getValue('sort_order'), 10) || 0
                    });
                }
                categories.push({
                    sys_id:      catId,
                    name:        '' + catGr.getValue('name'),
                    description: '' + (catGr.getValue('description') || ''),
                    icon:        '' + (catGr.getValue('icon') || 'fa-folder'),
                    color:       '' + (catGr.getValue('color') || '#00BF6F'),
                    sort_order:  parseInt('' + catGr.getValue('sort_order'), 10) || 0,
                    items:       items
                });
            }
        } catch (e) { categories = []; }
        return categories;
    }

    function loadAppInventory() {
        var inventory = { tables: [], script_includes: [], business_rules: [], va_topics: [], roles: [], notifications: [], scheduled_jobs: [] };
        try {
            var scopeGr = new GlideRecord('sys_scope');
            scopeGr.addQuery('scope', 'x_infte_ops_int');
            scopeGr.setLimit(1);
            scopeGr.query();
            var scopeSysId = scopeGr.next() ? ('' + scopeGr.getUniqueValue()) : '';

            var tGr = new GlideRecord('sys_db_object');
            tGr.addQuery('sys_scope', scopeSysId);
            tGr.orderBy('name');
            tGr.query();
            while (tGr.next()) {
                inventory.tables.push({
                    sys_id: '' + tGr.getUniqueValue(),
                    name:   '' + tGr.getValue('name'),
                    label:  '' + (tGr.getValue('label') || '')
                });
            }

            var siGr = new GlideRecord('sys_script_include');
            siGr.addQuery('sys_scope', scopeSysId);
            siGr.orderBy('name');
            siGr.query();
            while (siGr.next()) {
                inventory.script_includes.push({
                    sys_id: '' + siGr.getUniqueValue(),
                    name:   '' + siGr.getValue('name'),
                    active: siGr.getValue('active') === 'true' || siGr.getValue('active') === '1'
                });
            }

            var brGr = new GlideRecord('sys_script');
            brGr.addQuery('sys_scope', scopeSysId);
            brGr.orderBy('name');
            brGr.query();
            while (brGr.next()) {
                inventory.business_rules.push({
                    sys_id: '' + brGr.getUniqueValue(),
                    name:   '' + brGr.getValue('name'),
                    table:  '' + (brGr.getValue('collection') || ''),
                    active: brGr.getValue('active') === 'true' || brGr.getValue('active') === '1'
                });
            }

            var vaGr = new GlideRecord('sys_cs_topic');
            vaGr.addQuery('sys_scope', scopeSysId);
            vaGr.orderBy('name');
            vaGr.query();
            while (vaGr.next()) {
                inventory.va_topics.push({
                    sys_id: '' + vaGr.getUniqueValue(),
                    name:   '' + vaGr.getValue('name'),
                    active: vaGr.getValue('active') === 'true' || vaGr.getValue('active') === '1'
                });
            }

            var roleGr = new GlideRecord('sys_user_role');
            roleGr.addQuery('sys_scope', scopeSysId);
            roleGr.orderBy('name');
            roleGr.query();
            while (roleGr.next()) {
                inventory.roles.push({
                    sys_id: '' + roleGr.getUniqueValue(),
                    name:   '' + roleGr.getValue('name'),
                    label:  '' + (roleGr.getValue('description') || '')
                });
            }

            var notifGr = new GlideRecord('sysevent_email_action');
            notifGr.addQuery('sys_scope', scopeSysId);
            notifGr.orderBy('name');
            notifGr.query();
            while (notifGr.next()) {
                inventory.notifications.push({
                    sys_id: '' + notifGr.getUniqueValue(),
                    name:   '' + notifGr.getValue('name'),
                    active: notifGr.getValue('active') === 'true' || notifGr.getValue('active') === '1'
                });
            }

            var jobGr = new GlideRecord('sysauto_script');
            jobGr.addQuery('sys_scope', scopeSysId);
            jobGr.orderBy('name');
            jobGr.query();
            while (jobGr.next()) {
                inventory.scheduled_jobs.push({
                    sys_id: '' + jobGr.getUniqueValue(),
                    name:   '' + jobGr.getValue('name'),
                    active: jobGr.getValue('active') === 'true' || jobGr.getValue('active') === '1'
                });
            }
        } catch (e) {}
        return inventory;
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

    var userSysId      = gs.getUserID();
    var oiRoles        = getOiRoles(userSysId);
    var hasAdmin       = oiRoles.admin;
    var hasDeveloper   = oiRoles.developer;
    var hasLeadership  = oiRoles.leadership;
    var hasCreator     = oiRoles.creator;
    var hasUser        = oiRoles.user;

    if (!hasAdmin && !hasDeveloper && !hasLeadership && !hasCreator && !hasUser) {
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
    } else if (hasDeveloper) {
        data.userRole = 'developer';
    } else if (hasLeadership) {
        data.userRole = 'leadership';
    } else if (hasCreator) {
        data.userRole = 'creator';
    } else {
        data.userRole = 'user';
    }

    var allSections = [
        { id: 'workspace',  label: 'Workspace',             icon: 'fa-th-large', roles: ['admin','developer','leadership','creator','user'] },
        { id: 'gallery',    label: 'Operations Gallery',    icon: 'fa-cube',     roles: ['admin','developer','leadership','creator','user'] },
        { id: 'studio',     label: 'Operations Studio',     icon: 'fa-code',     roles: ['admin','creator'] },
        { id: 'governance', label: 'Operations Governance', icon: 'fa-shield',   roles: ['admin','developer','leadership'] },
        { id: 'developer',  label: 'Developer Workspace',   icon: 'fa-code',     roles: ['admin','developer'] },
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
            var wsData = loadWorkspace(data.userGroups);
            wsData.catalog_categories = loadCatalogCategories();
            data.sectionData = wsData;
        } else if (section === 'gallery') {
            data.sectionData = loadDeliverables(data.personSysId);
        } else if (section === 'studio') {
            if (hasCreator || hasAdmin) {
                data.sectionData = loadStudio(data.personSysId);
            }
        } else if (section === 'governance') {
            if (hasLeadership || hasAdmin || hasDeveloper) {
                data.sectionData = loadGovernance(data.personSysId, hasAdmin || hasDeveloper);
            }
        } else if (section === 'developer') {
            if (hasAdmin || hasDeveloper) {
                data.sectionData = { inventory: loadAppInventory() };
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
        if (!rawQ.trim()) {
            data.reply = 'Please type a message to get started.';
            data.type  = 'text';
            return;
        }
        var aType   = '' + (input.assistant_type || 'operations');
        var histRaw = input.context || [];
        var hist    = [];
        var hri;
        for (hri = 0; hri < histRaw.length; hri++) {
            var hr = histRaw[hri];
            if (hr && hr.role && hr.text) {
                hist.push({ role: '' + hr.role, text: '' + hr.text });
            }
        }
        var advisor = new ConversationAdvisor(aType);
        var userCtx = {
            user_sys_id:   userSysId,
            full_name:     data.userName,
            system_role:   data.userRole,
            person_sys_id: data.personSysId,
            groups:        data.userGroups
        };
        var result = advisor.analyze(rawQ, userCtx, hist);
        data.reply   = result.reply || '';
        data.type    = result.type  || 'text';
        data.choices = result.choices || null;

        var hint = result.dataHint || '';
        if (!hint) { return; }

        if (hint === 'load_approvals') {
            var apItems = loadUserApprovals(userSysId, 10);
            if (apItems.length === 0) {
                data.reply = 'You have no pending approvals at this time.';
                data.type  = 'text';
            } else {
                data.reply = 'You have ' + apItems.length + ' pending approval(s):';
                data.type  = 'data';
                data.data_items = apItems;
                data.data_type  = 'approvals';
            }
            return;
        }

        if (hint === 'load_incidents') {
            var incItems = loadUserIncidents(userSysId, 10);
            if (incItems.length === 0) {
                data.reply = 'You have no open incidents at this time.';
                data.type  = 'text';
            } else {
                data.reply = 'Here are your open incidents:';
                data.type  = 'data';
                data.data_items = incItems;
                data.data_type  = 'incidents';
            }
            return;
        }

        if (hint === 'load_user_requests') {
            var reqItems = loadUserRequests(userSysId, 10);
            if (reqItems.length === 0) {
                data.reply = 'You have no recent service requests.';
                data.type  = 'text';
            } else {
                data.reply = 'Here are your recent service requests:';
                data.type  = 'data';
                data.data_items = reqItems;
                data.data_type  = 'requests';
            }
            return;
        }

        if (hint === 'show_catalog') {
            var catCats = loadCatalogCategories();
            if (catCats.length === 0) {
                data.reply = 'The Automation Catalog has no published categories yet. Please check back later or contact your Administrator.';
                data.type  = 'text';
            } else {
                data.reply = 'Here is what is available in the Automation Catalog:';
                data.type  = 'data';
                data.data_items = catCats;
                data.data_type  = 'catalog';
            }
            return;
        }

        if (hint === 'lookup_incident') {
            var incNum = result.entityRef || '';
            if (!incNum) {
                data.reply = 'Please provide an incident number, for example INC0012345.';
                data.type  = 'clarify';
                return;
            }
            var incLu = new GlideRecord('incident');
            incLu.addQuery('number', incNum.toUpperCase());
            incLu.setLimit(1);
            incLu.query();
            if (incLu.next()) {
                data.reply = 'Incident ' + incNum.toUpperCase() + ': ' + incLu.getDisplayValue('short_description') +
                    ' — State: ' + incLu.getDisplayValue('state') +
                    ', Priority: ' + incLu.getDisplayValue('priority') +
                    ', Assigned to: ' + incLu.getDisplayValue('assigned_to') + '.';
                data.type  = 'text';
            } else {
                data.reply = 'Incident ' + incNum.toUpperCase() + ' was not found. Please verify the number and try again.';
                data.type  = 'text';
            }
            return;
        }

        if (hint === 'dev_app_overview' || hint === 'dev_list_tables' || hint === 'dev_list_script_includes' ||
            hint === 'dev_list_business_rules' || hint === 'dev_list_va_topics' || hint === 'dev_list_roles' ||
            hint === 'dev_list_notifications' || hint === 'dev_list_jobs') {
            var invData = loadAppInventory();
            var typeMap = {
                'dev_list_tables':          { key: 'tables',          label: 'tables' },
                'dev_list_script_includes': { key: 'script_includes', label: 'Script Includes' },
                'dev_list_business_rules':  { key: 'business_rules',  label: 'Business Rules' },
                'dev_list_va_topics':       { key: 'va_topics',       label: 'Virtual Agent topics' },
                'dev_list_roles':           { key: 'roles',           label: 'roles' },
                'dev_list_notifications':   { key: 'notifications',   label: 'notifications' },
                'dev_list_jobs':            { key: 'scheduled_jobs',  label: 'scheduled jobs' }
            };
            if (hint === 'dev_app_overview') {
                data.reply = 'Operations Intelligence application overview — Scope: x_infte_ops_int.' +
                    ' Tables: ' + invData.tables.length +
                    ', Script Includes: ' + invData.script_includes.length +
                    ', Business Rules: ' + invData.business_rules.length +
                    ', Virtual Agent Topics: ' + invData.va_topics.length +
                    ', Roles: ' + invData.roles.length +
                    ', Notifications: ' + invData.notifications.length +
                    ', Scheduled Jobs: ' + invData.scheduled_jobs.length + '.';
                data.type  = 'text';
            } else {
                var mapEntry = typeMap[hint];
                var listItems = mapEntry ? invData[mapEntry.key] : [];
                if (listItems.length === 0) {
                    data.reply = 'No ' + (mapEntry ? mapEntry.label : 'items') + ' found in scope x_infte_ops_int.';
                    data.type  = 'text';
                } else {
                    data.reply = 'Found ' + listItems.length + ' ' + (mapEntry ? mapEntry.label : 'items') + ':';
                    data.type  = 'data';
                    data.data_items = listItems;
                    data.data_type  = hint;
                }
            }
            return;
        }

        if (hint === 'dev_engine_status') {
            var pGrEs = new GlideRecord('sys_properties');
            pGrEs.addQuery('name', 'x_infte_ops_int.engine_key');
            pGrEs.setLimit(1);
            pGrEs.query();
            var engineKeySet = pGrEs.next() && ('' + pGrEs.getValue('value')).length > 0;
            data.reply = 'Engine status for Operations Intelligence (x_infte_ops_int):' +
                ' Engine key configured: ' + (engineKeySet ? 'Yes' : 'No') +
                '. Endpoint: POST /api/x_infte_ops_int/ops_int_engine/v1.';
            data.type  = 'text';
            return;
        }

        if (hint === 'admin_list_categories') {
            var admCats = loadCatalogCategories();
            if (admCats.length === 0) {
                data.reply = 'No Automation Catalog categories exist yet. Use Catalog Management to create the first category.';
                data.type  = 'text';
            } else {
                data.reply = 'There are ' + admCats.length + ' catalog categories configured:';
                data.type  = 'data';
                data.data_items = admCats;
                data.data_type  = 'catalog_categories';
            }
            return;
        }

        if (hint === 'admin_pending_actions') {
            var admPa = loadGovernance(data.personSysId, true);
            var admPaItems = admPa.pending_actions || [];
            if (admPaItems.length === 0) {
                data.reply = 'There are no pending governance actions at this time.';
                data.type  = 'text';
            } else {
                data.reply = 'There are ' + admPaItems.length + ' pending governance action(s):';
                data.type  = 'data';
                data.data_items = admPaItems;
                data.data_type  = 'pending_actions';
            }
            return;
        }

        if (hint === 'admin_system_status') {
            var admCmd = loadCommand();
            data.reply = 'Platform status — Persons: ' + admCmd.stats.persons +
                ', Published Automations: ' + admCmd.stats.automations +
                ', Active Groups: ' + admCmd.stats.groups +
                ', Executions today: ' + admCmd.stats.executions_today + '.';
            data.type  = 'text';
            return;
        }

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
        try {
            var tmKey  = gs.getProperty('x_infte_ops_int.engine_key', '');
            var tmPass = gs.getProperty('x_infte_ops_int.svc_password', '');
            var tmBase = ('' + gs.getProperty('glide.servlet.uri', '')).replace(/\/+$/, '');
            var tmRm   = new sn_ws.RESTMessageV2();
            tmRm.setEndpoint(tmBase + '/api/x_infte_ops_int/ops_int_engine/v1');
            tmRm.setHttpMethod('POST');
            tmRm.setRequestHeader('x-engine-key', tmKey);
            tmRm.setRequestHeader('Content-Type', 'application/json');
            tmRm.setBasicAuth('svc_operations_intelligence_api', tmPass);
            tmRm.setRequestBody('{"op":"property.set","data":{"key":"' + tPropName + '","value":"' + tPropVal + '","type":"string","description":"Operations Intelligence maintenance flag"}}');
            var tmResp = tmRm.execute();
            data.toggled = (tmResp.getStatusCode() === 200);
        } catch (tmErr) {
            data.toggled = false;
        }
        return;
    }

    if (input.action === 'save_catalog_category') {
        if (!hasAdmin) { data.saved_category = { ok: false, error: 'Access denied.' }; return; }
        var scName = '' + (input.name || '');
        if (!scName) { data.saved_category = { ok: false, error: 'Name is required.' }; return; }
        try {
            var scGr = new GlideRecord('x_infte_ops_int_catalog_category');
            var scSysId = '' + (input.sys_id || '');
            if (scSysId && scGr.get(scSysId)) {
                scGr.setValue('name', scName);
                scGr.setValue('description', '' + (input.description || ''));
                scGr.setValue('icon', '' + (input.icon || 'fa-folder'));
                scGr.setValue('color', '' + (input.color || '#00BF6F'));
                scGr.setValue('sort_order', parseInt('' + (input.sort_order || 0), 10));
                scGr.setValue('active', true);
                scGr.update();
                data.saved_category = { ok: true, sys_id: scSysId, action: 'updated' };
            } else {
                var ncGr = new GlideRecord('x_infte_ops_int_catalog_category');
                ncGr.initialize();
                ncGr.setValue('name', scName);
                ncGr.setValue('description', '' + (input.description || ''));
                ncGr.setValue('icon', '' + (input.icon || 'fa-folder'));
                ncGr.setValue('color', '' + (input.color || '#00BF6F'));
                ncGr.setValue('sort_order', parseInt('' + (input.sort_order || 0), 10));
                ncGr.setValue('active', true);
                ncGr.setValue('created_by', userSysId);
                var newCatId = '' + ncGr.insert();
                data.saved_category = { ok: true, sys_id: newCatId, action: 'created' };
            }
        } catch (e) { data.saved_category = { ok: false, error: '' + e }; }
        return;
    }

    if (input.action === 'delete_catalog_category') {
        if (!hasAdmin) { data.deleted_category = { ok: false, error: 'Access denied.' }; return; }
        var dcId = '' + (input.sys_id || '');
        if (!dcId) { data.deleted_category = { ok: false, error: 'sys_id is required.' }; return; }
        try {
            var dcGr = new GlideRecord('x_infte_ops_int_catalog_category');
            if (dcGr.get(dcId)) {
                var diGr = new GlideRecord('x_infte_ops_int_catalog_item');
                diGr.addQuery('category', dcId);
                diGr.query();
                while (diGr.next()) { diGr.deleteRecord(); }
                dcGr.deleteRecord();
                data.deleted_category = { ok: true };
            } else {
                data.deleted_category = { ok: false, error: 'Category not found.' };
            }
        } catch (e) { data.deleted_category = { ok: false, error: '' + e }; }
        return;
    }

    if (input.action === 'save_catalog_item') {
        if (!hasAdmin) { data.saved_item = { ok: false, error: 'Access denied.' }; return; }
        var siName = '' + (input.name || '');
        var siCat  = '' + (input.category_sys_id || '');
        if (!siName || !siCat) { data.saved_item = { ok: false, error: 'Name and category are required.' }; return; }
        try {
            var siSysId = '' + (input.sys_id || '');
            var siGr = new GlideRecord('x_infte_ops_int_catalog_item');
            if (siSysId && siGr.get(siSysId)) {
                siGr.setValue('name', siName);
                siGr.setValue('description', '' + (input.description || ''));
                siGr.setValue('category', siCat);
                siGr.setValue('sort_order', parseInt('' + (input.sort_order || 0), 10));
                siGr.setValue('active', true);
                siGr.setValue('action_type', '' + (input.action_type || ''));
                siGr.setValue('action_value', '' + (input.action_value || ''));
                siGr.update();
                data.saved_item = { ok: true, sys_id: siSysId, action: 'updated' };
            } else {
                var niGr = new GlideRecord('x_infte_ops_int_catalog_item');
                niGr.initialize();
                niGr.setValue('name', siName);
                niGr.setValue('description', '' + (input.description || ''));
                niGr.setValue('category', siCat);
                niGr.setValue('sort_order', parseInt('' + (input.sort_order || 0), 10));
                niGr.setValue('active', true);
                niGr.setValue('action_type', '' + (input.action_type || ''));
                niGr.setValue('action_value', '' + (input.action_value || ''));
                niGr.setValue('created_by', userSysId);
                var newItemId = '' + niGr.insert();
                data.saved_item = { ok: true, sys_id: newItemId, action: 'created' };
            }
        } catch (e) { data.saved_item = { ok: false, error: '' + e }; }
        return;
    }

    if (input.action === 'delete_catalog_item') {
        if (!hasAdmin) { data.deleted_item = { ok: false, error: 'Access denied.' }; return; }
        var dciId = '' + (input.sys_id || '');
        if (!dciId) { data.deleted_item = { ok: false, error: 'sys_id is required.' }; return; }
        try {
            var dciGr = new GlideRecord('x_infte_ops_int_catalog_item');
            if (dciGr.get(dciId)) {
                dciGr.deleteRecord();
                data.deleted_item = { ok: true };
            } else {
                data.deleted_item = { ok: false, error: 'Item not found.' };
            }
        } catch (e) { data.deleted_item = { ok: false, error: '' + e }; }
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
