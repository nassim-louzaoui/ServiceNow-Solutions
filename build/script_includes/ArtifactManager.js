var ArtifactManager = Class.create();
ArtifactManager.prototype = {
    initialize: function() {
        this.APPROVAL_REQUIRED_TYPES = {
            custom_table: true,
            ui_page: true
        };
        this.audit = new AuditService();
    },

    createArtifact: function(artifactType, displayName, description, ownerGroupSysId, createdByPersonSysId, creationSpec, copilotAssisted) {
        var type = '' + artifactType;
        var approvalRequired = this.APPROVAL_REQUIRED_TYPES[type] ? true : false;
        var store = new OIDataStore();
        var artifactSysId = store.generateId();
        var artifactRecord = {
            sys_id: artifactSysId,
            display_name: '' + (displayName || ''),
            description: '' + (description || ''),
            artifact_type: type,
            owner_group: ownerGroupSysId ? ('' + ownerGroupSysId) : '',
            created_by_person: createdByPersonSysId ? ('' + createdByPersonSysId) : '',
            approval_required: approvalRequired,
            copilot_assisted: copilotAssisted ? true : false,
            creation_spec: this._specToString(creationSpec),
            artifact_sys_ids: '[]',
            status: approvalRequired ? 'pending_approval' : 'draft',
            created_at: new GlideDateTime().getValue(),
            updated_at: new GlideDateTime().getValue()
        };
        store.upsert('managed_artifacts', artifactRecord);

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
        var store = new OIDataStore();
        var artifact = store.get('managed_artifacts', '' + managedArtifactSysId);
        if (!artifact) {
            return null;
        }
        var type = '' + (artifact.artifact_type || '');
        var spec = artifact.creation_spec;
        var creatorPersonSysId = '' + (artifact.created_by_person || '');

        var result = this._dispatchBuild(type, spec, creatorPersonSysId);
        var sysIds = (result && result.sys_ids) ? result.sys_ids : [];

        artifact.artifact_sys_ids = JSON.stringify(sysIds);
        artifact.status = 'active';
        artifact.updated_at = new GlideDateTime().getValue();
        store.upsert('managed_artifacts', artifact);

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
        var store = new OIDataStore();
        var artifact = store.get('managed_artifacts', '' + managedArtifactSysId);
        if (!artifact) {
            return false;
        }
        artifact.status = 'active';
        artifact.approved_by = '' + (approverPersonSysId || '');
        artifact.approved_at = new GlideDateTime().getValue();
        artifact.updated_at = new GlideDateTime().getValue();
        store.upsert('managed_artifacts', artifact);

        this.audit.log('artifact_approved', {
            artifact_sys_id: '' + managedArtifactSysId,
            approver_person_sys_id: '' + (approverPersonSysId || '')
        });
        this.build(managedArtifactSysId);
        return true;
    },

    rejectArtifact: function(managedArtifactSysId, reason) {
        var store = new OIDataStore();
        var artifact = store.get('managed_artifacts', '' + managedArtifactSysId);
        if (!artifact) {
            return false;
        }
        artifact.status = 'draft';
        artifact.rejected_reason = '' + (reason || '');
        artifact.updated_at = new GlideDateTime().getValue();
        store.upsert('managed_artifacts', artifact);

        this.audit.log('artifact_rejected', {
            artifact_sys_id: '' + managedArtifactSysId,
            reason: '' + (reason || '')
        });
        return true;
    },

    deactivate: function(managedArtifactSysId) {
        var store = new OIDataStore();
        var artifact = store.get('managed_artifacts', '' + managedArtifactSysId);
        if (!artifact) {
            return false;
        }
        var type = '' + (artifact.artifact_type || '');
        var sysIds = this._sysIdsFromArtifact(artifact);
        this._builderDeactivate(type, sysIds);

        artifact.status = 'inactive';
        artifact.updated_at = new GlideDateTime().getValue();
        store.upsert('managed_artifacts', artifact);

        this.audit.log('artifact_deactivated', {
            artifact_sys_id: '' + managedArtifactSysId,
            artifact_type: type
        });
        return true;
    },

    reactivate: function(managedArtifactSysId) {
        var store = new OIDataStore();
        var artifact = store.get('managed_artifacts', '' + managedArtifactSysId);
        if (!artifact) {
            return false;
        }
        var type = '' + (artifact.artifact_type || '');
        var sysIds = this._sysIdsFromArtifact(artifact);
        this._builderReactivate(type, sysIds);

        artifact.status = 'active';
        artifact.updated_at = new GlideDateTime().getValue();
        store.upsert('managed_artifacts', artifact);

        this.audit.log('artifact_reactivated', {
            artifact_sys_id: '' + managedArtifactSysId,
            artifact_type: type
        });
        return true;
    },

    archive: function(managedArtifactSysId) {
        var store = new OIDataStore();
        var artifact = store.get('managed_artifacts', '' + managedArtifactSysId);
        if (!artifact) {
            return false;
        }
        var type = '' + (artifact.artifact_type || '');
        var sysIds = this._sysIdsFromArtifact(artifact);
        this._builderRemove(type, sysIds);

        artifact.status = 'archived';
        artifact.updated_at = new GlideDateTime().getValue();
        store.upsert('managed_artifacts', artifact);

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

    _sysIdsFromArtifact: function(artifact) {
        var raw = '' + (artifact.artifact_sys_ids || '');
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
        var store = new OIDataStore();
        var person = store.get('persons', '' + personSysId);
        if (!person) {
            return null;
        }
        var u = '' + (person.user_sys_id || '');
        return u ? u : null;
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
