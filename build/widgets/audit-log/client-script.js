api.controller = function($scope, spUtil) {
    var c = this;

    c.filters = {
        event_key: c.data.filters.event_key || '',
        user: c.data.filters.user || '',
        date_from: c.data.filters.date_from || '',
        date_to: c.data.filters.date_to || ''
    };

    c.applyFilters = function() {
        c.data.filters = {
            event_key: c.filters.event_key,
            user: c.filters.user,
            date_from: c.filters.date_from,
            date_to: c.filters.date_to
        };
        c.server.update().then(function() {
            spUtil.update($scope);
        });
    };

    c.clearFilters = function() {
        c.filters = { event_key: '', user: '', date_from: '', date_to: '' };
        c.data.filters = { event_key: '', user: '', date_from: '', date_to: '' };
        c.server.update().then(function() {
            spUtil.update($scope);
        });
    };
};
