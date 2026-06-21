(function() {
    var PERSON_TABLE = 'x_infte_ops_int_person';
    var GROUP_TABLE = 'x_infte_ops_int_group';
    var ONBOARDING_REQUEST_TABLE = 'x_infte_ops_int_onboarding_request';

    var userSysId = gs.getUserID();

    data.request = null;
    data.completed = false;
    data.error = '';
    data.userName = '';

    var su = new GlideRecord('sys_user');
    if (su.get(userSysId)) {
        data.userName = '' + su.getDisplayValue('name');
    }

    function loadPendingRequest() {
        var pr = new PermissionResolver();
        var personSysId = pr.getPersonByUser(userSysId);
        if (!personSysId) {
            return null;
        }
        var req = new GlideRecord(ONBOARDING_REQUEST_TABLE);
        req.addQuery('nominee', personSysId);
        req.addQuery('status', 'pending');
        req.orderByDesc('invited_at');
        req.setLimit(1);
        req.query();
        if (!req.next()) {
            return null;
        }
        var groupName = '';
        var groupSysId = '' + req.getValue('target_group');
        if (groupSysId) {
            var grp = new GlideRecord(GROUP_TABLE);
            if (grp.get(groupSysId)) {
                groupName = '' + grp.getValue('name');
            }
        }
        return {
            sys_id: '' + req.getUniqueValue(),
            number: '' + req.getValue('number'),
            status: '' + req.getValue('status'),
            system_role: '' + req.getValue('system_role'),
            group_role: '' + req.getValue('group_role'),
            group_sys_id: groupSysId,
            group_name: groupName,
            invited_at: '' + req.getValue('invited_at'),
            expiry_at: '' + req.getValue('expiry_at')
        };
    }

    if (input && input.action === 'complete' && input.requestSysId) {
        var pr2 = new PermissionResolver();
        var personSysId2 = pr2.getPersonByUser(userSysId);
        var check = new GlideRecord(ONBOARDING_REQUEST_TABLE);
        if (check.get('' + input.requestSysId) &&
            personSysId2 &&
            '' + check.getValue('nominee') === '' + personSysId2 &&
            '' + check.getValue('status') === 'pending') {
            var result = new OnboardingService().completeOnboarding('' + input.requestSysId);
            data.completed = !!result.completed;
            if (!result.completed) {
                data.error = result.error || 'completion_failed';
            }
        } else {
            data.error = 'invalid_request';
        }
    }

    data.request = loadPendingRequest();
})();
