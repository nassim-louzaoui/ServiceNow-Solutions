import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';
import { ASSISTANT_CONFIGS } from '../data.js';

var _msgId = 0;

function nextId() { return ++_msgId; }

function Welcome({ name, tagline }) {
  return (
    <div className="oi-asst-welcome">
      <div className="oi-asst-welcome-icon">
        <OIIcon name="assistant" size={22} fill="#FFFFFF" />
      </div>
      <div className="oi-asst-welcome-name">{name}</div>
      <div className="oi-asst-welcome-tag">{tagline}</div>
    </div>
  );
}

export default function AssistantPanel({ sectionId }) {
  var cfg = ASSISTANT_CONFIGS[sectionId] || ASSISTANT_CONFIGS.workspace;
  var { callServer, toast } = useApp();
  var [messages, setMessages] = useState([]);
  var [query, setQuery] = useState('');
  var [busy, setBusy] = useState(false);
  var bottomRef = useRef(null);
  var inputRef = useRef(null);

  useEffect(function () {
    setMessages([]);
  }, [sectionId]);

  useEffect(function () {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  var send = useCallback(function () {
    var text = query.trim();
    if (!text || busy) return;
    var userMsg = { id: nextId(), role: 'user', text: text };
    setMessages(function (prev) { return prev.concat(userMsg); });
    setQuery('');
    setBusy(true);
    callServer({ action: 'assistant_query', section: sectionId, query: text })
      .then(function (res) {
        var reply = (res && res.reply) || (res && res.message) || 'I have received your query and am processing it.';
        var asstMsg = { id: nextId(), role: 'assistant', text: reply };
        setMessages(function (prev) { return prev.concat(asstMsg); });
      })
      .catch(function () {
        var errMsg = { id: nextId(), role: 'error', text: 'Unable to reach the assistant. Please try again.' };
        setMessages(function (prev) { return prev.concat(errMsg); });
      })
      .finally(function () {
        setBusy(false);
      });
  }, [query, busy, sectionId, callServer]);

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="oi-assistant-panel">
      <div className="oi-asst-hdr">
        <div className="oi-asst-hdr-icon">
          <OIIcon name="assistant" size={16} fill="#FFFFFF" />
        </div>
        <div className="oi-asst-hdr-info">
          <div className="oi-asst-hdr-name">{cfg.name}</div>
          <div className="oi-asst-hdr-tag">{cfg.tagline}</div>
        </div>
      </div>

      <div className="oi-asst-messages">
        {messages.length === 0 && <Welcome name={cfg.name} tagline={cfg.tagline} />}
        {messages.map(function (m) {
          return (
            <div key={m.id} className={'oi-chat-msg ' + m.role}>
              <div className="oi-chat-bubble">{m.text}</div>
            </div>
          );
        })}
        {busy && (
          <div className="oi-chat-msg assistant">
            <div className="oi-chat-bubble oi-asst-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="oi-asst-input-row">
        <input
          ref={inputRef}
          className="oi-asst-input"
          placeholder="Ask anything..."
          value={query}
          onChange={function (e) { setQuery(e.target.value); }}
          onKeyDown={handleKey}
          disabled={busy}
        />
        <button
          className="oi-asst-send"
          onClick={send}
          disabled={busy || !query.trim()}
        >
          <OIIcon name="send" size={16} fill="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}
