import React, { useCallback, useMemo } from 'react';
import { useApp } from '../context.js';
import { MODS } from '../data.js';
import { Icons } from '../icons.js';

const Header = React.memo(function Header() {
  const { state, dispatch } = useApp();
  const mod = useMemo(() => MODS.find(m => m.id === state.mod), [state.mod]);
  const toggleChat = useCallback(() => dispatch({ type: 'TOGGLE_CHAT' }), [dispatch]);

  return (
    <header className="header" style={{ '--mod-color': mod?.color }}>
      <span className="header-accent" />
      <span className="header-title">{mod?.label}</span>
      <span className="header-spacer" />
      <div className="header-badge">
        <Icons.check />
        Live
      </div>
      <button
        onClick={toggleChat}
        style={{ background: state.chatOpen ? '#1e2942' : 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '6px', borderRadius: '6px', marginLeft: '4px' }}
        title={state.chatOpen ? 'Close assistant' : 'Open assistant'}
      >
        <Icons.chat />
      </button>
    </header>
  );
});

export default Header;
