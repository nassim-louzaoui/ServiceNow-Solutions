var FlowBridge = Class.create();
FlowBridge.prototype = {
    initialize: function() {
        this.SCOPE = 'x_infte_ops_int';
        this.FLOW_TABLE = 'sys_hub_flow';
        this.SVC_USER = 'svc_operations_intelligence_api';
        this.SVC_PASSWORD_PROPERTY = 'x_infte_ops_int.svc_password';
        this.audit = new AuditService();
    },

    resolveFlow: function(approvedFlowSysId) {
        if (!approvedFlowSysId) {
            return null;
        }
        var store = new OIDataStore();
        var approved = store.get('approved_flows', '' + approvedFlowSysId);
        if (!approved) {
            return null;
        }
        var active = approved.active;
        if (!(active === true || active === 'true' || active === 1 || active === '1')) {
            return null;
        }
        return {
            flow_sys_id:  '' + (approved.flow_sys_id  || ''),
            display_name: '' + (approved.display_name || '')
        };
    },

    trigger: function(approvedFlowSysId, inputsObject) {
        var resolved = this.resolveFlow(approvedFlowSysId);
        if (!resolved || !resolved.flow_sys_id) {
            return { ok: false, error: 'Could not resolve an active approved flow for ' + approvedFlowSysId };
        }
        var inputs = (inputsObject === null || inputsObject === undefined) ? {} : inputsObject;

        var apiResult = this._triggerViaFlowAPI(resolved.flow_sys_id, inputs);
        if (apiResult !== null) {
            return apiResult;
        }
        return this._triggerViaRest(resolved.flow_sys_id, inputs);
    },

    _triggerViaFlowAPI: function(flowSysId, inputs) {
        try {
            if (typeof sn_fd === 'undefined' || !sn_fd.FlowAPI) {
                return null;
            }
            var contextId = '';
            var startResult = sn_fd.FlowAPI.getRunner()
                .flow(flowSysId)
                .inForeground()
                .withInputs(inputs)
                .run();
            if (startResult && startResult.getContextId) {
                contextId = '' + startResult.getContextId();
            }
            this.audit.log('flow_triggered', {
                flow_sys_id: flowSysId,
                method: 'FlowAPI',
                context_id: contextId
            });
            return { ok: true, context_id: contextId };
        } catch (e) {
            this.audit.log('flow_trigger_flowapi_error', {
                flow_sys_id: flowSysId,
                error: '' + e
            });
            return null;
        }
    },

    _triggerViaRest: function(flowSysId, inputs) {
        try {
            var password = gs.getProperty(this.SVC_PASSWORD_PROPERTY, '');
            if (!password) {
                return { ok: false, error: 'Service account password property not set' };
            }
            var endpoint = gs.getProperty('glide.servlet.uri', '') + 'api/sn_fd/flow/' + flowSysId;
            var request = new sn_ws.RESTMessageV2();
            request.setHttpMethod('POST');
            request.setEndpoint(endpoint);
            request.setBasicAuth(this.SVC_USER, password);
            request.setRequestHeader('Content-Type', 'application/json');
            request.setRequestHeader('Accept', 'application/json');
            request.setRequestBody(JSON.stringify({ inputs: inputs }));
            request.setHttpTimeout(30000);

            var response = request.execute();
            var status = parseInt(response.getStatusCode(), 10);
            var body = '' + response.getBody();
            if (status >= 200 && status < 300) {
                var contextId = '';
                try {
                    var parsed = JSON.parse(body);
                    if (parsed && parsed.result && parsed.result.context_id) {
                        contextId = '' + parsed.result.context_id;
                    }
                } catch (parseError) {
                    contextId = '';
                }
                this.audit.log('flow_triggered', {
                    flow_sys_id: flowSysId,
                    method: 'REST',
                    context_id: contextId,
                    status: status
                });
                return { ok: true, context_id: contextId };
            }
            this.audit.log('flow_trigger_rest_error', {
                flow_sys_id: flowSysId,
                status: status
            });
            return { ok: false, error: 'Flow REST trigger returned HTTP ' + status };
        } catch (e) {
            this.audit.log('flow_trigger_rest_exception', {
                flow_sys_id: flowSysId,
                error: '' + e
            });
            return { ok: false, error: '' + e };
        }
    },

    type: 'FlowBridge'
};
