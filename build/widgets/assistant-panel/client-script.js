api.controller = function($scope, $rootScope, spUtil) {
    var c = this;

    c.collapsed = false;
    c.activeSection = c.data.activeSection || 'workspace';
    c.preIntent = c.data.preIntent || '';

    c.toggle = function() {
        c.collapsed = !c.collapsed;
    };

    c.reload = function() {
        c.server.update().then(function() {
            c.activeSection = c.data.activeSection || c.activeSection;
            c.preIntent = c.data.preIntent || '';
        });
    };

    $scope.$on('oi:setSection', function(event, sectionId) {
        if (sectionId && sectionId !== c.activeSection) {
            c.activeSection = sectionId;
            c.data.activeSection = sectionId;
            c.server.update();
        }
    });

    $scope.$on('oi:preIntent', function(event, intentName) {
        if (intentName) {
            c.preIntent = intentName;
            c.data.preIntent = intentName;
            if (c.collapsed) {
                c.collapsed = false;
            }
        }
    });

    $scope.$watch(function() {
        return $rootScope.oiActiveSection;
    }, function(newVal) {
        if (newVal && newVal !== c.activeSection) {
            c.activeSection = newVal;
            c.data.activeSection = newVal;
        }
    });
};
