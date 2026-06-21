api.controller = function($scope, spUtil) {
    var c = this;

    c.metric = 'executions';

    c.setMetric = function(metricKey) {
        c.metric = metricKey;
    };

    c.isMetric = function(metricKey) {
        return c.metric === metricKey;
    };

    c.barPct = function(group) {
        if (c.metric === 'time_saved') {
            return group.time_pct;
        }
        if (c.metric === 'deliverables') {
            return group.deliv_pct;
        }
        return group.exec_pct;
    };

    c.barValue = function(group) {
        if (c.metric === 'time_saved') {
            return group.time_saved_hours + ' h';
        }
        if (c.metric === 'deliverables') {
            return group.deliverables;
        }
        return group.executions;
    };

    c.refresh = function() {
        c.server.update().then(function() {
            spUtil.update($scope);
        });
    };
};
