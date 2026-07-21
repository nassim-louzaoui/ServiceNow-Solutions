// Enterprise Intelligence — application shell. Same structure as the reference portal:
// sidebar | main( header + body( content + assistant rail ) ). The Workspace content is the
// Service Catalog; other sections are placeholders for now. The data bridge is a closure value
// (never on window); the server is reached only through it.
import React, { useReducer, useCallback, useRef, useEffect } from 'react';
import { initialState, reducer, AppContext } from './context.js';
import { NAV_ITEMS, iconForContent, slugifyName, brandInitials } from './data.js';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import AssistantPanel from './components/AssistantPanel.jsx';
import CatalogSection from './components/sections/CatalogSection.jsx';
import ContentSection from './components/sections/ContentSection.jsx';
import StubSection from './components/sections/StubSection.jsx';
import OIIcon from './icons.jsx';

var _bridge = null;
export function setBridge(b) { _bridge = b; }

// When the server provides an appSpec (a built application), the shell renders THAT application's
// modules and content. Without it (the Enterprise Intelligence factory), it renders the default.
function navFromSpec(appSpec) {
  if (appSpec && appSpec.modules && appSpec.modules.length) {
    return appSpec.modules.map(function (m) {
      return { id: slugifyName(m.name), label: m.name, icon: iconForContent(m.content), content: m.content };
    });
  }
  return null;
}
function renderSection(sectionId, sectionData, navItems, isSpec) {
  if (isSpec) {
    var mod = null;
    for (var i = 0; i < navItems.length; i++) { if (navItems[i].id === sectionId) { mod = navItems[i]; break; } }
    if (!mod) mod = navItems[0];
    return React.createElement(ContentSection, { content: mod.content, label: mod.label, data: sectionData || {} });
  }
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

  var appSpec = state.initData && state.initData.appSpec;
  var specNav = navFromSpec(appSpec);
  var navItems = specNav || NAV_ITEMS;
  var isSpec = !!specNav;
  var brandTitle = (appSpec && appSpec.title) ? appSpec.title : 'Enterprise Intelligence';
  var brandIni = isSpec ? brandInitials(brandTitle) : 'EI';
  var layout = (appSpec && appSpec.layout) ? appSpec.layout : 'operations';
  var showAssistant = !isSpec || layout === 'operations';
  var activeId = navItems.find(function (n) { return n.id === state.section; }) ? state.section : navItems[0].id;
  var activeNav = navItems.find(function (n) { return n.id === activeId; }) || navItems[0];

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
      React.createElement(Sidebar, { navItems: navItems, activeId: activeId, initData: state.initData, brandTitle: brandTitle, brandInitials: brandIni }),
      React.createElement('div', { className: 'ei-main' },
        React.createElement(Header, { activeNav: activeNav, loading: state.loading, brandTitle: brandTitle }),
        React.createElement('div', { className: 'ei-body' + (showAssistant ? '' : ' ei-body-solo') },
          React.createElement('main', { className: 'ei-content' },
            state.error
              ? React.createElement('div', { className: 'ei-section-error' },
                  React.createElement(OIIcon, { name: 'error_icon', size: 32, fill: '#D9534F' }),
                  React.createElement('div', { className: 'ei-section-error-msg' }, state.error))
              : renderSection(activeId, state.sectionData, navItems, isSpec)
          ),
          showAssistant ? React.createElement(AssistantPanel, { sectionId: activeId || 'workspace' }) : null
        )
      )
    )
  );
}
