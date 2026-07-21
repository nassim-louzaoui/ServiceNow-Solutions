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
    <header className="ei-topbar">
      <div className="ei-topbar-left">
        <button
          className="ei-mobile-btn"
          onClick={function () { dispatch({ type: 'TOGGLE_MOBILE' }); }}
          aria-label="Toggle menu"
        >
          <OIIcon name="menu" size={20} />
        </button>
        <div className="ei-breadcrumb">
          <span className="ei-breadcrumb-root">Enterprise Intelligence</span>
          <span className="ei-breadcrumb-sep"><OIIcon name="chevron_right" size={14} /></span>
          <span className="ei-breadcrumb-current">{activeNav ? activeNav.label : ''}</span>
        </div>
      </div>
      <div className="ei-topbar-right">
        {loading && (
          <div className="ei-topbar-spinner"><div className="ei-spinner sm" /></div>
        )}
        <span className="ei-topbar-date">{monthYear()}</span>
        <button className="ei-notif-btn" aria-label="Notifications">
          <OIIcon name="bell" size={20} fill="#6E6E6E" />
          {notifCount > 0 && (
            <span className="ei-notif-badge">{notifCount > 9 ? '9+' : notifCount}</span>
          )}
        </button>
        {userName && (
          <div className="ei-topbar-avatar" title={userName}>{userInits}</div>
        )}
      </div>
    </header>
  );
}
