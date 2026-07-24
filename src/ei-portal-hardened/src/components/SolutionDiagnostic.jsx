import React, { useState, useEffect } from 'react';
import OIIcon from '../icons.jsx';

// Solution Diagnostic. A closed loop that inspects a deployed solution for health: whether its portal
// and widget are present and active, whether its model bridge reaches the Enterprise Intelligence
// models, how many modules it exposes, and any structural errors. Backed by the global factory
// `diagnose` action.
//   menu   -> deployed solution tiles
//   report -> health readout for the picked solution

function Stat(props) {
  return (
    <div className={'ei-diag-stat ' + (props.ok ? 'ok' : (props.warn ? 'warn' : 'bad'))}>
      <span className="ei-diag-ic"><OIIcon name={props.ok ? 'check' : (props.warn ? 'pending' : 'remove')} size={15} fill="currentColor" /></span>
      <span className="ei-diag-tx"><span className="ei-diag-k">{props.label}</span><span className="ei-diag-v">{props.value}</span></span>
    </div>
  );
}

export default function SolutionDiagnostic(props) {
  var callServer = props.callServer, onExit = props.onExit;
  var s0 = useState(null); var sols = s0[0], setSols = s0[1];
  var sel0 = useState(null); var sel = sel0[0], setSel = sel0[1];
  var r0 = useState(null); var rep = r0[0], setRep = r0[1];

  useEffect(function () {
    callServer({ action: 'list_solutions' }).then(function (r) {
      var res = (r && r.result) || r || []; setSols(res.length !== undefined ? res : []);
    })['catch'](function () { setSols([]); });
  }, []);

  function run(s) {
    setSel(s); setRep(null);
    callServer({ action: 'diagnose', name: s.name }).then(function (r) {
      setRep((r && r.result) || r || { status: 'error' });
    })['catch'](function (e) { setRep({ status: 'error', error: '' + e }); });
  }

  if (sel) {
    var ok = rep && rep.status === 'ok';
    return (
      <div className="ei-wiz">
        <div className="ei-flow-title">Solution Diagnostic</div>
        <div className="ei-wiz-body">
          <div className="ei-hero small">
            <div className="ei-hero-ic"><OIIcon name="ops_int" size={18} fill="#FFFFFF" /></div>
            <div className="ei-hero-tt">{sel.title || sel.name}</div>
            <div className="ei-hero-sub">Health, structure, and model bridge for this deployed solution.</div>
          </div>
          {!rep ? <div className="ei-wiz-say">Running diagnostics.</div> : (
            <div className="ei-diag">
              <Stat label="Portal reachable" value={rep.portal ? '/' + sel.name : 'missing'} ok={!!rep.portal} />
              <Stat label="Widget active" value={rep.widget_active ? 'active' : 'inactive'} ok={!!rep.widget_active} />
              <Stat label="Model bridge" value={rep.reaches_model ? 'connected to Enterprise Intelligence models' : 'no model bridge'} ok={!!rep.reaches_model} warn={!rep.reaches_model} />
              <Stat label="Modules" value={(rep.modules != null ? rep.modules : 0) + ' defined'} ok={(rep.modules || 0) > 0} warn={(rep.modules || 0) === 0} />
              <Stat label="Capabilities" value={(rep.capabilities || []).length + ' server actions'} ok={(rep.capabilities || []).length > 0} />
              <Stat label="Structural errors" value={rep.errors && rep.errors.length ? rep.errors.join('; ') : 'none'} ok={!(rep.errors && rep.errors.length)} bad={!!(rep.errors && rep.errors.length)} />
            </div>
          )}
          <div className="ei-route-list ei-route-control">
            <a className="ei-route" href={'/' + sel.name} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="ei-route-main"><span className="ei-route-ic"><OIIcon name="open_in_new" size={18} fill="currentColor" /></span>
                <span className="ei-route-tx"><span className="ei-route-title">Open the solution</span></span></button></a>
            <div className="ei-route"><button className="ei-route-main" onClick={function () { setSel(null); setRep(null); }}>
              <span className="ei-route-ic"><OIIcon name="chevron_right" size={18} fill="currentColor" /></span>
              <span className="ei-route-tx"><span className="ei-route-title">Diagnose another solution</span></span></button></div>
          </div>
        </div>
        <div className="ei-wiz-actions"><button className="ei-btn-ghost" onClick={onExit}><OIIcon name="chevron_right" size={14} fill="currentColor" />Back to the catalog</button></div>
      </div>
    );
  }

  return (
    <div className="ei-wiz">
      <div className="ei-flow-title">Solution Diagnostic</div>
      <div className="ei-wiz-body">
        <div className="ei-hero small">
          <div className="ei-hero-ic"><OIIcon name="ops_int" size={18} fill="#FFFFFF" /></div>
          <div className="ei-hero-tt">Diagnose a solution</div>
          <div className="ei-hero-sub">Select a deployed solution to check its health, structure, and model bridge.</div>
        </div>
        {sols === null ? <div className="ei-wiz-say">Loading deployed solutions.</div>
          : sols.length === 0 ? <div className="ei-wiz-echo">No solutions are deployed yet.</div>
          : (
            <div className="ei-draft-scroll">
              {sols.map(function (s, i) {
                return (<button key={i} className="ei-tile" onClick={function () { run(s); }}>
                  <span className="ei-tile-title">{s.title || s.name}</span><span className="ei-tile-sub">/{s.name}</span></button>);
              })}
            </div>
          )}
      </div>
      <div className="ei-wiz-actions"><button className="ei-btn-ghost" onClick={onExit}><OIIcon name="chevron_right" size={14} fill="currentColor" />Back to the catalog</button></div>
    </div>
  );
}
