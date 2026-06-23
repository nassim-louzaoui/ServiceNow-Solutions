var ReasoningEngine = Class.create();
ReasoningEngine.prototype = {

    initialize: function() {
        this.store = new OIDataStore();
    },

    /*
     * Main entry point — four sequential reasoning passes.
     * message    : string  — raw user message
     * personSysId: string  — OIDataStore person sys_id of the caller
     * sessionCtx : object  — opaque context carried across turns { lastIntent, roleRank, turnCount }
     * Returns    : { ok, text, type, items, actions, data, followUp, sessionCtx }
     */
    reason: function(message, personSysId, sessionCtx) {
        var sc  = sessionCtx || {};
        var msg = '' + (message || '');

        var p1 = this._pass1_classify(msg, sc);
        var p2 = this._pass2_hydrate('' + (personSysId || ''), p1.intent);
        var p3 = this._pass3_plan(p1, p2);
        var p4 = this._pass4_respond(p3, p2, msg);

        if (this._shouldEnhance(p3, p2)) {
            p4 = this._pass5_enhance(p4, p3, p2, msg);
        }

        p4.sessionCtx = {
            lastIntent: p1.intent,
            roleRank:   p2.roleRank,
            turnCount:  (sc.turnCount || 0) + 1
        };
        return p4;
    },

    /* ─────────────────────────────────────────────────────────────────────────
       PASS 1 — INTENT CLASSIFICATION
       Scores every known intent by keyword / phrase match frequency.
       Longer phrase matches score higher; session continuity adds a tiebreak.
    ───────────────────────────────────────────────────────────────────────── */
    _VOCAB: {
        GREET:            ['hello','hi','hey','good morning','good afternoon','good evening','howdy','greetings','start','begin'],
        HELP:             ['help','what can you do','what can i do','how do i','how can i','guide me','show me what','explain','capabilities','options','what are my','menu'],
        STATUS_EXECUTION: ['status','check status','how is my','did it run','did it finish','execution result','what happened','last run','run history','check my run','track my'],
        RUN_AUTOMATION:   ['run','execute','start','trigger','launch','kick off','fire','begin execution'],
        LIST_AUTOMATIONS: ['list automation','show automation','available automation','what automation','which automation','browse automation','catalog','library','what can i run'],
        CREATE_AUTOMATION:['create automation','new automation','build automation','make automation','write automation','design automation','develop automation','set up automation'],
        SUBMIT_SPEC:      ['spec','specification','use case','build request','create request','submit request','new request','describe what i need','describe my need','what i want to build'],
        REVIEW_APPROVALS: ['pending approval','my approval','approval queue','waiting for my approval','anything to approve','what needs my approval','pending action','review pending','action pending'],
        APPROVE:          ['approve','approve this','mark approved','accept','green light','give approval'],
        REJECT:           ['reject','decline','deny','not approved','send back','refuse'],
        ONBOARD_USER:     ['onboard','invite','add user','new user','register user','enroll user','add member','bring in','onboarding request'],
        RE_INVITE:        ['reinvite','re-invite','resend invitation','send again','expired invitation','invite again','new invitation'],
        APPOINT_CREATOR:  ['appoint creator','make creator','assign creator','give creator role','creator access','creator permission','promote to creator'],
        CREATE_GROUP:     ['create group','new group','new team','add group','make group','set up group','start a team'],
        MANAGE_GROUP:     ['manage group','edit group','update group','group members','who is in','team members','group settings'],
        DEACTIVATION:     ['deactivate','deactivation','remove user','offboard','user left','user departure','handle deactivation','process departure'],
        LEADER_REASSIGN:  ['reassign','leader reassignment','new leader','assign leader','replace leader','leadership change'],
        MANAGE_ARTIFACTS: ['manage artifact','my artifact','my deliverable','artifact list','deliverable list','my report','my dashboard','my flow','my notification rule'],
        ARTIFACT_STATUS:  ['artifact status','deliverable status','check artifact','artifact progress','how is my artifact','pending artifact'],
        ASSIST_SETUP:     ['specification assist','spec assist','enable assist','setup assist','connect token','access token','personal access token','github token','connect github','token setup','ai assist','ai setup'],
        RECENT_ACTIVITY:  ['recent','activity','what happened recently','latest','what is new','history','log'],
        PENDING_COUNT:    ['how many pending','pending count','anything pending','do i have pending','outstanding items'],
        UNKNOWN:          []
    },

    _ROLE_REQ: {
        GREET:            0,
        HELP:             0,
        STATUS_EXECUTION: 1,
        RUN_AUTOMATION:   1,
        LIST_AUTOMATIONS: 1,
        CREATE_AUTOMATION:2,
        SUBMIT_SPEC:      2,
        REVIEW_APPROVALS: 3,
        APPROVE:          3,
        REJECT:           3,
        ONBOARD_USER:     3,
        RE_INVITE:        3,
        APPOINT_CREATOR:  3,
        CREATE_GROUP:     3,
        MANAGE_GROUP:     3,
        DEACTIVATION:     3,
        LEADER_REASSIGN:  3,
        MANAGE_ARTIFACTS: 2,
        ARTIFACT_STATUS:  2,
        ASSIST_SETUP:     2,
        RECENT_ACTIVITY:  1,
        PENDING_COUNT:    1,
        UNKNOWN:          0
    },

    _ROLE_RANK: { user: 1, creator: 2, developer: 2, leadership: 3, admin: 4 },

    _pass1_classify: function(message, sc) {
        var lower  = message.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        var scores = {};
        var intent, i, phrases, phrase;
        for (intent in this._VOCAB) {
            if (!this._VOCAB.hasOwnProperty(intent)) { continue; }
            scores[intent] = 0;
            phrases = this._VOCAB[intent];
            for (i = 0; i < phrases.length; i++) {
                phrase = phrases[i];
                if (lower.indexOf(phrase) !== -1) {
                    scores[intent] += phrase.split(' ').length * 2;
                }
            }
        }
        if (sc.lastIntent && scores[sc.lastIntent] !== undefined) {
            scores[sc.lastIntent] += 0.5;
        }
        var best = 'UNKNOWN', bestScore = 0;
        for (intent in scores) {
            if (scores.hasOwnProperty(intent) && intent !== 'UNKNOWN' && scores[intent] > bestScore) {
                bestScore = scores[intent];
                best = intent;
            }
        }
        return { intent: best, score: bestScore };
    },

    /* ─────────────────────────────────────────────────────────────────────────
       PASS 2 — CONTEXT HYDRATION
       Loads the caller's person record, groups, pending actions, and relevant
       collection data. Loads only what the classified intent needs.
    ───────────────────────────────────────────────────────────────────────── */
    _pass2_hydrate: function(personSysId, intent) {
        var ctx = {
            personSysId:         personSysId,
            person:              null,
            role:                'user',
            roleRank:            1,
            groups:              [],
            groupIds:            [],
            pendingActions:      [],
            recentExecutions:    [],
            availableAutomations:[],
            artifacts:           [],
            integrationEnabled:  false,
            assistMode:          'internal'
        };

        if (!personSysId) { return ctx; }

        ctx.person = this.store.get('persons', personSysId);
        if (ctx.person) {
            ctx.role     = '' + (ctx.person.system_role || 'user');
            ctx.roleRank = this._ROLE_RANK[ctx.role] || 1;
        }

        ctx.integrationEnabled = '' + gs.getProperty('x_infte_ops_int.spec_assist_integration_enabled', 'false') === 'true';
        ctx.assistMode         = '' + gs.getProperty('x_infte_ops_int.spec_assist_mode', 'internal');

        var self = this;

        ctx.groups = this.store.find('groups', function(g) {
            var members = self._json('' + (g.members || ''), []);
            var m;
            for (m = 0; m < members.length; m++) {
                if ('' + (members[m].person_sys_id || members[m]) === personSysId) { return true; }
            }
            return false;
        });
        var gi;
        for (gi = 0; gi < ctx.groups.length; gi++) {
            ctx.groupIds.push('' + ctx.groups[gi].sys_id);
        }

        var needsPending = ctx.roleRank >= 3 ||
            intent === 'REVIEW_APPROVALS' || intent === 'APPROVE' || intent === 'REJECT' ||
            intent === 'DEACTIVATION' || intent === 'LEADER_REASSIGN' ||
            intent === 'PENDING_COUNT' || intent === 'GREET';

        if (needsPending) {
            ctx.pendingActions = this.store.find('pending_actions', function(pa) {
                return '' + (pa.assigned_to || '') === personSysId &&
                    ('' + (pa.status || '') === 'pending' || '' + (pa.status || '') === 'escalated');
            });
        }

        var needsExecs = intent === 'STATUS_EXECUTION' || intent === 'RECENT_ACTIVITY';
        if (needsExecs) {
            var execs = this.store.find('executions', function(e) {
                return '' + (e.triggered_by || '') === personSysId;
            });
            execs.sort(function(a, b) {
                return ('' + (b.triggered_at || '')) > ('' + (a.triggered_at || '')) ? 1 : -1;
            });
            ctx.recentExecutions = execs.length > 8 ? execs.slice(0, 8) : execs;
        }

        var needsAutos = intent === 'RUN_AUTOMATION' || intent === 'LIST_AUTOMATIONS' ||
            intent === 'GREET' || intent === 'HELP' || intent === 'STATUS_EXECUTION';
        if (needsAutos) {
            var gmap = {};
            var gmi;
            for (gmi = 0; gmi < ctx.groupIds.length; gmi++) { gmap[ctx.groupIds[gmi]] = true; }
            ctx.availableAutomations = this.store.find('automations', function(a) {
                return '' + (a.status || '') === 'published' && gmap['' + (a.owner_group || '')] === true;
            });
        }

        var needsArtifacts = intent === 'MANAGE_ARTIFACTS' || intent === 'ARTIFACT_STATUS';
        if (needsArtifacts) {
            var agmap = {};
            var agmi;
            for (agmi = 0; agmi < ctx.groupIds.length; agmi++) { agmap[ctx.groupIds[agmi]] = true; }
            ctx.artifacts = this.store.find('managed_artifacts', function(a) {
                return '' + (a.created_by_person || '') === personSysId ||
                    agmap['' + (a.owner_group || '')] === true;
            });
        }

        return ctx;
    },

    /* ─────────────────────────────────────────────────────────────────────────
       PASS 3 — ACTION PLANNING
       Validates permissions, detects edge cases, decides what to do.
    ───────────────────────────────────────────────────────────────────────── */
    _pass3_plan: function(p1, ctx) {
        var reqRank   = this._ROLE_REQ[p1.intent] || 0;
        var permitted = ctx.roleRank >= reqRank;
        var denyReason = '';

        if (!permitted) {
            var roleName = ['', 'user', 'creator', 'leadership', 'admin'][reqRank] || 'leadership';
            denyReason = 'This requires the ' + roleName + ' role or above. Your current role is ' + ctx.role + '.';
        }

        if (!ctx.person && reqRank > 0) {
            permitted  = false;
            denyReason = 'Your profile was not found in Operations Intelligence. Please contact your administrator.';
        }

        return {
            intent:    p1.intent,
            score:     p1.score,
            permitted: permitted,
            denyReason: denyReason
        };
    },

    /* ─────────────────────────────────────────────────────────────────────────
       PASS 4 — RESPONSE SYNTHESIS
       Routes to the correct handler and builds the structured response object.
    ───────────────────────────────────────────────────────────────────────── */
    _pass4_respond: function(plan, ctx, message) {
        if (!plan.permitted) {
            return this._resp({
                text: plan.denyReason,
                type: 'error',
                actions: this._defaultActions(ctx)
            });
        }
        var h = {
            GREET:             '_hGreet',
            HELP:              '_hHelp',
            STATUS_EXECUTION:  '_hStatusExecution',
            RUN_AUTOMATION:    '_hRunAutomation',
            LIST_AUTOMATIONS:  '_hListAutomations',
            CREATE_AUTOMATION: '_hCreateAutomation',
            SUBMIT_SPEC:       '_hSubmitSpec',
            REVIEW_APPROVALS:  '_hReviewApprovals',
            APPROVE:           '_hApprove',
            REJECT:            '_hReject',
            ONBOARD_USER:      '_hOnboardUser',
            RE_INVITE:         '_hReInvite',
            APPOINT_CREATOR:   '_hAppointCreator',
            CREATE_GROUP:      '_hCreateGroup',
            MANAGE_GROUP:      '_hManageGroup',
            DEACTIVATION:      '_hDeactivation',
            LEADER_REASSIGN:   '_hLeaderReassign',
            MANAGE_ARTIFACTS:  '_hManageArtifacts',
            ARTIFACT_STATUS:   '_hArtifactStatus',
            ASSIST_SETUP:      '_hAssistSetup',
            RECENT_ACTIVITY:   '_hRecentActivity',
            PENDING_COUNT:     '_hPendingCount',
            UNKNOWN:           '_hUnknown'
        };
        var fn = h[plan.intent] || '_hUnknown';
        return this[fn](ctx, message);
    },

    /* ─────────────────────────────────────────────────────────────────────────
       PASS 5 — OPTIONAL EXTERNAL ENHANCEMENT
       Only runs when: integration toggle on, user has active token, mode is not
       'internal', and the intent is in the enhanceable set.
    ───────────────────────────────────────────────────────────────────────── */
    _shouldEnhance: function(plan, ctx) {
        if (!ctx.integrationEnabled || ctx.assistMode === 'internal') { return false; }
        if (!ctx.person) { return false; }
        if (ctx.person.spec_assist_enabled !== true && ctx.person.spec_assist_enabled !== 'true') { return false; }
        if ('' + (ctx.person.token_status || '') !== 'active') { return false; }
        var eligible = { CREATE_AUTOMATION: true, SUBMIT_SPEC: true, MANAGE_ARTIFACTS: true };
        return eligible[plan.intent] === true;
    },

    _pass5_enhance: function(response, plan, ctx, message) {
        try {
            var bridge = new CreatorAssistBridge();
            if (plan.intent === 'CREATE_AUTOMATION' || plan.intent === 'SUBMIT_SPEC') {
                var spec = response.data ? JSON.stringify(response.data) : '{}';
                var phrases = bridge.generatePhrases(spec, ctx.personSysId);
                if (phrases && phrases.ok) {
                    if (phrases.additional_phrases && phrases.additional_phrases.length) {
                        response.enhancedPhrases  = phrases.additional_phrases;
                    }
                    if (phrases.gap_analysis && phrases.gap_analysis.length) {
                        response.gapAnalysis = phrases.gap_analysis;
                    }
                    if (phrases.step_optimisations && phrases.step_optimisations.length) {
                        response.optimisations = phrases.step_optimisations;
                    }
                }
            }
        } catch (e) {
            gs.warn('x_infte_ops_int ReasoningEngine._pass5_enhance: ' + e);
        }
        return response;
    },

    /* ─────────────────────────────────────────────────────────────────────────
       INTENT HANDLERS
    ───────────────────────────────────────────────────────────────────────── */
    _hGreet: function(ctx, message) {
        var name = '';
        if (ctx.person) {
            var parts = ('' + (ctx.person.display_name || ctx.person.user || '')).split(' ');
            name = parts[0] || '';
        }
        var greeting = name ? 'Hello ' + name + '.' : 'Hello.';

        var roleDesc = {
            admin:      'You have full administrative access across all platform functions.',
            leadership: 'You have access to governance, approval management, and team oversight.',
            creator:    'You can build automations, submit specifications, and manage your deliverables.',
            developer:  'You can create and manage automations and technical deliverables.',
            user:       'You can run automations available to your groups and track your executions.'
        };
        var desc = roleDesc[ctx.role] || roleDesc.user;

        var notes = [];
        if (ctx.pendingActions.length > 0) {
            notes.push(ctx.pendingActions.length + ' item' + (ctx.pendingActions.length > 1 ? 's' : '') + ' await your action.');
        }
        if (ctx.availableAutomations.length > 0) {
            notes.push(ctx.availableAutomations.length + ' automation' + (ctx.availableAutomations.length > 1 ? 's are' : ' is') + ' available to your groups.');
        }

        var text = greeting + ' ' + desc + (notes.length ? ' ' + notes.join(' ') : '') + ' How can I assist you?';

        return this._resp({
            text:     text,
            type:     'greeting',
            followUp: this._roleFollowUp(ctx.role),
            actions:  this._defaultActions(ctx)
        });
    },

    _hHelp: function(ctx, message) {
        return this._resp({
            text:     'Here is what I can help you with:',
            type:     'list',
            items:    this._capabilitiesList(ctx.role, ctx.integrationEnabled),
            followUp: 'Which area would you like to explore?',
            actions:  this._defaultActions(ctx)
        });
    },

    _hStatusExecution: function(ctx, message) {
        if (ctx.recentExecutions.length === 0) {
            return this._resp({
                text:    'You have no recorded executions yet.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        var items = [];
        var i;
        for (i = 0; i < ctx.recentExecutions.length; i++) {
            var e   = ctx.recentExecutions[i];
            var nm  = '' + (e.automation_name || e.automation || 'Unknown Automation');
            var st  = '' + (e.status || 'unknown');
            var at  = '' + (e.triggered_at || '');
            var atp = at ? ' · ' + at.substring(0, 16) : '';
            items.push(nm + ' — ' + st + atp);
        }
        return this._resp({
            text:     'Your ' + ctx.recentExecutions.length + ' most recent execution' + (ctx.recentExecutions.length > 1 ? 's' : '') + ':',
            type:     'list',
            items:    items,
            data:     { executions: ctx.recentExecutions },
            followUp: 'Would you like to run an automation or review a specific result?',
            actions:  [
                { label: 'Run an automation', intent: 'RUN_AUTOMATION', params: {} },
                { label: 'Back to menu', intent: 'HELP', params: {} }
            ]
        });
    },

    _hRunAutomation: function(ctx, message) {
        if (ctx.availableAutomations.length === 0) {
            return this._resp({
                text:    'No automations are currently published and available to your groups. Contact your group leader if you expect automations to be available.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        var items   = [];
        var actions = [];
        var i, a;
        for (i = 0; i < ctx.availableAutomations.length; i++) {
            a = ctx.availableAutomations[i];
            items.push('' + (a.name || 'Unnamed') + (a.short_description ? ' — ' + a.short_description : ''));
            actions.push({ label: '' + (a.name || 'Unnamed'), intent: 'RUN_CONFIRM', params: { automationSysId: '' + a.sys_id } });
        }
        return this._resp({
            text:     'The following automations are available to your groups. Select one to run:',
            type:     'list',
            items:    items,
            data:     { automations: ctx.availableAutomations },
            actions:  actions
        });
    },

    _hListAutomations: function(ctx, message) {
        return this._hRunAutomation(ctx, message);
    },

    _hCreateAutomation: function(ctx, message) {
        var assistNote = '';
        if (ctx.integrationEnabled && ctx.person &&
            (ctx.person.spec_assist_enabled === true || ctx.person.spec_assist_enabled === 'true') &&
            '' + (ctx.person.token_status || '') === 'active') {
            assistNote = ' Specification Assist is active and will enhance your specification once submitted.';
        }
        return this._resp({
            text:     'To create an automation, start with a build request that describes the objective, the target group, expected inputs, and desired outputs. I will guide you through the process.' + assistNote,
            type:     'action',
            followUp: 'Would you like to start a build request now, or describe what you want to build first?',
            actions:  [
                { label: 'Start a build request', intent: 'NAVIGATE_SPEC', params: {} },
                { label: 'Browse existing automations', intent: 'LIST_AUTOMATIONS', params: {} }
            ]
        });
    },

    _hSubmitSpec: function(ctx, message) {
        var assistNote = '';
        if (ctx.integrationEnabled && ctx.person &&
            (ctx.person.spec_assist_enabled === true || ctx.person.spec_assist_enabled === 'true') &&
            '' + (ctx.person.token_status || '') === 'active') {
            assistNote = ' Your Specification Assist token is active and will enrich your submission.';
        } else if (ctx.integrationEnabled) {
            assistNote = ' You can also enable Specification Assist in your profile to get AI-powered specification enhancement.';
        }
        return this._resp({
            text:     'A build request describes an automation or deliverable you want created. Provide a clear title, a description of what it should do, the target group, and any constraints or inputs.' + assistNote,
            type:     'action',
            followUp: 'Do you have a specific automation in mind? Describe it and I can help you structure the request.',
            actions:  [
                { label: 'Open Build Request form', intent: 'NAVIGATE_SPEC', params: {} }
            ]
        });
    },

    _hReviewApprovals: function(ctx, message) {
        if (ctx.pendingActions.length === 0) {
            return this._resp({
                text:    'You have no pending approvals or actions at this time.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        var items = [];
        var i, pa, type, deadline;
        for (i = 0; i < ctx.pendingActions.length; i++) {
            pa       = ctx.pendingActions[i];
            type     = ('' + (pa.action_type || '')).replace(/_/g, ' ');
            deadline = '' + (pa.deadline_at || '');
            items.push(type + (deadline ? ' · due ' + deadline.substring(0, 10) : '') +
                ('' + (pa.status || '') === 'escalated' ? ' [ESCALATED]' : ''));
        }
        return this._resp({
            text:     'You have ' + ctx.pendingActions.length + ' item' + (ctx.pendingActions.length > 1 ? 's' : '') + ' requiring your attention:',
            type:     'list',
            items:    items,
            data:     { pendingActions: ctx.pendingActions },
            followUp: 'Open the Governance panel to action these items.',
            actions:  [{ label: 'Open Governance panel', intent: 'NAVIGATE_GOVERNANCE', params: {} }]
        });
    },

    _hApprove: function(ctx, message) {
        return this._resp({
            text:     'To approve a pending item, open the Governance panel, locate the pending approval, and select Approve. You can also add a note before confirming.',
            type:     'action',
            actions:  [{ label: 'Open Governance panel', intent: 'NAVIGATE_GOVERNANCE', params: {} }]
        });
    },

    _hReject: function(ctx, message) {
        return this._resp({
            text:     'To reject a pending item, open the Governance panel, locate the item, select Reject, and provide a reason. The submitter will be notified automatically.',
            type:     'action',
            actions:  [{ label: 'Open Governance panel', intent: 'NAVIGATE_GOVERNANCE', params: {} }]
        });
    },

    _hOnboardUser: function(ctx, message) {
        return this._resp({
            text:     'To onboard a new user, initiate an onboarding request from the Governance panel. Specify the user, their target role, and which group they are joining. They will receive an invitation to complete the process independently.',
            type:     'action',
            followUp: 'Do you have the user details ready?',
            actions:  [{ label: 'Open Governance — Onboarding', intent: 'NAVIGATE_ONBOARDING', params: {} }]
        });
    },

    _hReInvite: function(ctx, message) {
        return this._resp({
            text:     'To resend an expired invitation, locate the original onboarding request in the Governance panel and use the Re-invite action. The nominee will receive a new invitation with a refreshed expiry window.',
            type:     'action',
            actions:  [{ label: 'Open Governance — Onboarding Requests', intent: 'NAVIGATE_ONBOARDING', params: {} }]
        });
    },

    _hAppointCreator: function(ctx, message) {
        return this._resp({
            text:     'To appoint a user as a creator, initiate an onboarding request from the Governance panel and select the Creator role. The user must already be an active Operations Intelligence member.',
            type:     'action',
            actions:  [{ label: 'Open Governance — Onboarding', intent: 'NAVIGATE_ONBOARDING', params: {} }]
        });
    },

    _hCreateGroup: function(ctx, message) {
        return this._resp({
            text:     'Groups organise users and automations within Operations Intelligence. From the Governance panel you can create a new group by providing a name, type, description, and initial owner.',
            type:     'action',
            actions:  [{ label: 'Open Governance — Groups', intent: 'NAVIGATE_GROUPS', params: {} }]
        });
    },

    _hManageGroup: function(ctx, message) {
        if (ctx.groups.length === 0) {
            return this._resp({
                text:    'You are not currently a member of any groups. Contact your administrator to be added to a group.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        var items = [];
        var i;
        for (i = 0; i < ctx.groups.length; i++) {
            var g = ctx.groups[i];
            items.push('' + (g.name || 'Unnamed') + ' (' + '' + (g.type || 'group') + ')');
        }
        return this._resp({
            text:     'You are a member of ' + ctx.groups.length + ' group' + (ctx.groups.length > 1 ? 's' : '') + ':',
            type:     'list',
            items:    items,
            data:     { groups: ctx.groups },
            actions:  [{ label: 'Manage groups in Governance', intent: 'NAVIGATE_GROUPS', params: {} }]
        });
    },

    _hDeactivation: function(ctx, message) {
        var cases = [];
        var i;
        for (i = 0; i < ctx.pendingActions.length; i++) {
            if ('' + (ctx.pendingActions[i].action_type || '') === 'user_deactivation') {
                cases.push(ctx.pendingActions[i]);
            }
        }
        if (cases.length === 0) {
            return this._resp({
                text:    'There are no pending deactivation cases assigned to you.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        return this._resp({
            text:     'You have ' + cases.length + ' deactivation ' + (cases.length > 1 ? 'cases' : 'case') + ' requiring a decision. Review each case in the Governance panel and choose how to handle the affected user\'s access and group memberships.',
            type:     'action',
            data:     { deactivationCases: cases },
            actions:  [{ label: 'Open Governance — Deactivations', intent: 'NAVIGATE_DEACTIVATIONS', params: {} }]
        });
    },

    _hLeaderReassign: function(ctx, message) {
        var cases = [];
        var i;
        for (i = 0; i < ctx.pendingActions.length; i++) {
            if ('' + (ctx.pendingActions[i].action_type || '') === 'leader_reassignment') {
                cases.push(ctx.pendingActions[i]);
            }
        }
        if (cases.length === 0) {
            return this._resp({
                text:    'There are no pending leader reassignment actions assigned to you.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        return this._resp({
            text:     'You have ' + cases.length + ' leader reassignment ' + (cases.length > 1 ? 'cases' : 'case') + '. Each case requires you to designate a new leader for the affected team members before the deadline.',
            type:     'action',
            data:     { reassignmentCases: cases },
            actions:  [{ label: 'Open Governance — Reassignments', intent: 'NAVIGATE_GOVERNANCE', params: {} }]
        });
    },

    _hManageArtifacts: function(ctx, message) {
        if (ctx.artifacts.length === 0) {
            return this._resp({
                text:    'No managed deliverables are currently associated with your profile or groups. You can request artifacts such as reports, dashboards, flows, and notification rules from the Creator Studio.',
                type:    'info',
                actions: [{ label: 'Open Creator Studio', intent: 'NAVIGATE_STUDIO', params: {} }]
            });
        }
        var items = [];
        var i, a;
        for (i = 0; i < ctx.artifacts.length; i++) {
            a = ctx.artifacts[i];
            items.push('' + (a.display_name || 'Unnamed') + ' · ' + '' + (a.artifact_type || 'unknown').replace(/_/g, ' ') + ' · ' + '' + (a.status || 'unknown'));
        }
        return this._resp({
            text:     'You have ' + ctx.artifacts.length + ' deliverable' + (ctx.artifacts.length > 1 ? 's' : '') + ' in your scope:',
            type:     'list',
            items:    items,
            data:     { artifacts: ctx.artifacts },
            actions:  [{ label: 'Manage in Creator Studio', intent: 'NAVIGATE_STUDIO', params: {} }]
        });
    },

    _hArtifactStatus: function(ctx, message) {
        return this._hManageArtifacts(ctx, message);
    },

    _hAssistSetup: function(ctx, message) {
        if (!ctx.integrationEnabled) {
            return this._resp({
                text:    'Specification Assist has not been enabled on this platform. Contact your Operations Intelligence administrator to request activation.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        var active = ctx.person &&
            (ctx.person.spec_assist_enabled === true || ctx.person.spec_assist_enabled === 'true') &&
            '' + (ctx.person.token_status || '') === 'active';
        if (active) {
            return this._resp({
                text:    'Specification Assist is already active on your profile. Your personal access token has been validated and is current.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        return this._resp({
            text:     'Specification Assist enhances automation specifications by analysing your requirements and suggesting improvements and phrasing. To enable it, provide your personal access token in your profile settings. It is stored encrypted and validated immediately.',
            type:     'action',
            followUp: 'Do you have your personal access token ready?',
            actions:  [{ label: 'Open profile — Specification Assist setup', intent: 'NAVIGATE_ASSIST_SETUP', params: {} }]
        });
    },

    _hRecentActivity: function(ctx, message) {
        if (ctx.recentExecutions.length === 0) {
            return this._resp({
                text:    'No recent execution activity found for your account.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        return this._hStatusExecution(ctx, message);
    },

    _hPendingCount: function(ctx, message) {
        var count = ctx.pendingActions.length;
        if (count === 0) {
            return this._resp({
                text:    'You have no pending items at this time.',
                type:    'info',
                actions: this._defaultActions(ctx)
            });
        }
        return this._resp({
            text:     'You currently have ' + count + ' pending item' + (count > 1 ? 's' : '') + ' awaiting your action.',
            type:     'info',
            data:     { pendingCount: count },
            followUp: 'Would you like to review them?',
            actions:  [
                { label: 'Review pending items', intent: 'REVIEW_APPROVALS', params: {} },
                { label: 'Back to menu', intent: 'HELP', params: {} }
            ]
        });
    },

    _hUnknown: function(ctx, message) {
        return this._resp({
            text:     'I was not able to determine what you need from that message. Here is what I can help you with:',
            type:     'list',
            items:    this._capabilitiesList(ctx.role, ctx.integrationEnabled),
            followUp: 'Please describe what you would like to do and I will assist you.',
            actions:  this._defaultActions(ctx)
        });
    },

    /* ─────────────────────────────────────────────────────────────────────────
       RESPONSE BUILDER & UTILITIES
    ───────────────────────────────────────────────────────────────────────── */
    _resp: function(opts) {
        return {
            ok:         true,
            text:       opts.text    || '',
            type:       opts.type    || 'info',
            items:      opts.items   || [],
            actions:    opts.actions || [],
            data:       opts.data    || null,
            followUp:   opts.followUp || null,
            sessionCtx: null
        };
    },

    _defaultActions: function(ctx) {
        var actions = [{ label: 'Show what I can do', intent: 'HELP', params: {} }];
        if (ctx.availableAutomations && ctx.availableAutomations.length > 0) {
            actions.push({ label: 'Browse automations', intent: 'LIST_AUTOMATIONS', params: {} });
        }
        if (ctx.pendingActions && ctx.pendingActions.length > 0) {
            actions.push({ label: 'Review pending items', intent: 'REVIEW_APPROVALS', params: {} });
        }
        return actions;
    },

    _capabilitiesList: function(role, integrationEnabled) {
        var base = [
            'Check the status of your recent executions',
            'Run an automation available to your groups',
            'Browse automations available to you',
            'See how many items are pending your action'
        ];
        var creator = [
            'Start a new automation build request',
            'Submit a use case specification',
            'Review and manage your deliverables',
            'Check the status of your deliverables'
        ];
        if (integrationEnabled) {
            creator.push('Set up Specification Assist on your profile');
        }
        var leader = [
            'Review and action pending approvals',
            'Onboard a new user or team member',
            'Appoint a user as a creator',
            'Re-send an expired onboarding invitation',
            'Create a new group',
            'Handle deactivation decisions for your team',
            'Action leader reassignment cases'
        ];
        var admin = [
            'Full governance across all groups and users',
            'Handle all escalated approvals and deactivations',
            'Manage platform-wide reporting relationships'
        ];
        var list = [].concat(base);
        if (role === 'creator' || role === 'developer') {
            list = list.concat(creator);
        } else if (role === 'leadership') {
            list = list.concat(creator).concat(leader);
        } else if (role === 'admin') {
            list = list.concat(creator).concat(leader).concat(admin);
        }
        return list;
    },

    _roleFollowUp: function(role) {
        var m = {
            admin:      'You can manage the full platform from here. What would you like to do?',
            leadership: 'Would you like to review pending approvals or manage your team?',
            creator:    'Would you like to start a build request or check your existing automations?',
            developer:  'Would you like to start a build request or check your existing automations?',
            user:       'Would you like to run an automation or check your recent executions?'
        };
        return m[role] || m.user;
    },

    _json: function(str, fallback) {
        if (!str || str === 'null' || str === 'undefined') { return fallback; }
        try { return JSON.parse(str); } catch (e) { return fallback; }
    },

    type: 'ReasoningEngine'
};
