(function() {
    data.authorized = false;
    data.groups = [];
    data.totals = { executions: 0, time_saved: 0, deliverables: 0 };

    var userSysId = gs.getUserID();
    var pr = new PermissionResolver();
    var role = pr.getSystemRole(userSysId);
    data.role = role;

    var isLeadership = pr.hasRole(userSysId, 'x_infte_ops_int.leadership');
    var isAdmin = pr.hasRole(userSysId, 'admin');

    if (!isLeadership && !isAdmin) {
        data.message = 'Group Metrics is available to leadership and administrators only.';
        return;
    }
    data.authorized = true;

    var EXEC_TABLE = 'x_infte_ops_int_execution';
    var AUTO_TABLE = 'x_infte_ops_int_automation';
    var ART_TABLE = 'x_infte_ops_int_managed_artifact';

    var leaderGroups = _resolveLeaderGroups(userSysId, isAdmin, pr);

    var groupSysIds = [];
    var groupIndex = {};
    var i;
    for (i = 0; i < leaderGroups.length; i++) {
        var g = leaderGroups[i];
        groupSysIds.push(g.group_sys_id);
        groupIndex[g.group_sys_id] = {
            group_sys_id: g.group_sys_id,
            group_name: g.group_name,
            executions: 0,
            time_saved: 0,
            deliverables: 0
        };
    }

    if (groupSysIds.length === 0) {
        data.message = 'No groups are available for metrics.';
        data.groups = [];
        return;
    }

    _aggregateExecutions(groupSysIds, groupIndex);
    _aggregateTimeSaved(groupSysIds, groupIndex);
    _aggregateDeliverables(groupSysIds, groupIndex);

    var rows = [];
    var maxExec = 0;
    var maxTime = 0;
    var maxDeliv = 0;
    for (i = 0; i < groupSysIds.length; i++) {
        var row = groupIndex[groupSysIds[i]];
        rows.push(row);
        data.totals.executions += row.executions;
        data.totals.time_saved += row.time_saved;
        data.totals.deliverables += row.deliverables;
        if (row.executions > maxExec) { maxExec = row.executions; }
        if (row.time_saved > maxTime) { maxTime = row.time_saved; }
        if (row.deliverables > maxDeliv) { maxDeliv = row.deliverables; }
    }

    for (i = 0; i < rows.length; i++) {
        rows[i].exec_pct = maxExec > 0 ? Math.round((rows[i].executions / maxExec) * 100) : 0;
        rows[i].time_pct = maxTime > 0 ? Math.round((rows[i].time_saved / maxTime) * 100) : 0;
        rows[i].deliv_pct = maxDeliv > 0 ? Math.round((rows[i].deliverables / maxDeliv) * 100) : 0;
        rows[i].time_saved_hours = Math.round((rows[i].time_saved / 60) * 10) / 10;
    }

    data.totals.time_saved_hours = Math.round((data.totals.time_saved / 60) * 10) / 10;
    data.groups = rows;

    function _resolveLeaderGroups(uid, adminFlag, perm) {
        var result = [];
        var seen = {};
        if (adminFlag) {
            var allGr = new GlideRecord('x_infte_ops_int_group');
            allGr.addQuery('status', 'active');
            allGr.orderBy('name');
            allGr.query();
            while (allGr.next()) {
                result.push({
                    group_sys_id: '' + allGr.getUniqueValue(),
                    group_name: '' + allGr.getValue('name')
                });
            }
            return result;
        }

        var personSysId = perm.getPersonByUser(uid);
        if (personSysId) {
            var ownGr = new GlideRecord('x_infte_ops_int_group');
            ownGr.addQuery('owner', personSysId);
            ownGr.addQuery('status', 'active');
            ownGr.orderBy('name');
            ownGr.query();
            while (ownGr.next()) {
                var oid = '' + ownGr.getUniqueValue();
                if (!seen[oid]) {
                    seen[oid] = true;
                    result.push({ group_sys_id: oid, group_name: '' + ownGr.getValue('name') });
                }
            }
        }

        var memberGroups = perm.getUserGroups(uid);
        var k;
        for (k = 0; k < memberGroups.length; k++) {
            var mg = memberGroups[k];
            if (!seen[mg.group_sys_id]) {
                seen[mg.group_sys_id] = true;
                result.push({ group_sys_id: mg.group_sys_id, group_name: mg.group_name });
            }
        }
        return result;
    }

    function _aggregateExecutions(ids, idx) {
        var ga = new GlideAggregate(EXEC_TABLE);
        ga.addQuery('group', 'IN', ids.join(','));
        ga.addQuery('is_test', false);
        ga.addAggregate('COUNT');
        ga.groupBy('group');
        ga.query();
        while (ga.next()) {
            var gid = '' + ga.getValue('group');
            if (idx[gid]) {
                idx[gid].executions = parseInt(ga.getAggregate('COUNT'), 10) || 0;
            }
        }
    }

    function _aggregateTimeSaved(ids, idx) {
        var autoTime = {};
        var autoGroup = {};
        var ga = new GlideRecord(AUTO_TABLE);
        ga.addQuery('owner_group', 'IN', ids.join(','));
        ga.query();
        while (ga.next()) {
            var aid = '' + ga.getUniqueValue();
            autoTime[aid] = parseInt(ga.getValue('estimated_time_saved') || '0', 10) || 0;
            autoGroup[aid] = '' + ga.getValue('owner_group');
        }

        var execAgg = new GlideAggregate(EXEC_TABLE);
        execAgg.addQuery('group', 'IN', ids.join(','));
        execAgg.addQuery('status', 'success');
        execAgg.addQuery('is_test', false);
        execAgg.addAggregate('COUNT');
        execAgg.groupBy('automation');
        execAgg.groupBy('group');
        execAgg.query();
        while (execAgg.next()) {
            var autoId = '' + execAgg.getValue('automation');
            var grpId = '' + execAgg.getValue('group');
            var usage = parseInt(execAgg.getAggregate('COUNT'), 10) || 0;
            var per = autoTime.hasOwnProperty(autoId) ? autoTime[autoId] : _lookupTimeSaved(autoId);
            if (idx[grpId]) {
                idx[grpId].time_saved += per * usage;
            }
        }
    }

    function _lookupTimeSaved(autoId) {
        var gr = new GlideRecord(AUTO_TABLE);
        if (gr.get(autoId)) {
            return parseInt(gr.getValue('estimated_time_saved') || '0', 10) || 0;
        }
        return 0;
    }

    function _aggregateDeliverables(ids, idx) {
        var ga = new GlideAggregate(ART_TABLE);
        ga.addQuery('owner_group', 'IN', ids.join(','));
        ga.addQuery('status', 'active');
        ga.addAggregate('COUNT');
        ga.groupBy('owner_group');
        ga.query();
        while (ga.next()) {
            var gid = '' + ga.getValue('owner_group');
            if (idx[gid]) {
                idx[gid].deliverables = parseInt(ga.getAggregate('COUNT'), 10) || 0;
            }
        }
    }
})();
