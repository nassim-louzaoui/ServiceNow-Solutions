import { useApp } from '../../context/AppContext';

export default function Topbar() {
  const { state, dispatch, currentLabel } = useApp();
  const { sidebarCollapsed, mobileOpen } = state;

  return (
    <header className="oi-topbar">
      <div className="oi-topbar-left">
        <button
          type="button"
          className="oi-mobile-menu-btn"
          onClick={() => dispatch({ type: 'TOGGLE_MOBILE' })}
          title={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-label="Toggle navigation"
        >
          <i className={`fa ${mobileOpen ? 'fa-times' : 'fa-bars'}`} />
        </button>
        {sidebarCollapsed && (
          <button
            type="button"
            className="oi-expand-btn"
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            title="Expand sidebar"
          >
            <i className="fa fa-bars" />
          </button>
        )}
        <div className="oi-breadcrumb">
          <span className="oi-breadcrumb-root">Operations Intelligence</span>
          {state.sectionId && (
            <>
              <i className="fa fa-chevron-right oi-breadcrumb-sep" />
              <span className="oi-breadcrumb-current">{currentLabel()}</span>
            </>
          )}
        </div>
      </div>
      <div className="oi-topbar-right">
        {state.sectionLoading && (
          <div className="oi-topbar-spinner" title="Loading...">
            <div className="oi-spinner sm" />
          </div>
        )}
        <div className="oi-topbar-user">
          <div className="oi-topbar-avatar">{state.init?.userInitials ?? '?'}</div>
          <span className="oi-topbar-username">{state.init?.userName ?? ''}</span>
        </div>
      </div>
    </header>
  );
}
