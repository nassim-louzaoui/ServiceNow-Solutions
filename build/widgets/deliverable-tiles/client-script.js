api.controller = function($scope, spUtil) {
    var c = this;

    c.openTile = function(tile) {
        $scope.$root.$broadcast('oi:assistant', {
            open: true,
            pre_intent: tile.pre_intent,
            artifact_type: tile.id
        });
    };
};
