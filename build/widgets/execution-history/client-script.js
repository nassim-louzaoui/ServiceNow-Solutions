api.controller = function($scope, spUtil) {
    var c = this;

    c.expanded = {};
    c.loading = {};
    c.stepLogs = {};

    c.toggle = function(ex) {
        var id = ex.sys_id;
        if (c.expanded[id]) {
            c.expanded[id] = false;
            return;
        }
        c.expanded[id] = true;
        if (c.stepLogs[id]) {
            return;
        }
        c.loading[id] = true;
        c.server.get({
            action: 'step_log',
            execution_sys_id: id
        }).then(function(response) {
            c.loading[id] = false;
            c.stepLogs[id] = response.data.step_log || { authorized: false, steps: [] };
        }, function() {
            c.loading[id] = false;
            c.stepLogs[id] = { authorized: false, steps: [] };
        });
    };
};
