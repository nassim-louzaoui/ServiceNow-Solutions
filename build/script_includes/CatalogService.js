var CatalogService = Class.create();
CatalogService.prototype = {
    initialize: function() {
        this.SCOPE                = 'x_infte_ops_int';
        this.TOPIC_TABLE          = 'sys_cs_topic';
        this.NLU_INTENT_TABLE     = 'sys_nlu_intent';
        this.SVC_USER             = 'svc_operations_intelligence_api';
        this.SVC_PASSWORD_PROPERTY = 'x_infte_ops_int.svc_password';
        this.NLU_MODEL_PROPERTY   = 'x_infte_ops_int.nlu_model_sys_id';
        this.TOPIC_PREFIX         = '[Operations Intelligence] ';
        this.notifier             = new NotificationService();
        this.audit                = new AuditService();
        this._store               = new OIDataStore();
    },

    _scopeSysId: function() {
        var scope = new GlideRecord('sys_scope');
        scope.addQuery('scope', this.SCOPE);
        scope.setLimit(1);
        scope.query();
        if (scope.next()) { return '' + scope.getUniqueValue(); }
        return null;
    },

    createFromUseCaseRequest: function(useCaseRequestSysId) {
        if (!useCaseRequestSysId) { return null; }
        var ucr = this._store.get('use_case_requests', useCaseRequestSysId);
        if (!ucr) {
            gs.error('x_infte_ops_int CatalogService could not load use_case_request ' + useCaseRequestSysId);
            return null;
        }
        var spec = ucr.structured_spec;
        if (typeof spec === 'string') {
            try { spec = JSON.parse(spec); } catch(e) { spec = null; }
        }
        if (!spec) {
            gs.error('x_infte_ops_int CatalogService use_case_request ' + useCaseRequestSysId + ' has no valid structured_spec');
            return null;
        }

        var automationSysId = this._store.generateId();
        var auto = {
            sys_id:             automationSysId,
            base_automation:    automationSysId,
            name:               '' + (spec.name || ucr.title || ''),
            short_description:  '' + (spec.short_description || ''),
            description:        '' + (spec.description || ucr.description || ''),
            category_name:      '' + (spec.category_name || ''),
            category_color:     '' + (spec.category_color || ''),
            category_icon:      '' + (spec.category_icon || ''),
            trigger_phrases:    this._asArray(spec.trigger_phrases),
            step_definitions:   this._normaliseSteps(this._asArray(spec.steps)),
            input_definitions:  this._normaliseInputs(this._asArray(spec.inputs)),
            status:             'draft',
            version:            1,
            owner_group:        '' + (ucr.target_group || ''),
            created_by:         '' + (ucr.submitted_by || ''),
            estimated_time_saved: parseInt(spec.estimated_time_saved, 10) || 0,
            usage_count:        0,
            active:             true
        };
        this._applyScheduleFields(auto, spec.schedule);
        this._store.upsert('automations', auto);

        new GroupManager().addAutomation('' + ucr.target_group, automationSysId, '' + ucr.submitted_by);

        ucr.resulting_automation = automationSysId;
        ucr.status               = 'building';
        this._store.upsert('use_case_requests', ucr);

        this.audit.log('automation_created_from_use_case_request', {
            use_case_request_sys_id: '' + useCaseRequestSysId,
            automation_sys_id:       automationSysId
        });
        return automationSysId;
    },

    _asArray: function(val) {
        if (val && typeof val !== 'string' && val.length !== undefined) { return val; }
        return [];
    },

    _normaliseSteps: function(steps) {
        var result = [];
        var i;
        for (i = 0; i < steps.length; i++) {
            var s = steps[i];
            result.push({
                order:              (s.order !== undefined && s.order !== null) ? parseInt(s.order, 10) : (i + 1),
                name:               '' + (s.name || ('Step ' + (i + 1))),
                action_type:        '' + (s.action_type || ''),
                configuration:      (typeof s.configuration === 'string') ? ('' + s.configuration) : JSON.stringify(s.configuration || {}),
                branch_true_step:   (s.branch_true_step !== undefined && s.branch_true_step !== null) ? parseInt(s.branch_true_step, 10) : null,
                branch_false_step:  (s.branch_false_step !== undefined && s.branch_false_step !== null) ? parseInt(s.branch_false_step, 10) : null,
                on_failure:         '' + (s.on_failure || 'stop'),
                active:             true
            });
        }
        return result;
    },

    _normaliseInputs: function(inputs) {
        var result = [];
        var i;
        for (i = 0; i < inputs.length; i++) {
            var inp = inputs[i];
            result.push({
                order:            (inp.order !== undefined && inp.order !== null) ? parseInt(inp.order, 10) : (i + 1),
                label:            '' + (inp.label || ''),
                field_name:       '' + (inp.field_name || ''),
                input_type:       '' + (inp.input_type || 'text'),
                choices:          (typeof inp.choices === 'string') ? ('' + inp.choices) : JSON.stringify(inp.choices || []),
                required:         inp.required ? true : false,
                validation_regex: '' + (inp.validation_regex || '')
            });
        }
        return result;
    },

    _applyScheduleFields: function(auto, schedule) {
        if (!schedule || !schedule.schedule_type) { return; }
        auto.schedule_type   = '' + schedule.schedule_type;
        auto.cron_expression = '' + (schedule.cron_expression || '');
        auto.run_at          = '' + (schedule.run_at || '');
        auto.timezone        = '' + (schedule.timezone || '');
        auto.schedule_active = true;
    },

    onPublish: function(automationSysId) {
        if (!automationSysId) { return false; }
        var auto = this._store.get('automations', automationSysId);
        if (!auto) {
            gs.error('x_infte_ops_int CatalogService.onPublish could not load automation ' + automationSysId);
            return false;
        }

        this.createVersionSnapshot(automationSysId);
        this._createOrActivateTopic(auto);
        this._createNluIntent(auto);
        this.retrainNLU();

        var gm        = new GroupManager();
        var allGroups = this._store.find('groups', function(g) {
            return g.status === 'active';
        });
        var i;
        for (i = 0; i < allGroups.length; i++) {
            gm.approveAutomation('' + allGroups[i].sys_id, '' + automationSysId, null);
        }

        auto.usage_count = 0;
        this._store.upsert('automations', auto);

        this.notifier.notifyAutomationApproved(automationSysId);
        this.audit.log('automation_published', {
            automation_sys_id: '' + automationSysId,
            version:           '' + (auto.version || 1)
        });
        return true;
    },

    _topicName: function(auto) {
        return this.TOPIC_PREFIX + ('' + auto.name) + ' (v' + ('' + (auto.version || 1)) + ')';
    },

    _createOrActivateTopic: function(auto) {
        var scopeSysId = this._scopeSysId();
        var topicName  = this._topicName(auto);
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
            if (scopeSysId) { newTopic.setValue('sys_scope', scopeSysId); }
            newTopic.setValue('name', topicName);
            if (newTopic.isValidField('description')) {
                newTopic.setValue('description', '' + (auto.short_description || ''));
            }
            if (newTopic.isValidField('live_agent_enabled')) {
                newTopic.setValue('live_agent_enabled', false);
            }
            newTopic.setValue('active', true);
            var topicSysId = newTopic.insert();
            this.audit.log('va_topic_created', {
                automation_sys_id: '' + auto.sys_id,
                topic_sys_id:      topicSysId ? ('' + topicSysId) : '',
                topic_name:        topicName
            });
            return topicSysId ? ('' + topicSysId) : null;
        } catch(e) {
            this.audit.log('va_topic_create_error', { automation_sys_id: '' + auto.sys_id, error: '' + e });
            return null;
        }
    },

    _intentName: function(auto) {
        return this.TOPIC_PREFIX + ('' + auto.name);
    },

    _createNluIntent: function(auto) {
        var scopeSysId  = this._scopeSysId();
        var intentName  = this._intentName(auto);
        var phrases     = auto.trigger_phrases || [];
        if (typeof phrases === 'string') {
            try { phrases = JSON.parse(phrases); } catch(e) { phrases = []; }
        }
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
                if (scopeSysId) { newIntent.setValue('sys_scope', scopeSysId); }
                newIntent.setValue('name', intentName);
                var modelSysId = gs.getProperty(this.NLU_MODEL_PROPERTY, '');
                if (modelSysId && newIntent.isValidField('model')) {
                    newIntent.setValue('model', modelSysId);
                }
                newIntent.setValue('active', true);
                intentSysId = '' + newIntent.insert();
            }
            this.audit.log('nlu_intent_created', {
                automation_sys_id: '' + auto.sys_id,
                intent_sys_id:     intentSysId,
                phrase_count:      phrases.length
            });
            return intentSysId;
        } catch(e) {
            this.audit.log('nlu_intent_create_error', { automation_sys_id: '' + auto.sys_id, error: '' + e });
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
            var request  = new sn_ws.RESTMessageV2();
            request.setHttpMethod('POST');
            request.setEndpoint(endpoint);
            request.setBasicAuth(this.SVC_USER, password);
            request.setRequestHeader('Content-Type', 'application/json');
            request.setRequestHeader('Accept', 'application/json');
            request.setRequestBody('{}');
            request.setHttpTimeout(30000);
            var response        = request.execute();
            var status          = parseInt(response.getStatusCode(), 10);
            var body            = '' + response.getBody();
            var trainingJobSysId = '';
            try {
                var parsed = JSON.parse(body);
                if (parsed && parsed.result) {
                    trainingJobSysId = '' + (parsed.result.training_job_sys_id || parsed.result.sys_id || '');
                }
            } catch(parseError) { trainingJobSysId = ''; }
            var ok = status >= 200 && status < 300;
            this.audit.log('nlu_retrain_triggered', {
                model_sys_id:        modelSysId,
                status:              status,
                training_job_sys_id: trainingJobSysId,
                ok:                  ok
            });
            return ok;
        } catch(e) {
            this.audit.log('nlu_retrain_error', { model_sys_id: modelSysId, error: '' + e });
            return false;
        }
    },

    onDeprecate: function(automationSysId) {
        if (!automationSysId) { return false; }
        var auto = this._store.get('automations', automationSysId);
        if (!auto) { return false; }

        this._deactivateTopic(auto);
        this._deactivateNluIntent(auto);
        this.retrainNLU();
        new ScheduleManager().deactivateSchedule(automationSysId);

        this.audit.log('automation_deprecated', { automation_sys_id: '' + automationSysId });
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
        } catch(e) {
            this.audit.log('va_topic_deactivate_error', { automation_sys_id: '' + auto.sys_id, error: '' + e });
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
        } catch(e) {
            this.audit.log('nlu_intent_deactivate_error', { automation_sys_id: '' + auto.sys_id, error: '' + e });
        }
    },

    createVersionSnapshot: function(automationSysId) {
        var auto = this._store.get('automations', automationSysId);
        if (!auto) { return null; }

        var versionSysId = this._store.generateId();
        var snapshot = {
            sys_id:                   versionSysId,
            automation:               automationSysId,
            version_number:           parseInt(auto.version, 10) || 1,
            snapshot_steps:           auto.step_definitions || [],
            snapshot_inputs:          auto.input_definitions || [],
            snapshot_trigger_phrases: auto.trigger_phrases || [],
            published_at:             new GlideDateTime().getValue(),
            published_by:             '' + (auto.created_by || '')
        };
        this._store.upsert('automation_versions', snapshot);

        this.audit.log('automation_version_snapshot_created', {
            automation_sys_id:         automationSysId,
            automation_version_sys_id: versionSysId,
            version_number:            '' + (auto.version || 1)
        });
        return versionSysId;
    },

    type: 'CatalogService'
};
