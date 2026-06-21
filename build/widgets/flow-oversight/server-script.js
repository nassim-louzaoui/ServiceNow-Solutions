(function() {
    var userSysId = gs.getUserID();
    var pr = new PermissionResolver();
    data.personSysId = pr.getPersonByUser(userSysId);
    data.message = '';
    data.error = '';

    if (input && input.action) {
        _handleAction(input);
    }

    data.flows = [];
    if (data.personSysId) {
        var ownedGroups = _ownedGroupSysIds(data.personSysId);
        if (ownedGroups.length) {
            _loadFlows(ownedGroups);
        }
    }

    function _ownedGroupSysIds(personSysId) {
        var ids = [];
        var grp = new GlideRecord('x_infte_ops_int_group');
        grp.addQuery('owner', personSysId);
        grp.addQuery('status', 'active');
        grp.query();
        while (grp.next()) {
            ids.push('' + grp.getUniqueValue());
        }
        return ids;
    }

    function _loadFlows(groupSysIds) {
        var ma = new GlideRecord('x_infte_ops_int_managed_artifact');
        ma.addQuery('artifact_type', 'flow');
        ma.addQuery('owner_group', 'IN', groupSysIds.join(','));
        ma.addQuery('status', 'IN', 'active,inactive');
        ma.orderByDesc('updated_at');
        ma.query();
        while (ma.next()) {
            var status = '' + ma.getValue('status');
            data.flows.push({
                sys_id: '' + ma.getUniqueValue(),
                number: '' + ma.getValue('number'),
                display_name: '' + ma.getValue('display_name'),
                description: '' + ma.getValue('description'),
                owner_group: '' + ma.getDisplayValue('owner_group'),
                created_by: '' + ma.getDisplayValue('created_by_person'),
                status: status,
                active: status === 'active',
                created_at: '' + ma.getValue('created_at'),
                last_activation_at: '' + ma.getValue('updated_at')
            });
        }
    }

    function _handleAction(inp) {
        if ('' + inp.action !== 'deactivate') {
            data.error = 'Unknown action.';
            return;
        }
        var artSysId = '' + (inp.artifact_sys_id || '');
        if (!artSysId) {
            data.error = 'Missing flow reference.';
            return;
        }
        var ma = new GlideRecord('x_infte_ops_int_managed_artifact');
        if (!ma.get(artSysId) || '' + ma.getValue('artifact_type') !== 'flow') {
            data.error = 'Flow not found.';
            return;
        }
        if (!new PermissionResolver().canManageGroup(userSysId, '' + ma.getValue('owner_group'))) {
            data.error = 'You do not manage this flow\'s group.';
            return;
        }
        if ('' + ma.getValue('status') !== 'active') {
            data.error = 'Flow is not currently active.';
            return;
        }
        var ok = new ArtifactManager().deactivate(artSysId);
        data.message = ok ? 'Flow deactivated.' : 'Could not deactivate flow.';
    }
})();
