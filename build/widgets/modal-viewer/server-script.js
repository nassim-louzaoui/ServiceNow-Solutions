(function() {
    data.error = '';
    data.artifact_type = '';
    data.display_name = '';
    data.target_url = '';
    data.info = null;
    data.has_access = false;

    var artifactSysId = '';
    if (input && input.artifact_sys_id) {
        artifactSysId = '' + input.artifact_sys_id;
    } else if (options && options.artifact_sys_id) {
        artifactSysId = '' + options.artifact_sys_id;
    } else if (typeof $sp !== 'undefined' && $sp.getParameter('artifact_sys_id')) {
        artifactSysId = '' + $sp.getParameter('artifact_sys_id');
    }

    if (!artifactSysId) {
        data.error = 'No artifact specified.';
        return;
    }

    var permissions = new PermissionResolver();
    var userSysId = gs.getUserID();
    var personSysId = permissions.getPersonByUser(userSysId);

    if (!personSysId) {
        data.error = 'You are not provisioned in Operations Intelligence.';
        return;
    }

    var ma = new GlideRecord('x_infte_ops_int_managed_artifact');
    if (!ma.get(artifactSysId)) {
        data.error = 'Artifact not found.';
        return;
    }

    var ownerGroupSysId = '' + ma.getValue('owner_group');
    if (!permissions.isMemberOf(userSysId, ownerGroupSysId) &&
        !permissions.hasRole(userSysId, 'admin')) {
        data.error = 'You do not have access to this deliverable.';
        return;
    }
    data.has_access = true;

    var artifactType = '' + ma.getValue('artifact_type');
    data.artifact_type = artifactType;
    data.display_name = '' + ma.getValue('display_name');

    var artifactSysIds = [];
    try {
        var parsed = JSON.parse('' + ma.getValue('artifact_sys_ids'));
        if (parsed && parsed.length) {
            artifactSysIds = parsed;
        }
    } catch (e) {
        artifactSysIds = [];
    }
    var primarySysId = artifactSysIds.length ? ('' + artifactSysIds[0]) : '';

    var creationSpec = {};
    try {
        creationSpec = JSON.parse('' + ma.getValue('creation_spec')) || {};
    } catch (e2) {
        creationSpec = {};
    }

    if (input && input.target_url) {
        data.target_url = '' + input.target_url;
    }

    if (artifactType === 'report') {
        if (!data.target_url && primarySysId) {
            data.target_url = 'report_viewer.do?sysparm_report=' + primarySysId;
        }
    } else if (artifactType === 'pa_dashboard') {
        if (!data.target_url && primarySysId) {
            data.target_url = '$pa_dashboard.do?sysparm_dashboard=' + primarySysId;
        }
    } else if (artifactType === 'ui_page') {
        if (!data.target_url && primarySysId) {
            data.target_url = primarySysId + '.do';
        }
    } else if (artifactType === 'custom_table') {
        if (!data.target_url && primarySysId) {
            data.target_url = primarySysId + '_list.do';
        }
    } else {
        data.info = buildInfo(artifactType, ma, creationSpec, primarySysId);
    }

    function buildInfo(type, gr, spec, recordSysId) {
        var info = {
            type: type,
            fields: [],
            recent_activity: []
        };
        info.fields.push({ label: 'Status', value: '' + gr.getValue('status') });
        info.fields.push({ label: 'Owner Group', value: '' + gr.getDisplayValue('owner_group') });
        info.fields.push({ label: 'Created By', value: '' + gr.getDisplayValue('created_by_person') });
        info.fields.push({ label: 'Created At', value: '' + gr.getDisplayValue('created_at') });

        if (type === 'notification_rule') {
            info.fields.push({ label: 'Target Table', value: specVal(spec, 'table') });
            info.fields.push({ label: 'Condition', value: specVal(spec, 'condition') });
            info.fields.push({ label: 'Recipients', value: specVal(spec, 'recipients') });
            info.fields.push({ label: 'Fires On', value: specVal(spec, 'when') });
        } else if (type === 'scheduled_data_job') {
            info.fields.push({ label: 'Target Table', value: specVal(spec, 'table') });
            info.fields.push({ label: 'Filters', value: specVal(spec, 'filters') });
            info.fields.push({ label: 'Schedule', value: specVal(spec, 'schedule') });
            info.fields.push({ label: 'Recipients', value: specVal(spec, 'recipients') });
            info.fields.push({ label: 'Last Run', value: specVal(spec, 'last_run') });
            info.fields.push({ label: 'Next Run', value: specVal(spec, 'next_run') });
        } else if (type === 'flow') {
            info.fields.push({ label: 'Trigger', value: specVal(spec, 'trigger') });
            info.fields.push({ label: 'Condition', value: specVal(spec, 'condition') });
            info.fields.push({ label: 'Action Summary', value: specVal(spec, 'action_summary') });
        }
        return info;
    }

    function specVal(spec, key) {
        if (spec && spec[key] !== undefined && spec[key] !== null && spec[key] !== '') {
            if (typeof spec[key] === 'object') {
                return JSON.stringify(spec[key]);
            }
            return '' + spec[key];
        }
        return 'Not specified';
    }
})();
