var ConversationAdvisor = Class.create();
ConversationAdvisor.prototype = {

    initialize: function(assistantType) {
        this.assistantType = assistantType || 'operations';
        this.PERSON_TABLE   = 'x_infte_ops_int_person';
        this.GROUP_TABLE    = 'x_infte_ops_int_group';
        this.AUTO_TABLE     = 'x_infte_ops_int_automation';
        this.PENDING_TABLE  = 'x_infte_ops_int_pending_action';
        this.CAT_TABLE      = 'x_infte_ops_int_catalog_category';
        this.ITEM_TABLE     = 'x_infte_ops_int_catalog_item';
    },

    /*
     * Main entry point.
     * rawMessage : string — what the user typed
     * userCtx    : object — { user_sys_id, full_name, system_role, person_sys_id, groups }
     * history    : array  — last N { role, text } pairs (client-supplied)
     * returns    : { reply, type, choices, dataHint }
     *   type: 'text' | 'clarify' | 'data' | 'action_result' | 'error'
     *   choices: null | [{label, value}]
     *   dataHint: null | 'load_incidents' | 'load_approvals' | 'load_automations' | 'show_catalog' etc.
     */
    analyze: function(rawMessage, userCtx, history) {
        var msg     = this._norm(rawMessage);
        var tokens  = this._tok(msg);
        var ctx     = userCtx   || {};
        var hist    = history   || [];

        /* ── 1. Micro-intents (greetings, gratitude, frustration) ── */
        var micro = this._microIntent(msg);
        if (micro) { return micro; }

        /* ── 2. History context ── */
        var hCtx = this._histCtx(hist);

        /* ── 3. Score domains & actions ── */
        var domains = this._scoreDomains(msg, tokens);
        var actions = this._scoreActions(msg, tokens);
        var topDom  = domains[0]  || { name: '', score: 0 };
        var topAct  = actions[0]  || { name: '', score: 0 };

        /* ── 4. Entity extraction ── */
        var entities = this._entities(msg);

        /* ── 5. Route by assistant type ── */
        if (this.assistantType === 'developer') {
            return this._routeDeveloper(msg, tokens, topDom, topAct, entities, hCtx, ctx);
        }
        if (this.assistantType === 'admin') {
            return this._routeAdmin(msg, tokens, topDom, topAct, entities, hCtx, ctx);
        }
        return this._routeOperations(msg, tokens, topDom, topAct, entities, hCtx, ctx);
    },

    /* ═══════════════════════════════════════════════════════════════
       OPERATIONS ASSISTANT
    ═══════════════════════════════════════════════════════════════ */
    _routeOperations: function(msg, tokens, topDom, topAct, entities, hCtx, ctx) {
        var firstName = this._firstName(ctx.full_name);

        /* Show pending approvals */
        if (this._m(msg, ['show my approval','my pending approval','what needs my approval',
                'approval queue','review approval','pending review','waiting for my approval',
                'anything to approve','need to approve'])) {
            return { reply: null, type: 'data', dataHint: 'load_approvals',
                     choices: null, ctx: hCtx };
        }

        /* Show incidents */
        if (this._m(msg, ['show my incident','my open incident','my ticket','list incident',
                'view my incident','my incidents','check my incident'])) {
            return { reply: null, type: 'data', dataHint: 'load_incidents',
                     choices: null, ctx: hCtx };
        }

        /* Show available automations / catalog */
        if (this._m(msg, ['show automation','available automation','what automation',
                'what can i run','what is available','list automation','view catalog',
                'show catalog','what items','browse catalog'])) {
            return { reply: null, type: 'data', dataHint: 'show_catalog',
                     choices: null, ctx: hCtx };
        }

        /* What is my role */
        if (this._m(msg, ['what is my role','my role','what role am i','my access level',
                'what can i do','my permission'])) {
            var roleMap = { admin: 'Administrator', leadership: 'Leadership',
                            creator: 'Creator', developer: 'Developer', user: 'User' };
            var rl = roleMap[ctx.system_role] || 'User';
            var roleDesc = {
                admin:      'As an Administrator, you have full access: Workspace, Operations Gallery, Operations Studio, Operations Governance, Developer Workspace, and Operations Command.',
                developer:  'As a Developer, you have access to the full portal including the Developer Workspace where you can inspect all application artifacts, tables, and configurations.',
                leadership: 'As a Leadership member, you can access Workspace, Operations Gallery, and Operations Governance where you review pending approvals and oversee group activity.',
                creator:    'As a Creator, you have access to Workspace, Operations Gallery, and Operations Studio where you can build deliverables and manage automations.',
                user:       'As a User, you have access to Workspace and Operations Gallery. You can run automations from your groups and view deliverables.'
            };
            return { reply: 'Your current role is ' + rl + '. ' + (roleDesc[ctx.system_role] || ''),
                     type: 'text', choices: null };
        }

        /* What are my groups */
        if (this._m(msg, ['my group','which group','what group','group membership',
                'groups i belong','am i in a group'])) {
            var grps = ctx.groups || [];
            if (!grps.length) {
                return { reply: 'You are not currently a member of any Operations Intelligence group. Your manager or an administrator can add you to a group, which gives you access to that group\'s automations.',
                         type: 'text', choices: null };
            }
            var gNames = [];
            var gi;
            for (gi = 0; gi < grps.length; gi++) {
                gNames.push(grps[gi].group_name + ' (' + grps[gi].group_role + ')');
            }
            return { reply: 'You are a member of ' + grps.length + ' group' + (grps.length > 1 ? 's' : '') + ': ' + gNames.join(', ') + '.',
                     type: 'text', choices: null };
        }

        /* Incident-specific number lookup */
        if (entities.incidentNumber) {
            return { reply: null, type: 'data', dataHint: 'lookup_incident',
                     params: { number: entities.incidentNumber }, choices: null };
        }

        /* High-confidence domain + action routing */
        if (topDom.score >= 40 && topAct.score >= 30) {
            return this._opsDomainAction(msg, topDom.name, topAct.name, entities, hCtx, ctx, firstName);
        }

        /* Medium confidence — domain known, action unclear */
        if (topDom.score >= 35) {
            return this._opsDomainClarify(msg, topDom.name, hCtx, firstName);
        }

        /* History context continuation */
        if (hCtx.lastDomain && this._isContinuation(msg)) {
            return this._opsDomainClarify(msg, hCtx.lastDomain, hCtx, firstName);
        }

        /* Low confidence — general probe */
        return this._opsGeneralProbe(msg, tokens, firstName, ctx);
    },

    _opsDomainAction: function(msg, domain, action, entities, hCtx, ctx, firstName) {
        /* Incident domain */
        if (domain === 'incident') {
            if (action === 'create') {
                return { reply: 'To log an incident, open the Service Portal and choose Report an Issue at /sp?id=new_call. Provide a clear description, when it started, how many people are affected, and any error messages. For a critical outage affecting many users, call the IT helpdesk directly so it can be triaged immediately.',
                         type: 'text', choices: null };
            }
            if (action === 'view') {
                return { reply: null, type: 'data', dataHint: 'load_incidents', choices: null };
            }
            if (action === 'explain') {
                return { reply: 'Incident states track progress through the lifecycle:\n\n• New — logged, not yet assigned\n• In Progress — actively being worked\n• On Hold — paused, waiting on caller, vendor, or change\n• Resolved — fix is in place, awaiting confirmation\n• Closed — confirmed resolved\n\nPriority is set from Impact and Urgency: P1 Critical through P4 Low. Ask me about a specific aspect of incident management for more detail.',
                         type: 'text', choices: null };
            }
        }

        /* Change domain */
        if (domain === 'change') {
            if (action === 'create') {
                return { reply: 'To create a Change Request, use the Service Catalog at /sp?id=sc_home and search for "Change Request". You will need: a description, justification, implementation plan, back-out plan, risk assessment, and a proposed change window. Choose the change type — Standard (pre-approved), Normal (CAB review), or Emergency (expedited).',
                         type: 'text', choices: null };
            }
            if (action === 'explain') {
                return { reply: 'There are three change types:\n\n• Standard — pre-approved, low-risk, repeatable, no CAB needed\n• Normal — assessed and approved by the Change Advisory Board based on risk\n• Emergency — expedited for urgent fixes, with retrospective review afterwards\n\nChoose the type that matches the risk and urgency of your work.',
                         type: 'text', choices: null };
            }
        }

        /* Automation domain */
        if (domain === 'automation') {
            if (action === 'view' || action === 'trigger') {
                return { reply: null, type: 'data', dataHint: 'show_catalog', choices: null };
            }
            if (action === 'create') {
                return { reply: 'Automations are built in Operations Studio by users with the Creator or Administrator role. If you have Creator access, navigate to Operations Studio from the sidebar and use the Automations tab to define a new automation. Once built, it must be submitted for approval before it can be assigned to groups.',
                         type: 'text', choices: null };
            }
        }

        /* Approval domain */
        if (domain === 'approval') {
            if (action === 'view' || action === 'check') {
                return { reply: null, type: 'data', dataHint: 'load_approvals', choices: null };
            }
            if (action === 'explain') {
                return { reply: 'Approvals in Operations Intelligence route through the leadership hierarchy. When an action requires approval — such as onboarding a user or publishing an automation — a pending action is created and assigned to the relevant leader. You can review and act on yours in Operations Governance under Pending Actions.',
                         type: 'text', choices: null };
            }
        }

        /* Reporting domain */
        if (domain === 'reporting') {
            if (action === 'create') {
                return { reply: 'I can help you build a report. What would you like the report to cover?',
                         type: 'clarify',
                         choices: [
                           { label: 'Incidents', value: 'incident' },
                           { label: 'Change Requests', value: 'change_request' },
                           { label: 'Service Requests', value: 'sc_request' },
                           { label: 'Something else', value: 'other' }
                         ]};
            }
            if (action === 'explain') {
                return { reply: 'ServiceNow reporting supports 27 chart types including List, Bar, Pie, Trend, Heatmap, and Pivot. Reports are built from any table and can be filtered, grouped, and scheduled. In Operations Intelligence, you can build a report from Operations Studio or ask me to create one from the Automation Catalog.',
                         type: 'text', choices: null };
            }
        }

        /* People/onboarding domain */
        if (domain === 'people') {
            if (action === 'create') {
                return { reply: 'User onboarding in Operations Intelligence is managed by Administrators and Leadership from Operations Governance. To onboard someone, navigate to Governance, select the Users tab, and use the Onboard User action. You can assign them a role and add them to groups.',
                         type: 'text', choices: null };
            }
        }

        /* Knowledge domain */
        if (domain === 'knowledge') {
            return { reply: 'The Knowledge Base is available at /sp?id=kb_home. Search using specific terms or error messages for the best results. You can also ask me directly — I can explain procedures, policies, and platform features. What would you like to know about?',
                     type: 'text', choices: null };
        }

        /* Generic high-confidence fallback */
        return this._opsDomainClarify(msg, domain, hCtx, firstName);
    },

    _opsDomainClarify: function(msg, domain, hCtx, firstName) {
        var questions = {
            incident:   { q: 'It looks like you\'re asking about incidents. What would you like to do?',
                          c: [{ label: 'View my incidents', value: 'view_incidents' },
                              { label: 'Log a new incident', value: 'create_incident' },
                              { label: 'Understand incident management', value: 'explain_incidents' }] },
            change:     { q: 'I can help with change management. What do you need?',
                          c: [{ label: 'Create a change request', value: 'create_change' },
                              { label: 'Understand change types', value: 'explain_change_types' },
                              { label: 'Check a change status', value: 'check_change' }] },
            automation: { q: 'What would you like to do with automations?',
                          c: [{ label: 'See available automations', value: 'view_automations' },
                              { label: 'Build a new automation', value: 'create_automation' },
                              { label: 'Understand how automations work', value: 'explain_automations' }] },
            approval:   { q: 'I can help with approvals. Are you looking to review your pending approvals, or do you have a question about how approvals work?',
                          c: [{ label: 'Show my pending approvals', value: 'view_approvals' },
                              { label: 'Understand approval routing', value: 'explain_approvals' }] },
            reporting:  { q: 'I can assist with reporting. What are you trying to achieve?',
                          c: [{ label: 'Create a new report', value: 'create_report' },
                              { label: 'Create a dashboard', value: 'create_dashboard' },
                              { label: 'Understand report types', value: 'explain_reporting' }] },
            people:     { q: 'I can help with user and group management. What do you need?',
                          c: [{ label: 'Onboard a user', value: 'onboard_user' },
                              { label: 'Manage group membership', value: 'manage_group' },
                              { label: 'Check roles and access', value: 'check_roles' }] },
            request:    { q: 'I can help with service requests. What would you like to do?',
                          c: [{ label: 'View my requests', value: 'view_requests' },
                              { label: 'Browse the service catalog', value: 'view_catalog' },
                              { label: 'Understand the request process', value: 'explain_requests' }] },
            knowledge:  { q: 'I can help you find information or explain concepts. What are you looking for?',
                          c: [{ label: 'Search knowledge articles', value: 'search_knowledge' },
                              { label: 'Platform guidance', value: 'platform_help' },
                              { label: 'Operations Intelligence help', value: 'oi_help' }] }
        };
        var q = questions[domain];
        if (q) { return { reply: q.q, type: 'clarify', choices: q.c }; }
        return this._opsGeneralProbe(null, [], firstName, {});
    },

    _opsGeneralProbe: function(msg, tokens, firstName, ctx) {
        var name = firstName ? ', ' + firstName : '';

        /* Partial signals — at least say something useful */
        if (msg && this._any(msg, ['create','build','make','new','add'])) {
            return { reply: 'I\'d be happy to help you create something' + name + '. What are you looking to build?',
                     type: 'clarify',
                     choices: [
                       { label: 'A report', value: 'create_report' },
                       { label: 'A dashboard', value: 'create_dashboard' },
                       { label: 'A data alert', value: 'create_data_alert' },
                       { label: 'An automation', value: 'create_automation' }
                     ]};
        }

        if (msg && this._any(msg, ['show','view','list','find','get','what'])) {
            return { reply: 'What would you like to view' + name + '?',
                     type: 'clarify',
                     choices: [
                       { label: 'My pending approvals', value: 'view_approvals' },
                       { label: 'My open incidents', value: 'view_incidents' },
                       { label: 'Available automations', value: 'view_automations' },
                       { label: 'My service requests', value: 'view_requests' }
                     ]};
        }

        if (msg && this._any(msg, ['help','assist','support','guidance','how','what can'])) {
            return { reply: 'Of course' + name + '. I\'m your Operations Assistant — here to help you get things done. What are you working on?',
                     type: 'clarify',
                     choices: [
                       { label: 'Run an automation', value: 'run_automation' },
                       { label: 'View my approvals', value: 'view_approvals' },
                       { label: 'Log or check an incident', value: 'incident_help' },
                       { label: 'Create a report or dashboard', value: 'reporting_help' }
                     ]};
        }

        /* Very short or completely ambiguous */
        if (!msg || msg.split(' ').length < 3) {
            return { reply: 'I want to make sure I understand what you need' + name + '. Could you tell me a bit more about what you\'re trying to do, or choose one of these areas?',
                     type: 'clarify',
                     choices: [
                       { label: 'Run or browse automations', value: 'automation_help' },
                       { label: 'Incident or service request', value: 'itsm_help' },
                       { label: 'Reports and dashboards', value: 'reporting_help' },
                       { label: 'Platform guidance', value: 'general_help' }
                     ]};
        }

        /* Longer message but still no match — reflect and probe */
        return { reply: 'I want to give you a helpful answer' + name + '. Based on what you\'ve said, I\'d like to understand this better — are you trying to view or find something, create something, or do you have a question about how something works?',
                 type: 'clarify',
                 choices: [
                   { label: 'I want to view or check something', value: 'intent_view' },
                   { label: 'I want to create or build something', value: 'intent_create' },
                   { label: 'I have a question', value: 'intent_question' },
                   { label: 'Something is not working', value: 'intent_issue' }
                 ]};
    },

    /* ═══════════════════════════════════════════════════════════════
       DEVELOPER ASSISTANT
    ═══════════════════════════════════════════════════════════════ */
    _routeDeveloper: function(msg, tokens, topDom, topAct, entities, hCtx, ctx) {
        var firstName = this._firstName(ctx.full_name);

        /* Artifact view requests */
        if (this._m(msg, ['list table','show table','what table','all table','view table','database table'])) {
            return { reply: null, type: 'data', dataHint: 'dev_list_tables', choices: null };
        }
        if (this._m(msg, ['script include','list script','show script','view script','script include list'])) {
            return { reply: null, type: 'data', dataHint: 'dev_list_script_includes', choices: null };
        }
        if (this._m(msg, ['business rule','list rule','show rule','view rule'])) {
            return { reply: null, type: 'data', dataHint: 'dev_list_business_rules', choices: null };
        }
        if (this._m(msg, ['nlu topic','va topic','virtual agent topic','list topic','show topic','intent','utterance'])) {
            return { reply: null, type: 'data', dataHint: 'dev_list_va_topics', choices: null };
        }
        if (this._m(msg, ['role','permission','access control','acl','list role','show role'])) {
            return { reply: null, type: 'data', dataHint: 'dev_list_roles', choices: null };
        }
        if (this._m(msg, ['notification','email template','list notification'])) {
            return { reply: null, type: 'data', dataHint: 'dev_list_notifications', choices: null };
        }
        if (this._m(msg, ['scheduled job','schedule','recurring','list job'])) {
            return { reply: null, type: 'data', dataHint: 'dev_list_jobs', choices: null };
        }
        if (this._m(msg, ['engine status','engine health','api status','engine endpoint','check engine'])) {
            return { reply: null, type: 'data', dataHint: 'dev_engine_status', choices: null };
        }
        if (this._m(msg, ['overview','summary','what exists','what is deployed','what is built',
                'application overview','show everything','all artifact'])) {
            return { reply: null, type: 'data', dataHint: 'dev_app_overview', choices: null };
        }
        if (this._m(msg, ['update set','update sets','migration','deployment'])) {
            return { reply: 'The Operations Intelligence solution uses a single update set named "Operations Intelligence" (state: in progress). All artifacts — tables, script includes, business rules, ACLs, roles, notifications, and the portal widget — are captured in this update set. Check the Developer Workspace for a full inventory.',
                     type: 'text', choices: null };
        }
        if (this._m(msg, ['scope','application scope','x_infte_ops_int','namespace'])) {
            return { reply: 'The application scope is x_infte_ops_int. All artifacts must belong to this scope — this ensures isolation from other applications. The engine endpoint is POST /api/x_infte_ops_int/ops_int_engine/v1, authenticated via the X-Engine-Key header.',
                     type: 'text', choices: null };
        }
        if (this._m(msg, ['how does','how is','explain','describe','understand','what is the'])) {
            return this._devExplainProbe(msg, firstName);
        }

        /* General developer probe */
        if (this._m(msg, ['help','what can','assist','show me'])) {
            return { reply: 'I\'m your Developer Assistant' + (firstName ? ', ' + firstName : '') + '. I can give you a read-only view of every artifact in the Operations Intelligence application. What would you like to explore?',
                     type: 'clarify',
                     choices: [
                       { label: 'Application overview', value: 'dev_overview' },
                       { label: 'Tables and schema', value: 'dev_tables' },
                       { label: 'Script Includes', value: 'dev_script_includes' },
                       { label: 'NLU topics and intents', value: 'dev_nlu' }
                     ]};
        }

        return { reply: 'I can look that up for you' + (firstName ? ', ' + firstName : '') + '. Are you asking about a specific artifact type, or would you like an overview of the entire application?',
                 type: 'clarify',
                 choices: [
                   { label: 'Full application overview', value: 'dev_overview' },
                   { label: 'Tables and fields', value: 'dev_tables' },
                   { label: 'Code artifacts', value: 'dev_code' },
                   { label: 'Engine and API status', value: 'dev_engine' }
                 ]};
    },

    _devExplainProbe: function(msg, firstName) {
        if (this._any(msg, ['engine','api','endpoint'])) {
            return { reply: 'The Operations Intelligence engine is a Scripted REST API at POST /api/x_infte_ops_int/ops_int_engine/v1. It supports 137+ operations across categories: DIAGNOSTICS, DDL, RECORDS, ARTIFACTS, ACL, USERS, GROUPS, PROPERTIES, WORKFLOW, EMAIL, and ENGINE. Authentication uses the X-Engine-Key header matched against the x_infte_ops_int.engine_key system property. All operations execute in the x_infte_ops_int scope.',
                     type: 'text', choices: null };
        }
        if (this._any(msg, ['nlu','virtual agent','va','topic','intent','conversation'])) {
            return { reply: 'The Operations Intelligence NLU model is deployed to ServiceNow\'s Virtual Agent platform. Topics are defined in sys_cs_topic records with the [Operations Intelligence] prefix. Each topic has key phrases (training utterances) and a JSON flow definition with a ScriptedAction that executes business logic and sets vaVars.oi_msg for the response. The portal widget\'s Operations Assistant also has its own ConversationAdvisor reasoning layer that handles free-form messages.',
                     type: 'text', choices: null };
        }
        if (this._any(msg, ['permission','acl','access control','role','security'])) {
            return { reply: 'Operations Intelligence uses four scoped roles: x_infte_ops_int.admin, x_infte_ops_int.developer, x_infte_ops_int.leadership, x_infte_ops_int.creator, and x_infte_ops_int.user. Role assignment is guarded by before-insert and before-delete business rules on sys_user_has_role that block any assignment outside the OI application scope. ACLs enforce table and field-level access per role.',
                     type: 'text', choices: null };
        }
        return { reply: 'What specific aspect of the implementation would you like me to explain?',
                 type: 'clarify',
                 choices: [
                   { label: 'Engine and REST API', value: 'explain_engine' },
                   { label: 'NLU and conversation flow', value: 'explain_nlu' },
                   { label: 'Roles and permissions', value: 'explain_permissions' },
                   { label: 'Portal widget architecture', value: 'explain_portal' }
                 ]};
    },

    /* ═══════════════════════════════════════════════════════════════
       ADMINISTRATOR ASSISTANT
    ═══════════════════════════════════════════════════════════════ */
    _routeAdmin: function(msg, tokens, topDom, topAct, entities, hCtx, ctx) {
        var firstName = this._firstName(ctx.full_name);

        /* Catalog management */
        if (this._m(msg, ['create category','add category','new category','add a category'])) {
            return { reply: 'To create a new Automation Catalog category, go to the Catalog Management tab in Operations Command. Click "Add Category", enter a name, description, and choose an icon and colour. Once saved, the category will appear in the Workspace Automation Catalog for all users.',
                     type: 'text', choices: null };
        }
        if (this._m(msg, ['create item','add item','new item','add catalog item','new catalog item'])) {
            return { reply: 'To add an item to a category, go to the Catalog Management tab in Operations Command. Select the category, then click "Add Item". Provide a name, description, and action type (Information, Link, or Request). The item will appear inside the category in the Workspace.',
                     type: 'text', choices: null };
        }
        if (this._m(msg, ['list category','show category','view category','catalog category',
                'what category','current category'])) {
            return { reply: null, type: 'data', dataHint: 'admin_list_categories', choices: null };
        }
        if (this._m(msg, ['list item','show item','catalog item','what item'])) {
            return { reply: null, type: 'data', dataHint: 'admin_list_items', choices: null };
        }

        /* Maintenance */
        if (this._m(msg, ['enable maintenance','turn on maintenance','maintenance mode on','disable section','pause section'])) {
            return { reply: 'Maintenance mode can be toggled per section — Workspace, Operations Gallery, Operations Studio, or Operations Governance — from the System tab in Operations Command. Enabling maintenance for a section hides it from users and shows a maintenance notice until you disable it.',
                     type: 'text', choices: null };
        }
        if (this._m(msg, ['disable maintenance','turn off maintenance','maintenance mode off','restore section','re-enable section'])) {
            return { reply: 'To disable maintenance mode for a section, go to the System tab in Operations Command and toggle the relevant section off. The section will immediately become visible to users again.',
                     type: 'text', choices: null };
        }

        /* User management */
        if (this._m(msg, ['onboard user','add user','enroll user','new user','invite user','create user'])) {
            return { reply: 'To onboard a user, navigate to Operations Governance and select the Users tab. Search for the user by name, then use the Onboard action to assign them a role and add them to groups. A welcome notification will be sent automatically once onboarding is confirmed.',
                     type: 'text', choices: null };
        }
        if (this._m(msg, ['deactivate user','remove user','offboard user','disable user','revoke access'])) {
            return { reply: 'To deactivate a user, go to Operations Governance → Users tab, find the user, and use the Deactivate action. This removes their Operations Intelligence roles and group memberships. You can reinvite them later if needed.',
                     type: 'text', choices: null };
        }

        /* Group management */
        if (this._m(msg, ['create group','add group','new group','create automation group'])) {
            return { reply: 'To create a group, navigate to Operations Governance → Groups tab and click New Group. Provide a name, description, and assign a group lead. Once created, you can add members and assign automations to the group.',
                     type: 'text', choices: null };
        }

        /* System status */
        if (this._m(msg, ['system status','platform status','health','engine status','how is the system',
                'system stats','statistics'])) {
            return { reply: null, type: 'data', dataHint: 'admin_system_status', choices: null };
        }

        /* Configure Operations Assistant */
        if (this._m(msg, ['configure assistant','operations assistant config','assistant setting',
                'change assistant','update assistant','assistant response'])) {
            return { reply: 'Operations Assistant configuration is managed from the Assistant Configuration tab in Operations Command. There you can define which categories are visible in the Automation Catalog and their display order, as well as manage catalog items that users see in the Workspace.',
                     type: 'text', choices: null };
        }

        /* Pending actions */
        if (this._m(msg, ['pending action','approval queue','what needs approval','pending approval',
                'outstanding action'])) {
            return { reply: null, type: 'data', dataHint: 'admin_pending_actions', choices: null };
        }

        /* General admin probe */
        if (this._m(msg, ['help','what can','assist','what do'])) {
            return { reply: 'I\'m your Administrator Assistant' + (firstName ? ', ' + firstName : '') + '. I can help you configure the platform, manage the Automation Catalog, oversee users and groups, and handle maintenance. What would you like to do?',
                     type: 'clarify',
                     choices: [
                       { label: 'Manage Automation Catalog', value: 'admin_catalog' },
                       { label: 'User and group management', value: 'admin_users' },
                       { label: 'Maintenance mode', value: 'admin_maintenance' },
                       { label: 'System status', value: 'admin_status' }
                     ]};
        }

        return { reply: 'I can help with that' + (firstName ? ', ' + firstName : '') + '. To make sure I assist correctly — are you looking to configure something, manage users or groups, check system status, or handle the Automation Catalog?',
                 type: 'clarify',
                 choices: [
                   { label: 'Configure Automation Catalog', value: 'admin_catalog' },
                   { label: 'Manage users or groups', value: 'admin_people' },
                   { label: 'Maintenance and system', value: 'admin_system' },
                   { label: 'Check pending actions', value: 'admin_approvals' }
                 ]};
    },

    /* ═══════════════════════════════════════════════════════════════
       SHARED ANALYSIS METHODS
    ═══════════════════════════════════════════════════════════════ */

    _microIntent: function(msg) {
        /* Greetings */
        if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy|sup|yo)\b/.test(msg)) {
            return { reply: 'Hello! How can I assist you today?', type: 'text', choices: null };
        }
        if (this._m(msg, ['how are you','hows it going','you doing well','how do you do'])) {
            return { reply: 'I\'m ready and here to help. What can I do for you?', type: 'text', choices: null };
        }

        /* Gratitude */
        if (this._m(msg, ['thank you','thanks','thank u','thx','cheers','appreciate it',
                'that helped','great help','well done','brilliant','perfect','you are amazing','youre amazing'])) {
            return { reply: 'You\'re welcome! Is there anything else I can help you with?', type: 'text', choices: null };
        }

        /* Farewell */
        if (this._m(msg, ['goodbye','bye','see you','see ya','farewell','talk later','catch you later','good day'])) {
            return { reply: 'Goodbye! Come back any time you need assistance.', type: 'text', choices: null };
        }

        /* Frustration */
        if (this._m(msg, ['frustrated','this is broken','nothing works','so annoying','this is useless',
                'i am stuck','im stuck','this is frustrating','not working','doesn\'t work'])) {
            return { reply: 'I\'m sorry to hear that — let\'s get this sorted. Tell me what you\'re trying to accomplish and I\'ll do my best to help you get there.',
                     type: 'text', choices: null };
        }

        /* Apology / excuse */
        if (this._m(msg, ['sorry','excuse me','my apologies','my bad','pardon'])) {
            return { reply: 'No problem at all. What can I help you with?', type: 'text', choices: null };
        }

        /* Identity */
        if (this._m(msg, ['who are you','what are you','are you a bot','are you human','your name',
                'introduce yourself'])) {
            var typeLabel = this.assistantType === 'developer' ? 'Developer Assistant'
                          : this.assistantType === 'admin'     ? 'Administrator Assistant'
                          : 'Operations Assistant';
            return { reply: 'I\'m the ' + typeLabel + ', built into the Operations Intelligence portal. I\'m here to help you get things done. What do you need?',
                     type: 'text', choices: null };
        }

        return null;
    },

    _scoreDomains: function(msg, tokens) {
        var DOMAINS = {
            incident:   ['incident','inc','ticket','issue','outage','fault','disruption','break','broken','not working','down','unavailable'],
            change:     ['change','rfc','cab','change request','deployment','release','patch','upgrade','modification','alter'],
            problem:    ['problem','root cause','rca','workaround','known error','kedb','recurring','repeat'],
            request:    ['request','catalog','order','ritm','req','service request','submit','provision'],
            approval:   ['approval','approve','reject','pending','awaiting','review','sign off','authorise','authorize'],
            automation: ['automation','automate','workflow','flow','trigger','run','execute','launch','scheduled','bot'],
            group:      ['group','team','member','membership','belong','assignment group'],
            reporting:  ['report','dashboard','chart','graph','kpi','metric','trend','analytics','performance','data'],
            people:     ['user','person','onboard','enroll','invite','deactivate','role','access','permission','creator','leadership','admin'],
            knowledge:  ['knowledge','article','kb','guide','procedure','how to','documentation','faq','self service'],
            catalog:    ['catalog','category','item','available','browse','what can i','can i do'],
            sla:        ['sla','service level','breach','response time','resolution time','overdue'],
            cmdb:       ['cmdb','configuration item','ci','asset','hardware','software license','service map']
        };
        var devDomains = {
            tables:          ['table','field','schema','column','gliderecord','database','data model'],
            script_includes: ['script include','class','api','function','method','si','script'],
            business_rules:  ['business rule','before','after','async','br','trigger rule'],
            nlu:             ['nlu','va topic','intent','utterance','conversation','virtual agent','chatbot','training phrase'],
            acl:             ['acl','access control','security rule','permission','restrict'],
            deployment:      ['deploy','update set','phase','build','install','push','migrate']
        };
        var adminDomains = {
            catalog_admin:  ['catalog management','category','catalog item','configure catalog'],
            maintenance:    ['maintenance','pause','disable section','enable section','downtime'],
            user_mgmt:      ['onboard','enroll','deactivate','reinvite','user management'],
            assistant_cfg:  ['assistant config','configure assistant','assistant setting','response config']
        };

        var pool = DOMAINS;
        if (this.assistantType === 'developer') { pool = devDomains; }
        if (this.assistantType === 'admin') { pool = adminDomains; }

        var scores = [];
        var dom, kw, t, ki, ti;
        for (dom in pool) {
            if (!pool.hasOwnProperty(dom)) { continue; }
            var score = 0;
            var kws = pool[dom];
            for (ki = 0; ki < kws.length; ki++) {
                kw = kws[ki];
                if (msg.indexOf(kw) !== -1) {
                    score += (kw.split(' ').length > 1) ? 25 : 15;
                }
            }
            for (ti = 0; ti < tokens.length; ti++) {
                t = tokens[ti];
                for (ki = 0; ki < kws.length; ki++) {
                    kw = kws[ki];
                    if (kw.indexOf(t) === 0 && t.length >= 4) { score += 8; }
                }
            }
            if (score > 0) { scores.push({ name: dom, score: score }); }
        }
        scores.sort(function(a, b) { return b.score - a.score; });
        return scores;
    },

    _scoreActions: function(msg, tokens) {
        var ACTIONS = {
            create:    ['create','add','new','build','make','generate','set up','define','establish','start','open','raise','log'],
            view:      ['show','list','view','get','display','find','see','what are','give me','tell me','fetch','retrieve','check my'],
            update:    ['update','change','modify','edit','fix','adjust','correct','rename','alter','patch'],
            delete:    ['delete','remove','deactivate','disable','turn off','stop','cancel','withdraw','revoke'],
            explain:   ['how','why','explain','what is','what are','understand','tell me about','describe','clarify','help me understand','what does','difference between'],
            check:     ['check','status','progress','track','where is','what happened','monitor','follow up','review','inspect'],
            approve:   ['approve','reject','accept','deny','confirm','authorise','authorize','decline'],
            trigger:   ['run','trigger','execute','start','launch','kick off','fire','activate'],
            configure: ['configure','setup','set up','enable','disable','toggle','turn on','turn off','manage','administer']
        };
        var scores = [];
        var act, phrases, p, t, ki, ti;
        for (act in ACTIONS) {
            if (!ACTIONS.hasOwnProperty(act)) { continue; }
            var score = 0;
            phrases = ACTIONS[act];
            for (ki = 0; ki < phrases.length; ki++) {
                p = phrases[ki];
                if (msg.indexOf(p) !== -1) {
                    score += (p.split(' ').length > 1) ? 20 : 12;
                }
            }
            for (ti = 0; ti < tokens.length; ti++) {
                t = tokens[ti];
                for (ki = 0; ki < phrases.length; ki++) {
                    p = phrases[ki];
                    if (p === t) { score += 10; }
                }
            }
            if (score > 0) { scores.push({ name: act, score: score }); }
        }
        scores.sort(function(a, b) { return b.score - a.score; });
        return scores;
    },

    _entities: function(msg) {
        var entities = {};
        var incMatch = msg.match(/\binc\d{7}\b/i);
        if (incMatch) { entities.incidentNumber = incMatch[0].toUpperCase(); }
        var chgMatch = msg.match(/\bchg\d{7}\b/i);
        if (chgMatch) { entities.changeNumber = chgMatch[0].toUpperCase(); }
        var reqMatch = msg.match(/\breq\d{7}\b/i);
        if (reqMatch) { entities.requestNumber = reqMatch[0].toUpperCase(); }
        return entities;
    },

    _histCtx: function(history) {
        var ctx = { lastDomain: '', lastQuestion: '', pendingClarification: false };
        if (!history || !history.length) { return ctx; }
        var last = history[history.length - 1];
        if (last && last.role === 'assistant' && last.type === 'clarify') {
            ctx.pendingClarification = true;
        }
        var i, msg;
        for (i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'user') {
                msg = this._norm(history[i].text || '');
                var domains = this._scoreDomains(msg, this._tok(msg));
                if (domains.length && domains[0].score > 20) {
                    ctx.lastDomain = domains[0].name;
                    break;
                }
            }
        }
        return ctx;
    },

    _isContinuation: function(msg) {
        return /^(yes|yeah|yep|sure|ok|okay|please|and|also|what about|how about|tell me more|more detail|continue|go on)\b/.test(msg);
    },

    _norm: function(raw) {
        return ('' + (raw || '')).toLowerCase()
               .replace(/[^\w\s\-'?]/g, ' ')
               .replace(/\s+/g, ' ').trim();
    },

    _tok: function(norm) {
        var stops = ['i','me','my','we','our','the','a','an','and','but','or','is','are',
                     'was','were','be','been','have','has','had','do','does','did','will',
                     'would','shall','should','may','might','must','can','could','about',
                     'of','in','it','its','if','as','up','out','so','all','any','just',
                     'not','no','for','to','from','by','with','at','on','that','this',
                     'these','those','you','your','they','their','he','she'];
        var words = norm.split(/\s+/);
        var out = [];
        var i;
        for (i = 0; i < words.length; i++) {
            if (words[i].length > 1 && stops.indexOf(words[i]) === -1) { out.push(words[i]); }
        }
        return out;
    },

    _m: function(msg, phrases) {
        var i;
        for (i = 0; i < phrases.length; i++) {
            if (msg.indexOf(phrases[i]) !== -1) { return true; }
        }
        return false;
    },

    _any: function(msg, words) {
        var i;
        for (i = 0; i < words.length; i++) {
            if (msg.indexOf(words[i]) !== -1) { return true; }
        }
        return false;
    },

    _firstName: function(fullName) {
        if (!fullName) { return ''; }
        var parts = ('' + fullName).trim().split(/\s+/);
        return parts[0] || '';
    },

    type: 'ConversationAdvisor'
};
