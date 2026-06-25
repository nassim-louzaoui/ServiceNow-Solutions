import React from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';
import { initials, ROLE_LABELS } from '../helpers.js';

export default function Sidebar({ navItems, activeId, initData }) {
  var app = useApp();
  var dispatch = app.dispatch;
  var loadSection = app.loadSection;
  var idata = initData || {};
  var userName = idata.userName || 'User';
  var userRole = idata.userRole || 'member';
  var userInits = idata.userInitials || initials(userName);
  var requestCount = idata.requestCount || 0;
  var instanceUrl = idata.instanceUrl || '/sp';

  return (
    <aside className="oi-sidebar">
      <div className="oi-brand">
        <div className="oi-brand-initials">OI</div>
        <span className="oi-brand-text">Operations Intelligence</span>
      </div>

      <nav className="oi-nav">
        {navItems.map(function (item) {
          return (
            <button
              key={item.id}
              className={'oi-nav-item' + (activeId === item.id ? ' active' : '')}
              onClick={function () {
                if (activeId !== item.id) loadSection(item.id);
                dispatch({ type: 'CLOSE_MOBILE' });
              }}
            >
              <span className="oi-nav-icon"><OIIcon name={item.icon} size={18} fill="currentColor" /></span>
              <span className="oi-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="oi-sb-bottom">
        <a
          className="oi-sb-portal-btn"
          href={instanceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <OIIcon name="open_in_new" size={15} fill="currentColor" />
          Open Service Portal
        </a>

        <button
          className="oi-requests-btn"
          onClick={function () { dispatch({ type: 'TOGGLE_REQUESTS' }); }}
        >
          <span className="oi-nav-icon"><OIIcon name="inbox" size={16} fill="currentColor" /></span>
          <span className="oi-nav-label">My Requests</span>
          {requestCount > 0 && (
            <span className="oi-req-badge">{requestCount}</span>
          )}
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
