export const MODS = [
  { id: 'operations',  label: 'Operations Workspace',  color: '#3b82f6' },
  { id: 'automations', label: 'Automations Workspace', color: '#3b82f6' },
  { id: 'agentic',     label: 'Agentic Workspace',     color: '#06b6d4' },
  { id: 'creator',     label: 'Creator Studio',         color: '#f97316' },
  { id: 'governance',  label: 'Governance Control',     color: '#8b5cf6' },
  { id: 'leadership',  label: 'Leadership Insights',    color: '#10b981' },
  { id: 'developer',   label: 'Developer Hub',          color: '#3b82f6' },
  { id: 'admin',       label: 'Administrator Hub',      color: '#f59e0b' },
];

export const CHAT = {
  operations:  { name: 'Operations Assistant',    sub: 'Your intelligent service desk companion',              color: '#3b82f6', init: 'You selected <strong>New Hardware Request</strong> from ITAM Operations. I can help you fill in the required fields — Department, Priority, and Asset Type. Ready to submit?', q: 'What is the current SLA status for my open requests?', r: 'You have 3 open requests. INC0042316 — P2 — breached SLA by 2h. REQ0019847 — awaiting approval. PRB0003021 — in progress, within SLA. Would you like me to escalate the P2 incident?' },
  automations: { name: 'Automations Assistant',   sub: 'Confirm the target user before running',               color: '#3b82f6', init: 'You triggered <strong>Password Reset Flow</strong>. Confirm the target user before I proceed. Running for: barfleur@company.com. Estimated completion: 30 seconds.', q: 'Show me the last 5 runs of Password Reset Flow', r: 'Last 5 runs of <strong>Password Reset Flow</strong>:<br>Jun 24 — success · Jun 23 — success · Jun 22 — failed (AD timeout) · Jun 20 — success · Jun 19 — success. Overall success rate: 80% across 46 total runs.' },
  agentic:     { name: 'Agentic Assistant',       sub: 'Intelligent reasoning across all platform capabilities', color: '#06b6d4', init: 'I have access to both CMDB and Service Operations contexts. What would you like to explore?', q: 'Show me all P1 incidents related to the SAP Production CI', r: 'Found 3 active P1 incidents linked to CI: SAP-PROD-APP01 — INC0012847 — Memory threshold exceeded · INC0012849 — Response time degradation · INC0012851 — Batch job failure. Would you like me to pull the full incident details or check upstream CI dependencies?' },
  creator:     { name: 'Creator Assistant',       sub: 'End-to-end guidance to build and ship',                color: '#f97316', init: 'Requirements for <strong>Employee Onboarding Automation</strong> are complete. You have 4 actions and 2 conditional paths defined. I can suggest 1 improvement before submission.', q: "What gap exists and how do I fix it?", r: "Step 4 sends a personalised welcome email but there's no error handler if the email service is unavailable. Suggestion: add a fallback notification via ServiceNow notification record. Want me to add that step automatically?" },
  governance:  { name: 'Governance Assistant',    sub: 'Risk, compliance, and approval intelligence',          color: '#8b5cf6', init: '3 items awaiting your decision. The <strong>Employee Onboarding Automation</strong> is a standard initiative — low risk. Ready for your review.', q: 'What is the risk level of Employee Onboarding Automation?', r: 'Risk assessment: Scope — Active Directory + email + 6 applications. Privilege — standard domain user only. Data classification — PII (name, email, department). Risk level: <strong>LOW</strong>. Safe to approve.' },
  leadership:  { name: 'Leadership Assistant',    sub: 'Strategic oversight and initiative intelligence',       color: '#10b981', init: 'Good morning. You have <strong>2 initiatives awaiting your decision</strong> and 14 automations running at 94% success rate.', q: 'What is the current pipeline status?', r: 'Pipeline summary: 14 automations live · 3 initiatives in governance or leadership review · 8 in active development · Estimated 4 new automations ready for approval this quarter. <strong>IT Asset Lifecycle</strong> is the highest-priority pending decision — 5-day SLA expires in 2 days.' },
  developer:   { name: 'Developer Assistant',     sub: 'Inspect artifacts and debug the solution',             color: '#3b82f6', init: 'Developer Hub is loaded. 117 operations documented across 8 tables, 12 Script Includes, and 6 Business Rules in scope x_infte_ops_int.', q: 'Show me the CreatorAssistBridge Script Include', r: '<strong>CreatorAssistBridge</strong> — Script Include · Scope: x_infte_ops_int · Updated: 2 days ago · Public methods: generateSpec · generatePhasedSpec · hasActiveToken · Calls assist_api_endpoint via REST. Requires active token in Persons table.' },
  admin:       { name: 'Administrator Assistant', sub: 'Configure and maintain the solution',                  color: '#f59e0b', init: 'Administrator Hub is active. 5 service catalog categories across 24 items. 3 system properties require your attention.', q: 'What needs attention today?', r: '3 items flagged: 1. assist_api_endpoint property is empty — Creator Assistant will not function until set. 2. 2 service items in Pending status. 3. Notification queue has 142 items — 4 failed in the last 24h.' },
};

export const OP_CATS = [
  { title: 'Knowledge Management', items: [
    { name: 'Knowledge Base Search',      desc: 'Search the full knowledge base for solutions and self-service articles.' },
    { name: 'Submit Knowledge Article',   desc: 'Contribute a new knowledge article for review and publishing.' },
    { name: 'Request Article Access',     desc: 'Request access to restricted knowledge base sections.' },
  ]},
  { title: 'ITSM Operations', items: [
    { name: 'Incident Report',            desc: 'Raise a new incident through the platform for immediate response.' },
    { name: 'Password Reset',             desc: 'Self-service reset for identity systems across all directories.' },
    { name: 'Application Access Request', desc: 'Request access to an application or system in the estate.' },
    { name: 'Change Request Submission',  desc: 'Submit a change request for review and approval.' },
    { name: 'Change Management Entry',    desc: 'Log a change management entry for audit and compliance.' },
    { name: 'VPN and Remote Access Setup',desc: 'Configure remote access for users and contractors.' },
  ]},
  { title: 'ITAM Operations', items: [
    { name: 'New Hardware Request',              desc: 'Request a laptop, monitor or peripheral device from IT.' },
    { name: 'Software License Request',          desc: 'Request a commercial software licence for business use.' },
    { name: 'Asset Transfer or Reassignment',    desc: 'Transfer or reassign a hardware asset between users.' },
    { name: 'Asset Decommission',                desc: 'Retire and securely wipe end-of-life assets from the estate.' },
  ]},
];

export const AUTO_CATS = [
  { title: 'Knowledge Management', items: [
    { name: 'Knowledge Article Publisher', desc: 'Automatically publishes approved articles to the KB portal on schedule.', type: 'Scheduled', status: 'live',    date: 'Daily 06:00' },
    { name: 'Article Expiry Review',       desc: 'Flags articles nearing their review date and notifies content owners.',   type: 'Triggered', status: 'live',    date: '2025-06-01' },
    { name: 'Feedback Aggregator',         desc: 'Compiles article feedback scores and generates a weekly quality report.', type: 'Scheduled', status: 'review',  date: 'Weekly Mon' },
    { name: 'Brain Scan',                  desc: 'Scans KB for outdated references and raises review tasks for owners.',    type: 'Triggered', status: 'draft',   date: '—' },
  ]},
  { title: 'ITSM Operations', items: [
    { name: 'Password Reset Flow',        desc: 'Resets user credentials across Active Directory and identity systems.',    type: 'Triggered', status: 'live',    date: '2025-06-24' },
    { name: 'Application Provisioning',   desc: 'Grants role-based access to standard application suite on onboarding.',   type: 'Triggered', status: 'live',    date: '2025-06-23' },
    { name: 'Server Health Check',        desc: 'Runs health diagnostics on critical servers and reports anomalies.',       type: 'Scheduled', status: 'live',    date: 'Hourly' },
    { name: 'VDL 1',                      desc: 'Validates and processes VDL data files on a nightly batch cycle.',         type: 'Scheduled', status: 'pending', date: '—' },
  ]},
  { title: 'ITAM Operations', items: [
    { name: 'Asset Lifecycle Manager',    desc: 'Tracks hardware assets from procurement through decommission automatically.', type: 'Scheduled', status: 'live',  date: 'Daily 02:00' },
    { name: 'Licence Compliance Alert',   desc: 'Compares installed software against licence entitlements and alerts excess.',  type: 'Scheduled', status: 'live',  date: 'Weekly Sun' },
    { name: 'Asset Decommission',         desc: 'Executes secure wipe and disposal workflow for retired hardware assets.',      type: 'Triggered', status: 'live',  date: '2025-06-20' },
    { name: 'Hard Refresh',               desc: 'Refreshes CMDB asset data from endpoint management tools nightly.',            type: 'Scheduled', status: 'draft', date: '—' },
  ]},
];

export const GOV_PENDING = [
  { title: 'Employee Onboarding Automation',          sub: 'Automation · Creator Studio — 14 steps · 3 conditions',                     who: 'CREATOR STUDIO',  time: '11 min ago',  priority: 'standard' },
  { title: 'Leadership Insights Access — Marcus Webb', sub: 'Access Request · Leadership Insights module access for senior analyst role', who: 'ESCALATED',       time: '32 min ago',  priority: 'elevated' },
  { title: 'Developer Hub Access — Anna Torres',       sub: 'Access Request · Developer Hub read access for junior developer onboarding', who: 'PENDING PERMS',   time: '58 min ago',  priority: 'standard' },
  { title: 'New user provisioning — Anna Torres',      sub: 'User Provisioning · New Operations Intelligence Creator group membership',   who: 'PENDING CREATOR', time: '1h 18m ago',  priority: 'standard' },
];

export const GOV_GROUP = [
  { title: 'Operations Intelligence Creators Group',  sub: 'Group membership request for 3 new Creator-role users',                   who: 'GROUP ADMIN',      time: '2h ago' },
  { title: 'Leadership Access Bulk Review',            sub: 'Quarterly review — 12 leadership role holders require recertification',  who: 'GOVERNANCE CYCLE', time: '3h ago' },
];

export const GOV_ACCESS = [
  { title: 'Leadership Insights — Read Access',       sub: 'Requested by Marcus Webb for strategic reporting purposes',               who: 'PENDING',  time: '45 min ago' },
  { title: 'Developer Hub — Full Access',             sub: 'Requested by P. Nair for application development assignment',             who: 'APPROVED', time: '2h ago' },
];

export const DEV_TABLES = [
  { name: 'Service Catalog Items',      api: 'x_infte_ops_int_catalog_item',      rec: '24',    upd: '1d ago' },
  { name: 'Service Catalog Categories', api: 'x_infte_ops_int_catalog_category',  rec: '5',     upd: '5d ago' },
  { name: 'Creator Projects',           api: 'x_infte_ops_int_creator_project',   rec: '4',     upd: '20d ago' },
  { name: 'Creator Sessions',           api: 'x_infte_ops_int_creator_session',   rec: '11',    upd: '20d ago' },
  { name: 'Persons',                    api: 'x_infte_ops_int_person',            rec: '18',    upd: '1d ago' },
  { name: 'Audit Events',               api: 'x_infte_ops_int_audit',             rec: '3,841', upd: '1h ago' },
  { name: 'Governance Actions',         api: 'x_infte_ops_int_gov_action',        rec: '9',     upd: '5h ago' },
  { name: 'Notification Queue',         api: 'x_infte_ops_int_notification',      rec: '142',   upd: '1d ago' },
];

export const ADMIN_CATS = [
  { title: 'Knowledge Management', color: '#3b82f6', items: [
    { name: 'Knowledge Base Search',    desc: 'Search the full knowledge base for solutions',      type: 'Flow', status: 'live' },
    { name: 'Submit Knowledge Article', desc: 'Contribute a new knowledge article for review',     type: 'Flow', status: 'live' },
  ]},
  { title: 'ITSM Operations', color: '#10b981', items: [
    { name: 'Incident Report',            desc: 'Raise a new incident through the platform',       type: 'Flow', status: 'live' },
    { name: 'Password Reset',             desc: 'Self-service reset for identity systems',         type: 'Flow', status: 'live' },
    { name: 'Application Access Request', desc: 'Request access to an application or system',     type: 'Flow', status: 'live' },
  ]},
  { title: 'ITAM Operations', color: '#f59e0b', items: [
    { name: 'New Hardware Request',       desc: 'Request a laptop, monitor or peripheral',         type: 'Flow', status: 'live' },
    { name: 'Software License Request',   desc: 'Request a commercial software licence',           type: 'Flow', status: 'live' },
    { name: 'Asset Decommission',         desc: 'Retire and securely wipe end-of-life assets',     type: 'Flow', status: 'pending' },
  ]},
];
