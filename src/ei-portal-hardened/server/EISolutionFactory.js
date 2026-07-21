// EISolutionFactory  —  GLOBAL scope Script Include (access = public, runs under system context).
//
// This is the backend of the factory. A hardened SCOPED widget (the Enterprise Intelligence portal,
// scope x_intelligence) is intentionally NOT allowed to author privileged Service Portal records into
// another scope at runtime — that is the server side authorization wall. So the catalog's build
// action delegates to THIS global Script Include, which the scoped widget is allowed to call, and
// which runs in the global (system) scope where the cross scope build is legitimate.
//
// build(name):  clones the proven house style portal widget (rewriting its widget id so the new
//   portal is standalone, and rewriting the model runtime reference to the scope qualified,
//   cross scope callable name so the new app's Model Bridge reaches the Enterprise Assistant Model),
//   then creates the full Service Portal record chain (widget, theme, page, container, row, column,
//   instance, portal) in the Enterprise Solutions scope (x_solutions). Idempotent on url_suffix.
// remove(name):  tears the app's record chain back down (for Existing Solution Maintenance teardown).
//
// The built app therefore gets: our house style front end, a Script Include backend that runs server
// side under system context, and a dedicated bridge (its own widget server script) that reaches the
// Enterprise Assistant Model runtime (x_intelligence.EnterpriseIntelligenceRuntime, access = public)
// cross scope for manifest / tokenizer, and reads the weight Script Includes inline for chunks.
var EISolutionFactory = Class.create();
EISolutionFactory.prototype = {
  initialize: function() {},
  SOL: 'b7da5f2583460710f36fec80ceaad32f', // Enterprise Solutions (x_solutions) sys_scope

  build: function(rawName, specJson) {
    var name = ('' + (rawName || 'operations-intelligence')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!name) { name = 'operations-intelligence'; }
    // The wizard passes a spec (title, purpose, layout, modules, access) as JSON. We record it on the
    // built widget so Existing Solution Maintenance can see how the app was defined.
    var spec = null; try { spec = specJson ? JSON.parse('' + specJson) : null; } catch (e) { spec = null; }
    var title = (spec && spec.title) ? ('' + spec.title) : 'Operations Intelligence';
    var widId = name + '-app';
    var existing = new GlideRecord('sp_portal');
    existing.addQuery('url_suffix', name); existing.query();
    if (existing.next()) { return { status: 'built', url: '/' + name, portal: existing.getUniqueValue() }; }
    var src = new GlideRecord('sp_widget');
    if (!src.get('id', 'ei-portal-app')) { return { status: 'error', error: 'source widget ei-portal-app not found' }; }
    var SOL = this.SOL, errs = [];
    function mk(table, vals) {
      var gr = new GlideRecord(table); gr.initialize();
      for (var k in vals) { if (vals.hasOwnProperty(k)) { gr.setValue(k, vals[k]); } }
      gr.setValue('sys_scope', SOL); gr.setWorkflow(false);
      var id = gr.insert();
      if (!id) { errs.push(table + ':' + (gr.getLastErrorMessage() || 'null')); }
      return id;
    }
    var client = ('' + src.getValue('client_script')).split('ei-portal-app').join(widId);
    // Model Bridge: the built app runs in another scope, so its server must reach the Enterprise
    // Assistant Model runtime by its scope qualified, cross scope callable name.
    var server = ('' + src.getValue('script')).split('new EnterpriseIntelligenceRuntime()').join('new x_intelligence.EnterpriseIntelligenceRuntime()');
    var w = mk('sp_widget', { id: widId, name: title, description: (specJson ? ('' + specJson) : ''), template: src.getValue('template'), css: src.getValue('css'), client_script: client, script: server, 'public': 'false' });
    var theme = mk('sp_theme', { name: title, css_variables: '--navbar-height:0;--footer-height:0;' });
    var page = mk('sp_page', { id: name + '-home', title: title });
    var cont = mk('sp_container', { sp_page: page, order: '100', width: 'fluid', name: name + '_main' });
    var row = mk('sp_row', { sp_container: cont, order: '100' });
    var col = mk('sp_column', { sp_row: row, size: '12', order: '100' });
    mk('sp_instance', { sp_column: col, sp_widget: w, order: '100', title: title });
    var portal = mk('sp_portal', { url_suffix: name, title: title, homepage: page, theme: theme });
    if (errs.length) { return { status: 'error', url: '/' + name, errors: errs }; }
    return { status: 'built', url: '/' + name, portal: portal, widget: w };
  },

  // List the web applications present in the Enterprise Solutions scope (for the maintenance flows).
  listSolutions: function() {
    var out = [];
    var pg = new GlideRecord('sp_portal');
    pg.addQuery('sys_scope', this.SOL); pg.orderBy('title'); pg.query();
    while (pg.next()) {
      out.push({ name: '' + pg.getValue('url_suffix'), title: '' + pg.getValue('title'), url: '/' + pg.getValue('url_suffix') });
    }
    return out;
  },
  // Describe an app's bridge: the actions its widget server actually exposes, and whether it reaches
  // the Enterprise Assistant Model. This is what Module Bridge Maintenance inspects.
  describeBridge: function(rawName) {
    var name = ('' + (rawName || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    var w = new GlideRecord('sp_widget');
    if (!w.get('id', name + '-app')) { return { status: 'error', error: 'app not found' }; }
    var script = '' + w.getValue('script');
    var caps = [], re = /a === '([a-z_]+)'/g, m;
    while ((m = re.exec(script))) { caps.push(m[1]); }
    var model = script.indexOf('EnterpriseIntelligenceRuntime') > -1 || script.indexOf("'chunks'") > -1;
    return { status: 'ok', name: name, capabilities: caps, reaches_model: model,
      model_ops: ['manifest', 'tokenizer', 'chunks', 'assistant_query'] };
  },

  remove: function(rawName) {
    var name = ('' + (rawName || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!name) { return { status: 'error', error: 'no name' }; }
    var n = 0;
    function del(table, query) {
      var gr = new GlideRecord(table); gr.addEncodedQuery(query); gr.query();
      while (gr.next()) { gr.deleteRecord(); n++; }
    }
    var pg = new GlideRecord('sp_portal');
    pg.addQuery('url_suffix', name); pg.query();
    while (pg.next()) {
      var page = pg.getValue('homepage'), theme = pg.getValue('theme');
      if (page) {
        var cont = new GlideRecord('sp_container'); cont.addQuery('sp_page', page); cont.query();
        while (cont.next()) {
          var row = new GlideRecord('sp_row'); row.addQuery('sp_container', cont.getUniqueValue()); row.query();
          while (row.next()) {
            var col = new GlideRecord('sp_column'); col.addQuery('sp_row', row.getUniqueValue()); col.query();
            while (col.next()) { del('sp_instance', 'sp_column=' + col.getUniqueValue()); col.deleteRecord(); n++; }
            row.deleteRecord(); n++;
          }
          cont.deleteRecord(); n++;
        }
        del('sp_page', 'sys_id=' + page);
      }
      if (theme) { del('sp_theme', 'sys_id=' + theme); }
      pg.deleteRecord(); n++;
    }
    del('sp_widget', 'id=' + name + '-app');
    return { status: 'removed', name: name, deleted: n };
  },

  type: 'EISolutionFactory'
};
