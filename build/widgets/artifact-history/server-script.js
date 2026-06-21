(function() {
    var userSysId = gs.getUserID();
    var pr = new PermissionResolver();
    data.personSysId = pr.getPersonByUser(userSysId);
    data.artifacts = [];

    if (!data.personSysId) {
        return;
    }

    var ma = new GlideRecord('x_infte_ops_int_managed_artifact');
    ma.addQuery('created_by_person', data.personSysId);
    ma.orderByDesc('updated_at');
    ma.query();
    while (ma.next()) {
        var status = '' + ma.getValue('status');
        data.artifacts.push({
            sys_id: '' + ma.getUniqueValue(),
            number: '' + ma.getValue('number'),
            display_name: '' + ma.getValue('display_name'),
            description: '' + ma.getValue('description'),
            artifact_type: '' + ma.getValue('artifact_type'),
            owner_group: '' + ma.getDisplayValue('owner_group'),
            status: status,
            is_draft: status === 'draft',
            pending_approval: status === 'pending_approval',
            rejected_reason: '' + ma.getValue('rejected_reason'),
            created_at: '' + ma.getValue('created_at'),
            updated_at: '' + ma.getValue('updated_at')
        });
    }
})();
