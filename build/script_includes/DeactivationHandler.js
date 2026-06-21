var DeactivationHandler = Class.create();
DeactivationHandler.prototype = {
    initialize: function() {
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.RELATIONSHIP_TABLE = 'x_infte_ops_int_reporting_relationship';
        this.GROUP_MEMBER_TABLE = 'x_infte_ops_int_group_member';
        this.CREATOR_CREDENTIAL_TABLE = 'x_infte_ops_int_creator_credential';
        this.PENDING_ACTION_TABLE = 'x_infte_ops_int_pending_action';
        this.ROLE_CREATOR = 'x_infte_ops_int.creator';
        this.ROLE_ADMIN = 'admin';
        this.USER_DEACTIVATION_HOURS = 48;
        this.LEADER_REASSIGNMENT_HOURS = 72;
        this.TEMPLATE_USER_DEACTIVATION_ALERT = 'Operations Intelligence - User Deactivation Alert';
        this.TEMPLATE_LEADER_REASSIGNMENT = 'Operations Intelligence - Leader Reassignment Required';
        this.TEMPLATE_AUTO_REMOVAL_EXECUTED = 'Operations Intelligence - Auto Removal Executed';
    },

    handle: function(userSysId) {
        if (!userSysId) {
            return { handled: false, error: 'missing_user' };
        }
        var personSysId = new PermissionResolver().getPersonByUser(userSysId);
        if (!personSysId) {
            gs.info('x_infte_ops_int DeactivationHandler: no person record for user ' + userSysId);
            return { handled: false, error: 'no_person_record' };
        }
        if (this._isLeader(personSysId)) {
            return this.handleLeaderDeactivation(personSysId);
        }
        return this.handleUserDeactivation(personSysId);
    },

    _isLeader: function(personSysId) {
        var rel = new GlideRecord(this.RELATIONSHIP_TABLE);
        rel.addQuery('leader', personSysId);
        rel.addQuery('status', 'active');
        rel.setLimit(1);
        rel.query();
        return rel.hasNext();
    },

    _userSysIdForPerson: function(personSysId) {
        if (!personSysId) {
            return null;
        }
        var person = new GlideRecord(this.PERSON_TABLE);
        if (!person.get(personSysId)) {
            return null;
        }
        var userSysId = '' + person.getValue('user');
        return userSysId ? userSysId : null;
    },

    _getPrimaryLeaderPerson: function(personSysId) {
        return new ApprovalRouter().getPrimaryLeader(personSysId);
    },

    _hasAwaitingApproval: function(personSysId) {
        var userSysId = this._userSysIdForPerson(personSysId);
        if (!userSysId) {
            return false;
        }
        var triggeredByPerson = personSysId;
        var exec = new GlideRecord('x_infte_ops_int_execution');
        exec.addQuery('triggered_by', triggeredByPerson);
        exec.addQuery('status', 'awaiting_approval');
        exec.setLimit(1);
        exec.query();
        return exec.hasNext();
    },

    handleUserDeactivation: function(personSysId) {
        var leaderPersonSysId = this._getPrimaryLeaderPerson(personSysId);
        var router = new ApprovalRouter();
        var approverPersonSysId = leaderPersonSysId;
        if (!approverPersonSysId) {
            var resolved = router.resolveApprover(this._userSysIdForPerson(personSysId), null);
            approverPersonSysId = resolved.approver_person_sys_id;
        }
        if (!approverPersonSysId) {
            gs.error('x_infte_ops_int DeactivationHandler.handleUserDeactivation no approver for person ' + personSysId);
            return { handled: false, error: 'no_approver' };
        }

        var notes = 'User deactivated; leader action required within ' + this.USER_DEACTIVATION_HOURS + ' hours.';
        if (this._hasAwaitingApproval(personSysId)) {
            notes += ' NOTE: user has executions awaiting approval.';
        }

        var userSysId = this._userSysIdForPerson(personSysId);
        var paSysId = router.createApproval('user_deactivation', userSysId, null, null, null, approverPersonSysId, this.USER_DEACTIVATION_HOURS);
        if (paSysId) {
            var pa = new GlideRecord(this.PENDING_ACTION_TABLE);
            if (pa.get(paSysId)) {
                pa.setValue('notes', notes);
                pa.update();
            }
        }

        var leaderUserSysId = this._userSysIdForPerson(approverPersonSysId);
        new NotificationService().send(this.TEMPLATE_USER_DEACTIVATION_ALERT, leaderUserSysId, {
            subject_person: personSysId,
            pending_action_sys_id: paSysId ? ('' + paSysId) : '',
            deadline_hours: this.USER_DEACTIVATION_HOURS
        });
        new AuditService().log('user_deactivation_detected', {
            person_sys_id: personSysId,
            pending_action_sys_id: paSysId ? ('' + paSysId) : '',
            assigned_to: '' + approverPersonSysId
        });

        return { handled: true, type: 'user_deactivation', pending_action_sys_id: paSysId ? ('' + paSysId) : null };
    },

    handleLeaderDeactivation: function(personSysId) {
        var theirLeaderPersonSysId = this._getPrimaryLeaderPerson(personSysId);
        var router = new ApprovalRouter();
        var approverPersonSysId = theirLeaderPersonSysId;
        if (!approverPersonSysId) {
            var resolved = router.resolveApprover(this._userSysIdForPerson(personSysId), null);
            approverPersonSysId = resolved.approver_person_sys_id;
        }

        var userSysId = this._userSysIdForPerson(personSysId);
        var paSysId = router.createApproval('leader_reassignment', userSysId, null, null, null, approverPersonSysId, this.LEADER_REASSIGNMENT_HOURS);

        var notifService = new NotificationService();
        var context = {
            subject_person: personSysId,
            pending_action_sys_id: paSysId ? ('' + paSysId) : '',
            deadline_hours: this.LEADER_REASSIGNMENT_HOURS
        };
        var leaderUserSysId = this._userSysIdForPerson(approverPersonSysId);
        if (leaderUserSysId) {
            notifService.send(this.TEMPLATE_LEADER_REASSIGNMENT, leaderUserSysId, context);
        }
        this._notifyAdmins(this.TEMPLATE_LEADER_REASSIGNMENT, context);

        var reassignedTo = approverPersonSysId;
        var reassignedCount = this._reassignPendingApprovals(personSysId, reassignedTo);

        new AuditService().log('leader_deactivation_detected', {
            person_sys_id: personSysId,
            pending_action_sys_id: paSysId ? ('' + paSysId) : '',
            reassigned_to: reassignedTo ? ('' + reassignedTo) : '',
            reassigned_approvals: reassignedCount
        });

        return {
            handled: true,
            type: 'leader_reassignment',
            pending_action_sys_id: paSysId ? ('' + paSysId) : null,
            reassigned_approvals: reassignedCount
        };
    },

    _notifyAdmins: function(templateName, context) {
        var person = new GlideRecord(this.PERSON_TABLE);
        person.addQuery('active', true);
        person.query();
        while (person.next()) {
            var userSysId = '' + person.getValue('user');
            if (!userSysId) {
                continue;
            }
            var gu = gs.getUser().getUserByID(userSysId);
            if (gu && gu.hasRole(this.ROLE_ADMIN)) {
                new NotificationService().send(templateName, userSysId, context);
            }
        }
    },

    _reassignPendingApprovals: function(fromPersonSysId, toPersonSysId) {
        if (!toPersonSysId) {
            return 0;
        }
        var count = 0;
        var pa = new GlideRecord(this.PENDING_ACTION_TABLE);
        pa.addQuery('assigned_to', fromPersonSysId);
        pa.addQuery('action_type', 'IN', 'automation_approval,artifact_approval');
        pa.addQuery('status', 'IN', 'pending,escalated');
        pa.query();
        while (pa.next()) {
            pa.setValue('assigned_to', '' + toPersonSysId);
            pa.setValue('notes', ('' + (pa.getValue('notes') || '')) +
                ' Reassigned from deactivated leader.');
            pa.update();
            count++;
        }
        return count;
    },

    executeRemoval: function(personSysId) {
        if (!personSysId) {
            return { removed: false, error: 'missing_person' };
        }
        var userSysId = this._userSysIdForPerson(personSysId);

        var gmCount = 0;
        var gm = new GlideRecord(this.GROUP_MEMBER_TABLE);
        gm.addQuery('member', personSysId);
        gm.addQuery('status', 'active');
        gm.query();
        while (gm.next()) {
            gm.setValue('status', 'inactive');
            gm.update();
            gmCount++;
        }

        this._revokeCreatorRole(userSysId);
        this._revokeCreatorCredential(personSysId);

        var relCount = 0;
        var rel = new GlideRecord(this.RELATIONSHIP_TABLE);
        rel.addQuery('direct_report', personSysId);
        rel.addQuery('status', 'active');
        rel.query();
        while (rel.next()) {
            rel.setValue('status', 'inactive');
            rel.update();
            relCount++;
        }
        var relAsLeader = new GlideRecord(this.RELATIONSHIP_TABLE);
        relAsLeader.addQuery('leader', personSysId);
        relAsLeader.addQuery('status', 'active');
        relAsLeader.query();
        while (relAsLeader.next()) {
            relAsLeader.setValue('status', 'inactive');
            relAsLeader.update();
            relCount++;
        }

        var leaderPersonSysId = this._getPrimaryLeaderPerson(personSysId);
        var reassignedCount = this._reassignPendingApprovals(personSysId, leaderPersonSysId);

        this._deactivatePerson(personSysId);

        var leaderUserSysId = this._userSysIdForPerson(leaderPersonSysId);
        new NotificationService().send(this.TEMPLATE_AUTO_REMOVAL_EXECUTED, leaderUserSysId, {
            subject_person: personSysId,
            group_memberships_removed: gmCount,
            relationships_inactivated: relCount,
            approvals_reassigned: reassignedCount
        });
        new AuditService().log('auto_removal_executed', {
            person_sys_id: personSysId,
            group_memberships_removed: gmCount,
            relationships_inactivated: relCount,
            approvals_reassigned: reassignedCount
        });

        return {
            removed: true,
            group_memberships_removed: gmCount,
            relationships_inactivated: relCount,
            approvals_reassigned: reassignedCount
        };
    },

    _revokeCreatorRole: function(userSysId) {
        if (!userSysId) {
            return false;
        }
        var roleGr = new GlideRecord('sys_user_role');
        roleGr.addQuery('name', this.ROLE_CREATOR);
        roleGr.setLimit(1);
        roleGr.query();
        if (!roleGr.next()) {
            return false;
        }
        var roleSysId = '' + roleGr.getUniqueValue();
        var has = new GlideRecord('sys_user_has_role');
        has.addQuery('user', '' + userSysId);
        has.addQuery('role', roleSysId);
        has.query();
        var removed = false;
        while (has.next()) {
            has.deleteRecord();
            removed = true;
        }
        return removed;
    },

    _revokeCreatorCredential: function(personSysId) {
        var cred = new GlideRecord(this.CREATOR_CREDENTIAL_TABLE);
        cred.addQuery('user', personSysId);
        cred.query();
        var revoked = false;
        while (cred.next()) {
            cred.setValue('token_status', 'revoked');
            cred.setValue('github_pat', '');
            cred.update();
            revoked = true;
        }
        return revoked;
    },

    _deactivatePerson: function(personSysId) {
        var person = new GlideRecord(this.PERSON_TABLE);
        if (!person.get(personSysId)) {
            return false;
        }
        person.setValue('active', false);
        person.update();
        return true;
    },

    type: 'DeactivationHandler'
};
