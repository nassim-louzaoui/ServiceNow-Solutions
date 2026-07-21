import React, { useState, useEffect } from 'react';
import OIIcon from '../icons.jsx';

// Interactive Existing Solution Maintenance. Pick a deployed application (live list), then make a
// real change to it through tiles. Adding a module edits the app's baked spec under system context,
// so the app immediately renders the new module. Ends with a clickable tile to open the updated app.

var CONTENTS = [
  { id: 'catalog', title: 'Service Catalog', desc: 'A catalog of guided requests.' },
  { id: 'dashboard', title: 'Dashboard', desc: 'Metrics and charts at a glance.' },
  { id: 'records', title: 'Record workspace', desc: 'A worklist of records to act on.' },
  { id: 'knowledge', title: 'Knowledge base', desc: 'Searchable articles and guidance.' },
  { id: 'assistant', title: 'Assistant panel', desc: 'A focused Assistant conversation.' },
  { id: 'insights', title: 'Insights report', desc: 'Trends and analysis over time.' }
];

function pretty(n) { return ('' + (n || '')).split('-').join(' '); }

export default function ExistingSolutionWizard({ onExit, callServer }) {
  var st = useState('pick'); var step = st[0], setStep = st[1];
  var a0 = useState(null); var apps = a0[0], setApps = a0[1];
  var p0 = useState(null); var picked = p0[0], setPicked = p0[1];
  var d0 = useState(''); var draft = d0[0], setDraft = d0[1];
  var r0 = useState(null); var result = r0[0], setResult = r0[1];

  useEffect(function () {
    if (step !== 'pick') return;
    setApps(null);
    callServer({ action: 'list_solutions' }).then(function (r) {
      var res = (r && r.result) || r || [];
      setApps(res.length !== undefined ? res : []);
    })['catch'](function () { setApps([]); });
  }, [step]);

  function apply(content) {
    setStep('applying');
    callServer({ action: 'apply_change', name: picked.name, module: draft.trim(), content: content })
      .then(function (r) {
        var res = (r && r.result) || r || {};
        setResult(res.status === 'applied' ? { url: res.url || ('/' + picked.name), modules: res.modules } : { error: res.error || 'The change could not be applied.' });
        setStep('applied');
      })['catch'](function (e) { setResult({ error: '' + e }); setStep('applied'); });
  }

  function Body() {
    if (step === 'pick') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">Choose an application</div>
          <div className="ei-wiz-say">Select an application in Enterprise Solutions to maintain.</div>
          {apps === null ? <div className="ei-wiz-say">Loading the deployed applications.</div>
            : apps.length === 0 ? <div className="ei-wiz-echo">No applications are deployed yet. Build one first with New Solution Development.</div>
            : (
              <div className="ei-tile-grid">
                {apps.map(function (a, i) {
                  return (
                    <button key={i} className="ei-tile" onClick={function () { setPicked(a); setStep('menu'); }}>
                      <span className="ei-tile-title">{a.title || pretty(a.name)}</span>
                      <span className="ei-tile-desc">{a.url}</span>
                    </button>
                  );
                })}
              </div>
            )}
        </div>
      );
    }
    if (step === 'menu') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">{picked.title || pretty(picked.name)}</div>
          <div className="ei-wiz-say">This application is pinned as context.{'\n'}What change would you like to make?</div>
          <div className="ei-tile-grid">
            <button className="ei-tile" onClick={function () { setDraft(''); setStep('module_name'); }}>
              <span className="ei-tile-title">Add a module</span>
              <span className="ei-tile-desc">Name it and choose its content.</span>
            </button>
          </div>
        </div>
      );
    }
    if (step === 'module_name') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">New module</div>
          <div className="ei-wiz-say">What is the new module called?</div>
          <input className="ei-wiz-input one" placeholder="For example: Reports" value={draft}
            onChange={function (e) { setDraft(e.target.value); }}
            onKeyDown={function (e) { if (e.key === 'Enter' && draft.trim()) setStep('module_content'); }} />
        </div>
      );
    }
    if (step === 'module_content') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">{draft} content</div>
          <div className="ei-wiz-say">What should <b>{draft}</b> show?</div>
          <div className="ei-tile-grid">
            {CONTENTS.map(function (c) {
              return (
                <button key={c.id} className="ei-tile" onClick={function () { apply(c.title); }}>
                  <span className="ei-tile-title">{c.title}</span>
                  <span className="ei-tile-desc">{c.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    if (step === 'applying') {
      return <div className="ei-wiz-body"><div className="ei-wiz-step">Applying</div><div className="ei-wiz-say">Applying the change to {picked.title || pretty(picked.name)}.{'\n'}One moment.</div></div>;
    }
    // applied
    return (
      <div className="ei-wiz-body">
        <div className="ei-wiz-step">Done</div>
        {result && result.url ? (
          <div>
            <div className="ei-wiz-say">The change has been applied. Open the application in a new tab.</div>
            <a className="ei-result-tile" href={result.url} target="_blank" rel="noopener noreferrer">
              <span className="ei-result-ic"><OIIcon name="ops_workspace" size={20} fill="#FFFFFF" /></span>
              <span className="ei-result-tx">
                <span className="ei-result-tt">{picked.title || pretty(picked.name)}</span>
                <span className="ei-result-sub">{result.url}</span>
              </span>
              <OIIcon name="chevron_right" size={18} fill="#00895E" />
            </a>
          </div>
        ) : <div className="ei-wiz-echo">{(result && result.error) || 'The change could not be applied.'}</div>}
      </div>
    );
  }

  function Actions() {
    if (step === 'module_name') return <div className="ei-wiz-actions"><Ghost onClick={function () { setStep('menu'); }} label="Back" /><button className="ei-btn-primary" disabled={!draft.trim()} onClick={function () { setStep('module_content'); }}>Continue</button></div>;
    if (step === 'applied') return <div className="ei-wiz-actions"><Ghost onClick={function () { setStep('menu'); }} label="Make another change" /><Ghost onClick={onExit} label="Back to the catalog" /></div>;
    if (step === 'menu') return <div className="ei-wiz-actions"><Ghost onClick={function () { setStep('pick'); }} label="Choose another" /><Ghost onClick={onExit} label="Back to the catalog" /></div>;
    if (step === 'pick') return <div className="ei-wiz-actions"><Ghost onClick={onExit} label="Back to the catalog" /></div>;
    return <div className="ei-wiz-actions"><Ghost onClick={function () { setStep('menu'); }} label="Back" /></div>;
  }
  function Ghost(props) { return <button className="ei-btn-ghost" onClick={props.onClick}><OIIcon name="chevron_right" size={14} fill="currentColor" />{props.label}</button>; }

  return (
    <div className="ei-wiz">
      <div className="ei-flow-title">Existing Solution Maintenance</div>
      {Body()}
      {Actions()}
    </div>
  );
}
