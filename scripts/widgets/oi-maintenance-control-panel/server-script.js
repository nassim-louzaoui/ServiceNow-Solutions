// ── Server Script: oi-maintenance-control-panel ────────────────
// Renders only for admin role. Reads current maintenance state
// from system properties via MaintenanceManager and populates
// the template's initial view model.
// ──────────────────────────────────────────────────────────────
(function() {
    data.isAdmin = gs.hasRole('admin');
    if (!data.isAdmin) { return; }

    var mm     = new MaintenanceManager();
    var status = mm.getStatus();

    data.sections    = status.sections;   // string[]
    data.isAll       = (status.sections.indexOf('all') !== -1);
    data.message     = status.message;
    data.returnAt    = status.returnAt;
    data.initiatedBy = status.initiatedBy;
    data.initiatedAt = status.initiatedAt;
})();
