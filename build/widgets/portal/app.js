(function () {
  'use strict';

  var React = window.React;
  var ReactDOM = window.ReactDOM;
  delete window.React;
  delete window.ReactDOM;

  var h = React.createElement;

  function OIIcon(props) {
    var size = props.size || 18;
    var paths = {
      workspace:  'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
      activity:   'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
      studio:     'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
      governance: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
      command:    'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
      user:       'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
      group:      'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
      search:     'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
      close:      'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      play:       'M8 5v14l11-7z',
      check:      'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
      plus:       'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
      remove:     'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
      error_icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
      warning_icon: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
      info_icon:  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
      lock:       'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
      denied:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z',
      automation: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z',
      refresh:    'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
      collapse:   'M11.67 3.87L9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z',
      expand:     'M12.33 3.87l1.77-1.77L24 12l-9.9 9.9-1.77-1.77L20.46 12z',
      document:   'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
      chevron_right: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
      menu:       'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
      approve:    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z',
      reject:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
      person_add: 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
      toggle_on:  'M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
      toggle_off: 'M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-10 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
      assistant: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z',
      send:      'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'
    };
    var d = paths[props.name] || paths['command'];
    return h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: props.fill || 'currentColor',
      'aria-hidden': 'true',
      style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: '0' }
    }, h('path', { d: d }));
  }

  var _bridge = null;
  var _onBridgeReady = null;
  var _toastId = 0;

  /* ── Helpers ─────────────────────────────────────────────────── */

  function relTime(val) {
    if (!val) return '';
    var d = new Date(val);
    if (isNaN(d.getTime())) return val;
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function statusClass(status) {
    if (!status) return 'neutral';
    var s = status.toLowerCase();
    if (s === 'success' || s === 'completed' || s === 'complete') return 'success';
    if (s === 'running' || s === 'in_progress' || s === 'in progress') return 'running';
    if (s === 'failed' || s === 'error' || s === 'failure') return 'failed';
    if (s === 'pending' || s === 'queued' || s === 'waiting') return 'pending';
    if (s === 'warning' || s === 'warn') return 'warning';
    if (s === 'skipped' || s === 'cancelled' || s === 'canceled') return 'neutral';
    return 'neutral';
  }

  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function noop() {}

  var ROLE_LABELS = {
    admin:      'Administrator',
    leadership: 'Leadership',
    creator:    'Creator',
    user:       'User'
  };

  function callBridge(payload, cb) {
    if (!_bridge || !_bridge.call) { cb && cb(null, 'Bridge not ready'); return; }
    _bridge.call(payload).then(
      function (res) {
        var data = res && res.data ? res.data : res;
        cb && cb(data, null);
      },
      function (err) {
        var msg = err && (err.statusText || err.message || String(err)) || 'Server error';
        cb && cb(null, msg);
      }
    );
  }

  /* ── Reducer ─────────────────────────────────────────────────── */

  var NAV_ITEMS = [
    { id: 'workspace',   label: 'Workspace',             icon: 'workspace'  },
    { id: 'activity',    label: 'My Activity',           icon: 'activity'   },
    { id: 'assistant',   label: 'Operations Assistant',  icon: 'assistant'  },
    { id: 'studio',      label: 'Studio',                icon: 'studio'     },
    { id: 'governance',  label: 'Governance',            icon: 'governance' },
    { id: 'command',     label: 'Command',               icon: 'command'    }
  ];

  var initialState = {
    section: 'workspace',
    sectionData: null,
    loading: true,
    sidebarCollapsed: false,
    mobileOpen: false,
    error: null,
    toasts: [],
    authDenied: false,
    initData: null
  };

  function reducer(state, action) {
    switch (action.type) {
      case 'SET_INIT':
        return Object.assign({}, state, { initData: action.payload, loading: false });
      case 'SET_SECTION':
        return Object.assign({}, state, { section: action.payload, sectionData: null, error: null, mobileOpen: false });
      case 'SET_SECTION_DATA':
        return Object.assign({}, state, { sectionData: action.payload, loading: false });
      case 'SET_LOADING':
        return Object.assign({}, state, { loading: action.payload });
      case 'TOGGLE_SIDEBAR':
        return Object.assign({}, state, { sidebarCollapsed: !state.sidebarCollapsed });
      case 'TOGGLE_MOBILE':
        return Object.assign({}, state, { mobileOpen: !state.mobileOpen });
      case 'CLOSE_MOBILE':
        return Object.assign({}, state, { mobileOpen: false });
      case 'SET_ERROR':
        return Object.assign({}, state, { error: action.payload, loading: false });
      case 'PUSH_TOAST':
        return Object.assign({}, state, { toasts: state.toasts.concat([action.payload]) });
      case 'POP_TOAST':
        return Object.assign({}, state, { toasts: state.toasts.filter(function (t) { return t.id !== action.payload; }) });
      case 'PATCH_SECTION_DATA':
        return Object.assign({}, state, { sectionData: Object.assign({}, state.sectionData, action.payload) });
      case 'SET_AUTH_DENIED':
        return Object.assign({}, state, { authDenied: action.payload, loading: false });
      default:
        return state;
    }
  }

  /* ── Context ─────────────────────────────────────────────────── */

  var AppContext = React.createContext(null);

  /* ── Root App ────────────────────────────────────────────────── */

  function App() {
    var result = React.useReducer(reducer, initialState);
    var state = result[0];
    var dispatch = result[1];

    function toast(message, type) {
      var id = ++_toastId;
      dispatch({ type: 'PUSH_TOAST', payload: { id: id, message: message, type: type || 'info' } });
      setTimeout(function () { dispatch({ type: 'POP_TOAST', payload: id }); }, 4000);
    }

    function callServer(payload, cb) {
      callBridge(payload, function (data, err) {
        if (err) {
          toast(err, 'error');
          cb && cb(null, err);
          return;
        }
        cb && cb(data, null);
      });
    }

    function loadSection(id) {
      dispatch({ type: 'SET_SECTION', payload: id });
      dispatch({ type: 'SET_LOADING', payload: true });
      callServer({ action: 'load_section', section: id }, function (data, err) {
        if (err) {
          dispatch({ type: 'SET_ERROR', payload: err });
          return;
        }
        dispatch({ type: 'SET_SECTION_DATA', payload: (data && data.sectionData) || {} });
      });
    }

    React.useEffect(function () {
      function startApp() {
        if (_bridge && _bridge.data && _bridge.data.denied) {
          dispatch({ type: 'SET_AUTH_DENIED', payload: true });
          return;
        }
        dispatch({ type: 'SET_LOADING', payload: true });
        callServer({ action: 'load_section', section: 'workspace' }, function (data, err) {
          if (err) { dispatch({ type: 'SET_ERROR', payload: err }); return; }
          if (data && data.denied) { dispatch({ type: 'SET_AUTH_DENIED', payload: true }); return; }
          dispatch({ type: 'SET_INIT', payload: data });
          dispatch({ type: 'SET_SECTION_DATA', payload: (data && data.sectionData) || {} });
        });
      }
      if (_bridge) {
        startApp();
      } else {
        _onBridgeReady = startApp;
      }
      return noop;
    }, []);

    React.useEffect(function () {
      var iv = setInterval(function () {
        callServer({ action: 'check_auth' }, function (data) {
          if (data && data.denied) {
            dispatch({ type: 'SET_AUTH_DENIED', payload: true });
          }
        });
      }, 60000);
      return function () { clearInterval(iv); };
    }, []);

    var ctx = { state: state, dispatch: dispatch, toast: toast, callServer: callServer, loadSection: loadSection };

    if (state.authDenied) {
      var deniedLogin = _bridge && _bridge.data && _bridge.data.deniedLogin ? _bridge.data.deniedLogin : '';
      return h('div', { id: 'oi-root' },
        h(AppContext.Provider, { value: ctx },
          h('div', { className: 'oi-denied' },
            h('div', { className: 'oi-denied-card' },
              h('div', { className: 'oi-denied-icon' }, h(OIIcon, { name: 'denied', size: 48, fill: '#D9534F' })),
              h('h2', { className: 'oi-denied-title' }, 'Access Denied'),
              h('p', { className: 'oi-denied-desc' }, 'You do not have permission to access Operations Intelligence.'),
              deniedLogin ? h('p', { className: 'oi-denied-user' }, 'Signed in as: ' + deniedLogin) : null,
              h('p', { className: 'oi-denied-hint' }, 'Contact your administrator to request one of the Operations Intelligence roles.'),
              h(ToastContainer, null)
            )
          )
        )
      );
    }

    var shellClass = 'oi-shell' +
      (state.sidebarCollapsed ? ' sb-collapsed' : '') +
      (state.mobileOpen ? ' mobile-open' : '');

    var allowedIds = state.initData && state.initData.sections
      ? state.initData.sections.map(function (s) { return s.id; })
      : null;
    var visibleNavItems = allowedIds
      ? NAV_ITEMS.filter(function (n) { return allowedIds.indexOf(n.id) !== -1; })
      : NAV_ITEMS;

    var activeNav = visibleNavItems.find(function (n) { return n.id === state.section; }) || visibleNavItems[0] || NAV_ITEMS[0];

    return h('div', { id: 'oi-root' },
      h(AppContext.Provider, { value: ctx },
        h('div', { className: shellClass },
          h('div', {
            className: 'oi-mobile-overlay',
            onClick: function () { dispatch({ type: 'CLOSE_MOBILE' }); }
          }),
          h(Sidebar, { navItems: visibleNavItems, activeId: state.section, initData: state.initData }),
          h('div', { className: 'oi-main' },
            h(Topbar, { activeNav: activeNav, loading: state.loading, initData: state.initData }),
            h('div', { className: 'oi-content' },
              state.error
                ? h('div', { className: 'oi-error-banner' },
                    h('span', null, h(OIIcon, { name: 'warning_icon', size: 16 })),
                    h('span', null, state.error)
                  )
                : null,
              h(SectionRouter, { section: state.section, sectionData: state.sectionData, loading: state.loading })
            )
          )
        ),
        h(ToastContainer, null)
      )
    );
  }

  /* ── Sidebar ─────────────────────────────────────────────────── */

  function Sidebar(props) {
    var ctx = React.useContext(AppContext);
    var state = ctx.state;
    var dispatch = ctx.dispatch;
    var idata = props.initData || {};
    var userName = idata.userName || 'User';
    var userRole = idata.userRole || 'member';
    var userInitials = idata.userInitials || initials(userName);

    return h('aside', { className: 'oi-sidebar' },
      h('div', { className: 'oi-brand' },
        h('div', { className: 'oi-brand-icon' }, h(OIIcon, { name: 'workspace', size: 20, fill: '#fff' })),
        h('span', { className: 'oi-brand-text' }, 'Operations Intelligence')
      ),
      h('nav', { className: 'oi-nav' },
        props.navItems.map(function (item) {
          return h('button', {
            key: item.id,
            className: 'oi-nav-item' + (props.activeId === item.id ? ' active' : ''),
            onClick: function () {
              if (props.activeId !== item.id) ctx.loadSection(item.id);
              dispatch({ type: 'CLOSE_MOBILE' });
            }
          },
            h('span', { className: 'oi-nav-icon' }, h(OIIcon, { name: item.icon, size: 18, fill: 'currentColor' })),
            h('span', { className: 'oi-nav-label' }, item.label)
          );
        })
      ),
      h('div', { className: 'oi-sb-footer' },
        h('div', { className: 'oi-user-avatar' }, userInitials),
        h('div', { className: 'oi-user-info' },
          h('div', { className: 'oi-user-name' }, userName),
          h('div', { className: 'oi-user-role' }, ROLE_LABELS[userRole] || userRole)
        ),
        h('button', {
          className: 'oi-collapse-btn',
          onClick: function () { dispatch({ type: 'TOGGLE_SIDEBAR' }); },
          title: state.sidebarCollapsed ? 'Expand' : 'Collapse'
        }, h(OIIcon, { name: state.sidebarCollapsed ? 'expand' : 'collapse', size: 16 }))
      )
    );
  }

  /* ── Topbar ──────────────────────────────────────────────────── */

  function Topbar(props) {
    var ctx = React.useContext(AppContext);
    var dispatch = ctx.dispatch;

    return h('header', { className: 'oi-topbar' },
      h('div', { className: 'oi-topbar-left' },
        h('button', {
          className: 'oi-mobile-btn',
          onClick: function () { dispatch({ type: 'TOGGLE_MOBILE' }); }
        }, h(OIIcon, { name: 'menu', size: 20 })),
        h('div', { className: 'oi-breadcrumb' },
          h('span', { className: 'oi-breadcrumb-root' }, 'Operations Intelligence'),
          h('span', { className: 'oi-breadcrumb-sep' }, h(OIIcon, { name: 'chevron_right', size: 14 })),
          h('span', { className: 'oi-breadcrumb-current' }, props.activeNav.label)
        )
      ),
      h('div', { className: 'oi-topbar-right' },
        props.loading ? h('div', { className: 'oi-topbar-spinner' }, h('div', { className: 'oi-spinner sm' })) : null
      )
    );
  }

  /* ── Section Router ──────────────────────────────────────────── */

  function SectionRouter(props) {
    if (props.loading && !props.sectionData) {
      return h('div', { className: 'oi-spinner-center' },
        h('div', { className: 'oi-spinner lg' }),
        h('div', { className: 'oi-spinner-label' }, 'Loading...')
      );
    }
    var data = props.sectionData || {};
    switch (props.section) {
      case 'workspace':   return h(WorkspaceSection, { data: data });
      case 'activity':    return h(ActivitySection, { data: data });
      case 'assistant':   return h(OperationsAssistantSection, { data: data });
      case 'studio':      return h(StudioSection, { data: data });
      case 'governance':  return h(GovernanceSection, { data: data });
      case 'command':     return h(CommandSection, { data: data });
      default:            return h(WorkspaceSection, { data: data });
    }
  }

  /* ── Workspace Section ───────────────────────────────────────── */

  function WorkspaceSection(props) {
    var ctx = React.useContext(AppContext);
    var data = props.data;
    var automations = data.automations || [];

    var busyResult = React.useState({});
    var busy = busyResult[0];
    var setBusy = busyResult[1];

    var searchResult = React.useState('');
    var search = searchResult[0];
    var setSearch = searchResult[1];

    var filtered = search
      ? automations.filter(function (a) {
          var q = search.toLowerCase();
          return (a.name || '').toLowerCase().indexOf(q) !== -1 ||
                 (a.short_description || '').toLowerCase().indexOf(q) !== -1 ||
                 (a.owner_group || '').toLowerCase().indexOf(q) !== -1;
        })
      : automations;

    function triggerAuto(auto) {
      var busyOn = Object.assign({}, busy); busyOn[auto.sys_id] = true; setBusy(busyOn);
      ctx.callServer({ action: 'trigger_automation', automation_sys_id: auto.sys_id, group_sys_id: auto.owner_group_sys_id }, function (d, err) {
        var busyOff = Object.assign({}, busy); busyOff[auto.sys_id] = false; setBusy(busyOff);
        if (err) { ctx.toast(err, 'error'); return; }
        var result = d && d.triggered;
        if (result && result.ok) {
          ctx.toast('Triggered: ' + (result.number || auto.name), 'success');
        } else {
          ctx.toast((result && result.error) || 'Failed to trigger.', 'error');
        }
      });
    }

    return h('div', { className: 'oi-section' },
      h('div', { className: 'oi-toolbar' },
        h('div', { className: 'oi-toolbar-left' },
          h('h1', { className: 'oi-section-title' }, 'Workspace'),
          h('span', { style: { fontSize: '0.75rem', color: '#6E6E6E' } }, automations.length + ' automation' + (automations.length === 1 ? '' : 's') + ' available')
        ),
        h('div', { className: 'oi-toolbar-right' },
          h('div', { className: 'oi-search-wrap' },
            h('span', { className: 'oi-search-icon' }, h(OIIcon, { name: 'search', size: 14 })),
            h('input', {
              className: 'oi-search-input',
              type: 'text',
              placeholder: 'Search automations…',
              value: search,
              onChange: function (e) { setSearch(e.target.value); }
            })
          )
        )
      ),
      automations.length === 0
        ? h('div', { className: 'oi-empty' },
            h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'automation', size: 40, fill: '#DCDCDC' })),
            h('div', { className: 'oi-empty-title' }, 'No automations available'),
            h('div', { className: 'oi-empty-sub' }, 'Contact your administrator to be added to a group with published automations.')
          )
        : filtered.length === 0
          ? h('div', { className: 'oi-empty' },
              h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'search', size: 40, fill: '#DCDCDC' })),
              h('div', { className: 'oi-empty-title' }, 'No results'),
              h('div', { className: 'oi-empty-sub' }, 'No automations match your search.')
            )
          : h('div', { className: 'oi-auto-grid' },
              filtered.map(function (auto) {
                var isBusy = !!busy[auto.sys_id];
                return h('div', { key: auto.sys_id, className: 'oi-auto-card', style: { borderTopColor: auto.category_color || '#00BF6F' } },
                  h('div', { className: 'oi-auto-card-icon' }, h(OIIcon, { name: 'automation', size: 20, fill: '#00BF6F' })),
                  h('div', { className: 'oi-auto-card-name' }, auto.name),
                  h('div', { className: 'oi-auto-card-desc' }, auto.short_description || 'No description.'),
                  h('div', { className: 'oi-auto-card-owner' }, h(OIIcon, { name: 'user', size: 12 }), ' ' + (auto.owner_group || 'Unassigned')),
                  h('div', { className: 'oi-auto-card-foot' },
                    auto.usage_count != null ? h('span', { className: 'oi-td-muted', style: { fontSize: '0.75rem' } }, auto.usage_count + ' runs') : null,
                    h('button', {
                      className: 'oi-btn primary xs',
                      disabled: isBusy,
                      onClick: function () { triggerAuto(auto); }
                    }, isBusy ? h('span', { className: 'oi-spinner sm' }) : [h(OIIcon, { name: 'play', size: 14 }), ' Run'])
                  )
                );
              })
            )
    );
  }

  function StatCard(props) {
    return h('div', { className: 'oi-stat' },
      h('div', { className: 'oi-stat-value' }, props.value),
      h('div', { className: 'oi-stat-label' }, props.label),
      h('div', { className: 'oi-stat-icon' }, props.icon)
    );
  }

  /* ── Activity Section ────────────────────────────────────────── */

  function ActivitySection(props) {
    var ctx = React.useContext(AppContext);
    var data = props.data;
    var executions = data.executions || [];

    var selectedResult = React.useState(null);
    var selectedEx = selectedResult[0];
    var setSelectedEx = selectedResult[1];

    var stepLogResult = React.useState(null);
    var stepLog = stepLogResult[0];
    var setStepLog = stepLogResult[1];

    var loadingLogResult = React.useState(false);
    var loadingLog = loadingLogResult[0];
    var setLoadingLog = loadingLogResult[1];

    function selectExecution(ex) {
      setSelectedEx(ex);
      setStepLog(null);
      if (!ex || !ex.sys_id) return;
      setLoadingLog(true);
      ctx.callServer({ action: 'step_log', execution_sys_id: ex.sys_id }, function (d, err) {
        setLoadingLog(false);
        if (err) { ctx.toast(err, 'error'); return; }
        setStepLog((d && d.stepLog) || []);
      });
    }

    return h('div', { className: 'oi-section' },
      h('div', { className: 'oi-toolbar' },
        h('div', { className: 'oi-toolbar-left' },
          h('h1', { className: 'oi-section-title' }, 'My Activity'),
          h('span', { style: { fontSize: '0.75rem', color: '#6E6E6E' } }, executions.length + ' execution' + (executions.length === 1 ? '' : 's'))
        )
      ),
      h('div', { className: 'oi-split' },
        h('div', { className: 'oi-list-pane' },
          h('div', { className: 'oi-card' },
            h('div', { className: 'oi-card-hdr' },
              h('span', { className: 'oi-card-title' }, 'Execution Log')
            ),
            executions.length === 0
              ? h('div', { className: 'oi-empty' },
                  h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'document', size: 40, fill: '#DCDCDC' })),
                  h('div', { className: 'oi-empty-title' }, 'No executions yet'),
                  h('div', { className: 'oi-empty-sub' }, 'Trigger an automation to see results here.')
                )
              : h('table', { className: 'oi-table clickable' },
                  h('thead', null,
                    h('tr', null,
                      h('th', null, 'Automation'),
                      h('th', null, 'Status'),
                      h('th', null, 'Group'),
                      h('th', null, 'Channel'),
                      h('th', null, 'Triggered')
                    )
                  ),
                  h('tbody', null,
                    executions.map(function (ex, i) {
                      return h('tr', {
                        key: ex.sys_id || i,
                        className: selectedEx && selectedEx.sys_id === ex.sys_id ? 'selected' : '',
                        onClick: function () { selectExecution(ex); }
                      },
                        h('td', null, h('span', { className: 'oi-td-primary' }, ex.automation_name || 'Unnamed')),
                        h('td', null, h(Badge, { cls: statusClass(ex.status) }, ex.status || 'unknown')),
                        h('td', null, h('span', { className: 'oi-td-muted' }, ex.group_name || '')),
                        h('td', null, h('span', { className: 'oi-td-mono' }, ex.channel || '')),
                        h('td', null, h('span', { className: 'oi-td-muted' }, relTime(ex.triggered_at)))
                      );
                    })
                  )
                )
          )
        ),
        selectedEx
          ? h('div', { className: 'oi-detail-pane' },
              h('div', { className: 'oi-detail-hdr' },
                h('span', { className: 'oi-detail-title' }, selectedEx.automation_name || selectedEx.name || 'Execution'),
                h('button', { className: 'oi-icon-btn', onClick: function () { setSelectedEx(null); setStepLog(null); } }, h(OIIcon, { name: 'close', size: 18 }))
              ),
              h('div', { className: 'oi-detail-meta' },
                h(Badge, { cls: statusClass(selectedEx.status) }, selectedEx.status || 'unknown'),
                h('span', { className: 'oi-td-muted' }, relTime(selectedEx.triggered_at)),
                selectedEx.group_name ? h('span', { className: 'oi-tag' }, selectedEx.group_name) : null,
                selectedEx.channel ? h('span', { className: 'oi-tag' }, selectedEx.channel) : null
              ),
              h('div', { className: 'oi-detail-body' },
                h('div', { className: 'oi-detail-sec-hdr' }, h('span', null, 'Step Log')),
                loadingLog
                  ? h('div', { className: 'oi-spinner-center' }, h('div', { className: 'oi-spinner' }))
                  : stepLog && stepLog.length > 0
                    ? h('div', { className: 'oi-timeline' },
                        stepLog.map(function (step, i) {
                          var cls = statusClass(step.status);
                          return h('div', { key: i, className: 'oi-tl-item ' + cls },
                            h('div', { className: 'oi-tl-side' },
                              h('div', { className: 'oi-tl-dot' }),
                              h('div', { className: 'oi-tl-line' })
                            ),
                            h('div', { className: 'oi-tl-content' },
                              h('div', { className: 'oi-tl-name' }, step.name || 'Step ' + (i + 1)),
                              step.message ? h('div', { className: 'oi-tl-msg' }, step.message) : null,
                              step.duration ? h('div', { className: 'oi-tl-dur' }, step.duration) : null
                            )
                          );
                        })
                      )
                    : stepLog
                      ? h('div', { className: 'oi-empty-inline' }, 'No step log available.')
                      : h('div', { className: 'oi-empty-inline' }, 'Loading step log...')
              )
            )
          : null
      )
    );
  }

  /* ── Studio Section ──────────────────────────────────────────── */

  function StudioSection(props) {
    var data = props.data;
    var artifacts = data.artifacts || [];
    var deliverableTypes = data.deliverable_types || [];

    var tabResult = React.useState('artifacts');
    var tab = tabResult[0];
    var setTab = tabResult[1];

    return h('div', { className: 'oi-section' },
      h('div', { className: 'oi-toolbar' },
        h('div', { className: 'oi-toolbar-left' },
          h('h1', { className: 'oi-section-title' }, 'Studio')
        )
      ),
      h('div', null,
        h('div', { className: 'oi-subtabs' },
          h('button', { className: 'oi-subtab' + (tab === 'artifacts' ? ' active' : ''), onClick: function () { setTab('artifacts'); } },
            'My Artifacts',
            h('span', { className: 'oi-subtab-count' }, artifacts.length)
          ),
          h('button', { className: 'oi-subtab' + (tab === 'types' ? ' active' : ''), onClick: function () { setTab('types'); } },
            'Deliverable Types',
            h('span', { className: 'oi-subtab-count' }, deliverableTypes.length)
          )
        ),
        h('div', { className: 'oi-subtab-body' },
          tab === 'artifacts'
            ? h('div', null,
                artifacts.length === 0
                  ? h('div', { className: 'oi-empty' },
                      h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'document', size: 40, fill: '#DCDCDC' })),
                      h('div', { className: 'oi-empty-title' }, 'No draft artifacts'),
                      h('div', { className: 'oi-empty-sub' }, 'Artifacts you create in draft state will appear here.')
                    )
                  : h('table', { className: 'oi-table' },
                      h('thead', null,
                        h('tr', null,
                          h('th', null, 'Number'),
                          h('th', null, 'Name'),
                          h('th', null, 'Type'),
                          h('th', null, 'Status'),
                          h('th', null, 'Updated')
                        )
                      ),
                      h('tbody', null,
                        artifacts.map(function (art, i) {
                          return h('tr', { key: art.sys_id || i },
                            h('td', null, h('span', { className: 'oi-td-mono' }, art.number || '')),
                            h('td', null, h('span', { className: 'oi-td-primary' }, art.display_name || 'Unnamed')),
                            h('td', null, h('span', { className: 'oi-tag' }, art.artifact_type || '')),
                            h('td', null, h(Badge, { cls: statusClass(art.status) }, art.status || 'draft')),
                            h('td', null, h('span', { className: 'oi-td-muted' }, relTime(art.updated_at)))
                          );
                        })
                      )
                    )
              )
            : h('div', { style: { padding: '1.25rem' } },
                deliverableTypes.length === 0
                  ? h('div', { className: 'oi-empty' },
                      h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'document', size: 40, fill: '#DCDCDC' })),
                      h('div', { className: 'oi-empty-title' }, 'No deliverable types'),
                      h('div', { className: 'oi-empty-sub' }, 'Deliverable types configured in the system will appear here.')
                    )
                  : h('div', { className: 'oi-auto-grid' },
                      deliverableTypes.map(function (dt, i) {
                        return h('div', { key: dt.sys_id || i, className: 'oi-auto-card' },
                          h('div', { className: 'oi-auto-card-icon' }, h(OIIcon, { name: 'document', size: 20, fill: '#00BF6F' })),
                          h('div', { className: 'oi-auto-card-name' }, dt.name),
                          h('div', { className: 'oi-auto-card-desc' }, dt.icon || '')
                        );
                      })
                    )
              )
        )
      )
    );
  }

  /* ── Governance Section ──────────────────────────────────────── */

  function GovernanceSection(props) {
    var ctx = React.useContext(AppContext);
    var data = props.data;

    var tabResult = React.useState('groups');
    var tab = tabResult[0];
    var setTab = tabResult[1];

    var groupsResult = React.useState(data.groups || []);
    var groups = groupsResult[0];
    var setGroups = groupsResult[1];

    var personsResult = React.useState(data.persons || []);
    var persons = personsResult[0];
    var setPersons = personsResult[1];

    var pendingResult = React.useState(data.pending_actions || []);
    var pendingActions = pendingResult[0];
    var setPendingActions = pendingResult[1];

    var selectedGroupResult = React.useState(null);
    var selectedGroup = selectedGroupResult[0];
    var setSelectedGroup = selectedGroupResult[1];

    var groupMembersResult = React.useState([]);
    var groupMembers = groupMembersResult[0];
    var setGroupMembers = groupMembersResult[1];

    var loadingMembersResult = React.useState(false);
    var loadingMembers = loadingMembersResult[0];
    var setLoadingMembers = loadingMembersResult[1];

    var showCreateGroupResult = React.useState(false);
    var showCreateGroup = showCreateGroupResult[0];
    var setShowCreateGroup = showCreateGroupResult[1];

    var showAddMemberResult = React.useState(false);
    var showAddMember = showAddMemberResult[0];
    var setShowAddMember = showAddMemberResult[1];

    var showEnrollResult = React.useState(false);
    var showEnroll = showEnrollResult[0];
    var setShowEnroll = showEnrollResult[1];

    function loadPersons() {
      ctx.callServer({ action: 'list_persons' }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        setPersons((d && d.persons) || []);
      });
    }

    function selectGroup(g) {
      setSelectedGroup(g);
      setGroupMembers([]);
      if (!g) return;
      setLoadingMembers(true);
      ctx.callServer({ action: 'list_group_members', group_sys_id: g.sys_id }, function (d, err) {
        setLoadingMembers(false);
        if (err) { ctx.toast(err, 'error'); return; }
        setGroupMembers((d && d.group_members) || []);
      });
    }

    function removeMember(personSysId) {
      if (!selectedGroup) return;
      ctx.callServer({ action: 'remove_member', group_sys_id: selectedGroup.sys_id, person_sys_id: personSysId }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        if (d && d.member_removed) {
          ctx.toast('Member removed.', 'success');
          setGroupMembers(groupMembers.filter(function (m) { return m.person_sys_id !== personSysId; }));
        } else {
          ctx.toast('Failed to remove member.', 'error');
        }
      });
    }

    function resolveAction(action, resolution) {
      ctx.callServer({ action: 'resolve_action', action_sys_id: action.sys_id, resolution: resolution }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        if (d && d.resolved) {
          ctx.toast('Action ' + resolution + '.', 'success');
          setPendingActions(pendingActions.filter(function (a) { return a.sys_id !== action.sys_id; }));
        } else {
          ctx.toast('Failed to resolve action.', 'error');
        }
      });
    }

    React.useEffect(function () {
      if (tab === 'persons') loadPersons();
    }, [tab]);

    return h('div', { className: 'oi-section' },
      h('div', { className: 'oi-toolbar' },
        h('div', { className: 'oi-toolbar-left' },
          h('h1', { className: 'oi-section-title' }, 'Governance')
        ),
        h('div', { className: 'oi-toolbar-right' },
          tab === 'groups'
            ? h('button', { className: 'oi-btn primary sm', onClick: function () { setShowCreateGroup(true); } }, '+ Create Group')
            : null,
          tab === 'persons'
            ? h('button', { className: 'oi-btn primary sm', onClick: function () { setShowEnroll(true); } }, '+ Enroll Person')
            : null
        )
      ),
      h('div', null,
        h('div', { className: 'oi-subtabs' },
          h('button', { className: 'oi-subtab' + (tab === 'groups' ? ' active' : ''), onClick: function () { setTab('groups'); setSelectedGroup(null); } },
            'Groups',
            h('span', { className: 'oi-subtab-count' }, groups.length)
          ),
          h('button', { className: 'oi-subtab' + (tab === 'persons' ? ' active' : ''), onClick: function () { setTab('persons'); } },
            'Persons',
            h('span', { className: 'oi-subtab-count' }, persons.length)
          ),
          h('button', { className: 'oi-subtab' + (tab === 'actions' ? ' active' : ''), onClick: function () { setTab('actions'); } },
            'Pending Actions',
            pendingActions.length > 0 ? h('span', { className: 'oi-subtab-count warn' }, pendingActions.length) : null
          )
        ),
        h('div', { className: 'oi-subtab-body' },
          tab === 'groups'
            ? h('div', { className: 'oi-split', style: { padding: '1.25rem' } },
                h('div', { className: 'oi-list-pane' },
                  h('div', { className: 'oi-item-list' },
                    groups.length === 0
                      ? h('div', { className: 'oi-empty-inline' }, 'No groups found.')
                      : groups.map(function (g) {
                          return h('button', {
                            key: g.sys_id,
                            className: 'oi-list-item' + (selectedGroup && selectedGroup.sys_id === g.sys_id ? ' selected' : ''),
                            onClick: function () { selectGroup(g); }
                          },
                            h('div', { className: 'oi-list-item-icon' }, h(OIIcon, { name: 'group', size: 16 })),
                            h('div', { className: 'oi-list-item-body' },
                              h('div', { className: 'oi-list-item-title' }, g.name),
                              h('div', { className: 'oi-list-item-sub' }, g.description || '')
                            ),
                            h('span', { className: 'oi-list-item-count' }, g.member_count != null ? g.member_count : ''),
                            h('span', { className: 'oi-list-item-caret' }, h(OIIcon, { name: 'chevron_right', size: 14 }))
                          );
                        })
                  )
                ),
                selectedGroup
                  ? h('div', { className: 'oi-detail-pane' },
                      h('div', { className: 'oi-detail-hdr' },
                        h('span', { className: 'oi-detail-title' }, selectedGroup.name),
                        h('div', { style: { display: 'flex', gap: '0.375rem' } },
                          h('button', {
                            className: 'oi-btn ghost xs',
                            onClick: function () { setShowAddMember(true); }
                          }, h(OIIcon, { name: 'plus', size: 14 }), ' Member'),
                          h('button', { className: 'oi-icon-btn', onClick: function () { setSelectedGroup(null); } }, h(OIIcon, { name: 'close', size: 18 }))
                        )
                      ),
                      h('div', { className: 'oi-detail-body' },
                        h('div', { className: 'oi-detail-sec-hdr' }, h('span', null, 'Members')),
                        loadingMembers
                          ? h('div', { className: 'oi-spinner-center' }, h('div', { className: 'oi-spinner' }))
                          : groupMembers.length === 0
                            ? h('div', { className: 'oi-empty-inline' }, 'No members.')
                            : h('div', { className: 'oi-member-list' },
                                groupMembers.map(function (m, i) {
                                  return h('div', { key: m.person_sys_id || i, className: 'oi-member-item' },
                                    h('div', { className: 'oi-member-avatar' }, initials(m.person_name || '')),
                                    h('div', { className: 'oi-member-info' },
                                      h('div', { className: 'oi-member-name' }, m.person_name || '—'),
                                      m.person_email ? h('div', { className: 'oi-member-role' }, m.person_email) : null,
                                      h('div', { className: 'oi-member-role' }, m.group_role || 'user')
                                    ),
                                    h('button', {
                                      className: 'oi-icon-btn danger',
                                      title: 'Remove',
                                      onClick: function () { removeMember(m.person_sys_id); }
                                    }, h(OIIcon, { name: 'remove', size: 14 }))
                                  );
                                })
                              )
                      )
                    )
                  : null
              )
            : tab === 'persons'
              ? h('div', null,
                  persons.length === 0
                    ? h('div', { className: 'oi-empty' },
                        h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'user', size: 40, fill: '#DCDCDC' })),
                        h('div', { className: 'oi-empty-title' }, 'No persons enrolled'),
                        h('div', { className: 'oi-empty-sub' }, 'Enroll a ServiceNow user to grant access.')
                      )
                    : h('table', { className: 'oi-table' },
                        h('thead', null,
                          h('tr', null,
                            h('th', null, 'Name'),
                            h('th', null, 'Username / Email'),
                            h('th', null, 'Groups'),
                            h('th', null, 'Status'),
                            h('th', null, '')
                          )
                        ),
                        h('tbody', null,
                          persons.map(function (p, i) {
                            return h('tr', { key: p.sys_id || i },
                              h('td', null,
                                h('div', { className: 'oi-person-cell' },
                                  h('div', { className: 'oi-avatar-sm' }, initials(p.name || '')),
                                  h('span', { className: 'oi-td-primary' }, p.name || '')
                                )
                              ),
                              h('td', null,
                                h('div', null,
                                  h('div', { className: 'oi-td-mono' }, p.user_name || '—'),
                                  p.email ? h('div', { className: 'oi-td-muted' }, p.email) : null
                                )
                              ),
                              h('td', null,
                                (p.groups || []).map(function (g, gi) {
                                  return h('span', { key: gi, className: 'oi-tag' }, g.group_name);
                                })
                              ),
                              h('td', null, h(Badge, { cls: p.active ? 'success' : 'neutral' }, p.active ? 'Active' : 'Inactive')),
                              h('td', null,
                                h('button', {
                                  className: 'oi-btn danger xs',
                                  onClick: function () { unenrollPerson(p, setPersons, persons, ctx); }
                                }, 'Unenroll')
                              )
                            );
                          })
                        )
                      )
                )
              : h('div', { className: 'oi-action-list' },
                  pendingActions.length === 0
                    ? h('div', { className: 'oi-empty' },
                        h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'check', size: 40, fill: '#DCDCDC' })),
                        h('div', { className: 'oi-empty-title' }, 'All clear'),
                        h('div', { className: 'oi-empty-sub' }, 'No pending actions require attention.')
                      )
                    : pendingActions.map(function (a, i) {
                        return h('div', { key: a.sys_id || i, className: 'oi-action-item' },
                          h('div', { className: 'oi-action-info' },
                            h('div', { className: 'oi-action-type' }, a.type || 'Action'),
                            h('div', { className: 'oi-action-desc' }, a.description || ''),
                            a.subject_user_name ? h('div', { className: 'oi-action-meta' }, 'Re: ' + a.subject_user_name) : null,
                            h('div', { className: 'oi-action-meta' }, relTime(a.created))
                          ),
                          h('div', { className: 'oi-action-btns' },
                            h('button', {
                              className: 'oi-btn primary xs',
                              onClick: function () { resolveAction(a, 'approved'); }
                            }, h(OIIcon, { name: 'approve', size: 14 }), ' Approve'),
                            h('button', {
                              className: 'oi-btn danger xs',
                              onClick: function () { resolveAction(a, 'rejected'); }
                            }, h(OIIcon, { name: 'reject', size: 14 }), ' Reject')
                          )
                        );
                      })
                )
        )
      ),
      showCreateGroup
        ? h(CreateGroupModal, {
            onClose: function () { setShowCreateGroup(false); },
            onCreated: function (g) { setGroups(groups.concat([g])); }
          })
        : null,
      showAddMember && selectedGroup
        ? h(AddMemberModal, {
            group: selectedGroup,
            onClose: function () { setShowAddMember(false); },
            onAdded: function (m) { setGroupMembers(groupMembers.concat([m])); }
          })
        : null,
      showEnroll
        ? h(EnrollPersonModal, {
            onClose: function () { setShowEnroll(false); },
            onEnrolled: function (p) { setPersons(persons.concat([p])); }
          })
        : null
    );
  }

  function unenrollPerson(person, setPersons, persons, ctx) {
    ctx.callServer({ action: 'unenroll_person', person_sys_id: person.sys_id }, function (d, err) {
      if (err) { ctx.toast(err, 'error'); return; }
      if (d && d.unenrolled && d.unenrolled.ok) {
        ctx.toast(person.name + ' unenrolled.', 'success');
        setPersons(persons.filter(function (p) { return p.sys_id !== person.sys_id; }));
      } else {
        ctx.toast('Failed to unenroll.', 'error');
      }
    });
  }

  function CreateGroupModal(props) {
    var ctx = React.useContext(AppContext);

    var nameResult = React.useState('');
    var name = nameResult[0];
    var setName = nameResult[1];

    var descResult = React.useState('');
    var desc = descResult[0];
    var setDesc = descResult[1];

    var busyResult = React.useState(false);
    var busy = busyResult[0];
    var setBusy = busyResult[1];

    function submit() {
      if (!name.trim()) { ctx.toast('Group name is required.', 'warning'); return; }
      setBusy(true);
      ctx.callServer({ action: 'create_group', name: name.trim(), description: desc.trim() }, function (d, err) {
        setBusy(false);
        if (err) { ctx.toast(err, 'error'); return; }
        var result = d && d.created_group;
        if (result && result.ok) {
          ctx.toast('Group created: ' + result.name, 'success');
          props.onCreated({ sys_id: result.sys_id, name: result.name, description: desc.trim(), member_count: 0 });
          props.onClose();
        } else {
          ctx.toast((result && result.error) || 'Failed to create group.', 'error');
        }
      });
    }

    return h('div', { className: 'oi-backdrop' },
      h('div', { className: 'oi-modal md' },
        h('div', { className: 'oi-modal-hdr' },
          h('span', { className: 'oi-modal-title' }, 'Create Group'),
          h('button', { className: 'oi-modal-close', onClick: props.onClose }, h(OIIcon, { name: 'close', size: 18 }))
        ),
        h('div', { className: 'oi-modal-body' },
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Group Name'),
            h('input', { className: 'oi-input', value: name, placeholder: 'e.g. Platform Engineering', onChange: function (e) { setName(e.target.value); } })
          ),
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Description'),
            h('textarea', { className: 'oi-textarea', value: desc, placeholder: 'Optional description', onChange: function (e) { setDesc(e.target.value); } })
          )
        ),
        h('div', { className: 'oi-modal-foot' },
          h('button', { className: 'oi-btn ghost', onClick: props.onClose }, 'Cancel'),
          h('button', { className: 'oi-btn primary', disabled: busy || !name.trim(), onClick: submit },
            busy ? h('span', { className: 'oi-spinner sm' }) : null,
            ' Create'
          )
        )
      )
    );
  }

  function AddMemberModal(props) {
    var ctx = React.useContext(AppContext);
    var group = props.group;

    var queryResult = React.useState('');
    var query = queryResult[0];
    var setQuery = queryResult[1];

    var resultsResult = React.useState([]);
    var results = resultsResult[0];
    var setResults = resultsResult[1];

    var searchingResult = React.useState(false);
    var searching = searchingResult[0];
    var setSearching = searchingResult[1];

    var selectedResult = React.useState(null);
    var selectedUser = selectedResult[0];
    var setSelectedUser = selectedResult[1];

    var busyResult = React.useState(false);
    var busy = busyResult[0];
    var setBusy = busyResult[1];

    function doSearch() {
      if (!query.trim()) return;
      setSearching(true);
      ctx.callServer({ action: 'search_users', query: query.trim() }, function (d, err) {
        setSearching(false);
        if (err) { ctx.toast(err, 'error'); return; }
        setResults((d && d.users) || []);
      });
    }

    function addMember() {
      if (!selectedUser) return;
      setBusy(true);
      ctx.callServer({ action: 'add_member', group_sys_id: group.sys_id, person_sys_id: selectedUser.person_sys_id }, function (d, err) {
        setBusy(false);
        if (err) { ctx.toast(err, 'error'); return; }
        if (d && d.member_added) {
          ctx.toast(selectedUser.name + ' added to ' + group.name, 'success');
          props.onAdded({ person_sys_id: selectedUser.person_sys_id, person_name: selectedUser.name, person_email: selectedUser.email || '', group_role: 'user' });
          props.onClose();
        } else {
          ctx.toast('Failed to add member.', 'error');
        }
      });
    }

    return h('div', { className: 'oi-backdrop' },
      h('div', { className: 'oi-modal md' },
        h('div', { className: 'oi-modal-hdr' },
          h('span', { className: 'oi-modal-title' }, 'Add Member to ' + group.name),
          h('button', { className: 'oi-modal-close', onClick: props.onClose }, h(OIIcon, { name: 'close', size: 18 }))
        ),
        h('div', { className: 'oi-modal-body' },
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Search Users'),
            h('div', { className: 'oi-search-row' },
              h('input', {
                className: 'oi-input',
                value: query,
                placeholder: 'Name or username...',
                onChange: function (e) { setQuery(e.target.value); },
                onKeyDown: function (e) { if (e.key === 'Enter') doSearch(); }
              }),
              h('button', { className: 'oi-btn ghost', disabled: searching, onClick: doSearch },
                searching ? h('span', { className: 'oi-spinner sm' }) : 'Search'
              )
            )
          ),
          results.length > 0
            ? h('div', { className: 'oi-member-list', style: { maxHeight: '14rem', overflowY: 'auto', border: '1px solid #DCDCDC', borderRadius: '0.375rem' } },
                results.map(function (u, i) {
                  var sel = selectedUser && selectedUser.sys_id === u.sys_id;
                  return h('button', {
                    key: u.sys_id || i,
                    className: 'oi-list-item' + (sel ? ' selected' : ''),
                    style: { opacity: u.already_enrolled ? 1 : 0.5 },
                    disabled: !u.already_enrolled,
                    onClick: function () { setSelectedUser(u); }
                  },
                    h('div', { className: 'oi-member-avatar' }, initials(u.name || '')),
                    h('div', { className: 'oi-member-info' },
                      h('div', { className: 'oi-member-name' }, u.name),
                      h('div', { className: 'oi-member-role' }, u.email || u.user_name),
                      u.already_enrolled ? null : h('div', { className: 'oi-member-role', style: { color: '#E57323' } }, 'Not enrolled — enroll from Persons tab first')
                    ),
                    sel ? h('span', { style: { color: '#00BF6F' } }, h(OIIcon, { name: 'check', size: 14 })) : null
                  );
                })
              )
            : null
        ),
        h('div', { className: 'oi-modal-foot' },
          h('button', { className: 'oi-btn ghost', onClick: props.onClose }, 'Cancel'),
          h('button', { className: 'oi-btn primary', disabled: busy || !selectedUser, onClick: addMember },
            busy ? h('span', { className: 'oi-spinner sm' }) : null,
            ' Add Member'
          )
        )
      )
    );
  }

  function EnrollPersonModal(props) {
    var ctx = React.useContext(AppContext);

    var queryResult = React.useState('');
    var query = queryResult[0];
    var setQuery = queryResult[1];

    var resultsResult = React.useState([]);
    var results = resultsResult[0];
    var setResults = resultsResult[1];

    var searchingResult = React.useState(false);
    var searching = searchingResult[0];
    var setSearching = searchingResult[1];

    var selectedResult = React.useState(null);
    var selectedUser = selectedResult[0];
    var setSelectedUser = selectedResult[1];

    var busyResult = React.useState(false);
    var busy = busyResult[0];
    var setBusy = busyResult[1];

    function doSearch() {
      if (!query.trim()) return;
      setSearching(true);
      ctx.callServer({ action: 'search_users', query: query.trim() }, function (d, err) {
        setSearching(false);
        if (err) { ctx.toast(err, 'error'); return; }
        setResults((d && d.users) || []);
      });
    }

    function enroll() {
      if (!selectedUser) return;
      setBusy(true);
      ctx.callServer({ action: 'enroll_person', user_sys_id: selectedUser.sys_id }, function (d, err) {
        setBusy(false);
        if (err) { ctx.toast(err, 'error'); return; }
        var result = d && d.enrolled;
        if (result && result.ok) {
          ctx.toast(result.name + ' enrolled.', 'success');
          props.onEnrolled({ sys_id: result.person_sys_id, name: result.name, user_name: selectedUser.user_name, active: true, groups: [] });
          props.onClose();
        } else {
          ctx.toast((result && result.error) || 'Failed to enroll.', 'error');
        }
      });
    }

    return h('div', { className: 'oi-backdrop' },
      h('div', { className: 'oi-modal md' },
        h('div', { className: 'oi-modal-hdr' },
          h('span', { className: 'oi-modal-title' }, 'Enroll Person'),
          h('button', { className: 'oi-modal-close', onClick: props.onClose }, h(OIIcon, { name: 'close', size: 18 }))
        ),
        h('div', { className: 'oi-modal-body' },
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Search ServiceNow Users'),
            h('div', { className: 'oi-search-row' },
              h('input', {
                className: 'oi-input',
                value: query,
                placeholder: 'Name or username...',
                onChange: function (e) { setQuery(e.target.value); },
                onKeyDown: function (e) { if (e.key === 'Enter') doSearch(); }
              }),
              h('button', { className: 'oi-btn ghost', disabled: searching, onClick: doSearch },
                searching ? h('span', { className: 'oi-spinner sm' }) : 'Search'
              )
            )
          ),
          results.length > 0
            ? h('div', { className: 'oi-member-list', style: { maxHeight: '14rem', overflowY: 'auto', border: '1px solid #DCDCDC', borderRadius: '0.375rem' } },
                results.map(function (u, i) {
                  var sel = selectedUser && selectedUser.sys_id === u.sys_id;
                  return h('button', {
                    key: u.sys_id || i,
                    className: 'oi-list-item' + (sel ? ' selected' : ''),
                    style: { opacity: u.already_enrolled ? 0.5 : 1 },
                    disabled: u.already_enrolled,
                    onClick: function () { setSelectedUser(u); }
                  },
                    h('div', { className: 'oi-member-avatar' }, initials(u.name || '')),
                    h('div', { className: 'oi-member-info' },
                      h('div', { className: 'oi-member-name' }, u.name),
                      h('div', { className: 'oi-member-role' }, u.email || u.user_name),
                      u.already_enrolled ? h('div', { className: 'oi-member-role', style: { color: '#E57323' } }, 'Already enrolled') : null
                    ),
                    sel ? h('span', { style: { color: '#00BF6F' } }, h(OIIcon, { name: 'check', size: 14 })) : null
                  );
                })
              )
            : null
        ),
        h('div', { className: 'oi-modal-foot' },
          h('button', { className: 'oi-btn ghost', onClick: props.onClose }, 'Cancel'),
          h('button', { className: 'oi-btn primary', disabled: busy || !selectedUser, onClick: enroll },
            busy ? h('span', { className: 'oi-spinner sm' }) : null,
            ' Enroll'
          )
        )
      )
    );
  }

  /* ── Operations Assistant Section ───────────────────────────── */

  function OperationsAssistantSection(props) {
    var ctx = React.useContext(AppContext);
    var data = props.data;
    var stats = data.stats || {};
    var recentExecutions = data.recent_executions || [];

    var messagesResult = React.useState([
      { role: 'assistant', text: 'Welcome to the Operations Assistant. Ask me to run an automation, check execution status, list your available automations, or type "help" for a full list of commands.' }
    ]);
    var messages = messagesResult[0];
    var setMessages = messagesResult[1];

    var inputResult = React.useState('');
    var input = inputResult[0];
    var setInput = inputResult[1];

    var busyResult = React.useState(false);
    var busy = busyResult[0];
    var setBusy = busyResult[1];

    function send() {
      var q = input.trim();
      if (!q || busy) return;
      var newMsgs = messages.concat([{ role: 'user', text: q }]);
      setMessages(newMsgs);
      setInput('');
      setBusy(true);
      ctx.callServer({ action: 'assistant_query', query: q }, function (d, err) {
        setBusy(false);
        if (err) {
          setMessages(newMsgs.concat([{ role: 'assistant', text: 'Error: ' + err, type: 'error' }]));
          return;
        }
        var reply = (d && d.reply) || 'I could not process that request.';
        setMessages(newMsgs.concat([{ role: 'assistant', text: reply, type: d && d.type }]));
      });
    }

    return h('div', { className: 'oi-section' },
      h('div', { className: 'oi-toolbar' },
        h('div', { className: 'oi-toolbar-left' },
          h('h1', { className: 'oi-section-title' }, 'Operations Assistant')
        )
      ),
      h('div', { className: 'oi-assistant-layout' },
        h('div', { className: 'oi-assistant-panel' },
          h('div', { className: 'oi-card' },
            h('div', { className: 'oi-card-hdr' },
              h('span', { className: 'oi-card-title' }, 'Quick Stats')
            ),
            h('div', { className: 'oi-card-body' },
              h('div', { className: 'oi-assistant-stats' },
                h(StatCard, { label: 'Available Automations', value: stats.available_automations != null ? stats.available_automations : '--', icon: h(OIIcon, { name: 'automation', size: 20, fill: '#00BF6F' }) }),
                h(StatCard, { label: 'My Executions', value: stats.my_executions != null ? stats.my_executions : '--', icon: h(OIIcon, { name: 'activity', size: 20, fill: '#00BF6F' }) }),
                h(StatCard, { label: 'My Groups', value: stats.my_groups != null ? stats.my_groups : '--', icon: h(OIIcon, { name: 'group', size: 20, fill: '#00BF6F' }) }),
                h(StatCard, { label: 'Runs Today', value: stats.executions_today != null ? stats.executions_today : '--', icon: h(OIIcon, { name: 'play', size: 20, fill: '#00BF6F' }) })
              )
            )
          ),
          h('div', { className: 'oi-card', style: { marginTop: '1rem' } },
            h('div', { className: 'oi-card-hdr' },
              h('span', { className: 'oi-card-title' }, 'Recent Activity')
            ),
            h('div', { className: 'oi-card-body' },
              recentExecutions.length === 0
                ? h('div', { className: 'oi-empty-inline' }, 'No recent executions.')
                : h('div', null,
                    recentExecutions.map(function (ex, i) {
                      return h('div', { key: ex.sys_id || i, className: 'oi-assistant-recent-item' },
                        h('div', { className: 'oi-assistant-recent-name' }, ex.automation_name || 'Unnamed'),
                        h('div', { className: 'oi-assistant-recent-meta' },
                          h(Badge, { cls: statusClass(ex.status) }, ex.status || 'unknown'),
                          h('span', { className: 'oi-td-muted', style: { marginLeft: '0.5rem' } }, relTime(ex.triggered_at))
                        )
                      );
                    })
                  )
            )
          )
        ),
        h('div', { className: 'oi-assistant-chat' },
          h('div', { className: 'oi-chat-messages' },
            messages.map(function (m, i) {
              return h('div', { key: i, className: 'oi-chat-msg ' + m.role + (m.type === 'error' ? ' error' : '') },
                h('div', { className: 'oi-chat-bubble' }, m.text)
              );
            }),
            busy ? h('div', { className: 'oi-chat-msg assistant' },
              h('div', { className: 'oi-chat-bubble oi-typing' },
                h('span', { className: 'oi-dot' }),
                h('span', { className: 'oi-dot' }),
                h('span', { className: 'oi-dot' })
              )
            ) : null
          ),
          h('div', { className: 'oi-chat-input-area' },
            h('input', {
              className: 'oi-input',
              value: input,
              placeholder: 'Ask me to run an automation, check status, list automations...',
              disabled: busy,
              onChange: function (e) { setInput(e.target.value); },
              onKeyDown: function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
            }),
            h('button', {
              className: 'oi-btn primary',
              disabled: busy || !input.trim(),
              onClick: send
            }, busy ? h('div', { className: 'oi-spinner sm' }) : h(OIIcon, { name: 'send', size: 16 }))
          )
        )
      )
    );
  }

  /* ── Command Section ─────────────────────────────────────────── */

  function CommandSection(props) {
    var ctx = React.useContext(AppContext);
    var data = props.data;
    var sysStats = data.stats || {};

    var MAINTENANCE_SECTIONS = [
      { key: 'workspace',  label: 'Workspace',   desc: 'Disable the Workspace section for all users.', prop: 'x_infte_ops_int.maintenance.workspace' },
      { key: 'activity',   label: 'My Activity',  desc: 'Disable the My Activity section for all users.', prop: 'x_infte_ops_int.maintenance.activity' },
      { key: 'studio',     label: 'Studio',       desc: 'Disable the Studio section for all users.', prop: 'x_infte_ops_int.maintenance.studio' },
      { key: 'governance', label: 'Governance',   desc: 'Disable the Governance section for all users.', prop: 'x_infte_ops_int.maintenance.governance' }
    ];

    var initMaint = {};
    MAINTENANCE_SECTIONS.forEach(function (s) {
      initMaint[s.key] = !!(data.maintenance && data.maintenance[s.key]);
    });

    var maintResult = React.useState(initMaint);
    var maint = maintResult[0];
    var setMaint = maintResult[1];

    var busyResult = React.useState({});
    var busy = busyResult[0];
    var setBusy = busyResult[1];

    function toggleMaint(section) {
      var propName = MAINTENANCE_SECTIONS.find(function (s) { return s.key === section; }).prop;
      var newVal = !maint[section];
      var busyOn = Object.assign({}, busy); busyOn[section] = true; setBusy(busyOn);
      ctx.callServer({ action: 'toggle_maintenance', prop_name: propName, value: newVal }, function (d, err) {
        var busyOff = Object.assign({}, busy); busyOff[section] = false; setBusy(busyOff);
        if (err) { ctx.toast(err, 'error'); return; }
        var next = Object.assign({}, maint);
        next[section] = newVal;
        setMaint(next);
        ctx.toast('Maintenance ' + (newVal ? 'enabled' : 'disabled') + ' for ' + section + '.', newVal ? 'warning' : 'success');
      });
    }

    return h('div', { className: 'oi-section' },
      h('div', { className: 'oi-toolbar' },
        h('div', { className: 'oi-toolbar-left' },
          h('h1', { className: 'oi-section-title' }, 'Command')
        )
      ),
      h('div', { className: 'oi-cmd-grid' },
        h('div', { className: 'oi-card' },
          h('div', { className: 'oi-card-hdr' },
            h('span', { className: 'oi-card-title' }, 'System Statistics')
          ),
          h('div', { className: 'oi-card-body' },
            h('div', { className: 'oi-info-list' },
              h('div', { className: 'oi-info-row' },
                h('span', { className: 'oi-info-label' }, 'Application Scope'),
                h('span', { className: 'oi-info-value oi-mono' }, 'x_infte_ops_int')
              ),
              h('div', { className: 'oi-info-row' },
                h('span', { className: 'oi-info-label' }, 'Engine Endpoint'),
                h('span', { className: 'oi-info-value oi-mono' }, '/api/x_infte_ops_int/ops_int_engine/v1')
              ),
              h('div', { className: 'oi-info-row' },
                h('span', { className: 'oi-info-label' }, 'Service Account'),
                h('span', { className: 'oi-info-value oi-mono' }, 'svc_operations_intelligence_api')
              ),
              h('div', { className: 'oi-info-row' },
                h('span', { className: 'oi-info-label' }, 'Total Persons'),
                h('span', { className: 'oi-info-value' }, sysStats.persons != null ? sysStats.persons : '--')
              ),
              h('div', { className: 'oi-info-row' },
                h('span', { className: 'oi-info-label' }, 'Total Groups'),
                h('span', { className: 'oi-info-value' }, sysStats.groups != null ? sysStats.groups : '--')
              ),
              h('div', { className: 'oi-info-row' },
                h('span', { className: 'oi-info-label' }, 'Published Automations'),
                h('span', { className: 'oi-info-value' }, sysStats.automations != null ? sysStats.automations : '--')
              ),
              h('div', { className: 'oi-info-row' },
                h('span', { className: 'oi-info-label' }, 'Executions Today'),
                h('span', { className: 'oi-info-value' }, sysStats.executions_today != null ? sysStats.executions_today : '--')
              )
            )
          )
        ),
        h('div', { className: 'oi-card' },
          h('div', { className: 'oi-card-hdr' },
            h('span', { className: 'oi-card-title' }, 'Maintenance Mode')
          ),
          h('div', { className: 'oi-card-body' },
            h('div', { className: 'oi-maintenance-list' },
              MAINTENANCE_SECTIONS.map(function (s) {
                var isOn = !!maint[s.key];
                var isBusy = !!busy[s.key];
                return h('div', { key: s.key, className: 'oi-maintenance-item' + (isOn ? ' active' : '') },
                  h('div', { className: 'oi-maintenance-info' },
                    h('div', { className: 'oi-maintenance-label' }, s.label + (isOn ? ' — Maintenance' : '')),
                    h('div', { className: 'oi-maintenance-desc' }, s.desc),
                    h('div', { className: 'oi-maintenance-prop' }, s.prop)
                  ),
                  isBusy
                    ? h('div', { className: 'oi-spinner sm' })
                    : h('button', {
                        className: 'oi-toggle' + (isOn ? ' on' : ''),
                        onClick: function () { toggleMaint(s.key); },
                        title: isOn ? 'Disable maintenance' : 'Enable maintenance'
                      },
                        h('span', { className: 'oi-toggle-knob' })
                      )
                );
              })
            )
          )
        ),
        h('div', { className: 'oi-card oi-full-col' },
          h('div', { className: 'oi-card-hdr' },
            h('span', { className: 'oi-card-title' }, 'Security')
          ),
          h('div', { className: 'oi-card-body' },
            h('div', { className: 'oi-security-notice' },
              h('div', { className: 'oi-security-icon' }, h(OIIcon, { name: 'lock', size: 24, fill: '#00BF6F' })),
              h('div', null,
                h('div', { className: 'oi-security-title' }, 'Credential Storage'),
                h('p', { className: 'oi-security-desc' },
                  'The engine API key is stored as ServiceNow system property ' +
                  'x_infte_ops_int.engine_key and is never exposed to the client. ' +
                  'The service account password is stored as x_infte_ops_int.svc_password. ' +
                  'Neither property is committed to source control. ' +
                  'All portal API calls are authenticated via the ServiceNow session and validated server-side.'
                )
              )
            )
          )
        )
      )
    );
  }

  /* ── Shared Components ───────────────────────────────────────── */

  function Badge(props) {
    return h('span', { className: 'oi-badge ' + (props.cls || 'neutral') }, props.children);
  }

  function ToastContainer() {
    var ctx = React.useContext(AppContext);
    var toasts = ctx.state.toasts;
    var dispatch = ctx.dispatch;

    var ICON_NAMES = { success: 'check', error: 'close', warning: 'warning_icon', info: 'info_icon' };

    return h('div', { className: 'oi-toasts' },
      toasts.map(function (t) {
        var iconName = ICON_NAMES[t.type] || ICON_NAMES.info;
        return h('div', { key: t.id, className: 'oi-toast ' + (t.type || 'info') },
          h('span', { className: 'oi-toast-icon' }, h(OIIcon, { name: iconName, size: 16 })),
          h('span', { className: 'oi-toast-msg' }, t.message),
          h('button', {
            className: 'oi-toast-close',
            onClick: function () { dispatch({ type: 'POP_TOAST', payload: t.id }); }
          }, h(OIIcon, { name: 'close', size: 14 }))
        );
      })
    );
  }

  /* ── Error Boundary ─────────────────────────────────────────── */

  function OIErrorBoundary(props) {
    React.Component.call(this, props);
    this.state = { hasError: false, errorMsg: '' };
  }
  OIErrorBoundary.prototype = Object.create(React.Component.prototype);
  OIErrorBoundary.prototype.constructor = OIErrorBoundary;
  OIErrorBoundary.getDerivedStateFromError = function (err) {
    return { hasError: true, errorMsg: err ? (err.message || String(err)) : 'Unknown error' };
  };
  OIErrorBoundary.prototype.componentDidCatch = function (err, info) {
    if (typeof console !== 'undefined') { console.error('[OI Portal]', err, info); }
  };
  OIErrorBoundary.prototype.render = function () {
    if (this.state.hasError) {
      var msg = this.state.errorMsg;
      return h('div', { className: 'oi-crash' },
        h('div', { className: 'oi-crash-card' },
          h('div', { className: 'oi-crash-icon' }, h(OIIcon, { name: 'error_icon', size: 40, fill: '#D9534F' })),
          h('h2', { className: 'oi-crash-title' }, 'Portal Error'),
          h('p', { className: 'oi-crash-desc' }, 'An unexpected error prevented the Operations Intelligence portal from loading.'),
          h('code', { className: 'oi-crash-msg' }, msg),
          h('button', { className: 'oi-btn primary', style: { marginTop: '1.25rem' }, onClick: function () { window.location.reload(); } }, 'Refresh Page')
        )
      );
    }
    return this.props.children;
  };

  /* ── Mount ───────────────────────────────────────────────────── */
  // SP widget lifecycle: the controller IIFE executes during Angular's compile
  // phase, before the template HTML is linked to the DOM. $onInit fires slightly
  // later but may still precede template link in some SP versions. We wait for
  // both the oi:ready signal AND the #oi-root element to be present.

  function mountReact() {
    var container = document.getElementById('oi-root');
    if (container) {
      var root = ReactDOM.createRoot(container);
      root.render(h(OIErrorBoundary, null, h(App, null)));
      return;
    }
    var observer = new MutationObserver(function () {
      var c = document.getElementById('oi-root');
      if (c) {
        observer.disconnect();
        var root2 = ReactDOM.createRoot(c);
        root2.render(h(OIErrorBoundary, null, h(App, null)));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); }, 10000);
  }

  window.addEventListener('oi:ready', function (e) {
    _bridge = e.detail;
    if (_onBridgeReady) {
      var fn = _onBridgeReady;
      _onBridgeReady = null;
      fn();
    }
    mountReact();
  }, { once: true });

})();
