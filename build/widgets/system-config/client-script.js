api.controller = function($scope, spUtil) {
    var c = this;

    c.form = _snapshot();

    c.dirty = false;

    c.markDirty = function() {
        c.dirty = true;
        c.data.saved = false;
    };

    c.toggleDebug = function() {
        c.form.debug_mode = !c.form.debug_mode;
        c.markDirty();
    };

    c.save = function() {
        c.data.action = 'save';
        c.data.properties = {
            copilot_timeout_ms: c.form.copilot_timeout_ms,
            max_flow_actions: c.form.max_flow_actions,
            copilot_api_endpoint: c.form.copilot_api_endpoint,
            debug_mode: c.form.debug_mode
        };
        c.server.update().then(function() {
            c.data.action = '';
            c.form = _snapshot();
            c.dirty = false;
            spUtil.update($scope);
        });
    };

    c.reset = function() {
        c.form = _snapshot();
        c.dirty = false;
        c.data.saved = false;
    };

    function _snapshot() {
        var p = c.data.properties || {};
        return {
            copilot_timeout_ms: p.copilot_timeout_ms,
            max_flow_actions: p.max_flow_actions,
            copilot_api_endpoint: p.copilot_api_endpoint,
            debug_mode: p.debug_mode === true
        };
    }
};
