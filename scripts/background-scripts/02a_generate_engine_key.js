// ============================================================
// OPERATIONS INTELLIGENCE — ENGINE KEY SETUP
// Run in APPLICATION scope (Operations Intelligence / x_infte_ops_int)
// ============================================================
// Run this BEFORE creating the REST service in Studio.
// Generates a secure 40-character API key and stores it in a
// system property. The engine script reads this property on
// every request to authenticate the caller.
// ============================================================

(function generateEngineKey() {
    'use strict';

    var KEY_PROP = 'x_infte_ops_int.engine_key';

    var existing = gs.getProperty(KEY_PROP, '');
    if (existing && existing.length >= 20) {
        gs.info('Engine key already exists (' + existing.length + ' chars) — keeping it.');
        gs.info('KEY: ' + existing);
        gs.info('Copy the KEY value above — you will need it to call the engine.');
        return;
    }

    var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var key = '';
    for (var i = 0; i < 40; i++) {
        key += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }

    gs.setProperty(KEY_PROP, key, 'Operations Intelligence Engine API key — treat as secret credential.');

    gs.info('');
    gs.info('============================================================');
    gs.info('  ENGINE KEY GENERATED');
    gs.info('============================================================');
    gs.info('  Property : ' + KEY_PROP);
    gs.info('  KEY      : ' + key);
    gs.info('============================================================');
    gs.info('  Copy the KEY value above — you will need it to call the');
    gs.info('  engine after the REST service is created in Studio.');
    gs.info('============================================================');
    gs.info('');

})();
