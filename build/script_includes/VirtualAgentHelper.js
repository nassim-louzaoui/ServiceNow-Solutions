var VirtualAgentHelper = Class.create();
VirtualAgentHelper.prototype = {
    initialize: function() {
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.GROUP_TABLE = 'x_infte_ops_int_group';
        this.AUTOMATION_TABLE = 'x_infte_ops_int_automation';
        this.PENDING_ACTION_TABLE = 'x_infte_ops_int_pending_action';
        this.PRE_INTENT_KEY = 'oi_pre_intent';
        this._permissions = new PermissionResolver();
    },

    _resolveUserId: function(userSysId) {
        if (userSysId === null || userSysId === undefined || userSysId === '') {
            return gs.getUserID();
        }
        return '' + userSysId;
    },

    getUserContext: function(userSysId) {
        var uid = this._resolveUserId(userSysId);
        var context = {
            user_sys_id: uid,
            user_name: '',
            full_name: '',
            email: '',
            system_role: this._permissions.getSystemRole(uid),
            groups: this._permissions.getUserGroups(uid),
            person_sys_id: this._permissions.getPersonByUser(uid),
            copilot_enabled: false
        };
        var su = new GlideRecord('sys_user');
        if (su.get(uid)) {
            context.user_name = '' + su.getValue('user_name');
            context.full_name = '' + su.getDisplayValue('name');
            context.email = '' + su.getValue('email');
        }
        if (context.person_sys_id) {
            var person = new GlideRecord(this.PERSON_TABLE);
            if (person.get(context.person_sys_id)) {
                context.copilot_enabled = person.getValue('copilot_enabled') == '1' ||
                    person.getValue('copilot_enabled') === 'true';
            }
        }
        return context;
    },

    _getActiveGroupSysIds: function(userSysId) {
        var ids = [];
        var groups = this._permissions.getUserGroups(userSysId);
        var i;
        for (i = 0; i < groups.length; i++) {
            ids.push(groups[i].group_sys_id);
        }
        return ids;
    },

    getTopCatalog: function(userSysId, limit) {
        var uid = this._resolveUserId(userSysId);
        var max = parseInt(limit, 10);
        if (isNaN(max) || max <= 0) {
            max = 5;
        }
        var results = [];
        var groupIds = this._getActiveGroupSysIds(uid);
        if (groupIds.length === 0) {
            return results;
        }
        var seen = {};
        var grp = new GlideRecord(this.GROUP_TABLE);
        grp.addQuery('status', 'active');
        grp.query();
        while (grp.next() && results.length < max) {
            var grpSysId = '' + grp.getUniqueValue();
            if (groupIds.indexOf(grpSysId) === -1) {
                continue;
            }
            var automationsRaw = '' + grp.getValue('automations');
            var automationsArr = [];
            try { automationsArr = JSON.parse(automationsRaw); } catch (e) { automationsArr = []; }
            var ai;
            for (ai = 0; ai < automationsArr.length && results.length < max; ai++) {
                if ('' + automationsArr[ai].approval_status !== 'approved') {
                    continue;
                }
                var automationSysId = '' + automationsArr[ai].automation_sys_id;
                if (seen[automationSysId]) {
                    continue;
                }
                var auto = new GlideRecord(this.AUTOMATION_TABLE);
                if (auto.get(automationSysId) && auto.getValue('status') === 'published') {
                    seen[automationSysId] = true;
                    results.push({
                        sys_id: automationSysId,
                        name: '' + auto.getValue('name'),
                        short_description: '' + auto.getValue('short_description')
                    });
                }
            }
        }
        return results;
    },

    userHasGroupAccess: function(userSysId, automationSysId) {
        var uid = this._resolveUserId(userSysId);
        var groupIds = this._getActiveGroupSysIds(uid);
        if (groupIds.length === 0) {
            return false;
        }
        var auto = new GlideRecord(this.AUTOMATION_TABLE);
        if (!auto.get(automationSysId) || auto.getValue('status') !== 'published') {
            return false;
        }
        var grp = new GlideRecord(this.GROUP_TABLE);
        grp.addQuery('status', 'active');
        grp.query();
        while (grp.next()) {
            var grpSysId = '' + grp.getUniqueValue();
            if (groupIds.indexOf(grpSysId) === -1) {
                continue;
            }
            var automationsRaw = '' + grp.getValue('automations');
            var automationsArr = [];
            try { automationsArr = JSON.parse(automationsRaw); } catch (e) { automationsArr = []; }
            var ai;
            for (ai = 0; ai < automationsArr.length; ai++) {
                if ('' + automationsArr[ai].automation_sys_id === '' + automationSysId &&
                    '' + automationsArr[ai].approval_status === 'approved') {
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
        if (value === null || value === undefined) {
            return '';
        }
        return '' + value;
    },

    getWelcomeContext: function(userSysId, activeSection) {
        var uid = this._resolveUserId(userSysId);
        var section = (activeSection === null || activeSection === undefined) ?
            'workspace' : ('' + activeSection);
        var ctx = this.getUserContext(uid);
        var welcome = {
            user_sys_id: uid,
            full_name: ctx.full_name,
            system_role: ctx.system_role,
            active_section: section,
            group_count: ctx.groups.length,
            pending_approvals: 0,
            message: ''
        };

        if (ctx.groups.length === 0 && ctx.system_role === 'user') {
            welcome.message = 'Welcome to Operations Intelligence. You are not yet a ' +
                'member of any group. Please contact your manager to be added.';
            return welcome;
        }

        if (ctx.system_role === 'admin') {
            welcome.message = 'Welcome to Operations Command, ' + ctx.full_name + '.';
            if (section === 'command') {
                welcome.message = 'Operations Command is ready. How can I assist with ' +
                    'platform administration?';
            }
            return welcome;
        }

        if (ctx.system_role === 'leadership') {
            welcome.pending_approvals = this._countPendingApprovals(ctx.person_sys_id);
            if (section === 'governance' || welcome.pending_approvals > 0) {
                welcome.message = 'You have ' + welcome.pending_approvals +
                    ' pending approval(s) awaiting your review.';
            } else {
                welcome.message = 'Welcome to Operations Governance, ' + ctx.full_name + '.';
            }
            return welcome;
        }

        if (ctx.system_role === 'creator') {
            if (section === 'studio') {
                welcome.message = 'Welcome to Operations Studio. Would you like to ' +
                    'resume your last draft or start something new?';
            } else {
                welcome.message = 'Welcome back, ' + ctx.full_name +
                    '. What would you like to build today?';
            }
            return welcome;
        }

        welcome.message = 'Welcome, ' + ctx.full_name +
            '. How can the Operations Assistant help you today?';
        return welcome;
    },

    _countPendingApprovals: function(personSysId) {
        if (!personSysId) {
            return 0;
        }
        var pa = new GlideRecord(this.PENDING_ACTION_TABLE);
        pa.addQuery('assigned_to', personSysId);
        pa.addQuery('status', 'IN', 'pending,escalated');
        pa.addQuery('action_type', 'IN', 'automation_approval,artifact_approval');
        pa.query();
        return pa.getRowCount();
    },

    type: 'VirtualAgentHelper'
};
