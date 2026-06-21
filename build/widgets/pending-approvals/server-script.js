(function() {
    var userSysId = gs.getUserID();
    var pr = new PermissionResolver();
    data.personSysId = pr.getPersonByUser(userSysId);
    data.role = pr.getSystemRole(userSysId);
    data.message = '';
    data.error = '';

    if (input && input.action) {
        _handleAction(input);
    }

    data.approvals = [];
    if (data.personSysId) {
        _loadQueue(data.personSysId);
    }

    function _loadQueue(personSysId) {
        var pa = new GlideRecord('x_infte_ops_int_pending_action');
        pa.addQuery('assigned_to', personSysId);
        pa.addQuery('action_type', 'IN', 'automation_approval,artifact_approval');
        pa.addQuery('status', 'IN', 'pending,escalated');
        pa.orderBy('deadline_at');
        pa.query();
        while (pa.next()) {
            var actionType = '' + pa.getValue('action_type');
            var item = {
                sys_id: '' + pa.getUniqueValue(),
                number: '' + pa.getValue('number'),
                action_type: actionType,
                status: '' + pa.getValue('status'),
                escalated: '' + pa.getValue('status') === 'escalated',
                deadline_at: '' + pa.getValue('deadline_at'),
                created_at: '' + pa.getValue('created_at'),
                related_group: '' + pa.getDisplayValue('related_group'),
                subject_user: '' + pa.getDisplayValue('subject_user'),
                title: '',
                subtitle: '',
                target_sys_id: '',
                target_type: ''
            };
            if (actionType === 'automation_approval') {
                var autoSysId = '' + pa.getValue('related_automation');
                item.target_sys_id = autoSysId;
                item.target_type = 'automation';
                var auto = new GlideRecord('x_infte_ops_int_automation');
                if (auto.get(autoSysId)) {
                    item.title = '' + auto.getValue('name');
                    item.subtitle = '' + auto.getValue('short_description');
                    item.ref_number = '' + auto.getValue('number');
                }
            } else {
                var artSysId = '' + pa.getValue('related_artifact');
                item.target_sys_id = artSysId;
                item.target_type = 'artifact';
                var art = new GlideRecord('x_infte_ops_int_managed_artifact');
                if (art.get(artSysId)) {
                    item.title = '' + art.getValue('display_name');
                    item.subtitle = '' + art.getValue('artifact_type');
                    item.ref_number = '' + art.getValue('number');
                }
            }
            data.approvals.push(item);
        }
    }

    function _handleAction(inp) {
        var paSysId = '' + (inp.pending_action_sys_id || '');
        var decision = '' + (inp.action || '');
        if (!paSysId) {
            data.error = 'Missing pending action reference.';
            return;
        }

        var pa = new GlideRecord('x_infte_ops_int_pending_action');
        if (!pa.get(paSysId)) {
            data.error = 'Pending action not found.';
            return;
        }
        if ('' + pa.getValue('assigned_to') !== '' + data.personSysId) {
            data.error = 'This approval is not assigned to you.';
            return;
        }
        var paStatus = '' + pa.getValue('status');
        if (paStatus !== 'pending' && paStatus !== 'escalated') {
            data.error = 'This approval has already been actioned.';
            return;
        }

        var actionType = '' + pa.getValue('action_type');

        if (decision === 'reject') {
            var reason = '' + (inp.reason || '');
            if (!reason) {
                data.error = 'A reason is required to reject.';
                return;
            }
            if (actionType === 'automation_approval') {
                _rejectAutomation('' + pa.getValue('related_automation'), reason);
            } else {
                new ArtifactManager().rejectArtifact('' + pa.getValue('related_artifact'), reason);
            }
            _resolvePending(pa, 'rejected', reason);
            data.message = 'Request rejected.';
            return;
        }

        if (decision === 'approve') {
            if (actionType === 'automation_approval') {
                _approveAutomation('' + pa.getValue('related_automation'));
            } else {
                new ArtifactManager().approveArtifact('' + pa.getValue('related_artifact'), data.personSysId);
            }
            _resolvePending(pa, 'approved', '' + (inp.reason || ''));
            data.message = 'Request approved.';
            return;
        }

        data.error = 'Unknown action.';
    }

    function _approveAutomation(automationSysId) {
        if (!automationSysId) {
            return;
        }
        var auto = new GlideRecord('x_infte_ops_int_automation');
        if (!auto.get(automationSysId)) {
            return;
        }
        auto.setValue('status', 'published');
        auto.setValue('approved_by', '' + data.personSysId);
        auto.setValue('approved_at', new GlideDateTime().getValue());
        auto.update();
        new CatalogService().onPublish(automationSysId);
    }

    function _rejectAutomation(automationSysId, reason) {
        if (!automationSysId) {
            return;
        }
        var auto = new GlideRecord('x_infte_ops_int_automation');
        if (!auto.get(automationSysId)) {
            return;
        }
        auto.setValue('status', 'draft');
        auto.setValue('rejected_reason', reason);
        auto.setValue('rejected_by', '' + data.personSysId);
        auto.setValue('rejected_at', new GlideDateTime().getValue());
        auto.update();
    }

    function _resolvePending(pa, resolution, notes) {
        pa.setValue('status', 'actioned');
        pa.setValue('resolution', resolution);
        pa.setValue('actioned_by', '' + data.personSysId);
        pa.setValue('actioned_at', new GlideDateTime().getValue());
        if (notes) {
            pa.setValue('notes', notes);
        }
        pa.update();
    }
})();
