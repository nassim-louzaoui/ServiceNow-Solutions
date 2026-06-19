// ============================================================
// OPERATIONS INTELLIGENCE — CLEANUP ORPHAN TEST TABLES
// Run in GLOBAL scope
// ============================================================
// Deletes the two test tables created during API investigation
// that ended up with incorrect u_ prefixed names.
//   u_x_infte_ops_int_person  (sys_id: a76ff04a3be507506d91a21864e45aae)
//   u_person                  (sys_id: 0fbff48a3be507506d91a21864e45a2f)
// ============================================================

(function cleanupOrphanTables() {
    'use strict';

    var orphans = [
        { name: 'u_x_infte_ops_int_person', sys_id: 'a76ff04a3be507506d91a21864e45aae' },
        { name: 'u_person',                  sys_id: '0fbff48a3be507506d91a21864e45a2f' }
    ];

    var SEP = '============================================================';
    gs.print('');
    gs.print(SEP);
    gs.print('  OPERATIONS INTELLIGENCE — CLEANUP ORPHAN TABLES');
    gs.print(SEP);

    for (var i = 0; i < orphans.length; i++) {
        var o = orphans[i];
        var gr = new GlideRecord('sys_db_object');
        if (gr.get(o.sys_id)) {
            var actualName = gr.getValue('name');
            gr.setWorkflow(false);
            gr.deleteRecord();
            gs.print('  [DELETED] ' + actualName + ' (' + o.sys_id + ')');
        } else {
            gs.print('  [NOT FOUND] ' + o.name + ' (' + o.sys_id + ') — already gone');
        }
    }

    gs.print('');
    gs.print('  Done. Orphan tables removed.');
    gs.print(SEP);
    gs.print('');

})();
