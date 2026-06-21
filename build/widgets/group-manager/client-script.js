api.controller = function($scope, spUtil) {
    var c = this;
    c.expanded = {};
    c.addSelection = {};
    c.busy = false;

    c.$onInit = function() {
        var groups = ($scope.data && $scope.data.groups) || [];
        var i;
        for (i = 0; i < groups.length; i++) {
            if (!c.addSelection[groups[i].sys_id]) {
                c.addSelection[groups[i].sys_id] = { person: '', role: 'user' };
            }
            var children = groups[i].children || [];
            var j;
            for (j = 0; j < children.length; j++) {
                if (!c.addSelection[children[j].sys_id]) {
                    c.addSelection[children[j].sys_id] = { person: '', role: 'user' };
                }
            }
        }
    };

    c.toggle = function(groupSysId) {
        c.expanded[groupSysId] = !c.expanded[groupSysId];
        if (c.expanded[groupSysId] && !c.addSelection[groupSysId]) {
            c.addSelection[groupSysId] = { person: '', role: 'user' };
        }
    };

    c.addMember = function(group) {
        var sel = c.addSelection[group.sys_id];
        if (!sel || !sel.person) {
            return;
        }
        _post({
            action: 'add_member',
            group_sys_id: group.sys_id,
            person_sys_id: sel.person,
            group_role: sel.role || 'user'
        });
    };

    c.removeMember = function(group, member) {
        _post({
            action: 'remove_member',
            group_sys_id: group.sys_id,
            person_sys_id: member.person_sys_id
        });
    };

    c.reinvite = function(onboarding) {
        _post({
            action: 'reinvite',
            onboarding_request_sys_id: onboarding.sys_id
        });
    };

    function _post(payload) {
        c.busy = true;
        c.server.get(payload).then(function(response) {
            c.busy = false;
            var d = response.data;
            if (d && d.message) {
                spUtil.addInfoMessage(d.message);
            }
            if (d && d.error) {
                spUtil.addErrorMessage(d.error);
            }
        });
    }
};
