(function () {
  'use strict';

  var React = window.React;
  var ReactDOM = window.ReactDOM;
  delete window.React;
  delete window.ReactDOM;

  var h = React.createElement;

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
    { id: 'workspace',   label: 'Workspace',    icon: '\u{1F4CA}' },
    { id: 'activity',    label: 'My Activity',  icon: '⚡' },
    { id: 'studio',      label: 'Studio',       icon: '\u{1F6E0}' },
    { id: 'governance',  label: 'Governance',   icon: '\u{1F465}' },
    { id: 'command',     label: 'Command',      icon: '⚙️' }
  ];

  var initialState = {
    section: 'workspace',
    sectionData: null,
    loading: false,
    sidebarCollapsed: false,
    mobileOpen: false,
    error: null,
    toasts: [],
    locked: false,
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
      case 'SET_LOCKED':
        return Object.assign({}, state, { locked: action.payload });
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

  /* ── DevTools detection ──────────────────────────────────────── */

  function useDevToolsGuard(dispatch) {
    React.useEffect(function () {
      function checkSize() {
        var threshold = 200;
        var widthDiff = window.outerWidth - window.innerWidth;
        var heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > threshold || heightDiff > threshold) {
          dispatch({ type: 'SET_LOCKED', payload: true });
        }
      }
      function blockKey(e) {
        if (e.keyCode === 123) { e.preventDefault(); return false; }
        if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
          e.preventDefault(); return false;
        }
        if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
      }
      function blockMenu(e) { e.preventDefault(); return false; }
      window.addEventListener('resize', checkSize);
      document.addEventListener('keydown', blockKey);
      document.addEventListener('contextmenu', blockMenu);
      checkSize();
      return function () {
        window.removeEventListener('resize', checkSize);
        document.removeEventListener('keydown', blockKey);
        document.removeEventListener('contextmenu', blockMenu);
      };
    }, [dispatch]);
  }

  /* ── Root App ────────────────────────────────────────────────── */

  function App() {
    var result = React.useReducer(reducer, initialState);
    var state = result[0];
    var dispatch = result[1];

    useDevToolsGuard(dispatch);

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

    if (state.locked) {
      return h('div', { id: 'oi-root' },
        h('div', { className: 'oi-lock' },
          h('div', { className: 'oi-lock-card' },
            h('div', { className: 'oi-lock-icon' }, '🔒'),
            h('h1', { className: 'oi-lock-title' }, 'Session Paused'),
            h('p', { className: 'oi-lock-desc' }, 'Developer tools detected. Close your browser developer tools to resume your session.')
          )
        )
      );
    }

    if (state.authDenied) {
      return h('div', { id: 'oi-root' },
        h(AppContext.Provider, { value: ctx },
          h('div', { className: 'oi-denied' },
            h('div', { className: 'oi-denied-card' },
              h('div', { className: 'oi-denied-icon' }, '🚫'),
              h('h2', { className: 'oi-denied-title' }, 'Access Denied'),
              h('p', { className: 'oi-denied-desc' }, 'You do not have permission to access Operations Intelligence. Contact your administrator to request access.'),
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
                    h('span', null, '⚠️'),
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
        h('div', { className: 'oi-brand-icon' }, '⚡'),
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
            h('span', { className: 'oi-nav-icon' }, item.icon),
            h('span', { className: 'oi-nav-label' }, item.label)
          );
        })
      ),
      h('div', { className: 'oi-sb-footer' },
        h('div', { className: 'oi-user-avatar' }, userInitials),
        h('div', { className: 'oi-user-info' },
          h('div', { className: 'oi-user-name' }, userName),
          h('div', { className: 'oi-user-role' }, userRole)
        ),
        h('button', {
          className: 'oi-collapse-btn',
          onClick: function () { dispatch({ type: 'TOGGLE_SIDEBAR' }); },
          title: state.sidebarCollapsed ? 'Expand' : 'Collapse'
        }, state.sidebarCollapsed ? '»' : '«')
      )
    );
  }

  /* ── Topbar ──────────────────────────────────────────────────── */

  function Topbar(props) {
    var ctx = React.useContext(AppContext);
    var dispatch = ctx.dispatch;
    var idata = props.initData || {};
    var userName = idata.userName || 'User';
    var userInitials = idata.userInitials || initials(userName);

    return h('header', { className: 'oi-topbar' },
      h('div', { className: 'oi-topbar-left' },
        h('button', {
          className: 'oi-mobile-btn',
          onClick: function () { dispatch({ type: 'TOGGLE_MOBILE' }); }
        }, '☰'),
        h('div', { className: 'oi-breadcrumb' },
          h('span', { className: 'oi-breadcrumb-root' }, 'Operations Intelligence'),
          h('span', { className: 'oi-breadcrumb-sep' }, '►'),
          h('span', { className: 'oi-breadcrumb-current' }, props.activeNav.label)
        )
      ),
      h('div', { className: 'oi-topbar-right' },
        props.loading ? h('div', { className: 'oi-topbar-spinner' }, h('div', { className: 'oi-spinner sm' })) : null,
        h('div', { className: 'oi-topbar-user' },
          h('div', { className: 'oi-topbar-avatar' }, userInitials),
          h('span', { className: 'oi-topbar-username' }, userName)
        )
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
          h('span', { style: { fontSize: '0.8125rem', color: '#6B7B8D' } }, automations.length + ' automation' + (automations.length === 1 ? '' : 's') + ' available')
        ),
        h('div', { className: 'oi-toolbar-right' },
          h('div', { className: 'oi-search-wrap' },
            h('span', { className: 'oi-search-icon' }, '⌕'),
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
            h('div', { className: 'oi-empty-icon' }, '⚡'),
            h('div', { className: 'oi-empty-title' }, 'No automations available'),
            h('div', { className: 'oi-empty-sub' }, 'Contact your administrator to be added to a group with published automations.')
          )
        : filtered.length === 0
          ? h('div', { className: 'oi-empty' },
              h('div', { className: 'oi-empty-icon' }, '🔍'),
              h('div', { className: 'oi-empty-title' }, 'No results'),
              h('div', { className: 'oi-empty-sub' }, 'No automations match your search.')
            )
          : h('div', { className: 'oi-auto-grid' },
              filtered.map(function (auto) {
                var isBusy = !!busy[auto.sys_id];
                return h('div', { key: auto.sys_id, className: 'oi-auto-card', style: { borderTopColor: auto.category_color || '#0072CE' } },
                  h('div', { className: 'oi-auto-card-icon' }, '⚡'),
                  h('div', { className: 'oi-auto-card-name' }, auto.name),
                  h('div', { className: 'oi-auto-card-desc' }, auto.short_description || 'No description.'),
                  h('div', { className: 'oi-auto-card-owner' }, '👤 ' + (auto.owner_group || 'Unassigned')),
                  h('div', { className: 'oi-auto-card-foot' },
                    auto.usage_count != null ? h('span', { className: 'oi-td-muted', style: { fontSize: '0.75rem' } }, auto.usage_count + ' runs') : null,
                    h('button', {
                      className: 'oi-btn primary xs',
                      disabled: isBusy,
                      onClick: function () { triggerAuto(auto); }
                    }, isBusy ? h('span', { className: 'oi-spinner sm' }) : '▶ Run')
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
          h('span', { style: { fontSize: '0.8125rem', color: '#6B7B8D' } }, executions.length + ' execution' + (executions.length === 1 ? '' : 's'))
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
                  h('div', { className: 'oi-empty-icon' }, '📋'),
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
                h('button', { className: 'oi-icon-btn', onClick: function () { setSelectedEx(null); setStepLog(null); } }, '✕')
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
                      h('div', { className: 'oi-empty-icon' }, '🗄️'),
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
                      h('div', { className: 'oi-empty-icon' }, '📋'),
                      h('div', { className: 'oi-empty-title' }, 'No deliverable types'),
                      h('div', { className: 'oi-empty-sub' }, 'Deliverable types configured in the system will appear here.')
                    )
                  : h('div', { className: 'oi-auto-grid' },
                      deliverableTypes.map(function (dt, i) {
                        return h('div', { key: dt.sys_id || i, className: 'oi-auto-card' },
                          h('div', { className: 'oi-auto-card-icon' }, '📋'),
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
                            h('div', { className: 'oi-list-item-icon' }, '👥'),
                            h('div', { className: 'oi-list-item-body' },
                              h('div', { className: 'oi-list-item-title' }, g.name),
                              h('div', { className: 'oi-list-item-sub' }, g.description || '')
                            ),
                            h('span', { className: 'oi-list-item-count' }, g.member_count != null ? g.member_count : ''),
                            h('span', { className: 'oi-list-item-caret' }, '►')
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
                          }, '+ Member'),
                          h('button', { className: 'oi-icon-btn', onClick: function () { setSelectedGroup(null); } }, '✕')
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
                                      h('div', { className: 'oi-member-name' }, m.person_name || m.person_sys_id),
                                      h('div', { className: 'oi-member-role' }, m.group_role || 'member')
                                    ),
                                    h('button', {
                                      className: 'oi-icon-btn danger',
                                      title: 'Remove',
                                      onClick: function () { removeMember(m.person_sys_id); }
                                    }, '✕')
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
                        h('div', { className: 'oi-empty-icon' }, '👤'),
                        h('div', { className: 'oi-empty-title' }, 'No persons enrolled'),
                        h('div', { className: 'oi-empty-sub' }, 'Enroll a ServiceNow user to grant access.')
                      )
                    : h('table', { className: 'oi-table' },
                        h('thead', null,
                          h('tr', null,
                            h('th', null, 'Name'),
                            h('th', null, 'Username'),
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
                              h('td', null, h('span', { className: 'oi-td-mono' }, p.user_name || '')),
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
                        h('div', { className: 'oi-empty-icon' }, '✅'),
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
                            }, '✓ Approve'),
                            h('button', {
                              className: 'oi-btn danger xs',
                              onClick: function () { resolveAction(a, 'rejected'); }
                            }, '✕ Reject')
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
          h('button', { className: 'oi-modal-close', onClick: props.onClose }, '✕')
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
          props.onAdded({ person_sys_id: selectedUser.person_sys_id, person_name: selectedUser.name, group_role: 'member' });
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
          h('button', { className: 'oi-modal-close', onClick: props.onClose }, '✕')
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
            ? h('div', { className: 'oi-member-list', style: { maxHeight: '14rem', overflowY: 'auto', border: '1px solid #D8DDE6', borderRadius: '0.375rem' } },
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
                      h('div', { className: 'oi-member-role' }, u.user_name + (u.already_enrolled ? '' : ' — not enrolled in Operations Intelligence'))
                    ),
                    sel ? h('span', { style: { color: '#0072CE', fontSize: '0.875rem' } }, '✓') : null
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
          h('button', { className: 'oi-modal-close', onClick: props.onClose }, '✕')
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
            ? h('div', { className: 'oi-member-list', style: { maxHeight: '14rem', overflowY: 'auto', border: '1px solid #D8DDE6', borderRadius: '0.375rem' } },
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
                      h('div', { className: 'oi-member-role' }, u.user_name + (u.already_enrolled ? ' (already enrolled)' : ''))
                    ),
                    sel ? h('span', { style: { color: '#0072CE', fontSize: '0.875rem' } }, '✓') : null
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
              h('div', { className: 'oi-security-icon' }, '🔒'),
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

    var ICONS = { success: '✓', error: '✕', warning: '⚠️', info: 'ℹ️' };

    return h('div', { className: 'oi-toasts' },
      toasts.map(function (t) {
        return h('div', { key: t.id, className: 'oi-toast ' + (t.type || 'info') },
          h('span', { className: 'oi-toast-icon' }, ICONS[t.type] || ICONS.info),
          h('span', { className: 'oi-toast-msg' }, t.message),
          h('button', {
            className: 'oi-toast-close',
            onClick: function () { dispatch({ type: 'POP_TOAST', payload: t.id }); }
          }, '✕')
        );
      })
    );
  }

  /* ── Mount ───────────────────────────────────────────────────── */

  var container = document.getElementById('oi-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'oi-root';
    document.body.appendChild(container);
  }

  window.addEventListener('oi:ready', function (e) {
    _bridge = e.detail;
    if (_onBridgeReady) {
      var fn = _onBridgeReady;
      _onBridgeReady = null;
      fn();
    }
  }, { once: true });

  var root = ReactDOM.createRoot(container);
  root.render(h(App, null));

})();
