// Enterprise Intelligence — application shell. Same structure as the reference portal:
// sidebar | main( header + body( content + assistant rail ) ). The Workspace content is the
// Service Catalog; other sections are placeholders for now. The data bridge is a closure value
// (never on window); the server is reached only through it.
import React, { useReducer, useCallback, useRef, useEffect } from 'react';
import { initialState, reducer, AppContext } from './context.js';
import { NAV_ITEMS } from './data.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import AssistantPanel from './components/AssistantPanel.jsx';
import CatalogSection from './components/sections/CatalogSection.jsx';
import StubSection from './components/sections/StubSection.jsx';
import OIIcon from './icons.jsx';

var _bridge = null;
export function setBridge(b) { _bridge = b; }

function renderSection(sectionId, sectionData) {
  switch (sectionId) {
    case 'workspace': return React.createElement(CatalogSection, { data: sectionData || {} });
    default:          return React.createElement(StubSection, { data: sectionData || {} });
  }
}

export default function App() {
  var reduced = useReducer(reducer, initialState);
  var state = reduced[0], dispatch = reduced[1];
  var stateRef = useRef(state);
  stateRef.current = state;

  var callServer = useCallback(function (payload) {
    if (!_bridge) return Promise.reject(new Error('Bridge not available.'));
    return _bridge.call(payload).then(function (res) {
      return res && res.data !== undefined ? res.data : res;
    });
  }, []);

  var loadSection = useCallback(function (sectionId) {
    dispatch({ type: 'SET_SECTION', payload: sectionId });
    dispatch({ type: 'SET_LOADING', payload: true });
    if (!_bridge) { dispatch({ type: 'SET_LOADING', payload: false }); return; }
    _bridge.call({ action: 'load_section', section: sectionId }).then(function (res) {
      var d = res && res.data !== undefined ? res.data : res;
      dispatch({ type: 'SET_SECTION_DATA', payload: d || {} });
    }).catch(function (err) {
      dispatch({ type: 'SET_ERROR', payload: (err && err.message) || 'Failed to load section.' });
    });
  }, []);

  useEffect(function () {
    if (!_bridge) { dispatch({ type: 'SET_LOADING', payload: false }); return; }
    _bridge.call({ action: 'init' }).then(function (res) {
      var d = res && res.data !== undefined ? res.data : res;
      if (d && d.auth_denied) { dispatch({ type: 'SET_AUTH_DENIED', payload: true }); return; }
      dispatch({ type: 'SET_INIT', payload: d || {} });
      loadSection('workspace');
    }).catch(function () {
      dispatch({ type: 'SET_INIT', payload: {} });
      loadSection('workspace');
    });
  }, [loadSection]);

  var activeNav = NAV_ITEMS.find(function (n) { return n.id === state.section; }) || NAV_ITEMS[0];

  var ctx = { state: state, dispatch: dispatch, callServer: callServer, loadSection: loadSection };

  if (state.authDenied) {
    return React.createElement(AppContext.Provider, { value: ctx },
      React.createElement('div', { className: 'ei-denied' },
        React.createElement('div', { className: 'ei-denied-card' },
          React.createElement('div', { className: 'ei-denied-icon' }, React.createElement(OIIcon, { name: 'denied', size: 40, fill: '#D9534F' })),
          React.createElement('h2', { className: 'ei-denied-title' }, 'Access Denied'),
          React.createElement('p', { className: 'ei-denied-desc' }, 'You do not have permission to access Enterprise Intelligence.'),
          React.createElement('p', { className: 'ei-denied-desc' }, 'Contact your administrator to request access.')
        )
      )
    );
  }

  return React.createElement(AppContext.Provider, { value: ctx },
    React.createElement('div', { className: 'ei-shell' },
      React.createElement(Sidebar, { navItems: NAV_ITEMS, activeId: state.section, initData: state.initData }),
      React.createElement('div', { className: 'ei-main' },
        React.createElement(Header, { activeNav: activeNav, loading: state.loading }),
        React.createElement('div', { className: 'ei-body' },
          React.createElement('main', { className: 'ei-content' },
            state.error
              ? React.createElement('div', { className: 'ei-section-error' },
                  React.createElement(OIIcon, { name: 'error_icon', size: 32, fill: '#D9534F' }),
                  React.createElement('div', { className: 'ei-section-error-msg' }, state.error))
              : renderSection(state.section, state.sectionData)
          ),
          React.createElement(AssistantPanel, { sectionId: state.section || 'workspace' })
        )
      )
    )
  );
}
