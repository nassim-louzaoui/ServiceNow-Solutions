import React from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';
import { initials, ROLE_LABELS } from '../helpers.js';

export default function Sidebar({ navItems, activeId, initData, brandTitle, brandInitials }) {
  var app = useApp();
  var dispatch = app.dispatch;
  var loadSection = app.loadSection;
  var idata = initData || {};
  var userName = idata.userName || 'User';
  var userRole = idata.userRole || 'member';
  var userInits = idata.userInitials || initials(userName);

  return (
    <aside className="ei-sidebar">
      <div className="ei-brand">
        <div className="ei-brand-initials">{brandInitials || 'EI'}</div>
        <span className="ei-brand-text">{brandTitle || 'Enterprise Intelligence'}</span>
      </div>

      <nav className="ei-nav">
        {navItems.map(function (item) {
          return (
            <button
              key={item.id}
              className={'ei-nav-item' + (activeId === item.id ? ' active' : '')}
              onClick={function () {
                if (activeId !== item.id) loadSection(item.id);
                dispatch({ type: 'CLOSE_MOBILE' });
              }}
            >
              <span className="ei-nav-icon"><OIIcon name={item.icon} size={18} fill="currentColor" /></span>
              <span className="ei-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="ei-sb-footer">
        <div className="ei-user-avatar">{userInits}</div>
        <div className="ei-user-info">
          <div className="ei-user-name">{userName}</div>
          <div className="ei-user-role">{ROLE_LABELS[userRole] || userRole}</div>
        </div>
      </div>
    </aside>
  );
}
