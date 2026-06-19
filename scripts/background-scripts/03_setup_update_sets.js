// ============================================================
// OPERATIONS INTELLIGENCE — UPDATE SET SETUP
// ============================================================
// Run this AFTER 01_bootstrap_api_access.js has been run and
// you have captured the scope prefix and service account
// credentials from its output.
//
// HOW TO USE:
//   1. Ensure scope is set to your Operations Intelligence app
//      (scope picker in top-right banner)
//   2. Navigate to: System Definition > Scripts - Background
//   3. Paste this ENTIRE script and click "Run script"
//   4. Confirm the active update set banner changes to
//      "Operations Intelligence v1.0.0"
//
// WHAT THIS CREATES:
//   1. "Operations Intelligence v1.0.0"
//      Single update set capturing the entire platform build.
//      All 15 build steps write into this one set.
//
//   2. "OI — Environment Config (dev)"
//      Separate set for environment-specific properties.
//      NOT included in the main migration — applied manually
//      per environment after the app is promoted.
//
// MIGRATION APPROACH:
//   Preferred  — Studio Application Export (File > Export to XML)
//   Fallback   — Export "Operations Intelligence v1.0.0" as XML
//   In either case, apply "OI — Environment Config" manually
//   on each target instance, then retrain the NLU model.
//
// DO NOT re-run if the update sets already exist.
// ============================================================

(function setupOIUpdateSets() {
    'use strict';

    var scope = gs.getCurrentScopeName();
    if (!scope || scope === 'global') {
        gs.print('ERROR: Switch to your Operations Intelligence scope before running this script.');
        gs.print('Use the scope picker in the top-right banner.');
        return;
    }

    var DIV  = '='.repeat(64);
    var DIV2 = '-'.repeat(64);

    gs.print('');
    gs.print(DIV);
    gs.print('  OPERATIONS INTELLIGENCE — UPDATE SET SETUP');
    gs.print(DIV);
    gs.print('');
    gs.print('  Scope: ' + scope);
    gs.print('');

    // ── Guard: check if main set already exists ───────────────
    var mainSetName = 'Operations Intelligence v1.0.0';
    var existing = new GlideRecord('sys_update_set');
    existing.addQuery('name', mainSetName);
    existing.addQuery('application', gs.getCurrentApplicationID());
    existing.setLimit(1);
    existing.query();
    if (existing.next()) {
        gs.print('WARNING: Update set "' + mainSetName + '" already exists.');
        gs.print('         Sys ID: ' + existing.getUniqueValue());
        gs.print('         Run aborted — no changes made.');
        gs.print('');
        gs.print(DIV);
        return;
    }

    var createdSysIds = {};

    // ── Helper ────────────────────────────────────────────────
    function createUpdateSet(name, description) {
        var gr = new GlideRecord('sys_update_set');
        gr.initialize();
        gr.setValue('name', name);
        gr.setValue('description', description);
        gr.setValue('state', 'building');
        gr.setValue('application', gs.getCurrentApplicationID());
        var sysId = gr.insert();
        if (!sysId) {
            gs.print('  [FAIL] Could not create: "' + name + '"');
            return null;
        }
        gs.print('  [OK]  Created: "' + name + '"');
        gs.print('        Sys ID: ' + sysId);
        return sysId;
    }

    // ── 1. Main build update set ──────────────────────────────
    createdSysIds.main = createUpdateSet(
        mainSetName,
        'Complete Operations Intelligence platform build — all 19 tables, ' +
        '20 Script Includes, 5 Business Rules, 5 Scheduled Jobs, 14 properties, ' +
        '22 notifications, VA Channel, NLU model, 23 VA topics, portal, ' +
        '18 widgets. Scope: ' + scope + '. ' +
        'Migrate via Studio Application Export (preferred) or this update set XML.'
    );

    gs.print('');

    // ── 2. Environment config sets (separate — not migrated with app) ──
    var envSets = [
        {
            name: 'OI — Environment Config (dev)',
            description:
                'Environment-specific properties for DEV. ' +
                'Contents: debug_mode, copilot_api_endpoint, connection aliases, ' +
                'integration credentials. ' +
                'NOT included in the main app migration — apply manually on dev only.'
        },
        {
            name: 'OI — Environment Config (test)',
            description:
                'Environment-specific properties for TEST. ' +
                'Apply manually on the test instance after promoting the main app. ' +
                'Never apply this set on dev or production.'
        },
        {
            name: 'OI — Environment Config (prod)',
            description:
                'Environment-specific properties for PRODUCTION. ' +
                'Apply manually on the production instance after promoting the main app. ' +
                'Never apply this set on dev or test.'
        }
    ];

    envSets.forEach(function(s) {
        createUpdateSet(s.name, s.description);
    });

    gs.print('');

    // ── Activate the main set ─────────────────────────────────
    if (createdSysIds.main) {
        gs.setProperty('sys_update_set', createdSysIds.main);
        var currentSet = gs.getProperty('sys_update_set');
        if (currentSet === createdSysIds.main) {
            gs.print('  [OK] Active update set set to: "' + mainSetName + '"');
        } else {
            gs.print('  [WARN] Automatic activation may not have taken effect.');
            gs.print('         Set it manually:');
            gs.print('         System Update Sets > Local Update Sets');
            gs.print('         > "' + mainSetName + '" > Make Current');
        }
    }

    // ── Print guidance ────────────────────────────────────────
    gs.print('');
    gs.print(DIV2);
    gs.print('  MIGRATION GUIDANCE');
    gs.print(DIV2);
    gs.print('');
    gs.print('  PREFERRED — Studio Application Export:');
    gs.print('    Studio > File > Export to XML');
    gs.print('    Import on target: System Applications > All Applications > Upload');
    gs.print('');
    gs.print('  FALLBACK — Update Set XML:');
    gs.print('    Export "' + mainSetName + '" as XML');
    gs.print('    Import on target: System Update Sets > Retrieved Update Sets > Import XML');
    gs.print('    Preview, resolve conflicts, apply');
    gs.print('');
    gs.print('  AFTER MIGRATING TO EACH ENVIRONMENT:');
    gs.print('    1. Apply the matching "OI — Environment Config" set manually');
    gs.print('    2. Retrain NLU model:');
    gs.print('       POST /api/sn_nlu/v1/model/{nlu_model_sys_id}/train');
    gs.print('       Authorization: Basic {svc_ops_int_api on that instance}');
    gs.print('    3. Run 02_verify_implementation.js — all checks must pass');
    gs.print('    4. (Production only) Activate Scheduled Jobs');
    gs.print('');
    gs.print(DIV);
    gs.print('  SETUP COMPLETE');
    gs.print('  Active update set: "' + mainSetName + '"');
    gs.print('  Next step: begin Build Order step 1 (custom tables).');
    gs.print(DIV);
    gs.print('');

})();
