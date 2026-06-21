api.controller = function($scope, spUtil) {
    var c = this;
    c.busy = false;

    c.requestDeactivate = function(flow, $event) {
        if ($event) {
            $event.preventDefault();
        }
        if (!flow.active || c.busy) {
            return;
        }
        if (!confirm('Deactivate the flow "' + flow.display_name + '"? It will stop firing immediately.')) {
            return;
        }
        c.busy = true;
        c.server.get({
            action: 'deactivate',
            artifact_sys_id: flow.sys_id
        }).then(function(response) {
            c.busy = false;
            var d = response.data;
            if (d && d.message) {
                spUtil.addInfoMessage(d.message);
            }
            if (d && d.error) {
                spUtil.addErrorMessage(d.error);
            }
        });
    };

    c.fmt = function(value) {
        if (!value) {
            return '';
        }
        return value;
    };
};
