// ── Client Controller: maintenance-overlay ─────────────────
// Formats the estimated return time and polls maintenance state
// every 30 s via GlideAjax. When the section is cleared the
// controller emits 'oi.section.restored' on $scope so the
// parent Content Area widget can swap the content back.
// ──────────────────────────────────────────────────────────────
function($scope, $interval) {
    var c    = this;
    var POLL = 30000; // 30 seconds

    c.clearing   = false;
    c.clearError = '';
    c.returnLabel = '';

    // ── Format estimated return time ───────────────────────────
    function formatReturn() {
        if (!c.data.returnAt) { c.returnLabel = ''; return; }
        var ret  = new Date(c.data.returnAt);
        var now  = new Date();
        var diff = ret.getTime() - now.getTime();
        if (diff <= 0) { c.returnLabel = ''; return; }
        var mins = Math.round(diff / 60000);
        if (mins < 60) {
            c.returnLabel = 'Back in approximately ' + mins +
                ' minute' + (mins !== 1 ? 's' : '');
        } else {
            var hh  = String(ret.getHours()).padStart(2, '0');
            var mm_ = String(ret.getMinutes()).padStart(2, '0');
            c.returnLabel = 'Back at ' + hh + ':' + mm_;
        }
    }

    formatReturn();

    // ── Poll maintenance state every 30 s ─────────────────────
    var pollTimer = $interval(function() {
        var ga = new GlideAjax('MaintenanceManager');
        ga.addParam('sysparm_name',    'ajaxIsInMaintenance');
        ga.addParam('sysparm_section', c.data.sectionId);
        ga.getXMLAnswer(function(answer) {
            var inMaint = (answer === 'true');
            if (!inMaint) {
                $interval.cancel(pollTimer);
                $scope.$emit('oi.section.restored', c.data.sectionId);
            }
            // Recalculate countdown on every tick
            if (c.data.returnAt) formatReturn();
            if (!$scope.$$phase) $scope.$apply();
        });
    }, POLL);

    $scope.$on('$destroy', function() { $interval.cancel(pollTimer); });

    // ── Admin: clear this section from the overlay ─────────────
    c.clearSection = function() {
        c.clearing   = true;
        c.clearError = '';
        var ga = new GlideAjax('MaintenanceManager');
        ga.addParam('sysparm_name',     'ajaxClearMaintenance');
        ga.addParam('sysparm_sections', JSON.stringify([c.data.sectionId]));
        ga.getXMLAnswer(function(answer) {
            c.clearing = false;
            try {
                var res = JSON.parse(answer);
                if (res.success) {
                    $interval.cancel(pollTimer);
                    $scope.$emit('oi.section.restored', c.data.sectionId);
                } else {
                    c.clearError = res.error || 'An error occurred.';
                }
            } catch (e) {
                c.clearError = 'Unexpected server response.';
            }
            if (!$scope.$$phase) $scope.$apply();
        });
    };
}
