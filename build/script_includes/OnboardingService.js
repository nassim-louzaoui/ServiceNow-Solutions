var OnboardingService = Class.create();
OnboardingService.prototype = {
    initialize: function() {
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.GROUP_TABLE = 'x_infte_ops_int_group';
        this.RELATIONSHIP_TABLE = 'x_infte_ops_int_reporting_relationship';
        this.ONBOARDING_REQUEST_TABLE = 'x_infte_ops_int_onboarding_request';
        this.ROLE_LEADERSHIP = 'x_infte_ops_int.leadership';
        this.ROLE_USER = 'x_infte_ops_int.user';
        this.INVITATION_EXPIRY_HOURS = 48;
        this.MAX_REINVITATIONS = 2;
        this.TEMPLATE_ADDED_TO_GROUP = 'Operations Intelligence - Added to Group';
        this.TEMPLATE_ONBOARDING_INVITATION = 'Operations Intelligence - Onboarding Invitation';
        this.TEMPLATE_ONBOARDING_COMPLETE = 'Operations Intelligence - Onboarding Complete';
        this.TEMPLATE_INVITATION_DECLINED = 'Operations Intelligence - Invitation Declined';
        this.TEMPLATE_ONBOARDING_EXPIRED = 'Operations Intelligence - Onboarding Expired';
    },

    existingPersonCheck: function(userSysId) {
        if (!userSysId) {
            return null;
        }
        var gr = new GlideRecord(this.PERSON_TABLE);
        gr.addQuery('user', '' + userSysId);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            return '' + gr.getUniqueValue();
        }
        return null;
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
                target_group: '' + targetGroupSysId,
                group_role: '' + (groupRole || 'user')
            });
            var initiatorUserExisting = this._userSysIdForPerson(initiatedByPersonSysId);
            new NotificationService().send(this.TEMPLATE_ADDED_TO_GROUP, initiatorUserExisting, {
                person_sys_id: existingPersonSysId,
                target_group: '' + targetGroupSysId,
                note: 'added_already_onboarded'
            });
            new AuditService().log('onboarding_existing_person_added', {
                person_sys_id: existingPersonSysId,
                target_group: '' + targetGroupSysId,
                initiated_by: '' + initiatedByPersonSysId
            });
            return { existing: true, person_sys_id: existingPersonSysId };
        }

        var nomineePersonSysId = this._ensureNomineePerson(nomineeUserSysId, initiatedByPersonSysId);

        var now = new GlideDateTime();
        var expiry = new GlideDateTime();
        expiry.addSeconds(this.INVITATION_EXPIRY_HOURS * 3600);

        var req = new GlideRecord(this.ONBOARDING_REQUEST_TABLE);
        req.initialize();
        if (nomineePersonSysId) {
            req.setValue('nominee', nomineePersonSysId);
        }
        req.setValue('initiated_by', '' + initiatedByPersonSysId);
        if (targetGroupSysId) {
            req.setValue('target_group', '' + targetGroupSysId);
        }
        req.setValue('group_role', '' + (groupRole || 'user'));
        req.setValue('system_role', '' + (systemRole || 'user'));
        req.setValue('delegation_rights', delegationRights ? true : false);
        req.setValue('status', 'pending');
        req.setValue('re_invitation_count', 0);
        req.setValue('invited_at', now.getValue());
        req.setValue('expiry_at', expiry.getValue());
        var requestSysId = req.insert();

        if (requestSysId) {
            new NotificationService().notifyOnboardingInvitation('' + requestSysId);
            new AuditService().log('onboarding_initiated', {
                onboarding_request_sys_id: '' + requestSysId,
                nominee_user: '' + nomineeUserSysId,
                initiated_by: '' + initiatedByPersonSysId,
                system_role: '' + (systemRole || 'user')
            });
        }

        return { existing: false, request_sys_id: requestSysId ? '' + requestSysId : null };
    },

    _ensureNomineePerson: function(nomineeUserSysId, initiatedByPersonSysId) {
        var existing = this.existingPersonCheck(nomineeUserSysId);
        if (existing) {
            return existing;
        }
        var person = new GlideRecord(this.PERSON_TABLE);
        person.initialize();
        person.setValue('user', '' + nomineeUserSysId);
        if (initiatedByPersonSysId) {
            person.setValue('onboarded_by', '' + initiatedByPersonSysId);
        }
        person.setValue('onboarding_status', 'pending');
        person.setValue('invitation_sent_at', new GlideDateTime().getValue());
        person.setValue('delegation_rights', false);
        person.setValue('active', true);
        var sysId = person.insert();
        return sysId ? '' + sysId : null;
    },

    completeOnboarding: function(onboardingRequestSysId) {
        var req = new GlideRecord(this.ONBOARDING_REQUEST_TABLE);
        if (!req.get(onboardingRequestSysId)) {
            return { completed: false, error: 'request_not_found' };
        }
        if ('' + req.getValue('status') !== 'pending') {
            return { completed: false, error: 'request_not_pending' };
        }

        var nomineePersonSysId = '' + req.getValue('nominee');
        var systemRole = '' + req.getValue('system_role');
        var groupRole = '' + req.getValue('group_role');
        var targetGroupSysId = '' + req.getValue('target_group');
        var initiatorPersonSysId = '' + req.getValue('initiated_by');
        var delegationRights = req.getValue('delegation_rights');
        var isDelegation = delegationRights === '1' || delegationRights === 'true' || delegationRights === true;

        var person = new GlideRecord(this.PERSON_TABLE);
        if (!person.get(nomineePersonSysId)) {
            person.initialize();
            person.setValue('user', '');
            nomineePersonSysId = '' + person.insert();
            person.get(nomineePersonSysId);
        }
        person.setValue('onboarding_status', 'complete');
        person.setValue('onboarded_at', new GlideDateTime().getValue());
        if (initiatorPersonSysId) {
            person.setValue('onboarded_by', initiatorPersonSysId);
        }
        person.setValue('delegation_rights', isDelegation);
        person.setValue('active', true);
        person.update();

        var nomineeUserSysId = '' + person.getValue('user');
        this._grantSystemRole(nomineeUserSysId, systemRole);

        if (initiatorPersonSysId && nomineePersonSysId) {
            this._createPrimaryRelationship(initiatorPersonSysId, nomineePersonSysId, initiatorPersonSysId);
        }

        if (targetGroupSysId) {
            new GroupManager().addMember(targetGroupSysId, nomineePersonSysId, groupRole || 'user', initiatorPersonSysId);
        }

        if (systemRole === 'leadership') {
            var groupName = '' + person.getDisplayValue('user') + ' Team';
            new GroupManager().createGroup(groupName, 'Leadership Group for ' + person.getDisplayValue('user'),
                'leadership_group', nomineePersonSysId, null, initiatorPersonSysId);
        }

        req.setValue('status', 'accepted');
        req.setValue('completed_at', new GlideDateTime().getValue());
        req.update();

        var initiatorUserSysId = this._userSysIdForPerson(initiatorPersonSysId);
        new NotificationService().send(this.TEMPLATE_ONBOARDING_COMPLETE, initiatorUserSysId, {
            onboarding_request_sys_id: '' + req.getUniqueValue(),
            number: '' + req.getValue('number'),
            nominee: nomineePersonSysId,
            system_role: systemRole
        });
        new AuditService().log('onboarding_completed', {
            onboarding_request_sys_id: '' + req.getUniqueValue(),
            nominee_person: nomineePersonSysId,
            system_role: systemRole
        });

        return { completed: true, person_sys_id: nomineePersonSysId };
    },

    _grantSystemRole: function(userSysId, systemRole) {
        if (!userSysId) {
            return false;
        }
        var roleName = (systemRole === 'leadership') ? this.ROLE_LEADERSHIP : this.ROLE_USER;
        var roleGr = new GlideRecord('sys_user_role');
        roleGr.addQuery('name', roleName);
        roleGr.setLimit(1);
        roleGr.query();
        if (!roleGr.next()) {
            gs.error('x_infte_ops_int OnboardingService could not find role ' + roleName);
            return false;
        }
        var roleSysId = '' + roleGr.getUniqueValue();
        var existing = new GlideRecord('sys_user_has_role');
        existing.addQuery('user', '' + userSysId);
        existing.addQuery('role', roleSysId);
        existing.setLimit(1);
        existing.query();
        if (existing.next()) {
            return true;
        }
        var has = new GlideRecord('sys_user_has_role');
        has.initialize();
        has.setValue('user', '' + userSysId);
        has.setValue('role', roleSysId);
        has.insert();
        gs.info('x_infte_ops_int OnboardingService granted ' + roleName + ' to user ' + userSysId);
        return true;
    },

    _createPrimaryRelationship: function(leaderPersonSysId, directReportPersonSysId, createdByPersonSysId) {
        var existing = new GlideRecord(this.RELATIONSHIP_TABLE);
        existing.addQuery('leader', leaderPersonSysId);
        existing.addQuery('direct_report', directReportPersonSysId);
        existing.addQuery('relationship_type', 'primary');
        existing.addQuery('status', 'active');
        existing.setLimit(1);
        existing.query();
        if (existing.next()) {
            return '' + existing.getUniqueValue();
        }
        var rel = new GlideRecord(this.RELATIONSHIP_TABLE);
        rel.initialize();
        rel.setValue('leader', leaderPersonSysId);
        rel.setValue('direct_report', directReportPersonSysId);
        rel.setValue('relationship_type', 'primary');
        rel.setValue('status', 'active');
        if (createdByPersonSysId) {
            rel.setValue('created_by_person', createdByPersonSysId);
        }
        rel.setValue('created_at', new GlideDateTime().getValue());
        var sysId = rel.insert();
        return sysId ? '' + sysId : null;
    },

    declineOnboarding: function(onboardingRequestSysId, reason) {
        var req = new GlideRecord(this.ONBOARDING_REQUEST_TABLE);
        if (!req.get(onboardingRequestSysId)) {
            return { declined: false, error: 'request_not_found' };
        }
        req.setValue('status', 'declined');
        if (reason) {
            req.setValue('decline_reason', '' + reason);
        }
        req.update();

        var initiatorUserSysId = this._userSysIdForPerson('' + req.getValue('initiated_by'));
        new NotificationService().send(this.TEMPLATE_INVITATION_DECLINED, initiatorUserSysId, {
            onboarding_request_sys_id: '' + req.getUniqueValue(),
            number: '' + req.getValue('number'),
            decline_reason: '' + req.getValue('decline_reason')
        });
        new AuditService().log('onboarding_declined', {
            onboarding_request_sys_id: '' + req.getUniqueValue(),
            decline_reason: reason ? ('' + reason) : ''
        });
        return { declined: true };
    },

    reinvite: function(onboardingRequestSysId) {
        var req = new GlideRecord(this.ONBOARDING_REQUEST_TABLE);
        if (!req.get(onboardingRequestSysId)) {
            return { reinvited: false, error: 'request_not_found' };
        }
        var count = parseInt(req.getValue('re_invitation_count') || '0', 10);
        if (isNaN(count)) {
            count = 0;
        }
        if (count >= this.MAX_REINVITATIONS) {
            return { reinvited: false, error: 'max_reinvitations_reached' };
        }

        var now = new GlideDateTime();
        var expiry = new GlideDateTime();
        expiry.addSeconds(this.INVITATION_EXPIRY_HOURS * 3600);

        req.setValue('re_invitation_count', count + 1);
        req.setValue('status', 'pending');
        req.setValue('invited_at', now.getValue());
        req.setValue('expiry_at', expiry.getValue());
        req.update();

        new NotificationService().notifyOnboardingInvitation('' + req.getUniqueValue());
        new AuditService().log('onboarding_reinvited', {
            onboarding_request_sys_id: '' + req.getUniqueValue(),
            re_invitation_count: count + 1
        });
        return { reinvited: true, re_invitation_count: count + 1 };
    },

    expireStale: function() {
        var expired = 0;
        var now = new GlideDateTime().getValue();
        var req = new GlideRecord(this.ONBOARDING_REQUEST_TABLE);
        req.addQuery('status', 'pending');
        req.addQuery('expiry_at', '<', now);
        req.query();
        while (req.next()) {
            req.setValue('status', 'expired');
            req.update();
            var initiatorUserSysId = this._userSysIdForPerson('' + req.getValue('initiated_by'));
            new NotificationService().send(this.TEMPLATE_ONBOARDING_EXPIRED, initiatorUserSysId, {
                onboarding_request_sys_id: '' + req.getUniqueValue(),
                number: '' + req.getValue('number'),
                nominee: '' + req.getValue('nominee')
            });
            new AuditService().log('onboarding_expired', {
                onboarding_request_sys_id: '' + req.getUniqueValue()
            });
            expired++;
        }
        return { expired_count: expired };
    },

    type: 'OnboardingService'
};
