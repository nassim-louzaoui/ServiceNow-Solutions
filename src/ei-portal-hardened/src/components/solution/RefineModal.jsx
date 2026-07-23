import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';
import Modal from './Modal.jsx';
import LayoutFrame from './LayoutFrame.jsx';

// Refine Layout. Two tabs: Layout Preview (renders the chosen layout live) and Layout Configuration.
// This is the first working version; the Configuration tab currently covers General settings and a
// simple module list. The full Navigation drag and drop, per module content chat, and Access
// Management surfaces are built on top of this scaffold next.
var CONTENTS = ['Service Catalog', 'Dashboard', 'Record workspace', 'Knowledge base', 'Insights report'];

export default function RefineModal(props) {
  var start = props.draft.refine || {};
  var t0 = useState('preview'); var tab = t0[0], setTab = t0[1];
  var g0 = useState(start.general || { profileIcon: true, helpIcon: true, showLabels: true, accessManagement: false });
  var gen = g0[0], setGen = g0[1];
  var m0 = useState(start.modules || []); var modules = m0[0], setModules = m0[1];
  var nm0 = useState(''); var modName = nm0[0], setModName = nm0[1];
  var mc0 = useState(CONTENTS[0]); var modContent = mc0[0], setModContent = mc0[1];

  function toggle(k) { setGen(function (g) { var n = {}; for (var x in g) n[x] = g[x]; n[k] = !g[k]; return n; }); }
  function addModule() { if (!modName.trim()) return; setModules(modules.concat([{ name: modName.trim(), content: modContent }])); setModName(''); }
  function removeModule(i) { setModules(modules.filter(function (m, j) { return j !== i; })); }
  function save() { props.onSave({ general: gen, modules: modules, access: gen.accessManagement ? 'restricted' : 'everyone' }); }

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
            <div className="ei-cfg-title">Navigation and Modules</div>
            <div className="ei-cfg-addrow">
              <input className="ei-wiz-input one" placeholder="Module name" value={modName} onChange={function (e) { setModName(e.target.value); }} />
              <select className="ei-cfg-select" value={modContent} onChange={function (e) { setModContent(e.target.value); }}>
                {CONTENTS.map(function (c) { return <option key={c} value={c}>{c}</option>; })}
              </select>
              <button className="ei-btn-primary" onClick={addModule}>Add</button>
            </div>
            {modules.length === 0 ? <div className="ei-cfg-empty">No modules yet. Add at least one.</div> : (
              <div className="ei-cfg-modlist">
                {modules.map(function (m, i) {
                  return (
                    <div key={i} className="ei-cfg-mod">
                      <span className="ei-cfg-mod-ic"><OIIcon name="ops_workspace" size={15} fill="#00895E" /></span>
                      <span className="ei-cfg-mod-nm">{m.name}</span>
                      <span className="ei-cfg-mod-ct">{m.content}</span>
                      <button className="ei-cfg-mod-rm" title="Remove" onClick={function () { removeModule(i); }}><OIIcon name="close" size={13} fill="currentColor" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
