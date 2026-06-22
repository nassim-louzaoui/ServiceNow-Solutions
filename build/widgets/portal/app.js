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
      send:      'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
      request:   'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z',
      knowledge: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4zm0 14v-2.92l6-3.43 6 3.43V18H6z',
      link:      'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
      gallery:   'M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z',
      inbox:     'M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z'
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
    { id: 'workspace',  label: 'Workspace',             icon: 'workspace'  },
    { id: 'gallery',    label: 'Operations Gallery',    icon: 'gallery'    },
    { id: 'studio',     label: 'Operations Studio',     icon: 'studio'     },
    { id: 'governance', label: 'Operations Governance', icon: 'governance' },
    { id: 'command',    label: 'Operations Command',    icon: 'command'    }
  ];

  var _msgId = 0;

  var SYSTEM_FLOWS = [
    {
      id: 'report_builder',
      name: 'Report Builder',
      desc: 'Build a custom report from any ServiceNow table.',
      icon: 'document',
      color: '#00BF6F',
      steps: [
        { key: 'name', label: 'Report Name', question: 'What would you like to name this report?', type: 'text', placeholder: 'e.g. Monthly Incident Summary' },
        { key: 'table', label: 'Source Table', question: 'Which table should the report be built from?', type: 'choice', choices: [
          { value: 'incident', label: 'Incidents' },
          { value: 'change_request', label: 'Change Requests' },
          { value: 'problem', label: 'Problems' },
          { value: 'task', label: 'Tasks' },
          { value: 'sc_request', label: 'Service Requests' }
        ]},
        { key: 'report_type', label: 'Report Type', question: 'What type of report would you like?', type: 'choice', choices: [
          { value: 'list', label: 'List Report' },
          { value: 'pie', label: 'Pie Chart' },
          { value: 'bar', label: 'Bar Chart' },
          { value: 'trend', label: 'Trend Chart' },
          { value: 'pivot', label: 'Pivot Table' }
        ]},
        { key: 'group_by', label: 'Group By', question: 'How should the data be grouped?', type: 'choice', choices: [
          { value: 'assignment_group', label: 'Assignment Group' },
          { value: 'state', label: 'State' },
          { value: 'priority', label: 'Priority' },
          { value: 'category', label: 'Category' },
          { value: 'assigned_to', label: 'Assigned To' }
        ]},
        { key: 'conditions', label: 'Conditions', question: 'Any specific conditions to filter the data? Type "none" to skip.', type: 'text', placeholder: 'e.g. Priority is 1-Critical, or type "none"' }
      ]
    },
    {
      id: 'dashboard_builder',
      name: 'Dashboard Builder',
      desc: 'Create a performance dashboard for any focus area.',
      icon: 'workspace',
      color: '#293E40',
      steps: [
        { key: 'name', label: 'Dashboard Name', question: 'What would you like to call this dashboard?', type: 'text', placeholder: 'e.g. IT Operations Overview' },
        { key: 'focus_area', label: 'Focus Area', question: 'What is the primary focus area for this dashboard?', type: 'choice', choices: [
          { value: 'incidents', label: 'Incident Management' },
          { value: 'changes', label: 'Change Management' },
          { value: 'service_requests', label: 'Service Requests' },
          { value: 'problems', label: 'Problem Management' },
          { value: 'general', label: 'General Operations' }
        ]},
        { key: 'timeframe', label: 'Timeframe', question: 'What time period should the dashboard cover?', type: 'choice', choices: [
          { value: 'last_7_days', label: 'Last 7 Days' },
          { value: 'last_30_days', label: 'Last 30 Days' },
          { value: 'last_90_days', label: 'Last 90 Days' },
          { value: 'current_month', label: 'Current Month' },
          { value: 'current_year', label: 'Current Year' }
        ]},
        { key: 'visibility', label: 'Visibility', question: 'Who should be able to see this dashboard?', type: 'choice', choices: [
          { value: 'private', label: 'Private — Only Me' },
          { value: 'team', label: 'My Groups' },
          { value: 'organization', label: 'All Operations Intelligence Users' }
        ]}
      ]
    },
    {
      id: 'data_alert',
      name: 'Data Alert',
      desc: 'Monitor a table and receive email alerts when conditions match.',
      icon: 'warning_icon',
      color: '#E57323',
      steps: [
        { key: 'name', label: 'Alert Name', question: 'What would you like to call this alert?', type: 'text', placeholder: 'e.g. Critical Incidents Alert' },
        { key: 'table', label: 'Source Table', question: 'Which table should be monitored?', type: 'choice', choices: [
          { value: 'incident', label: 'Incidents' },
          { value: 'change_request', label: 'Change Requests' },
          { value: 'problem', label: 'Problems' },
          { value: 'task', label: 'Tasks' },
          { value: 'sc_request', label: 'Service Requests' }
        ]},
        { key: 'conditions', label: 'Alert Conditions', question: 'Describe the conditions that should trigger this alert:', type: 'text', placeholder: 'e.g. Priority is 1-Critical and State is New' },
        { key: 'frequency', label: 'Check Frequency', question: 'How often should this alert check for matching records?', type: 'choice', choices: [
          { value: 'hourly', label: 'Every Hour' },
          { value: 'twice_daily', label: 'Twice Daily' },
          { value: 'daily', label: 'Once Daily' },
          { value: 'weekly', label: 'Weekly' }
        ]},
        { key: 'recipients', label: 'Recipients', question: 'Who should receive this alert? Enter email addresses separated by commas:', type: 'text', placeholder: 'e.g. admin@company.com, team@company.com' }
      ]
    },
    {
      id: 'notification_rule',
      name: 'Notification Rule',
      desc: 'Send automatic notifications when specific events occur.',
      icon: 'send',
      color: '#00BF6F',
      steps: [
        { key: 'name', label: 'Rule Name', question: 'What would you like to call this notification rule?', type: 'text', placeholder: 'e.g. New Priority 1 Incident Alert' },
        { key: 'table', label: 'Source Table', question: 'Which table should trigger notifications?', type: 'choice', choices: [
          { value: 'incident', label: 'Incidents' },
          { value: 'change_request', label: 'Change Requests' },
          { value: 'problem', label: 'Problems' },
          { value: 'task', label: 'Tasks' }
        ]},
        { key: 'trigger_event', label: 'Trigger Event', question: 'When should the notification be sent?', type: 'choice', choices: [
          { value: 'insert', label: 'When a new record is created' },
          { value: 'update', label: 'When a record is updated' },
          { value: 'state_change', label: 'When the state changes' },
          { value: 'priority_change', label: 'When priority changes' }
        ]},
        { key: 'recipients', label: 'Recipients', question: 'Who should receive these notifications?', type: 'choice', choices: [
          { value: 'assigned_to', label: 'Assigned Person' },
          { value: 'watch_list', label: 'Watch List' },
          { value: 'group', label: 'Assignment Group' },
          { value: 'custom', label: 'Custom Email List' }
        ]},
        { key: 'message', label: 'Message Template', question: 'What should the notification message say?', type: 'text', placeholder: 'e.g. New Priority 1 incident: ${short_description}' }
      ]
    }
  ];

  var initialState = {
    section: 'workspace',
    sectionData: null,
    loading: true,
    mobileOpen: false,
    showRequests: false,
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
      case 'TOGGLE_REQUESTS':
        return Object.assign({}, state, { showRequests: !state.showRequests });
      case 'CLOSE_REQUESTS':
        return Object.assign({}, state, { showRequests: false });
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

    var shellClass = 'oi-shell' + (state.mobileOpen ? ' mobile-open' : '');

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
        state.showRequests
          ? h(RequestsModal, { onClose: function () { dispatch({ type: 'CLOSE_REQUESTS' }); } })
          : null,
        h(ToastContainer, null)
      )
    );
  }

  /* ── Sidebar ─────────────────────────────────────────────────── */

  function Sidebar(props) {
    var ctx = React.useContext(AppContext);
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
      h('div', { className: 'oi-sb-requests' },
        h('button', {
          className: 'oi-requests-btn',
          onClick: function () { dispatch({ type: 'TOGGLE_REQUESTS' }); }
        },
          h('span', { className: 'oi-nav-icon' }, h(OIIcon, { name: 'inbox', size: 18, fill: 'currentColor' })),
          h('span', { className: 'oi-nav-label' }, 'My Requests')
        )
      ),
      h('div', { className: 'oi-sb-footer' },
        h('div', { className: 'oi-user-avatar' }, userInitials),
        h('div', { className: 'oi-user-info' },
          h('div', { className: 'oi-user-name' }, userName),
          h('div', { className: 'oi-user-role' }, ROLE_LABELS[userRole] || userRole)
        )
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
      case 'workspace':    return h(WorkspaceSection, { data: data });
      case 'gallery':      return h(GallerySection, { data: data });
      case 'studio':       return h(StudioSection, { data: data });
      case 'governance':   return h(GovernanceSection, { data: data });
      case 'command':      return h(CommandSection, { data: data });
      default:             return h(WorkspaceSection, { data: data });
    }
  }

  /* ── Workspace Section ───────────────────────────────────────── */

  function WorkspaceSection(props) {
    var ctx = React.useContext(AppContext);
    var data = props.data;
    var groupAutomations = data.automations || [];

    var TYPE_LABELS_WS = { report: 'Report', dashboard: 'Dashboard', data_alert: 'Data Alert', notification_rule: 'Notification Rule' };

    var chatEndRef = React.useRef(null);

    var messagesResult = React.useState([{
      id: 0, role: 'assistant', type: 'text',
      text: 'Welcome to Operations Intelligence. Select a flow from the catalog to build a report, dashboard, data alert, or notification rule — or type a question and I will assist you.',
      choices: null, choiceSelected: null, result: null
    }]);
    var messages = messagesResult[0];
    var setMessages = messagesResult[1];

    var wsInputResult = React.useState('');
    var wsInput = wsInputResult[0];
    var setWsInput = wsInputResult[1];

    var chatBusyResult = React.useState(false);
    var chatBusy = chatBusyResult[0];
    var setChatBusy = chatBusyResult[1];

    var flowStateResult = React.useState({ mode: 'idle', flow: null, step: 0, collected: {} });
    var flowState = flowStateResult[0];
    var setFlowState = flowStateResult[1];

    var autoTriggerBusyResult = React.useState({});
    var autoTriggerBusy = autoTriggerBusyResult[0];
    var setAutoTriggerBusy = autoTriggerBusyResult[1];

    React.useEffect(function() {
      if (chatEndRef.current) { chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }
    }, [messages, chatBusy]);

    function nextId() { _msgId += 1; return _msgId; }

    function makeMsg(role, text, choices, type, result, items) {
      return { id: nextId(), role: role, text: text || '', choices: choices || null, choiceSelected: null, type: type || 'text', result: result || null, items: items || null };
    }

    function appendMsg(msg) {
      setMessages(function(prev) { return prev.concat([msg]); });
    }

    function addAssistantDelayed(text, choices, type, result, items) {
      var delay = 350 + Math.min((text || '').length * 7, 900);
      setChatBusy(true);
      setTimeout(function() {
        setChatBusy(false);
        appendMsg(makeMsg('assistant', text, choices, type, result, items));
      }, delay);
    }

    function renderItems(type, items) {
      if (!items || !items.length) { return null; }
      if (type === 'catalog') {
        return h('div', { className: 'oi-chat-items' },
          items.map(function(item, idx) {
            return h('a', {
              key: item.sys_id || idx,
              className: 'oi-chat-item-card catalog',
              href: item.url || '#',
              target: '_blank'
            },
              h('div', { className: 'oi-chat-item-card-row' },
                h('span', { className: 'oi-chat-item-card-name' }, item.name || item.title || ''),
                h('span', { className: 'oi-chat-item-card-action' }, h(OIIcon, { name: 'link', size: 13, fill: '#00BF6F' }))
              ),
              item.short_description ? h('div', { className: 'oi-chat-item-card-desc' }, item.short_description) : null,
              item.category ? h('div', { className: 'oi-chat-item-card-cat' }, item.category) : null
            );
          })
        );
      }
      if (type === 'knowledge') {
        return h('div', { className: 'oi-chat-items' },
          items.map(function(item, idx) {
            return h('a', {
              key: item.sys_id || idx,
              className: 'oi-chat-item-card knowledge',
              href: item.url || '#',
              target: '_blank'
            },
              h('div', { className: 'oi-chat-item-card-row' },
                item.number ? h('span', { className: 'oi-chat-item-card-num' }, item.number) : null,
                h('span', { className: 'oi-chat-item-card-name' }, item.title || item.name || ''),
                h('span', { className: 'oi-chat-item-card-action' }, h(OIIcon, { name: 'link', size: 13, fill: '#293E40' }))
              ),
              item.kb_knowledge_base ? h('div', { className: 'oi-chat-item-card-cat' }, item.kb_knowledge_base) : null
            );
          })
        );
      }
      if (type === 'requests') {
        return h('div', { className: 'oi-chat-items' },
          items.map(function(item, idx) {
            return h('a', {
              key: item.sys_id || idx,
              className: 'oi-chat-item-card request',
              href: item.url || '#',
              target: '_blank'
            },
              h('div', { className: 'oi-chat-item-card-row' },
                h('span', { className: 'oi-chat-item-card-num' }, item.number || ''),
                h('span', { className: 'oi-chat-item-card-name' }, item.short_description || ''),
                h('span', { className: 'oi-chat-item-card-action' }, h(OIIcon, { name: 'link', size: 13, fill: '#6E6E6E' }))
              ),
              h('div', { className: 'oi-chat-item-card-row' },
                h('span', { className: 'oi-chat-item-card-cat' }, item.state || ''),
                item.opened_at ? h('span', { className: 'oi-chat-item-card-date' }, item.opened_at) : null
              )
            );
          })
        );
      }
      return null;
    }

    function buildSummaryText(flow, collected) {
      var lines = ['Here is a summary of your ' + flow.name + ':'];
      var si;
      for (si = 0; si < flow.steps.length; si++) {
        var step = flow.steps[si];
        var val = collected[step.key] || '(not set)';
        var displayVal = val;
        if (step.choices) {
          var ci;
          for (ci = 0; ci < step.choices.length; ci++) {
            if (step.choices[ci].value === val) { displayVal = step.choices[ci].label; break; }
          }
        }
        lines.push('  ' + step.label + ': ' + displayVal);
      }
      lines.push('');
      lines.push('Shall I create this for you?');
      return lines.join('\n');
    }

    function startFlow(flow) {
      var firstStep = flow.steps[0];
      setFlowState({ mode: 'gathering', flow: flow, step: 0, collected: {} });
      appendMsg(makeMsg('assistant',
        'Let\'s build your ' + flow.name + '.\n\n' + firstStep.question,
        firstStep.type === 'choice' ? firstStep.choices : null,
        'text', null
      ));
    }

    function cancelFlow() {
      setFlowState({ mode: 'idle', flow: null, step: 0, collected: {} });
      addAssistantDelayed('Flow cancelled. Select a flow from the catalog or ask me a question.', null, 'text', null);
    }

    function advanceFlow(fs, value, displayLabel) {
      var flow = fs.flow;
      var step = fs.step;
      var newCollected = {};
      var k;
      for (k in fs.collected) { if (fs.collected.hasOwnProperty(k)) { newCollected[k] = fs.collected[k]; } }
      newCollected[flow.steps[step].key] = value;
      appendMsg(makeMsg('user', displayLabel, null, 'text', null));
      var nextStep = step + 1;
      if (nextStep < flow.steps.length) {
        var nxtDef = flow.steps[nextStep];
        setFlowState({ mode: 'gathering', flow: flow, step: nextStep, collected: newCollected });
        addAssistantDelayed(nxtDef.question, nxtDef.type === 'choice' ? nxtDef.choices : null, 'text', null);
      } else {
        setFlowState({ mode: 'confirming', flow: flow, step: nextStep, collected: newCollected });
        addAssistantDelayed(buildSummaryText(flow, newCollected), null, 'confirm', null);
      }
    }

    function handleChoiceClick(msgId, value, label, fs) {
      setMessages(function(prev) {
        return prev.map(function(m) {
          if (m.id === msgId) { return Object.assign({}, m, { choiceSelected: value }); }
          return m;
        });
      });
      if (fs.mode === 'gathering') { advanceFlow(fs, value, label); }
    }

    function handleTextSubmit() {
      var q = wsInput.trim();
      if (!q || chatBusy) return;
      setWsInput('');
      if (flowState.mode === 'gathering') {
        advanceFlow(flowState, q, q);
      } else {
        appendMsg(makeMsg('user', q, null, 'text', null));
        setChatBusy(true);
        ctx.callServer({ action: 'assistant_query', query: q }, function(d, err) {
          setChatBusy(false);
          var reply = (d && d.reply) || 'I could not process that request.';
          var msgType = err ? 'error' : ((d && d.type) || 'text');
          var msgItems = (d && d.items) || null;
          appendMsg(makeMsg('assistant', reply, null, msgType, null, msgItems));
        });
      }
    }

    function confirmCreate() {
      var fs = flowState;
      setFlowState(Object.assign({}, fs, { mode: 'creating' }));
      setChatBusy(true);
      ctx.callServer({
        action: 'create_deliverable',
        flow_id: fs.flow.id,
        collected: JSON.stringify(fs.collected)
      }, function(d, err) {
        setChatBusy(false);
        var result = d && d.deliverable_result;
        if (err || !result || !result.ok) {
          appendMsg(makeMsg('assistant', 'Something went wrong: ' + (err || (result && result.error) || 'Unknown error') + '. Please try again.', null, 'error', null));
          setFlowState({ mode: 'idle', flow: null, step: 0, collected: {} });
          return;
        }
        var typeLabel = TYPE_LABELS_WS[result.type] || result.type;
        appendMsg(makeMsg('assistant', 'Your ' + typeLabel + ' has been created and saved to the Operations Gallery.', null, 'result', {
          name: result.name,
          type: result.type,
          type_label: typeLabel,
          url: result.url || ''
        }));
        setFlowState({ mode: 'idle', flow: null, step: 0, collected: {} });
      });
    }

    function triggerGroupAuto(auto) {
      var b = Object.assign({}, autoTriggerBusy);
      b[auto.sys_id] = true;
      setAutoTriggerBusy(b);
      ctx.callServer({ action: 'trigger_automation', automation_sys_id: auto.sys_id, group_sys_id: auto.owner_group_sys_id }, function(d, err) {
        var b2 = Object.assign({}, autoTriggerBusy);
        b2[auto.sys_id] = false;
        setAutoTriggerBusy(b2);
        if (err) { ctx.toast(err, 'error'); return; }
        var result = d && d.triggered;
        if (result && result.ok) {
          ctx.toast('Triggered: ' + (result.number || auto.name), 'success');
          addAssistantDelayed('Automation "' + auto.name + '" triggered. Execution ' + (result.number || '') + ' is now ' + (result.status || 'running') + '.', null, 'text', null);
        } else {
          ctx.toast((result && result.error) || 'Failed to trigger.', 'error');
        }
      });
    }

    var fs = flowState;
    var catalogContent;
    if (fs.mode !== 'idle') {
      var totalSteps = fs.flow ? fs.flow.steps.length : 0;
      var doneSteps  = Math.min(fs.step, totalSteps);
      var pct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
      catalogContent = h('div', { className: 'oi-ws-flow-active' },
        h('div', { className: 'oi-ws-flow-active-hdr' },
          h('div', { className: 'oi-ws-flow-active-icon', style: { background: fs.flow ? (fs.flow.color || '#00BF6F') : '#00BF6F' } },
            h(OIIcon, { name: fs.flow ? fs.flow.icon : 'document', size: 16, fill: '#FFFFFF' })
          ),
          h('div', { className: 'oi-ws-flow-active-body' },
            h('div', { className: 'oi-ws-flow-active-name' }, fs.flow ? fs.flow.name : ''),
            h('div', { className: 'oi-ws-flow-active-step' },
              fs.mode === 'confirming' ? 'Review' :
              fs.mode === 'creating'   ? 'Creating...' :
              ('Step ' + (doneSteps + 1) + ' of ' + totalSteps)
            )
          ),
          h('button', { className: 'oi-icon-btn', title: 'Cancel flow', onClick: cancelFlow },
            h(OIIcon, { name: 'close', size: 16 })
          )
        ),
        h('div', { className: 'oi-progress-bar' },
          h('div', { className: 'oi-progress-fill', style: { width: pct + '%' } })
        ),
        fs.flow
          ? h('div', { className: 'oi-flow-steps-preview' },
              fs.flow.steps.map(function(step, idx) {
                var isDone    = idx < doneSteps;
                var isCurrent = idx === doneSteps && fs.mode === 'gathering';
                var colVal = fs.collected[step.key];
                var dispVal = colVal;
                if (colVal && step.choices) {
                  var ci;
                  for (ci = 0; ci < step.choices.length; ci++) {
                    if (step.choices[ci].value === colVal) { dispVal = step.choices[ci].label; break; }
                  }
                }
                return h('div', { key: step.key, className: 'oi-flow-step-item' + (isDone ? ' done' : isCurrent ? ' current' : '') },
                  h('div', { className: 'oi-flow-step-dot' }),
                  h('div', { className: 'oi-flow-step-info' },
                    h('div', { className: 'oi-flow-step-label' }, step.label),
                    isDone && dispVal ? h('div', { className: 'oi-flow-step-val' }, dispVal) : null
                  )
                );
              })
            )
          : null
      );
    } else {
      catalogContent = h('div', { className: 'oi-ws-catalog-body' },
        h('div', { className: 'oi-catalog-section' },
          h('div', { className: 'oi-catalog-section-hdr' }, 'System Automations'),
          h('div', { className: 'oi-flow-list' },
            SYSTEM_FLOWS.map(function(flow) {
              return h('div', {
                key: flow.id,
                className: 'oi-flow-item',
                onClick: function() { startFlow(flow); }
              },
                h('div', { className: 'oi-flow-item-icon', style: { background: flow.color } },
                  h(OIIcon, { name: flow.icon, size: 16, fill: '#FFFFFF' })
                ),
                h('div', { className: 'oi-flow-item-body' },
                  h('div', { className: 'oi-flow-item-name' }, flow.name),
                  h('div', { className: 'oi-flow-item-desc' }, flow.desc)
                ),
                h('div', { className: 'oi-flow-item-arrow' },
                  h(OIIcon, { name: 'chevron_right', size: 14, fill: '#DCDCDC' })
                )
              );
            })
          )
        ),
        groupAutomations.length > 0
          ? h('div', { className: 'oi-catalog-section' },
              h('div', { className: 'oi-catalog-section-hdr' }, 'Group Automations'),
              h('div', { className: 'oi-flow-list' },
                groupAutomations.map(function(auto) {
                  var isBusy = !!autoTriggerBusy[auto.sys_id];
                  var capturedAuto = auto;
                  return h('div', { key: auto.sys_id, className: 'oi-flow-item' },
                    h('div', { className: 'oi-flow-item-icon', style: { background: auto.category_color || '#00BF6F' } },
                      h(OIIcon, { name: 'automation', size: 16, fill: '#FFFFFF' })
                    ),
                    h('div', { className: 'oi-flow-item-body' },
                      h('div', { className: 'oi-flow-item-name' }, auto.name),
                      h('div', { className: 'oi-flow-item-desc' }, auto.short_description || auto.owner_group || '')
                    ),
                    h('button', {
                      className: 'oi-btn primary xs',
                      disabled: isBusy,
                      onClick: function(e) { e.stopPropagation(); triggerGroupAuto(capturedAuto); }
                    }, isBusy ? h('div', { className: 'oi-spinner sm' }) : h(OIIcon, { name: 'play', size: 12 }))
                  );
                })
              )
            )
          : null
      );
    }

    var currentStepDef = (fs.mode === 'gathering' && fs.flow) ? fs.flow.steps[fs.step] : null;
    var isChoiceStep = !!(currentStepDef && currentStepDef.type === 'choice');
    var inputArea;
    if (fs.mode === 'confirming') {
      inputArea = h('div', { className: 'oi-chat-confirm-area' },
        h('button', { className: 'oi-btn primary', onClick: confirmCreate },
          h(OIIcon, { name: 'check', size: 16 }), ' Yes, create it'
        ),
        h('button', { className: 'oi-btn ghost', onClick: cancelFlow }, 'Start Over')
      );
    } else if (fs.mode === 'creating') {
      inputArea = h('div', { className: 'oi-chat-confirm-area' },
        h('div', { className: 'oi-spinner sm' }),
        h('span', { style: { color: '#6E6E6E', fontSize: '0.9375rem' } }, 'Creating your deliverable...')
      );
    } else {
      inputArea = h('div', { className: 'oi-chat-input-area' },
        h('input', {
          className: 'oi-input',
          value: wsInput,
          placeholder: isChoiceStep
            ? 'Select an option from the buttons above...'
            : (currentStepDef ? (currentStepDef.placeholder || 'Type your answer...') : 'Ask a question...'),
          disabled: chatBusy || isChoiceStep,
          onChange: function(e) { setWsInput(e.target.value); },
          onKeyDown: function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }
        }),
        h('button', {
          className: 'oi-btn primary',
          disabled: chatBusy || !wsInput.trim() || isChoiceStep,
          onClick: handleTextSubmit
        }, chatBusy ? h('div', { className: 'oi-spinner sm' }) : h(OIIcon, { name: 'send', size: 16 }))
      );
    }

    return h('div', { className: 'oi-section oi-workspace-layout' },
      h('div', { className: 'oi-ws-catalog-panel' },
        h('div', { className: 'oi-ws-catalog-head' },
          h('div', { className: 'oi-ws-catalog-title' },
            fs.mode !== 'idle' && fs.flow ? fs.flow.name : 'Automation Catalog'
          )
        ),
        catalogContent
      ),
      h('div', { className: 'oi-ws-assistant-panel' },
        h('div', { className: 'oi-ws-assistant-head' },
          h('div', { className: 'oi-ws-assistant-icon-wrap' },
            h(OIIcon, { name: 'assistant', size: 22, fill: '#00BF6F' })
          ),
          h('div', null,
            h('div', { className: 'oi-ws-assistant-name' }, 'Operations Assistant'),
            h('div', { className: 'oi-ws-assistant-tagline' }, 'Your intelligent operations interface')
          )
        ),
        h('div', { className: 'oi-chat-messages' },
          messages.map(function(m) {
            var capturedFs = fs;
            if (m.role === 'user') {
              return h('div', { key: m.id, className: 'oi-chat-msg user' },
                h('div', { className: 'oi-chat-bubble' }, m.text)
              );
            }
            return h('div', { key: m.id, className: 'oi-chat-msg assistant' + (m.type === 'error' ? ' error' : '') },
              h('div', { className: 'oi-chat-bubble' },
                m.type === 'result'
                  ? h('div', { className: 'oi-result-card' },
                      h('div', { className: 'oi-result-card-icon' },
                        h(OIIcon, { name: 'check', size: 20, fill: '#00BF6F' })
                      ),
                      h('div', { className: 'oi-result-card-body' },
                        h('div', { className: 'oi-result-card-name' }, m.result.name),
                        h('div', { className: 'oi-result-card-type' }, m.result.type_label || m.result.type),
                        m.result.url
                          ? h('a', { className: 'oi-result-card-link', href: m.result.url, target: '_blank' }, 'Open in ServiceNow')
                          : h('span', { className: 'oi-result-card-type', style: { color: '#6E6E6E' } }, 'Saved to Operations Gallery')
                      )
                    )
                  : m.text
              ),
              m.items ? renderItems(m.type, m.items) : null,
              m.choices && m.choices.length > 0
                ? h('div', { className: 'oi-chat-choices' },
                    m.choices.map(function(c) {
                      var sel      = m.choiceSelected === c.value;
                      var inactive = m.choiceSelected != null;
                      var capturedC     = c;
                      var capturedMsgId = m.id;
                      return h('button', {
                        key: c.value,
                        className: 'oi-choice-btn' + (sel ? ' selected' : '') + (inactive && !sel ? ' dimmed' : ''),
                        disabled: inactive,
                        onClick: function() { if (!inactive) { handleChoiceClick(capturedMsgId, capturedC.value, capturedC.label, capturedFs); } }
                      }, c.label);
                    })
                  )
                : null
            );
          }),
          chatBusy
            ? h('div', { className: 'oi-chat-msg assistant' },
                h('div', { className: 'oi-chat-bubble oi-typing' },
                  h('span', { className: 'oi-dot' }),
                  h('span', { className: 'oi-dot' }),
                  h('span', { className: 'oi-dot' })
                )
              )
            : null,
          h('div', { ref: chatEndRef })
        ),
        inputArea
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

  /* ── Gallery Section ────────────────────────────────────────── */

  function GallerySection(props) {
    var ctx = React.useContext(AppContext);
    var data = props.data;
    var allDeliverables = data.deliverables || [];

    var TYPE_LABELS = { report: 'Report', dashboard: 'Dashboard', data_alert: 'Data Alert', notification_rule: 'Notification Rule' };
    var TYPE_ICONS  = { report: 'document', dashboard: 'workspace', data_alert: 'warning_icon', notification_rule: 'send' };
    var TYPE_COLORS = { report: '#00BF6F', dashboard: '#293E40', data_alert: '#E57323', notification_rule: '#00BF6F' };

    var FILTERS = [
      { key: 'all',               label: 'All' },
      { key: 'report',            label: 'Reports' },
      { key: 'dashboard',         label: 'Dashboards' },
      { key: 'data_alert',        label: 'Data Alerts' },
      { key: 'notification_rule', label: 'Notification Rules' }
    ];

    var filterResult = React.useState('all');
    var filter = filterResult[0];
    var setFilter = filterResult[1];

    var sortResult = React.useState('newest');
    var sort = sortResult[0];
    var setSort = sortResult[1];

    var deliverablesResult = React.useState(allDeliverables);
    var deliverables = deliverablesResult[0];
    var setDeliverables = deliverablesResult[1];

    var filtered = filter === 'all'
      ? deliverables
      : deliverables.filter(function(d) { return d.artifact_type === filter; });

    var sorted = filtered.slice().sort(function(a, b) {
      if (sort === 'name') { return (a.display_name || '').localeCompare(b.display_name || ''); }
      if (sort === 'type') { return (a.artifact_type || '').localeCompare(b.artifact_type || ''); }
      return 0;
    });

    function deleteDeliverable(item) {
      ctx.callServer({ action: 'delete_deliverable', artifact_sys_id: item.sys_id }, function(d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        var result = d && d.deleted_deliverable;
        if (result && result.ok) {
          ctx.toast(item.display_name + ' deleted.', 'success');
          setDeliverables(deliverables.filter(function(dl) { return dl.sys_id !== item.sys_id; }));
        } else {
          ctx.toast((result && result.error) || 'Failed to delete.', 'error');
        }
      });
    }

    return h('div', { className: 'oi-section' },
      h('div', { className: 'oi-toolbar' },
        h('div', { className: 'oi-toolbar-left' },
          h('h1', { className: 'oi-section-title' }, 'Operations Gallery'),
          h('span', { style: { fontSize: '0.875rem', color: '#6E6E6E' } },
            deliverables.length + ' deliverable' + (deliverables.length === 1 ? '' : 's')
          )
        ),
        h('div', { className: 'oi-toolbar-right' },
          h('select', {
            className: 'oi-select',
            value: sort,
            style: { width: 'auto' },
            onChange: function(e) { setSort(e.target.value); }
          },
            h('option', { value: 'newest' }, 'Newest First'),
            h('option', { value: 'name' }, 'Name A–Z'),
            h('option', { value: 'type' }, 'By Type')
          )
        )
      ),
      h('div', { className: 'oi-filter-chips' },
        FILTERS.map(function(f) {
          return h('button', {
            key: f.key,
            className: 'oi-filter-chip' + (filter === f.key ? ' active' : ''),
            onClick: function() { setFilter(f.key); }
          }, f.label);
        })
      ),
      deliverables.length === 0
        ? h('div', { className: 'oi-empty' },
            h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'document', size: 48, fill: '#DCDCDC' })),
            h('div', { className: 'oi-empty-title' }, 'No deliverables yet'),
            h('div', { className: 'oi-empty-sub' }, 'Use the Workspace to build reports, dashboards, data alerts, and notification rules. They will appear here once created.')
          )
        : sorted.length === 0
          ? h('div', { className: 'oi-empty' },
              h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'search', size: 40, fill: '#DCDCDC' })),
              h('div', { className: 'oi-empty-title' }, 'No results'),
              h('div', { className: 'oi-empty-sub' }, 'No deliverables match the selected filter.')
            )
          : h('div', { className: 'oi-deliverables-grid' },
              sorted.map(function(item) {
                var typeColor = TYPE_COLORS[item.artifact_type] || '#00BF6F';
                var typeIcon  = TYPE_ICONS[item.artifact_type]  || 'document';
                var typeLabel = TYPE_LABELS[item.artifact_type] || item.artifact_type;
                var capturedItem = item;
                return h('div', { key: item.sys_id, className: 'oi-deliverable-card' },
                  h('div', { className: 'oi-deliverable-card-top', style: { background: typeColor } },
                    h(OIIcon, { name: typeIcon, size: 22, fill: '#FFFFFF' })
                  ),
                  h('div', { className: 'oi-deliverable-card-body' },
                    h('div', { className: 'oi-deliverable-card-name' }, item.display_name),
                    h('span', { className: 'oi-badge neutral', style: { marginBottom: '0.375rem' } }, typeLabel),
                    h('div', { className: 'oi-deliverable-card-date' }, item.created_at || '')
                  ),
                  h('div', { className: 'oi-deliverable-card-foot' },
                    item.target_url
                      ? h('a', { className: 'oi-btn ghost xs', href: item.target_url, target: '_blank' }, 'Open')
                      : h('span', { style: { flex: '1' } }),
                    h('button', {
                      className: 'oi-btn danger xs',
                      onClick: function() { deleteDeliverable(capturedItem); }
                    }, h(OIIcon, { name: 'remove', size: 12 }), ' Delete')
                  )
                );
              })
            )
    );
  }

  /* ── Studio Section ──────────────────────────────────────────── */

  function StudioSection(props) {
    var ctx = React.useContext(AppContext);
    var data = props.data;
    var artifacts = data.artifacts || [];
    var deliverableTypes = data.deliverable_types || [];
    var studioGroups = data.studio_groups || [];

    var tabResult = React.useState('artifacts');
    var tab = tabResult[0];
    var setTab = tabResult[1];

    var automationsResult = React.useState(null);
    var automations = automationsResult[0];
    var setAutomations = automationsResult[1];

    var autoLoadingResult = React.useState(false);
    var autoLoading = autoLoadingResult[0];
    var setAutoLoading = autoLoadingResult[1];

    var showCreateAutoResult = React.useState(false);
    var showCreateAuto = showCreateAutoResult[0];
    var setShowCreateAuto = showCreateAutoResult[1];

    function loadAutomations() {
      setAutoLoading(true);
      ctx.callServer({ action: 'list_all_automations' }, function (d, err) {
        setAutoLoading(false);
        if (err) { ctx.toast(err, 'error'); return; }
        setAutomations((d && d.all_automations) || []);
      });
    }

    React.useEffect(function () {
      if (tab === 'automations' && automations === null) loadAutomations();
    }, [tab]);

    return h('div', { className: 'oi-section' },
      h('div', { className: 'oi-toolbar' },
        h('div', { className: 'oi-toolbar-left' },
          h('h1', { className: 'oi-section-title' }, 'Operations Studio')
        ),
        h('div', { className: 'oi-toolbar-right' },
          tab === 'automations'
            ? h('button', { className: 'oi-btn primary sm', onClick: function () { setShowCreateAuto(true); } }, '+ Create Automation')
            : null
        )
      ),
      h('div', null,
        h('div', { className: 'oi-subtabs' },
          h('button', { className: 'oi-subtab' + (tab === 'artifacts' ? ' active' : ''), onClick: function () { setTab('artifacts'); } },
            'My Artifacts',
            h('span', { className: 'oi-subtab-count' }, artifacts.length)
          ),
          h('button', { className: 'oi-subtab' + (tab === 'automations' ? ' active' : ''), onClick: function () { setTab('automations'); } },
            'Automations',
            automations !== null ? h('span', { className: 'oi-subtab-count' }, automations.length) : null
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
            : tab === 'automations'
              ? h('div', { style: { padding: '1.25rem' } },
                  autoLoading
                    ? h('div', { className: 'oi-spinner-center' }, h('div', { className: 'oi-spinner' }))
                    : !automations || automations.length === 0
                      ? h('div', { className: 'oi-empty' },
                          h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'automation', size: 40, fill: '#DCDCDC' })),
                          h('div', { className: 'oi-empty-title' }, 'No automations yet'),
                          h('div', { className: 'oi-empty-sub' }, 'Create an automation to make it available in the Workspace for your groups.')
                        )
                      : h('table', { className: 'oi-table' },
                          h('thead', null,
                            h('tr', null,
                              h('th', null, 'Name'),
                              h('th', null, 'Description'),
                              h('th', null, 'Status'),
                              h('th', null, 'Created')
                            )
                          ),
                          h('tbody', null,
                            automations.map(function (a, i) {
                              return h('tr', { key: a.sys_id || i },
                                h('td', null, h('span', { className: 'oi-td-primary' }, a.name || '')),
                                h('td', null, h('span', { className: 'oi-td-muted' }, a.description || '—')),
                                h('td', null, h(Badge, { cls: statusClass(a.status) }, a.status || 'draft')),
                                h('td', null, h('span', { className: 'oi-td-muted' }, relTime(a.created_on)))
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
      ),
      showCreateAuto
        ? h(CreateAutomationModal, {
            groups: studioGroups,
            onClose: function () { setShowCreateAuto(false); },
            onCreated: function (auto) { setAutomations((automations || []).concat([auto])); }
          })
        : null
    );
  }

  /* ── Governance Section ──────────────────────────────────────── */

  function GovernanceSection(props) {
    var ctx = React.useContext(AppContext);
    var data = props.data;

    var ACCESS_ROLES = [
      { key: 'admin',      label: 'Operations Intelligence Administrator', desc: 'Full platform control including Command console, user management, and all administrative capabilities.' },
      { key: 'leadership', label: 'Operations Intelligence Lead',           desc: 'Governance oversight, group management, approval of pending actions, and leadership-level reporting.' },
      { key: 'creator',    label: 'Operations Intelligence Creator',        desc: 'Build and publish reports, dashboards, data alerts, and Studio automations for assigned groups.' },
      { key: 'user',       label: 'Operations Intelligence User',           desc: 'Run automations and view the Gallery, Workspace, and deliverables available to their groups.' }
    ];

    var tabResult = React.useState('access');
    var tab = tabResult[0];
    var setTab = tabResult[1];

    var groupsResult = React.useState(data.groups || []);
    var groups = groupsResult[0];
    var setGroups = groupsResult[1];

    var usersResult = React.useState(data.persons || []);
    var users = usersResult[0];
    var setUsers = usersResult[1];

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

    var confirmDeleteResult = React.useState(null);
    var confirmDeleteId = confirmDeleteResult[0];
    var setConfirmDeleteId = confirmDeleteResult[1];

    var accessMembersResult = React.useState(null);
    var accessMembers = accessMembersResult[0];
    var setAccessMembers = accessMembersResult[1];

    var accessLoadingResult = React.useState(false);
    var accessLoading = accessLoadingResult[0];
    var setAccessLoading = accessLoadingResult[1];

    var showGrantRoleResult = React.useState(null);
    var showGrantRole = showGrantRoleResult[0];
    var setShowGrantRole = showGrantRoleResult[1];

    function loadUsers() {
      ctx.callServer({ action: 'list_persons' }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        setUsers((d && d.persons) || []);
      });
    }

    function loadAccessMembers() {
      setAccessLoading(true);
      ctx.callServer({ action: 'list_access_members' }, function (d, err) {
        setAccessLoading(false);
        if (err) { ctx.toast(err, 'error'); return; }
        setAccessMembers((d && d.access_members) || { admin: [], leadership: [], creator: [], user: [] });
      });
    }

    function revokeRoleAccess(roleKey, member) {
      ctx.callServer({ action: 'revoke_role', role_assignment_sys_id: member.role_assignment_sys_id }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        if (d && d.role_revoked && d.role_revoked.ok) {
          ctx.toast(member.name + ' access revoked.', 'success');
          var updated = {
            admin:      (accessMembers && accessMembers.admin)      || [],
            leadership: (accessMembers && accessMembers.leadership)  || [],
            creator:    (accessMembers && accessMembers.creator)     || [],
            user:       (accessMembers && accessMembers.user)        || []
          };
          updated[roleKey] = (updated[roleKey] || []).filter(function (m) { return m.role_assignment_sys_id !== member.role_assignment_sys_id; });
          setAccessMembers(updated);
        } else {
          ctx.toast('Failed to revoke access.', 'error');
        }
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

    function deleteGroup(g) {
      ctx.callServer({ action: 'delete_group', group_sys_id: g.sys_id }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        var result = d && d.deleted_group;
        if (result && result.ok) {
          ctx.toast('Group "' + g.name + '" deleted.', 'success');
          setGroups(groups.filter(function (gr) { return gr.sys_id !== g.sys_id; }));
          if (selectedGroup && selectedGroup.sys_id === g.sys_id) { setSelectedGroup(null); setGroupMembers([]); }
        } else {
          ctx.toast((result && result.error) || 'Failed to delete group.', 'error');
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
      if (tab === 'users') loadUsers();
      if (tab === 'access' && !accessMembers) loadAccessMembers();
    }, [tab]);

    return h('div', { className: 'oi-section' },
      h('div', { className: 'oi-toolbar' },
        h('div', { className: 'oi-toolbar-left' },
          h('h1', { className: 'oi-section-title' }, 'Operations Governance')
        ),
        h('div', { className: 'oi-toolbar-right' },
          tab === 'groups'
            ? h('button', { className: 'oi-btn primary sm', onClick: function () { setShowCreateGroup(true); } }, '+ Create Group')
            : null,
          tab === 'users'
            ? h('button', { className: 'oi-btn primary sm', onClick: function () { setShowEnroll(true); } }, '+ Enroll User')
            : null
        )
      ),
      h('div', null,
        h('div', { className: 'oi-subtabs' },
          h('button', { className: 'oi-subtab' + (tab === 'access' ? ' active' : ''), onClick: function () { setTab('access'); } },
            'Access'
          ),
          h('button', { className: 'oi-subtab' + (tab === 'users' ? ' active' : ''), onClick: function () { setTab('users'); } },
            'Users',
            h('span', { className: 'oi-subtab-count' }, users.length)
          ),
          h('button', { className: 'oi-subtab' + (tab === 'groups' ? ' active' : ''), onClick: function () { setTab('groups'); setSelectedGroup(null); } },
            'Groups',
            h('span', { className: 'oi-subtab-count' }, groups.length)
          ),
          h('button', { className: 'oi-subtab' + (tab === 'actions' ? ' active' : ''), onClick: function () { setTab('actions'); } },
            'Pending Actions',
            pendingActions.length > 0 ? h('span', { className: 'oi-subtab-count warn' }, pendingActions.length) : null
          )
        ),
        h('div', { className: 'oi-subtab-body' },
          tab === 'access'
            ? h('div', { style: { padding: '1.25rem' } },
                accessLoading
                  ? h('div', { className: 'oi-spinner-center' }, h('div', { className: 'oi-spinner' }))
                  : h('div', { className: 'oi-access-sections' },
                      ACCESS_ROLES.map(function (role) {
                        var roleKey = role.key;
                        var roleMembers = (accessMembers && accessMembers[roleKey]) || [];
                        return h('div', { key: roleKey, className: 'oi-access-section' },
                          h('div', { className: 'oi-access-section-hdr' },
                            h('div', { className: 'oi-access-section-meta' },
                              h('span', { className: 'oi-access-section-title' }, role.label),
                              h('span', { className: 'oi-access-section-desc' }, role.desc)
                            ),
                            h('button', {
                              className: 'oi-btn ghost xs',
                              onClick: function () { setShowGrantRole(roleKey); }
                            }, '+ Grant')
                          ),
                          h('table', { className: 'oi-table oi-access-table' },
                            h('thead', null,
                              h('tr', null,
                                h('th', null, 'Name'),
                                h('th', null, 'Username'),
                                h('th', null, 'Email'),
                                h('th', { style: { width: '2.75rem', textAlign: 'center' } }, '')
                              )
                            ),
                            h('tbody', null,
                              !accessMembers
                                ? h('tr', null, h('td', { colSpan: 4, className: 'oi-table-empty-cell' }, 'Loading...'))
                                : roleMembers.length === 0
                                  ? h('tr', null, h('td', { colSpan: 4, className: 'oi-table-empty-cell' }, 'No users have been granted this role.'))
                                  : roleMembers.map(function (m, idx) {
                                      return h('tr', { key: m.role_assignment_sys_id || idx },
                                        h('td', null,
                                          h('div', { className: 'oi-person-cell' },
                                            h('div', { className: 'oi-avatar-sm' }, initials(m.name || '')),
                                            h('span', { className: 'oi-td-primary' }, m.name || '—')
                                          )
                                        ),
                                        h('td', null, h('span', { className: 'oi-td-secondary' }, m.user_name || '—')),
                                        h('td', null, h('span', { className: 'oi-td-secondary' }, m.email || '—')),
                                        h('td', { style: { textAlign: 'center' } },
                                          h('button', {
                                            className: 'oi-icon-btn danger',
                                            title: 'Revoke role',
                                            onClick: (function(member) { return function() { revokeRoleAccess(roleKey, member); }; })(m)
                                          }, h(OIIcon, { name: 'remove', size: 14 }))
                                        )
                                      );
                                    })
                            )
                          )
                        );
                      })
                    )
              )
            : tab === 'users'
              ? h('div', null,
                  users.length === 0
                    ? h('div', { className: 'oi-empty' },
                        h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'user', size: 40, fill: '#DCDCDC' })),
                        h('div', { className: 'oi-empty-title' }, 'No users enrolled'),
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
                          users.map(function (p, i) {
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
                                  title: 'Unenroll this user and remove them from all groups',
                                  onClick: function () { unenrollPerson(p, setUsers, users, ctx); }
                                }, 'Unenroll')
                              )
                            );
                          })
                        )
                      )
                )
              : tab === 'groups'
                ? h('div', { className: 'oi-split', style: { padding: '1.25rem' } },
                    h('div', { className: 'oi-list-pane' },
                      h('div', { className: 'oi-item-list' },
                        groups.length === 0
                          ? h('div', { className: 'oi-empty-inline' }, 'No groups found.')
                          : groups.map(function (g) {
                              var confirming = confirmDeleteId === g.sys_id;
                              return h('div', {
                                key: g.sys_id,
                                className: 'oi-list-item' + (selectedGroup && selectedGroup.sys_id === g.sys_id ? ' selected' : ''),
                                onClick: function () { if (!confirming) selectGroup(g); }
                              },
                                h('div', { className: 'oi-list-item-icon' }, h(OIIcon, { name: 'group', size: 16, fill: g.is_system ? '#6E6E6E' : '#00BF6F' })),
                                h('div', { className: 'oi-list-item-body' },
                                  h('div', { className: 'oi-list-item-title' }, g.name),
                                  h('div', { className: 'oi-list-item-sub' }, g.is_system ? 'System-managed' : (g.member_count + ' member' + (g.member_count === 1 ? '' : 's')))
                                ),
                                confirming
                                  ? h('div', { className: 'oi-delete-confirm', onClick: function (e) { e.stopPropagation(); } },
                                      h('span', { className: 'oi-delete-confirm-msg' }, 'Delete group?'),
                                      h('button', { className: 'oi-btn danger xs', onClick: function (e) { e.stopPropagation(); setConfirmDeleteId(null); deleteGroup(g); } }, 'Delete'),
                                      h('button', { className: 'oi-btn ghost xs', onClick: function (e) { e.stopPropagation(); setConfirmDeleteId(null); } }, 'Cancel')
                                    )
                                  : h('div', { className: 'oi-list-item-actions', onClick: function (e) { e.stopPropagation(); } },
                                      h('span', { className: 'oi-list-item-count' }, g.member_count != null ? g.member_count : ''),
                                      g.is_system
                                        ? h('span', { className: 'oi-list-item-lock', title: 'System-managed — cannot be deleted' },
                                            h(OIIcon, { name: 'lock', size: 14, fill: '#DCDCDC' })
                                          )
                                        : h('button', {
                                            className: 'oi-icon-btn danger',
                                            title: 'Delete group',
                                            onClick: function (e) { e.stopPropagation(); setConfirmDeleteId(g.sys_id); }
                                          }, h(OIIcon, { name: 'remove', size: 14 }))
                                    )
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
                                          title: 'Remove from this group (user remains enrolled)',
                                          onClick: function () { removeMember(m.person_sys_id); }
                                        }, h(OIIcon, { name: 'remove', size: 14 }))
                                      );
                                    })
                                  )
                          )
                        )
                      : null
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
        ? h(EnrollUserModal, {
            onClose: function () { setShowEnroll(false); },
            onEnrolled: function (p) { setUsers(users.concat([p])); }
          })
        : null,
      showGrantRole
        ? h(GrantRoleModal, {
            roleKey: showGrantRole,
            onClose: function () { setShowGrantRole(null); },
            onGranted: function (roleKey, member) {
              var updated = {
                admin:      (accessMembers && accessMembers.admin)      || [],
                leadership: (accessMembers && accessMembers.leadership)  || [],
                creator:    (accessMembers && accessMembers.creator)     || [],
                user:       (accessMembers && accessMembers.user)        || []
              };
              updated[roleKey] = (updated[roleKey] || []).concat([member]);
              setAccessMembers(updated);
            }
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
                      u.already_enrolled ? null : h('div', { className: 'oi-member-role', style: { color: '#E57323' } }, 'Not enrolled — enroll from Users tab first')
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

  function EnrollUserModal(props) {
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
          h('span', { className: 'oi-modal-title' }, 'Enroll User'),
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

  function GrantRoleModal(props) {
    var ctx = React.useContext(AppContext);
    var roleKey = props.roleKey;
    var ROLE_LABELS = {
      admin:      'Operations Intelligence Administrator',
      leadership: 'Operations Intelligence Lead',
      creator:    'Operations Intelligence Creator',
      user:       'Operations Intelligence User'
    };

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

    function grantAccess() {
      if (!selectedUser) return;
      setBusy(true);
      ctx.callServer({ action: 'grant_role', user_sys_id: selectedUser.sys_id, role_name: roleKey }, function (d, err) {
        setBusy(false);
        if (err) { ctx.toast(err, 'error'); return; }
        var result = d && d.role_granted;
        if (result && result.ok) {
          ctx.toast(selectedUser.name + ' granted ' + ROLE_LABELS[roleKey] + ' access.', 'success');
          props.onGranted(roleKey, {
            user_sys_id:            selectedUser.sys_id,
            name:                   selectedUser.name,
            user_name:              selectedUser.user_name,
            email:                  selectedUser.email || '',
            role_assignment_sys_id: result.role_assignment_sys_id || ''
          });
          props.onClose();
        } else {
          ctx.toast((result && result.error) || 'Failed to grant access.', 'error');
        }
      });
    }

    return h('div', { className: 'oi-backdrop' },
      h('div', { className: 'oi-modal md' },
        h('div', { className: 'oi-modal-hdr' },
          h('span', { className: 'oi-modal-title' }, 'Grant ' + ROLE_LABELS[roleKey] + ' Access'),
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
                    onClick: function () { setSelectedUser(u); }
                  },
                    h('div', { className: 'oi-member-avatar' }, initials(u.name || '')),
                    h('div', { className: 'oi-member-info' },
                      h('div', { className: 'oi-member-name' }, u.name),
                      h('div', { className: 'oi-member-role' }, u.email || u.user_name)
                    ),
                    sel ? h('span', { style: { color: '#00BF6F' } }, h(OIIcon, { name: 'check', size: 14 })) : null
                  );
                })
              )
            : null
        ),
        h('div', { className: 'oi-modal-foot' },
          h('button', { className: 'oi-btn ghost', onClick: props.onClose }, 'Cancel'),
          h('button', { className: 'oi-btn primary', disabled: busy || !selectedUser, onClick: grantAccess },
            busy ? h('span', { className: 'oi-spinner sm' }) : null,
            ' Grant Access'
          )
        )
      )
    );
  }

  function CreateAutomationModal(props) {
    var ctx = React.useContext(AppContext);
    var groups = props.groups || [];

    var nameResult = React.useState('');
    var name = nameResult[0];
    var setName = nameResult[1];

    var descResult = React.useState('');
    var desc = descResult[0];
    var setDesc = descResult[1];

    var targetTypeResult = React.useState('all');
    var targetType = targetTypeResult[0];
    var setTargetType = targetTypeResult[1];

    var selectedGroupsResult = React.useState([]);
    var selectedGroups = selectedGroupsResult[0];
    var setSelectedGroups = selectedGroupsResult[1];

    var busyResult = React.useState(false);
    var busy = busyResult[0];
    var setBusy = busyResult[1];

    function toggleGroup(groupId) {
      if (selectedGroups.indexOf(groupId) !== -1) {
        setSelectedGroups(selectedGroups.filter(function (g) { return g !== groupId; }));
      } else {
        setSelectedGroups(selectedGroups.concat([groupId]));
      }
    }

    function submit() {
      if (!name.trim()) { ctx.toast('Name is required.', 'warning'); return; }
      if (targetType === 'specific' && selectedGroups.length === 0) { ctx.toast('Select at least one group or choose All Groups.', 'warning'); return; }
      setBusy(true);
      var payload = {
        action:        'create_automation',
        name:          name.trim(),
        description:   desc.trim(),
        target_groups: targetType === 'all' ? 'all' : targetType === 'none' ? [] : selectedGroups
      };
      ctx.callServer(payload, function (d, err) {
        setBusy(false);
        if (err) { ctx.toast(err, 'error'); return; }
        var result = d && d.created_automation;
        if (result && result.ok) {
          ctx.toast('Automation "' + result.name + '" created.', 'success');
          props.onCreated({ sys_id: result.sys_id, name: result.name, description: desc.trim(), status: 'draft', created_on: '' });
          props.onClose();
        } else {
          ctx.toast((result && result.error) || 'Failed to create automation.', 'error');
        }
      });
    }

    return h('div', { className: 'oi-backdrop' },
      h('div', { className: 'oi-modal md' },
        h('div', { className: 'oi-modal-hdr' },
          h('span', { className: 'oi-modal-title' }, 'Create Automation'),
          h('button', { className: 'oi-modal-close', onClick: props.onClose }, h(OIIcon, { name: 'close', size: 18 }))
        ),
        h('div', { className: 'oi-modal-body' },
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Name'),
            h('input', { className: 'oi-input', value: name, placeholder: 'e.g. Restart Application Services', onChange: function (e) { setName(e.target.value); } })
          ),
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Description'),
            h('textarea', { className: 'oi-textarea', value: desc, placeholder: 'What this automation does...', onChange: function (e) { setDesc(e.target.value); } })
          ),
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Publish To'),
            h('div', { className: 'oi-radio-group' },
              h('label', { className: 'oi-radio-label' },
                h('input', { type: 'radio', name: 'ca_target_type', value: 'all', checked: targetType === 'all', onChange: function () { setTargetType('all'); } }),
                ' All Groups'
              ),
              h('label', { className: 'oi-radio-label' },
                h('input', { type: 'radio', name: 'ca_target_type', value: 'specific', checked: targetType === 'specific', onChange: function () { setTargetType('specific'); } }),
                ' Specific Groups'
              ),
              h('label', { className: 'oi-radio-label' },
                h('input', { type: 'radio', name: 'ca_target_type', value: 'none', checked: targetType === 'none', onChange: function () { setTargetType('none'); setSelectedGroups([]); } }),
                ' Save as Draft — Do Not Publish'
              )
            )
          ),
          targetType === 'specific' && groups.length > 0
            ? h('div', { className: 'oi-form-group' },
                h('label', { className: 'oi-label' }, 'Select Groups'),
                h('div', { style: { maxHeight: '10rem', overflowY: 'auto', border: '1px solid #DCDCDC', borderRadius: '0.375rem', padding: '0.5rem' } },
                  groups.map(function (g, i) {
                    var isSel = selectedGroups.indexOf(g.sys_id) !== -1;
                    return h('label', { key: g.sys_id || i, style: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', cursor: 'pointer' } },
                      h('input', { type: 'checkbox', checked: isSel, onChange: function () { toggleGroup(g.sys_id); }, style: { accentColor: '#00BF6F', cursor: 'pointer' } }),
                      h('span', { style: { fontSize: '0.9375rem', color: '#121212' } }, g.name)
                    );
                  })
                )
              )
            : null
        ),
        h('div', { className: 'oi-modal-foot' },
          h('button', { className: 'oi-btn ghost', onClick: props.onClose }, 'Cancel'),
          h('button', { className: 'oi-btn primary', disabled: busy || !name.trim(), onClick: submit },
            busy ? h('span', { className: 'oi-spinner sm' }) : null,
            ' Create Automation'
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
      { key: 'workspace',  label: 'Workspace',             desc: 'Disable the Workspace section for all users.',             prop: 'x_infte_ops_int.maintenance.workspace' },
      { key: 'gallery',      label: 'Operations Gallery',     desc: 'Disable the Operations Gallery section for all users.',    prop: 'x_infte_ops_int.maintenance.gallery' },
      { key: 'studio',     label: 'Operations Studio',      desc: 'Disable the Operations Studio section for all users.',      prop: 'x_infte_ops_int.maintenance.studio' },
      { key: 'governance', label: 'Operations Governance',  desc: 'Disable the Operations Governance section for all users.',  prop: 'x_infte_ops_int.maintenance.governance' }
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
          h('h1', { className: 'oi-section-title' }, 'Operations Command')
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

  /* ── Requests Modal ─────────────────────────────────────────── */

  function RequestsModal(props) {
    var ctx = React.useContext(AppContext);

    var requestsResult = React.useState([]);
    var requests = requestsResult[0];
    var setRequests = requestsResult[1];

    var loadingResult = React.useState(true);
    var loading = loadingResult[0];
    var setLoading = loadingResult[1];

    var filterResult = React.useState('all');
    var filter = filterResult[0];
    var setFilter = filterResult[1];

    var searchResult = React.useState('');
    var search = searchResult[0];
    var setSearch = searchResult[1];

    var STATE_FILTERS = [
      { key: 'all',       label: 'All' },
      { key: 'open',      label: 'Open' },
      { key: 'closed',    label: 'Closed' }
    ];

    React.useEffect(function () {
      ctx.callServer({ action: 'load_user_requests', limit: 50 }, function (d, err) {
        setLoading(false);
        if (err) { ctx.toast(err, 'error'); return; }
        setRequests((d && d.user_requests) || []);
      });
    }, []);

    var filtered = requests.filter(function (r) {
      var matchState = filter === 'all' ? true :
        filter === 'open' ? (r.state && r.state.toLowerCase().indexOf('closed') === -1 && r.state.toLowerCase().indexOf('complete') === -1) :
        (r.state && (r.state.toLowerCase().indexOf('closed') !== -1 || r.state.toLowerCase().indexOf('complete') !== -1));
      var matchSearch = !search.trim() ? true :
        (r.short_description || '').toLowerCase().indexOf(search.toLowerCase()) !== -1 ||
        (r.number || '').toLowerCase().indexOf(search.toLowerCase()) !== -1;
      return matchState && matchSearch;
    });

    function statusCls(state) {
      if (!state) { return 'neutral'; }
      var s = state.toLowerCase();
      if (s.indexOf('closed') !== -1 || s.indexOf('complete') !== -1) { return 'success'; }
      if (s.indexOf('open') !== -1 || s.indexOf('new') !== -1) { return 'running'; }
      if (s.indexOf('pending') !== -1 || s.indexOf('wait') !== -1) { return 'pending'; }
      return 'neutral';
    }

    return h('div', { className: 'oi-backdrop' },
      h('div', { className: 'oi-modal oi-requests-modal' },
        h('div', { className: 'oi-modal-hdr' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' } },
            h('div', { style: { width: '2rem', height: '2rem', background: 'rgba(0,191,111,0.12)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
              h(OIIcon, { name: 'request', size: 16, fill: '#00BF6F' })
            ),
            h('span', { className: 'oi-modal-title' }, 'My Service Requests')
          ),
          h('button', { className: 'oi-modal-close', onClick: props.onClose }, h(OIIcon, { name: 'close', size: 18 }))
        ),
        h('div', { className: 'oi-modal-body', style: { padding: '1.25rem' } },
          h('div', { style: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' } },
            h('div', { style: { flex: '1', minWidth: '12rem' } },
              h('input', {
                className: 'oi-input',
                value: search,
                placeholder: 'Search requests...',
                onChange: function (e) { setSearch(e.target.value); }
              })
            ),
            h('div', { className: 'oi-filter-chips', style: { flexShrink: '0' } },
              STATE_FILTERS.map(function (f) {
                return h('button', {
                  key: f.key,
                  className: 'oi-filter-chip' + (filter === f.key ? ' active' : ''),
                  onClick: function () { setFilter(f.key); }
                }, f.label);
              })
            )
          ),
          loading
            ? h('div', { className: 'oi-spinner-center' }, h('div', { className: 'oi-spinner' }))
            : requests.length === 0
              ? h('div', { className: 'oi-empty' },
                  h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'inbox', size: 40, fill: '#DCDCDC' })),
                  h('div', { className: 'oi-empty-title' }, 'No service requests'),
                  h('div', { className: 'oi-empty-sub' }, 'Requests you submit through the Service Catalog will appear here.')
                )
              : filtered.length === 0
                ? h('div', { className: 'oi-empty' },
                    h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: 'search', size: 36, fill: '#DCDCDC' })),
                    h('div', { className: 'oi-empty-title' }, 'No matching requests'),
                    h('div', { className: 'oi-empty-sub' }, 'Try adjusting the search or filter.')
                  )
                : h('div', { className: 'oi-requests-grid' },
                    filtered.map(function (r) {
                      return h('a', {
                        key: r.sys_id,
                        className: 'oi-request-card',
                        href: r.url || '#',
                        target: '_blank'
                      },
                        h('div', { className: 'oi-request-card-top' },
                          h('span', { className: 'oi-request-card-num' }, r.number || ''),
                          h('span', { className: 'oi-badge ' + statusCls(r.state) }, r.state || '')
                        ),
                        h('div', { className: 'oi-request-card-desc' }, r.short_description || 'No description'),
                        h('div', { className: 'oi-request-card-foot' },
                          r.stage ? h('span', { className: 'oi-request-card-stage' }, r.stage) : null,
                          h('span', { className: 'oi-request-card-date' }, r.opened_at || '')
                        )
                      );
                    })
                  )
        ),
        h('div', { className: 'oi-modal-foot', style: { justifyContent: 'space-between' } },
          h('span', { style: { fontSize: '0.8125rem', color: '#6E6E6E' } },
            filtered.length + ' of ' + requests.length + ' request' + (requests.length === 1 ? '' : 's')
          ),
          h('button', { className: 'oi-btn ghost', onClick: props.onClose }, 'Close')
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
