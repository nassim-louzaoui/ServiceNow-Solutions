import React from 'react';
import { useApp } from '../context.js';
import OIIcon from '../icons.jsx';

export default function Topbar({ activeNav, loading }) {
  const { dispatch } = useApp();

  return (
    <header className="oi-topbar">
      <div className="oi-topbar-left">
        <button className="oi-mobile-btn" onClick={() => dispatch({ type: 'TOGGLE_MOBILE' })}>
          <OIIcon name="menu" size={20} />
        </button>
        <div className="oi-breadcrumb">
          <span className="oi-breadcrumb-root">Operations Intelligence</span>
          <span className="oi-breadcrumb-sep"><OIIcon name="chevron_right" size={14} /></span>
          <span className="oi-breadcrumb-current">{activeNav ? activeNav.label : ''}</span>
        </div>
      </div>
      <div className="oi-topbar-right">
        {loading && <div className="oi-topbar-spinner"><div className="oi-spinner sm" /></div>}
      </div>
    </header>
  );
}
