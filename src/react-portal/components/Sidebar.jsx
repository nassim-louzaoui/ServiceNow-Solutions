import React, { useCallback } from 'react';
import { useApp } from '../context.js';
import { MODS } from '../data.js';
import { Icons } from '../icons.js';

const NavItem = React.memo(function NavItem({ mod, active, collapsed, onClick }) {
  const Icon = Icons[mod.id];
  return (
    <button
      className={`nav-item${active ? ' active' : ''}`}
      style={{ '--mod-color': mod.color }}
      onClick={() => onClick(mod.id)}
      title={collapsed ? mod.label : undefined}
    >
      {Icon && <Icon />}
      {!collapsed && <span className="nav-label">{mod.label}</span>}
    </button>
  );
});

const Sidebar = React.memo(function Sidebar() {
  const { state, dispatch } = useApp();
  const setMod = useCallback(id => dispatch({ type: 'SET_MOD', payload: id }), [dispatch]);
  const toggleSidebar = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR' }), [dispatch]);
  const collapsed = !state.sidebarOpen;

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">OI</div>
        {!collapsed && <span className="sidebar-title">Operations Intelligence</span>}
        <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <Icons.chevron />
        </button>
      </div>
      <div className="sidebar-nav">
        {MODS.map(mod => (
          <NavItem
            key={mod.id}
            mod={mod}
            active={state.mod === mod.id}
            collapsed={collapsed}
            onClick={setMod}
          />
        ))}
      </div>
    </nav>
  );
});

export default Sidebar;
