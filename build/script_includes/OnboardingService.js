var OnboardingService = Class.create();
OnboardingService.prototype = {
    initialize: function() {
        this.ROLE_LEADERSHIP          = 'x_infte_ops_int.leadership';
        this.ROLE_USER                = 'x_infte_ops_int.user';
        this.INVITATION_EXPIRY_HOURS  = 48;
        this.MAX_REINVITATIONS        = 2;
        this.TEMPLATE_ADDED_TO_GROUP         = 'Operations Intelligence - Added to Group';
        this.TEMPLATE_ONBOARDING_INVITATION  = 'Operations Intelligence - Onboarding Invitation';
        this.TEMPLATE_ONBOARDING_COMPLETE    = 'Operations Intelligence - Onboarding Complete';
        this.TEMPLATE_INVITATION_DECLINED    = 'Operations Intelligence - Invitation Declined';
        this.TEMPLATE_ONBOARDING_EXPIRED     = 'Operations Intelligence - Onboarding Expired';
        this._store = new OIDataStore();
    },

    existingPersonCheck: function(userSysId) {
        if (!userSysId) { return null; }
        var uid   = '' + userSysId;
        var found = this._store.find('persons', function(p) {
            return '' + p.user_sys_id === uid;
        });
        if (found.length > 0) { return '' + found[0].sys_id; }
        return null;
    },

    _userSysIdForPerson: function(personSysId) {
        if (!personSysId) { return null; }
        var person = this._store.get('persons', personSysId);
        if (!person) { return null; }
        var uid = '' + (person.user_sys_id || '');
        return uid || null;
    },

    initiateOnboarding: function(nomineeUserSysId, nomineeFirstName, nomineeLastName, nomineeEmail, initiatedByPersonSysId, targetGroupSysId, groupRole, systemRole, delegationRights) {
        if (!nomineeUserSysId) {
            gs.error('x_infte_ops_int OnboardingService.initiateOnboarding missing nominee user');
            return { existing: false, error: 'missing_nominee_user' };
        }

        var existingPersonSysId = this.existingPersonCheck(nomineeUserSysId);
        if (existingPersonSysId) {
            new GroupManager().addMember(targetGroupSysId, existingPersonSysId, groupRole || 'user', initiatedByPersonSysId);
            var existingUserSysId = this._userSysIdForPerson(existingPersonSysId);
            new NotificationService().send(this.TEMPLATE_ADDED_TO_GROUP, existingUserSysId, {
                person_sys_id: existingPersonSysId,
                target_group:  '' + targetGroupSysId,
                group_role:    '' + (groupRole || 'user')
            });
            var initiatorUserExisting = this._userSysIdForPerson(initiatedByPersonSysId);
            new NotificationService().send(this.TEMPLATE_ADDED_TO_GROUP, initiatorUserExisting, {
                person_sys_id: existingPersonSysId,
                target_group:  '' + targetGroupSysId,
                note:          'added_already_onboarded'
            });
            new AuditService().log('onboarding_existing_person_added', {
                person_sys_id: existingPersonSysId,
                target_group:  '' + targetGroupSysId,
                initiated_by:  '' + initiatedByPersonSysId
            });
            return { existing: true, person_sys_id: existingPersonSysId };
        }

        var nomineePersonSysId = this._ensureNomineePerson(nomineeUserSysId, initiatedByPersonSysId);

        var now    = new GlideDateTime();
        var expiry = new GlideDateTime();
        expiry.addSeconds(this.INVITATION_EXPIRY_HOURS * 3600);

        var requestSysId = this._store.generateId();
        var req = {
            sys_id:               requestSysId,
            number:               'ONB' + requestSysId.substring(3, 11),
            nominee:              '' + (nomineePersonSysId || ''),
            initiated_by:         '' + (initiatedByPersonSysId || ''),
            target_group:         '' + (targetGroupSysId || ''),
            group_role:           '' + (groupRole || 'user'),
            system_role:          '' + (systemRole || 'user'),
            delegation_rights:    delegationRights ? true : false,
            status:               'pending',
            re_invitation_count:  0,
            invited_at:           now.getValue(),
            expiry_at:            expiry.getValue(),
            completed_at:         '',
            decline_reason:       ''
        };
        this._store.upsert('onboarding_requests', req);

        new NotificationService().notifyOnboardingInvitation(requestSysId);
        new AuditService().log('onboarding_initiated', {
            onboarding_request_sys_id: requestSysId,
            nominee_user:              '' + nomineeUserSysId,
            initiated_by:             '' + (initiatedByPersonSysId || ''),
            system_role:              '' + (systemRole || 'user')
        });
        return { existing: false, request_sys_id: requestSysId };
    },

    _ensureNomineePerson: function(nomineeUserSysId, initiatedByPersonSysId) {
        var existing = this.existingPersonCheck(nomineeUserSysId);
        if (existing) { return existing; }
        var person = {
            sys_id:             this._store.generateId(),
            user_sys_id:        '' + nomineeUserSysId,
            onboarded_by:       '' + (initiatedByPersonSysId || ''),
            onboarding_status:  'pending',
            invitation_sent_at: new GlideDateTime().getValue(),
            delegation_rights:  false,
            active:             true
        };
        this._store.upsert('persons', person);
        return person.sys_id;
    },

    completeOnboarding: function(onboardingRequestSysId) {
        var req = this._store.get('onboarding_requests', onboardingRequestSysId);
        if (!req) { return { completed: false, error: 'request_not_found' }; }
        if ('' + req.status !== 'pending') { return { completed: false, error: 'request_not_pending' }; }

        var nomineePersonSysId  = '' + req.nominee;
        var systemRole          = '' + req.system_role;
        var groupRole           = '' + req.group_role;
        var targetGroupSysId    = '' + req.target_group;
        var initiatorPersonSysId = '' + req.initiated_by;
        var isDelegation        = req.delegation_rights === true || req.delegation_rights === 'true';

        var person = this._store.get('persons', nomineePersonSysId);
        if (!person) {
            person = {
                sys_id:      this._store.generateId(),
                user_sys_id: ''
            };
            nomineePersonSysId = person.sys_id;
        }
        person.onboarding_status = 'complete';
        person.onboarded_at      = new GlideDateTime().getValue();
        person.onboarded_by      = initiatorPersonSysId;
        person.delegation_rights = isDelegation;
        person.active            = true;
        this._store.upsert('persons', person);

        var nomineeUserSysId = '' + (person.user_sys_id || '');
        this._grantSystemRole(nomineeUserSysId, systemRole);

        if (initiatorPersonSysId && nomineePersonSysId) {
            this._createPrimaryRelationship(initiatorPersonSysId, nomineePersonSysId, initiatorPersonSysId);
        }
        if (targetGroupSysId) {
            new GroupManager().addMember(targetGroupSysId, nomineePersonSysId, groupRole || 'user', initiatorPersonSysId);
        }
        if (systemRole === 'leadership') {
            var su = new GlideRecord('sys_user');
            var groupName = nomineePersonSysId + ' Team';
            if (su.get(nomineeUserSysId)) {
                groupName = '' + su.getValue('name') + ' Team';
            }
            new GroupManager().createGroup(groupName, 'Leadership Group for ' + groupName.replace(' Team', ''),
                'leadership_group', nomineePersonSysId, null, initiatorPersonSysId);
        }

        req.status       = 'accepted';
        req.completed_at = new GlideDateTime().getValue();
        this._store.upsert('onboarding_requests', req);

        var initiatorUserSysId = this._userSysIdForPerson(initiatorPersonSysId);
        new NotificationService().send(this.TEMPLATE_ONBOARDING_COMPLETE, initiatorUserSysId, {
            onboarding_request_sys_id: '' + req.sys_id,
            number:                    '' + (req.number || req.sys_id),
            nominee:                   nomineePersonSysId,
            system_role:               systemRole
        });
        new AuditService().log('onboarding_completed', {
            onboarding_request_sys_id: '' + req.sys_id,
            nominee_person:            nomineePersonSysId,
            system_role:               systemRole
        });
        return { completed: true, person_sys_id: nomineePersonSysId };
    },

    _grantSystemRole: function(userSysId, systemRole) {
        if (!userSysId) { return false; }
        var roleName = (systemRole === 'leadership') ? this.ROLE_LEADERSHIP : this.ROLE_USER;
        var roleGr   = new GlideRecord('sys_user_role');
        roleGr.addQuery('name', roleName);
        roleGr.setLimit(1);
        roleGr.query();
        if (!roleGr.next()) {
            gs.error('x_infte_ops_int OnboardingService could not find role ' + roleName);
            return false;
        }
        var roleSysId = '' + roleGr.getUniqueValue();
        var existing  = new GlideRecord('sys_user_has_role');
        existing.addQuery('user', '' + userSysId);
        existing.addQuery('role', roleSysId);
        existing.setLimit(1);
        existing.query();
        if (existing.next()) { return true; }
        var has = new GlideRecord('sys_user_has_role');
        has.initialize();
        has.setValue('user', '' + userSysId);
        has.setValue('role', roleSysId);
        has.insert();
        gs.info('x_infte_ops_int OnboardingService granted ' + roleName + ' to user ' + userSysId);
        return true;
    },

    _createPrimaryRelationship: function(leaderPersonSysId, directReportPersonSysId, createdByPersonSysId) {
        var lpid = '' + leaderPersonSysId;
        var dpid = '' + directReportPersonSysId;
        var existing = this._store.find('relationships', function(r) {
            return '' + r.leader === lpid &&
                   '' + r.direct_report === dpid &&
                   r.relationship_type === 'primary' &&
                   r.status === 'active';
        });
        if (existing.length > 0) { return '' + existing[0].sys_id; }
        var rel = {
            sys_id:            this._store.generateId(),
            leader:            lpid,
            direct_report:     dpid,
            relationship_type: 'primary',
            status:            'active',
            created_by_person: '' + (createdByPersonSysId || ''),
            created_at:        new GlideDateTime().getValue()
        };
        this._store.upsert('relationships', rel);
        return rel.sys_id;
    },

    declineOnboarding: function(onboardingRequestSysId, reason) {
        var req = this._store.get('onboarding_requests', onboardingRequestSysId);
        if (!req) { return { declined: false, error: 'request_not_found' }; }
        req.status         = 'declined';
        req.decline_reason = reason ? ('' + reason) : '';
        this._store.upsert('onboarding_requests', req);

        var initiatorUserSysId = this._userSysIdForPerson('' + (req.initiated_by || ''));
        new NotificationService().send(this.TEMPLATE_INVITATION_DECLINED, initiatorUserSysId, {
            onboarding_request_sys_id: '' + req.sys_id,
            number:                    '' + (req.number || req.sys_id),
            decline_reason:            '' + (req.decline_reason || '')
        });
        new AuditService().log('onboarding_declined', {
            onboarding_request_sys_id: '' + req.sys_id,
            decline_reason:            reason ? ('' + reason) : ''
        });
        return { declined: true };
    },

    reinvite: function(onboardingRequestSysId) {
        var req = this._store.get('onboarding_requests', onboardingRequestSysId);
        if (!req) { return { reinvited: false, error: 'request_not_found' }; }
        var count = parseInt(req.re_invitation_count || 0, 10);
        if (isNaN(count)) { count = 0; }
        if (count >= this.MAX_REINVITATIONS) {
            return { reinvited: false, error: 'max_reinvitations_reached' };
        }

        var now    = new GlideDateTime();
        var expiry = new GlideDateTime();
        expiry.addSeconds(this.INVITATION_EXPIRY_HOURS * 3600);

        req.re_invitation_count = count + 1;
        req.status              = 'pending';
        req.invited_at          = now.getValue();
        req.expiry_at           = expiry.getValue();
        this._store.upsert('onboarding_requests', req);

        new NotificationService().notifyOnboardingInvitation('' + req.sys_id);
        new AuditService().log('onboarding_reinvited', {
            onboarding_request_sys_id: '' + req.sys_id,
            re_invitation_count:       count + 1
        });
        return { reinvited: true, re_invitation_count: count + 1 };
    },

    expireStale: function() {
        var now     = new GlideDateTime().getValue();
        var expired = 0;
        var pending = this._store.find('onboarding_requests', function(r) {
            return r.status === 'pending' && r.expiry_at && r.expiry_at < now;
        });
        var i;
        for (i = 0; i < pending.length; i++) {
            pending[i].status = 'expired';
            this._store.upsert('onboarding_requests', pending[i]);
            var initiatorUserSysId = this._userSysIdForPerson('' + (pending[i].initiated_by || ''));
            new NotificationService().send(this.TEMPLATE_ONBOARDING_EXPIRED, initiatorUserSysId, {
                onboarding_request_sys_id: '' + pending[i].sys_id,
                number:                    '' + (pending[i].number || pending[i].sys_id),
                nominee:                   '' + (pending[i].nominee || '')
            });
            new AuditService().log('onboarding_expired', {
                onboarding_request_sys_id: '' + pending[i].sys_id
            });
            expired++;
        }
        return { expired_count: expired };
    },

    type: 'OnboardingService'
};
