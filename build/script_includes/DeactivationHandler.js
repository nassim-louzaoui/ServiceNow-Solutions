var DeactivationHandler = Class.create();
DeactivationHandler.prototype = {
    initialize: function() {
        this.ROLE_CREATOR  = 'x_infte_ops_int.creator';
        this.ROLE_ADMIN    = 'x_infte_ops_int.admin';
        this.USER_DEACTIVATION_HOURS   = 48;
        this.LEADER_REASSIGNMENT_HOURS = 72;
        this.TEMPLATE_USER_DEACTIVATION_ALERT = 'Operations Intelligence - User Deactivation Alert';
        this.TEMPLATE_LEADER_REASSIGNMENT     = 'Operations Intelligence - Leader Reassignment Required';
        this.TEMPLATE_AUTO_REMOVAL_EXECUTED   = 'Operations Intelligence - Auto Removal Executed';
        this._store = new OIDataStore();
    },

    handle: function(userSysId) {
        if (!userSysId) { return { handled: false, error: 'missing_user' }; }
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
        var pid  = '' + personSysId;
        var rels = this._store.find('relationships', function(r) {
            return '' + r.leader === pid && r.status === 'active';
        });
        return rels.length > 0;
    },

    _userSysIdForPerson: function(personSysId) {
        if (!personSysId) { return null; }
        var person = this._store.get('persons', personSysId);
        if (!person) { return null; }
        var uid = '' + (person.user_sys_id || '');
        return uid || null;
    },

    _getPrimaryLeaderPerson: function(personSysId) {
        return new ApprovalRouter().getPrimaryLeader(personSysId);
    },

    _hasAwaitingApproval: function(personSysId) {
        if (!personSysId) { return false; }
        var pid     = '' + personSysId;
        var pending = this._store.find('pending_actions', function(pa) {
            return '' + pa.triggered_by === pid && pa.status === 'awaiting_approval';
        });
        return pending.length > 0;
    },

    handleUserDeactivation: function(personSysId) {
        var leaderPersonSysId    = this._getPrimaryLeaderPerson(personSysId);
        var router               = new ApprovalRouter();
        var approverPersonSysId  = leaderPersonSysId;
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
        var paSysId   = router.createApproval('user_deactivation', userSysId, null, null, null, approverPersonSysId, this.USER_DEACTIVATION_HOURS);
        if (paSysId) {
            var pa = this._store.get('pending_actions', paSysId);
            if (pa) {
                pa.notes = notes;
                this._store.upsert('pending_actions', pa);
            }
        }

        var leaderUserSysId = this._userSysIdForPerson(approverPersonSysId);
        new NotificationService().send(this.TEMPLATE_USER_DEACTIVATION_ALERT, leaderUserSysId, {
            subject_person:         personSysId,
            pending_action_sys_id:  paSysId ? ('' + paSysId) : '',
            deadline_hours:         this.USER_DEACTIVATION_HOURS
        });
        new AuditService().log('user_deactivation_detected', {
            person_sys_id:         personSysId,
            pending_action_sys_id: paSysId ? ('' + paSysId) : '',
            assigned_to:           '' + approverPersonSysId
        });
        return { handled: true, type: 'user_deactivation', pending_action_sys_id: paSysId ? ('' + paSysId) : null };
    },

    handleLeaderDeactivation: function(personSysId) {
        var theirLeaderPersonSysId = this._getPrimaryLeaderPerson(personSysId);
        var router                 = new ApprovalRouter();
        var approverPersonSysId    = theirLeaderPersonSysId;
        if (!approverPersonSysId) {
            var resolved = router.resolveApprover(this._userSysIdForPerson(personSysId), null);
            approverPersonSysId = resolved.approver_person_sys_id;
        }

        var userSysId = this._userSysIdForPerson(personSysId);
        var paSysId   = router.createApproval('leader_reassignment', userSysId, null, null, null, approverPersonSysId, this.LEADER_REASSIGNMENT_HOURS);

        var context         = {
            subject_person:        personSysId,
            pending_action_sys_id: paSysId ? ('' + paSysId) : '',
            deadline_hours:        this.LEADER_REASSIGNMENT_HOURS
        };
        var leaderUserSysId = this._userSysIdForPerson(approverPersonSysId);
        var notifService    = new NotificationService();
        if (leaderUserSysId) {
            notifService.send(this.TEMPLATE_LEADER_REASSIGNMENT, leaderUserSysId, context);
        }
        this._notifyAdmins(this.TEMPLATE_LEADER_REASSIGNMENT, context);

        var reassignedCount = this._reassignPendingApprovals(personSysId, approverPersonSysId);

        new AuditService().log('leader_deactivation_detected', {
            person_sys_id:         personSysId,
            pending_action_sys_id: paSysId ? ('' + paSysId) : '',
            reassigned_to:         approverPersonSysId ? ('' + approverPersonSysId) : '',
            reassigned_approvals:  reassignedCount
        });
        return {
            handled:              true,
            type:                 'leader_reassignment',
            pending_action_sys_id: paSysId ? ('' + paSysId) : null,
            reassigned_approvals: reassignedCount
        };
    },

    _notifyAdmins: function(templateName, context) {
        var persons = this._store.find('persons', function(p) {
            return p.active !== false && p.active !== 'false';
        });
        var i;
        for (i = 0; i < persons.length; i++) {
            var uid = '' + (persons[i].user_sys_id || '');
            if (!uid) { continue; }
            var gu = gs.getUser().getUserByID(uid);
            if (gu && gu.hasRole(this.ROLE_ADMIN)) {
                new NotificationService().send(templateName, uid, context);
            }
        }
    },

    _reassignPendingApprovals: function(fromPersonSysId, toPersonSysId) {
        if (!toPersonSysId) { return 0; }
        var fpid = '' + fromPersonSysId;
        var pending = this._store.find('pending_actions', function(pa) {
            return '' + pa.assigned_to === fpid &&
                   (pa.action_type === 'automation_approval' || pa.action_type === 'artifact_approval') &&
                   (pa.status === 'pending' || pa.status === 'escalated');
        });
        var count = 0;
        var i;
        for (i = 0; i < pending.length; i++) {
            pending[i].assigned_to = '' + toPersonSysId;
            pending[i].notes       = ('' + (pending[i].notes || '')) + ' Reassigned from deactivated leader.';
            this._store.upsert('pending_actions', pending[i]);
            count++;
        }
        return count;
    },

    executeRemoval: function(personSysId) {
        if (!personSysId) { return { removed: false, error: 'missing_person' }; }
        var userSysId = this._userSysIdForPerson(personSysId);
        var pid       = '' + personSysId;

        var gmCount  = 0;
        var groupMgr = new GroupManager();
        var allGroups = this._store.find('groups', function(g) {
            return g.status === 'active';
        });
        var gi;
        for (gi = 0; gi < allGroups.length; gi++) {
            var members    = allGroups[gi].members || [];
            var isActive   = false;
            var j;
            for (j = 0; j < members.length; j++) {
                if ('' + members[j].person_sys_id === pid && '' + members[j].status === 'active') {
                    isActive = true;
                    break;
                }
            }
            if (isActive) {
                groupMgr.removeMember('' + allGroups[gi].sys_id, personSysId);
                gmCount++;
            }
        }

        this._revokeCreatorRole(userSysId);
        this._revokeCreatorCredential(personSysId);

        var relCount  = 0;
        var allRels   = this._store.find('relationships', function(r) {
            return ('' + r.direct_report === pid || '' + r.leader === pid) && r.status === 'active';
        });
        var ri;
        for (ri = 0; ri < allRels.length; ri++) {
            allRels[ri].status = 'inactive';
            this._store.upsert('relationships', allRels[ri]);
            relCount++;
        }

        var leaderPersonSysId = this._getPrimaryLeaderPerson(personSysId);
        var reassignedCount   = this._reassignPendingApprovals(personSysId, leaderPersonSysId);

        this._deactivatePerson(personSysId);

        var leaderUserSysId = this._userSysIdForPerson(leaderPersonSysId);
        new NotificationService().send(this.TEMPLATE_AUTO_REMOVAL_EXECUTED, leaderUserSysId, {
            subject_person:              personSysId,
            group_memberships_removed:   gmCount,
            relationships_inactivated:   relCount,
            approvals_reassigned:        reassignedCount
        });
        new AuditService().log('auto_removal_executed', {
            person_sys_id:             personSysId,
            group_memberships_removed: gmCount,
            relationships_inactivated: relCount,
            approvals_reassigned:      reassignedCount
        });
        return {
            removed:                   true,
            group_memberships_removed: gmCount,
            relationships_inactivated: relCount,
            approvals_reassigned:      reassignedCount
        };
    },

    _revokeCreatorRole: function(userSysId) {
        if (!userSysId) { return false; }
        var roleGr = new GlideRecord('sys_user_role');
        roleGr.addQuery('name', this.ROLE_CREATOR);
        roleGr.setLimit(1);
        roleGr.query();
        if (!roleGr.next()) { return false; }
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
        var person = this._store.get('persons', personSysId);
        if (!person) { return false; }
        person.github_pat    = '';
        person.token_status  = 'revoked';
        this._store.upsert('persons', person);
        return true;
    },

    _deactivatePerson: function(personSysId) {
        var person = this._store.get('persons', personSysId);
        if (!person) { return false; }
        person.active = false;
        this._store.upsert('persons', person);
        return true;
    },

    type: 'DeactivationHandler'
};
