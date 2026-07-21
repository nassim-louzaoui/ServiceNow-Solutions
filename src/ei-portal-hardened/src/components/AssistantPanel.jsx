import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';
import { ASSISTANT_CONFIGS } from '../data.js';
import { FLOWS } from '../flows.js';

var _msgId = 0;
function nextId() { return ++_msgId; }

function Welcome({ name, tagline }) {
  return (
    <div className="ei-asst-welcome">
      <div className="ei-asst-welcome-icon">
        <OIIcon name="assistant" size={22} fill="#FFFFFF" />
      </div>
      <div className="ei-asst-welcome-name">{name}</div>
      <div className="ei-asst-welcome-tag">{tagline}</div>
    </div>
  );
}

// The closed-loop route panel: shows one node's guidance text and its route options. Choosing an
// option replaces this panel with the next node's; Back steps toward the item's main menu, and at
// the root it leaves the flow. This is the single closed-loop surface for a catalog item.
function FlowPanel({ flowId, onExit }) {
  var flow = FLOWS[flowId];
  var rootState = { nodeId: flow.root, stack: [] };
  var st = useState(rootState);
  var state = st[0], setState = st[1];

  // Reset to root whenever the flow changes (a new catalog item was started).
  useEffect(function () { setState({ nodeId: flow.root, stack: [] }); }, [flowId]);

  var node = flow.nodes[state.nodeId] || flow.nodes[flow.root];

  function choose(opt) {
    setState(function (s) { return { nodeId: opt.next, stack: s.stack.concat([s.nodeId]) }; });
  }
  function back() {
    setState(function (s) {
      if (s.stack.length === 0) { onExit(); return s; }
      var stack = s.stack.slice();
      var prev = stack.pop();
      return { nodeId: prev, stack: stack };
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
              <span>{o.label}</span>
              <OIIcon name="chevron_right" size={15} fill="currentColor" />
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
  var seed = state && state.assistantSeed;
  var activeFlow = state && state.activeFlow;
  var flowNonce = state && state.flowNonce;
  var [messages, setMessages] = useState([]);
  var [query, setQuery] = useState('');
  var [busy, setBusy] = useState(false);
  var bottomRef = useRef(null);
  var inputRef = useRef(null);

  useEffect(function () { setMessages([]); }, [sectionId]);
  useEffect(function () {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function serverReply(text, sid) {
    return callServer({ action: 'assistant_query', section: sid, query: text }).then(function (res) {
      return (res && res.reply) || (res && res.message) || 'I have received your query and am processing it.';
    });
  }

  var send = useCallback(function () {
    var text = query.trim();
    if (!text || busy) return;
    setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'user', text: text }); });
    setQuery('');
    setBusy(true);
    serverReply(text, sectionId).then(function (reply) {
      setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'assistant', text: reply }); });
    })['catch'](function () {
      setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'error', text: 'Unable to reach the assistant. Please try again.' }); });
    }).then(function () { setBusy(false); }, function () { setBusy(false); });
  }, [query, busy, sectionId, callServer]);

  useEffect(function () {
    if (!seed) return;
    setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'user', text: seed }); });
    setBusy(true);
    dispatch({ type: 'CLEAR_ASSISTANT_SEED' });
    serverReply(seed, sectionId).then(function (reply) {
      setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'assistant', text: reply }); });
    })['catch'](function () {
      setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'error', text: 'Unable to reach the assistant. Please try again.' }); });
    }).finally(function () { setBusy(false); });
  }, [seed, sectionId, callServer, dispatch]);

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  var inFlow = activeFlow && FLOWS[activeFlow];

  return (
    <div className="ei-assistant-panel">
      <div className="ei-asst-hdr">
        <div className="ei-asst-hdr-icon">
          <OIIcon name="assistant" size={16} fill="#FFFFFF" />
        </div>
        <div className="ei-asst-hdr-info">
          <div className="ei-asst-hdr-name">{cfg.name}</div>
          <div className="ei-asst-hdr-tag">{inFlow ? FLOWS[activeFlow].title : cfg.tagline}</div>
        </div>
      </div>

      {inFlow ? (
        <FlowPanel
          key={activeFlow + ':' + flowNonce}
          flowId={activeFlow}
          onExit={function () { dispatch({ type: 'END_FLOW' }); }}
        />
      ) : (
        <div className="ei-asst-messages">
          {messages.length === 0 && <Welcome name={cfg.name} tagline={cfg.tagline} />}
          {messages.map(function (m) {
            return (
              <div key={m.id} className={'ei-chat-msg ' + m.role}>
                <div className="ei-chat-bubble">{m.text}</div>
              </div>
            );
          })}
          {busy && (
            <div className="ei-chat-msg assistant">
              <div className="ei-chat-bubble ei-asst-typing"><span /><span /><span /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {!inFlow && (
        <div className="ei-asst-input-row">
          <input
            ref={inputRef}
            className="ei-asst-input"
            placeholder="Ask anything..."
            value={query}
            onChange={function (e) { setQuery(e.target.value); }}
            onKeyDown={handleKey}
            disabled={busy}
          />
          <button className="ei-asst-send" onClick={send} disabled={busy || !query.trim()}>
            <OIIcon name="send" size={16} fill="#FFFFFF" />
          </button>
        </div>
      )}
    </div>
  );
}
