api.controller = function($scope, $window, $timeout) {
    var c = this;

    // ── Section definitions (order = display order) ───────────
    var SECTION_DEFS = [
        { id: 'workspace',  label: 'Workspace'            },
        { id: 'activity',   label: 'My Activity'          },
        { id: 'studio',     label: 'Operations Studio'    },
        { id: 'governance', label: 'Operations Governance'},
        { id: 'command',    label: 'Operations Command'   }
    ];

    // ── Initialise view model from server data ─────────────────
    c.isAll     = c.data.isAll    || false;
    c.message   = c.data.message  || '';
    c.returnAt  = c.data.returnAt || '';
    c.saving    = false;
    c.exporting = false;
    c.statusMsg = '';
    c.statusClass = '';
    c.exportMsg = '';
    c.exportMsgOk = false;

    var activeSections = c.data.sections || [];
    c.sections = SECTION_DEFS.map(function(s) {
        return {
            id:     s.id,
            label:  s.label,
            active: activeSections.indexOf(s.id) !== -1
        };
    });

    // ── Entire-application toggle ──────────────────────────────
    c.onAppToggle = function() {
        if (c.isAll) {
            _ajax('ajaxSetMaintenance', {
                sysparm_sections:  '["all"]',
                sysparm_message:   c.message,
                sysparm_return_at: c.returnAt
            }, function(res) {
                if (res.success) {
                    _feedback('Entire application placed in maintenance.', 'ok');
                } else {
                    c.isAll = false;
                    _feedback(res.error || 'Could not set maintenance.', 'err');
                }
            });
        } else {
            _ajax('ajaxClearMaintenance', { sysparm_sections: '["all"]' }, function(res) {
                if (res.success) {
                    c.sections.forEach(function(s) { s.active = false; });
                    _feedback('Application maintenance cleared.', 'ok');
                } else {
                    c.isAll = true;
                    _feedback(res.error || 'Could not clear maintenance.', 'err');
                }
            });
        }
    };

    // ── Individual section toggle ──────────────────────────────
    c.onSectionToggle = function(section) {
        if (section.active) {
            _ajax('ajaxSetMaintenance', {
                sysparm_sections:  JSON.stringify([section.id]),
                sysparm_message:   c.message,
                sysparm_return_at: c.returnAt
            }, function(res) {
                if (res.success) {
                    _feedback(section.label + ' set to maintenance.', 'ok');
                } else {
                    section.active = false;
                    _feedback(res.error || 'Could not set maintenance.', 'err');
                }
            });
        } else {
            _ajax('ajaxClearMaintenance', {
                sysparm_sections: JSON.stringify([section.id])
            }, function(res) {
                if (res.success) {
                    _feedback(section.label + ' restored to live.', 'ok');
                } else {
                    section.active = true;
                    _feedback(res.error || 'Could not clear maintenance.', 'err');
                }
            });
        }
    };

    // ── Apply message + return time to active sections ─────────
    c.applyMessageSettings = function() {
        var activeSecs = c.isAll
            ? ['all']
            : c.sections.filter(function(s) { return s.active; }).map(function(s) { return s.id; });

        if (activeSecs.length === 0) {
            _feedback('No sections are currently in maintenance — enable a section first.', 'warn');
            return;
        }
        c.saving = true;
        _ajax('ajaxSetMaintenance', {
            sysparm_sections:  JSON.stringify(activeSecs),
            sysparm_message:   c.message,
            sysparm_return_at: c.returnAt
        }, function(res) {
            c.saving = false;
            if (res.success) {
                _feedback('Message and estimated return time updated.', 'ok');
            } else {
                _feedback(res.error || 'Could not save settings.', 'err');
            }
        });
    };

    // ── Export Application XML ─────────────────────────────────
    c.exportXML = function() {
        if (!c.isAll || c.exporting) { return; }
        c.exporting   = true;
        c.exportMsg   = '';
        c.exportMsgOk = false;
        _ajax('ajaxGetExportURL', {}, function(res) {
            c.exporting = false;
            if (res.url) {
                $window.open(res.url, '_blank');
                c.exportMsg   = 'Application XML download started — check your browser downloads.';
                c.exportMsgOk = true;
            } else {
                c.exportMsg   = res.error || 'Could not retrieve export URL.';
                c.exportMsgOk = false;
            }
        });
    };

    // ── Internal helpers ──────────────────────────────────────

    function _ajax(method, params, cb) {
        var ga = new GlideAjax('MaintenanceManager');
        ga.addParam('sysparm_name', method);
        Object.keys(params).forEach(function(k) {
            ga.addParam(k, params[k]);
        });
        ga.getXMLAnswer(function(answer) {
            var res = {};
            try { res = JSON.parse(answer); } catch (e) { res = { error: 'Parse error' }; }
            cb(res);
            if (!$scope.$$phase) { $scope.$apply(); }
        });
    }

    var _dismissTimer = null;
    function _feedback(msg, type) {
        c.statusMsg   = msg;
        c.statusClass = { ok: 'oi-status-ok', warn: 'oi-status-warn', err: 'oi-status-err' }[type] || '';
        if (_dismissTimer) { $timeout.cancel(_dismissTimer); }
        _dismissTimer = $timeout(function() {
            c.statusMsg = '';
        }, 4500);
    }
}
