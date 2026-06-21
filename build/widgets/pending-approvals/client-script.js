api.controller = function($scope, spUtil) {
    var c = this;
    c.activeReject = null;
    c.rejectReason = '';
    c.busy = false;

    c.openReject = function(approval) {
        c.activeReject = approval.sys_id;
        c.rejectReason = '';
    };

    c.cancelReject = function() {
        c.activeReject = null;
        c.rejectReason = '';
    };

    c.approve = function(approval) {
        _post('approve', approval, '');
    };

    c.confirmReject = function(approval) {
        if (!c.rejectReason) {
            return;
        }
        _post('reject', approval, c.rejectReason);
    };

    function _post(action, approval, reason) {
        c.busy = true;
        c.server.get({
            action: action,
            pending_action_sys_id: approval.sys_id,
            reason: reason
        }).then(function(response) {
            c.busy = false;
            c.activeReject = null;
            c.rejectReason = '';
            var d = response.data;
            if (d && d.message) {
                spUtil.addInfoMessage(d.message);
            }
            if (d && d.error) {
                spUtil.addErrorMessage(d.error);
            }
        });
    }

    c.countdown = function(approval) {
        var ms = _deadlineMs(approval);
        if (ms === null) {
            return '';
        }
        var diff = ms - new Date().getTime();
        if (diff <= 0) {
            return 'Overdue';
        }
        var hours = Math.floor(diff / 3600000);
        var mins = Math.floor((diff % 3600000) / 60000);
        if (hours >= 24) {
            var days = Math.floor(hours / 24);
            return days + 'd ' + (hours % 24) + 'h left';
        }
        return hours + 'h ' + mins + 'm left';
    };

    c.isOverdue = function(approval) {
        var ms = _deadlineMs(approval);
        return ms !== null && (ms - new Date().getTime()) <= 0;
    };

    function _deadlineMs(approval) {
        if (!approval.deadline_at) {
            return null;
        }
        var iso = approval.deadline_at.replace(' ', 'T') + 'Z';
        var t = new Date(iso).getTime();
        return isNaN(t) ? null : t;
    }
};
