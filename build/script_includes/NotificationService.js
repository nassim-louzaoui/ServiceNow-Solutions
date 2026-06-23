var NotificationService = Class.create();
NotificationService.prototype = {
    initialize: function() {
        this.TEMPLATE_ONBOARDING_INVITATION  = 'Operations Intelligence - Onboarding Invitation';
        this.TEMPLATE_ONBOARDING_REMINDER    = 'Operations Intelligence - Onboarding Reminder';
        this.TEMPLATE_ONBOARDING_EXPIRED     = 'Operations Intelligence - Onboarding Expired';
        this.TEMPLATE_INVITATION_DECLINED    = 'Operations Intelligence - Invitation Declined';
        this.TEMPLATE_ONBOARDING_COMPLETE    = 'Operations Intelligence - Onboarding Complete';
        this.TEMPLATE_ADDED_TO_GROUP         = 'Operations Intelligence - Added to Group';
        this.TEMPLATE_AUTOMATION_SUBMITTED   = 'Operations Intelligence - Automation Submitted';
        this.TEMPLATE_CROSS_GROUP_APPROVAL   = 'Operations Intelligence - Cross-Group Approval Request';
        this.TEMPLATE_APPROVAL_ESCALATED     = 'Operations Intelligence - Approval Escalated';
        this.TEMPLATE_AUTOMATION_APPROVED    = 'Operations Intelligence - Automation Approved';
        this.TEMPLATE_AUTOMATION_REJECTED    = 'Operations Intelligence - Automation Rejected';
        this.TEMPLATE_USER_DEACTIVATION_ALERT = 'Operations Intelligence - User Deactivation Alert';
        this.TEMPLATE_AUTO_REMOVAL_EXECUTED  = 'Operations Intelligence - Auto Removal Executed';
        this.TEMPLATE_LEADER_REASSIGNMENT    = 'Operations Intelligence - Leader Reassignment Required';

        this._EVENT_MAP = {
            'Operations Intelligence - Onboarding Invitation':       'x_infte_ops_int.onboarding_invitation',
            'Operations Intelligence - Onboarding Reminder':         'x_infte_ops_int.onboarding_reminder',
            'Operations Intelligence - Onboarding Expired':          'x_infte_ops_int.onboarding_expired',
            'Operations Intelligence - Invitation Declined':         'x_infte_ops_int.invitation_declined',
            'Operations Intelligence - Onboarding Complete':         'x_infte_ops_int.onboarding_complete',
            'Operations Intelligence - Added to Group':              'x_infte_ops_int.added_to_group',
            'Operations Intelligence - Automation Submitted':        'x_infte_ops_int.automation_submitted',
            'Operations Intelligence - Cross-Group Approval Request':'x_infte_ops_int.cross_group_approval_req',
            'Operations Intelligence - Approval Escalated':          'x_infte_ops_int.approval_escalated',
            'Operations Intelligence - Automation Approved':         'x_infte_ops_int.automation_approved',
            'Operations Intelligence - Automation Rejected':         'x_infte_ops_int.automation_rejected',
            'Operations Intelligence - User Deactivation Alert':     'x_infte_ops_int.user_deactivation_alert',
            'Operations Intelligence - Auto Removal Executed':       'x_infte_ops_int.auto_removal_executed',
            'Operations Intelligence - Leader Reassignment Required':'x_infte_ops_int.leader_reassignment_requ'
        };
    },

    send: function(templateName, recipientUserSysId, contextObject) {
        if (!templateName) {
            gs.error('x_infte_ops_int NotificationService.send: missing templateName');
            return false;
        }
        var eventName = this._EVENT_MAP[templateName];
        if (!eventName) {
            gs.warn('x_infte_ops_int NotificationService.send: no event mapped for template ' + templateName);
            return false;
        }
        var contextJson;
        try {
            contextJson = (contextObject === null || contextObject === undefined) ?
                '{}' : JSON.stringify(contextObject);
        } catch (e) {
            contextJson = '{}';
        }
        var recipient = recipientUserSysId ? ('' + recipientUserSysId) : '';
        var personGr = new GlideRecord('x_infte_ops_int_person');
        personGr.addQuery('user', recipient);
        personGr.setLimit(1);
        personGr.query();
        if (personGr.next()) {
            gs.eventQueue(eventName, personGr, contextJson, recipient);
        } else {
            gs.eventQueue(eventName, null, contextJson, recipient);
        }
        gs.info('x_infte_ops_int NotificationService dispatched ' + templateName + ' to user ' + recipient);
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

        var recipientPersonIds = {};
        var creatorPersonSysId = '' + (auto.created_by || '');
        if (creatorPersonSysId) { recipientPersonIds[creatorPersonSysId] = true; }

        var allGroups = store.find('groups', function(g) {
            return g.status === 'active';
        });
        var gi, ai, mi;
        for (gi = 0; gi < allGroups.length; gi++) {
            var grp = allGroups[gi];
            var automationsArr = grp.automations || [];
            var hasApprovedAuto = false;
            for (ai = 0; ai < automationsArr.length; ai++) {
                if ('' + automationsArr[ai].automation_sys_id === autoSysId &&
                    '' + automationsArr[ai].approval_status === 'approved') {
                    hasApprovedAuto = true;
                    break;
                }
            }
            if (!hasApprovedAuto) { continue; }
            var membersArr = grp.members || [];
            for (mi = 0; mi < membersArr.length; mi++) {
                if ('' + membersArr[mi].status === 'active') {
                    var pId = '' + membersArr[mi].person_sys_id;
                    if (pId) { recipientPersonIds[pId] = true; }
                }
            }
        }

        var personIds = [];
        var key;
        for (key in recipientPersonIds) {
            if (recipientPersonIds.hasOwnProperty(key)) { personIds.push(key); }
        }
        if (personIds.length === 0) { return true; }

        var allPersons = store.find('persons', function(p) {
            var pid = '' + (p.sys_id || '');
            var k;
            for (k = 0; k < personIds.length; k++) {
                if (personIds[k] === pid) { return true; }
            }
            return false;
        });

        var sent = {};
        var pi;
        for (pi = 0; pi < allPersons.length; pi++) {
            var userSysId = '' + (allPersons[pi].user_sys_id || '');
            if (userSysId && !sent[userSysId]) {
                sent[userSysId] = true;
                this.send(this.TEMPLATE_AUTOMATION_APPROVED, userSysId, context);
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
