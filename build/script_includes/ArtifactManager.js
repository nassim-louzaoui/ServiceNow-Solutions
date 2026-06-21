var ArtifactManager = Class.create();
ArtifactManager.prototype = {
    initialize: function() {
        this.MANAGED_ARTIFACT_TABLE = 'x_infte_ops_int_managed_artifact';
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.APPROVAL_REQUIRED_TYPES = {
            custom_table: true,
            ui_page: true
        };
        this.audit = new AuditService();
    },

    createArtifact: function(artifactType, displayName, description, ownerGroupSysId, createdByPersonSysId, creationSpec, copilotAssisted) {
        var type = '' + artifactType;
        var approvalRequired = this.APPROVAL_REQUIRED_TYPES[type] ? true : false;

        var gr = new GlideRecord(this.MANAGED_ARTIFACT_TABLE);
        gr.initialize();
        gr.setValue('display_name', '' + (displayName || ''));
        gr.setValue('description', '' + (description || ''));
        gr.setValue('artifact_type', type);
        if (ownerGroupSysId) {
            gr.setValue('owner_group', '' + ownerGroupSysId);
        }
        if (createdByPersonSysId) {
            gr.setValue('created_by_person', '' + createdByPersonSysId);
        }
        gr.setValue('approval_required', approvalRequired ? 'true' : 'false');
        gr.setValue('copilot_assisted', copilotAssisted ? 'true' : 'false');
        gr.setValue('creation_spec', this._specToString(creationSpec));
        gr.setValue('artifact_sys_ids', '[]');
        gr.setValue('status', approvalRequired ? 'pending_approval' : 'draft');
        gr.setValue('created_at', new GlideDateTime().getValue());
        gr.setValue('updated_at', new GlideDateTime().getValue());
        var artifactSysId = gr.insert();

        if (!artifactSysId) {
            this.audit.log('artifact_create_failed', { artifact_type: type });
            return null;
        }
        artifactSysId = '' + artifactSysId;

        this.audit.log('artifact_created', {
            artifact_sys_id: artifactSysId,
            artifact_type: type,
            approval_required: approvalRequired
        });

        if (approvalRequired) {
            this._createApprovalAction(artifactSysId, createdByPersonSysId, ownerGroupSysId);
        } else {
            this.build(artifactSysId);
        }
        return artifactSysId;
    },

    _createApprovalAction: function(artifactSysId, createdByPersonSysId, ownerGroupSysId) {
        var router = new ApprovalRouter();
        var creatorUserSysId = this._userForPerson(createdByPersonSysId);
        var resolution = router.resolveApprover(creatorUserSysId, ownerGroupSysId);
        if (!resolution || !resolution.approver_person_sys_id) {
            this.audit.log('artifact_approval_no_approver', { artifact_sys_id: artifactSysId });
            return null;
        }
        var pendingActionSysId = router.createApproval(
            'artifact_approval',
            creatorUserSysId,
            artifactSysId,
            'related_artifact',
            ownerGroupSysId,
            resolution.approver_person_sys_id,
            72
        );
        this.audit.log('artifact_approval_requested', {
            artifact_sys_id: artifactSysId,
            pending_action_sys_id: '' + pendingActionSysId,
            approver_person_sys_id: '' + resolution.approver_person_sys_id
        });
        return pendingActionSysId;
    },

    build: function(managedArtifactSysId) {
        var gr = new GlideRecord(this.MANAGED_ARTIFACT_TABLE);
        if (!gr.get(managedArtifactSysId)) {
            return null;
        }
        var type = '' + gr.getValue('artifact_type');
        var spec = gr.getValue('creation_spec');
        var creatorPersonSysId = '' + gr.getValue('created_by_person');

        var result = this._dispatchBuild(type, spec, creatorPersonSysId);
        var sysIds = (result && result.sys_ids) ? result.sys_ids : [];

        gr.setValue('artifact_sys_ids', JSON.stringify(sysIds));
        gr.setValue('status', 'active');
        gr.setValue('updated_at', new GlideDateTime().getValue());
        gr.update();

        if (type === 'flow') {
            this._notifyFlowActivated(managedArtifactSysId);
        }

        this.audit.log('artifact_built', {
            artifact_sys_id: '' + managedArtifactSysId,
            artifact_type: type,
            sys_ids: sysIds
        });
        return sysIds;
    },

    _dispatchBuild: function(type, spec, creatorPersonSysId) {
        if (type === 'report' || type === 'pa_dashboard') {
            return new ReportBuilder().build(spec);
        }
        if (type === 'notification_rule') {
            return new NotificationBuilder().buildNotificationRule(spec);
        }
        if (type === 'scheduled_data_job') {
            return new NotificationBuilder().buildScheduledDataJob(spec);
        }
        if (type === 'flow') {
            return new FlowBuilder().build(spec, creatorPersonSysId);
        }
        if (type === 'custom_table') {
            return new TableBuilder().build(spec);
        }
        if (type === 'ui_page') {
            return new UserInterfacePageBuilder().build(spec);
        }
        this.audit.log('artifact_unknown_type', { artifact_type: '' + type });
        return { sys_ids: [] };
    },

    approveArtifact: function(managedArtifactSysId, approverPersonSysId) {
        var gr = new GlideRecord(this.MANAGED_ARTIFACT_TABLE);
        if (!gr.get(managedArtifactSysId)) {
            return false;
        }
        gr.setValue('status', 'active');
        gr.setValue('approved_by', '' + (approverPersonSysId || ''));
        gr.setValue('approved_at', new GlideDateTime().getValue());
        gr.setValue('updated_at', new GlideDateTime().getValue());
        gr.update();

        this.audit.log('artifact_approved', {
            artifact_sys_id: '' + managedArtifactSysId,
            approver_person_sys_id: '' + (approverPersonSysId || '')
        });
        this.build(managedArtifactSysId);
        return true;
    },

    rejectArtifact: function(managedArtifactSysId, reason) {
        var gr = new GlideRecord(this.MANAGED_ARTIFACT_TABLE);
        if (!gr.get(managedArtifactSysId)) {
            return false;
        }
        gr.setValue('status', 'draft');
        gr.setValue('rejected_reason', '' + (reason || ''));
        gr.setValue('updated_at', new GlideDateTime().getValue());
        gr.update();

        this.audit.log('artifact_rejected', {
            artifact_sys_id: '' + managedArtifactSysId,
            reason: '' + (reason || '')
        });
        return true;
    },

    deactivate: function(managedArtifactSysId) {
        var gr = new GlideRecord(this.MANAGED_ARTIFACT_TABLE);
        if (!gr.get(managedArtifactSysId)) {
            return false;
        }
        var type = '' + gr.getValue('artifact_type');
        var sysIds = this._sysIdsFromArtifact(gr);
        this._builderDeactivate(type, sysIds);

        gr.setValue('status', 'inactive');
        gr.setValue('updated_at', new GlideDateTime().getValue());
        gr.update();

        this.audit.log('artifact_deactivated', {
            artifact_sys_id: '' + managedArtifactSysId,
            artifact_type: type
        });
        return true;
    },

    reactivate: function(managedArtifactSysId) {
        var gr = new GlideRecord(this.MANAGED_ARTIFACT_TABLE);
        if (!gr.get(managedArtifactSysId)) {
            return false;
        }
        var type = '' + gr.getValue('artifact_type');
        var sysIds = this._sysIdsFromArtifact(gr);
        this._builderReactivate(type, sysIds);

        gr.setValue('status', 'active');
        gr.setValue('updated_at', new GlideDateTime().getValue());
        gr.update();

        this.audit.log('artifact_reactivated', {
            artifact_sys_id: '' + managedArtifactSysId,
            artifact_type: type
        });
        return true;
    },

    archive: function(managedArtifactSysId) {
        var gr = new GlideRecord(this.MANAGED_ARTIFACT_TABLE);
        if (!gr.get(managedArtifactSysId)) {
            return false;
        }
        var type = '' + gr.getValue('artifact_type');
        var sysIds = this._sysIdsFromArtifact(gr);
        this._builderRemove(type, sysIds);

        gr.setValue('status', 'archived');
        gr.setValue('updated_at', new GlideDateTime().getValue());
        gr.update();

        this.audit.log('artifact_archived', {
            artifact_sys_id: '' + managedArtifactSysId,
            artifact_type: type,
            removed_sys_ids: sysIds
        });
        return true;
    },

    _builderDeactivate: function(type, sysIds) {
        if (type === 'report' || type === 'pa_dashboard') {
            new ReportBuilder().deactivate(sysIds);
        } else if (type === 'notification_rule' || type === 'scheduled_data_job') {
            new NotificationBuilder().deactivate(sysIds);
        } else if (type === 'flow') {
            new FlowBuilder().deactivate(sysIds);
        }
    },

    _builderReactivate: function(type, sysIds) {
        if (type === 'report' || type === 'pa_dashboard') {
            new ReportBuilder().deactivate(sysIds);
            this._setUnderlyingActive('sys_report', sysIds, true);
            this._setUnderlyingActive('pa_dashboards', sysIds, true);
        } else if (type === 'notification_rule') {
            this._setUnderlyingActive('sysevent_email_action', sysIds, true);
        } else if (type === 'scheduled_data_job') {
            this._setUnderlyingActive('sysauto_report', sysIds, true);
        } else if (type === 'flow') {
            this._setUnderlyingActive('sys_hub_flow', sysIds, true);
        }
    },

    _builderRemove: function(type, sysIds) {
        if (type === 'report' || type === 'pa_dashboard') {
            new ReportBuilder().remove(sysIds);
        } else if (type === 'notification_rule' || type === 'scheduled_data_job') {
            new NotificationBuilder().remove(sysIds);
        } else if (type === 'flow') {
            new FlowBuilder().remove(sysIds);
        } else if (type === 'custom_table') {
            new TableBuilder().remove(sysIds);
        } else if (type === 'ui_page') {
            new UserInterfacePageBuilder().remove(sysIds);
        }
    },

    _setUnderlyingActive: function(tableName, sysIds, isActive) {
        var i;
        for (i = 0; i < sysIds.length; i++) {
            var gr = new GlideRecord(tableName);
            if (gr.get(sysIds[i]) && gr.isValidField('active')) {
                gr.setValue('active', isActive ? 'true' : 'false');
                gr.update();
            }
        }
    },

    _notifyFlowActivated: function(managedArtifactSysId) {
        try {
            if (typeof NotificationService !== 'undefined' &&
                typeof new NotificationService().notifyFlowActivated === 'function') {
                new NotificationService().notifyFlowActivated(managedArtifactSysId);
            }
        } catch (e) {
            gs.error('x_infte_ops_int ArtifactManager flow notification failed: ' + e.message);
        }
    },

    _sysIdsFromArtifact: function(gr) {
        var raw = '' + gr.getValue('artifact_sys_ids');
        if (!raw) {
            return [];
        }
        try {
            var parsed = JSON.parse(raw);
            if (parsed && parsed.length !== undefined) {
                return parsed;
            }
        } catch (e) {}
        return [];
    },

    _userForPerson: function(personSysId) {
        if (!personSysId) {
            return null;
        }
        var person = new GlideRecord(this.PERSON_TABLE);
        if (person.get(personSysId)) {
            var u = '' + person.getValue('user');
            return u ? u : null;
        }
        return null;
    },

    _specToString: function(creationSpec) {
        if (creationSpec === null || creationSpec === undefined) {
            return '{}';
        }
        if (typeof creationSpec === 'string') {
            return creationSpec;
        }
        try {
            return JSON.stringify(creationSpec);
        } catch (e) {
            return '{}';
        }
    },

    type: 'ArtifactManager'
};
