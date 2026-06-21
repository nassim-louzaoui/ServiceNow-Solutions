api.controller = function($scope, $timeout) {
    var c = this;

    c.ui = {
        section:           '',
        loading:           false,
        search:            '',
        selectedGroup:     '',
        activityFilter:    'all',
        expandedExecution: null,
        mobileNavOpen:     false,
        stepLogLoading:    false
    };

    c.statusFilters = [
        { value: 'all',        label: 'All' },
        { value: 'success',    label: 'Success' },
        { value: 'failed',     label: 'Failed' },
        { value: 'running',    label: 'Running' },
        { value: 'pending',    label: 'Pending' },
        { value: 'cancelled',  label: 'Cancelled' }
    ];

    c.roleLabel = function() {
        var map = {
            admin:      'Admin',
            leadership: 'Leadership',
            creator:    'Creator',
            user:       'User'
        };
        return map[c.data.userRole] || c.data.userRole || '';
    };

    c.navigate = function(sectionId) {
        if (c.ui.loading) { return; }
        c.ui.mobileNavOpen = false;
        c.ui.loading = true;
        c.ui.expandedExecution = null;
        c.server.get({ action: 'load_section', section: sectionId }).then(function(response) {
            c.data.sectionData = response.data.sectionData;
            c.ui.section = sectionId;
            c.ui.search = '';
            c.ui.loading = false;
        }, function() {
            c.ui.loading = false;
        });
    };

    c.selectGroup = function(groupSysId) {
        c.ui.selectedGroup = groupSysId;
    };

    c.filteredAutomations = function() {
        if (!c.data.sectionData || !c.data.sectionData.automations) { return []; }
        var automations = c.data.sectionData.automations;
        var search = c.ui.search ? c.ui.search.toLowerCase() : '';
        var group  = c.ui.selectedGroup;

        var result = [];
        var i;
        for (i = 0; i < automations.length; i++) {
            var a = automations[i];
            if (group && a.owner_group_sys_id !== group) { continue; }
            if (search) {
                var haystack = ((a.name || '') + ' ' + (a.short_description || '') + ' ' + (a.owner_group || '')).toLowerCase();
                if (haystack.indexOf(search) === -1) { continue; }
            }
            result.push(a);
        }
        return result;
    };

    c.filteredExecutions = function() {
        if (!c.data.sectionData || !c.data.sectionData.executions) { return []; }
        var executions = c.data.sectionData.executions;
        var filter = c.ui.activityFilter;
        var search = c.ui.search ? c.ui.search.toLowerCase() : '';

        var result = [];
        var i;
        for (i = 0; i < executions.length; i++) {
            var e = executions[i];
            if (filter !== 'all' && e.status !== filter) { continue; }
            if (search) {
                var haystack = ((e.number || '') + ' ' + (e.automation || '') + ' ' + (e.channel || '')).toLowerCase();
                if (haystack.indexOf(search) === -1) { continue; }
            }
            result.push(e);
        }
        return result;
    };

    c.toggleExecution = function(exc) {
        if (c.ui.expandedExecution && c.ui.expandedExecution.sys_id === exc.sys_id) {
            c.ui.expandedExecution = null;
            return;
        }
        c.ui.expandedExecution = exc;
        exc.stepLog = null;
        c.ui.stepLogLoading = true;
        c.server.get({ action: 'step_log', execution_sys_id: exc.sys_id }).then(function(response) {
            exc.stepLog = response.data.stepLog || [];
            c.ui.stepLogLoading = false;
        }, function() {
            exc.stepLog = [];
            c.ui.stepLogLoading = false;
        });
    };

    c.isExpandedExecution = function(exc) {
        return c.ui.expandedExecution && c.ui.expandedExecution.sys_id === exc.sys_id;
    };

    c.toggleMaintenance = function(maintenanceItem) {
        if (!maintenanceItem) { return; }
        c.server.get({
            action:    'toggle_maintenance',
            prop_name: maintenanceItem.prop_name
        }).then(function() {
            maintenanceItem.enabled = !maintenanceItem.enabled;
        });
    };

    c.stepLogEntries = function() {
        if (!c.ui.expandedExecution || !c.ui.expandedExecution.stepLog) { return []; }
        return c.ui.expandedExecution.stepLog;
    };

    c.statusClass = function(status) {
        var map = {
            success:   'oi-badge-success',
            failed:    'oi-badge-danger',
            error:     'oi-badge-danger',
            running:   'oi-badge-info',
            pending:   'oi-badge-warning',
            cancelled: 'oi-badge-muted',
            skipped:   'oi-badge-muted'
        };
        return 'oi-badge ' + (map[status] || 'oi-badge-muted');
    };

    c.stepStatusDot = function(status) {
        var map = {
            success:   'oi-dot-success',
            failed:    'oi-dot-danger',
            error:     'oi-dot-danger',
            running:   'oi-dot-info',
            pending:   'oi-dot-warning',
            skipped:   'oi-dot-muted',
            cancelled: 'oi-dot-muted'
        };
        return 'oi-step-dot ' + (map[status] || 'oi-dot-muted');
    };

    c.pendingActionIcon = function(actionType) {
        var map = {
            approve_member:    'fa-user-plus',
            review_automation: 'fa-cogs',
            approve_artifact:  'fa-cube',
            review_use_case:   'fa-lightbulb-o'
        };
        return 'fa ' + (map[actionType] || 'fa-bell');
    };

    c.triggerAutomation = function(card) {
        alert('Trigger: ' + (card.name || card.sys_id));
    };

    c.toggleMobileNav = function() {
        c.ui.mobileNavOpen = !c.ui.mobileNavOpen;
    };

    c.$onInit = function() {
        if (c.data && c.data.initialSection) {
            $timeout(function() {
                c.navigate(c.data.initialSection);
            }, 0);
        }
    };
};
