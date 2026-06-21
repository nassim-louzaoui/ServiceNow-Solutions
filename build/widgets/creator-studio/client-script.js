api.controller = function($scope, spUtil) {
    var c = this;

    c.startIntent = function(preIntent) {
        $scope.$emit('oi:assistant', { pre_intent: preIntent });
        $scope.$root.$broadcast('oi:assistant', { pre_intent: preIntent });
    };

    c.connectCopilot = function() {
        $scope.$root.$broadcast('oi:assistant', { pre_intent: 'connect_copilot' });
    };

    c.resumeDraft = function(draft) {
        $scope.$root.$broadcast('oi:assistant', {
            pre_intent: draft.resume_intent,
            record_sys_id: draft.sys_id,
            record_type: draft.type
        });
    };

    c.editAutomation = function(automation) {
        $scope.$root.$broadcast('oi:assistant', {
            pre_intent: 'edit_automation',
            record_sys_id: automation.sys_id
        });
    };

    c.deprecateAutomation = function(automation) {
        $scope.$root.$broadcast('oi:assistant', {
            pre_intent: 'deprecate_automation',
            record_sys_id: automation.sys_id
        });
    };
};
