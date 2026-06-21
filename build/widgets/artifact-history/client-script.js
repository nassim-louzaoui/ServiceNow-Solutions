api.controller = function($scope, spUtil) {
    var c = this;

    c.resume = function(artifact) {
        $scope.$root.$broadcast('oi:assistant', {
            pre_intent: 'resume_artifact',
            record_sys_id: artifact.sys_id,
            record_type: 'artifact',
            artifact_type: artifact.artifact_type
        });
    };

    c.label = function(status) {
        var labels = {
            draft: 'Draft',
            pending_approval: 'Pending Approval',
            active: 'Active',
            inactive: 'Inactive',
            archived: 'Archived'
        };
        return labels[status] || status;
    };
};
