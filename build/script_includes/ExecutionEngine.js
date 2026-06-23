var ExecutionEngine = Class.create();
ExecutionEngine.prototype = {
    initialize: function() {
        this.permissions   = new PermissionResolver();
        this.approvalRouter = new ApprovalRouter();
        this.audit         = new AuditService();
    },

    createExecution: function(automationSysId, inputValuesObject, groupSysId) {
        return this._startExecution(automationSysId, inputValuesObject, groupSysId, 'va', gs.getUserID());
    },

    runScheduled: function(automationSysId) {
        return this._startExecution(automationSysId, {}, null, 'scheduled', null);
    },

    _startExecution: function(automationSysId, inputValuesObject, groupSysId, channel, triggeringUserSysId) {
        if (!automationSysId) {
            gs.error('x_infte_ops_int ExecutionEngine._startExecution called without automation sys_id');
            return null;
        }
        var store = new OIDataStore();
        var auto = store.get('automations', '' + automationSysId);
        if (!auto) {
            gs.error('x_infte_ops_int ExecutionEngine could not load automation ' + automationSysId);
            return null;
        }
        var inputValues = (inputValuesObject === null || inputValuesObject === undefined) ? {} : inputValuesObject;
        var triggeredByPersonSysId = '';
        if (triggeringUserSysId) {
            var personSysId = this.permissions.getPersonByUser(triggeringUserSysId);
            triggeredByPersonSysId = personSysId ? ('' + personSysId) : '';
        }
        var resolvedGroupSysId = groupSysId ? ('' + groupSysId) : this._resolveExecutionGroup(automationSysId, triggeringUserSysId);
        var isTest = '' + (auto.status || '') === 'testing';

        var execSysId = store.generateId();
        var inputJson = '{}';
        try { inputJson = JSON.stringify(inputValues); } catch (e) {}
        var execRecord = {
            sys_id:             execSysId,
            automation:         '' + automationSysId,
            automation_version: '' + (auto.version || ''),
            triggered_by:       triggeredByPersonSysId,
            triggered_at:       new GlideDateTime().getValue(),
            channel:            channel,
            status:             'pending',
            is_test:            isTest,
            group:              resolvedGroupSysId ? ('' + resolvedGroupSysId) : '',
            input_values:       inputJson,
            step_log:           '[]'
        };
        store.upsert('executions', execRecord);
        this.run('' + execSysId);
        return '' + execSysId;
    },

    _resolveExecutionGroup: function(automationSysId, triggeringUserSysId) {
        var store = new OIDataStore();
        var allGroups = store.find('groups', function(g) {
            return g.status === 'active';
        });
        var i;
        for (i = 0; i < allGroups.length; i++) {
            var grp = allGroups[i];
            var automationsArr = grp.automations || [];
            var j;
            for (j = 0; j < automationsArr.length; j++) {
                if ('' + automationsArr[j].automation_sys_id === '' + automationSysId &&
                    '' + automationsArr[j].approval_status === 'approved') {
                    var grpSysId = '' + (grp.sys_id || '');
                    if (!triggeringUserSysId) {
                        return grpSysId;
                    }
                    if (this.permissions.isMemberOf(triggeringUserSysId, grpSysId)) {
                        return grpSysId;
                    }
                }
            }
        }
        return null;
    },

    run: function(executionSysId) {
        var store = new OIDataStore();
        var exec = store.get('executions', '' + executionSysId);
        if (!exec) {
            gs.error('x_infte_ops_int ExecutionEngine.run could not load execution ' + executionSysId);
            return false;
        }
        var automationSysId = '' + (exec.automation || '');
        var inputValues = this._parseJson('' + (exec.input_values || ''), {});
        var context = this.buildContext(exec, inputValues);
        var dryRun = this.isDryRun(exec);

        exec.status = 'running';
        store.upsert('executions', exec);

        var steps = this._loadSteps(automationSysId);
        if (steps.length === 0) {
            exec = store.get('executions', '' + executionSysId);
            exec.status = 'success';
            exec.completed_at = new GlideDateTime().getValue();
            store.upsert('executions', exec);
            return true;
        }

        var stepIndexByOrder = {};
        var i;
        for (i = 0; i < steps.length; i++) {
            stepIndexByOrder['' + steps[i].order] = i;
        }

        var finalStatus = 'success';
        var cursor = 0;
        var guard = 0;
        var maxIterations = steps.length * 4 + 16;

        while (cursor >= 0 && cursor < steps.length && guard < maxIterations) {
            guard++;
            var stepInfo   = steps[cursor];
            var stepObj    = stepInfo.step;
            var stepOrder  = stepInfo.order;
            var actionType = '' + stepObj.action_type;
            var onFailure  = '' + stepObj.on_failure;

            var logIndex = this._beginStepLog(executionSysId, stepObj, stepOrder, actionType);
            var result;
            try {
                if (dryRun && this._isWriteAction(actionType)) {
                    result = this._dryRunResult(actionType, stepObj, context);
                } else {
                    result = this.dispatchStep(stepObj, context);
                }
            } catch (stepError) {
                result = { status: 'failed', output: {}, error_message: '' + stepError };
            }

            this._completeStepLog(executionSysId, logIndex, result);

            if (result.status === 'success' || result.status === 'skipped') {
                context.steps['' + stepOrder] = { output: result.output || {} };
            }

            if (actionType === 'approval_gate' && result.status === 'awaiting_approval') {
                finalStatus = 'awaiting_approval';
                break;
            }

            if (actionType === 'conditional_branch') {
                var branchTrue  = '' + (stepObj.branch_true_step  || '');
                var branchFalse = '' + (stepObj.branch_false_step || '');
                var branchOrder = (result.output && result.output.branch_result === true) ? branchTrue : branchFalse;
                if (branchOrder && stepIndexByOrder.hasOwnProperty(branchOrder)) {
                    cursor = stepIndexByOrder[branchOrder];
                    continue;
                }
                cursor++;
                continue;
            }

            if (result.status === 'failed') {
                if (onFailure === 'continue' || onFailure === 'skip') {
                    cursor++;
                    continue;
                }
                finalStatus = 'failed';
                break;
            }

            cursor++;
        }

        if (guard >= maxIterations) {
            finalStatus = 'failed';
            this.audit.log('execution_guard_tripped', {
                execution_sys_id: executionSysId,
                automation_sys_id: automationSysId
            });
        }

        exec = store.get('executions', '' + executionSysId);
        exec.status = finalStatus;
        if (finalStatus !== 'awaiting_approval') {
            exec.completed_at = new GlideDateTime().getValue();
        }
        store.upsert('executions', exec);
        return finalStatus === 'success';
    },

    _loadSteps: function(automationSysId) {
        var store = new OIDataStore();
        var auto = store.get('automations', '' + automationSysId);
        if (!auto) {
            return [];
        }
        var raw = '' + (auto.step_definitions || '');
        var allSteps = this._parseJson(raw, []);
        var active = [];
        var i;
        for (i = 0; i < allSteps.length; i++) {
            if (allSteps[i].active !== false) {
                active.push({
                    step:  allSteps[i],
                    order: parseInt(allSteps[i].order, 10) || (i + 1)
                });
            }
        }
        active.sort(function(a, b) { return a.order - b.order; });
        return active;
    },

    dispatchStep: function(stepObj, context) {
        var actionType = '' + stepObj.action_type;
        var config = stepObj.configuration || {};

        switch (actionType) {
            case 'record_create':
                return this._doRecordCreate(config, context);
            case 'record_update':
                return this._doRecordUpdate(config, context);
            case 'record_query':
                return this._doRecordQuery(config, context);
            case 'send_notification':
                return this._doSendNotification(config, context);
            case 'approval_gate':
                return this._doApprovalGate(config, context);
            case 'conditional_branch':
                return this._doConditionalBranch(config, context);
            case 'flow_trigger':
                return this._doFlowTrigger(config, context);
            case 'rest_call':
                return this._doRestCall(config, context);
            default:
                return { status: 'failed', output: {}, error_message: 'Unknown action_type ' + actionType };
        }
    },

    _doRecordCreate: function(config, context) {
        var resolved = this.resolveTemplates(config, context);
        var table = '' + resolved.table;
        if (!table) {
            return { status: 'failed', output: {}, error_message: 'record_create missing table' };
        }
        var gr = new GlideRecord(table);
        gr.initialize();
        var fields = resolved.fields || {};
        var key;
        for (key in fields) {
            if (fields.hasOwnProperty(key)) {
                gr.setValue(key, fields[key]);
            }
        }
        var newSysId = gr.insert();
        if (!newSysId) {
            return { status: 'failed', output: {}, error_message: 'record_create insert returned null for ' + table };
        }
        var output = { sys_id: '' + newSysId };
        if (resolved.output_field) {
            output['' + resolved.output_field] = '' + newSysId;
        }
        return { status: 'success', output: output };
    },

    _doRecordUpdate: function(config, context) {
        var resolved = this.resolveTemplates(config, context);
        var table = '' + resolved.table;
        if (!table) {
            return { status: 'failed', output: {}, error_message: 'record_update missing table' };
        }
        var queryField = resolved.query_field ? ('' + resolved.query_field) : 'sys_id';
        var queryValue = '' + resolved.query_value;
        var gr = new GlideRecord(table);
        gr.addQuery(queryField, queryValue);
        gr.query();
        var updated = 0;
        var fields = resolved.fields || {};
        while (gr.next()) {
            var key;
            for (key in fields) {
                if (fields.hasOwnProperty(key)) {
                    gr.setValue(key, fields[key]);
                }
            }
            gr.update();
            updated++;
        }
        if (updated === 0) {
            return { status: 'failed', output: {}, error_message: 'record_update matched no records on ' + table };
        }
        return { status: 'success', output: { updated_count: updated } };
    },

    _doRecordQuery: function(config, context) {
        var resolved = this.resolveTemplates(config, context);
        var table = '' + resolved.table;
        if (!table) {
            return { status: 'failed', output: {}, error_message: 'record_query missing table' };
        }
        var gr = new GlideRecord(table);
        var conditions = resolved.conditions || [];
        var i;
        for (i = 0; i < conditions.length; i++) {
            var c = conditions[i];
            gr.addQuery('' + c.field, '' + c.operator, '' + c.value);
        }
        if (resolved.order_by) {
            if (('' + resolved.order_direction) === 'desc') {
                gr.orderByDesc('' + resolved.order_by);
            } else {
                gr.orderBy('' + resolved.order_by);
            }
        }
        var limit = parseInt(resolved.limit, 10);
        if (!isNaN(limit) && limit > 0) {
            gr.setLimit(limit);
        }
        gr.query();
        var rows = [];
        while (gr.next()) {
            rows.push(this._recordToObject(gr));
        }
        var output = { count: rows.length };
        var fieldName = resolved.output_field ? ('' + resolved.output_field) : 'records';
        output[fieldName] = rows;
        return { status: 'success', output: output };
    },

    _recordToObject: function(gr) {
        var obj = { sys_id: '' + gr.getUniqueValue() };
        var fields = gr.getFields();
        var i;
        for (i = 0; i < fields.size(); i++) {
            var element = fields.get(i);
            var name = '' + element.getName();
            obj[name] = '' + gr.getValue(name);
        }
        return obj;
    },

    _doSendNotification: function(config, context) {
        var resolved = this.resolveTemplates(config, context);
        var template = '' + resolved.template;
        if (!template) {
            return { status: 'failed', output: {}, error_message: 'send_notification missing template' };
        }
        var recipients = resolved.recipients || [];
        var bodyVars = resolved.body_vars || {};
        var notifier = new NotificationService();
        var sentCount = 0;
        var i;
        for (i = 0; i < recipients.length; i++) {
            var recipient = '' + recipients[i];
            var recipientUserSysId = this._resolveRecipientUserSysId(recipient);
            notifier.send(template, recipientUserSysId, bodyVars);
            sentCount++;
        }
        return { status: 'success', output: { sent_count: sentCount } };
    },

    _resolveRecipientUserSysId: function(recipient) {
        if (!recipient) { return ''; }
        if (('' + recipient).indexOf('@') > -1) {
            var u = new GlideRecord('sys_user');
            u.addQuery('email', '' + recipient);
            u.setLimit(1);
            u.query();
            if (u.next()) { return '' + u.getUniqueValue(); }
            return '';
        }
        return '' + recipient;
    },

    _doApprovalGate: function(config, context) {
        var resolved = this.resolveTemplates(config, context);
        var approverPersonSysId = resolved.approver_ref ? ('' + resolved.approver_ref) : '';
        var timeoutHours = parseInt(resolved.timeout_hours, 10);
        if (isNaN(timeoutHours) || timeoutHours <= 0) { timeoutHours = 72; }
        if (approverPersonSysId) {
            this.approvalRouter.createApproval(
                'automation_approval', context.user_sys_id,
                context.automation_sys_id, 'related_automation',
                context.group_sys_id, approverPersonSysId, timeoutHours
            );
        }
        return { status: 'awaiting_approval', output: { approver_person_sys_id: approverPersonSysId } };
    },

    _doConditionalBranch: function(config, context) {
        var resolved = this.resolveTemplates(config, context);
        var branchResult = this._evaluateCondition(resolved.left_operand, '' + resolved.operator, resolved.right_operand);
        return { status: 'success', output: { branch_result: branchResult } };
    },

    _evaluateCondition: function(left, operator, right) {
        var leftIsArray = (Object.prototype.toString.call(left) === '[object Array]');
        var leftStr  = (left  === null || left  === undefined) ? '' : ('' + left);
        var rightStr = (right === null || right === undefined) ? '' : ('' + right);
        var leftNum  = parseFloat(leftStr);
        var rightNum = parseFloat(rightStr);
        var numeric  = !isNaN(leftNum) && !isNaN(rightNum);
        switch (operator) {
            case '==':           return leftStr === rightStr;
            case '!=':           return leftStr !== rightStr;
            case '>':            return numeric && leftNum > rightNum;
            case '<':            return numeric && leftNum < rightNum;
            case '>=':           return numeric && leftNum >= rightNum;
            case '<=':           return numeric && leftNum <= rightNum;
            case 'contains':     return leftStr.indexOf(rightStr) > -1;
            case 'is_empty':     return leftIsArray ? (left.length === 0)  : (leftStr === '');
            case 'is_not_empty': return leftIsArray ? (left.length > 0)    : (leftStr !== '');
            default:             return false;
        }
    },

    _doFlowTrigger: function(config, context) {
        var resolved = this.resolveTemplates(config, context);
        var approvedFlowSysId = '' + resolved.approved_flow_sys_id;
        if (!approvedFlowSysId) {
            return { status: 'failed', output: {}, error_message: 'flow_trigger missing approved_flow_sys_id' };
        }
        var result = new FlowBridge().trigger(approvedFlowSysId, resolved.inputs || {});
        if (result && result.ok) {
            return { status: 'success', output: { context_id: result.context_id ? ('' + result.context_id) : '' } };
        }
        return { status: 'failed', output: {}, error_message: (result && result.error) ? ('' + result.error) : 'flow_trigger failed' };
    },

    _doRestCall: function(config, context) {
        var resolved = this.resolveTemplates(config, context);
        var result = new RestBridge().call(resolved);
        var output = {};
        var fieldName = resolved.output_field ? ('' + resolved.output_field) : 'response';
        output[fieldName] = result ? (result.body || '') : '';
        if (result) { output.status_code = result.status; }
        if (result && result.ok) { return { status: 'success', output: output }; }
        return { status: 'failed', output: output, error_message: (result && result.error) ? ('' + result.error) : 'rest_call failed' };
    },

    _dryRunResult: function(actionType, stepObj, context) {
        var config = stepObj.configuration || {};
        var resolved;
        try { resolved = this.resolveTemplates(config, context); } catch (e) {
            return { status: 'failed', output: {}, error_message: '' + e };
        }
        this.audit.log('execution_dry_run_step', {
            action_type: actionType,
            automation_sys_id: context.automation_sys_id,
            resolved_configuration: resolved
        });
        var output = { dry_run: true };
        if (resolved.output_field) { output['' + resolved.output_field] = 'DRY_RUN_PLACEHOLDER'; }
        return { status: 'success', output: output };
    },

    _isWriteAction: function(actionType) {
        return actionType === 'record_create'    ||
               actionType === 'record_update'    ||
               actionType === 'flow_trigger'     ||
               actionType === 'rest_call'        ||
               actionType === 'send_notification';
    },

    _beginStepLog: function(executionSysId, stepObj, stepOrder, actionType) {
        var store = new OIDataStore();
        var exec = store.get('executions', '' + executionSysId);
        if (!exec) { return -1; }
        var logs = this._parseJson('' + (exec.step_log || ''), []);
        var entry = {
            step_order:    stepOrder,
            step_name:     '' + (stepObj.name || ''),
            action_type:   actionType,
            status:        'running',
            started_at:    new GlideDateTime().getValue(),
            completed_at:  null,
            output:        {},
            error_message: null
        };
        logs.push(entry);
        var idx = logs.length - 1;
        exec.step_log = JSON.stringify(logs);
        store.upsert('executions', exec);
        return idx;
    },

    _completeStepLog: function(executionSysId, logIndex, result) {
        if (logIndex < 0) { return; }
        var store = new OIDataStore();
        var exec = store.get('executions', '' + executionSysId);
        if (!exec) { return; }
        var logs = this._parseJson('' + (exec.step_log || ''), []);
        if (logIndex < logs.length) {
            logs[logIndex].status        = result.status;
            logs[logIndex].completed_at  = new GlideDateTime().getValue();
            logs[logIndex].output        = result.output || {};
            logs[logIndex].error_message = result.error_message || null;
        }
        exec.step_log = JSON.stringify(logs);
        store.upsert('executions', exec);
    },

    resolveTemplates: function(value, context) {
        if (value === null || value === undefined) { return value; }
        var t = Object.prototype.toString.call(value);
        if (t === '[object String]') { return this._resolveString('' + value, context); }
        if (t === '[object Array]') {
            var arr = []; var i;
            for (i = 0; i < value.length; i++) { arr.push(this.resolveTemplates(value[i], context)); }
            return arr;
        }
        if (t === '[object Object]') {
            var obj = {}; var key;
            for (key in value) {
                if (value.hasOwnProperty(key)) { obj[key] = this.resolveTemplates(value[key], context); }
            }
            return obj;
        }
        return value;
    },

    _resolveString: function(str, context) {
        if (str.indexOf('{{') === -1) { return str; }
        var self = this;
        var wholeMatch = str.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
        if (wholeMatch) { return self._resolveToken(wholeMatch[1], context); }
        return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, function(match, token) {
            var resolved = self._resolveToken(token, context);
            if (resolved === null || resolved === undefined) {
                throw 'Unresolvable template token: {{' + token + '}}';
            }
            if (Object.prototype.toString.call(resolved) === '[object Object]' ||
                Object.prototype.toString.call(resolved) === '[object Array]') {
                return JSON.stringify(resolved);
            }
            return '' + resolved;
        });
    },

    _resolveToken: function(token, context) {
        var path = ('' + token).split('.');
        var head = path[0];
        var resolved;
        if (head === 'input')        { resolved = this._walkPath(context.input,  path.slice(1)); }
        else if (head === 'context') { resolved = this._walkPath(context,        path.slice(1)); }
        else if (head === 'steps')   { resolved = this._walkPath(context.steps,  path.slice(1)); }
        else                         { resolved = null; }
        if (resolved === null || resolved === undefined) {
            throw 'Unresolvable template token: {{' + token + '}}';
        }
        return resolved;
    },

    _walkPath: function(root, parts) {
        var current = root; var i;
        for (i = 0; i < parts.length; i++) {
            if (current === null || current === undefined) { return null; }
            var part = parts[i];
            var arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
            if (arrayMatch) {
                current = current[arrayMatch[1]];
                if (current === null || current === undefined) { return null; }
                current = current[parseInt(arrayMatch[2], 10)];
            } else {
                current = current[part];
            }
        }
        return current;
    },

    buildContext: function(execRecord, inputValues) {
        var automationSysId        = '' + (execRecord.automation   || '');
        var groupSysId             = '' + (execRecord.group        || '');
        var triggeredByPersonSysId = '' + (execRecord.triggered_by || '');
        var store = new OIDataStore();
        var userSysId = ''; var userEmail = ''; var userName = '';
        if (triggeredByPersonSysId) {
            var person = store.get('persons', triggeredByPersonSysId);
            if (person) { userSysId = '' + (person.user_sys_id || ''); }
        }
        if (userSysId) {
            var u = new GlideRecord('sys_user');
            if (u.get(userSysId)) {
                userEmail = '' + u.getValue('email');
                userName  = '' + u.getValue('name');
            }
        }
        var automationName = '';
        var auto = store.get('automations', automationSysId);
        if (auto) { automationName = '' + (auto.name || ''); }
        var primaryLeaderSysId = ''; var leaderOfLeaderSysId = '';
        if (triggeredByPersonSysId) {
            var leaderPerson = this.approvalRouter.getPrimaryLeader(triggeredByPersonSysId);
            if (leaderPerson) {
                primaryLeaderSysId = '' + leaderPerson;
                var leaderOfLeaderPerson = this.approvalRouter.getPrimaryLeader(leaderPerson);
                if (leaderOfLeaderPerson) { leaderOfLeaderSysId = '' + leaderOfLeaderPerson; }
            }
        }
        return {
            input:                   (inputValues === null || inputValues === undefined) ? {} : inputValues,
            user_sys_id:             userSysId,
            user_email:              userEmail,
            user_name:               userName,
            automation_sys_id:       automationSysId,
            automation_name:         automationName,
            group_sys_id:            groupSysId,
            primary_leader_sys_id:   primaryLeaderSysId,
            leader_of_leader_sys_id: leaderOfLeaderSysId,
            execution_sys_id:        '' + (execRecord.sys_id || ''),
            steps:                   {}
        };
    },

    isDryRun: function(execRecord) {
        var isTest = execRecord.is_test;
        if (isTest === true || isTest === 'true' || isTest === 1 || isTest === '1') { return true; }
        var store = new OIDataStore();
        var auto = store.get('automations', '' + (execRecord.automation || ''));
        if (auto) {
            return '' + (auto.status || '') === 'testing';
        }
        return false;
    },

    _parseJson: function(raw, fallback) {
        if (raw === null || raw === undefined || raw === '') { return fallback; }
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    },

    type: 'ExecutionEngine'
};
