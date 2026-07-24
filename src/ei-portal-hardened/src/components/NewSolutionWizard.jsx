import React, { useState } from 'react';
import OIIcon from '../icons.jsx';

// Interactive New Solution Development. The Enterprise Assistant gathers requirements in steps,
// restates what it understood for the user to confirm or correct, then offers real choices as
// clickable tiles: a layout (with a live shell preview), modules, and each module's content. It
// ends by building the application and presenting a clickable result tile that opens it in a new tab.

var LAYOUTS = [
  { id: 'operations', title: 'Operations shell', kind: 'ops', desc: 'Sidebar, header, content, and a per section Assistant chat.' },
  { id: 'focus', title: 'Focus shell', kind: 'focus', desc: 'Sidebar, header, and one large content area.' },
  { id: 'dashboard', title: 'Dashboard grid shell', kind: 'grid', desc: 'Sidebar, header, and a symmetric grid of panels.' },
  { id: 'split', title: 'Split shell', kind: 'split', desc: 'Sidebar, header, and two balanced panes.' }
];

var CONTENTS = [
  { id: 'catalog', title: 'Service Catalog', desc: 'A catalog of guided requests.' },
  { id: 'dashboard', title: 'Dashboard', desc: 'Metrics and charts at a glance.' },
  { id: 'records', title: 'Record workspace', desc: 'A worklist of records to act on.' },
  { id: 'knowledge', title: 'Knowledge base', desc: 'Searchable articles and guidance.' },
  { id: 'assistant', title: 'Assistant panel', desc: 'A focused Assistant conversation.' },
  { id: 'insights', title: 'Insights report', desc: 'Trends and analysis over time.' }
];

// A CSS drawn mini shell so the layout tile shows the real skeleton, not a picture.
function MiniShell(props) {
  var k = props.kind;
  return (
    <div className="ei-mini">
      <div className="ei-mini-side" />
      <div className="ei-mini-col">
        <div className="ei-mini-top" />
        {k === 'grid' ? <div className="ei-mini-grid"><i /><i /><i /><i /></div>
          : k === 'split' ? <div className="ei-mini-split"><i /><i /></div>
          : <div className="ei-mini-content" />}
      </div>
      {k === 'ops' ? <div className="ei-mini-chat" /> : null}
    </div>
  );
}

function slug(s) { return ('' + s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

function inferKind(text) {
  var t = (' ' + text + ' ').toLowerCase();
  if (t.indexOf('report') > -1 || t.indexOf('insight') > -1 || t.indexOf('dashboard') > -1 || t.indexOf('metric') > -1) return 'insights and reporting';
  if (t.indexOf('request') > -1 || t.indexOf('catalog') > -1 || t.indexOf('operation') > -1 || t.indexOf('ticket') > -1) return 'operations and requests';
  return 'a focused line of business';
}

export default function NewSolutionWizard({ onExit, callServer }) {
  var s0 = useState('purpose'); var step = s0[0], setStep = s0[1];
  var sp = useState({ title: 'Operations Intelligence', purpose: '', kind: '', layout: '', modules: [], access: '' });
  var spec = sp[0], setSpec = sp[1];
  var d0 = useState(''); var draftName = d0[0], setDraftName = d0[1];
  var r0 = useState(null); var result = r0[0], setResult = r0[1];

  function set(k, v) { setSpec(function (s) { var n = {}; for (var x in s) n[x] = s[x]; n[k] = v; return n; }); }

  function confirmPurpose() {
    set('kind', inferKind(spec.purpose));
    setStep('confirm');
  }
  function chooseLayout(l) { set('layout', l.id); setStep('modules'); }
  function addModule() { setDraftName(''); setStep('module_name'); }
  function nameModule() { if (draftName.trim()) setStep('module_content'); }
  function chooseContent(c) {
    setSpec(function (s) {
      var n = {}; for (var x in s) n[x] = s[x];
      n.modules = s.modules.concat([{ name: draftName.trim(), content: c.title }]);
      return n;
    });
    setStep('modules');
  }
  function chooseAccess(a) { set('access', a); setStep('review'); }

  function build() {
    setStep('building');
    var payload = { title: spec.title, purpose: spec.purpose, kind: spec.kind, layout: spec.layout,
      modules: spec.modules, access: spec.access };
    callServer({ action: 'build_solution', name: slug(spec.title), spec: JSON.stringify(payload) })
      .then(function (r) {
        var res = (r && r.result) || r || {};
        if (res.url) { setResult({ url: res.url, title: spec.title }); setStep('done'); }
        else { setResult({ error: res.error || 'The build could not complete.' }); setStep('done'); }
      })['catch'](function (e) { setResult({ error: '' + e }); setStep('done'); });
  }

  var layoutLabel = (function () { for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].id === spec.layout) return LAYOUTS[i].title; return spec.layout; })();

  function Body() {
    if (step === 'purpose') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">Step 1 of 5 · Requirements</div>
          <div className="ei-wiz-say">Tell me what this application should do and who will use it.{'\n'}I will read it back so you can confirm I understood.</div>
          <input className="ei-wiz-input one" placeholder="Name the application"
            value={spec.title} onChange={function (e) { set('title', e.target.value); }} />
          <textarea className="ei-wiz-input" placeholder="For example: a place for the operations team to see their work, start requests, and get guided help."
            value={spec.purpose} onChange={function (e) { set('purpose', e.target.value); }} />
        </div>
      );
    }
    if (step === 'confirm') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">Step 1 of 5 · Confirm</div>
          <div className="ei-wiz-say">Here is what I understood. Please confirm or refine it.</div>
          <div className="ei-wiz-echo">The application <b>{spec.title}</b> is for {spec.purpose || 'your team'}.
          {'\n'}It looks like {spec.kind}.</div>
          <div className="ei-tile-grid">
            <button className="ei-tile" onClick={function () { setStep('layout'); }}>
              <span className="ei-tile-title">Yes, that is right</span>
              <span className="ei-tile-desc">Continue to choose a layout.</span>
            </button>
            <button className="ei-tile" onClick={function () { setStep('purpose'); }}>
              <span className="ei-tile-title">Let me refine it</span>
              <span className="ei-tile-desc">Go back and adjust the description.</span>
            </button>
          </div>
        </div>
      );
    }
    if (step === 'layout') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">Step 2 of 5 · Layout</div>
          <div className="ei-wiz-say">Choose a layout. Each preview is the real hardened house style shell.</div>
          <div className="ei-tile-grid">
            {LAYOUTS.map(function (l) {
              return (
                <button key={l.id} className={'ei-tile' + (spec.layout === l.id ? ' selected' : '')} onClick={function () { chooseLayout(l); }}>
                  <MiniShell kind={l.kind} />
                  <span className="ei-tile-title">{l.title}</span>
                  <span className="ei-tile-desc">{l.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    if (step === 'modules') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">Step 3 of 5 · Modules</div>
          <div className="ei-wiz-say">Define the modules in the navigation.{'\n'}Add each one and choose what its content area shows.</div>
          {spec.modules.length > 0 && (
            <div className="ei-chip-row">
              {spec.modules.map(function (m, i) { return <span key={i} className="ei-chip"><b>{m.name}</b> · {m.content}</span>; })}
            </div>
          )}
          <div className="ei-tile-grid">
            <button className="ei-tile" onClick={addModule}>
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
          <div className="ei-wiz-step">Step 3 of 5 · New module</div>
          <div className="ei-wiz-say">What is this module called?</div>
          <input className="ei-wiz-input one" placeholder="For example: Workspace" value={draftName}
            onChange={function (e) { setDraftName(e.target.value); }}
            onKeyDown={function (e) { if (e.key === 'Enter') nameModule(); }} />
        </div>
      );
    }
    if (step === 'module_content') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">Step 3 of 5 · {draftName} content</div>
          <div className="ei-wiz-say">What should <b>{draftName}</b> show? Choose its content.</div>
          <div className="ei-tile-grid">
            {CONTENTS.map(function (c) {
              return (
                <button key={c.id} className="ei-tile" onClick={function () { chooseContent(c); }}>
                  <span className="ei-tile-title">{c.title}</span>
                  <span className="ei-tile-desc">{c.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    if (step === 'access') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">Step 4 of 5 · Access</div>
          <div className="ei-wiz-say">Who may use this application?</div>
          <div className="ei-tile-grid">
            <button className="ei-tile" onClick={function () { chooseAccess('everyone'); }}>
              <span className="ei-tile-title">Open to everyone</span>
              <span className="ei-tile-desc">Any signed in user may open it.</span>
            </button>
            <button className="ei-tile" onClick={function () { chooseAccess('restricted'); }}>
              <span className="ei-tile-title">Restricted access</span>
              <span className="ei-tile-desc">An Access Management module is generated and enforced by the own security engine.</span>
            </button>
          </div>
        </div>
      );
    }
    if (step === 'review') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">Step 5 of 5 · Review and build</div>
          <div className="ei-wiz-say">Here is the plan. Build it into Enterprise Solutions when it looks right.</div>
          <div className="ei-summary">
            <div className="ei-summary-row"><span className="k">Name</span><span className="v">{spec.title}</span></div>
            <div className="ei-summary-row"><span className="k">Purpose</span><span className="v">{spec.purpose || '—'}</span></div>
            <div className="ei-summary-row"><span className="k">Layout</span><span className="v">{layoutLabel}</span></div>
            <div className="ei-summary-row"><span className="k">Modules</span><span className="v">{spec.modules.length ? spec.modules.map(function (m) { return m.name + ' (' + m.content + ')'; }).join(', ') : '—'}</span></div>
            <div className="ei-summary-row"><span className="k">Access</span><span className="v">{spec.access === 'restricted' ? 'Restricted' : 'Open to everyone'}</span></div>
          </div>
        </div>
      );
    }
    if (step === 'building') {
      return (
        <div className="ei-wiz-body">
          <div className="ei-wiz-step">Building</div>
          <div className="ei-wiz-say">The Assistant is building {spec.title} into Enterprise Solutions now.{'\n'}One moment.</div>
        </div>
      );
    }
    // done
    return (
      <div className="ei-wiz-body">
        <div className="ei-wiz-step">Done</div>
        {result && result.url ? (
          <div>
            <div className="ei-wiz-say">Your application is live. Open it in a new tab.</div>
            <a className="ei-result-tile" href={result.url} target="_blank" rel="noopener noreferrer">
              <span className="ei-result-ic"><OIIcon name="ops_workspace" size={20} fill="#FFFFFF" /></span>
              <span className="ei-result-tx">
                <span className="ei-result-tt">{result.title}</span>
                <span className="ei-result-sub">{result.url}</span>
              </span>
              <OIIcon name="chevron_right" size={18} fill="#00895E" />
            </a>
          </div>
        ) : (
          <div className="ei-wiz-echo">{(result && result.error) || 'The build could not complete.'}</div>
        )}
      </div>
    );
  }

  // Footer action bar per step.
  function Actions() {
    if (step === 'purpose') return <div className="ei-wiz-actions"><Back /><button className="ei-btn-primary" disabled={!spec.purpose.trim() || !spec.title.trim()} onClick={confirmPurpose}>Continue</button></div>;
    if (step === 'modules') return <div className="ei-wiz-actions"><Back /><button className="ei-btn-primary" disabled={spec.modules.length === 0} onClick={function () { setStep('access'); }}>Continue</button></div>;
    if (step === 'module_name') return <div className="ei-wiz-actions"><Back to="modules" /><button className="ei-btn-primary" disabled={!draftName.trim()} onClick={nameModule}>Continue</button></div>;
    if (step === 'review') return <div className="ei-wiz-actions"><Back /><button className="ei-btn-primary" onClick={build}>Build the application</button></div>;
    if (step === 'done') return <div className="ei-wiz-actions"><button className="ei-btn-ghost" onClick={onExit}><OIIcon name="chevron_right" size={14} fill="currentColor" />Back to the catalog</button></div>;
    return <div className="ei-wiz-actions"><Back /></div>;
  }

  function Back(props) {
    var target = props && props.to;
    function go() {
      if (target) { setStep(target); return; }
      var order = { confirm: 'purpose', layout: 'confirm', modules: 'layout', module_name: 'modules', module_content: 'module_name', access: 'modules', review: 'access' };
      if (order[step]) setStep(order[step]); else onExit();
    }
    return <button className="ei-btn-ghost" onClick={go}><OIIcon name="chevron_right" size={14} fill="currentColor" />Back</button>;
  }

  return (
    <div className="ei-wiz">
      <div className="ei-flow-title">New Solution Development</div>
      {Body()}
      {Actions()}
    </div>
  );
}
