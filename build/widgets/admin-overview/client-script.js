api.controller = function($scope, spUtil) {
    var c = this;

    c.searchTerm = c.data.search || '';

    c.runSearch = function() {
        c.data.search = c.searchTerm;
        c.server.update().then(function() {
            spUtil.update($scope);
        });
    };

    c.clearSearch = function() {
        c.searchTerm = '';
        c.data.search = '';
        c.server.update().then(function() {
            spUtil.update($scope);
        });
    };

    c.setTab = function(tabKey) {
        c.data.tab = tabKey;
    };

    c.isTab = function(tabKey) {
        return c.data.tab === tabKey;
    };

    c.toggleGroup = function(node) {
        node.expanded = !node.expanded;
    };

    c.refresh = function() {
        c.server.update().then(function() {
            spUtil.update($scope);
        });
    };
};
