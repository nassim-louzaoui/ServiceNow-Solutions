// ============================================================
// OPERATIONS INTELLIGENCE — SHOW CREDENTIALS
// ============================================================
// Run in ServiceNow Background Scripts (System Definition >
// Scripts - Background) to print the engine key and service
// account password so they can be saved to the local .env file.
//
// HOW TO USE:
//   1. Navigate to System Definition > Scripts - Background
//   2. Paste this script and click "Run script"
//   3. Copy the printed values into your local .env file:
//
//        .env  (in repo root — gitignored)
//        ────────────────────────────────
//        SNOW_INSTANCE=https://everestdev.service-now.com
//        ENGINE_KEY=<value printed below>
//        SVC_PASSWORD=<value printed below>
//
// ============================================================

(function showOICredentials() {
    var scope = 'x_infte_ops_int';

    var engineKey  = gs.getProperty(scope + '.engine_key',    '(not set)');
    var svcPwd     = gs.getProperty(scope + '.svc_password',  '(not set)');

    var DIV = '='.repeat(64);
    gs.print('');
    gs.print(DIV);
    gs.print('  OPERATIONS INTELLIGENCE — CREDENTIALS');
    gs.print(DIV);
    gs.print('');
    gs.print('  ENGINE_KEY   : ' + engineKey);
    gs.print('  SVC_PASSWORD : ' + svcPwd);
    gs.print('');
    gs.print('  → Copy these into your local .env file (repo root).');
    gs.print('  → The .env file is gitignored and never committed.');
    gs.print('');
    gs.print(DIV);
})();
