var NotificationService = Class.create();
NotificationService.prototype = {
    initialize: function() {
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
        var store = new OIDataStore();
        var person = store.get('persons', '' + personSysId);
        if (!person) {
            return null;
        }
        var userSysId = '' + (person.user_sys_id || '');
        return userSysId ? userSysId : null;
    },

    notifyOnboardingInvitation: function(onboardingRequestSysId) {
        var store = new OIDataStore();
        var req = store.get('onboarding_requests', '' + onboardingRequestSysId);
        if (!req) {
            return false;
        }
        var nomineeUserSysId = this._userSysIdForPerson('' + (req.nominee || ''));
        var context = {
            onboarding_request_sys_id: '' + (req.sys_id || onboardingRequestSysId),
            number: '' + (req.number || ''),
            group_role: '' + (req.group_role || ''),
            system_role: '' + (req.system_role || ''),
            expiry_at: '' + (req.expiry_at || '')
        };
        return this.send(this.TEMPLATE_ONBOARDING_INVITATION, nomineeUserSysId, context);
    },

    notifyAutomationSubmitted: function(pendingActionSysId) {
        var store = new OIDataStore();
        var pa = store.get('pending_actions', '' + pendingActionSysId);
        if (!pa) {
            return false;
        }
        var approverUserSysId = this._userSysIdForPerson('' + (pa.assigned_to || ''));
        var template = this.TEMPLATE_AUTOMATION_SUBMITTED;
        if ('' + (pa.action_type || '') === 'artifact_approval') {
            template = this.TEMPLATE_CROSS_GROUP_APPROVAL;
        }
        var context = {
            pending_action_sys_id: '' + (pa.sys_id || pendingActionSysId),
            number: '' + (pa.number || ''),
            action_type: '' + (pa.action_type || ''),
            related_automation: '' + (pa.related_automation || ''),
            related_artifact: '' + (pa.related_artifact || ''),
            related_group: '' + (pa.related_group || ''),
            deadline_at: '' + (pa.deadline_at || '')
        };
        return this.send(template, approverUserSysId, context);
    },

    notifyApprovalEscalated: function(pendingActionSysId) {
        var store = new OIDataStore();
        var pa = store.get('pending_actions', '' + pendingActionSysId);
        if (!pa) {
            return false;
        }
        var targetPersonSysId = this.resolveEscalationTarget(pendingActionSysId);
        var targetUserSysId = this._userSysIdForPerson(targetPersonSysId);
        var context = {
            pending_action_sys_id: '' + (pa.sys_id || pendingActionSysId),
            number: '' + (pa.number || ''),
            action_type: '' + (pa.action_type || ''),
            related_automation: '' + (pa.related_automation || ''),
            related_group: '' + (pa.related_group || ''),
            escalated_to_person: targetPersonSysId ? ('' + targetPersonSysId) : '',
            deadline_at: '' + (pa.deadline_at || '')
        };
        return this.send(this.TEMPLATE_APPROVAL_ESCALATED, targetUserSysId, context);
    },

    notifyAutomationApproved: function(automationSysId) {
        var store = new OIDataStore();
        var auto = store.get('automations', '' + automationSysId);
        if (!auto) {
            return false;
        }
        var autoSysId = '' + (auto.sys_id || automationSysId);
        var context = {
            automation_sys_id: autoSysId,
            number: '' + (auto.number || ''),
            name: '' + (auto.name || ''),
            owner_group: '' + (auto.owner_group || '')
        };
        var creatorUserSysId = this._userSysIdForPerson('' + (auto.created_by || ''));
        if (creatorUserSysId) {
            this.send(this.TEMPLATE_AUTOMATION_APPROVED, creatorUserSysId, context);
        }
        var sent = {};
        if (creatorUserSysId) {
            sent[creatorUserSysId] = true;
        }
        var allGroups = store.find('groups', function(g) {
            return g.status === 'active';
        });
        var gi;
        for (gi = 0; gi < allGroups.length; gi++) {
            var grp = allGroups[gi];
            var automationsArr = grp.automations || [];
            var hasApprovedAuto = false;
            var ai;
            for (ai = 0; ai < automationsArr.length; ai++) {
                if ('' + automationsArr[ai].automation_sys_id === autoSysId &&
                    '' + automationsArr[ai].approval_status === 'approved') {
                    hasApprovedAuto = true;
                    break;
                }
            }
            if (!hasApprovedAuto) {
                continue;
            }
            var membersArr = grp.members || [];
            var mi;
            for (mi = 0; mi < membersArr.length; mi++) {
                if ('' + membersArr[mi].status !== 'active') {
                    continue;
                }
                var memberUserSysId = this._userSysIdForPerson('' + membersArr[mi].person_sys_id);
                if (memberUserSysId && !sent[memberUserSysId]) {
                    sent[memberUserSysId] = true;
                    this.send(this.TEMPLATE_AUTOMATION_APPROVED, memberUserSysId, context);
                }
            }
        }
        return true;
    },

    notifyAutomationRejected: function(automationSysId) {
        var store = new OIDataStore();
        var auto = store.get('automations', '' + automationSysId);
        if (!auto) {
            return false;
        }
        var creatorUserSysId = this._userSysIdForPerson('' + (auto.created_by || ''));
        var context = {
            automation_sys_id: '' + (auto.sys_id || automationSysId),
            number: '' + (auto.number || ''),
            name: '' + (auto.name || ''),
            rejected_reason: '' + (auto.rejected_reason || '')
        };
        return this.send(this.TEMPLATE_AUTOMATION_REJECTED, creatorUserSysId, context);
    },

    resolveEscalationTarget: function(pendingActionSysId) {
        return new ApprovalRouter().getEscalationTarget(pendingActionSysId);
    },

    type: 'NotificationService'
};
