api.controller = function($scope, spUtil, spModal, $window) {
    var c = this;

    c.selectedGroup = c.data.selected_group || '';

    c.onGroupChange = function() {
        c.data.selected_group = c.selectedGroup;
        c.server.get({ selected_group: c.selectedGroup }).then(function(response) {
            c.data.cards = response.data.cards || [];
        });
    };

    var MANAGE_INTENTS = {
        edit: 'edit_deliverable',
        deactivate: 'deactivate_deliverable',
        archive: 'archive_deliverable'
    };

    c.openCard = function(card) {
        if (card.artifact_type === 'report' && card.primary_sys_id) {
            c.openViewerModal(card, 'report_viewer.do?sysparm_report=' + card.primary_sys_id);
            return;
        }
        if (card.artifact_type === 'pa_dashboard' && card.primary_sys_id) {
            c.openViewerModal(card, '$pa_dashboard.do?sysparm_dashboard=' + card.primary_sys_id);
            return;
        }
        if (card.artifact_type === 'ui_page' && card.primary_sys_id) {
            c.openViewerModal(card, card.primary_sys_id + '.do');
            return;
        }
        c.openInfoModal(card);
    };

    c.openViewerModal = function(card, url) {
        spModal.open({
            title: card.display_name,
            widget: 'modal-viewer',
            widgetInput: {
                artifact_sys_id: card.sys_id,
                target_url: url
            },
            buttons: [{ label: 'Close', primary: true }],
            size: 'lg'
        });
    };

    c.openInfoModal = function(card) {
        spModal.open({
            title: card.display_name,
            widget: 'modal-viewer',
            widgetInput: { artifact_sys_id: card.sys_id },
            buttons: [{ label: 'Close', primary: true }]
        });
    };

    c.manage = function(card, action) {
        var intent = MANAGE_INTENTS[action];
        if (action === 'archive') {
            spModal.confirm('Archiving permanently deletes the underlying artifact. The history is preserved but this cannot be undone. Continue?')
                .then(function(confirmed) {
                    if (confirmed) {
                        c.broadcastManagement(card, intent, action);
                    }
                });
            return;
        }
        c.broadcastManagement(card, intent, action);
    };

    c.broadcastManagement = function(card, intent, action) {
        $scope.$root.$broadcast('oi:assistant', {
            open: true,
            pre_intent: intent,
            artifact_sys_id: card.sys_id,
            artifact_number: card.number,
            artifact_type: card.artifact_type,
            management_action: action
        });
    };
};
