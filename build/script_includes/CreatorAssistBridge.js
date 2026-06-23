var CreatorAssistBridge = Class.create();
CreatorAssistBridge.prototype = {
    initialize: function() {
        this.DEFAULT_TIMEOUT_MS = 15000;
        this.INTEGRATION_ID = 'servicenow-oi';
        this.EDITOR_VERSION = 'ServiceNow/Operations Intelligence-1.0';
        this.audit = new AuditService();
    },

    hasActiveToken: function(creatorPersonSysId) {
        if (!creatorPersonSysId) {
            return false;
        }
        var store = new OIDataStore();
        var person = store.get('persons', '' + creatorPersonSysId);
        if (!person) {
            return false;
        }
        return '' + (person.token_status || '') === 'active';
    },

    generatePhrases: function(structuredSpecJson, creatorPersonSysId) {
        var failure = { ok: false };
        if (!this.hasActiveToken(creatorPersonSysId)) {
            return failure;
        }
        var pat = this._readPat(creatorPersonSysId);
        if (!pat) {
            return failure;
        }
        var specString = this._asString(structuredSpecJson);
        var messages = [
            {
                role: 'system',
                content: 'You are an automation requirements analyst. Given a structured ' +
                    'specification, return ONLY valid JSON with three keys: ' +
                    "'additional_phrases' (array of NLU training utterances), " +
                    "'gap_analysis' (array of strings describing missing steps), " +
                    "'step_optimisations' (array of suggested improvements). " +
                    'No prose outside the JSON object.'
            },
            {
                role: 'user',
                content: 'Specification: ' + specString
            }
        ];
        var parsed = this._callAssist(messages, 1000, pat);
        pat = null;
        if (!parsed) {
            this.audit.log('assist_phrases_failed', { creator_person: '' + creatorPersonSysId });
            return failure;
        }
        return {
            ok: true,
            additional_phrases: this._asArray(parsed.additional_phrases),
            gap_analysis: this._asArray(parsed.gap_analysis),
            step_optimisations: this._asArray(parsed.step_optimisations)
        };
    },

    generateSpec: function(artifactType, plainEnglishRequirements, partialCreationSpecJson, creatorPersonSysId) {
        var failure = { ok: false };
        if (!this.hasActiveToken(creatorPersonSysId)) {
            return failure;
        }
        var pat = this._readPat(creatorPersonSysId);
        if (!pat) {
            return failure;
        }
        var partialString = this._asString(partialCreationSpecJson);
        var messages = [
            {
                role: 'system',
                content: 'You are a ServiceNow configuration specialist. Given a ' +
                    'plain-English requirement and a deliverable type, return ' +
                    'ONLY valid JSON with: ' +
                    "'spec' (the complete technical configuration object for this " +
                    "deliverable type), 'assumptions' (array of strings describing " +
                    "any assumptions made), 'questions' (array of clarifying questions " +
                    'if critical information is missing — empty array if none). ' +
                    'No prose outside the JSON object.'
            },
            {
                role: 'user',
                content: 'Deliverable type: ' + ('' + artifactType) + '\n' +
                    'Requirements: ' + ('' + plainEnglishRequirements) + '\n' +
                    'Already specified: ' + partialString
            }
        ];
        var parsed = this._callAssist(messages, 3000, pat);
        pat = null;
        if (!parsed) {
            this.audit.log('assist_spec_failed', {
                creator_person: '' + creatorPersonSysId,
                artifact_type: '' + artifactType
            });
            return failure;
        }
        return {
            ok: true,
            spec: (parsed.spec === null || parsed.spec === undefined) ? {} : parsed.spec,
            assumptions: this._asArray(parsed.assumptions),
            questions: this._asArray(parsed.questions)
        };
    },

    _readPat: function(creatorPersonSysId) {
        if (!creatorPersonSysId) {
            return null;
        }
        try {
            var store = new OIDataStore();
            var person = store.get('persons', '' + creatorPersonSysId);
            if (!person) {
                return null;
            }
            if ('' + (person.token_status || '') !== 'active') {
                return null;
            }
            var pat = '' + (person.github_pat || '');
            return pat ? pat : null;
        } catch (e) {
            gs.error('x_infte_ops_int CreatorAssistBridge._readPat failed: ' + e);
            return null;
        }
    },

    _callAssist: function(messages, maxTokens, pat) {
        if (!pat) {
            return null;
        }
        var timeoutMs = parseInt(gs.getProperty('x_infte_ops_int.assist_timeout_ms', '' + this.DEFAULT_TIMEOUT_MS), 10);
        if (isNaN(timeoutMs) || timeoutMs <= 0) {
            timeoutMs = this.DEFAULT_TIMEOUT_MS;
        }
        var base = '' + gs.getProperty('x_infte_ops_int.assist_api_endpoint', 'https://api.githubcopilot.com');
        if (!base) {
            base = 'https://api.githubcopilot.com';
        }
        base = base.replace(/\/+$/, '');
        var model = '' + gs.getProperty('x_infte_ops_int.assist_model', 'gpt-4o');
        if (!model) { model = 'gpt-4o'; }
        var temperature = (maxTokens >= 3000) ? 0.2 : 0.3;

        var body = {
            model: model,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        };

        try {
            var request = new sn_ws.RESTMessageV2();
            request.setHttpMethod('POST');
            request.setEndpoint(base + '/chat/completions');
            request.setRequestHeader('Authorization', 'Bearer ' + pat);
            request.setRequestHeader('Content-Type', 'application/json');
            request.setRequestHeader('Copilot-Integration-Id', this.INTEGRATION_ID);
            request.setRequestHeader('Editor-Version', this.EDITOR_VERSION);
            request.setRequestBody(JSON.stringify(body));
            request.setHttpTimeout(timeoutMs);

            var response = request.execute();
            var status = parseInt(response.getStatusCode(), 10);
            if (isNaN(status) || status < 200 || status >= 300) {
                return null;
            }
            var rawBody = '' + response.getBody();
            if (!rawBody) {
                return null;
            }
            var envelope = JSON.parse(rawBody);
            if (!envelope || !envelope.choices || !envelope.choices.length) {
                return null;
            }
            var first = envelope.choices[0];
            if (!first || !first.message) {
                return null;
            }
            var content = '' + first.message.content;
            if (!content) {
                return null;
            }
            return JSON.parse(content);
        } catch (e) {
            gs.error('x_infte_ops_int CreatorAssistBridge._callAssist failed: ' + e);
            return null;
        }
    },

    _asString: function(value) {
        if (value === null || value === undefined) {
            return '{}';
        }
        if (typeof value === 'string') {
            return value;
        }
        try {
            return JSON.stringify(value);
        } catch (e) {
            return '{}';
        }
    },

    _asArray: function(value) {
        if (value && value.length !== undefined && typeof value !== 'string') {
            return value;
        }
        return [];
    },

    type: 'CreatorAssistBridge'
};
