import React, { useState, useEffect, useRef } from 'react';
import OIIcon from '../icons.jsx';
import Modal from './solution/Modal.jsx';
import LayoutFrame, { LAYOUTS } from './solution/LayoutFrame.jsx';
import RefineModal from './solution/RefineModal.jsx';

// Solution Development. A closed loop that lets a user create a solution through guided route options
// and modals, save it as a draft, and develop and deploy it into Enterprise Solutions. Structure:
//   main menu  -> New Solution Creation | Solution Draft Continuation (count)
//   creation   -> route tiles: Name, Layout, Refine, Save as Draft, Develop and Deploy, Back
//   drafts     -> pick a saved draft to continue or delete
// The solution name is the branding name and the browser tab title, so it is length limited.

var NAME_MAX = 24;
function slug(s) { return ('' + s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function emptyDraft() { return { name: '', layout: '', refine: null, done: { name: false, layout: false, refine: false } }; }

// A single task route tile with a pending or done state and an edit affordance when done.
function RouteTile(props) {
  var done = props.done;
  return (
    <div className={'ei-route' + (props.disabled ? ' disabled' : '')}>
      <button className="ei-route-main" disabled={props.disabled} onClick={props.onOpen}>
        <span className="ei-route-ic"><OIIcon name={props.icon} size={18} fill="currentColor" /></span>
        <span className="ei-route-tx">
          <span className="ei-route-title">{props.title}</span>
          {props.sub ? <span className="ei-route-sub">{props.sub}</span> : null}
        </span>
      </button>
      <span className="ei-route-status">
        {done
          ? <span className="ei-route-done"><OIIcon name="check" size={16} fill="#00895E" /></span>
          : <span className="ei-route-pending"><OIIcon name="pending" size={16} fill="#B08900" /></span>}
        {done && props.onEdit
          ? <button className="ei-route-edit" title="Edit" onClick={props.onEdit}><OIIcon name="edit" size={14} fill="currentColor" /></button>
          : null}
      </span>
    </div>
  );
}

export default function SolutionStudio(props) {
  var callServer = props.callServer, onExit = props.onExit;
  var v0 = useState('menu'); var view = v0[0], setView = v0[1];
  var dr0 = useState(emptyDraft()); var draft = dr0[0], setDraft = dr0[1];
  var m0 = useState(null); var modal = m0[0], setModal = m0[1];
  var dep0 = useState(null); var deploy = dep0[0], setDeploy = dep0[1]; // {busy}|{url}|{error}
  var dl0 = useState(null); var drafts = dl0[0], setDrafts = dl0[1];
  var sel0 = useState(null); var selDraft = sel0[0], setSelDraft = sel0[1];
  var note0 = useState(''); var note = note0[0], setNote = note0[1];

  // scratch for the name and layout modals
  var nm0 = useState(''); var nameDraft = nm0[0], setNameDraft = nm0[1];
  var li0 = useState(0); var layoutIdx = li0[0], setLayoutIdx = li0[1];
  var lsel0 = useState(''); var layoutSel = lsel0[0], setLayoutSel = lsel0[1];

  function setDone(k, v) { setDraft(function (d) { var n = {}; for (var x in d) n[x] = d[x]; n.done = {}; for (var y in d.done) n.done[y] = d.done[y]; n.done[k] = v; return n; }); }
  function patch(obj) { setDraft(function (d) { var n = {}; for (var x in d) n[x] = d[x]; for (var y in obj) n[y] = obj[y]; return n; }); }

  useEffect(function () {
    if (view !== 'menu' && view !== 'drafts') return;
    callServer({ action: 'list_drafts' }).then(function (r) {
      var res = (r && r.result) || r || [];
      setDrafts(res.length !== undefined ? res : []);
    })['catch'](function () { setDrafts([]); });
  }, [view]);

  // ----- modals -----
  function openName() { setNameDraft(draft.name || ''); setModal('name'); }
  function saveName() { patch({ name: nameDraft.trim() }); setDone('name', !!nameDraft.trim()); setModal(null); }
  function openLayout() {
    var idx = 0; for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].id === draft.layout) idx = i;
    setLayoutIdx(idx); setLayoutSel(draft.layout || ''); setModal('layout');
  }
  function saveLayout() { patch({ layout: layoutSel }); setDone('layout', !!layoutSel); setModal(null); }
  function openRefine() { setModal('refine'); }
  function saveRefine(refineState) { patch({ refine: refineState }); setDone('refine', true); setModal(null); }

  var allDone = draft.done.name && draft.done.layout && draft.done.refine;

  function saveDraft() {
    if (!draft.name) { setNote('A solution needs a name before it can be saved as a draft. Open Name first.'); setModal('note'); return; }
    callServer({ action: 'save_draft', name: draft.name, draft: JSON.stringify(draft) }).then(function () {
      setDraft(emptyDraft()); setView('menu');
    })['catch'](function () { setNote('The draft could not be saved right now.'); setModal('note'); });
  }

  var abortRef = useRef(false);
  function develop() { setModal('confirm_develop'); }
  function runDevelop() {
    setModal(null); abortRef.current = false; setDeploy({ busy: true });
    var refine = draft.refine || {};
    var spec = { title: draft.name, layout: draft.layout,
      general: refine.general || {}, modules: refine.modules || [], moduleConfig: refine.moduleConfig || {},
      accessModel: refine.accessModel || null, access: refine.access || 'everyone' };
    callServer({ action: 'build_solution', name: slug(draft.name), spec: JSON.stringify(spec) }).then(function (r) {
      var res = (r && r.result) || r || {};
      if (abortRef.current) {
        // rollback anything that was created, then return to the editable state
        callServer({ action: 'remove_solution', name: slug(draft.name) })['catch'](function () {});
        setDeploy(null); return;
      }
      if (res.url) setDeploy({ url: res.url }); else setDeploy({ error: res.error || 'The build could not complete.' });
    })['catch'](function (e) { if (!abortRef.current) setDeploy({ error: '' + e }); else setDeploy(null); });
  }
  function confirmAbort() { setModal('confirm_abort'); }
  function runAbort() {
    abortRef.current = true; setModal(null); setDeploy({ aborting: true });
    callServer({ action: 'remove_solution', name: slug(draft.name) })['catch'](function () {}).then(function () { setDeploy(null); });
  }

  function continueDraft(d) {
    var parsed = null; try { parsed = JSON.parse(d.draft || d.data || '{}'); } catch (e) { parsed = null; }
    if (parsed) { setDraft(parsed); setDeploy(null); setView('creation'); }
  }
  function deleteDraft(d) {
    callServer({ action: 'delete_draft', name: d.name }).then(function () {
      setSelDraft(null); setDrafts(function (list) { return (list || []).filter(function (x) { return x.name !== d.name; }); });
    })['catch'](function () {});
  }

  // ----- views -----
  function MainMenu() {
    var count = drafts ? drafts.length : 0;
    return (
      <div className="ei-wiz-body">
        <div className="ei-hero">
          <div className="ei-hero-ic"><OIIcon name="studio_icon" size={22} fill="#FFFFFF" /></div>
          <div className="ei-hero-tt">Solution Development</div>
          <div className="ei-hero-sub">Create a new solution end to end, or continue a saved draft.
          {'\n'}Everything you define here is built and deployed into Enterprise Solutions.</div>
        </div>
        <div className="ei-route-list">
          <div className="ei-route" onClick={function () { setDraft(emptyDraft()); setDeploy(null); setView('creation'); }}>
            <button className="ei-route-main"><span className="ei-route-ic"><OIIcon name="plus" size={18} fill="currentColor" /></span>
              <span className="ei-route-tx"><span className="ei-route-title">New Solution Creation</span>
                <span className="ei-route-sub">Start a new solution from scratch.</span></span></button>
          </div>
          <div className="ei-route" onClick={function () { setSelDraft(null); setView('drafts'); }}>
            <button className="ei-route-main"><span className="ei-route-ic"><OIIcon name="document" size={18} fill="currentColor" /></span>
              <span className="ei-route-tx"><span className="ei-route-title">Solution Draft Continuation</span>
                <span className="ei-route-sub">Continue a solution you saved as a draft.</span></span></button>
            <span className="ei-route-status"><span className="ei-count">{count}</span></span>
          </div>
        </div>
      </div>
    );
  }

  function Drafts() {
    return (
      <div className="ei-wiz-body">
        <div className="ei-wiz-step">Solution drafts</div>
        {drafts === null ? <div className="ei-wiz-say">Loading your drafts.</div>
          : drafts.length === 0 ? <div className="ei-wiz-echo">You have no saved drafts yet.</div>
          : (
            <div className="ei-draft-scroll">
              {drafts.map(function (d, i) {
                return (
                  <button key={i} className={'ei-tile' + (selDraft && selDraft.name === d.name ? ' selected' : '')} onClick={function () { setSelDraft(d); }}>
                    <span className="ei-tile-title">{d.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        {selDraft ? (
          <div className="ei-route-list">
            <div className="ei-route"><button className="ei-route-main" onClick={function () { continueDraft(selDraft); }}>
              <span className="ei-route-ic"><OIIcon name="play" size={18} fill="currentColor" /></span>
              <span className="ei-route-tx"><span className="ei-route-title">Continue with solution draft</span></span></button></div>
            <div className="ei-route"><button className="ei-route-main" onClick={function () { setModal('confirm_delete'); }}>
              <span className="ei-route-ic"><OIIcon name="remove" size={18} fill="currentColor" /></span>
              <span className="ei-route-tx"><span className="ei-route-title">Delete solution draft</span></span></button></div>
          </div>
        ) : null}
      </div>
    );
  }

  function Creation() {
    return (
      <div className="ei-wiz-body">
        <div className="ei-hero small">
          <div className="ei-hero-ic"><OIIcon name="studio_icon" size={18} fill="#FFFFFF" /></div>
          <div className="ei-hero-tt">{draft.name || 'New solution'}</div>
          <div className="ei-hero-sub">Complete each task below, then develop and deploy.</div>
        </div>
        <div className="ei-route-list">
          <RouteTile icon="edit" title="Name" sub={draft.name ? draft.name : 'Define the solution name.'}
            done={draft.done.name} onOpen={openName} onEdit={openName} />
          <RouteTile icon="ops_workspace" title="Layout" sub={draft.layout ? layoutName(draft.layout) : 'Choose the layout.'}
            done={draft.done.layout} onOpen={openLayout} onEdit={openLayout} />
          <RouteTile icon="admin_hub" title="Refine Layout" sub="Configure, navigation, modules, access."
            done={draft.done.refine} onOpen={openRefine} onEdit={openRefine} />
        </div>
        <div className="ei-route-list ei-route-control">
          <div className="ei-route"><button className="ei-route-main" onClick={saveDraft}>
            <span className="ei-route-ic"><OIIcon name="document" size={18} fill="currentColor" /></span>
            <span className="ei-route-tx"><span className="ei-route-title">Save as Draft</span></span></button></div>
          <RouteTileControl disabled={!allDone || (deploy && deploy.busy)} busy={deploy && deploy.busy} onClick={develop} />
          <div className="ei-route"><button className="ei-route-main" onClick={function () { setView('menu'); }}>
            <span className="ei-route-ic"><OIIcon name="chevron_right" size={18} fill="currentColor" /></span>
            <span className="ei-route-tx"><span className="ei-route-title">Back to the menu</span></span></button></div>
        </div>
        {deploy && deploy.busy ? (
          <div className="ei-deploy-bar">
            <div className="ei-deploy-fill" />
            <span>Developing and deploying into Enterprise Solutions.</span>
            <button className="ei-deploy-abort" onClick={confirmAbort}><OIIcon name="remove" size={14} fill="currentColor" />Abort</button>
          </div>
        ) : null}
        {deploy && deploy.aborting ? (
          <div className="ei-deploy-bar aborting"><div className="ei-deploy-fill" /><span>Aborting and rolling back from Enterprise Solutions.</span></div>
        ) : null}
        {deploy && deploy.url ? (
          <a className="ei-result-tile" href={deploy.url} target="_blank" rel="noopener noreferrer">
            <span className="ei-result-ic"><OIIcon name="open_in_new" size={18} fill="#FFFFFF" /></span>
            <span className="ei-result-tx"><span className="ei-result-tt">Solution Preview: {draft.name}</span>
              <span className="ei-result-sub">{deploy.url}</span></span>
            <OIIcon name="chevron_right" size={18} fill="#00895E" />
          </a>
        ) : null}
        {deploy && deploy.error ? <div className="ei-wiz-echo">{deploy.error}</div> : null}
      </div>
    );
  }

  function layoutName(id) { for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].id === id) return LAYOUTS[i].name; return id; }

  // ----- render -----
  return (
    <div className="ei-wiz">
      <div className="ei-flow-title">Solution Development</div>
      {view === 'menu' ? MainMenu() : view === 'drafts' ? Drafts() : Creation()}
      <div className="ei-wiz-actions">
        {view === 'creation' ? <button className="ei-btn-ghost" onClick={function () { setView('menu'); }}><OIIcon name="chevron_right" size={14} fill="currentColor" />Menu</button> : null}
        {view === 'drafts' ? <button className="ei-btn-ghost" onClick={function () { setView('menu'); }}><OIIcon name="chevron_right" size={14} fill="currentColor" />Back to the menu</button> : null}
        <button className="ei-btn-ghost" onClick={onExit}><OIIcon name="chevron_right" size={14} fill="currentColor" />Back to the catalog</button>
      </div>

      {modal === 'name' ? (
        <Modal title="Solution name" onSave={saveName} saveDisabled={!nameDraft.trim()} onClose={function () { setModal(null); }}>
          <p className="ei-modal-help">This name is the branding of your solution. It appears in the header of the solution and as the browser tab title.
          {'\n'}Keep it short so it fits the tab without being cut off.</p>
          <input className="ei-wiz-input one" maxLength={NAME_MAX} placeholder="For example: Operations Intelligence"
            value={nameDraft} onChange={function (e) { setNameDraft(e.target.value); }}
            onKeyDown={function (e) { if (e.key === 'Enter' && nameDraft.trim()) saveName(); }} autoFocus />
          <div className="ei-modal-counter">{nameDraft.length} of {NAME_MAX} characters</div>
        </Modal>
      ) : null}

      {modal === 'layout' ? (
        <Modal title="Choose a layout" onSave={saveLayout} saveDisabled={!layoutSel} onClose={function () { setModal(null); }}>
          <p className="ei-modal-help">Select the layout for your solution. Use the arrows to browse, then click the layout name to select it.</p>
          <div className="ei-layout-picker">
            <button className="ei-arrow" title="Previous" onClick={function () { setLayoutIdx((layoutIdx + LAYOUTS.length - 1) % LAYOUTS.length); }}>
              <OIIcon name="chevron_right" size={22} fill="currentColor" /></button>
            <div className="ei-layout-frame"><LayoutFrame layout={LAYOUTS[layoutIdx].id} /></div>
            <button className="ei-arrow next" title="Next" onClick={function () { setLayoutIdx((layoutIdx + 1) % LAYOUTS.length); }}>
              <OIIcon name="chevron_right" size={22} fill="currentColor" /></button>
          </div>
          <button className={'ei-layout-name' + (layoutSel === LAYOUTS[layoutIdx].id ? ' selected' : '')}
            onClick={function () { setLayoutSel(LAYOUTS[layoutIdx].id); }}>{LAYOUTS[layoutIdx].name}</button>
        </Modal>
      ) : null}

      {modal === 'refine' ? (
        <RefineModal draft={draft} onClose={function () { setModal(null); }} onSave={saveRefine} callServer={callServer} />
      ) : null}

      {modal === 'note' ? (
        <Modal title="Notice" onClose={function () { setModal(null); }}>
          <p className="ei-modal-help">{note}</p>
        </Modal>
      ) : null}

      {modal === 'confirm_develop' ? (
        <Modal title="Develop and deploy" onSave={runDevelop} onClose={function () { setModal(null); }}>
          <p className="ei-modal-help">The solution details are finalised and will now be developed and deployed into Enterprise Solutions.
          {'\n'}Confirm to begin, or close to keep editing.</p>
        </Modal>
      ) : null}

      {modal === 'confirm_abort' ? (
        <Modal title="Abort development" onSave={runAbort} onClose={function () { setModal(null); }}>
          <p className="ei-modal-help">Abort the development of this solution? Everything created in Enterprise Solutions so far is rolled back and deleted.
          {'\n'}You can then adjust the tasks above and try again, or save as a draft.</p>
        </Modal>
      ) : null}

      {modal === 'confirm_delete' ? (
        <Modal title="Delete draft" onSave={function () { deleteDraft(selDraft); setModal(null); }} onClose={function () { setModal(null); }}>
          <p className="ei-modal-help">Delete the draft "{selDraft && selDraft.name}"? This cannot be undone.</p>
        </Modal>
      ) : null}
    </div>
  );
}

// The develop and deploy control tile with its gated and busy states.
function RouteTileControl(props) {
  return (
    <div className={'ei-route develop' + (props.disabled ? ' disabled' : '')}>
      <button className="ei-route-main" disabled={props.disabled} onClick={props.onClick}>
        <span className="ei-route-ic"><OIIcon name={props.busy ? 'refresh' : 'play'} size={18} fill="currentColor" /></span>
        <span className="ei-route-tx"><span className="ei-route-title">{props.busy ? 'Developing…' : 'Develop and Deploy'}</span>
          <span className="ei-route-sub">Available once every task above is complete.</span></span>
      </button>
    </div>
  );
}
