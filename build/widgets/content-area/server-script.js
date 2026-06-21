(function() {
    var userSysId = gs.getUserID();

    var pr = new PermissionResolver();
    data.role = pr.getSystemRole(userSysId);
    data.isAdmin = (data.role === 'admin');

    var mm = new MaintenanceManager();
    var status = mm.getStatus();

    data.maintenanceSections = status.sections || [];
    data.maintenanceMessage = status.message ||
        'This section is temporarily unavailable while we make improvements.';
    data.maintenanceReturnAt = status.returnAt || '';

    data.sectionLabels = {
        workspace: 'Workspace',
        activity: 'My Activity',
        studio: 'Studio',
        governance: 'Governance',
        command: 'Command'
    };

    if (input && input.checkSection) {
        data.checkedSection = '' + input.checkSection;
        data.checkedInMaintenance = mm.isInMaintenance(data.checkedSection);
    }
})();
