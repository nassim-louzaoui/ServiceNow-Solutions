import React from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';

export default function Header({ activeNav }) {
  var app = useApp();
  var dispatch = app.dispatch;

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
        <button className="ei-help-btn" aria-label="Help" title="Help">
          <OIIcon name="help" size={20} fill="currentColor" />
        </button>
      </div>
    </header>
  );
}
