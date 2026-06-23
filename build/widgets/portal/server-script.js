(function() {

    /*
     * Operations Intelligence — Portal Widget Server Script
     * Scope  : x_infte_ops_int
     * Engine : Rhino ES5 — no const/let, no arrow functions, no template literals
     * Data   : OIDataStore (sys_properties-backed), OIJournal for execution log
     * Roles  : x_infte_ops_int.admin | .developer | .leadership | .creator | .user
     */

    // ── ROLE DETECTION ────────────────────────────────────────────────────────

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
        rGr.addQuery('name', 'IN',
            'x_infte_ops_int.admin,x_infte_ops_int.developer,x_infte_ops_int.leadership,' +
            'x_infte_ops_int.creator,x_infte_ops_int.user');
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

    // ── PERSON / GROUP HELPERS ────────────────────────────────────────────────

    function getPersonByUser(uSysId) {
        var store = new OIDataStore();
        var found = store.find('persons', function(p) {
            return ('' + p.user_sys_id) === uSysId && p.active !== false;
        });
        if (found.length > 0) { return '' + found[0].sys_id; }
        return '';
    }

    function getUserGroupMemberships(personSysId) {
        var memberships = [];
        if (!personSysId) { return memberships; }
        var store     = new OIDataStore();
        var allGroups = store.find('groups', function(g) { return g.status === 'active'; });
        var i, grp, members, j;
        for (i = 0; i < allGroups.length; i++) {
            grp     = allGroups[i];
            members = grp.members || [];
            for (j = 0; j < members.length; j++) {
                if ('' + members[j].person_sys_id === personSysId &&
                        members[j].status !== 'inactive') {
                    memberships.push({
                        sys_id:     '' + grp.sys_id,
                        name:       '' + grp.name,
                        group_role: '' + (members[j].group_role || 'user')
                    });
                    break;
                }
            }
        }
        return memberships;
    }

    // ── SECTION LOADERS ───────────────────────────────────────────────────────

    function loadWorkspace(personSysId, userGroups) {
        var store      = new OIDataStore();
        var groupIds   = [];
        var i;
        for (i = 0; i < userGroups.length; i++) { groupIds.push(userGroups[i].sys_id); }

        var availableAutomations = [];
        var seen = {};
        var allGroups = store.find('groups', function(g) { return g.status === 'active'; });
        var gi, grp, grpAutos, ai, autoSysId, autoRec;
        for (gi = 0; gi < allGroups.length; gi++) {
            grp = allGroups[gi];
            if (groupIds.indexOf('' + grp.sys_id) === -1) { continue; }
            grpAutos = grp.automations || [];
            for (ai = 0; ai < grpAutos.length; ai++) {
                if ('' + grpAutos[ai].approval_status !== 'approved') { continue; }
                autoSysId = '' + grpAutos[ai].automation_sys_id;
                if (seen[autoSysId]) { continue; }
                seen[autoSysId] = true;
                autoRec = store.get('automations', autoSysId);
                if (autoRec && autoRec.status === 'published') {
                    availableAutomations.push({
                        sys_id:            '' + autoRec.sys_id,
                        name:              '' + autoRec.name,
                        short_description: '' + (autoRec.short_description || ''),
                        category_name:     '' + (autoRec.category_name || ''),
                        usage_count:       parseInt(autoRec.usage_count, 10) || 0
                    });
                }
            }
        }

        var catalog = loadCatalogCategories();
        var pendingCount = 0;
        if (personSysId) {
            var pending = store.find('pending_actions', function(pa) {
                return pa.status === 'pending' &&
                    (pa.assigned_to === personSysId || !pa.assigned_to);
            });
            pendingCount = pending.length;
        }

        return {
            automations:   availableAutomations,
            catalog:       catalog,
            pending_count: pendingCount,
            group_count:   userGroups.length
        };
    }

    function loadAutomationsWorkspace(personSysId, userGroups) {
        var store    = new OIDataStore();
        var groupIds = [];
        var i;
        for (i = 0; i < userGroups.length; i++) { groupIds.push(userGroups[i].sys_id); }

        var allAutomations = store.find('automations', function(a) {
            return a.status === 'published';
        });

        var accessible = {};
        var allGroups  = store.find('groups', function(g) { return g.status === 'active'; });
        var gi, grp, grpAutos, ai;
        for (gi = 0; gi < allGroups.length; gi++) {
            grp = allGroups[gi];
            if (groupIds.indexOf('' + grp.sys_id) === -1) { continue; }
            grpAutos = grp.automations || [];
            for (ai = 0; ai < grpAutos.length; ai++) {
                if ('' + grpAutos[ai].approval_status === 'approved') {
                    accessible['' + grpAutos[ai].automation_sys_id] = true;
                }
            }
        }

        var autoList = [];
        var j, a;
        for (j = 0; j < allAutomations.length; j++) {
            a = allAutomations[j];
            autoList.push({
                sys_id:            '' + a.sys_id,
                name:              '' + a.name,
                short_description: '' + (a.short_description || ''),
                category_sys_id:   '' + (a.category_sys_id || ''),
                category_name:     '' + (a.category_name || ''),
                usage_count:       parseInt(a.usage_count, 10) || 0,
                accessible:        accessible['' + a.sys_id] === true
            });
        }

        return {
            automations: autoList,
            catalog:     loadCatalogCategories(),
            group_count: userGroups.length
        };
    }

    function loadCreatorStudio(personSysId) {
        if (!personSysId) {
            return { projects: [], sessions: [] };
        }
        var store    = new OIDataStore();
        var projects = store.find('projects', function(p) {
            return ('' + p.created_by) === personSysId;
        });

        projects.sort(function(a, b) {
            var ta = a.updated_at || a.created_at || '';
            var tb = b.updated_at || b.created_at || '';
            if (ta > tb) { return -1; }
            if (ta < tb) { return 1; }
            return 0;
        });

        var allSessions = store.find('sessions', function(s) {
            return ('' + s.created_by) === personSysId;
        });

        var sessionMap = {};
        var si;
        for (si = 0; si < allSessions.length; si++) {
            var sess = allSessions[si];
            var pid  = '' + sess.project_sys_id;
            if (!sessionMap[pid]) { sessionMap[pid] = []; }
            sessionMap[pid].push({
                sys_id:        '' + sess.sys_id,
                name:          '' + sess.name,
                locked:        sess.locked === true,
                message_count: parseInt(sess.message_count, 10) || 0,
                updated_at:    '' + (sess.updated_at || sess.created_at || '')
            });
        }

        var projectList = [];
        var pi, proj;
        for (pi = 0; pi < projects.length; pi++) {
            proj = projects[pi];
            projectList.push({
                sys_id:              '' + proj.sys_id,
                name:                '' + proj.name,
                description:         '' + (proj.description || ''),
                stage:               '' + (proj.stage || 'draft'),
                created_at:          '' + (proj.created_at || ''),
                updated_at:          '' + (proj.updated_at || ''),
                locked:              proj.locked === true,
                session_count:       (sessionMap['' + proj.sys_id] || []).length,
                sessions:            sessionMap['' + proj.sys_id] || [],
                implementation_plan: proj.implementation_plan || null,
                review_note:         '' + (proj.review_note || '')
            });
        }

        return { projects: projectList };
    }

    function loadGovernanceControl(personSysId, isAdmin, isLeadership) {
        var store   = new OIDataStore();
        var actions = store.find('pending_actions', function(pa) {
            if (pa.status !== 'pending') { return false; }
            if (isAdmin) { return true; }
            return !pa.assigned_to || ('' + pa.assigned_to) === personSysId;
        });

        actions.sort(function(a, b) {
            var ta = a.created_at || '';
            var tb = b.created_at || '';
            if (ta < tb) { return -1; }
            if (ta > tb) { return 1; }
            return 0;
        });

        var pendingList = [];
        var i, pa;
        for (i = 0; i < actions.length; i++) {
            pa = actions[i];
            pendingList.push({
                sys_id:       '' + pa.sys_id,
                type:         '' + (pa.type || ''),
                description:  '' + (pa.description || ''),
                subject_type: '' + (pa.subject_type || ''),
                subject_name: '' + (pa.subject_name || ''),
                subject_sys_id: '' + (pa.subject_sys_id || ''),
                created_at:   '' + (pa.created_at || ''),
                created_by:   '' + (pa.created_by || '')
            });
        }

        var allGroups = store.find('groups', function(g) { return g.status === 'active'; });
        var groupList = [];
        var gi, grp, members, activeMemberCount, mci;
        for (gi = 0; gi < allGroups.length; gi++) {
            grp     = allGroups[gi];
            members = grp.members || [];

            if (!isAdmin && !isLeadership) {
                var isMember = false;
                var mi;
                for (mi = 0; mi < members.length; mi++) {
                    if ('' + members[mi].person_sys_id === personSysId &&
                            members[mi].status !== 'inactive') {
                        isMember = true;
                        break;
                    }
                }
                if (!isMember) { continue; }
            }

            activeMemberCount = 0;
            for (mci = 0; mci < members.length; mci++) {
                if (members[mci].status !== 'inactive') { activeMemberCount++; }
            }

            groupList.push({
                sys_id:       '' + grp.sys_id,
                name:         '' + grp.name,
                description:  '' + (grp.description || ''),
                type:         '' + (grp.type || 'custom_group'),
                is_system:    (grp.type || '') !== 'custom_group',
                member_count: activeMemberCount,
                status:       '' + (grp.status || 'active')
            });
        }

        return { pending_actions: pendingList, groups: groupList };
    }

    function loadLeadershipInsights(personSysId) {
        var store    = new OIDataStore();
        var projects = store.find('projects', function(p) {
            return p.stage === 'review';
        });

        projects.sort(function(a, b) {
            var ta = a.updated_at || a.created_at || '';
            var tb = b.updated_at || b.created_at || '';
            if (ta < tb) { return -1; }
            if (ta > tb) { return 1; }
            return 0;
        });

        var pipeline = store.find('projects', function(p) {
            return p.stage === 'approved' || p.stage === 'implementing';
        });

        var allPersons    = store.getCollection('persons');
        var personNameMap = {};
        var pi;
        for (pi = 0; pi < allPersons.length; pi++) {
            personNameMap['' + allPersons[pi].sys_id] = '' + (allPersons[pi].name || '');
        }

        var pendingList = [];
        var i, proj;
        for (i = 0; i < projects.length; i++) {
            proj = projects[i];
            pendingList.push({
                sys_id:       '' + proj.sys_id,
                name:         '' + proj.name,
                description:  '' + (proj.description || ''),
                stage:        '' + (proj.stage || 'review'),
                created_by:   '' + (proj.created_by || ''),
                creator_name: '' + (personNameMap['' + proj.created_by] || 'Unknown'),
                created_at:   '' + (proj.created_at || ''),
                updated_at:   '' + (proj.updated_at || ''),
                session_count: (proj.session_ids || []).length
            });
        }

        var pipelineList = [];
        var j, pj;
        for (j = 0; j < pipeline.length; j++) {
            pj = pipeline[j];
            pipelineList.push({
                sys_id:       '' + pj.sys_id,
                name:         '' + pj.name,
                stage:        '' + (pj.stage || ''),
                creator_name: '' + (personNameMap['' + pj.created_by] || 'Unknown'),
                updated_at:   '' + (pj.updated_at || '')
            });
        }

        var totalPersons    = allPersons.length;
        var totalAutomations = store.find('automations', function(a) { return a.status === 'published'; }).length;
        var totalGroups     = store.find('groups', function(g) { return g.status === 'active'; }).length;

        return {
            pending_review:  pendingList,
            pipeline:        pipelineList,
            analytics: {
                persons:    totalPersons,
                automations: totalAutomations,
                groups:     totalGroups,
                in_review:  pendingList.length,
                in_pipeline: pipelineList.length
            }
        };
    }

    function loadDeveloperHub() {
        var inventory = loadAppInventory();
        var journalSummary = {};
        try {
            var journal = new OIJournal();
            journalSummary = journal.summary();
        } catch (je) {
            journalSummary = { total: 0, error: '' + je };
        }
        return {
            inventory:      inventory,
            journal_summary: journalSummary
        };
    }

    function loadAdminHub() {
        var store = new OIDataStore();

        var totalPersons = store.find('persons', function(p) { return p.active !== false; }).length;
        var totalAutomations = store.find('automations', function(a) { return a.status === 'published'; }).length;
        var totalGroups = store.find('groups', function(g) { return g.status === 'active'; }).length;

        var journalToday = 0;
        try {
            var journal = new OIJournal();
            var today = new GlideDateTime();
            var todayStr = today.getDate().toString();
            var todayEntries = journal.read({ since: todayStr }, null);
            journalToday = todayEntries.length;
        } catch (je) { journalToday = 0; }

        var maintenanceSections = ['workspace', 'automations', 'creator-studio', 'governance-control',
            'leadership-insights', 'developer-hub', 'admin-hub'];
        var maintenance = {};
        var mk, propRec;
        for (mk = 0; mk < maintenanceSections.length; mk++) {
            propRec = new GlideRecord('sys_properties');
            propRec.addQuery('name', 'x_infte_ops_int.maintenance.' + maintenanceSections[mk]);
            propRec.setLimit(1);
            propRec.query();
            maintenance[maintenanceSections[mk]] = propRec.next() ?
                (('' + propRec.getValue('value')) === 'true') : false;
        }

        var allGroups = store.find('groups', function(g) { return g.status === 'active'; });
        var groupList = [];
        var gi, grp;
        for (gi = 0; gi < allGroups.length; gi++) {
            grp = allGroups[gi];
            groupList.push({
                sys_id: '' + grp.sys_id,
                name:   '' + grp.name,
                type:   '' + (grp.type || 'custom_group')
            });
        }

        return {
            stats: {
                persons:          totalPersons,
                automations:      totalAutomations,
                groups:           totalGroups,
                executions_today: journalToday
            },
            maintenance:      maintenance,
            groups:           groupList,
            catalog_categories: loadCatalogCategories()
        };
    }

    // ── UTILITY LOADERS ───────────────────────────────────────────────────────

    function loadCatalogCategories() {
        var store = new OIDataStore();
        var cats  = store.find('catalog', function(c) { return c.active !== false; });
        cats.sort(function(a, b) {
            var oa = parseInt(a.sort_order, 10) || 0;
            var ob = parseInt(b.sort_order, 10) || 0;
            if (oa !== ob) { return oa - ob; }
            var na = (a.name || '').toLowerCase();
            var nb = (b.name || '').toLowerCase();
            if (na < nb) { return -1; }
            if (na > nb) { return 1; }
            return 0;
        });
        var result = [];
        var i, cat, items, activeItems, ji, item;
        for (i = 0; i < cats.length; i++) {
            cat   = cats[i];
            items = cat.items || [];
            activeItems = [];
            for (ji = 0; ji < items.length; ji++) {
                item = items[ji];
                if (item.active !== false) {
                    activeItems.push({
                        sys_id:       '' + item.sys_id,
                        name:         '' + item.name,
                        description:  '' + (item.description || ''),
                        sort_order:   parseInt(item.sort_order, 10) || 0,
                        action_type:  '' + (item.action_type || ''),
                        action_value: '' + (item.action_value || '')
                    });
                }
            }
            activeItems.sort(function(a, b) {
                if (a.sort_order !== b.sort_order) { return a.sort_order - b.sort_order; }
                if (a.name < b.name) { return -1; }
                if (a.name > b.name) { return 1; }
                return 0;
            });
            result.push({
                sys_id:      '' + cat.sys_id,
                name:        '' + cat.name,
                description: '' + (cat.description || ''),
                icon:        '' + (cat.icon || 'fa-folder'),
                color:       '' + (cat.color || '#00BF6F'),
                sort_order:  parseInt(cat.sort_order, 10) || 0,
                items:       activeItems
            });
        }
        return result;
    }

    function loadAppInventory() {
        var scope     = 'x_infte_ops_int';
        var scopeId   = '';
        var scopeGr   = new GlideRecord('sys_scope');
        scopeGr.addQuery('scope', scope);
        scopeGr.setLimit(1);
        scopeGr.query();
        if (scopeGr.next()) { scopeId = '' + scopeGr.getUniqueValue(); }

        function queryArtifacts(table, nameField, extra) {
            var list = [];
            var gr   = new GlideRecord(table);
            if (scopeId) { gr.addQuery('sys_scope', scopeId); }
            else         { gr.addQuery('sys_scope.scope', scope); }
            gr.orderBy(nameField || 'name');
            gr.setLimit(200);
            gr.query();
            while (gr.next()) {
                var entry = {
                    sys_id: '' + gr.getUniqueValue(),
                    name:   '' + gr.getValue(nameField || 'name')
                };
                if (extra) { extra(gr, entry); }
                list.push(entry);
            }
            return list;
        }

        var tables = queryArtifacts('sys_db_object', 'name', function(gr, e) {
            e.label = '' + gr.getValue('label');
        });
        var scriptIncludes = queryArtifacts('sys_script_include', 'name', function(gr, e) {
            e.active = gr.getValue('active') === '1';
        });
        var businessRules = queryArtifacts('sys_script', 'name', function(gr, e) {
            e.table = '' + gr.getValue('collection');
            e.active = gr.getValue('active') === '1';
        });
        var vaTopics = queryArtifacts('sys_cs_topic', 'name');
        var roles    = queryArtifacts('sys_user_role', 'name');
        var notifications = queryArtifacts('sysevent_email_action', 'name', function(gr, e) {
            e.active = gr.getValue('active') === '1';
        });
        var scheduledJobs = queryArtifacts('sysauto_script', 'name', function(gr, e) {
            e.active = gr.getValue('active') === '1';
        });

        var uiPages = queryArtifacts('sys_ui_page', 'name');

        var properties = [];
        var propScopeGr = new GlideRecord('sys_properties');
        propScopeGr.addQuery('name', 'STARTSWITH', 'x_infte_ops_int.');
        propScopeGr.orderBy('name');
        propScopeGr.setLimit(200);
        propScopeGr.query();
        while (propScopeGr.next()) {
            properties.push({
                sys_id: '' + propScopeGr.getUniqueValue(),
                name:   '' + propScopeGr.getValue('name'),
                value:  '' + propScopeGr.getValue('value')
            });
        }

        return {
            tables:           tables,
            script_includes:  scriptIncludes,
            business_rules:   businessRules,
            va_topics:        vaTopics,
            roles:            roles,
            notifications:    notifications,
            scheduled_jobs:   scheduledJobs,
            ui_pages:         uiPages,
            properties:       properties
        };
    }

    function loadUserRequests(uSysId, limitNum) {
        var items = [];
        var max   = limitNum || 10;
        var gr    = new GlideRecord('sc_request');
        gr.addQuery('requested_for', uSysId);
        gr.addQuery('active', true);
        gr.orderByDesc('sys_created_on');
        gr.setLimit(max);
        gr.query();
        while (gr.next()) {
            items.push({
                sys_id:      '' + gr.getUniqueValue(),
                number:      '' + gr.getValue('number'),
                short_desc:  '' + gr.getDisplayValue('short_description'),
                state:       '' + gr.getDisplayValue('state'),
                created:     '' + gr.getDisplayValue('sys_created_on')
            });
        }
        return items;
    }

    function loadUserIncidents(uSysId, limitNum) {
        var items = [];
        var max   = limitNum || 10;
        var gr    = new GlideRecord('incident');
        gr.addQuery('caller_id', uSysId);
        gr.addQuery('active', true);
        gr.orderByDesc('sys_created_on');
        gr.setLimit(max);
        gr.query();
        while (gr.next()) {
            items.push({
                sys_id:    '' + gr.getUniqueValue(),
                number:    '' + gr.getValue('number'),
                short_desc: '' + gr.getValue('short_description'),
                state:     '' + gr.getDisplayValue('state'),
                priority:  '' + gr.getDisplayValue('priority'),
                created:   '' + gr.getDisplayValue('sys_created_on')
            });
        }
        return items;
    }

    function loadUserApprovals(personSysId, limitNum) {
        if (!personSysId) { return []; }
        var store  = new OIDataStore();
        var max    = limitNum || 10;
        var found  = store.find('pending_actions', function(pa) {
            return pa.status === 'pending' &&
                ('' + pa.assigned_to) === personSysId &&
                (pa.type === 'automation_approval' || pa.type === 'artifact_approval');
        });
        found.sort(function(a, b) {
            var ta = a.created_at || '';
            var tb = b.created_at || '';
            if (ta < tb) { return -1; }
            if (ta > tb) { return 1; }
            return 0;
        });
        if (found.length > max) { found = found.slice(0, max); }
        var items = [];
        var i, pa;
        for (i = 0; i < found.length; i++) {
            pa = found[i];
            items.push({
                sys_id:       '' + pa.sys_id,
                type:         '' + (pa.type || ''),
                description:  '' + (pa.description || ''),
                subject_name: '' + (pa.subject_name || ''),
                created_at:   '' + (pa.created_at || '')
            });
        }
        return items;
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
    var hasDeveloper  = oiRoles.developer;
    var hasLeadership = oiRoles.leadership;
    var hasCreator    = oiRoles.creator;
    var hasUser       = oiRoles.user;

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
            initials = nameParts[0].charAt(0).toUpperCase() +
                nameParts[nameParts.length - 1].charAt(0).toUpperCase();
        } else if (nameParts.length === 1 && nameParts[0].length > 0) {
            initials = nameParts[0].charAt(0).toUpperCase();
        }
        data.userName     = fullName;
        data.userEmail    = '' + su.getValue('email');
        data.userInitials = initials;
    }

    data.personSysId = getPersonByUser(userSysId);
    data.userGroups  = getUserGroupMemberships(data.personSysId);

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
        { id: 'workspace',          label: 'Operations Workspace',   icon: 'fa-th-large',
          roles: ['admin','developer','leadership','creator','user'] },
        { id: 'automations',        label: 'Automations Workspace',  icon: 'fa-cube',
          roles: ['admin','developer','leadership','creator','user'] },
        { id: 'creator-studio',     label: 'Creator Studio',         icon: 'fa-code',
          roles: ['admin','developer','creator'] },
        { id: 'governance-control', label: 'Governance Control',     icon: 'fa-shield',
          roles: ['admin','developer','leadership'] },
        { id: 'leadership-insights', label: 'Leadership Insights',   icon: 'fa-line-chart',
          roles: ['admin','leadership'] },
        { id: 'developer-hub',      label: 'Developer Hub',          icon: 'fa-terminal',
          roles: ['admin','developer'] },
        { id: 'admin-hub',          label: 'Administrator Hub',      icon: 'fa-cog',
          roles: ['admin'] }
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
        var sectionId = '' + (input.section || '');

        if (sectionId === 'workspace') {
            data.workspace = loadWorkspace(data.personSysId, data.userGroups);

        } else if (sectionId === 'automations') {
            data.automations_workspace = loadAutomationsWorkspace(data.personSysId, data.userGroups);

        } else if (sectionId === 'creator-studio') {
            if (!hasAdmin && !hasDeveloper && !hasCreator) { return; }
            data.creator_studio = loadCreatorStudio(data.personSysId);

        } else if (sectionId === 'governance-control') {
            if (!hasAdmin && !hasDeveloper && !hasLeadership) { return; }
            data.governance = loadGovernanceControl(
                data.personSysId, hasAdmin, hasLeadership);

        } else if (sectionId === 'leadership-insights') {
            if (!hasAdmin && !hasLeadership) { return; }
            data.leadership = loadLeadershipInsights(data.personSysId);

        } else if (sectionId === 'developer-hub') {
            if (!hasAdmin && !hasDeveloper) { return; }
            data.developer_hub = loadDeveloperHub();

        } else if (sectionId === 'admin-hub') {
            if (!hasAdmin) { return; }
            data.admin_hub = loadAdminHub();
        }
        return;
    }

    // ── ASSISTANT QUERY ───────────────────────────────────────────────────────

    if (input.action === 'assistant_query') {
        var rawQ = '' + (input.query || '');
        if (!rawQ.trim()) {
            data.reply = 'Please type a message to get started.';
            data.type  = 'text';
            return;
        }
        var sessCtx = input.session_ctx || {};
        var engine  = new ReasoningEngine();
        var result  = engine.reason(rawQ, data.personSysId, sessCtx);

        data.reply      = result.text     || '';
        data.type       = result.type     || 'text';
        data.items      = result.items    || [];
        data.actions    = result.actions  || [];
        data.followUp   = result.followUp || null;
        data.dataObj    = result.data     || null;
        data.sessionCtx = result.sessionCtx || {};

        if (result.enhancedPhrases) { data.enhancedPhrases = result.enhancedPhrases; }
        if (result.gapAnalysis)     { data.gapAnalysis     = result.gapAnalysis; }
        if (result.optimisations)   { data.optimisations   = result.optimisations; }
        return;

    }

    // ── LOAD USER REQUESTS ────────────────────────────────────────────────────

    if (input.action === 'load_user_requests') {
        data.requests = loadUserRequests(userSysId, 10);
        return;
    }

    // ── TRIGGER AUTOMATION ────────────────────────────────────────────────────

    if (input.action === 'trigger_automation') {
        var taAutoId   = '' + (input.automation_sys_id || '');
        var taStore    = new OIDataStore();
        var taAutoRec  = taStore.get('automations', taAutoId);
        if (!taAutoRec || taAutoRec.status !== 'published') {
            data.triggered = { ok: false, error: 'Automation not found or not published.' };
            return;
        }
        var taGroupIds = [];
        var tai;
        for (tai = 0; tai < data.userGroups.length; tai++) {
            taGroupIds.push(data.userGroups[tai].sys_id);
        }
        var taAccessible = false;
        if (hasAdmin) {
            taAccessible = true;
        } else {
            var taGroups = taStore.find('groups', function(g) {
                return g.status === 'active' && taGroupIds.indexOf('' + g.sys_id) !== -1;
            });
            var tgi, tgrp, tgAutos, tai2;
            for (tgi = 0; tgi < taGroups.length; tgi++) {
                tgrp   = taGroups[tgi];
                tgAutos = tgrp.automations || [];
                for (tai2 = 0; tai2 < tgAutos.length; tai2++) {
                    if ('' + tgAutos[tai2].automation_sys_id === taAutoId &&
                            '' + tgAutos[tai2].approval_status === 'approved') {
                        taAccessible = true;
                        break;
                    }
                }
                if (taAccessible) { break; }
            }
        }
        if (!taAccessible) {
            data.triggered = { ok: false, error: 'Access denied for this automation.' };
            return;
        }
        taAutoRec.usage_count = (parseInt(taAutoRec.usage_count, 10) || 0) + 1;
        taStore.upsert('automations', taAutoRec);
        try {
            new OIJournal().write('automation_triggered',
                { sys_id: userSysId, name: data.userName, role: data.userRole },
                { type: 'automation', sys_id: taAutoId, name: taAutoRec.name },
                { status: 'success' },
                { section: 'workspace', assistant_type: 'operations', query: '' });
        } catch (je) {}
        data.triggered = { ok: true, name: '' + taAutoRec.name };
        return;
    }

    // ── RESOLVE ACTION ────────────────────────────────────────────────────────

    if (input.action === 'resolve_action') {
        if (!hasAdmin && !hasLeadership) {
            data.resolved = { ok: false, error: 'Access denied.' };
            return;
        }
        var raId    = '' + (input.action_sys_id || '');
        var raStore = new OIDataStore();
        var raRec   = raStore.get('pending_actions', raId);
        if (!raRec) { data.resolved = { ok: false, error: 'Action not found.' }; return; }
        raRec.status     = 'resolved';
        raRec.resolution = '' + (input.resolution || 'resolved');
        raRec.updated_at = new GlideDateTime().getValue();
        raStore.upsert('pending_actions', raRec);
        data.resolved = { ok: true };
        return;
    }

    // ── MAINTENANCE TOGGLE ────────────────────────────────────────────────────

    if (input.action === 'toggle_maintenance') {
        if (!hasAdmin) { data.maintenance_toggled = false; return; }
        var tmSection  = '' + (input.section || '');
        var tmEnabled  = input.enabled === true || input.enabled === 'true';
        var tmPropName = 'x_infte_ops_int.maintenance.' + tmSection;
        var tmGr = new GlideRecord('sys_properties');
        tmGr.addQuery('name', tmPropName);
        tmGr.setLimit(1);
        tmGr.query();
        if (tmGr.next()) {
            tmGr.setValue('value', tmEnabled ? 'true' : 'false');
            tmGr.update();
        } else {
            tmGr.initialize();
            tmGr.setValue('name',        tmPropName);
            tmGr.setValue('value',       tmEnabled ? 'true' : 'false');
            tmGr.setValue('description', 'Operations Intelligence maintenance mode: ' + tmSection);
            tmGr.insert();
        }
        data.maintenance_toggled = true;
        return;
    }

    // ── CATALOG CATEGORY MANAGEMENT ───────────────────────────────────────────

    if (input.action === 'save_catalog_category') {
        if (!hasAdmin) { data.saved_category = { ok: false, error: 'Administrator access required.' }; return; }
        var scStore    = new OIDataStore();
        var scSysId    = '' + (input.sys_id || '');
        var scName     = '' + (input.name || '');
        var scDesc     = '' + (input.description || '');
        var scIcon     = '' + (input.icon     || 'fa-folder');
        var scColor    = '' + (input.color    || '#00BF6F');
        var scOrder    = parseInt(input.sort_order, 10) || 0;
        if (!scName) { data.saved_category = { ok: false, error: 'Name is required.' }; return; }

        var scRec;
        if (scSysId) {
            scRec = scStore.get('catalog', scSysId);
            if (!scRec) { data.saved_category = { ok: false, error: 'Category not found.' }; return; }
            scRec.name        = scName;
            scRec.description = scDesc;
            scRec.icon        = scIcon;
            scRec.color       = scColor;
            scRec.sort_order  = scOrder;
            scRec.updated_at  = new GlideDateTime().getValue();
        } else {
            scRec = {
                name:        scName,
                description: scDesc,
                icon:        scIcon,
                color:       scColor,
                sort_order:  scOrder,
                active:      true,
                items:       [],
                created_at:  new GlideDateTime().getValue()
            };
        }
        var scId = scStore.upsert('catalog', scRec);
        data.saved_category = { ok: true, sys_id: scId, name: scName };
        return;
    }

    if (input.action === 'delete_catalog_category') {
        if (!hasAdmin) { data.deleted_category = { ok: false, error: 'Administrator access required.' }; return; }
        var dcStore = new OIDataStore();
        var dcId    = '' + (input.sys_id || '');
        if (!dcStore.get('catalog', dcId)) {
            data.deleted_category = { ok: false, error: 'Category not found.' };
            return;
        }
        dcStore.remove('catalog', dcId);
        data.deleted_category = { ok: true };
        return;
    }

    // ── CATALOG ITEM MANAGEMENT ───────────────────────────────────────────────

    if (input.action === 'save_catalog_item') {
        if (!hasAdmin) { data.saved_item = { ok: false, error: 'Administrator access required.' }; return; }
        var siStore   = new OIDataStore();
        var siCatId   = '' + (input.category_sys_id || '');
        var siItemId  = '' + (input.sys_id || '');
        var siName    = '' + (input.name || '');
        var siDesc    = '' + (input.description || '');
        var siOrder   = parseInt(input.sort_order, 10) || 0;
        var siActType = '' + (input.action_type  || '');
        var siActVal  = '' + (input.action_value || '');
        if (!siCatId || !siName) {
            data.saved_item = { ok: false, error: 'Category and Name are required.' };
            return;
        }
        var siCatRec = siStore.get('catalog', siCatId);
        if (!siCatRec) { data.saved_item = { ok: false, error: 'Category not found.' }; return; }

        var siItems = siCatRec.items || [];
        var siFound = false;
        var sii;
        for (sii = 0; sii < siItems.length; sii++) {
            if ('' + siItems[sii].sys_id === siItemId) {
                siItems[sii].name         = siName;
                siItems[sii].description  = siDesc;
                siItems[sii].sort_order   = siOrder;
                siItems[sii].action_type  = siActType;
                siItems[sii].action_value = siActVal;
                siItems[sii].updated_at   = new GlideDateTime().getValue();
                siFound = true;
                siItemId = '' + siItems[sii].sys_id;
                break;
            }
        }
        if (!siFound) {
            var newItem = {
                sys_id:       siStore.generateId(),
                name:         siName,
                description:  siDesc,
                sort_order:   siOrder,
                active:       true,
                action_type:  siActType,
                action_value: siActVal,
                created_at:   new GlideDateTime().getValue()
            };
            siItems.push(newItem);
            siItemId = newItem.sys_id;
        }
        siCatRec.items      = siItems;
        siCatRec.updated_at = new GlideDateTime().getValue();
        siStore.upsert('catalog', siCatRec);
        data.saved_item = { ok: true, sys_id: siItemId, name: siName };
        return;
    }

    if (input.action === 'delete_catalog_item') {
        if (!hasAdmin) { data.deleted_item = { ok: false, error: 'Administrator access required.' }; return; }
        var diStore  = new OIDataStore();
        var diCatId  = '' + (input.category_sys_id || '');
        var diItemId = '' + (input.item_sys_id || '');
        var diCat    = diStore.get('catalog', diCatId);
        if (!diCat) { data.deleted_item = { ok: false, error: 'Category not found.' }; return; }
        var diItems  = diCat.items || [];
        var diFilt   = [];
        var dii;
        for (dii = 0; dii < diItems.length; dii++) {
            if ('' + diItems[dii].sys_id !== diItemId) { diFilt.push(diItems[dii]); }
        }
        diCat.items      = diFilt;
        diCat.updated_at = new GlideDateTime().getValue();
        diStore.upsert('catalog', diCat);
        data.deleted_item = { ok: true };
        return;
    }

    // ── USER SEARCH ───────────────────────────────────────────────────────────

    if (input.action === 'search_users') {
        if (!hasAdmin && !hasLeadership) { data.users = []; return; }
        var suQuery = '' + (input.query || '');
        if (suQuery.length < 2) { data.users = []; return; }
        var suGr = new GlideRecord('sys_user');
        suGr.addQuery('active', true);
        var suOr = suGr.addQuery('name', 'CONTAINS', suQuery);
        suOr.addOrCondition('user_name', 'CONTAINS', suQuery);
        suOr.addOrCondition('email', 'CONTAINS', suQuery);
        suGr.setLimit(20);
        suGr.query();
        var suResults = [];
        while (suGr.next()) {
            suResults.push({
                sys_id:    '' + suGr.getUniqueValue(),
                name:      '' + suGr.getDisplayValue('name'),
                user_name: '' + suGr.getValue('user_name'),
                email:     '' + suGr.getValue('email')
            });
        }
        data.users = suResults;
        return;
    }

    // ── PERSON MANAGEMENT ─────────────────────────────────────────────────────

    if (input.action === 'list_persons') {
        if (!hasAdmin && !hasLeadership) { data.persons = []; return; }
        var lpStore   = new OIDataStore();
        var lpPersons = lpStore.find('persons', function(p) { return p.active !== false; });
        var lpList    = [];
        var lpi;
        for (lpi = 0; lpi < lpPersons.length; lpi++) {
            var lpp = lpPersons[lpi];
            lpList.push({
                sys_id:    '' + lpp.sys_id,
                name:      '' + (lpp.name || ''),
                email:     '' + (lpp.email || ''),
                active:    lpp.active !== false,
                spec_assist_enabled: lpp.spec_assist_enabled === true,
                enrolled_at: '' + (lpp.enrolled_at || '')
            });
        }
        data.persons = lpList;
        return;
    }

    if (input.action === 'enroll_person') {
        if (!hasAdmin && !hasLeadership) {
            data.enrolled = { ok: false, error: 'Access denied.' };
            return;
        }
        var epUserSysId = '' + (input.user_sys_id || '');
        if (!epUserSysId) { data.enrolled = { ok: false, error: 'User sys_id required.' }; return; }
        var epStore   = new OIDataStore();
        var epExisting = epStore.find('persons', function(p) {
            return '' + p.user_sys_id === epUserSysId;
        });
        if (epExisting.length > 0) {
            data.enrolled = { ok: true, sys_id: epExisting[0].sys_id, existing: true };
            return;
        }
        var epUserGr = new GlideRecord('sys_user');
        if (!epUserGr.get(epUserSysId)) {
            data.enrolled = { ok: false, error: 'User not found.' };
            return;
        }
        var epPerson = {
            user_sys_id:     epUserSysId,
            name:            '' + epUserGr.getDisplayValue('name'),
            email:           '' + epUserGr.getValue('email'),
            active:          true,
            spec_assist_enabled: false,
            enrolled_at:     new GlideDateTime().getValue()
        };
        var epId = epStore.upsert('persons', epPerson);
        data.enrolled = { ok: true, sys_id: epId };
        return;
    }

    if (input.action === 'unenroll_person') {
        if (!hasAdmin) { data.unenrolled = { ok: false, error: 'Administrator access required.' }; return; }
        var upStore    = new OIDataStore();
        var upPersonId = '' + (input.person_sys_id || '');
        var upRec      = upStore.get('persons', upPersonId);
        if (!upRec) { data.unenrolled = { ok: false, error: 'Person not found.' }; return; }
        upRec.active     = false;
        upRec.updated_at = new GlideDateTime().getValue();
        upStore.upsert('persons', upRec);
        data.unenrolled = { ok: true };
        return;
    }

    // ── GROUP MANAGEMENT ──────────────────────────────────────────────────────

    if (input.action === 'create_group') {
        if (!hasAdmin && !hasLeadership) {
            data.created_group = { ok: false, error: 'Administrator or Leadership access required.' };
            return;
        }
        var cgStore = new OIDataStore();
        var cgName  = '' + (input.name || '');
        var cgDesc  = '' + (input.description || '');
        var cgType  = '' + (input.type || 'custom_group');
        if (!cgName) { data.created_group = { ok: false, error: 'Name is required.' }; return; }

        var cgExisting = cgStore.find('groups', function(g) {
            return '' + g.name === cgName && g.status !== 'archived';
        });
        if (cgExisting.length > 0) {
            data.created_group = { ok: true, sys_id: cgExisting[0].sys_id, existing: true };
            return;
        }
        var cgGroup = {
            name:              cgName,
            description:       cgDesc,
            type:              cgType,
            owner:             data.personSysId || null,
            status:            'active',
            members:           [],
            automations:       [],
            created_at:        new GlideDateTime().getValue(),
            created_by_person: data.personSysId || null
        };
        var cgId = cgStore.upsert('groups', cgGroup);
        data.created_group = { ok: true, sys_id: cgId, name: cgName };
        return;
    }

    if (input.action === 'delete_group') {
        if (!hasAdmin) { data.deleted_group = { ok: false, error: 'Administrator access required.' }; return; }
        var dgStore = new OIDataStore();
        var dgId    = '' + (input.group_sys_id || '');
        var dgRec   = dgStore.get('groups', dgId);
        if (!dgRec) { data.deleted_group = { ok: false, error: 'Group not found.' }; return; }
        if ((dgRec.type || '') !== 'custom_group') {
            data.deleted_group = { ok: false,
                error: 'System-managed groups cannot be deleted.' };
            return;
        }
        dgRec.status     = 'archived';
        dgRec.updated_at = new GlideDateTime().getValue();
        dgStore.upsert('groups', dgRec);
        data.deleted_group = { ok: true, name: '' + dgRec.name };
        return;
    }

    if (input.action === 'list_group_members') {
        if (!hasAdmin && !hasLeadership) { data.group_members = []; return; }
        var lgmStore = new OIDataStore();
        var lgmGrp   = lgmStore.get('groups', '' + (input.group_sys_id || ''));
        if (!lgmGrp) { data.group_members = []; return; }
        var lgmMembers  = lgmGrp.members || [];
        var lgmAllPersons = lgmStore.getCollection('persons');
        var lgmPersonMap  = {};
        var lgmpi;
        for (lgmpi = 0; lgmpi < lgmAllPersons.length; lgmpi++) {
            lgmPersonMap['' + lgmAllPersons[lgmpi].sys_id] = lgmAllPersons[lgmpi];
        }
        var lgmList = [];
        var lgmi, lgmM, lgmP;
        for (lgmi = 0; lgmi < lgmMembers.length; lgmi++) {
            lgmM = lgmMembers[lgmi];
            if (lgmM.status === 'inactive') { continue; }
            lgmP = lgmPersonMap['' + lgmM.person_sys_id] || {};
            lgmList.push({
                person_sys_id: '' + lgmM.person_sys_id,
                name:          '' + (lgmP.name  || ''),
                email:         '' + (lgmP.email || ''),
                group_role:    '' + (lgmM.group_role || 'user'),
                added_at:      '' + (lgmM.added_at || '')
            });
        }
        data.group_members = lgmList;
        return;
    }

    if (input.action === 'add_member') {
        if (!hasAdmin && !hasLeadership) { data.member_added = false; return; }
        var amStore   = new OIDataStore();
        var amGroupId = '' + (input.group_sys_id  || '');
        var amPersonId = '' + (input.person_sys_id || '');
        var amRole    = '' + (input.group_role || 'user');
        var amGrp     = amStore.get('groups', amGroupId);
        if (!amGrp || !amPersonId) { data.member_added = false; return; }
        var amMembers = amGrp.members || [];
        var amFound   = false;
        var ami;
        for (ami = 0; ami < amMembers.length; ami++) {
            if ('' + amMembers[ami].person_sys_id === amPersonId) {
                amMembers[ami].group_role = amRole;
                amMembers[ami].status     = 'active';
                amFound = true;
                break;
            }
        }
        if (!amFound) {
            amMembers.push({
                person_sys_id: amPersonId,
                group_role:    amRole,
                status:        'active',
                added_by:      data.personSysId || '',
                added_at:      new GlideDateTime().getValue()
            });
        }
        amGrp.members    = amMembers;
        amGrp.updated_at = new GlideDateTime().getValue();
        amStore.upsert('groups', amGrp);
        data.member_added = true;
        return;
    }

    if (input.action === 'remove_member') {
        if (!hasAdmin && !hasLeadership) { data.member_removed = false; return; }
        var rmStore    = new OIDataStore();
        var rmGroupId  = '' + (input.group_sys_id  || '');
        var rmPersonId = '' + (input.person_sys_id || '');
        var rmGrp      = rmStore.get('groups', rmGroupId);
        if (!rmGrp) { data.member_removed = false; return; }
        var rmMembers = rmGrp.members || [];
        var rmi;
        for (rmi = 0; rmi < rmMembers.length; rmi++) {
            if ('' + rmMembers[rmi].person_sys_id === rmPersonId) {
                rmMembers[rmi].status = 'inactive';
            }
        }
        rmGrp.members    = rmMembers;
        rmGrp.updated_at = new GlideDateTime().getValue();
        rmStore.upsert('groups', rmGrp);
        data.member_removed = true;
        return;
    }

    // ── PROJECT MANAGEMENT ────────────────────────────────────────────────────

    if (input.action === 'create_project') {
        if (!hasAdmin && !hasDeveloper && !hasCreator) {
            data.created_project = { ok: false, error: 'Creator access required.' };
            return;
        }
        var cpStore = new OIDataStore();
        var cpName  = '' + (input.name || '');
        var cpDesc  = '' + (input.description || '');
        if (!cpName) { data.created_project = { ok: false, error: 'Project name is required.' }; return; }
        var cpProj = {
            name:                cpName,
            description:         cpDesc,
            stage:               'draft',
            created_by:          data.personSysId || '',
            created_at:          new GlideDateTime().getValue(),
            updated_at:          new GlideDateTime().getValue(),
            session_ids:         [],
            implementation_plan: null,
            review_note:         '',
            locked:              false
        };
        var cpId = cpStore.upsert('projects', cpProj);
        try {
            new OIJournal().write('project_created',
                { sys_id: userSysId, name: data.userName, role: data.userRole },
                { type: 'project', sys_id: cpId, name: cpName },
                { status: 'success' },
                { section: 'creator-studio', assistant_type: 'creator', query: '' });
        } catch (je) {}
        data.created_project = { ok: true, sys_id: cpId, name: cpName };
        return;
    }

    if (input.action === 'delete_project') {
        if (!hasAdmin && !hasDeveloper && !hasCreator) {
            data.deleted_project = { ok: false, error: 'Creator access required.' };
            return;
        }
        var dpStore  = new OIDataStore();
        var dpId     = '' + (input.project_sys_id || '');
        var dpProj   = dpStore.get('projects', dpId);
        if (!dpProj) { data.deleted_project = { ok: false, error: 'Project not found.' }; return; }
        if (!hasAdmin && '' + dpProj.created_by !== data.personSysId) {
            data.deleted_project = { ok: false, error: 'You can only delete your own projects.' };
            return;
        }
        var dpSessionIds = dpProj.session_ids || [];
        var dpssi;
        for (dpssi = 0; dpssi < dpSessionIds.length; dpssi++) {
            dpStore.remove('sessions', dpSessionIds[dpssi]);
        }
        dpStore.remove('projects', dpId);
        data.deleted_project = { ok: true };
        return;
    }

    if (input.action === 'update_project_stage') {
        if (!hasAdmin && !hasDeveloper && !hasCreator) {
            data.updated_stage = { ok: false, error: 'Creator access required.' };
            return;
        }
        var upsStore = new OIDataStore();
        var upsProjId = '' + (input.project_sys_id || '');
        var upsStage  = '' + (input.stage || '');
        var validStages = ['draft', 'review', 'approved', 'implementing', 'published'];
        if (validStages.indexOf(upsStage) === -1) {
            data.updated_stage = { ok: false, error: 'Invalid stage.' };
            return;
        }
        var upsProj = upsStore.get('projects', upsProjId);
        if (!upsProj) { data.updated_stage = { ok: false, error: 'Project not found.' }; return; }
        if (!hasAdmin && '' + upsProj.created_by !== data.personSysId) {
            data.updated_stage = { ok: false, error: 'Access denied.' };
            return;
        }
        upsProj.stage      = upsStage;
        upsProj.updated_at = new GlideDateTime().getValue();
        if (upsStage === 'review') {
            var upsNote = '' + (input.review_note || '');
            var upsPa = {
                type:          'project_review',
                description:   'Project submitted for review: ' + upsProj.name,
                subject_type:  'project',
                subject_sys_id: upsProjId,
                subject_name:  '' + upsProj.name,
                assigned_to:   null,
                status:        'pending',
                created_at:    new GlideDateTime().getValue(),
                created_by:    data.personSysId || ''
            };
            upsStore.upsert('pending_actions', upsPa);
        }
        upsStore.upsert('projects', upsProj);
        data.updated_stage = { ok: true, stage: upsStage };
        return;
    }

    // ── SESSION MANAGEMENT ────────────────────────────────────────────────────

    if (input.action === 'create_session') {
        if (!hasAdmin && !hasDeveloper && !hasCreator) {
            data.created_session = { ok: false, error: 'Creator access required.' };
            return;
        }
        var csStore    = new OIDataStore();
        var csProjId   = '' + (input.project_sys_id || '');
        var csName     = '' + (input.name || 'New Session');
        var csProj     = csStore.get('projects', csProjId);
        if (!csProj) { data.created_session = { ok: false, error: 'Project not found.' }; return; }
        if (csProj.locked) { data.created_session = { ok: false, error: 'Project is locked.' }; return; }
        if (!hasAdmin && '' + csProj.created_by !== data.personSysId) {
            data.created_session = { ok: false, error: 'Access denied.' };
            return;
        }
        var csSess = {
            project_sys_id: csProjId,
            name:           csName,
            created_by:     data.personSysId || '',
            created_at:     new GlideDateTime().getValue(),
            updated_at:     new GlideDateTime().getValue(),
            locked:         false,
            message_count:  0
        };
        var csId     = csStore.upsert('sessions', csSess);
        var csIds    = csProj.session_ids || [];
        csIds.push(csId);
        csProj.session_ids = csIds;
        csProj.updated_at  = new GlideDateTime().getValue();
        csStore.upsert('projects', csProj);
        try {
            new OIJournal().write('session_created',
                { sys_id: userSysId, name: data.userName, role: data.userRole },
                { type: 'session', sys_id: csId, name: csName },
                { status: 'success' },
                { section: 'creator-studio', assistant_type: 'creator', query: '' });
        } catch (je) {}
        data.created_session = { ok: true, sys_id: csId, name: csName };
        return;
    }

    if (input.action === 'delete_session') {
        if (!hasAdmin && !hasDeveloper && !hasCreator) {
            data.deleted_session = { ok: false, error: 'Creator access required.' };
            return;
        }
        var dsStore   = new OIDataStore();
        var dsId      = '' + (input.session_sys_id || '');
        var dsSess    = dsStore.get('sessions', dsId);
        if (!dsSess) { data.deleted_session = { ok: false, error: 'Session not found.' }; return; }
        if (dsSess.locked) { data.deleted_session = { ok: false, error: 'Session is locked.' }; return; }
        var dsProj = dsStore.get('projects', '' + dsSess.project_sys_id);
        if (dsProj) {
            var dsIds   = dsProj.session_ids || [];
            var dsFilt  = [];
            var dsii;
            for (dsii = 0; dsii < dsIds.length; dsii++) {
                if (dsIds[dsii] !== dsId) { dsFilt.push(dsIds[dsii]); }
            }
            dsProj.session_ids = dsFilt;
            dsProj.updated_at  = new GlideDateTime().getValue();
            dsStore.upsert('projects', dsProj);
        }
        dsStore.remove('sessions', dsId);
        data.deleted_session = { ok: true };
        return;
    }

    if (input.action === 'move_session') {
        if (!hasAdmin && !hasDeveloper && !hasCreator) {
            data.moved_session = { ok: false, error: 'Creator access required.' };
            return;
        }
        var mvStore    = new OIDataStore();
        var mvSessId   = '' + (input.session_sys_id    || '');
        var mvTargetId = '' + (input.target_project_sys_id || '');
        var mvSess     = mvStore.get('sessions', mvSessId);
        var mvTarget   = mvStore.get('projects', mvTargetId);
        if (!mvSess || !mvTarget) {
            data.moved_session = { ok: false, error: 'Session or target project not found.' };
            return;
        }
        var mvOldProj = mvStore.get('projects', '' + mvSess.project_sys_id);
        if (mvOldProj) {
            var mvOldIds = mvOldProj.session_ids || [];
            var mvFilt   = [];
            var mvii;
            for (mvii = 0; mvii < mvOldIds.length; mvii++) {
                if (mvOldIds[mvii] !== mvSessId) { mvFilt.push(mvOldIds[mvii]); }
            }
            mvOldProj.session_ids = mvFilt;
            mvOldProj.updated_at  = new GlideDateTime().getValue();
            mvStore.upsert('projects', mvOldProj);
        }
        var mvNewIds = mvTarget.session_ids || [];
        mvNewIds.push(mvSessId);
        mvTarget.session_ids = mvNewIds;
        mvTarget.updated_at  = new GlideDateTime().getValue();
        mvStore.upsert('projects', mvTarget);
        mvSess.project_sys_id = mvTargetId;
        mvSess.updated_at     = new GlideDateTime().getValue();
        mvStore.upsert('sessions', mvSess);
        data.moved_session = { ok: true };
        return;
    }

    if (input.action === 'save_session_messages') {
        if (!hasAdmin && !hasDeveloper && !hasCreator) {
            data.saved_messages = { ok: false, error: 'Creator access required.' };
            return;
        }
        var ssmStore  = new OIDataStore();
        var ssmSessId = '' + (input.session_sys_id || '');
        var ssmMsgs   = input.messages || [];
        var ssmSess   = ssmStore.get('sessions', ssmSessId);
        if (!ssmSess) { data.saved_messages = { ok: false, error: 'Session not found.' }; return; }
        ssmStore.saveSessionMessages(ssmSessId, ssmMsgs);
        ssmSess.message_count = ssmMsgs.length;
        ssmSess.updated_at    = new GlideDateTime().getValue();
        ssmStore.upsert('sessions', ssmSess);
        data.saved_messages = { ok: true, count: ssmMsgs.length };
        return;
    }

    if (input.action === 'get_session') {
        if (!hasAdmin && !hasDeveloper && !hasCreator) {
            data.session = null;
            return;
        }
        var gsStore  = new OIDataStore();
        var gsSessId = '' + (input.session_sys_id || '');
        var gsSess   = gsStore.get('sessions', gsSessId);
        if (!gsSess) { data.session = null; return; }
        data.session = {
            sys_id:        '' + gsSess.sys_id,
            name:          '' + gsSess.name,
            project_sys_id: '' + gsSess.project_sys_id,
            locked:        gsSess.locked === true,
            message_count: parseInt(gsSess.message_count, 10) || 0,
            messages:      gsStore.getSessionMessages(gsSessId)
        };
        return;
    }

    // ── PROJECT APPROVAL (LEADERSHIP) ─────────────────────────────────────────

    if (input.action === 'approve_project') {
        if (!hasAdmin && !hasLeadership) {
            data.approved = { ok: false, error: 'Leadership access required.' };
            return;
        }
        var apStore   = new OIDataStore();
        var apProjId  = '' + (input.project_sys_id || '');
        var apProj    = apStore.get('projects', apProjId);
        if (!apProj) { data.approved = { ok: false, error: 'Project not found.' }; return; }
        apProj.stage      = 'approved';
        apProj.review_note = '' + (input.review_note || '');
        apProj.updated_at = new GlideDateTime().getValue();
        apStore.upsert('projects', apProj);
        var apPas = apStore.find('pending_actions', function(pa) {
            return pa.subject_sys_id === apProjId && pa.status === 'pending';
        });
        var apPai;
        for (apPai = 0; apPai < apPas.length; apPai++) {
            apPas[apPai].status     = 'resolved';
            apPas[apPai].updated_at = new GlideDateTime().getValue();
            apStore.upsert('pending_actions', apPas[apPai]);
        }
        try {
            new OIJournal().write('project_approved',
                { sys_id: userSysId, name: data.userName, role: data.userRole },
                { type: 'project', sys_id: apProjId, name: apProj.name },
                { status: 'success' },
                { section: 'leadership-insights', assistant_type: 'leadership', query: '' });
        } catch (je) {}
        data.approved = { ok: true, project_name: '' + apProj.name };
        return;
    }

    if (input.action === 'reject_project') {
        if (!hasAdmin && !hasLeadership) {
            data.rejected = { ok: false, error: 'Leadership access required.' };
            return;
        }
        var rjStore  = new OIDataStore();
        var rjProjId = '' + (input.project_sys_id || '');
        var rjProj   = rjStore.get('projects', rjProjId);
        if (!rjProj) { data.rejected = { ok: false, error: 'Project not found.' }; return; }
        rjProj.stage       = 'draft';
        rjProj.review_note = '' + (input.review_note || '');
        rjProj.updated_at  = new GlideDateTime().getValue();
        rjStore.upsert('projects', rjProj);
        var rjPas = rjStore.find('pending_actions', function(pa) {
            return pa.subject_sys_id === rjProjId && pa.status === 'pending';
        });
        var rjPai;
        for (rjPai = 0; rjPai < rjPas.length; rjPai++) {
            rjPas[rjPai].status     = 'resolved';
            rjPas[rjPai].updated_at = new GlideDateTime().getValue();
            rjStore.upsert('pending_actions', rjPas[rjPai]);
        }
        try {
            new OIJournal().write('project_rejected',
                { sys_id: userSysId, name: data.userName, role: data.userRole },
                { type: 'project', sys_id: rjProjId, name: rjProj.name },
                { status: 'success', detail: '' + (input.review_note || '') },
                { section: 'leadership-insights', assistant_type: 'leadership', query: '' });
        } catch (je) {}
        data.rejected = { ok: true, project_name: '' + rjProj.name };
        return;
    }

    if (input.action === 'implement_project') {
        if (!hasAdmin && !hasCreator) {
            data.implemented = { ok: false, error: 'Creator access required.' };
            return;
        }
        var implStore  = new OIDataStore();
        var implProjId = '' + (input.project_sys_id || '');
        var implProj   = implStore.get('projects', implProjId);
        if (!implProj) { data.implemented = { ok: false, error: 'Project not found.' }; return; }
        if (implProj.stage !== 'approved') {
            data.implemented = { ok: false, error: 'Project must be approved before implementation.' };
            return;
        }
        if (!hasAdmin && '' + implProj.created_by !== data.personSysId) {
            data.implemented = { ok: false, error: 'Access denied.' };
            return;
        }
        var implSessIds = implProj.session_ids || [];
        var implSi;
        for (implSi = 0; implSi < implSessIds.length; implSi++) {
            var implSess = implStore.get('sessions', implSessIds[implSi]);
            if (implSess && !implSess.locked) {
                implSess.locked     = true;
                implSess.updated_at = new GlideDateTime().getValue();
                implStore.upsert('sessions', implSess);
            }
        }
        var implFinalSess = {
            project_sys_id: implProjId,
            name:           'Implementation Session',
            created_by:     data.personSysId || '',
            created_at:     new GlideDateTime().getValue(),
            updated_at:     new GlideDateTime().getValue(),
            locked:         false,
            message_count:  0,
            is_implementation: true
        };
        var implFinalId = implStore.upsert('sessions', implFinalSess);
        implSessIds.push(implFinalId);
        implProj.session_ids = implSessIds;
        implProj.stage       = 'implementing';
        implProj.updated_at  = new GlideDateTime().getValue();
        implStore.upsert('projects', implProj);
        try {
            new OIJournal().write('implementation_started',
                { sys_id: userSysId, name: data.userName, role: data.userRole },
                { type: 'project', sys_id: implProjId, name: implProj.name },
                { status: 'success' },
                { section: 'creator-studio', assistant_type: 'creator', query: '' });
        } catch (je) {}
        data.implemented = {
            ok:              true,
            implementation_session_sys_id: implFinalId,
            catalog:         loadCatalogCategories()
        };
        return;
    }

    // ── AUTOMATION MANAGEMENT ─────────────────────────────────────────────────

    if (input.action === 'create_automation') {
        if (!hasAdmin && !hasCreator) {
            data.created_automation = { ok: false, error: 'Creator access required.' };
            return;
        }
        var caStore   = new OIDataStore();
        var caName    = '' + (input.name || '');
        var caDesc    = '' + (input.description || '');
        var caShort   = '' + (input.short_description || '');
        var caCatId   = '' + (input.category_sys_id || '');
        if (!caName) { data.created_automation = { ok: false, error: 'Name is required.' }; return; }

        var caCat     = caCatId ? caStore.get('catalog', caCatId) : null;
        var caCatName = caCat ? '' + caCat.name : '';

        var caAuto = {
            name:              caName,
            short_description: caShort,
            description:       caDesc,
            status:            'draft',
            category_sys_id:   caCatId,
            category_name:     caCatName,
            usage_count:       0,
            created_by:        data.personSysId || '',
            created_at:        new GlideDateTime().getValue(),
            updated_at:        new GlideDateTime().getValue()
        };

        if (input.project_sys_id) {
            var caProj = caStore.get('projects', '' + input.project_sys_id);
            if (caProj && caProj.stage === 'implementing') {
                caAuto.status     = 'published';
                caAuto.project_sys_id = '' + input.project_sys_id;
                caProj.stage      = 'published';
                caProj.updated_at = new GlideDateTime().getValue();
                caStore.upsert('projects', caProj);
                if (caCatId && caCat) {
                    var caItems = caCat.items || [];
                    caItems.push({
                        sys_id:       caStore.generateId(),
                        name:         caName,
                        description:  caShort,
                        sort_order:   caItems.length,
                        active:       true,
                        action_type:  'automation',
                        action_value: ''
                    });
                    caCat.items      = caItems;
                    caCat.updated_at = new GlideDateTime().getValue();
                    caStore.upsert('catalog', caCat);
                }
            }
        }

        var caId = caStore.upsert('automations', caAuto);
        try {
            new OIJournal().write('automation_published',
                { sys_id: userSysId, name: data.userName, role: data.userRole },
                { type: 'automation', sys_id: caId, name: caName },
                { status: 'success' },
                { section: 'creator-studio', assistant_type: 'creator', query: '' });
        } catch (je) {}
        data.created_automation = { ok: true, sys_id: caId, name: caName };
        return;
    }

    if (input.action === 'publish_automation') {
        if (!hasAdmin && !hasCreator) {
            data.published_automation = { ok: false, error: 'Creator or Administrator access required.' };
            return;
        }
        var paStore  = new OIDataStore();
        var paAutoId = '' + (input.automation_sys_id || '');
        var paAuto   = paStore.get('automations', paAutoId);
        if (!paAuto) { data.published_automation = { ok: false, error: 'Automation not found.' }; return; }
        paAuto.status     = 'published';
        paAuto.updated_at = new GlideDateTime().getValue();
        paStore.upsert('automations', paAuto);
        var paTargetType = '' + (input.target_type || 'specific');
        var paGroupIds   = input.group_sys_ids || [];
        var paAllGroups  = paTargetType === 'all';
        var paGroups     = paAllGroups ?
            paStore.find('groups', function(g) { return g.status === 'active'; }) :
            paGroupIds.map(function(gid) { return paStore.get('groups', gid); }).filter(function(g) { return g !== null; });
        var pagi, paGrp, paGrpAutos, paAlready, paAi;
        for (pagi = 0; pagi < paGroups.length; pagi++) {
            paGrp      = paGroups[pagi];
            if (!paGrp) { continue; }
            paGrpAutos = paGrp.automations || [];
            paAlready  = false;
            for (paAi = 0; paAi < paGrpAutos.length; paAi++) {
                if ('' + paGrpAutos[paAi].automation_sys_id === paAutoId) {
                    paAlready = true;
                    break;
                }
            }
            if (!paAlready) {
                paGrpAutos.push({ automation_sys_id: paAutoId, approval_status: 'approved' });
                paGrp.automations = paGrpAutos;
                paGrp.updated_at  = new GlideDateTime().getValue();
                paStore.upsert('groups', paGrp);
            }
        }
        data.published_automation = { ok: true, name: '' + paAuto.name };
        return;
    }

    // ── EXECUTION JOURNAL (DEVELOPER ACCESS) ──────────────────────────────────

    if (input.action === 'get_journal') {
        if (!hasAdmin && !hasDeveloper) { data.journal = null; return; }
        try {
            var gjJournal = new OIJournal();
            var gjFilter  = {};
            if (input.event_type)   { gjFilter.event_type   = '' + input.event_type; }
            if (input.since)        { gjFilter.since         = '' + input.since; }
            if (input.section)      { gjFilter.section       = '' + input.section; }
            var gjLimit = parseInt(input.limit, 10) || 50;
            data.journal = {
                entries: gjJournal.read(gjFilter, gjLimit),
                summary: gjJournal.summary()
            };
        } catch (je) {
            data.journal = { entries: [], summary: {}, error: '' + je };
        }
        return;
    }

})();
