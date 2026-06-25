import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context.js';
import { CHAT } from '../data.js';
import { Icons } from '../icons.js';

const ChatPanel = React.memo(function ChatPanel() {
  const { state, dispatch } = useApp();
  const persona = useMemo(() => CHAT[state.mod] || CHAT.operations, [state.mod]);
  const history = useMemo(() => state.chatHistory[state.mod] || [], [state.chatHistory, state.mod]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = useCallback(() => {
    const q = state.chatInput.trim();
    if (!q) return;
    dispatch({
      type: 'SEND_CHAT',
      payload: { mod: state.mod, q, r: persona.r },
    });
  }, [state.chatInput, state.mod, persona, dispatch]);

  const handleKey = useCallback(e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleQuick = useCallback(() => {
    dispatch({ type: 'SET_CHAT_INPUT', payload: persona.q });
  }, [persona, dispatch]);

  if (!state.chatOpen) return null;

  return (
    <aside className="chat-panel" style={{ '--chat-color': persona.color }}>
      <div className="chat-header">
        <div className="chat-avatar">
          <Icons.chat />
        </div>
        <div>
          <div className="chat-name">{persona.name}</div>
          <div className="chat-sub">{persona.sub}</div>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        <div className="bubble assistant" dangerouslySetInnerHTML={{ __html: persona.init }} />
        {history.map((msg, i) => (
          <div
            key={i}
            className={`bubble ${msg.role}`}
            dangerouslySetInnerHTML={{ __html: msg.text }}
          />
        ))}
      </div>

      {history.length === 0 && (
        <div className="chat-quick">
          <button className="chat-quick-btn" onClick={handleQuick}>
            {persona.q}
          </button>
        </div>
      )}

      <div className="chat-input-wrap">
        <textarea
          className="chat-input"
          rows={1}
          placeholder="Ask anything..."
          value={state.chatInput}
          onChange={e => dispatch({ type: 'SET_CHAT_INPUT', payload: e.target.value })}
          onKeyDown={handleKey}
        />
        <button className="chat-send" onClick={handleSend} aria-label="Send">
          <Icons.send />
        </button>
      </div>
    </aside>
  );
});

export default ChatPanel;
