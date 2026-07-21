import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';
import { ASSISTANT_CONFIGS } from '../data.js';
import { FLOWS } from '../flows.js';
import { loadModel, generateChat, backendOf } from '../model.js';
import { buildSystem } from '../collab.js';
import NewSolutionWizard from './NewSolutionWizard.jsx';
import ExistingSolutionWizard from './ExistingSolutionWizard.jsx';

// The Enterprise Assistant is the ONLY model that speaks to the user. It ALWAYS generates on-device
// (WebGPU, with a byte-identical pure-JS fallback); this is the default and only chat engine, not an
// option. Behind the scenes it consults the three specialists (Flagship, Integration, Technology)
// through its own system channel, so their domain grounding shapes the reply while none of them ever
// addresses the user. The model loads through the bridge on the first message and stays running for
// the session; every message is generated on-device.
var CHAT_MODEL = 'assistant';
// The Assistant reasons privately then replies (Reasoning: / Reply:), so the budget must cover both
// the hidden reasoning and a full visible reply; <|endoftext|> stops it as soon as the reply ends.
var CHAT_TOKENS = 96;

// Session-wide loaded model state, so it stays running across section changes and remounts.
var _model = { st: null, loading: null, phase: 'idle', pct: 0 };

var _msgId = 0;
function nextId() { return ++_msgId; }

// Begin loading the on-device model once; return the promise (shared). onStatus reports progress.
function ensureModel(bridge, onStatus) {
  if (_model.st) return Promise.resolve(_model.st);
  if (!_model.loading) {
    _model.phase = 'loading'; _model.pct = 0;
    _model.loading = loadModel(bridge, CHAT_MODEL, function (done, total, phase) {
      _model.phase = phase === 'gpu' ? 'gpu' : 'loading';
      _model.pct = total ? Math.round(done / total * 100) : 0;
      if (onStatus) onStatus();
    }).then(function (st) {
      _model.st = st; _model.phase = 'ready'; if (onStatus) onStatus(); return st;
    })['catch'](function (e) { _model.phase = 'error'; if (onStatus) onStatus(); throw e; });
  }
  return _model.loading;
}

function Welcome({ name, tagline }) {
  return (
    <div className="ei-asst-welcome">
      <div className="ei-asst-welcome-icon"><OIIcon name="assistant" size={22} fill="#FFFFFF" /></div>
      <div className="ei-asst-welcome-name">{name}</div>
      <div className="ei-asst-welcome-tag">{tagline}</div>
    </div>
  );
}

// Closed-loop route panel: one node's guidance text + route options. Choosing replaces it with
// the next node's; Back steps toward the item's main menu, and at the root it leaves the flow.
// Nodes can be DYNAMIC: a node with `load` calls a real server bridge action on entry and renders
// live data (the list of deployed solutions, or an app's real bridge capabilities). Options may
// carry an `action` (build / apply) that runs a real bridge action and reports the result in place.
// Choosing a solution pins it as the flow's context so later steps operate on that real app.
function FlowPanel({ flowId, onExit, callServer, solutionName }) {
  var flow = FLOWS[flowId];
  var st = useState({ nodeId: flow.root, stack: [], pickedApp: null });
  var state = st[0], setState = st[1];
  var [work, setWork] = useState(null);       // action result banner
  var [dyn, setDyn] = useState({ busy: false }); // loaded data for the current node
  var node = flow.nodes[state.nodeId] || flow.nodes[flow.root];
  var picked = state.pickedApp || solutionName;

  useEffect(function () { setState({ nodeId: flow.root, stack: [], pickedApp: null }); setWork(null); }, [flowId]);

  // Load live data when the current node asks for it.
  useEffect(function () {
    if (!node.load) { setDyn({ busy: false }); return; }
    setDyn({ busy: true });
    callServer({ action: node.load, name: picked }).then(function (r) {
      var res = (r && r.result) || r || {};
      setDyn({ busy: false, data: res });
    })['catch'](function (e) { setDyn({ busy: false, error: '' + e }); });
  }, [state.nodeId, node.load]);

  function subst(text) { return ('' + text).split('{app}').join(prettyName(picked)); }

  function runAction(action) {
    setWork({ busy: true });
    callServer({ action: action === 'build' ? 'build_solution' : 'apply_change', name: picked })
      .then(function (r) {
        var res = (r && r.result) || r || {};
        if (res.status === 'built' && res.url) setWork({ url: res.url });
        else if (res.error) setWork({ error: res.error });
        else setWork({ status: res.status || 'done' });
      })['catch'](function (e) { setWork({ error: '' + e }); });
  }
  function go(nextId, pickedApp) {
    setState(function (s) {
      return { nodeId: nextId, stack: s.stack.concat([s.nodeId]), pickedApp: pickedApp !== undefined ? pickedApp : s.pickedApp };
    });
    setWork(null);
  }
  function choose(opt) { if (opt.action) runAction(opt.action); go(opt.next); }
  function back() {
    setWork(null);
    setState(function (s) {
      if (s.stack.length === 0) { onExit(); return s; }
      var stack = s.stack.slice(); var prev = stack.pop(); return { nodeId: prev, stack: stack, pickedApp: s.pickedApp };
    });
  }

  // Render the option rows: dynamic solution list, otherwise the node's static options.
  function renderOptions() {
    if (node.load === 'list_solutions') {
      var apps = (dyn.data && dyn.data.length !== undefined) ? dyn.data : [];
      if (dyn.busy) return <div className="ei-flow-text">Loading the deployed applications.</div>;
      if (apps.length === 0) return (
        <button className="ei-flow-opt" onClick={function () { go(node.emptyNext || 'start'); }}>
          <span>No applications are deployed yet</span><OIIcon name="chevron_right" size={15} fill="currentColor" />
        </button>
      );
      return apps.map(function (a, i) {
        return (
          <button key={i} className="ei-flow-opt" onClick={function () { go(node.pickNext, a.name); }}>
            <span>{a.title || prettyName(a.name)}</span><OIIcon name="chevron_right" size={15} fill="currentColor" />
          </button>
        );
      });
    }
    return (node.options || []).map(function (o, i) {
      return (
        <button key={i} className="ei-flow-opt" onClick={function () { choose(o); }}>
          <span>{o.label}</span><OIIcon name="chevron_right" size={15} fill="currentColor" />
        </button>
      );
    });
  }

  var bridge = (node.load === 'describe_bridge' && dyn.data) ? dyn.data : null;

  return (
    <div className="ei-flow">
      <div className="ei-flow-title">{flow.title}</div>
      <div className="ei-flow-text">{subst(node.text)}</div>
      {bridge && bridge.capabilities && (
        <div className="ei-flow-result">
          <span>This bridge reaches the Enterprise Assistant Model: {bridge.reaches_model ? 'yes' : 'no'}.
          {' '}It exposes {bridge.capabilities.length} capabilities.</span>
        </div>
      )}
      {work && (
        <div className="ei-flow-result">
          {work.busy && <span>Working. One moment.</span>}
          {work.url && <span>Done. The application is live at <a href={work.url} target="_blank" rel="noopener noreferrer">{work.url}</a>.</span>}
          {work.status && !work.url && !work.busy && <span>The change has been applied.</span>}
          {work.error && <span>That could not complete. {work.error}</span>}
        </div>
      )}
      <div className="ei-flow-options">{renderOptions()}</div>
      <button className="ei-flow-back" onClick={back}>
        <OIIcon name="chevron_right" size={14} fill="currentColor" />
        <span>{state.stack.length === 0 ? 'Back to the catalog' : 'Back'}</span>
      </button>
    </div>
  );
}

// A url-suffix like "operations-intelligence-new" shown as words, no dash, Title style kept simple.
function prettyName(n) { return ('' + (n || '')).split('-').join(' '); }

export default function AssistantPanel({ sectionId }) {
  var cfg = ASSISTANT_CONFIGS[sectionId] || ASSISTANT_CONFIGS.workspace;
  var app = useApp();
  var callServer = app.callServer;
  var dispatch = app.dispatch;
  var state = app.state;
  var activeFlow = state && state.activeFlow;
  var flowNonce = state && state.flowNonce;
  var [messages, setMessages] = useState([]);
  var [query, setQuery] = useState('');
  var [busy, setBusy] = useState(false);
  var [, force] = useState(0);
  var bottomRef = useRef(null);
  var bridgeRef = useRef({ call: callServer });
  bridgeRef.current = { call: callServer };

  useEffect(function () { setMessages([]); }, [sectionId]);
  useEffect(function () {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // On-device is the default (only) chat engine. It loads on the first message and then stays
  // running for the session (loading 339MB on mount would freeze the portal for catalog-only use).
  function patchMsg(id, text) {
    setMessages(function (prev) { return prev.map(function (m) { return m.id === id ? { id: m.id, role: m.role, text: text } : m; }); });
  }

  var send = useCallback(function () {
    var text = query.trim();
    if (!text || busy) return;
    setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'user', text: text }); });
    setQuery('');
    setBusy(true);
    var mid = nextId();
    setMessages(function (prev) { return prev.concat({ id: mid, role: 'assistant', text: '' }); });
    var onStatus = function () {
      if (!_model.st) patchMsg(mid, _model.phase === 'gpu' ? 'Preparing the model on your device.' : 'Loading the model. ' + _model.pct + ' percent.');
    };
    var done = function () { setBusy(false); };
    // Consult the specialists behind the scenes, then let the Assistant answer as the single voice.
    // The model reasons privately first; show a thinking state until its reply begins, then stream
    // only the reply (its reasoning is never shown to the user).
    var collab = buildSystem(text, sectionId);
    ensureModel(bridgeRef.current, onStatus).then(function (st) {
      patchMsg(mid, '');
      return generateChat(st, collab.system, text, CHAT_TOKENS, function (reply, started) {
        patchMsg(mid, started ? reply : '…');
      });
    })['catch'](function () {
      // Only if the on-device model cannot load at all, fall back to the server bridge reply.
      return callServer({ action: 'assistant_query', section: sectionId, query: text }).then(function (res) {
        patchMsg(mid, (res && res.reply) || 'The on device model is not available right now.');
      })['catch'](function () { patchMsg(mid, 'The on device model is not available right now.'); });
    }).then(done, done);
  }, [query, busy, sectionId, callServer]);

  function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }

  var inFlow = activeFlow && FLOWS[activeFlow];
  var modelTag = _model.phase === 'ready'
    ? (backendOf(CHAT_MODEL) === 'webgpu' ? 'On device, GPU' : 'On device')
    : (_model.phase === 'loading' ? 'Loading model ' + _model.pct + '%' : (_model.phase === 'gpu' ? 'Preparing' : (_model.phase === 'error' ? 'Model offline' : 'On device')));

  return (
    <div className="ei-assistant-panel">
      <div className="ei-asst-hdr">
        <div className="ei-asst-hdr-icon"><OIIcon name="assistant" size={16} fill="#FFFFFF" /></div>
        <div className="ei-asst-hdr-info">
          <div className="ei-asst-hdr-name">{cfg.name}</div>
          <div className="ei-asst-hdr-tag">{inFlow ? FLOWS[activeFlow].title : cfg.tagline}</div>
        </div>
        {!inFlow && <span className="ei-asst-status">{modelTag}</span>}
      </div>

      {inFlow ? (
        activeFlow === 'new_solution_development' ? (
          <NewSolutionWizard key={activeFlow + ':' + flowNonce}
            callServer={callServer} onExit={function () { dispatch({ type: 'END_FLOW' }); }} />
        ) : activeFlow === 'existing_solution_maintenance' ? (
          <ExistingSolutionWizard key={activeFlow + ':' + flowNonce}
            callServer={callServer} onExit={function () { dispatch({ type: 'END_FLOW' }); }} />
        ) : (
          <FlowPanel key={activeFlow + ':' + flowNonce} flowId={activeFlow}
            callServer={callServer} solutionName={'operations-intelligence-new'}
            onExit={function () { dispatch({ type: 'END_FLOW' }); }} />
        )
      ) : (
        <div className="ei-asst-messages">
          {messages.length === 0 && <Welcome name={cfg.name} tagline={cfg.tagline} />}
          {messages.map(function (m) {
            return (
              <div key={m.id} className={'ei-chat-msg ' + m.role}>
                <div className="ei-chat-bubble">{m.text || '…'}</div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {!inFlow && (
        <div className="ei-asst-input-row">
          <input className="ei-asst-input" placeholder="Ask anything..." value={query}
            onChange={function (e) { setQuery(e.target.value); }} onKeyDown={handleKey} disabled={busy} />
          <button className="ei-asst-send" onClick={send} disabled={busy || !query.trim()}>
            <OIIcon name="send" size={16} fill="#FFFFFF" />
          </button>
        </div>
      )}
    </div>
  );
}
