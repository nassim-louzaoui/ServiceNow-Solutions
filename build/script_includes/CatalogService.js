var CatalogService = Class.create();
CatalogService.prototype = {
    initialize: function() {
        this.SCOPE = 'x_infte_ops_int';
        this.AUTOMATION_TABLE = 'x_infte_ops_int_automation';
        this.AUTOMATION_STEP_TABLE = 'x_infte_ops_int_automation_step';
        this.AUTOMATION_INPUT_TABLE = 'x_infte_ops_int_automation_input';
        this.AUTOMATION_VERSION_TABLE = 'x_infte_ops_int_automation_version';
        this.AUTOMATION_SCHEDULE_TABLE = 'x_infte_ops_int_automation_schedule';
        this.GROUP_AUTOMATION_TABLE = 'x_infte_ops_int_group_automation';
        this.USE_CASE_REQUEST_TABLE = 'x_infte_ops_int_use_case_request';
        this.PERSON_TABLE = 'x_infte_ops_int_person';
        this.TOPIC_TABLE = 'sys_cs_topic';
        this.NLU_INTENT_TABLE = 'sys_nlu_intent';
        this.SYS_SCOPE_TABLE = 'sys_scope';

        this.SVC_USER = 'svc_operations_intelligence_api';
        this.SVC_PASSWORD_PROPERTY = 'x_infte_ops_int.svc_password';
        this.NLU_MODEL_PROPERTY = 'x_infte_ops_int.nlu_model_sys_id';

        this.TOPIC_PREFIX = '[Operations Intelligence] ';
        this.notifier = new NotificationService();
        this.audit = new AuditService();
    },

    _scopeSysId: function() {
        var scope = new GlideRecord(this.SYS_SCOPE_TABLE);
        scope.addQuery('scope', this.SCOPE);
        scope.setLimit(1);
        scope.query();
        if (scope.next()) {
            return '' + scope.getUniqueValue();
        }
        return null;
    },

    _parseJson: function(raw, fallback) {
        if (raw === null || raw === undefined || raw === '') {
            return fallback;
        }
        try {
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    },

    createFromUseCaseRequest: function(useCaseRequestSysId) {
        if (!useCaseRequestSysId) {
            return null;
        }
        var ucr = new GlideRecord(this.USE_CASE_REQUEST_TABLE);
        if (!ucr.get(useCaseRequestSysId)) {
            gs.error('x_infte_ops_int CatalogService could not load use_case_request ' + useCaseRequestSysId);
            return null;
        }
        var spec = this._parseJson('' + ucr.getValue('structured_spec'), null);
        if (!spec) {
            gs.error('x_infte_ops_int CatalogService use_case_request ' + useCaseRequestSysId + ' has no valid structured_spec');
            return null;
        }

        var scopeSysId = this._scopeSysId();
        var ownerGroupSysId = '' + ucr.getValue('target_group');
        var createdByPersonSysId = '' + ucr.getValue('submitted_by');

        var auto = new GlideRecord(this.AUTOMATION_TABLE);
        auto.initialize();
        if (scopeSysId) {
            auto.setValue('sys_scope', scopeSysId);
        }
        auto.setValue('name', '' + (spec.name || ucr.getValue('title')));
        auto.setValue('short_description', '' + (spec.short_description || ''));
        auto.setValue('description', '' + (spec.description || ucr.getValue('description')));
        if (spec.category) {
            auto.setValue('category', '' + spec.category);
        }
        auto.setValue('trigger_phrases', JSON.stringify(spec.trigger_phrases || []));
        auto.setValue('status', 'draft');
        auto.setValue('version', 1);
        auto.setValue('owner_group', ownerGroupSysId);
        if (createdByPersonSysId) {
            auto.setValue('created_by', createdByPersonSysId);
        }
        if (spec.estimated_time_saved !== undefined && spec.estimated_time_saved !== null) {
            auto.setValue('estimated_time_saved', parseInt(spec.estimated_time_saved, 10) || 0);
        }
        auto.setValue('usage_count', 0);
        auto.setValue('active', true);
        var automationSysId = auto.insert();
        if (!automationSysId) {
            gs.error('x_infte_ops_int CatalogService failed to insert automation');
            return null;
        }

        auto.setValue('base_automation', '' + automationSysId);
        auto.update();

        this._createSteps(automationSysId, spec.steps || [], scopeSysId);
        this._createInputs(automationSysId, spec.inputs || [], scopeSysId);
        this._createSchedule(automationSysId, spec.schedule, scopeSysId);

        var ga = new GlideRecord(this.GROUP_AUTOMATION_TABLE);
        ga.initialize();
        if (scopeSysId) {
            ga.setValue('sys_scope', scopeSysId);
        }
        ga.setValue('group', ownerGroupSysId);
        ga.setValue('automation', '' + automationSysId);
        if (createdByPersonSysId) {
            ga.setValue('added_by', createdByPersonSysId);
        }
        ga.setValue('added_at', new GlideDateTime().getValue());
        ga.setValue('approval_status', 'pending');
        ga.insert();

        ucr.setValue('resulting_automation', '' + automationSysId);
        ucr.setValue('status', 'building');
        ucr.update();

        this.audit.log('automation_created_from_use_case_request', {
            use_case_request_sys_id: '' + useCaseRequestSysId,
            automation_sys_id: '' + automationSysId
        });
        return '' + automationSysId;
    },

    _createSteps: function(automationSysId, steps, scopeSysId) {
        var i;
        for (i = 0; i < steps.length; i++) {
            var s = steps[i];
            var step = new GlideRecord(this.AUTOMATION_STEP_TABLE);
            step.initialize();
            if (scopeSysId) {
                step.setValue('sys_scope', scopeSysId);
            }
            step.setValue('automation', '' + automationSysId);
            step.setValue('order', (s.order !== undefined && s.order !== null) ? parseInt(s.order, 10) : (i + 1));
            step.setValue('name', '' + (s.name || ('Step ' + (i + 1))));
            step.setValue('action_type', '' + s.action_type);
            step.setValue('configuration', (typeof s.configuration === 'string') ?
                ('' + s.configuration) : JSON.stringify(s.configuration || {}));
            if (s.branch_true_step !== undefined && s.branch_true_step !== null) {
                step.setValue('branch_true_step', parseInt(s.branch_true_step, 10));
            }
            if (s.branch_false_step !== undefined && s.branch_false_step !== null) {
                step.setValue('branch_false_step', parseInt(s.branch_false_step, 10));
            }
            step.setValue('on_failure', '' + (s.on_failure || 'stop'));
            step.setValue('active', true);
            step.insert();
        }
    },

    _createInputs: function(automationSysId, inputs, scopeSysId) {
        var i;
        for (i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            var input = new GlideRecord(this.AUTOMATION_INPUT_TABLE);
            input.initialize();
            if (scopeSysId) {
                input.setValue('sys_scope', scopeSysId);
            }
            input.setValue('automation', '' + automationSysId);
            input.setValue('order', (inp.order !== undefined && inp.order !== null) ? parseInt(inp.order, 10) : (i + 1));
            input.setValue('label', '' + (inp.label || ''));
            input.setValue('field_name', '' + (inp.field_name || ''));
            input.setValue('input_type', '' + (inp.input_type || 'text'));
            if (inp.choices !== undefined && inp.choices !== null) {
                input.setValue('choices', (typeof inp.choices === 'string') ?
                    ('' + inp.choices) : JSON.stringify(inp.choices));
            }
            input.setValue('required', inp.required ? true : false);
            if (inp.validation_regex) {
                input.setValue('validation_regex', '' + inp.validation_regex);
            }
            input.insert();
        }
    },

    _createSchedule: function(automationSysId, schedule, scopeSysId) {
        if (!schedule || !schedule.schedule_type) {
            return;
        }
        var sched = new GlideRecord(this.AUTOMATION_SCHEDULE_TABLE);
        sched.initialize();
        if (scopeSysId) {
            sched.setValue('sys_scope', scopeSysId);
        }
        sched.setValue('automation', '' + automationSysId);
        sched.setValue('schedule_type', '' + schedule.schedule_type);
        if (schedule.cron_expression) {
            sched.setValue('cron_expression', '' + schedule.cron_expression);
        }
        if (schedule.run_at) {
            sched.setValue('run_at', '' + schedule.run_at);
        }
        if (schedule.timezone) {
            sched.setValue('timezone', '' + schedule.timezone);
        }
        sched.setValue('active', true);
        sched.setValue('created_at', new GlideDateTime().getValue());
        sched.insert();
    },

    onPublish: function(automationSysId) {
        if (!automationSysId) {
            return false;
        }
        var auto = new GlideRecord(this.AUTOMATION_TABLE);
        if (!auto.get(automationSysId)) {
            gs.error('x_infte_ops_int CatalogService.onPublish could not load automation ' + automationSysId);
            return false;
        }

        this.createVersionSnapshot(automationSysId);
        this._createOrActivateTopic(auto);
        this._createNluIntent(auto);
        this.retrainNLU();

        var ga = new GlideRecord(this.GROUP_AUTOMATION_TABLE);
        ga.addQuery('automation', automationSysId);
        ga.query();
        while (ga.next()) {
            ga.setValue('approval_status', 'approved');
            ga.update();
        }

        auto.setValue('usage_count', 0);
        auto.update();

        this.notifier.notifyAutomationApproved(automationSysId);

        this.audit.log('automation_published', {
            automation_sys_id: '' + automationSysId,
            version: '' + auto.getValue('version')
        });
        return true;
    },

    _topicName: function(auto) {
        return this.TOPIC_PREFIX + ('' + auto.getValue('name')) + ' (v' + ('' + auto.getValue('version')) + ')';
    },

    _createOrActivateTopic: function(auto) {
        var scopeSysId = this._scopeSysId();
        var topicName = this._topicName(auto);
        try {
            var topic = new GlideRecord(this.TOPIC_TABLE);
            topic.addQuery('name', topicName);
            topic.setLimit(1);
            topic.query();
            if (topic.next()) {
                topic.setValue('active', true);
                topic.update();
                return '' + topic.getUniqueValue();
            }
            var newTopic = new GlideRecord(this.TOPIC_TABLE);
            newTopic.initialize();
            if (scopeSysId) {
                newTopic.setValue('sys_scope', scopeSysId);
            }
            newTopic.setValue('name', topicName);
            if (newTopic.isValidField('description')) {
                newTopic.setValue('description', '' + auto.getValue('short_description'));
            }
            if (newTopic.isValidField('live_agent_enabled')) {
                newTopic.setValue('live_agent_enabled', false);
            }
            newTopic.setValue('active', true);
            var topicSysId = newTopic.insert();
            this.audit.log('va_topic_created', {
                automation_sys_id: '' + auto.getUniqueValue(),
                topic_sys_id: topicSysId ? ('' + topicSysId) : '',
                topic_name: topicName
            });
            return topicSysId ? ('' + topicSysId) : null;
        } catch (e) {
            this.audit.log('va_topic_create_error', {
                automation_sys_id: '' + auto.getUniqueValue(),
                error: '' + e
            });
            return null;
        }
    },

    _intentName: function(auto) {
        return this.TOPIC_PREFIX + ('' + auto.getValue('name'));
    },

    _createNluIntent: function(auto) {
        var scopeSysId = this._scopeSysId();
        var intentName = this._intentName(auto);
        var phrases = this._parseJson('' + auto.getValue('trigger_phrases'), []);
        try {
            var intent = new GlideRecord(this.NLU_INTENT_TABLE);
            intent.addQuery('name', intentName);
            intent.setLimit(1);
            intent.query();
            var intentSysId;
            if (intent.next()) {
                intent.setValue('active', true);
                intent.update();
                intentSysId = '' + intent.getUniqueValue();
            } else {
                var newIntent = new GlideRecord(this.NLU_INTENT_TABLE);
                newIntent.initialize();
                if (scopeSysId) {
                    newIntent.setValue('sys_scope', scopeSysId);
                }
                newIntent.setValue('name', intentName);
                var modelSysId = gs.getProperty(this.NLU_MODEL_PROPERTY, '');
                if (modelSysId && newIntent.isValidField('model')) {
                    newIntent.setValue('model', modelSysId);
                }
                newIntent.setValue('active', true);
                intentSysId = '' + newIntent.insert();
            }
            this.audit.log('nlu_intent_created', {
                automation_sys_id: '' + auto.getUniqueValue(),
                intent_sys_id: intentSysId,
                phrase_count: phrases.length
            });
            return intentSysId;
        } catch (e) {
            this.audit.log('nlu_intent_create_error', {
                automation_sys_id: '' + auto.getUniqueValue(),
                error: '' + e
            });
            return null;
        }
    },

    retrainNLU: function() {
        var modelSysId = gs.getProperty(this.NLU_MODEL_PROPERTY, '');
        if (!modelSysId) {
            this.audit.log('nlu_retrain_skipped', { reason: 'nlu_model_sys_id property not set' });
            return false;
        }
        try {
            var password = gs.getProperty(this.SVC_PASSWORD_PROPERTY, '');
            if (!password) {
                this.audit.log('nlu_retrain_skipped', { reason: 'service account password not set' });
                return false;
            }
            var endpoint = gs.getProperty('glide.servlet.uri', '') + 'api/sn_nlu/v1/model/' + modelSysId + '/train';
            var request = new sn_ws.RESTMessageV2();
            request.setHttpMethod('POST');
            request.setEndpoint(endpoint);
            request.setBasicAuth(this.SVC_USER, password);
            request.setRequestHeader('Content-Type', 'application/json');
            request.setRequestHeader('Accept', 'application/json');
            request.setRequestBody('{}');
            request.setHttpTimeout(30000);

            var response = request.execute();
            var status = parseInt(response.getStatusCode(), 10);
            var body = '' + response.getBody();
            var trainingJobSysId = '';
            try {
                var parsed = JSON.parse(body);
                if (parsed && parsed.result) {
                    trainingJobSysId = '' + (parsed.result.training_job_sys_id || parsed.result.sys_id || '');
                }
            } catch (parseError) {
                trainingJobSysId = '';
            }
            var ok = status >= 200 && status < 300;
            this.audit.log('nlu_retrain_triggered', {
                model_sys_id: modelSysId,
                status: status,
                training_job_sys_id: trainingJobSysId,
                ok: ok
            });
            return ok;
        } catch (e) {
            this.audit.log('nlu_retrain_error', {
                model_sys_id: modelSysId,
                error: '' + e
            });
            return false;
        }
    },

    onDeprecate: function(automationSysId) {
        if (!automationSysId) {
            return false;
        }
        var auto = new GlideRecord(this.AUTOMATION_TABLE);
        if (!auto.get(automationSysId)) {
            return false;
        }

        this._deactivateTopic(auto);
        this._deactivateNluIntent(auto);
        this.retrainNLU();
        new ScheduleManager().deactivateSchedule(automationSysId);

        this.audit.log('automation_deprecated', {
            automation_sys_id: '' + automationSysId
        });
        return true;
    },

    _deactivateTopic: function(auto) {
        try {
            var topic = new GlideRecord(this.TOPIC_TABLE);
            topic.addQuery('name', this._topicName(auto));
            topic.query();
            while (topic.next()) {
                topic.setValue('active', false);
                topic.update();
            }
        } catch (e) {
            this.audit.log('va_topic_deactivate_error', {
                automation_sys_id: '' + auto.getUniqueValue(),
                error: '' + e
            });
        }
    },

    _deactivateNluIntent: function(auto) {
        try {
            var intent = new GlideRecord(this.NLU_INTENT_TABLE);
            intent.addQuery('name', this._intentName(auto));
            intent.query();
            while (intent.next()) {
                intent.setValue('active', false);
                intent.update();
            }
        } catch (e) {
            this.audit.log('nlu_intent_deactivate_error', {
                automation_sys_id: '' + auto.getUniqueValue(),
                error: '' + e
            });
        }
    },

    createVersionSnapshot: function(automationSysId) {
        var auto = new GlideRecord(this.AUTOMATION_TABLE);
        if (!auto.get(automationSysId)) {
            return null;
        }
        var scopeSysId = this._scopeSysId();

        var stepsSnapshot = [];
        var step = new GlideRecord(this.AUTOMATION_STEP_TABLE);
        step.addQuery('automation', automationSysId);
        step.orderBy('order');
        step.query();
        while (step.next()) {
            stepsSnapshot.push({
                order: parseInt(step.getValue('order'), 10),
                name: '' + step.getValue('name'),
                action_type: '' + step.getValue('action_type'),
                configuration: '' + step.getValue('configuration'),
                branch_true_step: '' + step.getValue('branch_true_step'),
                branch_false_step: '' + step.getValue('branch_false_step'),
                on_failure: '' + step.getValue('on_failure'),
                active: '' + step.getValue('active')
            });
        }

        var inputsSnapshot = [];
        var input = new GlideRecord(this.AUTOMATION_INPUT_TABLE);
        input.addQuery('automation', automationSysId);
        input.orderBy('order');
        input.query();
        while (input.next()) {
            inputsSnapshot.push({
                order: parseInt(input.getValue('order'), 10),
                label: '' + input.getValue('label'),
                field_name: '' + input.getValue('field_name'),
                input_type: '' + input.getValue('input_type'),
                choices: '' + input.getValue('choices'),
                required: '' + input.getValue('required')
            });
        }

        var triggerPhrases = this._parseJson('' + auto.getValue('trigger_phrases'), []);

        var version = new GlideRecord(this.AUTOMATION_VERSION_TABLE);
        version.initialize();
        if (scopeSysId) {
            version.setValue('sys_scope', scopeSysId);
        }
        version.setValue('automation', '' + automationSysId);
        version.setValue('version_number', parseInt(auto.getValue('version'), 10) || 1);
        version.setValue('snapshot_steps', JSON.stringify(stepsSnapshot));
        version.setValue('snapshot_inputs', JSON.stringify(inputsSnapshot));
        version.setValue('snapshot_trigger_phrases', JSON.stringify(triggerPhrases));
        version.setValue('published_at', new GlideDateTime().getValue());
        version.setValue('published_by', '' + auto.getValue('created_by'));
        var versionSysId = version.insert();

        this.audit.log('automation_version_snapshot_created', {
            automation_sys_id: '' + automationSysId,
            automation_version_sys_id: versionSysId ? ('' + versionSysId) : '',
            version_number: '' + auto.getValue('version')
        });
        return versionSysId ? ('' + versionSysId) : null;
    },

    type: 'CatalogService'
};
