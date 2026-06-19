// ============================================================
// OPERATIONS INTELLIGENCE — TABLE CREATION
// Run in GLOBAL scope
// ============================================================
// Creates all 19 custom tables for the Operations Intelligence
// platform within the x_infte_ops_int scoped application.
//
// SAFE TO RE-RUN — each table and field checks for existence
// before inserting. Skips anything already in place.
// ============================================================

(function createAllTables() {
    'use strict';

    var APP_SYS_ID = '75be0bf9fbe9cb5052eef5c9beefdce8';
    var SCOPE      = 'x_infte_ops_int';
    var SEP  = '============================================================';
    var SEP2 = '------------------------------------------------------------';

    var created = [];
    var skipped = [];
    var failed  = [];

    gs.print('');
    gs.print(SEP);
    gs.print('  OPERATIONS INTELLIGENCE — TABLE CREATION');
    gs.print(SEP);
    gs.print('');

    // ── Helper: create table ───────────────────────────────────
    function mkTable(name, label, nameField) {
        var fullName = SCOPE + '_' + name;
        var ex = new GlideRecord('sys_db_object');
        ex.addQuery('name', fullName);
        ex.setLimit(1);
        ex.query();
        if (ex.next()) {
            gs.print('  [SKIP]  ' + fullName + ' — already exists');
            skipped.push(fullName);
            return ex.getUniqueValue();
        }
        var gr = new GlideRecord('sys_db_object');
        gr.initialize();
        gr.setValue('name',          fullName);
        gr.setValue('label',         label);
        gr.setValue('sys_scope',     APP_SYS_ID);
        gr.setValue('is_extendable', false);
        gr.setValue('access',        'public');
        gr.setValue('create_access', true);
        gr.setValue('read_access',   true);
        if (nameField) gr.setValue('name_field', nameField);
        var id = gr.insert();
        if (id) {
            gs.print('  [OK]    ' + fullName);
            created.push(fullName);
            return id;
        }
        gs.print('  [FAIL]  ' + fullName);
        failed.push(fullName);
        return null;
    }

    // ── Helper: create field ───────────────────────────────────
    function mkField(tableName, element, label, type, opts) {
        var fullTable = SCOPE + '_' + tableName;
        var ex = new GlideRecord('sys_dictionary');
        ex.addQuery('name', fullTable);
        ex.addQuery('element', element);
        ex.setLimit(1);
        ex.query();
        if (ex.next()) return;

        var gr = new GlideRecord('sys_dictionary');
        gr.initialize();
        gr.setValue('name',         fullTable);
        gr.setValue('element',      element);
        gr.setValue('column_label', label);
        gr.internal_type.setDisplayValue(type);
        gr.setValue('active',       true);
        gr.setValue('sys_scope',    APP_SYS_ID);
        opts = opts || {};
        if (opts.len)       gr.setValue('max_length',    opts.len);
        if (opts.ref)       gr.setValue('reference',     opts.ref);
        if (opts.choice)    gr.setValue('choice',        1);
        if (opts.mandatory) gr.setValue('mandatory',     true);
        if (opts.defVal !== undefined) gr.setValue('default_value', opts.defVal);
        if (opts.readOnly)  gr.setValue('read_only',     true);
        gr.insert();
    }

    // ── Helper: create choice ──────────────────────────────────
    function mkChoice(tableName, element, value, label, seq) {
        var fullTable = SCOPE + '_' + tableName;
        var ex = new GlideRecord('sys_choice');
        ex.addQuery('name',    fullTable);
        ex.addQuery('element', element);
        ex.addQuery('value',   value);
        ex.setLimit(1);
        ex.query();
        if (ex.next()) return;
        var gr = new GlideRecord('sys_choice');
        gr.initialize();
        gr.setValue('name',      fullTable);
        gr.setValue('element',   element);
        gr.setValue('value',     value);
        gr.setValue('label',     label);
        gr.setValue('sequence',  seq);
        gr.setValue('sys_scope', APP_SYS_ID);
        gr.insert();
    }

    // ── Helper: create auto-number ─────────────────────────────
    function mkAutoNumber(tableName, prefix, startAt) {
        var fullTable = SCOPE + '_' + tableName;
        var ex = new GlideRecord('sys_number');
        ex.addQuery('category', fullTable);
        ex.setLimit(1);
        ex.query();
        if (ex.next()) return;
        var gr = new GlideRecord('sys_number');
        gr.initialize();
        gr.setValue('category',   fullTable);
        gr.setValue('prefix',     prefix);
        gr.setValue('number',     startAt || 1001);
        gr.setValue('sys_scope',  APP_SYS_ID);
        gr.insert();
    }

    // ════════════════════════════════════════════════════════════
    // TABLE 1 — person
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [1/19] person');
    mkTable('person', 'Person', 'user');
    mkField('person', 'user',              'User',              'reference', {ref: 'sys_user', mandatory: true});
    mkField('person', 'onboarded_by',      'Onboarded By',      'reference', {ref: SCOPE+'_person'});
    mkField('person', 'onboarded_at',      'Onboarded At',      'glide_date_time');
    mkField('person', 'onboarding_status', 'Onboarding Status', 'string',    {len:40, choice: true, defVal:'pending'});
    mkField('person', 'invitation_sent_at','Invitation Sent At','glide_date_time');
    mkField('person', 'delegation_rights', 'Delegation Rights', 'boolean',   {defVal:'false'});
    mkField('person', 'copilot_enabled',   'Copilot Enabled',   'boolean',   {defVal:'false'});
    mkField('person', 'active',            'Active',            'boolean',   {defVal:'true'});
    mkChoice('person','onboarding_status','pending',     'Pending',     1);
    mkChoice('person','onboarding_status','in_progress', 'In Progress', 2);
    mkChoice('person','onboarding_status','complete',    'Complete',    3);

    // ════════════════════════════════════════════════════════════
    // TABLE 2 — reporting_relationship
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [2/19] reporting_relationship');
    mkTable('reporting_relationship', 'Reporting Relationship');
    mkField('reporting_relationship', 'leader',            'Leader',            'reference', {ref: SCOPE+'_person', mandatory:true});
    mkField('reporting_relationship', 'direct_report',     'Direct Report',     'reference', {ref: SCOPE+'_person', mandatory:true});
    mkField('reporting_relationship', 'relationship_type', 'Relationship Type', 'string',    {len:20, choice:true, mandatory:true, defVal:'primary'});
    mkField('reporting_relationship', 'created_by_person', 'Created By',        'reference', {ref: SCOPE+'_person'});
    mkField('reporting_relationship', 'created_at',        'Created At',        'glide_date_time');
    mkField('reporting_relationship', 'status',            'Status',            'string',    {len:20, choice:true, defVal:'active'});
    mkChoice('reporting_relationship','relationship_type','primary',   'Primary',   1);
    mkChoice('reporting_relationship','relationship_type','secondary', 'Secondary', 2);
    mkChoice('reporting_relationship','status','active',   'Active',   1);
    mkChoice('reporting_relationship','status','inactive', 'Inactive', 2);

    // ════════════════════════════════════════════════════════════
    // TABLE 3 — group
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [3/19] group');
    mkTable('group', 'Operations Group', 'name');
    mkField('group', 'name',         'Name',         'string',    {len:200, mandatory:true});
    mkField('group', 'description',  'Description',  'string',    {len:1000});
    mkField('group', 'type',         'Type',         'string',    {len:30, choice:true, mandatory:true});
    mkField('group', 'owner',        'Owner',        'reference', {ref: SCOPE+'_person'});
    mkField('group', 'parent_group', 'Parent Group', 'reference', {ref: SCOPE+'_group'});
    mkField('group', 'created_by',   'Created By',   'reference', {ref: SCOPE+'_person'});
    mkField('group', 'created_at',   'Created At',   'glide_date_time');
    mkField('group', 'status',       'Status',       'string',    {len:20, choice:true, defVal:'active'});
    mkChoice('group','type','leadership_group', 'Leadership Group', 1);
    mkChoice('group','type','custom_group',     'Custom Group',     2);
    mkChoice('group','status','active',   'Active',   1);
    mkChoice('group','status','archived', 'Archived', 2);

    // ════════════════════════════════════════════════════════════
    // TABLE 4 — group_member
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [4/19] group_member');
    mkTable('group_member', 'Group Member');
    mkField('group_member', 'group',      'Group',      'reference', {ref: SCOPE+'_group',  mandatory:true});
    mkField('group_member', 'member',     'Member',     'reference', {ref: SCOPE+'_person', mandatory:true});
    mkField('group_member', 'group_role', 'Group Role', 'string',    {len:20, choice:true, mandatory:true});
    mkField('group_member', 'added_by',   'Added By',   'reference', {ref: SCOPE+'_person'});
    mkField('group_member', 'added_at',   'Added At',   'glide_date_time');
    mkField('group_member', 'status',     'Status',     'string',    {len:20, choice:true, defVal:'active'});
    mkChoice('group_member','group_role','creator', 'Creator', 1);
    mkChoice('group_member','group_role','user',    'User',    2);
    mkChoice('group_member','status','active',   'Active',   1);
    mkChoice('group_member','status','inactive', 'Inactive', 2);

    // ════════════════════════════════════════════════════════════
    // TABLE 5 — onboarding_request
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [5/19] onboarding_request');
    mkTable('onboarding_request', 'Onboarding Request', 'number');
    mkField('onboarding_request', 'number',               'Number',               'string',    {len:20, readOnly:true});
    mkField('onboarding_request', 'nominee',              'Nominee',              'reference', {ref: SCOPE+'_person'});
    mkField('onboarding_request', 'initiated_by',         'Initiated By',         'reference', {ref: SCOPE+'_person'});
    mkField('onboarding_request', 'target_group',         'Target Group',         'reference', {ref: SCOPE+'_group'});
    mkField('onboarding_request', 'group_role',           'Group Role',           'string',    {len:20, choice:true});
    mkField('onboarding_request', 'system_role',          'System Role',          'string',    {len:20, choice:true});
    mkField('onboarding_request', 'delegation_rights',    'Delegation Rights',    'boolean',   {defVal:'false'});
    mkField('onboarding_request', 'status',               'Status',               'string',    {len:20, choice:true, defVal:'pending'});
    mkField('onboarding_request', 're_invitation_count',  'Re-Invitation Count',  'integer',   {defVal:'0'});
    mkField('onboarding_request', 'invited_at',           'Invited At',           'glide_date_time');
    mkField('onboarding_request', 'completed_at',         'Completed At',         'glide_date_time');
    mkField('onboarding_request', 'expiry_at',            'Expiry At',            'glide_date_time');
    mkField('onboarding_request', 'decline_reason',       'Decline Reason',       'string',    {len:2000});
    mkChoice('onboarding_request','group_role','creator', 'Creator', 1);
    mkChoice('onboarding_request','group_role','user',    'User',    2);
    mkChoice('onboarding_request','system_role','leadership', 'Leadership', 1);
    mkChoice('onboarding_request','system_role','user',       'User',       2);
    mkChoice('onboarding_request','status','pending',  'Pending',  1);
    mkChoice('onboarding_request','status','accepted', 'Accepted', 2);
    mkChoice('onboarding_request','status','declined', 'Declined', 3);
    mkChoice('onboarding_request','status','expired',  'Expired',  4);
    mkAutoNumber('onboarding_request', 'ONB', 1001);

    // ════════════════════════════════════════════════════════════
    // TABLE 6 — automation_category
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [6/19] automation_category');
    mkTable('automation_category', 'Automation Category', 'name');
    mkField('automation_category', 'name',        'Name',        'string',    {len:200, mandatory:true});
    mkField('automation_category', 'description', 'Description', 'string',    {len:1000});
    mkField('automation_category', 'color',       'Color',       'string',    {len:20});
    mkField('automation_category', 'icon',        'Icon',        'string',    {len:100});
    mkField('automation_category', 'active',      'Active',      'boolean',   {defVal:'true'});
    mkField('automation_category', 'created_by',  'Created By',  'reference', {ref: SCOPE+'_person'});

    // ════════════════════════════════════════════════════════════
    // TABLE 7 — approved_flow
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [7/19] approved_flow');
    mkTable('approved_flow', 'Approved Flow', 'display_name');
    mkField('approved_flow', 'flow_sys_id',      'Flow Sys ID',      'string',    {len:32, mandatory:true});
    mkField('approved_flow', 'display_name',     'Display Name',     'string',    {len:200, mandatory:true});
    mkField('approved_flow', 'description',      'Description',      'string',    {len:2000});
    mkField('approved_flow', 'input_variables',  'Input Variables',  'string',    {len:4000});
    mkField('approved_flow', 'active',           'Active',           'boolean',   {defVal:'true'});
    mkField('approved_flow', 'approved_by',      'Approved By',      'reference', {ref: SCOPE+'_person'});
    mkField('approved_flow', 'approved_at',      'Approved At',      'glide_date_time');

    // ════════════════════════════════════════════════════════════
    // TABLE 8 — automation
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [8/19] automation');
    mkTable('automation', 'Automation', 'number');
    mkField('automation', 'number',               'Number',               'string',    {len:20, readOnly:true});
    mkField('automation', 'name',                 'Name',                 'string',    {len:200, mandatory:true});
    mkField('automation', 'short_description',    'Short Description',    'string',    {len:500});
    mkField('automation', 'description',          'Description',          'string',    {len:4000});
    mkField('automation', 'category',             'Category',             'reference', {ref: SCOPE+'_automation_category'});
    mkField('automation', 'trigger_phrases',      'Trigger Phrases',      'string',    {len:4000});
    mkField('automation', 'status',               'Status',               'string',    {len:30, choice:true, defVal:'draft'});
    mkField('automation', 'version',              'Version',              'integer',   {defVal:'1'});
    mkField('automation', 'base_automation',      'Base Automation',      'reference', {ref: SCOPE+'_automation'});
    mkField('automation', 'owner_group',          'Owner Group',          'reference', {ref: SCOPE+'_group'});
    mkField('automation', 'created_by',           'Created By',           'reference', {ref: SCOPE+'_person'});
    mkField('automation', 'submitted_at',         'Submitted At',         'glide_date_time');
    mkField('automation', 'approved_at',          'Approved At',          'glide_date_time');
    mkField('automation', 'approved_by',          'Approved By',          'reference', {ref: SCOPE+'_person'});
    mkField('automation', 'rejected_at',          'Rejected At',          'glide_date_time');
    mkField('automation', 'rejected_by',          'Rejected By',          'reference', {ref: SCOPE+'_person'});
    mkField('automation', 'rejected_reason',      'Rejection Reason',     'string',    {len:2000});
    mkField('automation', 'estimated_time_saved', 'Est. Time Saved (min)','integer',   {defVal:'0'});
    mkField('automation', 'usage_count',          'Usage Count',          'integer',   {defVal:'0'});
    mkField('automation', 'browsable',            'Browsable',            'boolean',   {defVal:'false'});
    mkField('automation', 'active',               'Active',               'boolean',   {defVal:'true'});
    mkChoice('automation','status','draft',              'Draft',              1);
    mkChoice('automation','status','in_review',          'In Review',          2);
    mkChoice('automation','status','testing',            'Testing',            3);
    mkChoice('automation','status','pending_approval',   'Pending Approval',   4);
    mkChoice('automation','status','published',          'Published',          5);
    mkChoice('automation','status','deprecation_queued', 'Deprecation Queued', 6);
    mkChoice('automation','status','deprecated',         'Deprecated',         7);
    mkAutoNumber('automation', 'AUT', 1001);

    // ════════════════════════════════════════════════════════════
    // TABLE 9 — automation_version
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [9/19] automation_version');
    mkTable('automation_version', 'Automation Version');
    mkField('automation_version', 'automation',              'Automation',           'reference',  {ref: SCOPE+'_automation', mandatory:true});
    mkField('automation_version', 'version_number',          'Version Number',       'integer',    {mandatory:true});
    mkField('automation_version', 'snapshot_steps',          'Snapshot Steps',       'string',     {len:65535});
    mkField('automation_version', 'snapshot_inputs',         'Snapshot Inputs',      'string',     {len:65535});
    mkField('automation_version', 'snapshot_trigger_phrases','Snapshot Phrases',     'string',     {len:4000});
    mkField('automation_version', 'published_at',            'Published At',         'glide_date_time');
    mkField('automation_version', 'published_by',            'Published By',         'reference',  {ref: SCOPE+'_person'});

    // ════════════════════════════════════════════════════════════
    // TABLE 10 — automation_step
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [10/19] automation_step');
    mkTable('automation_step', 'Automation Step');
    mkField('automation_step', 'automation',       'Automation',       'reference', {ref: SCOPE+'_automation', mandatory:true});
    mkField('automation_step', 'order',            'Order',            'integer',   {mandatory:true});
    mkField('automation_step', 'name',             'Name',             'string',    {len:200, mandatory:true});
    mkField('automation_step', 'action_type',      'Action Type',      'string',    {len:40, choice:true, mandatory:true});
    mkField('automation_step', 'configuration',    'Configuration',    'string',    {len:65535});
    mkField('automation_step', 'branch_true_step', 'Branch True Step', 'integer');
    mkField('automation_step', 'branch_false_step','Branch False Step','integer');
    mkField('automation_step', 'on_failure',       'On Failure',       'string',    {len:20, choice:true, defVal:'stop'});
    mkField('automation_step', 'active',           'Active',           'boolean',   {defVal:'true'});
    mkChoice('automation_step','action_type','record_create',       'Record Create',        1);
    mkChoice('automation_step','action_type','record_update',       'Record Update',        2);
    mkChoice('automation_step','action_type','record_query',        'Record Query',         3);
    mkChoice('automation_step','action_type','flow_trigger',        'Flow Trigger',         4);
    mkChoice('automation_step','action_type','rest_call',           'REST Call',            5);
    mkChoice('automation_step','action_type','send_notification',   'Send Notification',    6);
    mkChoice('automation_step','action_type','approval_gate',       'Approval Gate',        7);
    mkChoice('automation_step','action_type','conditional_branch',  'Conditional Branch',   8);
    mkChoice('automation_step','on_failure','stop',     'Stop',     1);
    mkChoice('automation_step','on_failure','continue', 'Continue', 2);
    mkChoice('automation_step','on_failure','skip',     'Skip',     3);

    // ════════════════════════════════════════════════════════════
    // TABLE 11 — automation_input
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [11/19] automation_input');
    mkTable('automation_input', 'Automation Input');
    mkField('automation_input', 'automation',       'Automation',       'reference', {ref: SCOPE+'_automation', mandatory:true});
    mkField('automation_input', 'order',            'Order',            'integer',   {mandatory:true});
    mkField('automation_input', 'label',            'Label',            'string',    {len:500, mandatory:true});
    mkField('automation_input', 'field_name',       'Field Name',       'string',    {len:100, mandatory:true});
    mkField('automation_input', 'input_type',       'Input Type',       'string',    {len:20, choice:true, mandatory:true, defVal:'text'});
    mkField('automation_input', 'choices',          'Choices',          'string',    {len:4000});
    mkField('automation_input', 'required',         'Required',         'boolean',   {defVal:'false'});
    mkField('automation_input', 'validation_regex', 'Validation Regex', 'string',    {len:500});
    mkChoice('automation_input','input_type','text',    'Text',    1);
    mkChoice('automation_input','input_type','number',  'Number',  2);
    mkChoice('automation_input','input_type','date',    'Date',    3);
    mkChoice('automation_input','input_type','choice',  'Choice',  4);
    mkChoice('automation_input','input_type','boolean', 'Boolean', 5);

    // ════════════════════════════════════════════════════════════
    // TABLE 12 — group_automation
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [12/19] group_automation');
    mkTable('group_automation', 'Group Automation');
    mkField('group_automation', 'group',           'Group',           'reference', {ref: SCOPE+'_group',      mandatory:true});
    mkField('group_automation', 'automation',      'Automation',      'reference', {ref: SCOPE+'_automation', mandatory:true});
    mkField('group_automation', 'added_by',        'Added By',        'reference', {ref: SCOPE+'_person'});
    mkField('group_automation', 'added_at',        'Added At',        'glide_date_time');
    mkField('group_automation', 'approval_status', 'Approval Status', 'string',    {len:20, choice:true, defVal:'pending'});
    mkField('group_automation', 'approved_by',     'Approved By',     'reference', {ref: SCOPE+'_person'});
    mkField('group_automation', 'approved_at',     'Approved At',     'glide_date_time');
    mkField('group_automation', 'rejected_reason', 'Rejection Reason','string',    {len:2000});
    mkChoice('group_automation','approval_status','pending',  'Pending',  1);
    mkChoice('group_automation','approval_status','approved', 'Approved', 2);
    mkChoice('group_automation','approval_status','rejected', 'Rejected', 3);

    // ════════════════════════════════════════════════════════════
    // TABLE 13 — execution
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [13/19] execution');
    mkTable('execution', 'Execution', 'number');
    mkField('execution', 'number',             'Number',             'string',    {len:20, readOnly:true});
    mkField('execution', 'automation',         'Automation',         'reference', {ref: SCOPE+'_automation', mandatory:true});
    mkField('execution', 'automation_version', 'Automation Version', 'integer');
    mkField('execution', 'triggered_by',       'Triggered By',       'reference', {ref: SCOPE+'_person'});
    mkField('execution', 'triggered_at',       'Triggered At',       'glide_date_time');
    mkField('execution', 'channel',            'Channel',            'string',    {len:20, choice:true, mandatory:true});
    mkField('execution', 'status',             'Status',             'string',    {len:30, choice:true, defVal:'pending'});
    mkField('execution', 'is_test',            'Is Test',            'boolean',   {defVal:'false'});
    mkField('execution', 'input_values',       'Input Values',       'string',    {len:65535});
    mkField('execution', 'completed_at',       'Completed At',       'glide_date_time');
    mkField('execution', 'group',              'Group',              'reference', {ref: SCOPE+'_group'});
    mkChoice('execution','channel','va',        'VA',        1);
    mkChoice('execution','channel','portal',    'Portal',    2);
    mkChoice('execution','channel','scheduled', 'Scheduled', 3);
    mkChoice('execution','status','pending',           'Pending',           1);
    mkChoice('execution','status','running',           'Running',           2);
    mkChoice('execution','status','success',           'Success',           3);
    mkChoice('execution','status','failed',            'Failed',            4);
    mkChoice('execution','status','awaiting_approval', 'Awaiting Approval', 5);
    mkChoice('execution','status','cancelled',         'Cancelled',         6);
    mkAutoNumber('execution', 'EXC', 1001);

    // ════════════════════════════════════════════════════════════
    // TABLE 14 — execution_step_log
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [14/19] execution_step_log');
    mkTable('execution_step_log', 'Execution Step Log');
    mkField('execution_step_log', 'execution',     'Execution',     'reference', {ref: SCOPE+'_execution', mandatory:true});
    mkField('execution_step_log', 'step_order',    'Step Order',    'integer',   {mandatory:true});
    mkField('execution_step_log', 'step_name',     'Step Name',     'string',    {len:200});
    mkField('execution_step_log', 'action_type',   'Action Type',   'string',    {len:100});
    mkField('execution_step_log', 'status',        'Status',        'string',    {len:20, choice:true, defVal:'pending'});
    mkField('execution_step_log', 'started_at',    'Started At',    'glide_date_time');
    mkField('execution_step_log', 'completed_at',  'Completed At',  'glide_date_time');
    mkField('execution_step_log', 'output',        'Output',        'string',    {len:65535});
    mkField('execution_step_log', 'error_message', 'Error Message', 'string',    {len:4000});
    mkChoice('execution_step_log','status','pending', 'Pending', 1);
    mkChoice('execution_step_log','status','running', 'Running', 2);
    mkChoice('execution_step_log','status','success', 'Success', 3);
    mkChoice('execution_step_log','status','failed',  'Failed',  4);
    mkChoice('execution_step_log','status','skipped', 'Skipped', 5);

    // ════════════════════════════════════════════════════════════
    // TABLE 15 — automation_schedule
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [15/19] automation_schedule');
    mkTable('automation_schedule', 'Automation Schedule');
    mkField('automation_schedule', 'automation',     'Automation',     'reference', {ref: SCOPE+'_automation', mandatory:true});
    mkField('automation_schedule', 'schedule_type',  'Schedule Type',  'string',    {len:20, choice:true, mandatory:true});
    mkField('automation_schedule', 'cron_expression','Cron Expression','string',    {len:100});
    mkField('automation_schedule', 'run_at',         'Run At',         'glide_date_time');
    mkField('automation_schedule', 'timezone',       'Timezone',       'string',    {len:100, defVal:'UTC'});
    mkField('automation_schedule', 'active',         'Active',         'boolean',   {defVal:'true'});
    mkField('automation_schedule', 'sysauto_sys_id', 'Sysauto Sys ID','string',    {len:32});
    mkField('automation_schedule', 'created_at',     'Created At',     'glide_date_time');
    mkChoice('automation_schedule','schedule_type','recurring', 'Recurring', 1);
    mkChoice('automation_schedule','schedule_type','one_time',  'One Time',  2);

    // ════════════════════════════════════════════════════════════
    // TABLE 16 — use_case_request
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [16/19] use_case_request');
    mkTable('use_case_request', 'Use Case Request', 'number');
    mkField('use_case_request', 'number',                'Number',               'string',    {len:20, readOnly:true});
    mkField('use_case_request', 'title',                 'Title',                'string',    {len:500, mandatory:true});
    mkField('use_case_request', 'description',           'Description',          'string',    {len:4000});
    mkField('use_case_request', 'structured_spec',       'Structured Spec',      'string',    {len:65535});
    mkField('use_case_request', 'submitted_by',          'Submitted By',         'reference', {ref: SCOPE+'_person'});
    mkField('use_case_request', 'target_group',          'Target Group',         'reference', {ref: SCOPE+'_group'});
    mkField('use_case_request', 'additional_groups',     'Additional Groups',    'string',    {len:4000});
    mkField('use_case_request', 'status',                'Status',               'string',    {len:20, choice:true, defVal:'draft'});
    mkField('use_case_request', 'copilot_enhanced',      'Copilot Enhanced',     'boolean',   {defVal:'false'});
    mkField('use_case_request', 'copilot_phrases_applied','Copilot Phrases Applied','boolean',{defVal:'false'});
    mkField('use_case_request', 'submitted_at',          'Submitted At',         'glide_date_time');
    mkField('use_case_request', 'reviewed_by',           'Reviewed By',          'reference', {ref: SCOPE+'_person'});
    mkField('use_case_request', 'reviewed_at',           'Reviewed At',          'glide_date_time');
    mkField('use_case_request', 'resulting_automation',  'Resulting Automation', 'reference', {ref: SCOPE+'_automation'});
    mkChoice('use_case_request','status','draft',      'Draft',      1);
    mkChoice('use_case_request','status','submitted',  'Submitted',  2);
    mkChoice('use_case_request','status','in_review',  'In Review',  3);
    mkChoice('use_case_request','status','approved',   'Approved',   4);
    mkChoice('use_case_request','status','rejected',   'Rejected',   5);
    mkChoice('use_case_request','status','building',   'Building',   6);
    mkChoice('use_case_request','status','complete',   'Complete',   7);
    mkAutoNumber('use_case_request', 'UCR', 1001);

    // ════════════════════════════════════════════════════════════
    // TABLE 17 — creator_credential
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [17/19] creator_credential');
    mkTable('creator_credential', 'Creator Credential');
    mkField('creator_credential', 'user',                   'User',                  'reference',  {ref: SCOPE+'_person', mandatory:true});
    mkField('creator_credential', 'github_pat',             'GitHub PAT',            'password2');
    mkField('creator_credential', 'token_status',           'Token Status',          'string',     {len:20, choice:true, defVal:'active'});
    mkField('creator_credential', 'connected_at',           'Connected At',          'glide_date_time');
    mkField('creator_credential', 'last_validated_at',      'Last Validated At',     'glide_date_time');
    mkField('creator_credential', 'last_validation_result', 'Last Validation Result','string',     {len:20, choice:true});
    mkChoice('creator_credential','token_status','active',  'Active',  1);
    mkChoice('creator_credential','token_status','expired', 'Expired', 2);
    mkChoice('creator_credential','token_status','revoked', 'Revoked', 3);
    mkChoice('creator_credential','last_validation_result','success', 'Success', 1);
    mkChoice('creator_credential','last_validation_result','failed',  'Failed',  2);

    // ════════════════════════════════════════════════════════════
    // TABLE 18 — pending_action
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [18/19] pending_action');
    mkTable('pending_action', 'Pending Action', 'number');
    mkField('pending_action', 'number',            'Number',            'string',    {len:20, readOnly:true});
    mkField('pending_action', 'action_type',       'Action Type',       'string',    {len:40, choice:true, mandatory:true});
    mkField('pending_action', 'subject_user',      'Subject User',      'reference', {ref: SCOPE+'_person'});
    mkField('pending_action', 'related_automation','Related Automation','reference', {ref: SCOPE+'_automation'});
    mkField('pending_action', 'related_artifact',  'Related Artifact',  'reference', {ref: SCOPE+'_managed_artifact'});
    mkField('pending_action', 'related_group',     'Related Group',     'reference', {ref: SCOPE+'_group'});
    mkField('pending_action', 'assigned_to',       'Assigned To',       'reference', {ref: SCOPE+'_person'});
    mkField('pending_action', 'status',            'Status',            'string',    {len:20, choice:true, defVal:'pending'});
    mkField('pending_action', 'created_at',        'Created At',        'glide_date_time');
    mkField('pending_action', 'deadline_at',       'Deadline At',       'glide_date_time');
    mkField('pending_action', 'actioned_at',       'Actioned At',       'glide_date_time');
    mkField('pending_action', 'actioned_by',       'Actioned By',       'reference', {ref: SCOPE+'_person'});
    mkField('pending_action', 'resolution',        'Resolution',        'string',    {len:30, choice:true});
    mkField('pending_action', 'notes',             'Notes',             'string',    {len:4000});
    mkChoice('pending_action','action_type','user_deactivation',  'User Deactivation',  1);
    mkChoice('pending_action','action_type','automation_approval','Automation Approval', 2);
    mkChoice('pending_action','action_type','onboarding_expiry',  'Onboarding Expiry',  3);
    mkChoice('pending_action','action_type','token_expiry',       'Token Expiry',       4);
    mkChoice('pending_action','action_type','leader_reassignment','Leader Reassignment', 5);
    mkChoice('pending_action','action_type','artifact_approval',  'Artifact Approval',  6);
    mkChoice('pending_action','status','pending',      'Pending',      1);
    mkChoice('pending_action','status','actioned',     'Actioned',     2);
    mkChoice('pending_action','status','auto_resolved','Auto Resolved',3);
    mkChoice('pending_action','status','escalated',    'Escalated',    4);
    mkChoice('pending_action','resolution','approved',          'Approved',           1);
    mkChoice('pending_action','resolution','rejected',          'Rejected',           2);
    mkChoice('pending_action','resolution','approved_removal',  'Approved Removal',   3);
    mkChoice('pending_action','resolution','notified_user',     'Notified User',      4);
    mkChoice('pending_action','resolution','reassigned',        'Reassigned',         5);
    mkChoice('pending_action','resolution','no_action',         'No Action',          6);
    mkAutoNumber('pending_action', 'PND', 1001);

    // ════════════════════════════════════════════════════════════
    // TABLE 19 — managed_artifact
    // ════════════════════════════════════════════════════════════
    gs.print(SEP2);
    gs.print('  [19/19] managed_artifact');
    mkTable('managed_artifact', 'Managed Artifact', 'number');
    mkField('managed_artifact', 'number',              'Number',              'string',    {len:20, readOnly:true});
    mkField('managed_artifact', 'display_name',        'Display Name',        'string',    {len:500, mandatory:true});
    mkField('managed_artifact', 'description',         'Description',         'string',    {len:4000});
    mkField('managed_artifact', 'artifact_type',       'Artifact Type',       'string',    {len:40, choice:true, mandatory:true});
    mkField('managed_artifact', 'owner_group',         'Owner Group',         'reference', {ref: SCOPE+'_group'});
    mkField('managed_artifact', 'created_by',          'Created By',          'reference', {ref: SCOPE+'_person'});
    mkField('managed_artifact', 'status',              'Status',              'string',    {len:30, choice:true, defVal:'draft'});
    mkField('managed_artifact', 'approval_required',   'Approval Required',   'boolean',   {defVal:'false'});
    mkField('managed_artifact', 'approved_by',         'Approved By',         'reference', {ref: SCOPE+'_person'});
    mkField('managed_artifact', 'approved_at',         'Approved At',         'glide_date_time');
    mkField('managed_artifact', 'rejected_reason',     'Rejection Reason',    'string',    {len:4000});
    mkField('managed_artifact', 'artifact_sys_ids',    'Artifact Sys IDs',    'string',    {len:4000});
    mkField('managed_artifact', 'creation_spec',       'Creation Spec',       'string',    {len:65535});
    mkField('managed_artifact', 'copilot_assisted',    'Copilot Assisted',    'boolean',   {defVal:'false'});
    mkField('managed_artifact', 'copilot_spec_applied','Copilot Spec Applied','boolean',   {defVal:'false'});
    mkField('managed_artifact', 'created_at',          'Created At',          'glide_date_time');
    mkField('managed_artifact', 'updated_at',          'Updated At',          'glide_date_time');
    mkChoice('managed_artifact','artifact_type','report',             'Report',              1);
    mkChoice('managed_artifact','artifact_type','pa_dashboard',       'PA Dashboard',        2);
    mkChoice('managed_artifact','artifact_type','notification_rule',  'Notification Rule',   3);
    mkChoice('managed_artifact','artifact_type','scheduled_data_job', 'Scheduled Data Job',  4);
    mkChoice('managed_artifact','artifact_type','flow',               'Flow',                5);
    mkChoice('managed_artifact','artifact_type','custom_table',       'Custom Table',        6);
    mkChoice('managed_artifact','artifact_type','ui_page',            'UI Page',             7);
    mkChoice('managed_artifact','status','draft',            'Draft',            1);
    mkChoice('managed_artifact','status','pending_approval', 'Pending Approval', 2);
    mkChoice('managed_artifact','status','active',           'Active',           3);
    mkChoice('managed_artifact','status','inactive',         'Inactive',         4);
    mkChoice('managed_artifact','status','archived',         'Archived',         5);
    mkAutoNumber('managed_artifact', 'ART', 1001);

    // ── SUMMARY ───────────────────────────────────────────────
    gs.print('');
    gs.print(SEP);
    gs.print('  TABLE CREATION — COMPLETE');
    gs.print(SEP);
    gs.print('  Created : ' + created.length + ' table(s)');
    gs.print('  Skipped : ' + skipped.length + ' (already exist)');
    gs.print('  Failed  : ' + failed.length);
    if (failed.length > 0) {
        gs.print('');
        gs.print('  Failed tables:');
        for (var i = 0; i < failed.length; i++) {
            gs.print('    ! ' + failed[i]);
        }
    }
    gs.print('');
    gs.print('  NEXT STEP: Tell the assistant "tables done" to continue');
    gs.print('  with Script Includes, Business Rules, and platform build.');
    gs.print(SEP);
    gs.print('');

})();
