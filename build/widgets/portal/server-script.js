(function() {

    // Direct role check — bypasses gs.hasRole() admin-override so platform admins
    // without an explicit OI role are treated as unauthorized.
    function oiRole(uSysId, roleName) {
        var hr = new GlideRecord('sys_user_has_role');
        hr.addQuery('user', uSysId);
        hr.addQuery('role.name', roleName);
        hr.setLimit(1);
        hr.query();
        return hr.next();
    }

    data.denied         = false;
    data.deniedLogin    = '';
    data.userName       = '';
    data.userEmail      = '';
    data.userInitials   = '';
    data.personSysId    = '';
    data.userRole       = '';
    data.sections       = [];
    data.initialSection = '';
    data.userGroups     = [];

    var userSysId = gs.getUserID();

    var hasAdmin      = oiRole(userSysId, 'x_infte_ops_int.admin');
    var hasLeadership = oiRole(userSysId, 'x_infte_ops_int.leadership');
    var hasCreator    = oiRole(userSysId, 'x_infte_ops_int.creator');
    var hasUser       = oiRole(userSysId, 'x_infte_ops_int.user');

    if (!hasAdmin && !hasLeadership && !hasCreator && !hasUser) {
        data.denied = true;
        var suDenied = new GlideRecord('sys_user');
        if (suDenied.get(userSysId)) {
            data.deniedLogin = '' + suDenied.getValue('user_name');
        }
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

    try {
        var pr = new PermissionResolver();
        data.personSysId = pr.getPersonByUser(userSysId) || '';
        var groups = pr.getUserGroups(userSysId);
        if (groups && groups.length) {
            var gi;
            for (gi = 0; gi < groups.length; gi++) {
                data.userGroups.push({
                    sys_id: '' + groups[gi].group_sys_id,
                    name:   '' + groups[gi].group_name,
                    role:   '' + groups[gi].group_role
                });
            }
        }
    } catch (prErr) {
        gs.warn('OI Portal: PermissionResolver error: ' + prErr);
    }

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
        { id: 'workspace',  label: 'Workspace',   icon: 'fa-th-large', roles: ['admin','leadership','creator','user'] },
        { id: 'activity',   label: 'My Activity',  icon: 'fa-history',  roles: ['admin','leadership','creator','user'] },
        { id: 'studio',     label: 'Studio',       icon: 'fa-code',     roles: ['admin','creator'] },
        { id: 'governance', label: 'Governance',   icon: 'fa-shield',   roles: ['admin','leadership'] },
        { id: 'command',    label: 'Command',      icon: 'fa-terminal', roles: ['admin'] }
    ];

    var i;
    for (i = 0; i < allSections.length; i++) {
        var sec = allSections[i];
        if (sec.roles.indexOf(data.userRole) !== -1) {
            data.sections.push({ id: sec.id, label: sec.label, icon: sec.icon });
        }
    }

    data.initialSection = data.sections.length > 0 ? data.sections[0].id : '';

    if (!input) { return; }

    // ── step_log ─────────────────────────────────────────────────────────────
    if (input.action === 'step_log') {
        var excSysId = '' + input.execution_sys_id;
        var exc = new GlideRecord('x_infte_ops_int_execution');
        if (exc.get(excSysId)) {
            var steps = [];
            try { steps = JSON.parse('' + exc.getValue('step_log')); } catch (e) { steps = []; }
            data.stepLog = steps;
        } else {
            data.stepLog = [];
        }
        return;
    }

    // ── toggle_maintenance ────────────────────────────────────────────────────
    if (input.action === 'toggle_maintenance') {
        if (!hasAdmin) { return; }
        var propName = '' + input.prop_name;
        var propRec = new GlideRecord('sys_properties');
        propRec.addQuery('name', propName);
        propRec.setLimit(1);
        propRec.query();
        if (propRec.next()) {
            propRec.setValue('value', ('' + propRec.getValue('value')) === 'true' ? 'false' : 'true');
            propRec.update();
        }
        return;
    }

    // ── trigger_automation ────────────────────────────────────────────────────
    if (input.action === 'trigger_automation') {
        var autoSysId  = '' + input.automation_sys_id;
        var grpSysId   = input.group_sys_id ? '' + input.group_sys_id : null;
        var personId   = '' + data.personSysId;

        // Verify the requesting user's group has this automation approved
        var permitted = false;
        if (hasAdmin) {
            permitted = true;
        } else if (grpSysId && personId) {
            var grpChk = new GlideRecord('x_infte_ops_int_group');
            if (grpChk.get(grpSysId)) {
                var chkAutomations = [];
                try { chkAutomations = JSON.parse('' + grpChk.getValue('automations')); } catch (e) {}
                var ci;
                for (ci = 0; ci < chkAutomations.length; ci++) {
                    if ('' + chkAutomations[ci].automation_sys_id === autoSysId &&
                        chkAutomations[ci].approval_status === 'approved') {
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
                data.triggered = execRec.get(execSysId) ?
                    { ok: true, sys_id: execSysId, number: '' + execRec.getValue('number'), status: '' + execRec.getValue('status') } :
                    { ok: true, sys_id: execSysId };
            } else {
                data.triggered = { ok: false, error: 'Execution could not be created.' };
            }
        } catch (trigErr) {
            data.triggered = { ok: false, error: '' + trigErr };
        }
        return;
    }

    // ── resolve_action ────────────────────────────────────────────────────────
    if (input.action === 'resolve_action') {
        if (!hasLeadership && !hasAdmin) { data.resolved = false; return; }
        var paId    = '' + input.action_sys_id;
        var verdict = '' + input.resolution;
        if (verdict !== 'approved' && verdict !== 'rejected') { data.resolved = false; return; }
        var paRec = new GlideRecord('x_infte_ops_int_pending_action');
        if (paRec.get(paId)) {
            paRec.setValue('status', verdict);
            paRec.update();
            if (verdict === 'approved') {
                try {
                    var subjectUser = '' + paRec.getValue('subject_user');
                    if (subjectUser) {
                        var subjectPerson = new PermissionResolver().getPersonByUser(subjectUser);
                        if (subjectPerson) { new RoleSyncService().syncPersonRoles(subjectPerson); }
                    }
                } catch (rsErr) {
                    gs.warn('OI Portal: role sync on action approval: ' + rsErr);
                }
            }
            data.resolved = true;
        } else {
            data.resolved = false;
        }
        return;
    }

    // ── search_users ─────────────────────────────────────────────────────────
    if (input.action === 'search_users') {
        if (!hasAdmin && !hasLeadership) { data.users = []; return; }
        var q = '' + (input.query || '');
        if (q.length < 2) { data.users = []; return; }
        var uGr = new GlideRecord('sys_user');
        uGr.addQuery('active', true);
        uGr.addQuery('name', 'CONTAINS', q);
        uGr.orderBy('name');
        uGr.setLimit(20);
        uGr.query();
        var users = [];
        while (uGr.next()) {
            var uSysId2 = '' + uGr.getUniqueValue();
            var pCheck  = new GlideRecord('x_infte_ops_int_person');
            pCheck.addQuery('user', uSysId2);
            pCheck.setLimit(1);
            pCheck.query();
            var enrolled = pCheck.next();
            users.push({
                sys_id:          uSysId2,
                name:            '' + uGr.getDisplayValue('name'),
                user_name:       '' + uGr.getValue('user_name'),
                email:           '' + uGr.getValue('email'),
                already_enrolled: enrolled,
                person_sys_id:   enrolled ? '' + pCheck.getUniqueValue() : ''
            });
        }
        data.users = users;
        return;
    }

    // ── list_persons ──────────────────────────────────────────────────────────
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

            // Collect group memberships
            var pGroups  = [];
            var pgGr     = new GlideRecord('x_infte_ops_int_group');
            pgGr.addQuery('status', 'active');
            pgGr.query();
            while (pgGr.next()) {
                var mems2 = [];
                try { mems2 = JSON.parse('' + pgGr.getValue('members')); } catch (e) {}
                var mi2;
                for (mi2 = 0; mi2 < mems2.length; mi2++) {
                    if ('' + mems2[mi2].person_sys_id === pSysId && mems2[mi2].status !== 'inactive') {
                        pGroups.push({ group_sys_id: '' + pgGr.getUniqueValue(), group_name: '' + pgGr.getValue('name'), group_role: '' + mems2[mi2].group_role });
                        break;
                    }
                }
            }
            persons.push({ sys_id: pSysId, name: pName, user_name: '' + pListGr.getValue('user.user_name'), active: pActive, groups: pGroups });
        }
        data.persons = persons;
        return;
    }

    // ── enroll_person ─────────────────────────────────────────────────────────
    if (input.action === 'enroll_person') {
        if (!hasAdmin) { data.enrolled = { ok: false, error: 'Admin access required.' }; return; }
        var enrollUserSysId  = '' + input.user_sys_id;
        var enrollGroupSysId = input.group_sys_id ? '' + input.group_sys_id : null;
        var enrollRole       = input.group_role   ? '' + input.group_role   : 'user';

        // Check if already enrolled
        var existPerson = new GlideRecord('x_infte_ops_int_person');
        existPerson.addQuery('user', enrollUserSysId);
        existPerson.setLimit(1);
        existPerson.query();
        var personSysId2;
        if (existPerson.next()) {
            personSysId2 = '' + existPerson.getUniqueValue();
        } else {
            var newPerson = new GlideRecord('x_infte_ops_int_person');
            newPerson.initialize();
            newPerson.setValue('user', enrollUserSysId);
            newPerson.setValue('active', true);
            personSysId2 = '' + newPerson.insert();
            if (!personSysId2) {
                data.enrolled = { ok: false, error: 'Failed to create person record.' };
                return;
            }
        }

        if (enrollGroupSysId) {
            try {
                new GroupManager().addMember(enrollGroupSysId, personSysId2, enrollRole, data.personSysId || null);
            } catch (gmErr) {
                gs.warn('OI Portal enroll_person: GroupManager.addMember: ' + gmErr);
            }
        }

        var enrolledUser = new GlideRecord('sys_user');
        data.enrolled = {
            ok:            true,
            person_sys_id: personSysId2,
            name:          enrolledUser.get(enrollUserSysId) ? '' + enrolledUser.getDisplayValue('name') : ''
        };
        return;
    }

    // ── unenroll_person ───────────────────────────────────────────────────────
    if (input.action === 'unenroll_person') {
        if (!hasAdmin) { data.unenrolled = { ok: false }; return; }
        var uePerson = '' + input.person_sys_id;
        // Remove from all groups first (triggers role revoke via GroupManager)
        var ueGroups = new GlideRecord('x_infte_ops_int_group');
        ueGroups.addQuery('status', 'active');
        ueGroups.query();
        while (ueGroups.next()) {
            var ueMembers = [];
            try { ueMembers = JSON.parse('' + ueGroups.getValue('members')); } catch (e) {}
            var uei;
            for (uei = 0; uei < ueMembers.length; uei++) {
                if ('' + ueMembers[uei].person_sys_id === uePerson && ueMembers[uei].status !== 'inactive') {
                    try { new GroupManager().removeMember('' + ueGroups.getUniqueValue(), uePerson); } catch (e) {}
                    break;
                }
            }
        }
        // Deactivate person record
        var uePersonRec = new GlideRecord('x_infte_ops_int_person');
        if (uePersonRec.get(uePerson)) {
            uePersonRec.setValue('active', false);
            uePersonRec.update();
        }
        data.unenrolled = { ok: true };
        return;
    }

    // ── create_group ──────────────────────────────────────────────────────────
    if (input.action === 'create_group') {
        if (!hasAdmin) { data.created_group = { ok: false, error: 'Admin access required.' }; return; }
        var cgName = '' + (input.name || '');
        var cgDesc = '' + (input.description || '');
        var cgType = '' + (input.type || 'custom_group');
        if (!cgName) { data.created_group = { ok: false, error: 'Name is required.' }; return; }
        try {
            var gm       = new GroupManager();
            var newGrpId = gm.createGroup(cgName, cgDesc, cgType, data.personSysId || null, null, data.personSysId || null);
            data.created_group = newGrpId ? { ok: true, sys_id: newGrpId, name: cgName } : { ok: false, error: 'Group already exists or could not be created.' };
        } catch (cgErr) {
            data.created_group = { ok: false, error: '' + cgErr };
        }
        return;
    }

    // ── list_group_members ────────────────────────────────────────────────────
    if (input.action === 'list_group_members') {
        if (!hasAdmin && !hasLeadership) { data.group_members = []; return; }
        try {
            data.group_members = new GroupManager().getMembers('' + input.group_sys_id);
        } catch (e) {
            data.group_members = [];
        }
        return;
    }

    // ── add_member ────────────────────────────────────────────────────────────
    if (input.action === 'add_member') {
        if (!hasAdmin && !hasLeadership) { data.member_added = false; return; }
        try {
            data.member_added = new GroupManager().addMember(
                '' + input.group_sys_id,
                '' + input.person_sys_id,
                '' + (input.group_role || 'user'),
                data.personSysId || null
            );
        } catch (e) {
            data.member_added = false;
        }
        return;
    }

    // ── remove_member ─────────────────────────────────────────────────────────
    if (input.action === 'remove_member') {
        if (!hasAdmin && !hasLeadership) { data.member_removed = false; return; }
        try {
            data.member_removed = new GroupManager().removeMember(
                '' + input.group_sys_id,
                '' + input.person_sys_id
            );
        } catch (e) {
            data.member_removed = false;
        }
        return;
    }

    // ── load_section ──────────────────────────────────────────────────────────
    if (input.action === 'load_section') {
        var section  = '' + input.section;
        var personId = '' + data.personSysId;

        if (section === 'workspace') {
            data.sectionData = loadWorkspace(data.userGroups, personId);
        } else if (section === 'activity') {
            data.sectionData = loadActivity(personId);
        } else if (section === 'studio') {
            if (hasCreator || hasAdmin) { data.sectionData = loadStudio(personId); }
        } else if (section === 'governance') {
            if (hasLeadership || hasAdmin) { data.sectionData = loadGovernance(personId, hasAdmin); }
        } else if (section === 'command') {
            if (hasAdmin) { data.sectionData = loadCommand(); }
        }
        return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    function loadWorkspace(userGroups, personId) {
        var groupIds = [];
        var j;
        for (j = 0; j < userGroups.length; j++) { groupIds.push(userGroups[j].sys_id); }
        if (groupIds.length === 0) { return { automations: [] }; }

        var automations = [];
        var seen        = {};
        var grp         = new GlideRecord('x_infte_ops_int_group');
        grp.addQuery('status', 'active');
        grp.query();

        while (grp.next()) {
            var ownerGroupSysId = '' + grp.getUniqueValue();
            if (groupIds.indexOf(ownerGroupSysId) === -1) { continue; }
            var ownerGroupName  = '' + grp.getValue('name');
            var grpAutomations  = [];
            try { grpAutomations = JSON.parse('' + grp.getValue('automations')); } catch (e) {}
            var wi;
            for (wi = 0; wi < grpAutomations.length; wi++) {
                if (grpAutomations[wi].approval_status !== 'approved') { continue; }
                var autoSysId2 = '' + grpAutomations[wi].automation_sys_id;
                if (seen[autoSysId2]) { continue; }
                seen[autoSysId2] = true;
                var autoRec = new GlideRecord('x_infte_ops_int_automation');
                if (!autoRec.get(autoSysId2) || autoRec.getValue('status') !== 'published') { continue; }
                automations.push({
                    sys_id:             autoSysId2,
                    number:             '' + autoRec.getValue('number'),
                    name:               '' + autoRec.getValue('name'),
                    short_description:  '' + autoRec.getValue('short_description'),
                    category_color:     '' + (autoRec.getValue('category_color') || '#0072CE'),
                    category_icon:      '' + (autoRec.getValue('category_icon')  || 'fa-bolt'),
                    usage_count:        parseInt('' + autoRec.getValue('usage_count'), 10) || 0,
                    schedule_active:    autoRec.getValue('schedule_active') == '1' || autoRec.getValue('schedule_active') === 'true',
                    owner_group:        ownerGroupName,
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
                sys_id:       '' + exc.getUniqueValue(),
                number:       '' + exc.getValue('number'),
                automation:   '' + exc.getDisplayValue('automation'),
                status:       '' + exc.getValue('status'),
                channel:      '' + exc.getValue('channel'),
                triggered_at: '' + exc.getDisplayValue('triggered_at'),
                completed_at: '' + exc.getDisplayValue('completed_at'),
                is_test:      exc.getValue('is_test') == '1' || exc.getValue('is_test') === 'true'
            });
        }
        return { executions: executions };
    }

    function loadStudio(personId) {
        var copilot    = { token_status: '', github_connected_at: '', github_last_validated: '', show_banner: false };
        var personRec  = new GlideRecord('x_infte_ops_int_person');
        if (personRec.get(personId)) {
            copilot.token_status          = '' + personRec.getValue('token_status');
            copilot.github_connected_at   = '' + personRec.getDisplayValue('github_connected_at');
            copilot.github_last_validated = '' + personRec.getDisplayValue('github_last_validated');
            copilot.show_banner           = (copilot.token_status !== 'active');
        }
        var drafts = [];
        var ucr    = new GlideRecord('x_infte_ops_int_use_case_request');
        ucr.addQuery('submitted_by', personId);
        ucr.addQuery('status', 'IN', 'draft,submitted,in_review');
        ucr.orderByDesc('sys_updated_on');
        ucr.setLimit(20);
        ucr.query();
        while (ucr.next()) {
            drafts.push({ sys_id: '' + ucr.getUniqueValue(), number: '' + ucr.getValue('number'),
                title: '' + ucr.getValue('title'), status: '' + ucr.getValue('status'),
                type: 'use_case', updated: '' + ucr.getDisplayValue('sys_updated_on') });
        }
        var art = new GlideRecord('x_infte_ops_int_managed_artifact');
        art.addQuery('created_by_person', personId);
        art.addQuery('status', 'draft');
        art.orderByDesc('updated_at');
        art.setLimit(20);
        art.query();
        while (art.next()) {
            drafts.push({ sys_id: '' + art.getUniqueValue(), number: '' + art.getValue('number'),
                title: '' + art.getValue('display_name'), status: '' + art.getValue('status'),
                type: '' + art.getValue('artifact_type'), updated: '' + art.getDisplayValue('updated_at') });
        }
        var cards = [
            { id: 'use_case', icon: 'fa-lightbulb-o', label: 'New Use Case',  action: 'new_use_case' },
            { id: 'artifact', icon: 'fa-cube',         label: 'New Artifact',  action: 'new_artifact' },
            { id: 'token',    icon: 'fa-github',        label: 'GitHub Token', action: 'manage_token' }
        ];
        return { copilot: copilot, cards: cards, drafts: drafts };
    }

    function loadGovernance(personId, isAdmin) {
        var pending = [];
        var pa = new GlideRecord('x_infte_ops_int_pending_action');
        pa.addQuery('status', 'pending');
        if (!isAdmin) { pa.addQuery('assigned_to', personId); }
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
        var grp    = new GlideRecord('x_infte_ops_int_group');
        grp.addQuery('status', 'active');
        grp.orderBy('name');
        grp.query();
        while (grp.next()) {
            var grpId    = '' + grp.getUniqueValue();
            var grpAutos = [];
            try { grpAutos = JSON.parse('' + grp.getValue('automations')); } catch (e) {}

            // For leadership: only show groups they are a member of
            if (!isAdmin) {
                var gMembers = [];
                try { gMembers = JSON.parse('' + grp.getValue('members')); } catch (e) {}
                var isMember = false;
                var gmi;
                for (gmi = 0; gmi < gMembers.length; gmi++) {
                    if ('' + gMembers[gmi].person_sys_id === personId && gMembers[gmi].status !== 'inactive') {
                        isMember = true;
                        break;
                    }
                }
                if (!isMember) { continue; }
            }

            groups.push({
                sys_id:           grpId,
                name:             '' + grp.getValue('name'),
                description:      '' + grp.getValue('description'),
                type:             '' + grp.getValue('type'),
                automation_count: grpAutos.length
            });
        }

        // All enrolled persons for member-add dropdowns
        var allPersons = [];
        var apGr = new GlideRecord('x_infte_ops_int_person');
        apGr.addQuery('active', true);
        apGr.orderBy('user');
        apGr.query();
        while (apGr.next()) {
            allPersons.push({ sys_id: '' + apGr.getUniqueValue(), name: '' + apGr.getDisplayValue('user') });
        }

        return { pending: pending, groups: groups, allPersons: allPersons };
    }

    function loadCommand() {
        var stats = {};
        var pAgg  = new GlideAggregate('x_infte_ops_int_person');
        pAgg.addQuery('active', true);
        pAgg.addAggregate('COUNT');
        pAgg.query();
        stats.person_count = pAgg.next() ? (parseInt('' + pAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var aAgg = new GlideAggregate('x_infte_ops_int_automation');
        aAgg.addQuery('status', 'published');
        aAgg.addAggregate('COUNT');
        aAgg.query();
        stats.automation_count = aAgg.next() ? (parseInt('' + aAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var today     = new GlideDateTime();
        var todayStart = today.getDate().toString() + ' 00:00:00';
        var eAgg = new GlideAggregate('x_infte_ops_int_execution');
        eAgg.addQuery('triggered_at', '>=', todayStart);
        eAgg.addAggregate('COUNT');
        eAgg.query();
        stats.executions_today = eAgg.next() ? (parseInt('' + eAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var gAgg = new GlideAggregate('x_infte_ops_int_group');
        gAgg.addQuery('status', 'active');
        gAgg.addAggregate('COUNT');
        gAgg.query();
        stats.group_count = gAgg.next() ? (parseInt('' + gAgg.getAggregate('COUNT'), 10) || 0) : 0;

        var maintenancePropNames = [
            'x_infte_ops_int.maintenance.portal',
            'x_infte_ops_int.maintenance.engine',
            'x_infte_ops_int.maintenance.studio',
            'x_infte_ops_int.maintenance.executions'
        ];
        var maintenance = [];
        var k;
        for (k = 0; k < maintenancePropNames.length; k++) {
            var pn  = maintenancePropNames[k];
            var prp = new GlideRecord('sys_properties');
            prp.addQuery('name', pn);
            prp.setLimit(1);
            prp.query();
            var enabled = prp.next() ? ('' + prp.getValue('value')) === 'true' : false;
            var rawLabel = pn.split('.').pop();
            maintenance.push({
                prop_name: pn,
                label:     rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) + ' Maintenance',
                enabled:   enabled
            });
        }

        // All groups for member management
        var groups = [];
        var cgGr = new GlideRecord('x_infte_ops_int_group');
        cgGr.addQuery('status', 'active');
        cgGr.orderBy('name');
        cgGr.query();
        while (cgGr.next()) {
            groups.push({ sys_id: '' + cgGr.getUniqueValue(), name: '' + cgGr.getValue('name'), type: '' + cgGr.getValue('type') });
        }

        return { stats: stats, maintenance: maintenance, groups: groups };
    }

})();
