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
                    category_color:     '' + (autoRec.getValue('category_color') || '#0072CE'),
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

    function loadActivity(personSysId) {
        var executions = [];
        if (!personSysId) { return { executions: executions }; }
        var eGr = new GlideRecord('x_infte_ops_int_execution');
        eGr.addQuery('triggered_by', personSysId);
        eGr.orderByDesc('triggered_at');
        eGr.setLimit(50);
        eGr.query();
        while (eGr.next()) {
            executions.push({
                sys_id:          '' + eGr.getUniqueValue(),
                number:          '' + eGr.getValue('number'),
                automation_name: '' + eGr.getDisplayValue('automation'),
                group_name:      '' + eGr.getDisplayValue('group'),
                status:          '' + eGr.getValue('status'),
                channel:         '' + eGr.getValue('channel'),
                triggered_at:    '' + eGr.getDisplayValue('triggered_at'),
                completed_at:    '' + eGr.getDisplayValue('completed_at'),
                is_test:         eGr.getValue('is_test') === '1' || eGr.getValue('is_test') === 'true'
            });
        }
        return { executions: executions };
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

            groups.push({
                sys_id:       grpId,
                name:         '' + grpGr.getValue('name'),
                type:         '' + grpGr.getValue('type'),
                member_count: activeMemberCount
            });
        }

        return { pending_actions: pendingActions, groups: groups };
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
            'x_infte_ops_int.maintenance.activity',
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
        { id: 'workspace',  label: 'Workspace',  icon: 'fa-th-large', roles: ['admin','leadership','creator','user'] },
        { id: 'activity',   label: 'My Activity', icon: 'fa-history',  roles: ['admin','leadership','creator','user'] },
        { id: 'studio',     label: 'Studio',      icon: 'fa-code',     roles: ['admin','creator'] },
        { id: 'governance', label: 'Governance',  icon: 'fa-shield',   roles: ['admin','leadership'] },
        { id: 'command',    label: 'Command',     icon: 'fa-terminal', roles: ['admin'] }
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
        } else if (section === 'activity') {
            data.sectionData = loadActivity(data.personSysId);
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
                        gs.warn('OI Portal: RoleSyncService.syncPersonRoles error: ' + rsErr);
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
        var tPropRec = new GlideRecord('sys_properties');
        tPropRec.addQuery('name', tPropName);
        tPropRec.setLimit(1);
        tPropRec.query();
        if (tPropRec.next()) {
            var curVal = ('' + tPropRec.getValue('value')) === 'true' ? 'false' : 'true';
            tPropRec.setValue('value', curVal);
            tPropRec.update();
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
        pListGr.orderBy('user');
        pListGr.query();
        var persons = [];
        while (pListGr.next()) {
            var pSysId   = '' + pListGr.getUniqueValue();
            var pUserSId = '' + pListGr.getValue('user');
            var pName    = '' + pListGr.getDisplayValue('user');
            var pActive  = ('' + pListGr.getValue('active')) === 'true' || ('' + pListGr.getValue('active')) === '1';

            var uRec = new GlideRecord('sys_user');
            var uName = '';
            if (uRec.get(pUserSId)) { uName = '' + uRec.getValue('user_name'); }

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
                gs.warn('OI Portal enroll_person GroupManager.addMember: ' + gmErr);
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

})();
