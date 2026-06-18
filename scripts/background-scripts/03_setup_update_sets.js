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
//   4. Confirm the output shows all 4 child sets created
//   5. Confirm the active update set banner changes to
//      "OI v1.0 — Data Foundation"
//
// WHAT THIS CREATES:
//   - 1 batch parent: "Operations Intelligence v1.0.0"
//   - 4 child update sets in dependency order:
//       1. OI v1.0 — Data Foundation
//       2. OI v1.0 — Application Logic
//       3. OI v1.0 — Notifications & VA
//       4. OI v1.0 — Portal Interface
//   - Sets "OI v1.0 — Data Foundation" as the active update set
//
// DO NOT re-run this script if the batch already exists —
// check System Update Sets > Batch Update Sets first.
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

    // ── Guard: check if batch already exists ─────────────────
    var existingBatch = new GlideRecord('sys_update_set_batch');
    existingBatch.addQuery('name', 'Operations Intelligence v1.0.0');
    existingBatch.setLimit(1);
    existingBatch.query();
    if (existingBatch.next()) {
        gs.print('WARNING: Batch update set "Operations Intelligence v1.0.0" already exists.');
        gs.print('         Sys ID: ' + existingBatch.getUniqueValue());
        gs.print('         Run aborted — no changes made.');
        gs.print('         To rebuild, delete the existing batch and its children first.');
        gs.print('');
        gs.print(DIV);
        return;
    }

    // ── Create batch parent ───────────────────────────────────
    var batch = new GlideRecord('sys_update_set_batch');
    batch.initialize();
    batch.setValue('name', 'Operations Intelligence v1.0.0');
    batch.setValue('description',
        'Full Operations Intelligence platform — ' +
        'dev to test to production migration batch. ' +
        'Scope: ' + scope + '. ' +
        'Contains 4 child sets covering Data Foundation, ' +
        'Application Logic, Notifications & VA, and Portal Interface.');
    batch.setValue('state', 'building');
    var batchSysId = batch.insert();

    if (!batchSysId) {
        gs.print('ERROR: Failed to create batch update set. Check permissions.');
        return;
    }
    gs.print('  [OK] Batch parent created: "Operations Intelligence v1.0.0"');
    gs.print('       Sys ID: ' + batchSysId);
    gs.print('');

    // ── Child set definitions ─────────────────────────────────
    var children = [
        {
            name: 'OI v1.0 — Data Foundation',
            description:
                'Custom tables (19), field definitions, choice lists, reference fields. ' +
                'Roles and ACLs (table-level, row-level, field-level). ' +
                'Seed data: automation_category + approved_flow records. ' +
                'BUILD ORDER: Steps 1–3.',
            order: 100
        },
        {
            name: 'OI v1.0 — Application Logic',
            description:
                'Script Includes (20, in dependency order), Business Rules (5), ' +
                'Scheduled Jobs (5, initially inactive), system properties (14). ' +
                'BUILD ORDER: Steps 4–6 + properties.',
            order: 200
        },
        {
            name: 'OI v1.0 — Notifications & VA',
            description:
                'Notification templates (22), VA Channel (Operations Assistant), ' +
                'NLU Model (Operations Intelligence NLU), VA System Topics (23). ' +
                'NOTE: NLU model weights do NOT migrate — retrain after promoting. ' +
                'BUILD ORDER: Steps 7–10.',
            order: 300
        },
        {
            name: 'OI v1.0 — Portal Interface',
            description:
                'Portal record + custom theme, portal pages (main + onboarding), ' +
                'custom widgets (18), GitHub Copilot Connection alias + REST Message. ' +
                'BUILD ORDER: Steps 11–13.',
            order: 400
        }
    ];

    var childSysIds = {};

    children.forEach(function(child) {
        var gr = new GlideRecord('sys_update_set');
        gr.initialize();
        gr.setValue('name', child.name);
        gr.setValue('description', child.description);
        gr.setValue('state', 'building');
        gr.setValue('application', gs.getCurrentApplicationID());
        gr.setValue('batch_parent', batchSysId);
        var sysId = gr.insert();

        if (!sysId) {
            gs.print('  [FAIL] Could not create child set: ' + child.name);
        } else {
            childSysIds[child.name] = sysId;
            gs.print('  [OK]  Child created: "' + child.name + '"');
            gs.print('        Sys ID: ' + sysId);
        }
    });

    gs.print('');

    // ── Activate "Data Foundation" as the current update set ──
    var dataFoundationName = 'OI v1.0 — Data Foundation';
    var dataFoundationSysId = childSysIds[dataFoundationName];

    if (!dataFoundationSysId) {
        gs.print('ERROR: Could not activate Data Foundation set — sys_id not found.');
        gs.print('       Set it manually: System Update Sets > Local Update Sets > click it > Make Current.');
    } else {
        gs.setProperty('sys_update_set', dataFoundationSysId);

        // Verify activation
        var currentSet = gs.getProperty('sys_update_set');
        if (currentSet === dataFoundationSysId) {
            gs.print('  [OK] Active update set changed to: "' + dataFoundationName + '"');
        } else {
            gs.print('  [WARN] Automatic activation may not have worked for your session.');
            gs.print('         Set it manually: System Update Sets > Local Update Sets');
            gs.print('         > "' + dataFoundationName + '" > Make Current.');
        }
    }

    // ── Print migration guidance ──────────────────────────────
    gs.print('');
    gs.print(DIV2);
    gs.print('  ENVIRONMENT-SPECIFIC CONFIG (keep separate — NOT in batch)');
    gs.print(DIV2);
    gs.print('');
    gs.print('  Create one manual update set per environment (do not add to batch):');
    gs.print('    - OI — Environment Config (dev)');
    gs.print('    - OI — Environment Config (test)');
    gs.print('    - OI — Environment Config (prod)');
    gs.print('');
    gs.print('  Contents: debug_mode, copilot_api_endpoint, connection aliases,');
    gs.print('            integration credentials.');
    gs.print('  Apply each manually on the target instance after batch promotion.');
    gs.print('');
    gs.print(DIV2);
    gs.print('  SWITCH ACTIVE SET DURING BUILD');
    gs.print(DIV2);
    gs.print('');
    gs.print('  Steps 1-3  (tables, ACLs, seed data)  -> OI v1.0 — Data Foundation');
    gs.print('  Steps 4-6  (SIs, BRs, Jobs) + props   -> OI v1.0 — Application Logic');
    gs.print('  Steps 7-10 (notifications, VA, NLU)   -> OI v1.0 — Notifications & VA');
    gs.print('  Steps 11-13 (portal, widgets, Copilot) -> OI v1.0 — Portal Interface');
    gs.print('');
    gs.print('  Switch via: System Update Sets > Local Update Sets');
    gs.print('              > click the target child > Make Current');
    gs.print('');
    gs.print(DIV2);
    gs.print('  NLU MODEL NOTE');
    gs.print(DIV2);
    gs.print('');
    gs.print('  After promoting the batch to test or production, trigger');
    gs.print('  a fresh NLU training run on that instance:');
    gs.print('');
    gs.print('  POST /api/sn_nlu/v1/model/{nlu_model_sys_id}/train');
    gs.print('  Authorization: Basic {svc_claude_api credentials on that instance}');
    gs.print('');
    gs.print('  Trained model weights are NOT captured in update sets.');
    gs.print('');
    gs.print(DIV);
    gs.print('  SETUP COMPLETE');
    gs.print('  Next step: begin Build Order step 1 (custom tables).');
    gs.print('  Active update set: "' + dataFoundationName + '"');
    gs.print(DIV);
    gs.print('');

})();
