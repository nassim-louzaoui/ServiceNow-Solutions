import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';
import Modal from './Modal.jsx';
import LayoutFrame from './LayoutFrame.jsx';
import NavigationConfig from './NavigationConfig.jsx';

// Refine Layout. Two tabs: Layout Preview (renders the chosen layout live) and Layout Configuration.
// Configuration covers General settings and the Navigation Configuration (drag and drop of sections
// and modules into the navigation layout, with an icon picker). Per module content requirements chat
// and Access Management are layered on next. On save the active navigation is flattened into the
// module list the developer uses to build the solution.

// Flatten the navigation layout into an ordered module list, keeping section grouping as a label.
function navToModules(nav) {
  var out = [];
  (nav || []).forEach(function (item) {
    if (item.kind === 'section') {
      (item.children || []).forEach(function (m) { out.push({ name: m.label, content: 'Service Catalog', icon: m.icon || '', section: item.label }); });
    } else if (item.kind === 'module') {
      out.push({ name: item.label, content: 'Service Catalog', icon: item.icon || '' });
    }
  });
  return out;
}

export default function RefineModal(props) {
  var start = props.draft.refine || {};
  var t0 = useState('preview'); var tab = t0[0], setTab = t0[1];
  var g0 = useState(start.general || { profileIcon: true, helpIcon: true, showLabels: true, accessManagement: false });
  var gen = g0[0], setGen = g0[1];
  var nc0 = useState(start.navConfig || { pool: { sections: [], modules: [] }, nav: [] });
  var navConfig = nc0[0], setNavConfig = nc0[1];

  function toggle(k) { setGen(function (g) { var n = {}; for (var x in g) n[x] = g[x]; n[k] = !g[k]; return n; }); }
  function save() {
    props.onSave({ general: gen, navConfig: navConfig, modules: navToModules(navConfig.nav),
      access: gen.accessManagement ? 'restricted' : 'everyone' });
  }

  return (
    <Modal title="Refine Layout" size="wide" onSave={save} onClose={props.onClose}>
      <div className="ei-tabs">
        <button className={'ei-tab' + (tab === 'preview' ? ' active' : '')} onClick={function () { setTab('preview'); }}>Layout Preview</button>
        <button className={'ei-tab' + (tab === 'config' ? ' active' : '')} onClick={function () { setTab('config'); }}>Layout Configuration</button>
      </div>
      {tab === 'preview' ? (
        <div className="ei-refine-preview">
          <div className="ei-layout-frame big"><LayoutFrame layout={props.draft.layout || 'sidebar_left'} /></div>
          <p className="ei-modal-help">This is the {props.draft.layout ? props.draft.layout.split('_').join(' ') : 'chosen'} layout. Changes made under Layout Configuration apply here.</p>
        </div>
      ) : (
        <div className="ei-refine-config">
          <section className="ei-cfg-sec">
            <div className="ei-cfg-title">General Configuration</div>
            <label className="ei-cfg-row"><input type="checkbox" checked={gen.profileIcon} onChange={function () { toggle('profileIcon'); }} /> Show a profile icon that reveals the user display name.</label>
            <label className="ei-cfg-row"><input type="checkbox" checked={gen.helpIcon} onChange={function () { toggle('helpIcon'); }} /> Show a help icon that opens the solution help page.</label>
            <label className="ei-cfg-row"><input type="checkbox" checked={gen.showLabels} onChange={function () { toggle('showLabels'); }} /> Show labels next to navigation icons (otherwise icons only).</label>
            <label className="ei-cfg-row"><input type="checkbox" checked={gen.accessManagement} onChange={function () { toggle('accessManagement'); }} /> Enable access management for this solution.</label>
          </section>
          <section className="ei-cfg-sec">
            <div className="ei-cfg-title">Navigation Configuration</div>
            <NavigationConfig value={navConfig} onChange={setNavConfig} />
          </section>
        </div>
      )}
    </Modal>
  );
}
