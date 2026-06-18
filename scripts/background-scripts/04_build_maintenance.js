// ============================================================
// OPERATIONS INTELLIGENCE — MAINTENANCE FEATURE BUILD
// ============================================================
// Creates all maintenance-related artifacts in ONE RUN:
//   1. MaintenanceManager  — Script Include (client-callable)
//   2. oi-maintenance-overlay         — Service Portal Widget
//   3. oi-maintenance-control-panel   — Service Portal Widget
//   4. 5 system properties            — maintenance_* group
//
// PREREQUISITES:
//   - AuditService Script Include must already exist (step 14)
//   - Run INSIDE the Operations Intelligence scope
//
// HOW TO USE:
//   1. Ensure scope is set to your Operations Intelligence app
//   2. Navigate to: System Definition > Scripts - Background
//   3. Paste this ENTIRE script and click "Run script"
//   4. All checks must show [OK] — re-run is safe (guard checks
//      prevent duplicate records)
// ============================================================

(function buildMaintenanceFeature() {
    'use strict';

    var scope = gs.getCurrentScopeName();
    if (!scope || scope === 'global') {
        gs.print('ERROR: Switch to your Operations Intelligence scope first.');
        return;
    }

    var DIV  = '='.repeat(64);
    var DIV2 = '-'.repeat(64);
    var report = { created: [], skipped: [], failed: [] };

    gs.print('');
    gs.print(DIV);
    gs.print('  OI — MAINTENANCE FEATURE BUILD');
    gs.print(DIV);
    gs.print('  Scope : ' + scope);
    gs.print('');

    // ── Helpers ───────────────────────────────────────────────

    function createOrSkip(table, queryFn, insertFn, label) {
        var gr = new GlideRecord(table);
        queryFn(gr);
        gr.setLimit(1);
        gr.query();
        if (gr.next()) {
            report.skipped.push(label);
            gs.print('  [SKIP] Already exists : ' + label);
            return gr.getUniqueValue();
        }
        var newGr = new GlideRecord(table);
        newGr.initialize();
        insertFn(newGr);
        var sysId = newGr.insert();
        if (sysId) {
            report.created.push(label);
            gs.print('  [OK]   Created         : ' + label + '  (' + sysId + ')');
        } else {
            report.failed.push(label);
            gs.print('  [FAIL] Could not create: ' + label);
        }
        return sysId;
    }

    function createProp(name, defaultVal, description) {
        createOrSkip(
            'sys_properties',
            function(gr) { gr.addQuery('name', name); },
            function(gr) {
                gr.setValue('name',        name);
                gr.setValue('value',       defaultVal);
                gr.setValue('description', description);
                gr.setValue('type',        'string');
                gr.setValue('read_roles',  '');
                gr.setValue('write_roles', 'admin');
            },
            'Property: ' + name
        );
    }

    // ── 1. System Properties ──────────────────────────────────
    gs.print('');
    gs.print(DIV2);
    gs.print('  1 / 4  SYSTEM PROPERTIES');
    gs.print(DIV2);

    createProp(
        scope + '.maintenance_sections',
        '[]',
        'JSON array of section IDs in maintenance. ["all"] = entire application. ' +
        '[] = no maintenance. Valid IDs: workspace, activity, studio, governance, command.'
    );
    createProp(
        scope + '.maintenance_message',
        '',
        'Message displayed on the Maintenance Overlay. Empty = default text.'
    );
    createProp(
        scope + '.maintenance_return_at',
        '',
        'ISO datetime of estimated return. Shown as "Back at HH:MM" or "Back in ~N min".'
    );
    createProp(
        scope + '.maintenance_initiated_by',
        '',
        'sys_id of the admin who last enabled maintenance. Auto-set by MaintenanceManager.'
    );
    createProp(
        scope + '.maintenance_initiated_at',
        '',
        'ISO datetime when maintenance was last enabled. Auto-set by MaintenanceManager.'
    );

    // ── 2. MaintenanceManager Script Include ──────────────────
    gs.print('');
    gs.print(DIV2);
    gs.print('  2 / 4  SCRIPT INCLUDE: MaintenanceManager');
    gs.print(DIV2);

    var siCode = [
        'var MaintenanceManager = Class.create();',
        'MaintenanceManager.prototype = Object.extendsObject(AbstractAjaxProcessor, {',
        '',
        '    ajaxIsInMaintenance: function() {',
        '        var section = this.getParameter(\'sysparm_section\') || \'\';',
        '        return \'\' + this._isInMaintenance(section);',
        '    },',
        '',
        '    ajaxGetStatus: function() {',
        '        return JSON.stringify(this._getStatus());',
        '    },',
        '',
        '    ajaxSetMaintenance: function() {',
        '        if (!gs.hasRole(\'admin\')) { return JSON.stringify({ error: \'Unauthorized\' }); }',
        '        var sections = [];',
        '        try { sections = JSON.parse(this.getParameter(\'sysparm_sections\') || \'[]\'); } catch(e) {}',
        '        var message  = this.getParameter(\'sysparm_message\')   || \'\';',
        '        var returnAt = this.getParameter(\'sysparm_return_at\') || \'\';',
        '        this._setMaintenance(sections, message, returnAt);',
        '        return JSON.stringify({ success: true, sections: sections });',
        '    },',
        '',
        '    ajaxClearMaintenance: function() {',
        '        if (!gs.hasRole(\'admin\')) { return JSON.stringify({ error: \'Unauthorized\' }); }',
        '        var sections = [];',
        '        try { sections = JSON.parse(this.getParameter(\'sysparm_sections\') || \'["all"]\'); } catch(e) {}',
        '        this._clearMaintenance(sections);',
        '        return JSON.stringify({ success: true });',
        '    },',
        '',
        '    ajaxGetExportURL: function() {',
        '        if (!gs.hasRole(\'admin\')) { return JSON.stringify({ error: \'Unauthorized\' }); }',
        '        return JSON.stringify({ url: this._getExportURL() });',
        '    },',
        '',
        '    setMaintenance:  function(s,m,r) { this._setMaintenance(s,m,r); },',
        '    clearMaintenance:function(s)     { this._clearMaintenance(s);   },',
        '    isInMaintenance: function(s)     { return this._isInMaintenance(s); },',
        '    getStatus:       function()      { return this._getStatus();    },',
        '    getExportURL:    function()      { return this._getExportURL(); },',
        '',
        '    _scope:   function() { return gs.getCurrentScopeName(); },',
        '    _getProp: function(k,d) { return gs.getProperty(this._scope()+\'.\'+k, d!==undefined?d:\'\'); },',
        '    _setProp: function(k,v) { gs.setProperty(this._scope()+\'.\'+k, v); },',
        '',
        '    _getActiveSections: function() {',
        '        try { return JSON.parse(this._getProp(\'maintenance_sections\',\'[]\')); } catch(e) { return []; }',
        '    },',
        '',
        '    _setMaintenance: function(sections, message, returnAt) {',
        '        var existing = this._getActiveSections();',
        '        var newSections;',
        '        if (sections.indexOf(\'all\') !== -1) {',
        '            newSections = [\'all\'];',
        '        } else {',
        '            var merged = existing.filter(function(s){ return s!==\'all\'; });',
        '            sections.forEach(function(s){ if(merged.indexOf(s)===-1) merged.push(s); });',
        '            newSections = merged;',
        '        }',
        '        var now = new GlideDateTime();',
        '        this._setProp(\'maintenance_sections\',    JSON.stringify(newSections));',
        '        this._setProp(\'maintenance_message\',     message  ||\'\');',
        '        this._setProp(\'maintenance_return_at\',   returnAt ||\'\');',
        '        this._setProp(\'maintenance_initiated_by\', gs.getUserID());',
        '        this._setProp(\'maintenance_initiated_at\', now.getDisplayValue());',
        '        new AuditService().log(\'maintenance_enabled\', {',
        '            sections: JSON.stringify(newSections), message: message||\'\',',
        '            returnAt: returnAt||\'\', initiated_by: gs.getUserID(),',
        '            initiated_at: now.getDisplayValue()});',
        '    },',
        '',
        '    _clearMaintenance: function(sections) {',
        '        var now = new GlideDateTime();',
        '        var who = gs.getUserID();',
        '        if (sections.indexOf(\'all\') !== -1) {',
        '            [\'maintenance_sections\',\'maintenance_message\',\'maintenance_return_at\',',
        '             \'maintenance_initiated_by\',\'maintenance_initiated_at\']',
        '                .forEach(function(k){ gs.setProperty(gs.getCurrentScopeName()+\'.\'+k, k===\'maintenance_sections\'?\'[]\':\'\'  ); });',
        '        } else {',
        '            var updated = this._getActiveSections().filter(function(s){ return sections.indexOf(s)===-1; });',
        '            this._setProp(\'maintenance_sections\', JSON.stringify(updated));',
        '        }',
        '        new AuditService().log(\'maintenance_disabled\', {',
        '            sections_cleared: JSON.stringify(sections), cleared_by: who, cleared_at: now.getDisplayValue()});',
        '    },',
        '',
        '    _isInMaintenance: function(section) {',
        '        var s = this._getActiveSections();',
        '        return s.indexOf(\'all\')!== -1 || s.indexOf(section) !== -1;',
        '    },',
        '',
        '    _getStatus: function() {',
        '        return { sections: this._getActiveSections(),',
        '                 message:     this._getProp(\'maintenance_message\',\'\'),',
        '                 returnAt:    this._getProp(\'maintenance_return_at\',\'\'),',
        '                 initiatedBy: this._getProp(\'maintenance_initiated_by\',\'\'),',
        '                 initiatedAt: this._getProp(\'maintenance_initiated_at\',\'\') };',
        '    },',
        '',
        '    _getExportURL: function() {',
        '        var scope = this._scope();',
        '        var audit = new AuditService();',
        '        var now   = new GlideDateTime();',
        '        var gr    = new GlideRecord(\'sys_app\');',
        '        gr.addQuery(\'scope\', scope);',
        '        gr.setLimit(1); gr.query();',
        '        if (!gr.next()) {',
        '            audit.log(\'app_export_triggered\',{error:\'sys_app not found for scope:\'+scope,',
        '                triggered_by:gs.getUserID(),triggered_at:now.getDisplayValue()});',
        '            return null;',
        '        }',
        '        var id = gr.getUniqueValue();',
        '        audit.log(\'app_export_triggered\',{app_sys_id:id,',
        '            triggered_by:gs.getUserID(),triggered_at:now.getDisplayValue()});',
        '        return \'sys_app_export.do?sysparm_record_id=\'+id;',
        '    },',
        '',
        '    type: \'MaintenanceManager\'',
        '});'
    ].join('\n');

    createOrSkip(
        'sys_script_include',
        function(gr) {
            gr.addQuery('name', 'MaintenanceManager');
            gr.addQuery('sys_scope.scope', scope);
        },
        function(gr) {
            gr.setValue('name',            'MaintenanceManager');
            gr.setValue('script',          siCode);
            gr.setValue('api_name',        scope + '.MaintenanceManager');
            gr.setValue('client_callable', true);
            gr.setValue('access',          'public');
            gr.setValue('active',          true);
        },
        'ScriptInclude: MaintenanceManager'
    );

    // ── 3. Widget: oi-maintenance-overlay ─────────────────────
    gs.print('');
    gs.print(DIV2);
    gs.print('  3 / 4  WIDGET: oi-maintenance-overlay');
    gs.print(DIV2);

    // HTML template ────────────────────────────────────────────
    var overlayHTML = [
        '<div class="oi-maintenance-overlay">',
        '  <div class="oi-maint-svg-wrap" aria-hidden="true">',
        '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 190" width="280" height="190">',
        '      <g stroke="#CBD5E1" stroke-width="3" stroke-linecap="round" fill="none">',
        '        <line x1="72"  y1="178" x2="72"  y2="44"/>',
        '        <line x1="208" y1="178" x2="208" y2="44"/>',
        '        <line x1="72"  y1="44"  x2="208" y2="44"/>',
        '        <line x1="72"  y1="86"  x2="208" y2="86"/>',
        '        <line x1="72"  y1="128" x2="208" y2="128"/>',
        '        <line x1="72"  y1="174" x2="208" y2="174"/>',
        '        <line x1="72"  y1="44"  x2="140" y2="86"/>',
        '        <line x1="208" y1="44"  x2="140" y2="86"/>',
        '        <line x1="72"  y1="86"  x2="140" y2="128"/>',
        '        <line x1="208" y1="86"  x2="140" y2="128"/>',
        '        <line x1="72"  y1="128" x2="140" y2="174"/>',
        '        <line x1="208" y1="128" x2="140" y2="174"/>',
        '      </g>',
        '      <rect x="74" y="81" width="134" height="8" rx="2" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="1.5"/>',
        '      <g transform="translate(140,33)">',
        '        <ellipse cx="0" cy="0" rx="29" ry="6.5" fill="#F59E0B" stroke="#D97706" stroke-width="2"/>',
        '        <path d="M -23 0 Q -23 -24 0 -27 Q 23 -24 23 0 Z" fill="#FBBF24" stroke="#D97706" stroke-width="2"/>',
        '        <line x1="-27" y1="3" x2="27" y2="3" stroke="#D97706" stroke-width="2.5" stroke-linecap="round"/>',
        '      </g>',
        '      <g transform="translate(36,160) rotate(-38)">',
        '        <rect x="-4" y="-4" width="8" height="36" rx="3" fill="#94A3B8" stroke="#64748B" stroke-width="1.5"/>',
        '        <g transform="translate(0,-17)">',
        '          <circle cx="0" cy="0" r="11" fill="none" stroke="#94A3B8" stroke-width="7"/>',
        '          <circle cx="0" cy="0" r="4.5" fill="#F1F5F9"/>',
        '        </g>',
        '      </g>',
        '      <g transform="translate(244,156) rotate(32)">',
        '        <rect x="-6.5" y="-15" width="13" height="22" rx="5" fill="#FCA5A5" stroke="#F87171" stroke-width="1.5"/>',
        '        <rect x="-2" y="7" width="4" height="30" fill="#94A3B8" stroke="#64748B" stroke-width="1"/>',
        '        <rect x="-4.5" y="36" width="9" height="3.5" rx="1" fill="#475569"/>',
        '      </g>',
        '      <g transform="translate(140,107)">',
        '        <polygon points="0,-15 17,0 0,15 -17,0" fill="#FEF3C7" stroke="#F59E0B" stroke-width="2"/>',
        '        <rect x="-2" y="-8" width="4" height="10" rx="1.5" fill="#D97706"/>',
        '        <circle cx="0" cy="7.5" r="2.5" fill="#D97706"/>',
        '      </g>',
        '    </svg>',
        '  </div>',
        '  <h2 class="oi-maint-title">{{c.data.title}}</h2>',
        '  <p class="oi-maint-message">{{c.data.message}}</p>',
        '  <p ng-if="c.returnLabel" class="oi-maint-return">',
        '    <span class="oi-return-icon" aria-hidden="true">&#9201;</span>',
        '    {{c.returnLabel}}',
        '  </p>',
        '  <div ng-if="c.data.isAdmin" class="oi-maint-admin-bar">',
        '    <button class="oi-clear-btn" ng-click="c.clearSection()" ng-disabled="c.clearing">',
        '      <span ng-if="!c.clearing">&#128295; Clear This Section</span>',
        '      <span ng-if="c.clearing">Clearing&#8230;</span>',
        '    </button>',
        '    <span ng-if="c.clearError" class="oi-clear-error" role="alert">{{c.clearError}}</span>',
        '  </div>',
        '</div>'
    ].join('\n');

    // Server script ────────────────────────────────────────────
    var overlayServer = [
        '(function() {',
        '    data.sectionId    = options.section_id    || \'workspace\';',
        '    data.sectionLabel = options.section_label || \'This Section\';',
        '    data.isAdmin      = gs.hasRole(\'admin\');',
        '    var mm     = new MaintenanceManager();',
        '    var status = mm.getStatus();',
        '    var isAll  = (status.sections.indexOf(\'all\') !== -1);',
        '    data.isInMaintenance = mm.isInMaintenance(data.sectionId);',
        '    data.title    = isAll',
        '        ? \'Operations Intelligence is Under Maintenance\'',
        '        : data.sectionLabel + \' is Under Maintenance\';',
        '    data.message  = status.message ||',
        '        \'This section is temporarily unavailable while we make improvements.\';',
        '    data.returnAt = status.returnAt;',
        '})();'
    ].join('\n');

    // Client controller ────────────────────────────────────────
    var overlayClient = [
        'function($scope, $interval) {',
        '    var c = this;',
        '    var POLL = 30000;',
        '    c.clearing = false; c.clearError = \'\'; c.returnLabel = \'\';',
        '    function formatReturn() {',
        '        if (!c.data.returnAt) { c.returnLabel = \'\'; return; }',
        '        var ret = new Date(c.data.returnAt);',
        '        var now = new Date();',
        '        var diff = ret.getTime() - now.getTime();',
        '        if (diff <= 0) { c.returnLabel = \'\'; return; }',
        '        var mins = Math.round(diff / 60000);',
        '        if (mins < 60) {',
        '            c.returnLabel = \'Back in approximately \' + mins + \' minute\' + (mins !== 1 ? \'s\' : \'\');',
        '        } else {',
        '            var hh  = String(ret.getHours()).padStart(2,\'0\');',
        '            var mm_ = String(ret.getMinutes()).padStart(2,\'0\');',
        '            c.returnLabel = \'Back at \' + hh + \':\' + mm_;',
        '        }',
        '    }',
        '    formatReturn();',
        '    var pollTimer = $interval(function() {',
        '        var ga = new GlideAjax(\'MaintenanceManager\');',
        '        ga.addParam(\'sysparm_name\',    \'ajaxIsInMaintenance\');',
        '        ga.addParam(\'sysparm_section\', c.data.sectionId);',
        '        ga.getXMLAnswer(function(answer) {',
        '            if (answer !== \'true\') {',
        '                $interval.cancel(pollTimer);',
        '                $scope.$emit(\'oi.section.restored\', c.data.sectionId);',
        '            }',
        '            if (c.data.returnAt) formatReturn();',
        '            if (!$scope.$$phase) $scope.$apply();',
        '        });',
        '    }, POLL);',
        '    $scope.$on(\'$destroy\', function() { $interval.cancel(pollTimer); });',
        '    c.clearSection = function() {',
        '        c.clearing = true; c.clearError = \'\';',
        '        var ga = new GlideAjax(\'MaintenanceManager\');',
        '        ga.addParam(\'sysparm_name\',     \'ajaxClearMaintenance\');',
        '        ga.addParam(\'sysparm_sections\', JSON.stringify([c.data.sectionId]));',
        '        ga.getXMLAnswer(function(answer) {',
        '            c.clearing = false;',
        '            try {',
        '                var res = JSON.parse(answer);',
        '                if (res.success) {',
        '                    $interval.cancel(pollTimer);',
        '                    $scope.$emit(\'oi.section.restored\', c.data.sectionId);',
        '                } else { c.clearError = res.error || \'An error occurred.\'; }',
        '            } catch(e) { c.clearError = \'Unexpected server response.\'; }',
        '            if (!$scope.$$phase) $scope.$apply();',
        '        });',
        '    };',
        '}'
    ].join('\n');

    // CSS ──────────────────────────────────────────────────────
    var overlayCss = [
        '.oi-maintenance-overlay{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:58vh;padding:52px 36px 40px;text-align:center;background:#fff}',
        '.oi-maint-svg-wrap{margin-bottom:32px;opacity:.88}',
        '.oi-maint-title{font-size:1.65rem;font-weight:700;color:#0f172a;margin:0 0 14px;line-height:1.3}',
        '.oi-maint-message{font-size:1rem;color:#64748b;max-width:460px;line-height:1.65;margin:0 0 20px}',
        '.oi-maint-return{display:inline-flex;align-items:center;gap:6px;font-size:.9rem;font-weight:600;color:#b45309;background:#fef3c7;border:1px solid #fde68a;border-radius:20px;padding:6px 18px;margin:0 0 28px}',
        '.oi-maint-admin-bar{margin-top:12px;display:flex;flex-direction:column;align-items:center;gap:8px}',
        '.oi-clear-btn{display:inline-flex;align-items:center;gap:6px;background:#0f172a;color:#f8fafc;border:none;border-radius:8px;padding:10px 24px;font-size:.875rem;font-weight:600;cursor:pointer;transition:background .2s}',
        '.oi-clear-btn:hover:not([disabled]){background:#1e293b}',
        '.oi-clear-btn[disabled]{opacity:.55;cursor:not-allowed}',
        '.oi-clear-error{font-size:.8rem;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:5px 14px}'
    ].join('\n');

    createOrSkip(
        'sp_widget',
        function(gr) { gr.addQuery('id', 'oi-maintenance-overlay'); },
        function(gr) {
            gr.setValue('id',            'oi-maintenance-overlay');
            gr.setValue('name',          'OI - Maintenance Overlay');
            gr.setValue('template',      overlayHTML);
            gr.setValue('script',        overlayServer);
            gr.setValue('client_script', overlayClient);
            gr.setValue('css',           overlayCss);
            gr.setValue('servicenow',    false);
        },
        'Widget: oi-maintenance-overlay'
    );

    // ── 4. Widget: oi-maintenance-control-panel ───────────────
    gs.print('');
    gs.print(DIV2);
    gs.print('  4 / 4  WIDGET: oi-maintenance-control-panel');
    gs.print(DIV2);

    // HTML template ────────────────────────────────────────────
    var cpHTML = [
        '<div class="oi-maint-cp">',
        '  <div class="oi-cp-header">',
        '    <h3 class="oi-cp-heading">Maintenance Control</h3>',
        '    <p class="oi-cp-sub">Manage maintenance state for individual sections or the entire application.</p>',
        '  </div>',
        '  <div class="oi-cp-card oi-cp-app-card" ng-class="{\'oi-app-active\': c.isAll}">',
        '    <div class="oi-cp-row">',
        '      <div class="oi-cp-label-group">',
        '        <span class="oi-label-main">Entire Application</span>',
        '        <span class="oi-label-sub">Supersedes individual section toggles. Enables the Export button.</span>',
        '      </div>',
        '      <div class="oi-toggle-wrap">',
        '        <label class="oi-toggle">',
        '          <input type="checkbox" ng-model="c.isAll" ng-change="c.onAppToggle()"/>',
        '          <span class="oi-toggle-track"></span>',
        '        </label>',
        '        <span class="oi-badge" ng-class="c.isAll ? \'oi-badge-maint\' : \'oi-badge-live\'">',
        '          {{c.isAll ? \'Maintenance\' : \'Live\'}}',
        '        </span>',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <div class="oi-cp-card oi-cp-section-card">',
        '    <p class="oi-section-grid-label">Section overrides</p>',
        '    <div class="oi-section-row" ng-repeat="sec in c.sections" ng-class="{\'oi-row-dimmed\': c.isAll}">',
        '      <span class="oi-label-main">{{sec.label}}</span>',
        '      <div class="oi-toggle-wrap">',
        '        <label class="oi-toggle" ng-class="{\'oi-toggle-locked\': c.isAll}">',
        '          <input type="checkbox" ng-model="sec.active" ng-disabled="c.isAll" ng-change="c.onSectionToggle(sec)"/>',
        '          <span class="oi-toggle-track"></span>',
        '        </label>',
        '        <span class="oi-badge" ng-class="(c.isAll || sec.active) ? \'oi-badge-maint\' : \'oi-badge-live\'">',
        '          {{(c.isAll || sec.active) ? \'Maintenance\' : \'Live\'}}',
        '        </span>',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <div class="oi-cp-card">',
        '    <div class="oi-cp-field">',
        '      <label class="oi-field-label">Maintenance Message <span class="oi-optional">(optional)</span></label>',
        '      <textarea class="oi-textarea" ng-model="c.message" rows="3"',
        '                placeholder="Shown to users on the overlay. Leave blank for default text."></textarea>',
        '    </div>',
        '    <div class="oi-cp-field">',
        '      <label class="oi-field-label">Estimated Return <span class="oi-optional">(optional)</span></label>',
        '      <input type="datetime-local" class="oi-input" ng-model="c.returnAt"/>',
        '      <span class="oi-field-hint">Displays as "Back at 14:30" or "Back in ~25 min" on the overlay.</span>',
        '    </div>',
        '    <button class="oi-btn oi-btn-primary" ng-click="c.applyMessageSettings()" ng-disabled="c.saving">',
        '      <span ng-if="!c.saving">Apply Message &amp; Return Time</span>',
        '      <span ng-if="c.saving">Saving&#8230;</span>',
        '    </button>',
        '  </div>',
        '  <div class="oi-cp-card oi-cp-export-card" ng-class="{\'oi-export-unlocked\': c.isAll}">',
        '    <div class="oi-cp-row">',
        '      <div class="oi-cp-label-group">',
        '        <span class="oi-label-main">Export Application XML</span>',
        '        <span class="oi-label-sub" ng-if="!c.isAll">&#x1F512; Put the entire application in maintenance first</span>',
        '        <span class="oi-label-sub oi-export-ready-label" ng-if="c.isAll">&#x2714; Application is in maintenance &#x2014; export is available</span>',
        '      </div>',
        '      <button class="oi-btn oi-btn-export" ng-click="c.exportXML()"',
        '              ng-disabled="!c.isAll || c.exporting"',
        '              title="{{c.isAll ? \'Download application XML\' : \'Put the entire application in maintenance first\'}}">',
        '        <span ng-if="!c.exporting">&#x2B07; Export XML</span>',
        '        <span ng-if="c.exporting">Preparing&#8230;</span>',
        '      </button>',
        '    </div>',
        '    <p ng-if="c.exportMsg" class="oi-export-msg"',
        '       ng-class="c.exportMsgOk ? \'oi-msg-ok\' : \'oi-msg-err\'">{{c.exportMsg}}</p>',
        '  </div>',
        '  <div ng-if="c.statusMsg" class="oi-status-bar" ng-class="c.statusClass" role="status">',
        '    {{c.statusMsg}}',
        '  </div>',
        '</div>'
    ].join('\n');

    // Server script ────────────────────────────────────────────
    var cpServer = [
        '(function() {',
        '    data.isAdmin = gs.hasRole(\'admin\');',
        '    if (!data.isAdmin) { return; }',
        '    var mm     = new MaintenanceManager();',
        '    var status = mm.getStatus();',
        '    data.sections    = status.sections;',
        '    data.isAll       = (status.sections.indexOf(\'all\') !== -1);',
        '    data.message     = status.message;',
        '    data.returnAt    = status.returnAt;',
        '    data.initiatedBy = status.initiatedBy;',
        '    data.initiatedAt = status.initiatedAt;',
        '})();'
    ].join('\n');

    // Client controller ────────────────────────────────────────
    var cpClient = [
        'function($scope, $window, $timeout) {',
        '    var c = this;',
        '    var SECTIONS = [',
        '        {id:\'workspace\',  label:\'Workspace\'},',
        '        {id:\'activity\',   label:\'My Activity\'},',
        '        {id:\'studio\',     label:\'Operations Studio\'},',
        '        {id:\'governance\', label:\'Operations Governance\'},',
        '        {id:\'command\',    label:\'Operations Command\'}',
        '    ];',
        '    c.isAll=c.data.isAll||false; c.message=c.data.message||\'\';',
        '    c.returnAt=c.data.returnAt||\'\'; c.saving=false; c.exporting=false;',
        '    c.statusMsg=\'\'; c.statusClass=\'\'; c.exportMsg=\'\'; c.exportMsgOk=false;',
        '    var active = c.data.sections||[];',
        '    c.sections = SECTIONS.map(function(s){',
        '        return {id:s.id,label:s.label,active:active.indexOf(s.id)!==-1};});',
        '    c.onAppToggle = function() {',
        '        if (c.isAll) {',
        '            _ajax(\'ajaxSetMaintenance\',{sysparm_sections:\'["all"]\',sysparm_message:c.message,sysparm_return_at:c.returnAt},function(r){',
        '                if(r.success){_fb(\'Entire application placed in maintenance.\',\'ok\');}',
        '                else{c.isAll=false;_fb(r.error||\'Error\',\'err\');}});',
        '        } else {',
        '            _ajax(\'ajaxClearMaintenance\',{sysparm_sections:\'["all"]\'},function(r){',
        '                if(r.success){c.sections.forEach(function(s){s.active=false;});_fb(\'Application maintenance cleared.\',\'ok\');}',
        '                else{c.isAll=true;_fb(r.error||\'Error\',\'err\');}});',
        '        }',
        '    };',
        '    c.onSectionToggle = function(sec) {',
        '        if (sec.active) {',
        '            _ajax(\'ajaxSetMaintenance\',{sysparm_sections:JSON.stringify([sec.id]),sysparm_message:c.message,sysparm_return_at:c.returnAt},function(r){',
        '                if(r.success){_fb(sec.label+\' set to maintenance.\',\'ok\');}',
        '                else{sec.active=false;_fb(r.error||\'Error\',\'err\');}});',
        '        } else {',
        '            _ajax(\'ajaxClearMaintenance\',{sysparm_sections:JSON.stringify([sec.id])},function(r){',
        '                if(r.success){_fb(sec.label+\' restored to live.\',\'ok\');}',
        '                else{sec.active=true;_fb(r.error||\'Error\',\'err\');}});',
        '        }',
        '    };',
        '    c.applyMessageSettings = function() {',
        '        var secs = c.isAll?[\'all\']:c.sections.filter(function(s){return s.active;}).map(function(s){return s.id;});',
        '        if (!secs.length){_fb(\'No sections are currently in maintenance.\',\'warn\');return;}',
        '        c.saving=true;',
        '        _ajax(\'ajaxSetMaintenance\',{sysparm_sections:JSON.stringify(secs),sysparm_message:c.message,sysparm_return_at:c.returnAt},function(r){',
        '            c.saving=false;',
        '            if(r.success){_fb(\'Message and return time updated.\',\'ok\');}',
        '            else{_fb(r.error||\'Error\',\'err\');}});',
        '    };',
        '    c.exportXML = function() {',
        '        if(!c.isAll||c.exporting){return;}',
        '        c.exporting=true; c.exportMsg=\'\';',
        '        _ajax(\'ajaxGetExportURL\',{},function(r){',
        '            c.exporting=false;',
        '            if(r.url){$window.open(r.url,\'_blank\');',
        '                c.exportMsg=\'Application XML download started — check your browser downloads.\';',
        '                c.exportMsgOk=true;',
        '            } else {c.exportMsg=r.error||\'Could not retrieve export URL.\';c.exportMsgOk=false;}',
        '        });',
        '    };',
        '    var _dt=null;',
        '    function _fb(msg,type){',
        '        c.statusMsg=msg;',
        '        c.statusClass={ok:\'oi-status-ok\',warn:\'oi-status-warn\',err:\'oi-status-err\'}[type]||\'\';',
        '        if(_dt){$timeout.cancel(_dt);}',
        '        _dt=$timeout(function(){c.statusMsg=\'\';},4500);',
        '    }',
        '    function _ajax(method,params,cb){',
        '        var ga=new GlideAjax(\'MaintenanceManager\');',
        '        ga.addParam(\'sysparm_name\',method);',
        '        Object.keys(params).forEach(function(k){ga.addParam(k,params[k]);});',
        '        ga.getXMLAnswer(function(answer){',
        '            var res={};',
        '            try{res=JSON.parse(answer);}catch(e){res={error:\'Parse error\'};}',
        '            cb(res);',
        '            if(!$scope.$$phase){$scope.$apply();}',
        '        });',
        '    }',
        '}'
    ].join('\n');

    // CSS ──────────────────────────────────────────────────────
    var cpCss = [
        '.oi-maint-cp{padding:4px 2px 20px;font-family:inherit}',
        '.oi-cp-header{margin-bottom:20px}',
        '.oi-cp-heading{font-size:1.2rem;font-weight:700;color:#0f172a;margin:0 0 5px}',
        '.oi-cp-sub{font-size:.83rem;color:#64748b;line-height:1.55;margin:0;max-width:560px}',
        '.oi-cp-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:14px}',
        '.oi-cp-app-card.oi-app-active{border-color:#f59e0b;background:#fffbeb}',
        '.oi-cp-row{display:flex;align-items:center;justify-content:space-between;gap:16px}',
        '.oi-cp-label-group{flex:1;min-width:0}',
        '.oi-label-main{font-size:.95rem;font-weight:600;color:#1e293b;display:block}',
        '.oi-label-sub{font-size:.8rem;color:#94a3b8;display:block;margin-top:3px}',
        '.oi-export-ready-label{color:#059669!important}',
        '.oi-toggle-wrap{display:flex;align-items:center;gap:10px;flex-shrink:0}',
        '.oi-toggle{position:relative;display:inline-block;width:44px;height:24px;cursor:pointer}',
        '.oi-toggle input{opacity:0;width:0;height:0;position:absolute}',
        '.oi-toggle-track{position:absolute;inset:0;background:#cbd5e1;border-radius:24px;transition:background .22s}',
        '.oi-toggle-track::before{content:\'\';position:absolute;width:18px;height:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .22s}',
        '.oi-toggle input:checked+.oi-toggle-track{background:#f59e0b}',
        '.oi-toggle input:checked+.oi-toggle-track::before{transform:translateX(20px)}',
        '.oi-toggle-locked{opacity:.38;cursor:not-allowed;pointer-events:none}',
        '.oi-badge{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:3px 10px;border-radius:20px;min-width:80px;text-align:center;display:inline-block;flex-shrink:0}',
        '.oi-badge-maint{background:#fef3c7;color:#92400e;border:1px solid #fde68a}',
        '.oi-badge-live{background:#d1fae5;color:#065f46;border:1px solid #a7f3d0}',
        '.oi-cp-section-card{padding:12px 20px}',
        '.oi-section-grid-label{font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin:0 0 10px}',
        '.oi-section-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;transition:opacity .2s}',
        '.oi-section-row:last-child{border-bottom:none}',
        '.oi-row-dimmed{opacity:.5}',
        '.oi-cp-field{margin-bottom:16px}',
        '.oi-field-label{display:block;font-size:.85rem;font-weight:600;color:#374151;margin-bottom:6px}',
        '.oi-optional{font-weight:400;color:#9ca3af;font-size:.82rem}',
        '.oi-textarea,.oi-input{width:100%;border:1px solid #e2e8f0;border-radius:7px;padding:9px 13px;font-size:.875rem;color:#1e293b;background:#fff;box-sizing:border-box;transition:border-color .2s,box-shadow .2s;resize:vertical}',
        '.oi-textarea:focus,.oi-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12);outline:none}',
        '.oi-field-hint{display:block;font-size:.75rem;color:#9ca3af;margin-top:5px;line-height:1.5}',
        '.oi-btn{display:inline-flex;align-items:center;gap:6px;border:none;border-radius:7px;padding:10px 22px;font-size:.875rem;font-weight:600;cursor:pointer;transition:background .2s,opacity .2s}',
        '.oi-btn[disabled]{opacity:.5;cursor:not-allowed}',
        '.oi-btn-primary{background:#6366f1;color:#fff;margin-top:4px}',
        '.oi-btn-primary:hover:not([disabled]){background:#4f46e5}',
        '.oi-cp-export-card{transition:border-color .25s,background .25s}',
        '.oi-cp-export-card.oi-export-unlocked{border-color:#34d399;background:#f0fdf4}',
        '.oi-btn-export{background:#e2e8f0;color:#94a3b8;flex-shrink:0;cursor:not-allowed}',
        '.oi-export-unlocked .oi-btn-export{background:#0f172a;color:#f8fafc;cursor:pointer}',
        '.oi-export-unlocked .oi-btn-export:hover:not([disabled]){background:#1e293b}',
        '.oi-export-msg{margin:10px 0 0;font-size:.8rem;font-weight:500}',
        '.oi-msg-ok{color:#059669}.oi-msg-err{color:#dc2626}',
        '.oi-status-bar{border-radius:7px;padding:9px 16px;font-size:.85rem;font-weight:500;margin-top:4px}',
        '.oi-status-ok{background:#d1fae5;color:#065f46;border:1px solid #a7f3d0}',
        '.oi-status-warn{background:#fef3c7;color:#92400e;border:1px solid #fde68a}',
        '.oi-status-err{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}'
    ].join('\n');

    createOrSkip(
        'sp_widget',
        function(gr) { gr.addQuery('id', 'oi-maintenance-control-panel'); },
        function(gr) {
            gr.setValue('id',            'oi-maintenance-control-panel');
            gr.setValue('name',          'OI - Maintenance Control Panel');
            gr.setValue('template',      cpHTML);
            gr.setValue('script',        cpServer);
            gr.setValue('client_script', cpClient);
            gr.setValue('css',           cpCss);
            gr.setValue('servicenow',    false);
        },
        'Widget: oi-maintenance-control-panel'
    );

    // ── Summary ───────────────────────────────────────────────
    gs.print('');
    gs.print(DIV);
    gs.print('  BUILD COMPLETE');
    gs.print(DIV);
    gs.print('  Created : ' + report.created.length);
    gs.print('  Skipped : ' + report.skipped.length + ' (already existed)');
    gs.print('  Failed  : ' + report.failed.length);
    gs.print('');

    if (report.failed.length > 0) {
        gs.print('  FAILURES:');
        report.failed.forEach(function(f) { gs.print('    [FAIL] ' + f); });
        gs.print('');
    }

    if (report.created.length > 0) {
        gs.print('  CREATED:');
        report.created.forEach(function(c) { gs.print('    [OK]   ' + c); });
        gs.print('');
    }

    gs.print('  NEXT STEPS:');
    gs.print('  1. Add "oi-maintenance-control-panel" widget to the Command section page');
    gs.print('     (only visible to admin role — server script guards it)');
    gs.print('  2. In the Content Area widget, add maintenance polling:');
    gs.print('     - Server: call MaintenanceManager.isInMaintenance(sectionId)');
    gs.print('     - Template: ng-if to swap content with oi-maintenance-overlay widget');
    gs.print('     - Widget options: section_id and section_label for the overlay');
    gs.print('  3. Run 02_verify_implementation.js — all 19 properties must pass');
    gs.print(DIV);
    gs.print('');

})();
