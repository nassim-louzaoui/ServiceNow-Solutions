var ApprovalRouter = Class.create();
ApprovalRouter.prototype = {
    initialize: function() {
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.RELATIONSHIP_TABLE = 'x_infte_ops_int_reporting_relationship';
        this.PENDING_ACTION_TABLE = 'x_infte_ops_int_pending_action';
        this.ROLE_ADMIN = 'admin';
        this.MAX_HIERARCHY_DEPTH = 20;
    },

    _isPersonActive: function(personSysId) {
        if (!personSysId) {
            return false;
        }
        var person = new GlideRecord(this.PERSON_TABLE);
        if (!person.get(personSysId)) {
            return false;
        }
        var active = person.getValue('active');
        return active === '1' || active === 'true' || active === true;
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

    getPrimaryLeader: function(personSysId) {
        if (!personSysId) {
            return null;
        }
        var rel = new GlideRecord(this.RELATIONSHIP_TABLE);
        rel.addQuery('direct_report', personSysId);
        rel.addQuery('relationship_type', 'primary');
        rel.addQuery('status', 'active');
        rel.setLimit(1);
        rel.query();
        if (rel.next()) {
            var leaderSysId = '' + rel.getValue('leader');
            return leaderSysId ? leaderSysId : null;
        }
        return null;
    },

    _resolveAdminPerson: function() {
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
                return '' + person.getUniqueValue();
            }
        }
        return null;
    },

    _walkUpHierarchy: function(personSysId) {
        var current = personSysId;
        var depth = 0;
        while (current && depth < this.MAX_HIERARCHY_DEPTH) {
            var leader = this.getPrimaryLeader(current);
            if (leader && this._isPersonActive(leader)) {
                return leader;
            }
            current = leader;
            depth++;
        }
        return null;
    },

    resolveApprover: function(submittedByUserSysId, groupSysId) {
        var submitterPersonSysId = new PermissionResolver().getPersonByUser(submittedByUserSysId);
        var result = {
            approver_person_sys_id: null,
            escalated: false,
            reason: ''
        };

        if (!submitterPersonSysId) {
            var adminFallback = this._resolveAdminPerson();
            result.approver_person_sys_id = adminFallback;
            result.escalated = false;
            result.reason = 'submitter_has_no_person_record_route_admin';
            return result;
        }

        var primaryLeader = this.getPrimaryLeader(submitterPersonSysId);

        if (primaryLeader && this._isPersonActive(primaryLeader)) {
            var leaderUserSysId = this._userSysIdForPerson(primaryLeader);
            if (leaderUserSysId && '' + leaderUserSysId === '' + submittedByUserSysId) {
                var leaderOfLeader = this._walkUpHierarchy(primaryLeader);
                if (leaderOfLeader) {
                    result.approver_person_sys_id = leaderOfLeader;
                    result.escalated = true;
                    result.reason = 'self_approval_guard_escalated_to_leader_of_leader';
                    return result;
                }
                result.approver_person_sys_id = this._resolveAdminPerson();
                result.escalated = true;
                result.reason = 'self_approval_guard_no_higher_leader_route_admin';
                return result;
            }
            result.approver_person_sys_id = primaryLeader;
            result.escalated = false;
            result.reason = 'primary_leader';
            return result;
        }

        var walked = this._walkUpHierarchy(submitterPersonSysId);
        if (walked) {
            result.approver_person_sys_id = walked;
            result.escalated = true;
            result.reason = 'primary_leader_unset_or_deactivated_walked_hierarchy';
            return result;
        }

        result.approver_person_sys_id = this._resolveAdminPerson();
        result.escalated = true;
        result.reason = 'no_leader_in_hierarchy_route_admin';
        return result;
    },

    createApproval: function(actionType, subjectUserSysId, relatedSysId, relatedField, groupSysId, approverPersonSysId, deadlineHours) {
        if (!actionType || !approverPersonSysId) {
            gs.error('x_infte_ops_int ApprovalRouter.createApproval missing action_type or approver');
            return null;
        }
        var pa = new GlideRecord(this.PENDING_ACTION_TABLE);
        pa.initialize();
        pa.setValue('action_type', '' + actionType);

        if (subjectUserSysId) {
            var subjectPersonSysId = new PermissionResolver().getPersonByUser(subjectUserSysId);
            if (subjectPersonSysId) {
                pa.setValue('subject_user', subjectPersonSysId);
            }
        }
        if (relatedSysId && relatedField) {
            pa.setValue('' + relatedField, '' + relatedSysId);
        }
        if (groupSysId) {
            pa.setValue('related_group', '' + groupSysId);
        }
        pa.setValue('assigned_to', '' + approverPersonSysId);
        pa.setValue('status', 'pending');
        pa.setValue('created_at', new GlideDateTime().getValue());

        var hours = parseInt(deadlineHours, 10);
        if (isNaN(hours) || hours <= 0) {
            hours = 72;
        }
        var deadline = new GlideDateTime();
        deadline.addSeconds(hours * 3600);
        pa.setValue('deadline_at', deadline.getValue());

        var sysId = pa.insert();
        if (sysId) {
            gs.info('x_infte_ops_int ApprovalRouter created pending_action ' + actionType +
                ' (' + sysId + ') assigned to person ' + approverPersonSysId);
        }
        return sysId ? '' + sysId : null;
    },

    getEscalationTarget: function(pendingActionSysId) {
        var pa = new GlideRecord(this.PENDING_ACTION_TABLE);
        if (!pa.get(pendingActionSysId)) {
            return null;
        }
        var assignedToPersonSysId = '' + pa.getValue('assigned_to');
        if (assignedToPersonSysId) {
            var target = this._walkUpHierarchy(assignedToPersonSysId);
            if (target) {
                return target;
            }
        }
        return this._resolveAdminPerson();
    },

    escalate: function(pendingActionSysId) {
        var pa = new GlideRecord(this.PENDING_ACTION_TABLE);
        if (!pa.get(pendingActionSysId)) {
            return false;
        }
        var target = this.getEscalationTarget(pendingActionSysId);
        if (!target) {
            gs.error('x_infte_ops_int ApprovalRouter.escalate could not resolve target for ' +
                pendingActionSysId);
            return false;
        }
        pa.setValue('status', 'escalated');
        pa.setValue('assigned_to', '' + target);
        pa.update();
        gs.info('x_infte_ops_int ApprovalRouter escalated pending_action ' + pendingActionSysId +
            ' to person ' + target);
        return true;
    },

    type: 'ApprovalRouter'
};
