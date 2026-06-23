var VirtualAgentHelper = Class.create();
VirtualAgentHelper.prototype = {
    initialize: function() {
        this.PRE_INTENT_KEY = 'oi_pre_intent';
        this._permissions   = new PermissionResolver();
        this._store         = new OIDataStore();
    },

    _resolveUserId: function(userSysId) {
        if (userSysId === null || userSysId === undefined || userSysId === '') {
            return gs.getUserID();
        }
        return '' + userSysId;
    },

    getUserContext: function(userSysId) {
        var uid     = this._resolveUserId(userSysId);
        var context = {
            user_sys_id:     uid,
            user_name:       '',
            full_name:       '',
            email:           '',
            system_role:     this._permissions.getSystemRole(uid),
            groups:          this._permissions.getUserGroups(uid),
            person_sys_id:   this._permissions.getPersonByUser(uid),
            copilot_enabled: false
        };
        var su = new GlideRecord('sys_user');
        if (su.get(uid)) {
            context.user_name = '' + su.getValue('user_name');
            context.full_name = '' + su.getDisplayValue('name');
            context.email     = '' + su.getValue('email');
        }
        if (context.person_sys_id) {
            var person = this._store.get('persons', context.person_sys_id);
            if (person) {
                context.copilot_enabled = person.copilot_enabled === true || person.copilot_enabled === 'true';
            }
        }
        return context;
    },

    _getActiveGroupSysIds: function(userSysId) {
        var groups = this._permissions.getUserGroups(userSysId);
        var ids    = [];
        var i;
        for (i = 0; i < groups.length; i++) {
            ids.push(groups[i].group_sys_id);
        }
        return ids;
    },

    getTopCatalog: function(userSysId, limit) {
        var uid = this._resolveUserId(userSysId);
        var max = parseInt(limit, 10);
        if (isNaN(max) || max <= 0) { max = 5; }

        var groupIds  = this._getActiveGroupSysIds(uid);
        if (groupIds.length === 0) { return []; }

        var results   = [];
        var seen      = {};
        var allGroups = this._store.find('groups', function(g) {
            return g.status === 'active';
        });

        var gi, ai;
        for (gi = 0; gi < allGroups.length && results.length < max; gi++) {
            var grp = allGroups[gi];
            if (groupIds.indexOf('' + grp.sys_id) === -1) { continue; }
            var automations = grp.automations || [];
            for (ai = 0; ai < automations.length && results.length < max; ai++) {
                if ('' + automations[ai].approval_status !== 'approved') { continue; }
                var automationSysId = '' + automations[ai].automation_sys_id;
                if (seen[automationSysId]) { continue; }
                var auto = this._store.get('automations', automationSysId);
                if (auto && '' + auto.status === 'published') {
                    seen[automationSysId] = true;
                    results.push({
                        sys_id:            automationSysId,
                        name:              '' + auto.name,
                        short_description: '' + (auto.short_description || '')
                    });
                }
            }
        }
        return results;
    },

    userHasGroupAccess: function(userSysId, automationSysId) {
        var uid      = this._resolveUserId(userSysId);
        var groupIds = this._getActiveGroupSysIds(uid);
        if (groupIds.length === 0) { return false; }

        var auto = this._store.get('automations', automationSysId);
        if (!auto || '' + auto.status !== 'published') { return false; }

        var allGroups = this._store.find('groups', function(g) {
            return g.status === 'active';
        });
        var aid = '' + automationSysId;
        var gi, ai;
        for (gi = 0; gi < allGroups.length; gi++) {
            var grp = allGroups[gi];
            if (groupIds.indexOf('' + grp.sys_id) === -1) { continue; }
            var automations = grp.automations || [];
            for (ai = 0; ai < automations.length; ai++) {
                if ('' + automations[ai].automation_sys_id === aid &&
                        '' + automations[ai].approval_status === 'approved') {
                    return true;
                }
            }
        }
        return false;
    },

    setPreIntent: function(intentName) {
        gs.getSession().putClientData(this.PRE_INTENT_KEY, '' + intentName);
        return true;
    },

    getPreIntent: function() {
        var value = gs.getSession().getClientData(this.PRE_INTENT_KEY);
        if (value === null || value === undefined) { return ''; }
        return '' + value;
    },

    getWelcomeContext: function(userSysId, activeSection) {
        var uid     = this._resolveUserId(userSysId);
        var section = (activeSection === null || activeSection === undefined) ? 'workspace' : ('' + activeSection);
        var ctx     = this.getUserContext(uid);
        var welcome = {
            user_sys_id:       uid,
            full_name:         ctx.full_name,
            system_role:       ctx.system_role,
            active_section:    section,
            group_count:       ctx.groups.length,
            pending_approvals: 0,
            message:           ''
        };

        if (ctx.groups.length === 0 && ctx.system_role === 'user') {
            welcome.message = 'Welcome to Operations Intelligence. You are not yet a member of any group. Please contact your manager to be added.';
            return welcome;
        }
        if (ctx.system_role === 'admin') {
            welcome.message = (section === 'command')
                ? 'Operations Command is ready. How can I assist with platform administration?'
                : 'Welcome to Operations Command, ' + ctx.full_name + '.';
            return welcome;
        }
        if (ctx.system_role === 'leadership') {
            welcome.pending_approvals = this._countPendingApprovals(ctx.person_sys_id);
            welcome.message = (section === 'governance' || welcome.pending_approvals > 0)
                ? 'You have ' + welcome.pending_approvals + ' pending approval(s) awaiting your review.'
                : 'Welcome to Operations Governance, ' + ctx.full_name + '.';
            return welcome;
        }
        if (ctx.system_role === 'creator') {
            welcome.message = (section === 'studio')
                ? 'Welcome to Operations Studio. Would you like to resume your last draft or start something new?'
                : 'Welcome back, ' + ctx.full_name + '. What would you like to build today?';
            return welcome;
        }
        welcome.message = 'Welcome, ' + ctx.full_name + '. How can the Operations Assistant help you today?';
        return welcome;
    },

    _countPendingApprovals: function(personSysId) {
        if (!personSysId) { return 0; }
        var pid     = '' + personSysId;
        var pending = this._store.find('pending_actions', function(pa) {
            return '' + pa.assigned_to === pid &&
                   (pa.status === 'pending' || pa.status === 'escalated') &&
                   (pa.action_type === 'automation_approval' || pa.action_type === 'artifact_approval');
        });
        return pending.length;
    },

    processMessage: function(message, context, assistantType) {
        var aType = assistantType || 'operations';
        var hist  = [];
        if (context && context.length) {
            var ci;
            for (ci = 0; ci < context.length; ci++) {
                var c = context[ci];
                if (c && c.role && c.text) {
                    hist.push({ role: '' + c.role, text: '' + c.text });
                }
            }
        }
        var perm    = new PermissionResolver();
        var uid     = gs.getUserID();
        var userCtx = {
            user_sys_id:   uid,
            full_name:     gs.getUser().getFullName(),
            system_role:   perm.getSystemRole(uid),
            person_sys_id: perm.getPersonByUser(uid),
            groups:        perm.getUserGroups(uid)
        };
        var advisor = new ConversationAdvisor(aType);
        return advisor.analyze('' + (message || ''), userCtx, hist);
    },

    type: 'VirtualAgentHelper'
};
