import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';
import Modal from './Modal.jsx';

// Module Configuration. Once the navigation is built, every active module (standalone or inside a
// section) needs its content area defined. The left column lists the active modules with a pending or
// done chip; selecting one opens a chat on the right where the user describes what should render in
// that module's content area (custom tables, tiles, the Service Catalog and Assistant, and so on).
// The Enterprise Assistant collaborates with three other models: it asks clarifications until the
// requirements are clear, then offers Adjust or Approve. Approving finalises a requirements plan and an
// implementation design plan, stored per module via onChange and viewable through the plan buttons.
// Per module chat history is kept locally so switching modules preserves each conversation.

// Flatten the active navigation into the ordered list of modules (standalone + inside sections).
function navToModules(nav) {
  var out = [];
  (nav || []).forEach(function (item) {
    if (item.kind === 'section') {
      (item.children || []).forEach(function (m) { out.push({ id: m.id, label: m.label, icon: m.icon || '', section: item.label }); });
    } else if (item.kind === 'module') {
      out.push({ id: item.id, label: item.label, icon: item.icon || '' });
    }
  });
  return out;
}

export default function ModuleConfig(props) {
  var mods = navToModules(props.nav);
  var plans = props.value || {};

  var s0 = useState(mods.length ? mods[0].id : null); var selId = s0[0], setSelId = s0[1];
  // per module conversation state keyed by moduleId: { msgs:[{role,text}], input, busy, decide }
  var c0 = useState({}); var convos = c0[0], setConvos = c0[1];
  var p0 = useState(null); var planView = p0[0], setPlanView = p0[1]; // { moduleId, kind:'req'|'impl' }

  function isDone(id) { var p = plans[id]; return !!(p && p.requirementsPlan && p.implementationPlan); }
  function getConvo(id) { return convos[id] || { msgs: [], input: '', busy: false, decide: false }; }
  function setConvo(id, patch) {
    setConvos(function (all) {
      var next = {}; for (var k in all) next[k] = all[k];
      var cur = next[id] || { msgs: [], input: '', busy: false, decide: false };
      var merged = {}; for (var x in cur) merged[x] = cur[x];
      for (var y in patch) merged[y] = patch[y];
      next[id] = merged; return next;
    });
  }
  function pushMsg(id, role, text) {
    setConvos(function (all) {
      var next = {}; for (var k in all) next[k] = all[k];
      var cur = next[id] || { msgs: [], input: '', busy: false, decide: false };
      var merged = {}; for (var x in cur) merged[x] = cur[x];
      merged.msgs = (cur.msgs || []).concat([{ role: role, text: text }]);
      next[id] = merged; return next;
    });
  }

  function selectedModule() { for (var i = 0; i < mods.length; i++) if (mods[i].id === selId) return mods[i]; return null; }

  function submit(m) {
    var c = getConvo(m.id);
    var text = (c.input || '').trim();
    if (!text || c.busy) return;
    var history = (c.msgs || []).map(function (x) { return { role: x.role, text: x.text }; });
    pushMsg(m.id, 'user', text);
    setConvo(m.id, { input: '', busy: true, decide: false });
    props.callServer({ action: 'module_collab', module: m.label, moduleId: m.id, phase: 'discuss', message: text, history: history })
      .then(function (r) {
        var res = (r && r.result) || r || {};
        if (res.reply) pushMsg(m.id, 'assistant', res.reply);
        setConvo(m.id, { busy: false, decide: !res.needsClarification });
      })['catch'](function () {
        pushMsg(m.id, 'assistant', 'The assistant could not respond just now. Please try again.');
        setConvo(m.id, { busy: false, decide: false });
      });
  }

  function adjust(m) { setConvo(m.id, { decide: false }); }

  function approve(m) {
    var c = getConvo(m.id);
    if (c.busy) return;
    var history = (c.msgs || []).map(function (x) { return { role: x.role, text: x.text }; });
    setConvo(m.id, { busy: true, decide: false });
    props.callServer({ action: 'module_collab', module: m.label, moduleId: m.id, phase: 'finalize', message: '', history: history })
      .then(function (r) {
        var res = (r && r.result) || r || {};
        var reqP = res.requirementsPlan || '';
        var impP = res.implementationPlan || '';
        var next = {}; for (var k in plans) next[k] = plans[k];
        next[m.id] = { requirementsPlan: reqP, implementationPlan: impP, done: true };
        if (props.onChange) props.onChange(next);
        pushMsg(m.id, 'assistant', 'The requirements plan and implementation design plan are ready. Open them from the toolbar above.');
        setConvo(m.id, { busy: false, decide: false });
      })['catch'](function () {
        pushMsg(m.id, 'assistant', 'The plans could not be finalised just now. Please try Approve again.');
        setConvo(m.id, { busy: false, decide: false });
      });
  }

  var sel = selectedModule();
  var selConvo = sel ? getConvo(sel.id) : null;
  var selDone = sel ? isDone(sel.id) : false;

  return (
    <div className="ei-modcfg">
      <div className="ei-cfg-title">Module Configuration</div>
      <p className="ei-modal-help">Every active module needs a content area. Select a module and describe what should render inside it. The Enterprise Assistant works with three other models to shape the requirements, then produces a requirements plan and an implementation design plan you approve.</p>
      <div className="ei-modcfg-cols">
        <div className="ei-modcfg-list">
          <div className="ei-cfg-title">All active modules</div>
          {mods.length === 0 ? <div className="ei-nc-hint small">Build the navigation first; active modules appear here.</div> : null}
          {mods.map(function (m) {
            var done = isDone(m.id);
            return (
              <button key={m.id} className={'ei-modcfg-tile' + (m.id === selId ? ' selected' : '')} onClick={function () { setSelId(m.id); }}>
                <span className="ei-modcfg-tile-ic">
                  {m.icon ? <OIIcon name={m.icon} size={16} fill="#00895E" /> : <OIIcon name="plus" size={14} fill="#9AA6A2" />}
                </span>
                <span className="ei-modcfg-tile-nm">
                  {m.label}
                  {m.section ? <span className="ei-modcfg-tile-sec">{m.section}</span> : null}
                </span>
                <span className="ei-modcfg-chip">
                  {done
                    ? <OIIcon name="check" size={16} fill="#00895E" />
                    : <OIIcon name="pending" size={16} fill="#B08900" />}
                </span>
              </button>
            );
          })}
        </div>

        {sel ? (
          <div className="ei-modcfg-chat">
            <div className="ei-cfg-title">Content Area Requirements</div>
            {selDone ? (
              <div className="ei-modcfg-plans">
                <button className="ei-btn-ghost" onClick={function () { setPlanView({ moduleId: sel.id, kind: 'req' }); }}>
                  <OIIcon name="document" size={14} fill="currentColor" />Requirements plan
                </button>
                <button className="ei-btn-ghost" onClick={function () { setPlanView({ moduleId: sel.id, kind: 'impl' }); }}>
                  <OIIcon name="document" size={14} fill="currentColor" />Implementation design plan
                </button>
              </div>
            ) : null}
            <div className="ei-modcfg-msgs">
              {(selConvo.msgs || []).length === 0 && !selConvo.busy
                ? <div className="ei-modcfg-msg asst">Describe what should render in the content area of "{sel.label}" — custom tables, tiles, the Service Catalog and Assistant, and so on.</div>
                : null}
              {(selConvo.msgs || []).map(function (msg, i) {
                return <div key={i} className={'ei-modcfg-msg ' + (msg.role === 'user' ? 'user' : 'asst')}>{msg.text}</div>;
              })}
              {selConvo.busy
                ? <div className="ei-modcfg-msg asst typing"><span className="ei-modcfg-dot" /><span className="ei-modcfg-dot" /><span className="ei-modcfg-dot" /></div>
                : null}
              {selConvo.decide && !selConvo.busy ? (
                <div className="ei-modcfg-routes">
                  <button className="ei-btn-ghost" onClick={function () { adjust(sel); }}>Adjust</button>
                  <button className="ei-btn-primary" onClick={function () { approve(sel); }}>Approve</button>
                </div>
              ) : null}
            </div>
            <div className="ei-modcfg-input">
              <textarea className="ei-wiz-input" placeholder={selConvo.decide ? 'Choose Adjust to keep refining, or Approve.' : 'Describe the content area requirements…'}
                value={selConvo.input || ''} readOnly={selConvo.busy || selConvo.decide} disabled={selConvo.busy}
                onChange={function (e) { setConvo(sel.id, { input: e.target.value }); }}
                onKeyDown={function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(sel); } }} />
              <button className="ei-btn-primary" disabled={selConvo.busy || selConvo.decide || !(selConvo.input || '').trim()} onClick={function () { submit(sel); }}>
                <OIIcon name="send" size={14} fill="currentColor" />Submit
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {planView ? (
        <Modal title={planView.kind === 'req' ? 'Requirements plan' : 'Implementation design plan'} onClose={function () { setPlanView(null); }}>
          <div className="ei-modal-help" style={{ whiteSpace: 'pre-wrap' }}>
            {(function () {
              var p = plans[planView.moduleId] || {};
              var text = planView.kind === 'req' ? p.requirementsPlan : p.implementationPlan;
              return text || 'This plan is not available yet.';
            })()}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
