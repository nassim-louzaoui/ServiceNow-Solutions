var ApprovalRouter = Class.create();
ApprovalRouter.prototype = {
    initialize: function() {
        this.ROLE_ADMIN          = 'x_infte_ops_int.admin';
        this.MAX_HIERARCHY_DEPTH = 20;
        this._store              = new OIDataStore();
    },

    _isPersonActive: function(personSysId) {
        if (!personSysId) { return false; }
        var person = this._store.get('persons', personSysId);
        if (!person) { return false; }
        var a = person.active;
        return a !== false && a !== 'false' && a !== 0;
    },

    _userSysIdForPerson: function(personSysId) {
        if (!personSysId) { return null; }
        var person = this._store.get('persons', personSysId);
        if (!person) { return null; }
        var uid = '' + (person.user_sys_id || '');
        return uid || null;
    },

    getPrimaryLeader: function(personSysId) {
        if (!personSysId) { return null; }
        var pid  = '' + personSysId;
        var rels = this._store.find('relationships', function(r) {
            return '' + r.direct_report === pid &&
                   r.relationship_type === 'primary' &&
                   r.status === 'active';
        });
        if (rels.length > 0) {
            var lid = '' + (rels[0].leader || '');
            return lid || null;
        }
        return null;
    },

    _resolveAdminPerson: function() {
        var persons = this._store.find('persons', function(p) {
            return p.active !== false && p.active !== 'false';
        });
        var i;
        for (i = 0; i < persons.length; i++) {
            var uid = '' + (persons[i].user_sys_id || '');
            if (!uid) { continue; }
            var gu = gs.getUser().getUserByID(uid);
            if (gu && gu.hasRole(this.ROLE_ADMIN)) {
                return '' + persons[i].sys_id;
            }
        }
        return null;
    },

    _walkUpHierarchy: function(personSysId) {
        var current = personSysId;
        var depth   = 0;
        while (current && depth < this.MAX_HIERARCHY_DEPTH) {
            var leader = this.getPrimaryLeader(current);
            if (leader && this._isPersonActive(leader)) { return leader; }
            current = leader;
            depth++;
        }
        return null;
    },

    resolveApprover: function(submittedByUserSysId, groupSysId) {
        var submitterPersonSysId = new PermissionResolver().getPersonByUser(submittedByUserSysId);
        var result = { approver_person_sys_id: null, escalated: false, reason: '' };

        if (!submitterPersonSysId) {
            result.approver_person_sys_id = this._resolveAdminPerson();
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
                    result.reason    = 'self_approval_guard_escalated_to_leader_of_leader';
                    return result;
                }
                result.approver_person_sys_id = this._resolveAdminPerson();
                result.escalated = true;
                result.reason    = 'self_approval_guard_no_higher_leader_route_admin';
                return result;
            }
            result.approver_person_sys_id = primaryLeader;
            result.reason = 'primary_leader';
            return result;
        }

        var walked = this._walkUpHierarchy(submitterPersonSysId);
        if (walked) {
            result.approver_person_sys_id = walked;
            result.escalated = true;
            result.reason    = 'primary_leader_unset_or_deactivated_walked_hierarchy';
            return result;
        }

        result.approver_person_sys_id = this._resolveAdminPerson();
        result.escalated = true;
        result.reason    = 'no_leader_in_hierarchy_route_admin';
        return result;
    },

    createApproval: function(actionType, subjectUserSysId, relatedSysId, relatedField, groupSysId, approverPersonSysId, deadlineHours) {
        if (!actionType || !approverPersonSysId) {
            gs.error('x_infte_ops_int ApprovalRouter.createApproval missing action_type or approver');
            return null;
        }

        var subjectPersonSysId = '';
        if (subjectUserSysId) {
            subjectPersonSysId = new PermissionResolver().getPersonByUser(subjectUserSysId) || '';
        }

        var hours = parseInt(deadlineHours, 10);
        if (isNaN(hours) || hours <= 0) { hours = 72; }
        var deadline = new GlideDateTime();
        deadline.addSeconds(hours * 3600);

        var pa = {
            sys_id:        this._store.generateId(),
            action_type:   '' + actionType,
            subject_user:  subjectPersonSysId,
            related_group: '' + (groupSysId || ''),
            assigned_to:   '' + approverPersonSysId,
            status:        'pending',
            notes:         '',
            created_at:    new GlideDateTime().getValue(),
            deadline_at:   deadline.getValue()
        };
        if (relatedSysId && relatedField) {
            pa['' + relatedField] = '' + relatedSysId;
        }
        this._store.upsert('pending_actions', pa);
        gs.info('x_infte_ops_int ApprovalRouter created pending_action ' + actionType +
            ' (' + pa.sys_id + ') assigned to person ' + approverPersonSysId);
        return pa.sys_id;
    },

    getEscalationTarget: function(pendingActionSysId) {
        var pa = this._store.get('pending_actions', pendingActionSysId);
        if (!pa) { return null; }
        var assignedTo = '' + (pa.assigned_to || '');
        if (assignedTo) {
            var target = this._walkUpHierarchy(assignedTo);
            if (target) { return target; }
        }
        return this._resolveAdminPerson();
    },

    escalate: function(pendingActionSysId) {
        var pa = this._store.get('pending_actions', pendingActionSysId);
        if (!pa) { return false; }
        var target = this.getEscalationTarget(pendingActionSysId);
        if (!target) {
            gs.error('x_infte_ops_int ApprovalRouter.escalate could not resolve target for ' + pendingActionSysId);
            return false;
        }
        pa.status      = 'escalated';
        pa.assigned_to = '' + target;
        this._store.upsert('pending_actions', pa);
        gs.info('x_infte_ops_int ApprovalRouter escalated pending_action ' + pendingActionSysId + ' to person ' + target);
        return true;
    },

    type: 'ApprovalRouter'
};
