import React, { useState, useEffect } from 'react';
import OIIcon from '../icons.jsx';
import Modal from './solution/Modal.jsx';

// Solution Maintenance. Lists the solutions already deployed into Enterprise Solutions, lets the user
// open one, inspect its model bridge, and apply a change (add a module) that is re-developed and
// auto-published. A locked solution must be set to maintenance before its structure can change.
//   menu     -> deployed solution tiles
//   detail   -> open | set to maintenance | add module (when in maintenance) | back
// Backed by the global factory: list_solutions, describe_bridge, apply_change.

export default function SolutionMaintenance(props) {
  var callServer = props.callServer, onExit = props.onExit;
  var s0 = useState(null); var sols = s0[0], setSols = s0[1];
  var sel0 = useState(null); var sel = sel0[0], setSel = sel0[1];
  var b0 = useState(null); var bridge = b0[0], setBridge = b0[1];
  var maint0 = useState(false); var inMaint = maint0[0], setMaint = maint0[1];
  var m0 = useState(null); var modal = m0[0], setModal = m0[1];
  var mn0 = useState(''); var modName = mn0[0], setModName = mn0[1];
  var busy0 = useState(false); var busy = busy0[0], setBusy = busy0[1];
  var note0 = useState(''); var note = note0[0], setNote = note0[1];

  function loadList() {
    setSols(null);
    callServer({ action: 'list_solutions' }).then(function (r) {
      var res = (r && r.result) || r || []; setSols(res.length !== undefined ? res : []);
    })['catch'](function () { setSols([]); });
  }
  useEffect(loadList, []);

  function open(s) {
    setSel(s); setInMaintReset(); setBridge(null);
    callServer({ action: 'describe_bridge', name: s.name }).then(function (r) {
      setBridge((r && r.result) || r || null);
    })['catch'](function () { setBridge({ status: 'error' }); });
  }
  function setInMaintReset() { setMaint(false); }

  function applyModule() {
    if (!modName.trim()) return;
    setBusy(true);
    callServer({ action: 'apply_change', name: sel.name, module: modName.trim(), content: 'Service Catalog' }).then(function (r) {
      var res = (r && r.result) || r || {}; setBusy(false); setModal(null); setModName('');
      setNote(res.status === 'applied' ? ('Module added. The solution now has ' + (res.modules || '') + ' modules and was re-published.') : ('The change could not be applied. ' + (res.error || '')));
      setModal('note');
    })['catch'](function (e) { setBusy(false); setNote('' + e); setModal('note'); });
  }

  if (sel) {
    return (
      <div className="ei-wiz">
        <div className="ei-flow-title">Solution Maintenance</div>
        <div className="ei-wiz-body">
          <div className="ei-hero small">
            <div className="ei-hero-ic"><OIIcon name="admin_hub" size={18} fill="#FFFFFF" /></div>
            <div className="ei-hero-tt">{sel.title || sel.name}{inMaint ? <span className="ei-tag maint">in maintenance</span> : <span className="ei-tag live">live</span>}</div>
            <div className="ei-hero-sub">Open the solution, inspect its model bridge, or set it to maintenance to change its structure.</div>
          </div>
          {bridge ? (
            <div className="ei-cfg-sec">
              <div className="ei-cfg-title">Model bridge</div>
              <div className="ei-cfg-row static">Reaches the Enterprise Intelligence models: <b>{bridge.reaches_model ? 'yes' : 'no'}</b></div>
              <div className="ei-cfg-row static">Capabilities: {(bridge.capabilities || []).join(', ') || '—'}</div>
            </div>
          ) : <div className="ei-wiz-say">Inspecting the solution bridge.</div>}
          <div className="ei-route-list ei-route-control">
            <a className="ei-route" href={'/' + sel.name} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="ei-route-main"><span className="ei-route-ic"><OIIcon name="open_in_new" size={18} fill="currentColor" /></span>
                <span className="ei-route-tx"><span className="ei-route-title">Open the solution</span><span className="ei-route-sub">/{sel.name}</span></span></button></a>
            {!inMaint ? (
              <div className="ei-route"><button className="ei-route-main" onClick={function () { setMaint(true); }}>
                <span className="ei-route-ic"><OIIcon name="edit" size={18} fill="currentColor" /></span>
                <span className="ei-route-tx"><span className="ei-route-title">Set to maintenance</span><span className="ei-route-sub">Unlock structural changes.</span></span></button></div>
            ) : (
              <div className="ei-route"><button className="ei-route-main" onClick={function () { setModal('add_module'); }}>
                <span className="ei-route-ic"><OIIcon name="plus" size={18} fill="currentColor" /></span>
                <span className="ei-route-tx"><span className="ei-route-title">Add a module</span><span className="ei-route-sub">Re-developed and published automatically.</span></span></button></div>
            )}
            <div className="ei-route"><button className="ei-route-main" onClick={function () { setSel(null); setBridge(null); }}>
              <span className="ei-route-ic"><OIIcon name="chevron_right" size={18} fill="currentColor" /></span>
              <span className="ei-route-tx"><span className="ei-route-title">Unselect solution</span></span></button></div>
          </div>
        </div>
        <div className="ei-wiz-actions"><button className="ei-btn-ghost" onClick={onExit}><OIIcon name="chevron_right" size={14} fill="currentColor" />Back to the catalog</button></div>
        {modal === 'add_module' ? (
          <Modal title="Add a module" onSave={applyModule} saveDisabled={!modName.trim() || busy} onClose={function () { setModal(null); }}>
            <p className="ei-modal-help">Name the module to add to {sel.title || sel.name}. It is developed and published into the live solution.</p>
            <input className="ei-wiz-input one" placeholder="For example: Reports" value={modName}
              onChange={function (e) { setModName(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') applyModule(); }} autoFocus />
          </Modal>
        ) : null}
        {modal === 'note' ? (<Modal title="Maintenance" onClose={function () { setModal(null); }}><p className="ei-modal-help">{note}</p></Modal>) : null}
      </div>
    );
  }

  return (
    <div className="ei-wiz">
      <div className="ei-flow-title">Solution Maintenance</div>
      <div className="ei-wiz-body">
        <div className="ei-hero small">
          <div className="ei-hero-ic"><OIIcon name="admin_hub" size={18} fill="#FFFFFF" /></div>
          <div className="ei-hero-tt">Deployed solutions</div>
          <div className="ei-hero-sub">Select a solution to open it, inspect its bridge, or change its structure.</div>
        </div>
        {sols === null ? <div className="ei-wiz-say">Loading deployed solutions.</div>
          : sols.length === 0 ? <div className="ei-wiz-echo">No solutions are deployed yet. Use Solution Development to create one.</div>
          : (
            <div className="ei-draft-scroll">
              {sols.map(function (s, i) {
                return (<button key={i} className="ei-tile" onClick={function () { open(s); }}>
                  <span className="ei-tile-title">{s.title || s.name}</span><span className="ei-tile-sub">/{s.name}</span></button>);
              })}
            </div>
          )}
      </div>
      <div className="ei-wiz-actions"><button className="ei-btn-ghost" onClick={onExit}><OIIcon name="chevron_right" size={14} fill="currentColor" />Back to the catalog</button></div>
    </div>
  );
}
