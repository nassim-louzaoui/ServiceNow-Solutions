(function() {
    data.error = '';
    data.executions = [];
    data.step_log = null;

    var CHANNEL_LABELS = {
        va: 'Operations Assistant',
        portal: 'Portal',
        scheduled: 'Scheduled'
    };

    var permissions = new PermissionResolver();
    var userSysId = gs.getUserID();
    var personSysId = permissions.getPersonByUser(userSysId);

    if (!personSysId) {
        data.error = 'You are not yet provisioned in Operations Intelligence.';
        return;
    }

    if (input && input.action === 'step_log' && input.execution_sys_id) {
        data.step_log = loadStepLog('' + input.execution_sys_id, personSysId);
        return;
    }

    var limit = 50;
    if (input && input.limit) {
        var parsedLimit = parseInt('' + input.limit, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
            limit = parsedLimit;
        }
    }

    var exc = new GlideRecord('x_infte_ops_int_execution');
    exc.addQuery('triggered_by', personSysId);
    exc.orderByDesc('triggered_at');
    exc.setLimit(limit);
    exc.query();

    while (exc.next()) {
        var channel = '' + exc.getValue('channel');
        data.executions.push({
            sys_id: '' + exc.getUniqueValue(),
            number: '' + exc.getValue('number'),
            automation_name: '' + exc.getDisplayValue('automation'),
            status: '' + exc.getValue('status'),
            channel: channel,
            channel_label: CHANNEL_LABELS[channel] || channel,
            triggered_at: '' + exc.getDisplayValue('triggered_at'),
            completed_at: '' + exc.getDisplayValue('completed_at'),
            is_test: exc.getValue('is_test') == '1' || exc.getValue('is_test') === 'true'
        });
    }

    function loadStepLog(executionSysId, ownerPersonSysId) {
        var result = {
            execution_sys_id: executionSysId,
            steps: [],
            authorized: false
        };
        var ex = new GlideRecord('x_infte_ops_int_execution');
        if (!ex.get(executionSysId)) {
            return result;
        }
        if ('' + ex.getValue('triggered_by') !== '' + ownerPersonSysId) {
            return result;
        }
        result.authorized = true;

        var log = new GlideRecord('x_infte_ops_int_execution_step_log');
        log.addQuery('execution', executionSysId);
        log.orderBy('step_order');
        log.query();
        while (log.next()) {
            result.steps.push({
                step_order: parseInt('' + log.getValue('step_order'), 10) || 0,
                step_name: '' + log.getValue('step_name'),
                action_type: '' + log.getValue('action_type'),
                status: '' + log.getValue('status'),
                started_at: '' + log.getDisplayValue('started_at'),
                completed_at: '' + log.getDisplayValue('completed_at'),
                error_message: '' + log.getValue('error_message')
            });
        }
        return result;
    }
})();
