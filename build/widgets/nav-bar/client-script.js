api.controller = function($scope, $rootScope, spUtil) {
    var c = this;

    c.activeSection = ($rootScope.oiActiveSection) ?
        $rootScope.oiActiveSection : c.data.defaultSection;
    $rootScope.oiActiveSection = c.activeSection;

    c.setSection = function(sectionId) {
        if (!sectionId) {
            return;
        }
        c.activeSection = sectionId;
        $rootScope.oiActiveSection = sectionId;
        $rootScope.$broadcast('oi:setSection', sectionId);
    };

    c.isActive = function(sectionId) {
        return c.activeSection === sectionId;
    };

    $scope.$on('oi:setSection', function(event, sectionId) {
        if (sectionId && sectionId !== c.activeSection) {
            c.activeSection = sectionId;
        }
    });

    c.refresh = function() {
        c.server.update().then(function() {
            spUtil.update($scope);
        });
    };
};
