// ── Server Script: maintenance-overlay ─────────────────────
// Runs once when the widget is loaded. Reads maintenance state
// and sets up the display data for the template.
//
// Widget options (set when embedding this widget):
//   section_id    — one of: workspace | activity | studio |
//                            governance | command
//   section_label — display name shown in the title
// ──────────────────────────────────────────────────────────────
(function() {
    data.sectionId    = options.section_id    || 'workspace';
    data.sectionLabel = options.section_label || 'This Section';
    data.isAdmin      = gs.hasRole('admin');

    var mm     = new MaintenanceManager();
    var status = mm.getStatus();
    var isAll  = (status.sections.indexOf('all') !== -1);

    data.isInMaintenance = mm.isInMaintenance(data.sectionId);
    data.title           = isAll
        ? 'Operations Intelligence is Under Maintenance'
        : data.sectionLabel + ' is Under Maintenance';
    data.message         = status.message ||
        'This section is temporarily unavailable while we make improvements.';
    data.returnAt        = status.returnAt;
})();
