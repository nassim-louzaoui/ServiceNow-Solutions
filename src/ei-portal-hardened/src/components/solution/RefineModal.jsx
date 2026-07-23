import React, { useState } from 'react';
import Modal from './Modal.jsx';
import LayoutFrame from './LayoutFrame.jsx';
import NavigationConfig from './NavigationConfig.jsx';
import GeneralConfig, { defaultGeneral } from './GeneralConfig.jsx';
import ModuleConfig from './ModuleConfig.jsx';
import AccessManagement, { validateAccess } from './AccessManagement.jsx';

// Refine Layout. Two tabs of equal width: Layout Preview (renders the chosen layout live, reflecting
// every configuration change) and Layout Configuration (General, Navigation, Module, and — when access
// management is enabled — Access Management). On save the active navigation is flattened into the
// module list the developer builds from, and access is validated.

function navToModules(nav) {
  var out = [];
  (nav || []).forEach(function (item) {
    if (item.kind === 'section') { (item.children || []).forEach(function (m) { out.push({ id: m.id, name: m.label, icon: m.icon || '', section: item.label }); }); }
    else if (item.kind === 'module') { out.push({ id: item.id, name: item.label, icon: item.icon || '' }); }
  });
  return out;
}
function activeItems(nav) {
  return (nav || []).map(function (it) {
    if (it.kind === 'section') return { kind: 'section', id: it.id, label: it.label, children: (it.children || []).map(function (m) { return { id: m.id, label: m.label, icon: m.icon }; }) };
    return { kind: 'module', id: it.id, label: it.label, icon: it.icon };
  });
}

export default function RefineModal(props) {
  var start = props.draft.refine || {};
  var t0 = useState('preview'); var tab = t0[0], setTab = t0[1];
  var g0 = useState(start.general || defaultGeneral()); var gen = g0[0], setGen = g0[1];
  var nc0 = useState(start.navConfig || { pool: { sections: [], modules: [] }, nav: [] }); var navConfig = nc0[0], setNavConfig = nc0[1];
  var mc0 = useState(start.moduleConfig || {}); var modCfg = mc0[0], setModCfg = mc0[1];
  var ac0 = useState(start.accessModel || { roles: [] }); var access = ac0[0], setAccess = ac0[1];
  var err0 = useState(null); var errs = err0[0], setErrs = err0[1];

  var nav = navConfig.nav || [];
  var active = activeItems(nav);

  function save() {
    if (gen.accessManagement) {
      var v = validateAccess(access, active);
      if (!v.ok) { setErrs(v.errors); setTab('config'); return; }
    }
    props.onSave({
      general: gen, navConfig: navConfig, moduleConfig: modCfg, accessModel: access,
      modules: navToModules(nav),
      access: gen.accessManagement ? 'restricted' : 'everyone'
    });
  }

  return (
    <Modal title="Refine Layout" size="wide" onSave={save} onClose={props.onClose}>
      <div className="ei-tabs">
        <button className={'ei-tab' + (tab === 'preview' ? ' active' : '')} onClick={function () { setTab('preview'); }}>Layout Preview</button>
        <button className={'ei-tab' + (tab === 'config' ? ' active' : '')} onClick={function () { setTab('config'); }}>Layout Configuration</button>
      </div>

      {tab === 'preview' ? (
        <div className="ei-refine-preview">
          <div className="ei-layout-frame big">
            <LayoutFrame layout={props.draft.layout || 'sidebar_left'} general={gen} nav={active} />
          </div>
          <p className="ei-modal-help">Live preview of the {props.draft.layout ? props.draft.layout.split('_').join(' ') : 'chosen'} layout. Every configuration change is reflected here.</p>
        </div>
      ) : (
        <div className="ei-refine-config">
          <GeneralConfig value={gen} layout={props.draft.layout} onChange={setGen} callServer={props.callServer} />

          <section className="ei-cfg-sec">
            <div className="ei-cfg-title">Navigation Configuration</div>
            <NavigationConfig value={navConfig} onChange={setNavConfig} />
          </section>

          <section className="ei-cfg-sec">
            <ModuleConfig nav={nav} value={modCfg} onChange={setModCfg} callServer={props.callServer} />
          </section>

          {gen.accessManagement ? (
            <section className="ei-cfg-sec">
              <AccessManagement nav={active} value={access} onChange={setAccess} callServer={props.callServer} />
            </section>
          ) : null}

          {errs && errs.length ? (
            <div className="ei-cfg-errors">
              <div className="ei-cfg-errors-tt">Resolve these before saving:</div>
              <ul>{errs.map(function (e, i) { return <li key={i}>{e}</li>; })}</ul>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
