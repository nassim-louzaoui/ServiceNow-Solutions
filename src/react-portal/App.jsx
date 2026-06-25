import React, { useReducer, useCallback, useRef, useEffect } from 'react';
import { initialState, reducer, AppContext } from './context.js';
import { NAV_ITEMS } from './data.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import RequestsModal from './components/modals/RequestsModal.jsx';
import WorkspaceSection from './components/sections/Workspace.jsx';
import GallerySection from './components/sections/Gallery.jsx';
import StudioSection from './components/sections/Studio.jsx';
import GovernanceSection from './components/sections/Governance.jsx';
import CommandSection from './components/sections/Command.jsx';
import OIIcon from './icons.jsx';

var _toastId = 0;

export var _bridge = null;

export function setBridge(b) {
  _bridge = b;
}

function renderSection(sectionId, sectionData) {
  var data = sectionData || {};
  switch (sectionId) {
    case 'workspace':   return React.createElement(WorkspaceSection, { data: data });
    case 'gallery':     return React.createElement(GallerySection,   { data: data });
    case 'studio':      return React.createElement(StudioSection,    { data: data });
    case 'governance':  return React.createElement(GovernanceSection, { data: data });
    case 'command':     return React.createElement(CommandSection,   { data: data });
    default:            return React.createElement(WorkspaceSection, { data: data });
  }
}

export default function App() {
  var [state, dispatch] = useReducer(reducer, initialState);
  var stateRef = useRef(state);
  stateRef.current = state;

  var toast = useCallback(function (message, type) {
    var id = ++_toastId;
    dispatch({ type: 'PUSH_TOAST', payload: { id: id, message: message, type: type || 'info' } });
    setTimeout(function () {
      dispatch({ type: 'POP_TOAST', payload: id });
    }, 4000);
  }, []);

  var callServer = useCallback(function (payload) {
    if (!_bridge) {
      return Promise.reject(new Error('Bridge not available.'));
    }
    return _bridge.call(payload).then(function (res) {
      return res && res.data !== undefined ? res.data : res;
    });
  }, []);

  var loadSection = useCallback(function (sectionId) {
    dispatch({ type: 'SET_SECTION', payload: sectionId });
    dispatch({ type: 'SET_LOADING', payload: true });
    if (!_bridge) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    _bridge.call({ action: 'load_section', section: sectionId }).then(function (res) {
      var d = res && res.data !== undefined ? res.data : res;
      dispatch({ type: 'SET_SECTION_DATA', payload: d || {} });
    }).catch(function (err) {
      dispatch({ type: 'SET_ERROR', payload: (err && err.message) || 'Failed to load section.' });
    });
  }, []);

  useEffect(function () {
    if (!_bridge) { return; }
    _bridge.call({ action: 'init' }).then(function (res) {
      var d = res && res.data !== undefined ? res.data : res;
      if (d && d.auth_denied) {
        dispatch({ type: 'SET_AUTH_DENIED', payload: true });
        return;
      }
      dispatch({ type: 'SET_INIT', payload: d || {} });
      loadSection('workspace');
    }).catch(function (err) {
      dispatch({ type: 'SET_ERROR', payload: (err && err.message) || 'Initialization failed.' });
    });
  }, [loadSection]);

  useEffect(function () {
    if (!_bridge) { return; }
    var interval = setInterval(function () {
      if (stateRef.current.authDenied) { return; }
      _bridge.call({ action: 'check_auth' }).then(function (res) {
        var d = res && res.data !== undefined ? res.data : res;
        if (d && d.auth_denied) {
          dispatch({ type: 'SET_AUTH_DENIED', payload: true });
        }
      }).catch(function () {});
    }, 60000);
    return function () { clearInterval(interval); };
  }, []);

  var activeNav = NAV_ITEMS.find(function (n) { return n.id === state.section; }) || NAV_ITEMS[0];

  var ctx = {
    state: state,
    dispatch: dispatch,
    toast: toast,
    callServer: callServer,
    loadSection: loadSection,
  };

  if (state.authDenied) {
    return (
      <AppContext.Provider value={ctx}>
        <div className="oi-denied">
          <div className="oi-denied-card">
            <div className="oi-denied-icon"><OIIcon name="denied" size={40} fill="#D9534F" /></div>
            <h2 className="oi-denied-title">Access Denied</h2>
            <p className="oi-denied-desc">You do not have permission to access Operations Intelligence.</p>
            <p className="oi-denied-desc">Contact your administrator to request access.</p>
          </div>
        </div>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className={'oi-shell' + (state.mobileOpen ? ' mobile-open' : '')}>
        <Sidebar
          navItems={NAV_ITEMS}
          activeId={state.section}
          initData={state.initData}
        />
        <div className="oi-main">
          <Header
            activeNav={activeNav}
            loading={state.loading}
          />
          <main className="oi-content">
            {state.loading && !state.sectionData ? (
              <div className="oi-loading-center">
                <div className="oi-spinner" />
              </div>
            ) : state.error ? (
              <div className="oi-section-error">
                <OIIcon name="error_icon" size={32} fill="#D9534F" />
                <div className="oi-section-error-msg">{state.error}</div>
                <button className="oi-btn primary" onClick={function () { loadSection(state.section); }}>
                  Retry
                </button>
              </div>
            ) : (
              <ErrorBoundary key={state.section}>
                {renderSection(state.section, state.sectionData)}
              </ErrorBoundary>
            )}
          </main>
        </div>
        {state.mobileOpen && (
          <div className="oi-mobile-overlay" onClick={function () { dispatch({ type: 'CLOSE_MOBILE' }); }} />
        )}
      </div>
      <ToastContainer />
      <RequestsModal />
    </AppContext.Provider>
  );
}
