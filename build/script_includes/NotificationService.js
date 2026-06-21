var NotificationService = Class.create();
NotificationService.prototype = {
    initialize: function() {
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.PENDING_ACTION_TABLE = 'x_infte_ops_int_pending_action';
        this.ONBOARDING_REQUEST_TABLE = 'x_infte_ops_int_onboarding_request';
        this.AUTOMATION_TABLE = 'x_infte_ops_int_automation';
        this.GROUP_AUTOMATION_TABLE = 'x_infte_ops_int_group_automation';
        this.GROUP_MEMBER_TABLE = 'x_infte_ops_int_group_member';
        this.NOTIFY_EVENT = 'x_infte_ops_int.notify';

        this.TEMPLATE_ONBOARDING_INVITATION = 'Operations Intelligence - Onboarding Invitation';
        this.TEMPLATE_ONBOARDING_REMINDER = 'Operations Intelligence - Onboarding Reminder';
        this.TEMPLATE_ONBOARDING_EXPIRED = 'Operations Intelligence - Onboarding Expired';
        this.TEMPLATE_INVITATION_DECLINED = 'Operations Intelligence - Invitation Declined';
        this.TEMPLATE_ONBOARDING_COMPLETE = 'Operations Intelligence - Onboarding Complete';
        this.TEMPLATE_ADDED_TO_GROUP = 'Operations Intelligence - Added to Group';
        this.TEMPLATE_AUTOMATION_SUBMITTED = 'Operations Intelligence - Automation Submitted';
        this.TEMPLATE_CROSS_GROUP_APPROVAL = 'Operations Intelligence - Cross-Group Approval Request';
        this.TEMPLATE_APPROVAL_ESCALATED = 'Operations Intelligence - Approval Escalated';
        this.TEMPLATE_AUTOMATION_APPROVED = 'Operations Intelligence - Automation Approved';
        this.TEMPLATE_AUTOMATION_REJECTED = 'Operations Intelligence - Automation Rejected';
        this.TEMPLATE_USER_DEACTIVATION_ALERT = 'Operations Intelligence - User Deactivation Alert';
        this.TEMPLATE_AUTO_REMOVAL_EXECUTED = 'Operations Intelligence - Auto Removal Executed';
        this.TEMPLATE_LEADER_REASSIGNMENT = 'Operations Intelligence - Leader Reassignment Required';
    },

    send: function(templateName, recipientUserSysId, contextObject) {
        if (!templateName) {
            gs.error('x_infte_ops_int NotificationService.send called without a template name');
            return false;
        }
        var recipient = recipientUserSysId ? ('' + recipientUserSysId) : '';
        var contextJson;
        try {
            contextJson = (contextObject === null || contextObject === undefined) ?
                '{}' : JSON.stringify(contextObject);
        } catch (e) {
            contextJson = '{}';
        }
        var payload = {
            template: '' + templateName,
            recipient: recipient,
            context: contextJson
        };
        gs.eventQueue(this.NOTIFY_EVENT, null, JSON.stringify(payload), recipient);
        gs.info('x_infte_ops_int NotificationService dispatched ' + templateName +
            ' to user ' + recipient + ' context ' + contextJson);
        return true;
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

    notifyOnboardingInvitation: function(onboardingRequestSysId) {
        var req = new GlideRecord(this.ONBOARDING_REQUEST_TABLE);
        if (!req.get(onboardingRequestSysId)) {
            return false;
        }
        var nomineeUserSysId = this._userSysIdForPerson('' + req.getValue('nominee'));
        var context = {
            onboarding_request_sys_id: '' + req.getUniqueValue(),
            number: '' + req.getValue('number'),
            group_role: '' + req.getValue('group_role'),
            system_role: '' + req.getValue('system_role'),
            expiry_at: '' + req.getValue('expiry_at')
        };
        return this.send(this.TEMPLATE_ONBOARDING_INVITATION, nomineeUserSysId, context);
    },

    notifyAutomationSubmitted: function(pendingActionSysId) {
        var pa = new GlideRecord(this.PENDING_ACTION_TABLE);
        if (!pa.get(pendingActionSysId)) {
            return false;
        }
        var approverUserSysId = this._userSysIdForPerson('' + pa.getValue('assigned_to'));
        var template = this.TEMPLATE_AUTOMATION_SUBMITTED;
        if ('' + pa.getValue('action_type') === 'artifact_approval') {
            template = this.TEMPLATE_CROSS_GROUP_APPROVAL;
        }
        var context = {
            pending_action_sys_id: '' + pa.getUniqueValue(),
            number: '' + pa.getValue('number'),
            action_type: '' + pa.getValue('action_type'),
            related_automation: '' + pa.getValue('related_automation'),
            related_artifact: '' + pa.getValue('related_artifact'),
            related_group: '' + pa.getValue('related_group'),
            deadline_at: '' + pa.getValue('deadline_at')
        };
        return this.send(template, approverUserSysId, context);
    },

    notifyApprovalEscalated: function(pendingActionSysId) {
        var pa = new GlideRecord(this.PENDING_ACTION_TABLE);
        if (!pa.get(pendingActionSysId)) {
            return false;
        }
        var targetPersonSysId = this.resolveEscalationTarget(pendingActionSysId);
        var targetUserSysId = this._userSysIdForPerson(targetPersonSysId);
        var context = {
            pending_action_sys_id: '' + pa.getUniqueValue(),
            number: '' + pa.getValue('number'),
            action_type: '' + pa.getValue('action_type'),
            related_automation: '' + pa.getValue('related_automation'),
            related_group: '' + pa.getValue('related_group'),
            escalated_to_person: targetPersonSysId ? ('' + targetPersonSysId) : '',
            deadline_at: '' + pa.getValue('deadline_at')
        };
        return this.send(this.TEMPLATE_APPROVAL_ESCALATED, targetUserSysId, context);
    },

    notifyAutomationApproved: function(automationSysId) {
        var auto = new GlideRecord(this.AUTOMATION_TABLE);
        if (!auto.get(automationSysId)) {
            return false;
        }
        var context = {
            automation_sys_id: '' + auto.getUniqueValue(),
            number: '' + auto.getValue('number'),
            name: '' + auto.getValue('name'),
            owner_group: '' + auto.getValue('owner_group')
        };
        var creatorUserSysId = this._userSysIdForPerson('' + auto.getValue('created_by'));
        if (creatorUserSysId) {
            this.send(this.TEMPLATE_AUTOMATION_APPROVED, creatorUserSysId, context);
        }
        var sent = {};
        if (creatorUserSysId) {
            sent[creatorUserSysId] = true;
        }
        var ga = new GlideRecord(this.GROUP_AUTOMATION_TABLE);
        ga.addQuery('automation', '' + auto.getUniqueValue());
        ga.addQuery('approval_status', 'approved');
        ga.query();
        while (ga.next()) {
            var gm = new GlideRecord(this.GROUP_MEMBER_TABLE);
            gm.addQuery('group', '' + ga.getValue('group'));
            gm.addQuery('status', 'active');
            gm.query();
            while (gm.next()) {
                var memberUserSysId = this._userSysIdForPerson('' + gm.getValue('member'));
                if (memberUserSysId && !sent[memberUserSysId]) {
                    sent[memberUserSysId] = true;
                    this.send(this.TEMPLATE_AUTOMATION_APPROVED, memberUserSysId, context);
                }
            }
        }
        return true;
    },

    notifyAutomationRejected: function(automationSysId) {
        var auto = new GlideRecord(this.AUTOMATION_TABLE);
        if (!auto.get(automationSysId)) {
            return false;
        }
        var creatorUserSysId = this._userSysIdForPerson('' + auto.getValue('created_by'));
        var context = {
            automation_sys_id: '' + auto.getUniqueValue(),
            number: '' + auto.getValue('number'),
            name: '' + auto.getValue('name'),
            rejected_reason: '' + auto.getValue('rejected_reason')
        };
        return this.send(this.TEMPLATE_AUTOMATION_REJECTED, creatorUserSysId, context);
    },

    resolveEscalationTarget: function(pendingActionSysId) {
        return new ApprovalRouter().getEscalationTarget(pendingActionSysId);
    },

    type: 'NotificationService'
};
