import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';
import { ASSISTANT_CONFIGS } from '../data.js';
import { loadModel, generate, isLoaded, backendOf } from '../model.js';

// On-device generation uses the smallest verified model. The heavy models want more than one
// bridge load can comfortably stream; technology is the interactive default.
var ONDEVICE_MODEL = 'technology';
var ONDEVICE_TOKENS = 24;

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

export default function AssistantPanel({ sectionId }) {
  var cfg = ASSISTANT_CONFIGS[sectionId] || ASSISTANT_CONFIGS.workspace;
  var app = useApp();
  var callServer = app.callServer;
  var dispatch = app.dispatch;
  var seed = app.state && app.state.assistantSeed;
  var [messages, setMessages] = useState([]);
  var [query, setQuery] = useState('');
  var [busy, setBusy] = useState(false);
  var [onDevice, setOnDevice] = useState(false);
  var bottomRef = useRef(null);
  var inputRef = useRef(null);

  useEffect(function () { setMessages([]); }, [sectionId]);
  useEffect(function () {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update one message's text in place (used for streaming tokens and load progress).
  function patchMsg(id, text) {
    setMessages(function (prev) {
      return prev.map(function (m) { return m.id === id ? { id: m.id, role: m.role, text: text, tag: m.tag } : m; });
    });
  }

  // Server-routed reply (default, instant).
  function serverReply(text, sid) {
    return callServer({ action: 'assistant_query', section: sid, query: text }).then(function (res) {
      return (res && res.reply) || (res && res.message) || 'I have received your query and am processing it.';
    });
  }

  // Caches the loaded on-device model state across messages in this panel.
  var _cacheRef = useRef({});

  var send = useCallback(function () {
    var text = query.trim();
    if (!text || busy) return;
    setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'user', text: text }); });
    setQuery('');
    setBusy(true);
    var done = function () { setBusy(false); };
    if (onDevice) {
      var bridge = { call: callServer };
      var mid = nextId();
      setMessages(function (prev) { return prev.concat({ id: mid, role: 'assistant', text: 'Preparing the on device model.', tag: 'on device' }); });
      var ensure = isLoaded(ONDEVICE_MODEL)
        ? Promise.resolve(_cacheRef.current.st)
        : loadModel(bridge, ONDEVICE_MODEL, function (d, t, phase) {
            patchMsg(mid, phase === 'gpu' ? 'Preparing the model on your device.' : 'Loading the model. ' + Math.round(d / t * 100) + ' percent.');
          });
      ensure.then(function (st) {
        _cacheRef.current.st = st;
        patchMsg(mid, '');
        return generate(st, text, ONDEVICE_TOKENS, function (soFar) { patchMsg(mid, soFar); }).then(function () {
          setMessages(function (prev) { return prev.map(function (m) {
            return m.id === mid ? { id: m.id, role: m.role, text: m.text || ' ', tag: (backendOf(ONDEVICE_MODEL) === 'webgpu' ? 'on device, gpu' : 'on device') } : m;
          }); });
        });
      })['catch'](function () {
        return serverReply(text, sectionId).then(function (r) { patchMsg(mid, r); });
      }).then(done, done);
    } else {
      serverReply(text, sectionId).then(function (reply) {
        setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'assistant', text: reply }); });
      })['catch'](function () {
        setMessages(function (prev) { return prev.concat({ id: nextId(), role: 'error', text: 'Unable to reach the assistant. Please try again.' }); });
      }).then(done, done);
    }
  }, [query, busy, sectionId, callServer, onDevice]);

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

  return (
    <div className="ei-assistant-panel">
      <div className="ei-asst-hdr">
        <div className="ei-asst-hdr-icon">
          <OIIcon name="assistant" size={16} fill="#FFFFFF" />
        </div>
        <div className="ei-asst-hdr-info">
          <div className="ei-asst-hdr-name">{cfg.name}</div>
          <div className="ei-asst-hdr-tag">{cfg.tagline}</div>
        </div>
        <button
          className={'ei-asst-mode' + (onDevice ? ' on' : '')}
          onClick={function () { setOnDevice(function (v) { return !v; }); }}
          title="Run the model on your device"
        >
          On device
        </button>
      </div>

      <div className="ei-asst-messages">
        {messages.length === 0 && <Welcome name={cfg.name} tagline={cfg.tagline} />}
        {messages.map(function (m) {
          return (
            <div key={m.id} className={'ei-chat-msg ' + m.role}>
              <div className="ei-chat-bubble">
                {m.text}
                {m.tag && <span className="ei-chat-tag">{m.tag}</span>}
              </div>
            </div>
          );
        })}
        {busy && !onDevice && (
          <div className="ei-chat-msg assistant">
            <div className="ei-chat-bubble ei-asst-typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

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
    </div>
  );
}
