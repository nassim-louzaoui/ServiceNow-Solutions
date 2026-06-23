var ConversationAdvisor = Class.create();
ConversationAdvisor.prototype = {

    initialize: function(assistantType) {
        this.assistantType = assistantType || 'operations';
        this.PERSON_TABLE  = 'x_infte_ops_int_person';
        this.GROUP_TABLE   = 'x_infte_ops_int_group';
        this.AUTO_TABLE    = 'x_infte_ops_int_automation';
        this.PENDING_TABLE = 'x_infte_ops_int_pending_action';
        this.CAT_TABLE     = 'x_infte_ops_int_catalog_category';
        this.ITEM_TABLE    = 'x_infte_ops_int_catalog_item';
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
        var msg    = this._norm(rawMessage);
        var tokens = this._tok(msg);
        var ctx    = userCtx || {};
        var hist   = history || [];

        var micro = this._microIntent(msg);
        if (micro) { return micro; }

        var hCtx    = this._histCtx(hist);
        var domains = this._scoreDomains(msg, tokens);
        var actions = this._scoreActions(msg, tokens);
        var topDom  = domains[0] || { name: '', score: 0 };
        var topAct  = actions[0] || { name: '', score: 0 };
        var entities = this._entities(msg);

        if (this.assistantType === 'developer') {
            return this._routeDeveloper(msg, tokens, topDom, topAct, entities, hCtx, ctx);
        }
        if (this.assistantType === 'admin') {
            return this._routeAdmin(msg, tokens, topDom, topAct, entities, hCtx, ctx);
        }
        if (this.assistantType === 'automations') {
            return this._routeAutomations(msg, tokens, topDom, topAct, entities, hCtx, ctx);
        }
        if (this.assistantType === 'creator') {
            return this._routeCreator(msg, tokens, topDom, topAct, entities, hCtx, ctx);
        }
        if (this.assistantType === 'leadership') {
            return this._routeLeadership(msg, tokens, topDom, topAct, entities, hCtx, ctx);
        }
        return this._routeOperations(msg, tokens, topDom, topAct, entities, hCtx, ctx);
    },

    /* ═══════════════════════════════════════════════════════════════
       OPERATIONS ASSISTANT
    ═══════════════════════════════════════════════════════════════ */
    _routeOperations: function(msg, tokens, topDom, topAct, entities, hCtx, ctx) {
        var firstName = this._firstName(ctx.full_name);

        if (this._m(msg, ['show my approval','my pending approval','what needs my approval',
                'approval queue','review approval','pending review','waiting for my approval',
                'anything to approve','need to approve'])) {
            return { reply: null, type: 'data', dataHint: 'load_approvals',
                     choices: null, ctx: hCtx };
        }

        if (this._m(msg, ['show my incident','my open incident','my ticket','list incident',
                'view my incident','my incidents','check my incident'])) {
            return { reply: null, type: 'data', dataHint: 'load_incidents',
                     choices: null, ctx: hCtx };
        }

        if (this._m(msg, ['show automation','available automation','what automation',
                'what can i run','what is available','list automation','view catalog',
                'show catalog','what items','browse catalog'])) {
            return { reply: null, type: 'data', dataHint: 'show_catalog',
                     choices: null, ctx: hCtx };
        }

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

        if (entities.incidentNumber) {
            return { reply: null, type: 'data', dataHint: 'lookup_incident',
                     params: { number: entities.incidentNumber }, choices: null };
        }

        if (topDom.score >= 40 && topAct.score >= 30) {
            return this._opsDomainAction(msg, topDom.name, topAct.name, entities, hCtx, ctx, firstName);
        }

        if (topDom.score >= 35) {
            return this._opsDomainClarify(msg, topDom.name, hCtx, firstName);
        }

        if (hCtx.lastDomain && this._isContinuation(msg)) {
            return this._opsDomainClarify(msg, hCtx.lastDomain, hCtx, firstName);
        }

        return this._opsGeneralProbe(msg, tokens, firstName, ctx);
    },

    _opsDomainAction: function(msg, domain, action, entities, hCtx, ctx, firstName) {
        if (domain === 'incident') {
            if (action === 'create') {
                return { reply: 'To log an incident, open the Service Portal and choose Report an Issue at /sp?id=new_call. Provide a clear description, when it started, how many people are affected, and any error messages. For a critical outage affecting many users, call the IT helpdesk directly so it can be triaged immediately.',
                         type: 'text', choices: null };
            }
            if (action === 'view') {
                return { reply: null, type: 'data', dataHint: 'load_incidents', choices: null };
            }
            if (action === 'explain') {
                return { reply: 'Incident states track progress through the lifecycle:\n\n- New: logged, not yet assigned\n- In Progress: actively being worked\n- On Hold: paused, waiting on caller, vendor, or change\n- Resolved: fix is in place, awaiting confirmation\n- Closed: confirmed resolved\n\nPriority is set from Impact and Urgency: P1 Critical through P4 Low. Ask me about a specific aspect of incident management for more detail.',
                         type: 'text', choices: null };
            }
        }

        if (domain === 'change') {
            if (action === 'create') {
                return { reply: 'To create a Change Request, use the Service Catalog at /sp?id=sc_home and search for "Change Request". You will need: a description, justification, implementation plan, back-out plan, risk assessment, and a proposed change window. Choose the change type: Standard (pre-approved), Normal (CAB review), or Emergency (expedited).',
                         type: 'text', choices: null };
            }
            if (action === 'explain') {
                return { reply: 'There are three change types:\n\n- Standard: pre-approved, low-risk, repeatable, no CAB needed\n- Normal: assessed and approved by the Change Advisory Board based on risk\n- Emergency: expedited for urgent fixes, with retrospective review afterwards\n\nChoose the type that matches the risk and urgency of your work.',
                         type: 'text', choices: null };
            }
        }

        if (domain === 'automation') {
            if (action === 'view' || action === 'trigger') {
                return { reply: null, type: 'data', dataHint: 'show_catalog', choices: null };
            }
            if (action === 'create') {
                return { reply: 'Automations are built in Operations Studio by users with the Creator or Administrator role. If you have Creator access, navigate to Operations Studio from the sidebar and use the Automations tab to define a new automation. Once built, it must be submitted for approval before it can be assigned to groups.',
                         type: 'text', choices: null };
            }
        }

        if (domain === 'approval') {
            if (action === 'view' || action === 'check') {
                return { reply: null, type: 'data', dataHint: 'load_approvals', choices: null };
            }
            if (action === 'explain') {
                return { reply: 'Approvals in Operations Intelligence route through the leadership hierarchy. When an action requires approval — such as onboarding a user or publishing an automation — a pending action is created and assigned to the relevant leader. You can review and act on yours in Operations Governance under Pending Actions.',
                         type: 'text', choices: null };
            }
        }

        if (domain === 'reporting') {
            if (action === 'create') {
                return { reply: 'I can help you build a report. What would you like the report to cover?',
                         type: 'clarify',
                         choices: [
                           { label: 'Incidents',        value: 'incident' },
                           { label: 'Change Requests',  value: 'change_request' },
                           { label: 'Service Requests', value: 'sc_request' },
                           { label: 'Something else',   value: 'other' }
                         ]};
            }
            if (action === 'explain') {
                return { reply: 'ServiceNow reporting supports 27 chart types including List, Bar, Pie, Trend, Heatmap, and Pivot. Reports are built from any table and can be filtered, grouped, and scheduled. In Operations Intelligence, you can build a report from Operations Studio or ask me to create one from the Automation Catalog.',
                         type: 'text', choices: null };
            }
        }

        if (domain === 'people') {
            if (action === 'create') {
                return { reply: 'User onboarding in Operations Intelligence is managed by Administrators and Leadership from Operations Governance. To onboard someone, navigate to Governance, select the Users tab, and use the Onboard User action. You can assign them a role and add them to groups.',
                         type: 'text', choices: null };
            }
        }

        if (domain === 'knowledge') {
            return { reply: 'The Knowledge Base is available at /sp?id=kb_home. Search using specific terms or error messages for the best results. You can also ask me directly — I can explain procedures, policies, and platform features. What would you like to know about?',
                     type: 'text', choices: null };
        }

        return this._opsDomainClarify(msg, domain, hCtx, firstName);
    },

    _opsDomainClarify: function(msg, domain, hCtx, firstName) {
        var questions = {
            incident:   { q: 'It looks like you\'re asking about incidents. What would you like to do?',
                          c: [{ label: 'View my incidents',               value: 'view_incidents' },
                              { label: 'Log a new incident',              value: 'create_incident' },
                              { label: 'Understand incident management',  value: 'explain_incidents' }] },
            change:     { q: 'I can help with change management. What do you need?',
                          c: [{ label: 'Create a change request',         value: 'create_change' },
                              { label: 'Understand change types',         value: 'explain_change_types' },
                              { label: 'Check a change status',           value: 'check_change' }] },
            automation: { q: 'What would you like to do with automations?',
                          c: [{ label: 'See available automations',       value: 'view_automations' },
                              { label: 'Build a new automation',          value: 'create_automation' },
                              { label: 'Understand how automations work', value: 'explain_automations' }] },
            approval:   { q: 'I can help with approvals. Are you looking to review your pending approvals, or do you have a question about how approvals work?',
                          c: [{ label: 'Show my pending approvals',       value: 'view_approvals' },
                              { label: 'Understand approval routing',     value: 'explain_approvals' }] },
            reporting:  { q: 'I can assist with reporting. What are you trying to achieve?',
                          c: [{ label: 'Create a new report',             value: 'create_report' },
                              { label: 'Create a dashboard',              value: 'create_dashboard' },
                              { label: 'Understand report types',         value: 'explain_reporting' }] },
            people:     { q: 'I can help with user and group management. What do you need?',
                          c: [{ label: 'Onboard a user',                  value: 'onboard_user' },
                              { label: 'Manage group membership',         value: 'manage_group' },
                              { label: 'Check roles and access',          value: 'check_roles' }] },
            request:    { q: 'I can help with service requests. What would you like to do?',
                          c: [{ label: 'View my requests',                value: 'view_requests' },
                              { label: 'Browse the service catalog',      value: 'view_catalog' },
                              { label: 'Understand the request process',  value: 'explain_requests' }] },
            knowledge:  { q: 'I can help you find information or explain concepts. What are you looking for?',
                          c: [{ label: 'Search knowledge articles',       value: 'search_knowledge' },
                              { label: 'Platform guidance',               value: 'platform_help' },
                              { label: 'Operations Intelligence help',    value: 'oi_help' }] }
        };
        var q = questions[domain];
        if (q) { return { reply: q.q, type: 'clarify', choices: q.c }; }
        return this._opsGeneralProbe(null, [], firstName, {});
    },

    _opsGeneralProbe: function(msg, tokens, firstName, ctx) {
        var name = firstName ? ', ' + firstName : '';

        if (msg && this._any(msg, ['create','build','make','new','add'])) {
            return { reply: 'I\'d be happy to help you create something' + name + '. What are you looking to build?',
                     type: 'clarify',
                     choices: [
                       { label: 'A report',        value: 'create_report' },
                       { label: 'A dashboard',     value: 'create_dashboard' },
                       { label: 'A data alert',    value: 'create_data_alert' },
                       { label: 'An automation',   value: 'create_automation' }
                     ]};
        }

        if (msg && this._any(msg, ['show','view','list','find','get','what'])) {
            return { reply: 'What would you like to view' + name + '?',
                     type: 'clarify',
                     choices: [
                       { label: 'My pending approvals',  value: 'view_approvals' },
                       { label: 'My open incidents',     value: 'view_incidents' },
                       { label: 'Available automations', value: 'view_automations' },
                       { label: 'My service requests',   value: 'view_requests' }
                     ]};
        }

        if (msg && this._any(msg, ['help','assist','support','guidance','how','what can'])) {
            return { reply: 'Of course' + name + '. I\'m your Operations Assistant — here to help you get things done. What are you working on?',
                     type: 'clarify',
                     choices: [
                       { label: 'Run an automation',          value: 'run_automation' },
                       { label: 'View my approvals',          value: 'view_approvals' },
                       { label: 'Log or check an incident',   value: 'incident_help' },
                       { label: 'Create a report or dashboard', value: 'reporting_help' }
                     ]};
        }

        if (!msg || msg.split(' ').length < 3) {
            return { reply: 'I want to make sure I understand what you need' + name + '. Could you tell me a bit more about what you\'re trying to do, or choose one of these areas?',
                     type: 'clarify',
                     choices: [
                       { label: 'Run or browse automations',  value: 'automation_help' },
                       { label: 'Incident or service request', value: 'itsm_help' },
                       { label: 'Reports and dashboards',     value: 'reporting_help' },
                       { label: 'Platform guidance',          value: 'general_help' }
                     ]};
        }

        return { reply: 'I want to give you a helpful answer' + name + '. Based on what you\'ve said, I\'d like to understand this better — are you trying to view or find something, create something, or do you have a question about how something works?',
                 type: 'clarify',
                 choices: [
                   { label: 'I want to view or check something', value: 'intent_view' },
                   { label: 'I want to create or build something', value: 'intent_create' },
                   { label: 'I have a question',                 value: 'intent_question' },
                   { label: 'Something is not working',          value: 'intent_issue' }
                 ]};
    },

    /* ═══════════════════════════════════════════════════════════════
       DEVELOPER ASSISTANT
    ═══════════════════════════════════════════════════════════════ */
    _routeDeveloper: function(msg, tokens, topDom, topAct, entities, hCtx, ctx) {
        var firstName = this._firstName(ctx.full_name);

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

        if (this._m(msg, ['help','what can','assist','show me'])) {
            return { reply: 'I\'m your Developer Assistant' + (firstName ? ', ' + firstName : '') + '. I can give you a read-only view of every artifact in the Operations Intelligence application. What would you like to explore?',
                     type: 'clarify',
                     choices: [
                       { label: 'Application overview',       value: 'dev_overview' },
                       { label: 'Tables and schema',          value: 'dev_tables' },
                       { label: 'Script Includes',            value: 'dev_script_includes' },
                       { label: 'NLU topics and intents',     value: 'dev_nlu' }
                     ]};
        }

        return { reply: 'I can look that up for you' + (firstName ? ', ' + firstName : '') + '. Are you asking about a specific artifact type, or would you like an overview of the entire application?',
                 type: 'clarify',
                 choices: [
                   { label: 'Full application overview', value: 'dev_overview' },
                   { label: 'Tables and fields',         value: 'dev_tables' },
                   { label: 'Code artifacts',            value: 'dev_code' },
                   { label: 'Engine and API status',     value: 'dev_engine' }
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
                   { label: 'Engine and REST API',        value: 'explain_engine' },
                   { label: 'NLU and conversation flow',  value: 'explain_nlu' },
                   { label: 'Roles and permissions',      value: 'explain_permissions' },
                   { label: 'Portal widget architecture', value: 'explain_portal' }
                 ]};
    },

    /* ═══════════════════════════════════════════════════════════════
       ADMINISTRATOR ASSISTANT
    ═══════════════════════════════════════════════════════════════ */
    _routeAdmin: function(msg, tokens, topDom, topAct, entities, hCtx, ctx) {
        var firstName = this._firstName(ctx.full_name);

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

        if (this._m(msg, ['enable maintenance','turn on maintenance','maintenance mode on','disable section','pause section'])) {
            return { reply: 'Maintenance mode can be toggled per section — Workspace, Operations Gallery, Operations Studio, or Operations Governance — from the System tab in Operations Command. Enabling maintenance for a section hides it from users and shows a maintenance notice until you disable it.',
                     type: 'text', choices: null };
        }
        if (this._m(msg, ['disable maintenance','turn off maintenance','maintenance mode off','restore section','re-enable section'])) {
            return { reply: 'To disable maintenance mode for a section, go to the System tab in Operations Command and toggle the relevant section off. The section will immediately become visible to users again.',
                     type: 'text', choices: null };
        }

        if (this._m(msg, ['onboard user','add user','enroll user','new user','invite user','create user'])) {
            return { reply: 'To onboard a user, navigate to Operations Governance and select the Users tab. Search for the user by name, then use the Onboard action to assign them a role and add them to groups. A welcome notification will be sent automatically once onboarding is confirmed.',
                     type: 'text', choices: null };
        }
        if (this._m(msg, ['deactivate user','remove user','offboard user','disable user','revoke access'])) {
            return { reply: 'To deactivate a user, go to Operations Governance, Users tab, find the user, and use the Deactivate action. This removes their Operations Intelligence roles and group memberships. You can reinvite them later if needed.',
                     type: 'text', choices: null };
        }

        if (this._m(msg, ['create group','add group','new group','create automation group'])) {
            return { reply: 'To create a group, navigate to Operations Governance, Groups tab and click New Group. Provide a name, description, and assign a group lead. Once created, you can add members and assign automations to the group.',
                     type: 'text', choices: null };
        }

        if (this._m(msg, ['system status','platform status','health','engine status','how is the system',
                'system stats','statistics'])) {
            return { reply: null, type: 'data', dataHint: 'admin_system_status', choices: null };
        }

        if (this._m(msg, ['configure assistant','operations assistant config','assistant setting',
                'change assistant','update assistant','assistant response'])) {
            return { reply: 'Operations Assistant configuration is managed from the Assistant Configuration tab in Operations Command. There you can define which categories are visible in the Automation Catalog and their display order, as well as manage catalog items that users see in the Workspace.',
                     type: 'text', choices: null };
        }

        if (this._m(msg, ['pending action','approval queue','what needs approval','pending approval',
                'outstanding action'])) {
            return { reply: null, type: 'data', dataHint: 'admin_pending_actions', choices: null };
        }

        if (this._m(msg, ['help','what can','assist','what do'])) {
            return { reply: 'I\'m your Administrator Assistant' + (firstName ? ', ' + firstName : '') + '. I can help you configure the platform, manage the Automation Catalog, oversee users and groups, and handle maintenance. What would you like to do?',
                     type: 'clarify',
                     choices: [
                       { label: 'Manage Automation Catalog', value: 'admin_catalog' },
                       { label: 'User and group management', value: 'admin_users' },
                       { label: 'Maintenance mode',          value: 'admin_maintenance' },
                       { label: 'System status',             value: 'admin_status' }
                     ]};
        }

        return { reply: 'I can help with that' + (firstName ? ', ' + firstName : '') + '. To make sure I assist correctly — are you looking to configure something, manage users or groups, check system status, or handle the Automation Catalog?',
                 type: 'clarify',
                 choices: [
                   { label: 'Configure Automation Catalog', value: 'admin_catalog' },
                   { label: 'Manage users or groups',       value: 'admin_people' },
                   { label: 'Maintenance and system',       value: 'admin_system' },
                   { label: 'Check pending actions',        value: 'admin_approvals' }
                 ]};
    },

    /* ═══════════════════════════════════════════════════════════════
       AUTOMATIONS WORKSPACE ASSISTANT
    ═══════════════════════════════════════════════════════════════ */
    _routeAutomations: function(msg, tokens, topDom, topAct, entities, hCtx, ctx) {
        var firstName = this._firstName(ctx.full_name);
        var nameSuffix = firstName ? ', ' + firstName : '';

        if (this._m(msg, ['show all automation','list all automation','all automation','every automation',
                'what automation are available','what automation do i have','see all automation',
                'view all automation'])) {
            return { reply: null, type: 'data', dataHint: 'load_automations', choices: null };
        }

        if (this._m(msg, ['my recent automation','recently used','last automation i ran',
                'what did i run','my automation history','automation i used'])) {
            return { reply: null, type: 'data', dataHint: 'my_automations', choices: null };
        }

        if (this._m(msg, ['most used','popular automation','top automation','frequently used',
                'most popular','commonly used'])) {
            return { reply: null, type: 'data', dataHint: 'load_automations', choices: null };
        }

        if (this._m(msg, ['browse category','show category','by category','automation category',
                'what category','filter by category','show catalog','view catalog','categories',
                'browse catalog','what can i browse'])) {
            return { reply: null, type: 'data', dataHint: 'show_catalog', choices: null };
        }

        if (entities.automationName && this._m(msg, ['explain','what does','what is','how does',
                'describe','tell me about','what is the'])) {
            return { reply: null, type: 'data', dataHint: 'explain_automation',
                     params: { name: entities.automationName }, choices: null };
        }

        if (this._m(msg, ['explain','what does','what is','how does','describe','tell me about']) &&
            this._m(msg, ['automation'])) {
            return { reply: 'Which automation would you like me to explain? You can tell me its name, or browse the catalog to find it.',
                     type: 'clarify',
                     choices: [
                       { label: 'Browse Categories',  value: 'show_catalog' },
                       { label: 'Search by Name',     value: 'search_automation' },
                       { label: 'Show All',           value: 'load_automations' },
                       { label: 'Show Recent',        value: 'my_automations' }
                     ]};
        }

        if (entities.automationName && this._m(msg, ['run','trigger','execute','launch','start',
                'kick off','fire','activate'])) {
            return { reply: 'To confirm — you would like to run "' + entities.automationName + '". Shall I proceed?',
                     type: 'clarify',
                     choices: [
                       { label: 'Yes, run it',             value: 'trigger_automation_confirm' },
                       { label: 'No, let me check first',  value: 'show_catalog' }
                     ],
                     dataHint: 'trigger_automation',
                     params: { name: entities.automationName }};
        }

        if (this._m(msg, ['run','trigger','execute','launch','start automation','kick off',
                'fire','activate','use automation'])) {
            return { reply: 'Which automation would you like to run' + nameSuffix + '? You can search by name or browse by category.',
                     type: 'clarify',
                     choices: [
                       { label: 'Browse Categories',  value: 'show_catalog' },
                       { label: 'Search by Name',     value: 'search_automation' },
                       { label: 'Show All',           value: 'load_automations' },
                       { label: 'Show Most Used',     value: 'load_automations' }
                     ]};
        }

        if (this._m(msg, ['search','find','look for','looking for','locate','find automation',
                'search for automation'])) {
            return { reply: 'What would you like to search for' + nameSuffix + '? You can describe the automation or enter part of its name.',
                     type: 'clarify',
                     choices: [
                       { label: 'Browse Categories',  value: 'show_catalog' },
                       { label: 'Show All',           value: 'load_automations' },
                       { label: 'Show Recent',        value: 'my_automations' },
                       { label: 'Show Most Used',     value: 'load_automations' }
                     ]};
        }

        if (this._m(msg, ['help','what can','assist','what do','how do i','what is this'])) {
            return { reply: 'I\'m your Automations Assistant' + nameSuffix + '. I can help you find, understand, and run automations available to your groups. What would you like to do?',
                     type: 'clarify',
                     choices: [
                       { label: 'Browse Categories',  value: 'show_catalog' },
                       { label: 'Search by Name',     value: 'search_automation' },
                       { label: 'Show Recent',        value: 'my_automations' },
                       { label: 'Show Most Used',     value: 'load_automations' }
                     ]};
        }

        if (this._m(msg, ['show','list','view','get','what','find'])) {
            return { reply: null, type: 'data', dataHint: 'load_automations', choices: null };
        }

        return { reply: 'Are you looking for a specific automation, or would you like to browse by category' + nameSuffix + '?',
                 type: 'clarify',
                 choices: [
                   { label: 'Browse Categories',  value: 'show_catalog' },
                   { label: 'Search by Name',     value: 'search_automation' },
                   { label: 'Show Recent',        value: 'my_automations' },
                   { label: 'Show Most Used',     value: 'load_automations' }
                 ]};
    },

    /* ═══════════════════════════════════════════════════════════════
       CREATOR STUDIO ASSISTANT
    ═══════════════════════════════════════════════════════════════ */
    _routeCreator: function(msg, tokens, topDom, topAct, entities, hCtx, ctx) {
        var firstName = this._firstName(ctx.full_name);
        var nameSuffix = firstName ? ', ' + firstName : '';

        if (this._m(msg, ['start implementation','begin implementation','implement now',
                'ready to implement','start building','begin development','implementation onboarding'])) {
            return { reply: null, type: 'data', dataHint: 'start_implementation', choices: null };
        }

        if (this._m(msg, ['submit project','submit for approval','submit for review',
                'request approval','send for approval','submit initiative'])) {
            return { reply: 'Before submitting, let\'s make sure your project is ready. I\'ll check the implementation plan for completeness.',
                     type: 'data', dataHint: 'submit_project_for_review', choices: null };
        }

        if (this._m(msg, ['view plan','show plan','review plan','my plan','implementation plan',
                'check plan','see the plan','what is the plan','get plan'])) {
            return { reply: null, type: 'data', dataHint: 'get_implementation_plan', choices: null };
        }

        if (this._m(msg, ['create project','new project','start project','start a new project',
                'begin project','new initiative','create initiative','start initiative',
                'new automation project'])) {
            return { reply: 'Let\'s create your project' + nameSuffix + '. What is the name of this automation initiative?',
                     type: 'clarify',
                     choices: [
                       { label: 'Define Scope',            value: 'define_scope' },
                       { label: 'List Requirements',       value: 'list_requirements' },
                       { label: 'Technical Approach',      value: 'technical_approach' },
                       { label: 'Review Plan',             value: 'get_implementation_plan' }
                     ]};
        }

        if (this._m(msg, ['define scope','project scope','what is in scope','scope of','set scope',
                'scope definition','add scope'])) {
            var hasScopeHistory = hCtx && hCtx.lastDomain && (hCtx.lastDomain === 'project' || hCtx.lastDomain === 'design');
            if (hasScopeHistory) {
                return { reply: 'Please describe the scope of this project. What systems, processes, or teams are involved?',
                         type: 'clarify',
                         choices: [
                           { label: 'List Requirements',   value: 'list_requirements' },
                           { label: 'Technical Approach',  value: 'technical_approach' },
                           { label: 'Review Plan',         value: 'get_implementation_plan' },
                           { label: 'Submit for Approval', value: 'submit_project_for_review' }
                         ]};
            }
            return { reply: 'Please describe the scope of this automation initiative. What are the boundaries — which systems, teams, or processes are involved?',
                     type: 'clarify',
                     choices: [
                       { label: 'List Requirements',       value: 'list_requirements' },
                       { label: 'Technical Approach',      value: 'technical_approach' },
                       { label: 'Review Plan',             value: 'get_implementation_plan' },
                       { label: 'Submit for Approval',     value: 'submit_project_for_review' }
                     ]};
        }

        if (this._m(msg, ['add requirement','list requirement','define requirement','requirements',
                'what are the requirement','functional requirement','non-functional',
                'business requirement'])) {
            return { reply: 'What are the requirements for this initiative' + nameSuffix + '? Please list them and I will add them to the implementation plan. You can provide functional and non-functional requirements.',
                     type: 'clarify',
                     choices: [
                       { label: 'Define Scope',            value: 'define_scope' },
                       { label: 'Technical Approach',      value: 'technical_approach' },
                       { label: 'Review Plan',             value: 'get_implementation_plan' },
                       { label: 'Submit for Approval',     value: 'submit_project_for_review' }
                     ]};
        }

        if (this._m(msg, ['technical approach','how to build','architecture','integration',
                'integration point','technical design','how will this work','build approach',
                'implementation approach'])) {
            return { reply: 'Describe the technical approach for this initiative. What systems will be integrated, what ServiceNow features will be used, and are there any dependencies or integration points?',
                     type: 'clarify',
                     choices: [
                       { label: 'Define Scope',            value: 'define_scope' },
                       { label: 'List Requirements',       value: 'list_requirements' },
                       { label: 'Review Plan',             value: 'get_implementation_plan' },
                       { label: 'Submit for Approval',     value: 'submit_project_for_review' }
                     ]};
        }

        if (this._m(msg, ['risk','risks','potential issue','concern','what could go wrong',
                'challenges','obstacles','blockers'])) {
            return { reply: 'What risks or challenges do you foresee with this initiative? I will add them to the plan so leadership can assess them during the review.',
                     type: 'clarify',
                     choices: [
                       { label: 'Define Scope',            value: 'define_scope' },
                       { label: 'List Requirements',       value: 'list_requirements' },
                       { label: 'Review Plan',             value: 'get_implementation_plan' },
                       { label: 'Submit for Approval',     value: 'submit_project_for_review' }
                     ]};
        }

        if (this._m(msg, ['success criteria','how will we know','measure success','kpi','goal',
                'objective','success metric','done when','definition of done'])) {
            return { reply: 'What does success look like for this initiative? Please describe the measurable outcomes or criteria that indicate the automation is working correctly.',
                     type: 'clarify',
                     choices: [
                       { label: 'Define Scope',            value: 'define_scope' },
                       { label: 'List Requirements',       value: 'list_requirements' },
                       { label: 'Review Plan',             value: 'get_implementation_plan' },
                       { label: 'Submit for Approval',     value: 'submit_project_for_review' }
                     ]};
        }

        if (this._m(msg, ['compile plan','generate plan','build plan','create plan','finalise plan',
                'finalize plan','ready to submit','put it together','assemble the plan'])) {
            return { reply: 'I will compile the implementation plan from everything we have discussed. This will include the objective, scope, requirements, technical approach, integration points, estimated effort, risks, and success criteria.',
                     type: 'data', dataHint: 'get_implementation_plan',
                     choices: [
                       { label: 'Review Plan',             value: 'get_implementation_plan' },
                       { label: 'Submit for Approval',     value: 'submit_project_for_review' }
                     ]};
        }

        if (this._m(msg, ['my project','list project','show project','view project',
                'all project','what project','project list','my initiatives'])) {
            return { reply: null, type: 'data', dataHint: 'load_creator_projects', choices: null };
        }

        if (this._m(msg, ['effort','estimate','how long','timeline','duration','time required',
                'how much effort','level of effort'])) {
            return { reply: 'What is the estimated level of effort for this initiative? Please provide a rough timeline or effort estimate (for example: 2 weeks, 3 sprints, or 40 hours). This will be included in the implementation plan for leadership review.',
                     type: 'clarify',
                     choices: [
                       { label: 'Define Scope',            value: 'define_scope' },
                       { label: 'Review Plan',             value: 'get_implementation_plan' },
                       { label: 'Submit for Approval',     value: 'submit_project_for_review' }
                     ]};
        }

        if (this._m(msg, ['help','what can','assist','what do','how do i','guide me'])) {
            return { reply: 'I\'m your Creator Studio Assistant' + nameSuffix + '. I help you design and document automation initiatives that are ready for leadership review. We work together to build an implementation plan covering scope, requirements, technical approach, risks, and success criteria. What would you like to do?',
                     type: 'clarify',
                     choices: [
                       { label: 'Define Scope',            value: 'define_scope' },
                       { label: 'List Requirements',       value: 'list_requirements' },
                       { label: 'Review Plan',             value: 'get_implementation_plan' },
                       { label: 'Submit for Approval',     value: 'submit_project_for_review' }
                     ]};
        }

        return { reply: 'I\'m here to help you build your automation initiative' + nameSuffix + '. Where would you like to focus?',
                 type: 'clarify',
                 choices: [
                   { label: 'Define Scope',            value: 'define_scope' },
                   { label: 'List Requirements',       value: 'list_requirements' },
                   { label: 'Technical Approach',      value: 'technical_approach' },
                   { label: 'Review Plan',             value: 'get_implementation_plan' }
                 ]};
    },

    /* ═══════════════════════════════════════════════════════════════
       LEADERSHIP INSIGHTS ASSISTANT
    ═══════════════════════════════════════════════════════════════ */
    _routeLeadership: function(msg, tokens, topDom, topAct, entities, hCtx, ctx) {
        var firstName = this._firstName(ctx.full_name);
        var nameSuffix = firstName ? ', ' + firstName : '';

        if (this._m(msg, ['pending review','pending approval','awaiting review','need my approval',
                'needs review','what needs review','what needs my attention','action required',
                'outstanding review','waiting for me','pending project'])) {
            return { reply: null, type: 'data', dataHint: 'load_pending_projects', choices: null };
        }

        if (this._m(msg, ['approved project','rejected project','past decision','previous review',
                'what i approved','what i rejected','review history','decision history',
                'project pipeline','pipeline status','all project','project status'])) {
            return { reply: null, type: 'data', dataHint: 'load_project_pipeline', choices: null };
        }

        if (this._m(msg, ['portfolio','analytics','overview','dashboard','metrics',
                'performance','kpi','stats','statistics','how are we doing',
                'leadership analytics','portfolio overview'])) {
            return { reply: null, type: 'data', dataHint: 'load_leadership_analytics', choices: null };
        }

        if (this._m(msg, ['team activity','what is the team doing','team performance',
                'group activity','who is working','my team','team status',
                'team update','what has the team done'])) {
            return { reply: null, type: 'data', dataHint: 'load_team_activity', choices: null };
        }

        if (entities.projectName && this._m(msg, ['approve','approve this','give approval',
                'accept','confirm approval','sign off','authorise','authorize'])) {
            return { reply: 'To confirm — you would like to approve "' + entities.projectName + '". Approving this project will notify the creator to proceed with implementation. Shall I confirm?',
                     type: 'clarify',
                     choices: [
                       { label: 'Yes, approve it',             value: 'approve_project_confirm' },
                       { label: 'No, I need more information', value: 'load_pending_projects' }
                     ]};
        }

        if (this._m(msg, ['approve','approve a project','approve project','give approval',
                'accept a project','sign off on'])) {
            return { reply: 'Which project would you like to approve' + nameSuffix + '? Select from your pending reviews below.',
                     type: 'data', dataHint: 'load_pending_projects', choices: null };
        }

        if (entities.projectName && this._m(msg, ['reject','decline','deny','turn down',
                'not approve','reject this'])) {
            return { reply: 'What is the reason for rejecting "' + entities.projectName + '"? Providing a clear reason helps the creator revise and resubmit.',
                     type: 'clarify',
                     choices: [
                       { label: 'Scope is unclear',              value: 'reject_reason_scope' },
                       { label: 'Requirements are incomplete',   value: 'reject_reason_requirements' },
                       { label: 'Resource constraints',         value: 'reject_reason_resources' },
                       { label: 'Strategic misalignment',       value: 'reject_reason_strategy' }
                     ]};
        }

        if (this._m(msg, ['reject','decline','deny','turn down','not approve','reject a project',
                'reject project'])) {
            return { reply: 'Which project would you like to reject' + nameSuffix + '? Select from your pending reviews.',
                     type: 'data', dataHint: 'load_pending_projects', choices: null };
        }

        if (this._m(msg, ['review','look at','examine','evaluate','assess','check out',
                'read the plan','see the plan','view the plan','details of'])) {
            if (this._m(msg, ['project','initiative','plan','proposal'])) {
                return { reply: null, type: 'data', dataHint: 'load_pending_projects', choices: null };
            }
        }

        if (this._m(msg, ['recent decision','latest decision','what did i decide','recent approval',
                'recent rejection','what was decided'])) {
            return { reply: null, type: 'data', dataHint: 'load_project_pipeline', choices: null };
        }

        if (this._m(msg, ['help','what can','assist','what do','guide me','how do i'])) {
            return { reply: 'I\'m your Leadership Insights Assistant' + nameSuffix + '. I help you review automation initiatives, track portfolio performance, and oversee team activity. What would you like to do?',
                     type: 'clarify',
                     choices: [
                       { label: 'View Pending Reviews',    value: 'load_pending_projects' },
                       { label: 'Portfolio Overview',      value: 'load_leadership_analytics' },
                       { label: 'Recent Decisions',        value: 'load_project_pipeline' },
                       { label: 'Team Activity',           value: 'load_team_activity' }
                     ]};
        }

        if (this._m(msg, ['show','list','view','get','what','find'])) {
            return { reply: null, type: 'data', dataHint: 'load_pending_projects', choices: null };
        }

        return { reply: 'I can help you review initiatives and track your portfolio' + nameSuffix + '. What would you like to focus on?',
                 type: 'clarify',
                 choices: [
                   { label: 'View Pending Reviews',    value: 'load_pending_projects' },
                   { label: 'Portfolio Overview',      value: 'load_leadership_analytics' },
                   { label: 'Recent Decisions',        value: 'load_project_pipeline' },
                   { label: 'Team Activity',           value: 'load_team_activity' }
                 ]};
    },

    /* ═══════════════════════════════════════════════════════════════
       SHARED ANALYSIS METHODS
    ═══════════════════════════════════════════════════════════════ */

    _microIntent: function(msg) {
        if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings|howdy|sup|yo)\b/.test(msg)) {
            return { reply: 'Hello! How can I assist you today?', type: 'text', choices: null };
        }
        if (this._m(msg, ['how are you','hows it going','you doing well','how do you do'])) {
            return { reply: 'I\'m ready and here to help. What can I do for you?', type: 'text', choices: null };
        }

        if (this._m(msg, ['thank you','thanks','thank u','thx','cheers','appreciate it',
                'that helped','great help','well done','brilliant','perfect','you are amazing','youre amazing'])) {
            return { reply: 'You\'re welcome! Is there anything else I can help you with?', type: 'text', choices: null };
        }

        if (this._m(msg, ['goodbye','bye','see you','see ya','farewell','talk later','catch you later','good day'])) {
            return { reply: 'Goodbye! Come back any time you need assistance.', type: 'text', choices: null };
        }

        if (this._m(msg, ['frustrated','this is broken','nothing works','so annoying','this is useless',
                'i am stuck','im stuck','this is frustrating','not working','doesn\'t work'])) {
            return { reply: 'I\'m sorry to hear that — let\'s get this sorted. Tell me what you\'re trying to accomplish and I\'ll do my best to help you get there.',
                     type: 'text', choices: null };
        }

        if (this._m(msg, ['sorry','excuse me','my apologies','my bad','pardon'])) {
            return { reply: 'No problem at all. What can I help you with?', type: 'text', choices: null };
        }

        if (this._m(msg, ['who are you','what are you','are you a bot','are you human','your name',
                'introduce yourself'])) {
            var typeLabel = this.assistantType === 'developer'  ? 'Developer Assistant'
                          : this.assistantType === 'admin'       ? 'Administrator Assistant'
                          : this.assistantType === 'automations' ? 'Automations Assistant'
                          : this.assistantType === 'creator'     ? 'Creator Studio Assistant'
                          : this.assistantType === 'leadership'  ? 'Leadership Insights Assistant'
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
        var automationsDomains = {
            automation:   ['automation','automate','workflow','flow','bot','scheduled task'],
            category:     ['category','catalog','group','type','kind','class'],
            search:       ['search','find','look for','locate','discover','browse'],
            usage:        ['usage','history','recently used','last run','my automations','popular'],
            performance:  ['performance','success rate','how often','run time','duration','result'],
            help:         ['help','guide','explain','how do i','how to','what can','assist']
        };
        var creatorDomains = {
            project:        ['project','initiative','programme','program','workstream'],
            session:        ['session','conversation','chat history','previous session'],
            automation:     ['automation','automate','workflow','deliverable','output'],
            requirement:    ['requirement','feature','user story','acceptance criteria','must have','should have'],
            plan:           ['plan','implementation plan','roadmap','approach','design','blueprint'],
            approval:       ['approval','approve','review','submit','pending','leadership'],
            implementation: ['implement','build','develop','code','deploy','delivery'],
            design:         ['design','architect','scope','boundary','constraint','assumption'],
            scope:          ['scope','in scope','out of scope','boundary','include','exclude'],
            goal:           ['goal','objective','outcome','benefit','value','purpose','why']
        };
        var leadershipDomains = {
            review:     ['review','pending','awaiting','needs my','action required'],
            approval:   ['approval','approve','reject','decide','decision','sign off'],
            project:    ['project','initiative','proposal','submission'],
            initiative: ['initiative','programme','program','workstream','effort'],
            status:     ['status','progress','where is','what stage','update'],
            analytics:  ['analytics','metrics','kpi','stats','statistics','performance','data'],
            team:       ['team','group','member','who is','staff','people','workforce'],
            portfolio:  ['portfolio','all project','overview','pipeline','queue','backlog'],
            risk:       ['risk','concern','issue','blocker','challenge','obstacle'],
            impact:     ['impact','value','benefit','roi','saving','outcome','result'],
            value:      ['value','benefit','worth','justification','business case','return']
        };

        var pool = DOMAINS;
        if (this.assistantType === 'developer')    { pool = devDomains; }
        if (this.assistantType === 'admin')        { pool = adminDomains; }
        if (this.assistantType === 'automations')  { pool = automationsDomains; }
        if (this.assistantType === 'creator')      { pool = creatorDomains; }
        if (this.assistantType === 'leadership')   { pool = leadershipDomains; }

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
            configure: ['configure','setup','set up','enable','disable','toggle','turn on','turn off','manage','administer'],
            find:      ['search','find','look for','locate','browse','filter','discover','explore'],
            submit:    ['submit','send','request','propose','raise','escalate'],
            analyse:   ['analyse','analyze','evaluate','assess','measure','compare','report on']
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
        var quotedMatch = msg.match(/["']([^"']{3,80})["']/);
        if (quotedMatch) {
            entities.quotedPhrase = quotedMatch[1];
            if (this.assistantType === 'automations') { entities.automationName = quotedMatch[1]; }
            if (this.assistantType === 'creator')     { entities.projectName    = quotedMatch[1]; }
            if (this.assistantType === 'leadership')  { entities.projectName    = quotedMatch[1]; }
        }
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
