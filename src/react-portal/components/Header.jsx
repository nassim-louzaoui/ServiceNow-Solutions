import React from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';
import { initials } from '../helpers.js';

function monthYear() {
  var d = new Date();
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function Header({ activeNav, loading }) {
  var app = useApp();
  var dispatch = app.dispatch;
  var state = app.state;
  var idata = (state && state.initData) || {};
  var userName = idata.userName || '';
  var userInits = idata.userInitials || initials(userName);
  var notifCount = idata.notificationCount || 0;

  return (
    <header className="oi-topbar">
      <div className="oi-topbar-left">
        <button
          className="oi-mobile-btn"
          onClick={function () { dispatch({ type: 'TOGGLE_MOBILE' }); }}
          aria-label="Toggle menu"
        >
          <OIIcon name="menu" size={20} />
        </button>
        <div className="oi-breadcrumb">
          <span className="oi-breadcrumb-root">Operations Intelligence</span>
          <span className="oi-breadcrumb-sep"><OIIcon name="chevron_right" size={14} /></span>
          <span className="oi-breadcrumb-current">{activeNav ? activeNav.label : ''}</span>
        </div>
      </div>
      <div className="oi-topbar-right">
        {loading && (
          <div className="oi-topbar-spinner"><div className="oi-spinner sm" /></div>
        )}
        <span className="oi-topbar-date">{monthYear()}</span>
        <button className="oi-notif-btn" aria-label="Notifications">
          <OIIcon name="warning_icon" size={20} fill="#6E6E6E" />
          {notifCount > 0 && (
            <span className="oi-notif-badge">{notifCount > 9 ? '9+' : notifCount}</span>
          )}
        </button>
        {userName && (
          <div className="oi-topbar-avatar" title={userName}>{userInits}</div>
        )}
      </div>
    </header>
  );
}
