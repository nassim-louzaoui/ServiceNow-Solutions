import React from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';
import { initials, ROLE_LABELS } from '../helpers.js';

export default function Sidebar({ navItems, activeId, initData }) {
  const { dispatch, loadSection } = useApp();
  const idata = initData || {};
  const userName = idata.userName || 'User';
  const userRole = idata.userRole || 'member';
  const userInits = idata.userInitials || initials(userName);

  return (
    <aside className="oi-sidebar">
      <div className="oi-brand">
        <div className="oi-brand-icon">
          <OIIcon name="workspace" size={20} fill="#fff" />
        </div>
        <span className="oi-brand-text">Operations Intelligence</span>
      </div>

      <nav className="oi-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`oi-nav-item${activeId === item.id ? ' active' : ''}`}
            onClick={() => {
              if (activeId !== item.id) loadSection(item.id);
              dispatch({ type: 'CLOSE_MOBILE' });
            }}
          >
            <span className="oi-nav-icon"><OIIcon name={item.icon} size={18} fill="currentColor" /></span>
            <span className="oi-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="oi-sb-requests">
        <button className="oi-requests-btn" onClick={() => dispatch({ type: 'TOGGLE_REQUESTS' })}>
          <span className="oi-nav-icon"><OIIcon name="inbox" size={18} fill="currentColor" /></span>
          <span className="oi-nav-label">My Requests</span>
        </button>
      </div>

      <div className="oi-sb-footer">
        <div className="oi-user-avatar">{userInits}</div>
        <div className="oi-user-info">
          <div className="oi-user-name">{userName}</div>
          <div className="oi-user-role">{ROLE_LABELS[userRole] || userRole}</div>
        </div>
      </div>
    </aside>
  );
}
