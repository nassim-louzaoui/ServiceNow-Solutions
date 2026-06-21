api.controller = function($scope, $rootScope, $interval, spUtil) {
    var c = this;
    var POLL = 30000;

    c.activeSection = ($rootScope.oiActiveSection) ?
        $rootScope.oiActiveSection : 'workspace';

    c.maintenanceSections = c.data.maintenanceSections || [];

    c.isInMaintenance = function(sectionId) {
        if (!sectionId) {
            return false;
        }
        if (c.maintenanceSections.indexOf('all') !== -1) {
            return true;
        }
        return c.maintenanceSections.indexOf(sectionId) !== -1;
    };

    c.activeInMaintenance = function() {
        if (c.isInMaintenance(c.activeSection)) {
            return !(c.data.isAdmin && c.activeSection === 'command');
        }
        return false;
    };

    c.sectionLabel = function(sectionId) {
        var labels = c.data.sectionLabels || {};
        return labels[sectionId] || 'This Section';
    };

    c.maintenanceTitle = function() {
        if (c.maintenanceSections.indexOf('all') !== -1) {
            return 'Operations Intelligence is Under Maintenance';
        }
        return c.sectionLabel(c.activeSection) + ' is Under Maintenance';
    };

    $scope.$on('oi:setSection', function(event, sectionId) {
        if (sectionId) {
            c.activeSection = sectionId;
        }
    });

    $scope.$watch(function() {
        return $rootScope.oiActiveSection;
    }, function(newVal) {
        if (newVal && newVal !== c.activeSection) {
            c.activeSection = newVal;
        }
    });

    function pollMaintenance() {
        c.server.update().then(function() {
            c.maintenanceSections = c.data.maintenanceSections || [];
        });
    }

    var pollTimer = $interval(pollMaintenance, POLL);

    $scope.$on('$destroy', function() {
        $interval.cancel(pollTimer);
    });
};
