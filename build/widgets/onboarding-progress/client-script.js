api.controller = function($scope, spUtil, $window) {
    var c = this;

    c.steps = [
        { key: 'invitation', label: 'Invitation' },
        { key: 'role_group', label: 'Role & Group' },
        { key: 'capabilities', label: 'Capabilities' },
        { key: 'complete', label: 'Complete' }
    ];

    c.confirming = false;

    c.currentStepIndex = function() {
        if (c.data.completed) {
            return 3;
        }
        if (!c.data.request) {
            return 0;
        }
        return 1;
    };

    c.isStepActive = function(index) {
        return index === c.currentStepIndex();
    };

    c.isStepDone = function(index) {
        return index < c.currentStepIndex();
    };

    c.confirmOnboarding = function() {
        if (!c.data.request || c.confirming) {
            return;
        }
        c.confirming = true;
        c.server.get({
            action: 'complete',
            requestSysId: c.data.request.sys_id
        }).then(function(response) {
            c.confirming = false;
            c.data.completed = response.data.completed;
            c.data.error = response.data.error;
            c.data.request = response.data.request;
        });
    };

    c.goToPortal = function() {
        if ($window && $window.location) {
            $window.location.href = '?id=main';
        }
    };
};
