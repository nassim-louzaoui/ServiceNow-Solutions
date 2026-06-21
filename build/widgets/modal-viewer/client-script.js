api.controller = function($scope, $sce) {
    var c = this;

    c.trustedUrl = '';
    if (c.data.target_url) {
        c.trustedUrl = $sce.trustAsResourceUrl(c.data.target_url);
    }
};
