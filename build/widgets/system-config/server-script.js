(function() {
    data.authorized = false;
    data.saved = false;
    data.properties = {};

    var userSysId = gs.getUserID();
    var pr = new PermissionResolver();
    data.role = pr.getSystemRole(userSysId);

    if (!pr.hasRole(userSysId, 'admin')) {
        data.message = 'The System Config Panel is available to administrators only.';
        return;
    }
    data.authorized = true;

    var PROP_TIMEOUT = 'x_infte_ops_int.copilot_timeout_ms';
    var PROP_MAX_ACTIONS = 'x_infte_ops_int.max_flow_actions';
    var PROP_ENDPOINT = 'x_infte_ops_int.copilot_api_endpoint';
    var PROP_DEBUG = 'x_infte_ops_int.debug_mode';

    if (input && input.action === 'save') {
        var incoming = input.properties || {};

        var timeoutVal = _sanitizeInt(incoming.copilot_timeout_ms, 15000);
        var maxActionsVal = _sanitizeInt(incoming.max_flow_actions, 20);
        var endpointVal = incoming.copilot_api_endpoint ?
            ('' + incoming.copilot_api_endpoint).trim() : 'https://api.githubcopilot.com';
        var debugVal = (incoming.debug_mode === true || incoming.debug_mode === 'true') ?
            'true' : 'false';

        gs.setProperty(PROP_TIMEOUT, '' + timeoutVal);
        gs.setProperty(PROP_MAX_ACTIONS, '' + maxActionsVal);
        gs.setProperty(PROP_ENDPOINT, endpointVal);
        gs.setProperty(PROP_DEBUG, debugVal);

        var audit = new AuditService();
        audit.logAdminAction(
            'system_config_update',
            'sys_properties',
            '',
            userSysId,
            'copilot_timeout_ms=' + timeoutVal +
            '; max_flow_actions=' + maxActionsVal +
            '; copilot_api_endpoint=' + endpointVal +
            '; debug_mode=' + debugVal
        );

        data.saved = true;
    }

    data.properties = {
        copilot_timeout_ms: parseInt(gs.getProperty(PROP_TIMEOUT, '15000'), 10) || 15000,
        max_flow_actions: parseInt(gs.getProperty(PROP_MAX_ACTIONS, '20'), 10) || 20,
        copilot_api_endpoint: '' + gs.getProperty(PROP_ENDPOINT, 'https://api.githubcopilot.com'),
        debug_mode: gs.getProperty(PROP_DEBUG, 'false') === 'true'
    };

    function _sanitizeInt(value, fallback) {
        var n = parseInt(value, 10);
        if (isNaN(n) || n < 0) {
            return fallback;
        }
        return n;
    }
})();
