(function() {
    data.authorized = false;
    data.metrics = { automations: 0, executions: 0, deliverables: 0, active_users: 0 };
    data.groups = [];
    data.executions = [];
    data.deliverables = [];
    data.search = '';
    data.tab = 'executions';

    var userSysId = gs.getUserID();
    var pr = new PermissionResolver();
    data.role = pr.getSystemRole(userSysId);

    if (!pr.hasRole(userSysId, 'admin')) {
        data.message = 'Admin Overview is available to administrators only.';
        return;
    }
    data.authorized = true;

    var EXEC_TABLE = 'x_infte_ops_int_execution';
    var AUTO_TABLE = 'x_infte_ops_int_automation';
    var ART_TABLE = 'x_infte_ops_int_managed_artifact';
    var GROUP_TABLE = 'x_infte_ops_int_group';
    var PERSON_TABLE = 'x_infte_ops_int_person';

    var ROW_LIMIT = 50;

    data.search = input && input.search ? ('' + input.search).trim() : '';
    if (input && input.tab) {
        data.tab = '' + input.tab;
    }

    data.metrics.automations = _count(AUTO_TABLE, function(gr) {
        gr.addQuery('active', true);
    });
    data.metrics.executions = _count(EXEC_TABLE, function(gr) {
        gr.addQuery('is_test', false);
    });
    data.metrics.deliverables = _count(ART_TABLE, function(gr) {
        gr.addQuery('status', 'active');
    });
    data.metrics.active_users = _count(PERSON_TABLE, function(gr) {
        gr.addQuery('active', true);
    });

    data.groups = _buildGroupTree();
    data.executions = _searchExecutions(data.search);
    data.deliverables = _searchDeliverables(data.search);

    function _count(table, queryFn) {
        var ga = new GlideAggregate(table);
        if (queryFn) {
            queryFn(ga);
        }
        ga.addAggregate('COUNT');
        ga.query();
        if (ga.next()) {
            return parseInt(ga.getAggregate('COUNT'), 10) || 0;
        }
        return 0;
    }

    function _buildGroupTree() {
        var all = [];
        var byId = {};
        var gr = new GlideRecord(GROUP_TABLE);
        gr.addQuery('status', 'active');
        gr.orderBy('name');
        gr.query();
        while (gr.next()) {
            var node = {
                group_sys_id: '' + gr.getUniqueValue(),
                name: '' + gr.getValue('name'),
                type: '' + gr.getValue('type'),
                parent_group: '' + gr.getValue('parent_group'),
                owner_name: '' + gr.getDisplayValue('owner'),
                member_count: 0,
                children: []
            };
            all.push(node);
            byId[node.group_sys_id] = node;
        }

        var i;
        for (i = 0; i < all.length; i++) {
            all[i].member_count = _memberCount(all[i].group_sys_id);
        }

        var roots = [];
        for (i = 0; i < all.length; i++) {
            var n = all[i];
            if (n.parent_group && byId[n.parent_group]) {
                byId[n.parent_group].children.push(n);
            } else {
                roots.push(n);
            }
        }
        return roots;
    }

    function _memberCount(groupSysId) {
        var ga = new GlideAggregate('x_infte_ops_int_group_member');
        ga.addQuery('group', groupSysId);
        ga.addQuery('status', 'active');
        ga.addAggregate('COUNT');
        ga.query();
        if (ga.next()) {
            return parseInt(ga.getAggregate('COUNT'), 10) || 0;
        }
        return 0;
    }

    function _searchExecutions(term) {
        var rows = [];
        var gr = new GlideRecord(EXEC_TABLE);
        if (term) {
            var q = gr.addQuery('number', 'CONTAINS', term);
            q.addOrCondition('automation.name', 'CONTAINS', term);
            q.addOrCondition('triggered_by.user.name', 'CONTAINS', term);
            q.addOrCondition('status', 'CONTAINS', term);
        }
        gr.orderByDesc('triggered_at');
        gr.setLimit(ROW_LIMIT);
        gr.query();
        while (gr.next()) {
            rows.push({
                sys_id: '' + gr.getUniqueValue(),
                number: '' + gr.getValue('number'),
                automation: '' + gr.getDisplayValue('automation'),
                triggered_by: '' + gr.getDisplayValue('triggered_by'),
                group: '' + gr.getDisplayValue('group'),
                status: '' + gr.getValue('status'),
                channel: '' + gr.getValue('channel'),
                triggered_at: '' + gr.getValue('triggered_at')
            });
        }
        return rows;
    }

    function _searchDeliverables(term) {
        var rows = [];
        var gr = new GlideRecord(ART_TABLE);
        if (term) {
            var q = gr.addQuery('number', 'CONTAINS', term);
            q.addOrCondition('display_name', 'CONTAINS', term);
            q.addOrCondition('artifact_type', 'CONTAINS', term);
            q.addOrCondition('owner_group.name', 'CONTAINS', term);
            q.addOrCondition('status', 'CONTAINS', term);
        }
        gr.orderByDesc('sys_created_on');
        gr.setLimit(ROW_LIMIT);
        gr.query();
        while (gr.next()) {
            rows.push({
                sys_id: '' + gr.getUniqueValue(),
                number: '' + gr.getValue('number'),
                display_name: '' + gr.getValue('display_name'),
                artifact_type: '' + gr.getValue('artifact_type'),
                owner_group: '' + gr.getDisplayValue('owner_group'),
                created_by: '' + gr.getDisplayValue('created_by'),
                status: '' + gr.getValue('status'),
                created_at: '' + gr.getValue('sys_created_on')
            });
        }
        return rows;
    }
})();
