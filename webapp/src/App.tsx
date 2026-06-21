import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Toasts from './components/ui/Toast';
import Workspace from './components/sections/Workspace';
import Activity from './components/sections/Activity';
import Studio from './components/sections/Studio';
import Governance from './components/sections/Governance';
import Command from './components/sections/Command';
import type { InitData, SectionId } from './types';
import { loadSection } from './api/engine';

function AccessDenied({ loginUrl }: { loginUrl?: string }) {
  return (
    <div className="oi-access-denied">
      <div className="oi-access-denied-card">
        <i className="fa fa-lock oi-access-denied-icon" />
        <h1 className="oi-access-denied-title">Access Restricted</h1>
        <p className="oi-access-denied-desc">
          You do not have access to Operations Intelligence. Contact your system administrator
          to request access.
        </p>
        {loginUrl && (
          <a href={loginUrl} className="oi-btn primary md">
            <i className="fa fa-sign-in-alt" /> Sign In
          </a>
        )}
      </div>
    </div>
  );
}

function SectionContent() {
  const { state } = useApp();
  const { sectionId, sectionLoading, globalError, sectionData } = state;

  if (globalError) {
    return (
      <div className="oi-error-banner">
        <i className="fa fa-exclamation-triangle" />
        <span>{globalError}</span>
      </div>
    );
  }

  if (sectionLoading && !sectionData) {
    return (
      <div className="oi-spinner-center full">
        <div className="oi-spinner lg" />
        <div className="oi-spinner-label">Loading…</div>
      </div>
    );
  }

  switch (sectionId) {
    case 'workspace': return <Workspace />;
    case 'activity': return <Activity />;
    case 'studio': return <Studio />;
    case 'governance': return <Governance />;
    case 'command': return <Command />;
    default:
      return (
        <div className="oi-empty-state">
          <i className="fa fa-bolt oi-empty-icon" />
          <div className="oi-empty-title">Operations Intelligence</div>
          <div className="oi-empty-sub">Select a section from the sidebar to get started.</div>
        </div>
      );
  }
}

function Shell() {
  const { state, dispatch, toast } = useApp();
  const { sidebarCollapsed, mobileOpen, authValid, init } = state;

  useEffect(() => {
    if (init?.initialSection && !state.sectionId) {
      const id = init.initialSection as SectionId;
      dispatch({ type: 'SET_SECTION', payload: id });
      dispatch({ type: 'SET_SECTION_LOADING', payload: true });
      loadSection(id)
        .then(data => dispatch({ type: 'SET_SECTION_DATA', payload: data.sectionData ?? {} }))
        .catch(() => toast('Failed to load initial section.', 'error'))
        .finally(() => dispatch({ type: 'SET_SECTION_LOADING', payload: false }));
    }
  }, []);

  if (!authValid) {
    return <AccessDenied loginUrl={init?.deniedLogin} />;
  }

  return (
    <div
      className={[
        'oi-shell',
        sidebarCollapsed ? 'sb-collapsed' : '',
        mobileOpen ? 'mobile-nav-open' : '',
      ].filter(Boolean).join(' ')}
    >
      {mobileOpen && (
        <div className="oi-mobile-overlay" onClick={() => dispatch({ type: 'CLOSE_MOBILE' })} />
      )}
      <Sidebar />
      <div className="oi-main">
        <Topbar />
        <main className="oi-content">
          <SectionContent />
        </main>
      </div>
      <Toasts />
    </div>
  );
}

export default function App({ initialData }: { initialData: InitData }) {
  return (
    <AppProvider initData={initialData}>
      <Shell />
    </AppProvider>
  );
}
