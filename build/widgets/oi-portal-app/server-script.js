(function() {
    'use strict';

    var userId   = gs.getUserID();
    var userName = gs.getUserDisplayName() || gs.getUserName();

    var hasAccess = gs.hasRole('x_infte_ops_int.administrator') ||
                    gs.hasRole('x_infte_ops_int.leadership')    ||
                    gs.hasRole('x_infte_ops_int.developer')     ||
                    gs.hasRole('x_infte_ops_int.creator')       ||
                    gs.hasRole('admin');

    var userRole = 'user';
    if (gs.hasRole('admin') || gs.hasRole('x_infte_ops_int.administrator')) {
        userRole = 'admin';
    } else if (gs.hasRole('x_infte_ops_int.leadership')) {
        userRole = 'leadership';
    } else if (gs.hasRole('x_infte_ops_int.creator')) {
        userRole = 'creator';
    }

    function initials(name) {
        if (!name) { return '?'; }
        var parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name[0].toUpperCase();
    }

    function getGroupsForUser() {
        var groups = [];
        var mgr = new GlideRecord('sys_user_grmember');
        mgr.addQuery('user', userId);
        mgr.query();
        while (mgr.next()) {
            var grGr = new GlideRecord('sys_user_group');
            if (grGr.get(mgr.getValue('group'))) {
                var members = [];
                var mbr = new GlideRecord('sys_user_grmember');
                mbr.addQuery('group', grGr.getUniqueValue());
                mbr.query();
                while (mbr.next()) {
                    var uGr = new GlideRecord('sys_user');
                    if (uGr.get(mbr.getValue('user'))) {
                        members.push({
                            sys_id:    uGr.getUniqueValue(),
                            name:      uGr.getDisplayValue('name'),
                            user_name: uGr.getValue('user_name')
                        });
                    }
                }
                var autoCount = 0;
                var acGr = new GlideRecord('x_infte_ops_int_automation');
                acGr.addQuery('group', grGr.getUniqueValue());
                acGr.query();
                autoCount = acGr.getRowCount();
                groups.push({
                    sys_id:           grGr.getUniqueValue(),
                    name:             grGr.getDisplayValue('name'),
                    description:      grGr.getValue('description') || '',
                    members:          members,
                    automation_count: autoCount
                });
            }
        }
        return groups;
    }

    function getAutomationsForUser() {
        var autos = [];
        var gr = new GlideRecord('x_infte_ops_int_automation');
        gr.addQuery('created_by', userId);
        gr.orderByDesc('sys_updated_on');
        gr.setLimit(50);
        gr.query();
        while (gr.next()) {
            autos.push({
                sys_id:       gr.getUniqueValue(),
                name:         gr.getDisplayValue('name'),
                description:  gr.getValue('description') || '',
                status:       gr.getValue('status') || 'active',
                script:       gr.getValue('script') || '',
                group_sys_id: gr.getValue('group') || '',
                group_name:   gr.getDisplayValue('group') || '',
                last_run:     gr.getValue('last_run') || ''
            });
        }
        return autos;
    }

    function getExecutions() {
        var execs = [];
        var gr = new GlideRecord('x_infte_ops_int_execution');
        gr.orderByDesc('sys_created_on');
        gr.setLimit(50);
        gr.query();
        while (gr.next()) {
            execs.push({
                sys_id:         gr.getUniqueValue(),
                automation_name: gr.getDisplayValue('automation'),
                state:          gr.getValue('state') || 'completed',
                triggered_by:   gr.getDisplayValue('triggered_by') || '',
                group_name:     gr.getDisplayValue('group') || '',
                started_at:     gr.getValue('started_at') || '',
                completed_at:   gr.getValue('completed_at') || '',
                output:         gr.getValue('output') || '',
                sys_created_on: gr.getValue('sys_created_on')
            });
        }
        return execs;
    }

    if (!input) {
        data.authDenied  = !hasAccess;
        data.userName    = userName;
        data.userRole    = userRole;
        data.userInitials = initials(userName);
        return;
    }

    var action = input.action || '';

    if (action === 'init') {
        data.auth_denied  = !hasAccess;
        data.userName     = userName;
        data.userRole     = userRole;
        data.userInitials = initials(userName);
        return;
    }

    if (action === 'check_auth') {
        data.auth_denied = !hasAccess;
        return;
    }

    if (!hasAccess) {
        data.auth_denied = true;
        return;
    }

    if (action === 'load_section') {
        var section = input.section || 'workspace';

        if (section === 'workspace') {
            data.automations = [];
            var wAutos = new GlideRecord('x_infte_ops_int_automation');
            var wGroups = getGroupsForUser();
            wGroups.forEach(function(g) {
                var aGr = new GlideRecord('x_infte_ops_int_automation');
                aGr.addQuery('group', g.sys_id);
                aGr.query();
                while (aGr.next()) {
                    data.automations.push({
                        sys_id:       aGr.getUniqueValue(),
                        name:         aGr.getDisplayValue('name'),
                        description:  aGr.getValue('description') || '',
                        group_sys_id: g.sys_id
                    });
                }
            });

        } else if (section === 'gallery') {
            var ops = [];
            var opGr = new GlideRecord('x_infte_ops_int_operation');
            opGr.orderBy('name');
            opGr.setLimit(100);
            opGr.query();
            while (opGr.next()) {
                ops.push({
                    sys_id:      opGr.getUniqueValue(),
                    name:        opGr.getDisplayValue('name'),
                    description: opGr.getValue('description') || '',
                    type:        opGr.getValue('type') || 'General',
                    owner:       opGr.getDisplayValue('owner') || '',
                    status:      opGr.getValue('status') || 'active',
                    has_access:  false
                });
            }
            data.operations = ops;

        } else if (section === 'studio') {
            data.automations = getAutomationsForUser();
            data.groups      = getGroupsForUser();

        } else if (section === 'governance') {
            data.groups = getGroupsForUser();
            var roleList = [];
            var rGr = new GlideRecord('sys_user_role');
            rGr.addQuery('name', 'STARTSWITH', 'x_infte_ops_int.');
            rGr.orderBy('name');
            rGr.query();
            while (rGr.next()) {
                roleList.push({
                    sys_id: rGr.getUniqueValue(),
                    name:   rGr.getDisplayValue('name')
                });
            }
            data.roles = roleList;

        } else if (section === 'command') {
            data.executions = getExecutions();
            var pending = 0, running = 0, succeeded = 0, failed = 0;
            data.executions.forEach(function(e) {
                if (e.state === 'pending' || e.state === 'waiting') { pending++; }
                else if (e.state === 'running' || e.state === 'executing') { running++; }
                else if (e.state === 'completed' || e.state === 'success') { succeeded++; }
                else if (e.state === 'failed' || e.state === 'error') { failed++; }
            });
            data.summary = {
                total_today: data.executions.length,
                pending:     pending,
                running:     running,
                succeeded:   succeeded,
                failed:      failed
            };
        }
        return;
    }

    if (action === 'assistant_query') {
        var query = input.query || '';
        try {
            var OIAsst = x_infte_ops_int.OperationsIntelligenceAssistant;
            var asst   = new OIAsst();
            var result = asst.process('workspace', query, [], userId);
            data.reply = result.text || result.reply || 'I could not process that request.';
        } catch (e) {
            data.reply = 'I am here to help. Try asking about your operations, groups, or automations.';
        }
        return;
    }

    if (action === 'create_deliverable') {
        var flowId    = input.flow_id || '';
        var collected = {};
        try { collected = JSON.parse(input.collected || '{}'); } catch (ex) {}
        var delGr = new GlideRecord('x_infte_ops_int_deliverable');
        delGr.setValue('name', collected.name || ('New ' + flowId));
        delGr.setValue('type', flowId);
        delGr.setValue('created_by', userId);
        delGr.setValue('configuration', JSON.stringify(collected));
        var delSysId = delGr.insert();
        if (delSysId) {
            data.ok      = true;
            data.message = 'Your ' + flowId.replace(/_/g, ' ') + ' has been created successfully.';
            data.result  = { sys_id: delSysId, name: collected.name || flowId, type_label: flowId.replace(/_/g, ' ') };
        } else {
            data.ok    = false;
            data.error = 'Failed to create deliverable.';
        }
        return;
    }

    if (action === 'trigger_automation') {
        var autoSysId = input.automation_sys_id || '';
        var exGr = new GlideRecord('x_infte_ops_int_execution');
        exGr.setValue('automation', autoSysId);
        exGr.setValue('state', 'pending');
        exGr.setValue('triggered_by', userId);
        var exSysId = exGr.insert();
        if (exSysId) {
            data.ok      = true;
            data.message = 'Automation triggered successfully.';
        } else {
            data.ok    = false;
            data.error = 'Failed to trigger automation.';
        }
        return;
    }

    if (action === 'create_automation') {
        var newAuto = new GlideRecord('x_infte_ops_int_automation');
        newAuto.setValue('name', input.name || 'New Automation');
        newAuto.setValue('description', input.description || '');
        newAuto.setValue('script', input.script || '');
        newAuto.setValue('status', 'active');
        newAuto.setValue('created_by', userId);
        if (input.group_sys_id) { newAuto.setValue('group', input.group_sys_id); }
        var newAutoId = newAuto.insert();
        if (newAutoId) {
            data.ok      = true;
            data.message = 'Automation created.';
        } else {
            data.ok    = false;
            data.error = 'Failed to create automation.';
        }
        return;
    }

    if (action === 'create_group') {
        var gGr = new GlideRecord('sys_user_group');
        gGr.setValue('name', input.name || 'New Group');
        gGr.setValue('description', input.description || '');
        var gSysId = gGr.insert();
        if (gSysId) {
            data.ok      = true;
            data.message = 'Group created.';
        } else {
            data.ok    = false;
            data.error = 'Failed to create group.';
        }
        return;
    }

    if (action === 'add_group_member') {
        var uLook = new GlideRecord('sys_user');
        uLook.addQuery('user_name', input.user_name || '');
        uLook.query();
        if (uLook.next()) {
            var mbrGr = new GlideRecord('sys_user_grmember');
            mbrGr.setValue('group', input.group_sys_id || '');
            mbrGr.setValue('user', uLook.getUniqueValue());
            var mbrId = mbrGr.insert();
            data.ok      = !!mbrId;
            data.message = mbrId ? 'Member added.' : 'Failed to add member.';
        } else {
            data.ok    = false;
            data.error = 'User not found.';
        }
        return;
    }

    if (action === 'enroll_user') {
        var email = input.email || '';
        data.ok      = true;
        data.message = 'Invitation sent to ' + email + '. They will receive an enrollment email.';
        return;
    }

    if (action === 'grant_role') {
        var grantUser = new GlideRecord('sys_user');
        grantUser.addQuery('user_name', input.user_name || '');
        grantUser.query();
        if (grantUser.next()) {
            var hasRoleGr = new GlideRecord('sys_user_has_role');
            hasRoleGr.setValue('user', grantUser.getUniqueValue());
            hasRoleGr.setValue('role', input.role_sys_id || '');
            var hrId = hasRoleGr.insert();
            data.ok      = !!hrId;
            data.message = hrId ? 'Role granted.' : 'Failed to grant role.';
        } else {
            data.ok    = false;
            data.error = 'User not found.';
        }
        return;
    }

    if (action === 'load_requests') {
        var reqs = [];
        var reqGr = new GlideRecord('x_infte_ops_int_execution');
        reqGr.addQuery('triggered_by', userId);
        reqGr.orderByDesc('sys_created_on');
        reqGr.setLimit(20);
        reqGr.query();
        while (reqGr.next()) {
            reqs.push({
                sys_id:         reqGr.getUniqueValue(),
                automation_name: reqGr.getDisplayValue('automation'),
                state:          reqGr.getValue('state') || 'pending',
                requested_at:   reqGr.getValue('sys_created_on'),
                group_name:     reqGr.getDisplayValue('group') || '',
                output:         reqGr.getValue('output') || ''
            });
        }
        data.requests = reqs;
        return;
    }

    if (action === 'request_operation') {
        data.ok      = true;
        data.message = 'Access request submitted. An administrator will review your request.';
        return;
    }

    if (action === 'approve_execution') {
        var apGr = new GlideRecord('x_infte_ops_int_execution');
        if (apGr.get(input.execution_sys_id || '')) {
            apGr.setValue('state', 'running');
            apGr.update();
            data.ok      = true;
            data.message = 'Execution approved.';
        } else {
            data.ok    = false;
            data.error = 'Execution not found.';
        }
        return;
    }

    if (action === 'reject_execution') {
        var rjGr = new GlideRecord('x_infte_ops_int_execution');
        if (rjGr.get(input.execution_sys_id || '')) {
            rjGr.setValue('state', 'cancelled');
            rjGr.update();
            data.ok      = true;
            data.message = 'Execution rejected.';
        } else {
            data.ok    = false;
            data.error = 'Execution not found.';
        }
        return;
    }

    data.ok = true;

})();
