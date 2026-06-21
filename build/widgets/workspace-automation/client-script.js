api.controller = function($scope, spUtil, spModal) {
    var c = this;

    c.selectedGroup = c.data.selected_group || '';

    c.onGroupChange = function() {
        c.data.selected_group = c.selectedGroup;
        c.server.get({ selected_group: c.selectedGroup }).then(function(response) {
            c.data.cards = response.data.cards;
        });
    };

    c.trigger = function(card) {
        var intent = 'trigger_automation';
        $scope.$emit('oi:assistant', {
            open: true,
            pre_intent: intent,
            automation_sys_id: card.sys_id,
            automation_name: card.name,
            automation_number: card.number
        });
        $scope.$root.$broadcast('oi:assistant', {
            open: true,
            pre_intent: intent,
            automation_sys_id: card.sys_id,
            automation_name: card.name,
            automation_number: card.number
        });
    };

    c.openFlowDetail = function(card) {
        c.server.get({
            action: 'flow_detail',
            automation_sys_id: card.sys_id,
            selected_group: c.selectedGroup
        }).then(function(response) {
            var detail = response.data.flow_detail || {};
            spModal.open({
                title: detail.name || card.name,
                widget: null,
                message: c.buildDetailMarkup(detail),
                buttons: [
                    { label: 'Close', primary: true }
                ]
            });
        });
    };

    c.buildDetailMarkup = function(detail) {
        var html = '<div class="oi-wa-modal">';
        if (detail.short_description) {
            html += '<p class="oi-wa-modal-desc">' + c.escape(detail.short_description) + '</p>';
        }
        html += '<div class="oi-wa-modal-row"><strong>Trigger condition:</strong> ' +
            c.escape(detail.trigger_condition || 'Not specified') + '</div>';
        html += '<div class="oi-wa-modal-row"><strong>Action summary:</strong> ' +
            c.escape(detail.action_summary || 'No active steps') + '</div>';
        html += '<div class="oi-wa-modal-row"><strong>Recent activity:</strong></div>';
        if (detail.recent_activity && detail.recent_activity.length) {
            html += '<ul class="oi-wa-modal-log">';
            var i;
            for (i = 0; i < detail.recent_activity.length; i++) {
                var entry = detail.recent_activity[i];
                html += '<li><span class="oi-wa-log-ref">' + c.escape(entry.number) +
                    '</span> <span class="oi-wa-log-time">' + c.escape(entry.triggered_at) +
                    '</span> <span class="oi-wa-log-status oi-wa-log-' + c.escape(entry.status) +
                    '">' + c.escape(entry.status) + '</span></li>';
            }
            html += '</ul>';
        } else {
            html += '<div class="oi-wa-modal-empty">No activations recorded yet.</div>';
        }
        html += '</div>';
        return html;
    };

    c.escape = function(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return ('' + value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };
};
