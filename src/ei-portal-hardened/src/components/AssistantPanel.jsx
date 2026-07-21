import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';
import { ASSISTANT_CONFIGS } from '../data.js';
import { FLOWS } from '../flows.js';
import { loadModel, generate, backendOf } from '../model.js';

// The Enterprise Assistant ALWAYS generates on-device (WebGPU, with a pure-JS fallback). This is
// the default and only chat engine, not an option. The model loads through the bridge as soon as
// the Assistant mounts and stays running for the session; every message is generated on-device.
var CHAT_MODEL = 'technology';
var CHAT_TOKENS = 24;

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
function FlowPanel({ flowId, onExit }) {
  var flow = FLOWS[flowId];
  var st = useState({ nodeId: flow.root, stack: [] });
  var state = st[0], setState = st[1];
  useEffect(function () { setState({ nodeId: flow.root, stack: [] }); }, [flowId]);
  var node = flow.nodes[state.nodeId] || flow.nodes[flow.root];
  function choose(opt) { setState(function (s) { return { nodeId: opt.next, stack: s.stack.concat([s.nodeId]) }; }); }
  function back() {
    setState(function (s) {
      if (s.stack.length === 0) { onExit(); return s; }
      var stack = s.stack.slice(); var prev = stack.pop(); return { nodeId: prev, stack: stack };
    });
  }
  return (
    <div className="ei-flow">
      <div className="ei-flow-title">{flow.title}</div>
      <div className="ei-flow-text">{node.text}</div>
      <div className="ei-flow-options">
        {node.options.map(function (o, i) {
          return (
            <button key={i} className="ei-flow-opt" onClick={function () { choose(o); }}>
              <span>{o.label}</span><OIIcon name="chevron_right" size={15} fill="currentColor" />
            </button>
          );
        })}
      </div>
      <button className="ei-flow-back" onClick={back}>
        <OIIcon name="chevron_right" size={14} fill="currentColor" />
        <span>{state.stack.length === 0 ? 'Back to the catalog' : 'Back'}</span>
      </button>
    </div>
  );
}

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

  // On-device model is always running: start loading it as soon as the Assistant mounts.
  useEffect(function () {
    ensureModel(bridgeRef.current, function () { force(function (x) { return x + 1; }); })['catch'](function () {});
  }, []);

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
    ensureModel(bridgeRef.current, onStatus).then(function (st) {
      patchMsg(mid, '');
      return generate(st, text, CHAT_TOKENS, function (soFar) { patchMsg(mid, soFar); });
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
    : (_model.phase === 'loading' ? 'Loading model ' + _model.pct + '%' : (_model.phase === 'gpu' ? 'Preparing' : (_model.phase === 'error' ? 'Model offline' : 'Starting')));

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
        <FlowPanel key={activeFlow + ':' + flowNonce} flowId={activeFlow} onExit={function () { dispatch({ type: 'END_FLOW' }); }} />
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
