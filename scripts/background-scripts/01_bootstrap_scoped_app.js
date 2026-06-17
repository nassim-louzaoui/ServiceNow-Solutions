// ============================================================
// SERVICENOW SCOPED APPLICATION BOOTSTRAP SCRIPT
// ============================================================
// HOW TO USE:
//   1. In ServiceNow, create your Scoped Application via Studio
//      (System Applications > Studio > Create Application)
//   2. Switch your application scope to your new app using the
//      scope picker in the top-right of the ServiceNow banner
//   3. Navigate to: System Definition > Scripts - Background
//   4. Paste this ENTIRE script and click "Run script"
//   5. Screenshot the output and share it
// ============================================================

(function bootstrapScopedApp() {
    'use strict';

    var report = {
        status: 'RUNNING',
        environment: {},
        created: [],
        skipped: [],
        errors: []
    };

    var scope = gs.getCurrentScopeName();

    // ── GUARD: Must NOT be run in global scope ────────────────
    if (scope === 'global' || !scope) {
        gs.print('');
        gs.print('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        gs.print('  ERROR: This script is running in GLOBAL scope.');
        gs.print('  You must switch to your scoped application first.');
        gs.print('  Use the scope picker (top-right of the banner)');
        gs.print('  then re-run this script.');
        gs.print('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        gs.print('');
        return;
    }

    // ── HELPERS ──────────────────────────────────────────────
    function siExists(name) {
        var gr = new GlideRecord('sys_script_include');
        gr.addQuery('name', name);
        gr.addQuery('sys_scope.scope', scope);
        gr.setLimit(1);
        gr.query();
        return gr.next() ? gr.getUniqueValue() : null;
    }

    function propExists(name) {
        var gr = new GlideRecord('sys_properties');
        gr.addQuery('name', name);
        gr.setLimit(1);
        gr.query();
        return gr.next() ? gr.getUniqueValue() : null;
    }

    function col(str, width) {
        str = String(str || '');
        return str.length >= width ? str : str + new Array(width - str.length + 1).join(' ');
    }

    // ── 1. ENVIRONMENT DIAGNOSTICS ───────────────────────────
    (function diagnose() {
        var appInfo = {};

        // Check sys_app (custom scoped apps)
        var appGr = new GlideRecord('sys_app');
        appGr.addQuery('scope', scope);
        appGr.setLimit(1);
        appGr.query();
        if (appGr.next()) {
            appInfo = {
                name:    appGr.getValue('name'),
                scope:   appGr.getValue('scope'),
                version: appGr.getValue('version') || '1.0.0',
                sysId:   appGr.getUniqueValue(),
                vendor:  appGr.getValue('vendor') || ''
            };
        } else {
            // Fallback: check sys_scope (all scopes including plugins)
            var scopeGr = new GlideRecord('sys_scope');
            scopeGr.addQuery('scope', scope);
            scopeGr.setLimit(1);
            scopeGr.query();
            if (scopeGr.next()) {
                appInfo = {
                    name:  scopeGr.getValue('name'),
                    scope: scopeGr.getValue('scope'),
                    sysId: scopeGr.getUniqueValue()
                };
            }
        }

        report.environment = {
            currentScope:    scope,
            appName:         appInfo.name  || '(not found in sys_app)',
            appSysId:        appInfo.sysId || 'N/A',
            appVersion:      appInfo.version || 'N/A',
            appVendor:       appInfo.vendor  || 'N/A',
            instanceName:    gs.getProperty('instance_name') || 'unknown',
            buildTag:        gs.getProperty('glide.buildtag') ||
                             gs.getProperty('glide.build.date') || 'unknown',
            currentUser:     gs.getUserName(),
            userEmail:       gs.getUser() ? gs.getUser().getEmail() : 'N/A',
            isAdmin:         gs.hasRole('admin'),
            isAppDeveloper:  gs.hasRole('app_engine_studio_developer') ||
                             gs.hasRole('admin'),
            timestamp:       new GlideDateTime().getDisplayValue()
        };
    })();

    // ── 2. SCRIPT INCLUDE: AppLogger ─────────────────────────
    (function createLogger() {
        var name = 'AppLogger';
        var existing = siExists(name);
        if (existing) {
            report.skipped.push({ type: 'ScriptInclude', name: name, sysId: existing });
            return;
        }

        var gr = new GlideRecord('sys_script_include');
        gr.initialize();
        gr.setValue('name', name);
        gr.setValue('active', true);
        gr.setValue('client_callable', false);
        gr.setValue('access', 'package_private');
        gr.setValue('description', 'Centralised logging for the scoped application. ' +
                                   'Respects ' + scope + '.debug_mode property.');
        gr.setValue('script',
            'var AppLogger = Class.create();\n' +
            'AppLogger.prototype = {\n' +
            '    initialize: function(source) {\n' +
            '        this.source = source || "App";\n' +
            '    },\n' +
            '\n' +
            '    info: function(msg) {\n' +
            '        gs.log("[" + this.source + "] " + msg, this.source);\n' +
            '    },\n' +
            '\n' +
            '    warn: function(msg) {\n' +
            '        gs.logWarning("[" + this.source + "] " + msg, this.source);\n' +
            '    },\n' +
            '\n' +
            '    error: function(msg) {\n' +
            '        gs.logError("[" + this.source + "] " + msg, this.source);\n' +
            '    },\n' +
            '\n' +
            '    debug: function(msg) {\n' +
            '        if (gs.getProperty("' + scope + '.debug_mode") === "true")\n' +
            '            gs.log("[DEBUG][" + this.source + "] " + msg, this.source);\n' +
            '    },\n' +
            '\n' +
            '    type: "AppLogger"\n' +
            '};'
        );

        var sysId = gr.insert();
        if (sysId) {
            report.created.push({ type: 'ScriptInclude', name: name, sysId: sysId });
        } else {
            report.errors.push({ type: 'ScriptInclude', name: name,
                                 error: 'insert() returned no sysId — check scope & permissions' });
        }
    })();

    // ── 3. SCRIPT INCLUDE: AppUtils ──────────────────────────
    (function createUtils() {
        var name = 'AppUtils';
        var existing = siExists(name);
        if (existing) {
            report.skipped.push({ type: 'ScriptInclude', name: name, sysId: existing });
            return;
        }

        var gr = new GlideRecord('sys_script_include');
        gr.initialize();
        gr.setValue('name', name);
        gr.setValue('active', true);
        gr.setValue('client_callable', false);
        gr.setValue('access', 'package_private');
        gr.setValue('description', 'Core utility helpers for the scoped application.');
        gr.setValue('script',
            'var AppUtils = Class.create();\n' +
            'AppUtils.prototype = {\n' +
            '    initialize: function() {},\n' +
            '\n' +
            '    // Safely read a GlideRecord field (returns "" on error)\n' +
            '    getVal: function(gr, field) {\n' +
            '        try { return gr.getValue(field) || ""; } catch(e) { return ""; }\n' +
            '    },\n' +
            '\n' +
            '    // Safe JSON.parse — returns null on failure\n' +
            '    parseJSON: function(str) {\n' +
            '        try { return JSON.parse(str); } catch(e) { return null; }\n' +
            '    },\n' +
            '\n' +
            '    // Safe JSON.stringify — returns "{}" on failure\n' +
            '    toJSON: function(obj) {\n' +
            '        try { return JSON.stringify(obj); } catch(e) { return "{}"; }\n' +
            '    },\n' +
            '\n' +
            '    // Get a system property with an optional default\n' +
            '    getProp: function(name, defaultVal) {\n' +
            '        return gs.getProperty(name) || defaultVal || "";\n' +
            '    },\n' +
            '\n' +
            '    // True if string is null/undefined/whitespace\n' +
            '    isEmpty: function(str) {\n' +
            '        return !str || String(str).trim() === "";\n' +
            '    },\n' +
            '\n' +
            '    // Convert a ServiceNow GlideDateTime to ISO 8601\n' +
            '    toISO: function(gdtStr) {\n' +
            '        var gdt = new GlideDateTime(gdtStr);\n' +
            '        return gdt.getValue(); // UTC: yyyy-MM-dd HH:mm:ss\n' +
            '    },\n' +
            '\n' +
            '    type: "AppUtils"\n' +
            '};'
        );

        var sysId = gr.insert();
        if (sysId) {
            report.created.push({ type: 'ScriptInclude', name: name, sysId: sysId });
        } else {
            report.errors.push({ type: 'ScriptInclude', name: name,
                                 error: 'insert() returned no sysId — check scope & permissions' });
        }
    })();

    // ── 4. SCRIPT INCLUDE: AppConfig ─────────────────────────
    (function createConfig() {
        var name = 'AppConfig';
        var existing = siExists(name);
        if (existing) {
            report.skipped.push({ type: 'ScriptInclude', name: name, sysId: existing });
            return;
        }

        var gr = new GlideRecord('sys_script_include');
        gr.initialize();
        gr.setValue('name', name);
        gr.setValue('active', true);
        gr.setValue('client_callable', false);
        gr.setValue('access', 'package_private');
        gr.setValue('description', 'Reads and caches scoped application configuration properties.');
        gr.setValue('script',
            'var AppConfig = Class.create();\n' +
            'AppConfig.prototype = {\n' +
            '    initialize: function() {\n' +
            '        this._scope = "' + scope + '";\n' +
            '    },\n' +
            '\n' +
            '    get: function(key, defaultVal) {\n' +
            '        return gs.getProperty(this._scope + "." + key) || defaultVal || "";\n' +
            '    },\n' +
            '\n' +
            '    set: function(key, value) {\n' +
            '        gs.setProperty(this._scope + "." + key, value);\n' +
            '    },\n' +
            '\n' +
            '    isDebug: function() {\n' +
            '        return this.get("debug_mode") === "true";\n' +
            '    },\n' +
            '\n' +
            '    getVersion: function() {\n' +
            '        return this.get("version", "1.0.0");\n' +
            '    },\n' +
            '\n' +
            '    type: "AppConfig"\n' +
            '};'
        );

        var sysId = gr.insert();
        if (sysId) {
            report.created.push({ type: 'ScriptInclude', name: name, sysId: sysId });
        } else {
            report.errors.push({ type: 'ScriptInclude', name: name,
                                 error: 'insert() returned no sysId — check scope & permissions' });
        }
    })();

    // ── 5. SYSTEM PROPERTIES ─────────────────────────────────
    (function createProperties() {
        var props = [
            { name: scope + '.debug_mode',  value: 'false', type: 'boolean',
              description: 'Set to true to enable debug-level log output' },
            { name: scope + '.version',     value: '1.0.0', type: 'string',
              description: 'Current version of the scoped application' },
            { name: scope + '.initialized', value: 'true',  type: 'boolean',
              description: 'True once the app bootstrap has completed successfully' }
        ];

        props.forEach(function(prop) {
            if (propExists(prop.name)) {
                report.skipped.push({ type: 'SysProperty', name: prop.name });
                return;
            }
            var gr = new GlideRecord('sys_properties');
            gr.initialize();
            gr.setValue('name',        prop.name);
            gr.setValue('value',       prop.value);
            gr.setValue('description', prop.description);
            gr.setValue('type',        prop.type);
            var sysId = gr.insert();
            if (sysId) {
                report.created.push({ type: 'SysProperty', name: prop.name, sysId: sysId });
            } else {
                report.errors.push({ type: 'SysProperty', name: prop.name,
                                     error: 'insert() returned no sysId' });
            }
        });
    })();

    // ── 6. VALIDATION — quick smoke-test the Script Includes ─
    (function validate() {
        ['AppLogger', 'AppUtils', 'AppConfig'].forEach(function(name) {
            var gr = new GlideRecord('sys_script_include');
            gr.addQuery('name', name);
            gr.addQuery('sys_scope.scope', scope);
            gr.setLimit(1);
            gr.query();
            if (!gr.next()) {
                report.errors.push({
                    type: 'Validation',
                    name: name,
                    error: 'Not found after insert — confirm scope is correct'
                });
            }
        });
    })();

    // ── PRINT REPORT ─────────────────────────────────────────
    report.status = report.errors.length === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS';

    var DIV  = '='.repeat(62);
    var DIV2 = '-'.repeat(62);

    gs.print('');
    gs.print(DIV);
    gs.print('  SCOPED APP BOOTSTRAP REPORT');
    gs.print(DIV);

    gs.print('');
    gs.print('STATUS : ' + report.status);

    gs.print('');
    gs.print('ENVIRONMENT');
    gs.print(DIV2);
    var e = report.environment;
    gs.print('  Scope        : ' + e.currentScope);
    gs.print('  App Name     : ' + e.appName);
    gs.print('  App Sys ID   : ' + e.appSysId);
    gs.print('  App Version  : ' + e.appVersion);
    gs.print('  Vendor       : ' + e.appVendor);
    gs.print('  Instance     : ' + e.instanceName);
    gs.print('  Build Tag    : ' + e.buildTag);
    gs.print('  User         : ' + e.currentUser + '  (' + e.userEmail + ')');
    gs.print('  Is Admin     : ' + e.isAdmin);
    gs.print('  App Dev Role : ' + e.isAppDeveloper);
    gs.print('  Timestamp    : ' + e.timestamp);

    gs.print('');
    gs.print('CREATED  (' + report.created.length + ')');
    gs.print(DIV2);
    if (report.created.length === 0) {
        gs.print('  (none)');
    } else {
        report.created.forEach(function(item) {
            gs.print('  [OK]  ' + col(item.type, 16) + '  ' +
                     col(item.name, 20) + '  ' + item.sysId);
        });
    }

    gs.print('');
    gs.print('SKIPPED  (' + report.skipped.length + ')');
    gs.print(DIV2);
    if (report.skipped.length === 0) {
        gs.print('  (none)');
    } else {
        report.skipped.forEach(function(item) {
            gs.print('  [--]  ' + col(item.type, 16) + '  ' + item.name +
                     '  (already exists)');
        });
    }

    gs.print('');
    gs.print('ERRORS   (' + report.errors.length + ')');
    gs.print(DIV2);
    if (report.errors.length === 0) {
        gs.print('  None — all operations succeeded.');
    } else {
        report.errors.forEach(function(item) {
            gs.print('  [ERR] ' + col(item.type, 16) + '  ' +
                     col(item.name, 20) + '  ' + item.error);
        });
    }

    gs.print('');
    gs.print('NEXT STEPS');
    gs.print(DIV2);
    gs.print('  1. Screenshot this entire output and share it.');
    gs.print('  2. Confirm STATUS is SUCCESS (no errors).');
    gs.print('  3. Confirm Scope matches your scoped app name.');
    gs.print('  4. Share what you want to BUILD in this app');
    gs.print('     so the next script can implement the actual logic.');
    gs.print('');
    gs.print(DIV);
    gs.print('');

})();
