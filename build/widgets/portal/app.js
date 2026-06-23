(function () {
  'use strict';

  var React    = window.React;
  var ReactDOM = window.ReactDOM;
  delete window.React;
  delete window.ReactDOM;

  var h           = React.createElement;
  var useState    = React.useState;
  var useEffect   = React.useEffect;
  var useRef      = React.useRef;
  var useReducer  = React.useReducer;
  var createContext = React.createContext;
  var useContext  = React.useContext;

  /* ─── Icons ───────────────────────────────────────────────────────────── */
  function OIIcon(props) {
    var size = props.size || 18;
    var paths = {
      workspace:    'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
      activity:     'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
      studio:       'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
      governance:   'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
      command:      'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
      user:         'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
      group:        'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
      search:       'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
      close:        'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      play:         'M8 5v14l11-7z',
      check:        'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
      plus:         'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
      remove:       'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
      error_icon:   'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
      warning_icon: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
      info_icon:    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
      lock:         'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
      denied:       'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z',
      automation:   'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z',
      refresh:      'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
      document:     'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
      chevron_right:'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
      chevron_down: 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
      menu:         'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
      approve:      'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z',
      reject:       'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
      person_add:   'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
      toggle_on:    'M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
      toggle_off:   'M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-10 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
      assistant:    'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z',
      send:         'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z',
      gallery:      'M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z',
      inbox:        'M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.11-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z',
      edit:         'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
      folder:       'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
      chat:         'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
      pipeline:     'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
      analytics:    'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z',
      journal:      'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z'
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

  /* ─── Helpers ─────────────────────────────────────────────────────────── */
  function relTime(val) {
    if (!val) { return ''; }
    var d = new Date(val);
    if (isNaN(d.getTime())) { return val; }
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    { return 'just now'; }
    if (diff < 3600)  { return Math.floor(diff / 60) + 'm ago'; }
    if (diff < 86400) { return Math.floor(diff / 3600) + 'h ago'; }
    return Math.floor(diff / 86400) + 'd ago';
  }

  function statusClass(status) {
    if (!status) { return 'neutral'; }
    var s = status.toLowerCase();
    if (s === 'success' || s === 'completed' || s === 'complete' || s === 'published') { return 'success'; }
    if (s === 'running' || s === 'in_progress' || s === 'in progress' || s === 'implementing') { return 'running'; }
    if (s === 'failed' || s === 'error' || s === 'failure' || s === 'rejected') { return 'failed'; }
    if (s === 'pending' || s === 'queued' || s === 'waiting' || s === 'review') { return 'pending'; }
    if (s === 'warning' || s === 'warn') { return 'warning'; }
    if (s === 'draft') { return 'neutral'; }
    if (s === 'approved') { return 'primary'; }
    return 'neutral';
  }

  function initials(name) {
    if (!name) { return '?'; }
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) { return parts[0].charAt(0).toUpperCase(); }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function stageLabel(stage) {
    var map = {
      draft:          'Draft',
      review:         'In Review',
      approved:       'Approved',
      implementing:   'Implementing',
      published:      'Published',
      rejected:       'Rejected'
    };
    return map[stage] || (stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : 'Draft');
  }

  function noop() {}

  /* ─── Bridge ──────────────────────────────────────────────────────────── */
  var _bridge     = null;
  var _toastId    = 0;
  var _msgId      = 0;

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

  /* ─── Context ─────────────────────────────────────────────────────────── */
  var AppContext = createContext(null);

  /* ─── Nav Config ─────────────────────────────────────────────────────── */
  var NAV_ITEMS = [
    { id: 'workspace',          label: 'Operations Workspace', icon: 'workspace',  roles: ['admin','developer','leadership','creator','user'] },
    { id: 'automations',        label: 'Automations Workspace',icon: 'gallery',    roles: ['admin','developer','leadership','creator','user'] },
    { id: 'creator-studio',     label: 'Creator Studio',       icon: 'studio',     roles: ['admin','developer','creator'] },
    { id: 'governance-control', label: 'Governance Control',   icon: 'governance', roles: ['admin','developer','leadership'] },
    { id: 'leadership-insights',label: 'Leadership Insights',  icon: 'inbox',      roles: ['admin','leadership'] },
    { id: 'developer-hub',      label: 'Developer Hub',        icon: 'document',   roles: ['admin','developer'] },
    { id: 'admin-hub',          label: 'Administrator Hub',    icon: 'command',    roles: ['admin'] }
  ];

  var ROLE_LABELS = {
    admin:      'Administrator',
    developer:  'Developer',
    leadership: 'Leadership',
    creator:    'Creator',
    user:       'User'
  };

  /* ─── Reducer ─────────────────────────────────────────────────────────── */
  var initialState = {
    section:     'workspace',
    sectionData: null,
    loading:     true,
    error:       null,
    toasts:      [],
    authDenied:  false,
    initData:    null,
    mobileOpen:  false
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
      default:
        return state;
    }
  }

  /* ─── Shared UI Atoms ─────────────────────────────────────────────────── */
  function Spinner(props) {
    var sz = props.large ? 'lg' : (props.small ? 'sm' : '');
    if (props.center) {
      return h('div', { className: 'oi-spinner-center' },
        h('div', { className: 'oi-spinner ' + sz }),
        props.label ? h('span', { className: 'oi-spinner-label' }, props.label) : null
      );
    }
    return h('div', { className: 'oi-spinner ' + sz });
  }

  function EmptyState(props) {
    return h('div', { className: 'oi-empty' },
      h('div', { className: 'oi-empty-icon' }, h(OIIcon, { name: props.icon || 'search', size: 40 })),
      h('div', { className: 'oi-empty-title' }, props.title || 'Nothing here yet'),
      props.sub ? h('div', { className: 'oi-empty-sub' }, props.sub) : null,
      props.action ? h('button', { className: 'oi-btn primary sm', style: { marginTop: '1rem' }, onClick: props.action.onClick }, props.action.label) : null
    );
  }

  function Badge(props) {
    return h('span', { className: 'oi-badge ' + (props.variant || 'neutral'), style: props.style }, props.children);
  }

  function Modal(props) {
    if (!props.open) { return null; }
    return h('div', { className: 'oi-backdrop', onClick: function (e) { if (e.target === e.currentTarget) { props.onClose && props.onClose(); } } },
      h('div', { className: 'oi-modal ' + (props.size || 'md') },
        h('div', { className: 'oi-modal-hdr' },
          h('div', { className: 'oi-modal-title' }, props.title),
          h('button', { className: 'oi-modal-close', onClick: props.onClose }, h(OIIcon, { name: 'close', size: 20 }))
        ),
        h('div', { className: 'oi-modal-body' }, props.children),
        props.footer ? h('div', { className: 'oi-modal-foot' }, props.footer) : null
      )
    );
  }

  /* ─── Assistant Chat ──────────────────────────────────────────────────── */
  function AssistantChat(props) {
    var assistantType = props.assistantType || 'operations';
    var title         = props.title || 'Operations Assistant';
    var tagline       = props.tagline || 'Ask me anything about Operations Intelligence';
    var sectionId     = props.sectionId || 'workspace';

    var ctx = useContext(AppContext);

    var msgState = useState([]);
    var messages   = msgState[0];
    var setMessages = msgState[1];

    var inputState = useState('');
    var input   = inputState[0];
    var setInput = inputState[1];

    var typingState = useState(false);
    var typing   = typingState[0];
    var setTyping = typingState[1];

    var choicesLockedState = useState(false);
    var choicesLocked   = choicesLockedState[0];
    var setChoicesLocked = choicesLockedState[1];

    var endRef = useRef(null);

    useEffect(function () {
      if (endRef.current) { endRef.current.scrollIntoView({ behavior: 'smooth' }); }
    }, [messages, typing]);

    useEffect(function () {
      if (messages.length === 0) {
        var welcome = { id: ++_msgId, role: 'assistant', text: 'Hello! I am your ' + title + '. How can I assist you today?' };
        setMessages([welcome]);
      }
    }, [sectionId]);

    function sendMessage(text) {
      if (!text || !text.trim()) { return; }
      var userMsg = { id: ++_msgId, role: 'user', text: text.trim() };
      setMessages(function (prev) { return prev.concat([userMsg]); });
      setInput('');
      setTyping(true);
      setChoicesLocked(true);

      var history = messages.slice(-8).map(function (m) { return { role: m.role, text: m.text }; });
      callBridge({
        action:         'assistant_query',
        section:        sectionId,
        assistant_type: assistantType,
        query:          text.trim(),
        context:        history,
        context_data:   props.contextData || {}
      }, function (data, err) {
        setTyping(false);
        if (err) {
          setMessages(function (prev) { return prev.concat([{ id: ++_msgId, role: 'error', text: err }]); });
          setChoicesLocked(false);
          return;
        }
        var reply   = (data && data.reply) || 'I could not process that request.';
        var choices = (data && data.choices) || [];
        var aMsg    = { id: ++_msgId, role: 'assistant', text: reply, choices: choices, dataHint: data && data.dataHint };
        setMessages(function (prev) { return prev.concat([aMsg]); });
        if (data && data.dataHint && props.onDataHint) {
          props.onDataHint(data.dataHint, data.entityRef);
        }
        setChoicesLocked(false);
      });
    }

    function onKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
    }

    function onChoiceClick(choice) {
      if (choicesLocked) { return; }
      sendMessage(choice);
    }

    return h('div', { className: 'oi-ws-assistant-panel' },
      h('div', { className: 'oi-ws-assistant-head' },
        h('div', { className: 'oi-ws-assistant-icon-wrap' },
          h(OIIcon, { name: 'assistant', size: 22, fill: '#00BF6F' })
        ),
        h('div', null,
          h('div', { className: 'oi-ws-assistant-name' }, title),
          h('div', { className: 'oi-ws-assistant-tagline' }, tagline)
        )
      ),
      h('div', { className: 'oi-chat-messages' },
        messages.map(function (m) {
          return h('div', { key: m.id, className: 'oi-chat-msg ' + m.role },
            h('div', { className: 'oi-chat-bubble' },
              m.text,
              m.choices && m.choices.length > 0
                ? h('div', { className: 'oi-chat-choices' },
                    m.choices.map(function (c, i) {
                      return h('button', {
                        key: i,
                        className: 'oi-choice-btn' + (choicesLocked ? ' dimmed' : ''),
                        disabled: choicesLocked,
                        onClick: function () { onChoiceClick(c); }
                      }, c);
                    })
                  )
                : null
            )
          );
        }),
        typing
          ? h('div', { className: 'oi-chat-msg assistant' },
              h('div', { className: 'oi-typing' },
                h('div', { className: 'oi-dot' }),
                h('div', { className: 'oi-dot' }),
                h('div', { className: 'oi-dot' })
              )
            )
          : null,
        h('div', { ref: endRef })
      ),
      h('div', { className: 'oi-chat-input-area' },
        h('input', {
          className:   'oi-input',
          type:        'text',
          placeholder: 'Type your message…',
          value:       input,
          onChange:    function (e) { setInput(e.target.value); },
          onKeyDown:   onKeyDown,
          disabled:    typing
        }),
        h('button', {
          className: 'oi-btn primary',
          style:     { flexShrink: 0, minWidth: '2.625rem', padding: '0.625rem' },
          onClick:   function () { sendMessage(input); },
          disabled:  typing || !input.trim()
        }, h(OIIcon, { name: 'send', size: 18 }))
      )
    );
  }

  /* ─── Catalog Panel ───────────────────────────────────────────────────── */
  function CatalogPanel(props) {
    var catalog    = props.catalog || [];
    var onTrigger  = props.onTrigger || noop;
    var onChatHint = props.onChatHint || noop;

    var expandedState = useState({});
    var expanded   = expandedState[0];
    var setExpanded = expandedState[1];

    function toggleCat(id) {
      setExpanded(function (prev) {
        var next = Object.assign({}, prev);
        next[id] = !next[id];
        return next;
      });
    }

    if (!catalog.length) {
      return h('div', { className: 'oi-ws-catalog-body' },
        h(EmptyState, { icon: 'folder', title: 'No catalog items', sub: 'An administrator can add categories and items.' })
      );
    }

    return h('div', { className: 'oi-ws-catalog-body' },
      catalog.map(function (cat) {
        var isOpen = !!expanded[cat.sys_id];
        var items  = cat.items || [];
        return h('div', { key: cat.sys_id, className: 'oi-catalog-section' },
          h('button', {
            className: 'oi-list-item',
            style: { background: '#FFFFFF', borderRadius: '0.5rem', marginBottom: isOpen ? '0' : '0', border: '0.0625rem solid #DCDCDC', padding: '0.875rem 1rem', cursor: 'pointer' },
            onClick: function () { toggleCat(cat.sys_id); }
          },
            h('span', {
              className: 'oi-list-item-icon',
              style: { background: (cat.color || '#00BF6F') + '22', color: cat.color || '#00BF6F', borderRadius: '0.5rem', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
            }, h(OIIcon, { name: cat.icon || 'folder', size: 16, fill: cat.color || '#00BF6F' })),
            h('span', { className: 'oi-list-item-body' },
              h('span', { className: 'oi-list-item-title', style: { fontSize: '0.9375rem' } }, cat.name),
              items.length > 0 ? h('span', { className: 'oi-list-item-sub' }, items.length + ' item' + (items.length !== 1 ? 's' : '')) : null
            ),
            h('span', { className: 'oi-list-item-count', style: { marginLeft: 'auto' } }, items.length),
            h('span', { className: 'oi-list-item-caret', style: { transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' } },
              h(OIIcon, { name: 'chevron_right', size: 16 })
            )
          ),
          isOpen && items.length > 0
            ? h('div', { className: 'oi-flow-list', style: { marginTop: '0.375rem', paddingLeft: '0.5rem' } },
                items.map(function (item) {
                  return h('div', { key: item.sys_id, className: 'oi-flow-item' },
                    h('div', { className: 'oi-flow-item-icon', style: { background: (cat.color || '#00BF6F') + '18', color: cat.color || '#00BF6F' } },
                      h(OIIcon, { name: 'automation', size: 16 })
                    ),
                    h('div', { className: 'oi-flow-item-body' },
                      h('div', { className: 'oi-flow-item-name' }, item.name),
                      item.description ? h('div', { className: 'oi-flow-item-desc' }, item.description) : null
                    ),
                    h('button', {
                      className: 'oi-btn primary xs',
                      onClick: function (e) { e.stopPropagation(); onTrigger(item); }
                    }, h(OIIcon, { name: 'play', size: 14 })),
                    h('div', { className: 'oi-flow-item-arrow', style: { cursor: 'pointer' }, onClick: function () { onChatHint(item.name); } },
                      h(OIIcon, { name: 'chat', size: 14, fill: '#6E6E6E' })
                    )
                  );
                })
              )
            : (isOpen && items.length === 0 ? h('div', { className: 'oi-empty-inline', style: { paddingLeft: '3rem', fontSize: '0.8125rem' } }, 'No items in this category.') : null)
        );
      })
    );
  }

  /* ─── Operations Workspace ────────────────────────────────────────────── */
  function WorkspaceSection(props) {
    var data      = props.data || {};
    var ctx       = useContext(AppContext);
    var automations = data.automations || [];
    var catalog     = data.catalog || [];

    var chatHintState = useState('');
    var chatHint   = chatHintState[0];
    var setChatHint = chatHintState[1];

    var trigLoadingState = useState(null);
    var trigLoading   = trigLoadingState[0];
    var setTrigLoading = trigLoadingState[1];

    function triggerAutomation(item) {
      setTrigLoading(item.sys_id);
      callBridge({ action: 'trigger_automation', automation_sys_id: item.sys_id }, function (data, err) {
        setTrigLoading(null);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Automation "' + item.name + '" triggered successfully.', 'success');
      });
    }

    function handleChatHint(itemName) {
      setChatHint('Tell me more about the "' + itemName + '" automation.');
    }

    var contextData = {
      automations: automations.map(function (a) { return { name: a.name, status: a.status }; }),
      pending_count: data.pending_count || 0,
      group_count:   data.group_count || 0
    };

    return h('div', { className: 'oi-workspace-layout' },
      h('div', { className: 'oi-ws-catalog-panel' },
        h('div', { className: 'oi-ws-catalog-head' },
          h('div', { className: 'oi-ws-catalog-title' }, 'Automation Catalog'),
          data.pending_count > 0
            ? h('span', { className: 'oi-badge warning' }, data.pending_count + ' pending')
            : null
        ),
        h(CatalogPanel, { catalog: catalog, onTrigger: triggerAutomation, onChatHint: handleChatHint })
      ),
      h(AssistantChat, {
        key:           'workspace-chat',
        assistantType: 'operations',
        title:         'Operations Assistant',
        tagline:       'Your intelligent operations guide',
        sectionId:     'workspace',
        contextData:   contextData,
        prefillInput:  chatHint,
        onDataHint:    noop
      })
    );
  }

  /* ─── Automations Workspace ───────────────────────────────────────────── */
  function AutomationsSection(props) {
    var data    = props.data || {};
    var ctx     = useContext(AppContext);
    var catalog = data.catalog || [];

    var filterState = useState('');
    var filter   = filterState[0];
    var setFilter = filterState[1];

    var trigLoadingState = useState(null);
    var trigLoading   = trigLoadingState[0];
    var setTrigLoading = trigLoadingState[1];

    var allItems = [];
    catalog.forEach(function (cat) {
      (cat.items || []).forEach(function (item) {
        allItems.push(Object.assign({}, item, { category_name: cat.name, category_color: cat.color }));
      });
    });

    var filtered = filter
      ? allItems.filter(function (it) { return it.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0 || (it.description || '').toLowerCase().indexOf(filter.toLowerCase()) >= 0; })
      : allItems;

    function triggerAutomation(item) {
      setTrigLoading(item.sys_id);
      callBridge({ action: 'trigger_automation', automation_sys_id: item.sys_id }, function (d, err) {
        setTrigLoading(null);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Automation "' + item.name + '" triggered.', 'success');
      });
    }

    var contextData = {
      catalog_count: allItems.length,
      categories:    catalog.map(function (c) { return c.name; })
    };

    return h('div', { className: 'oi-workspace-layout' },
      h('div', { className: 'oi-ws-catalog-panel' },
        h('div', { className: 'oi-ws-catalog-head' },
          h('div', { className: 'oi-ws-catalog-title' }, 'Automations Catalog'),
          h('span', { className: 'oi-badge primary' }, allItems.length + ' available')
        ),
        h('div', { style: { padding: '0.75rem 1rem', borderBottom: '0.0625rem solid #DCDCDC', flexShrink: 0 } },
          h('div', { className: 'oi-search-wrap', style: { width: '100%' } },
            h('span', { className: 'oi-search-icon' }, h(OIIcon, { name: 'search', size: 14 })),
            h('input', {
              className:   'oi-search-input',
              style:       { width: '100%' },
              placeholder: 'Search automations…',
              value:       filter,
              onChange:    function (e) { setFilter(e.target.value); }
            })
          )
        ),
        h('div', { className: 'oi-ws-catalog-body' },
          catalog.length === 0
            ? h(EmptyState, { icon: 'folder', title: 'No automations yet', sub: 'Administrators can configure the catalog.' })
            : (filter ? (
                filtered.length === 0
                  ? h('div', { className: 'oi-empty-inline' }, 'No results for "' + filter + '"')
                  : h('div', { className: 'oi-auto-list' },
                      filtered.map(function (item) {
                        return h('div', { key: item.sys_id, className: 'oi-auto-item' },
                          h('div', { className: 'oi-auto-item-accent', style: { background: item.category_color || '#00BF6F' } }),
                          h('div', { className: 'oi-auto-item-icon' }, h(OIIcon, { name: 'automation', size: 20, fill: item.category_color || '#00BF6F' })),
                          h('div', { className: 'oi-auto-item-body' },
                            h('div', { className: 'oi-auto-item-name' }, item.name),
                            h('div', { className: 'oi-auto-item-desc' }, item.description || ''),
                            h('div', { className: 'oi-auto-item-meta' }, item.category_name)
                          ),
                          h('button', {
                            className: 'oi-btn primary xs',
                            disabled:  trigLoading === item.sys_id,
                            onClick:   function () { triggerAutomation(item); }
                          }, trigLoading === item.sys_id ? h(Spinner, { small: true }) : h(OIIcon, { name: 'play', size: 14 }))
                        );
                      })
                    )
              ) : h(CatalogPanel, { catalog: catalog, onTrigger: triggerAutomation, onChatHint: noop })
            )
        )
      ),
      h(AssistantChat, {
        key:           'automations-chat',
        assistantType: 'automations',
        title:         'Automations Assistant',
        tagline:       'Explore and trigger automation workflows',
        sectionId:     'automations',
        contextData:   contextData,
        onDataHint:    noop
      })
    );
  }

  /* ─── Creator Studio ──────────────────────────────────────────────────── */
  function CreatorStudioSection(props) {
    var data = props.data || {};
    var ctx  = useContext(AppContext);
    var projects = data.projects || [];

    var selProjState = useState(null);
    var selProj   = selProjState[0];
    var setSelProj = selProjState[1];

    var selSessState = useState(null);
    var selSess   = selSessState[0];
    var setSelSess = selSessState[1];

    var sessMsgsState = useState([]);
    var sessMsgs   = sessMsgsState[0];
    var setSessMsgs = sessMsgsState[1];

    var showNewProjState = useState(false);
    var showNewProj   = showNewProjState[0];
    var setShowNewProj = showNewProjState[1];

    var showNewSessState = useState(false);
    var showNewSess   = showNewSessState[0];
    var setShowNewSess = showNewSessState[1];

    var newProjNameState = useState('');
    var newProjName   = newProjNameState[0];
    var setNewProjName = newProjNameState[1];

    var newProjDescState = useState('');
    var newProjDesc   = newProjDescState[0];
    var setNewProjDesc = newProjDescState[1];

    var newSessNameState = useState('');
    var newSessName   = newSessNameState[0];
    var setNewSessName = newSessNameState[1];

    var submittingState = useState(false);
    var submitting   = submittingState[0];
    var setSubmitting = submittingState[1];

    var expandedProjState = useState({});
    var expandedProj   = expandedProjState[0];
    var setExpandedProj = expandedProjState[1];

    var projectsRef = useRef(projects);
    projectsRef.current = projects;

    function toggleProject(projId) {
      setExpandedProj(function (prev) {
        var next = Object.assign({}, prev);
        next[projId] = !next[projId];
        return next;
      });
    }

    function selectSession(proj, sess) {
      setSelProj(proj);
      setSelSess(sess);
      setSessMsgs([]);
      if (sess) {
        callBridge({ action: 'get_session', session_sys_id: sess.sys_id }, function (d, err) {
          if (err) { ctx.toast(err, 'error'); return; }
          var msgs = (d && d.messages) || [];
          setSessMsgs(msgs);
        });
      }
    }

    function createProject() {
      if (!newProjName.trim()) { return; }
      setSubmitting(true);
      callBridge({ action: 'create_project', name: newProjName.trim(), description: newProjDesc.trim() }, function (d, err) {
        setSubmitting(false);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Project created.', 'success');
        setNewProjName('');
        setNewProjDesc('');
        setShowNewProj(false);
        props.onRefresh && props.onRefresh();
      });
    }

    function deleteProject(proj) {
      if (!window.confirm('Delete project "' + proj.name + '"? This cannot be undone.')) { return; }
      callBridge({ action: 'delete_project', project_sys_id: proj.sys_id }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Project deleted.', 'success');
        if (selProj && selProj.sys_id === proj.sys_id) { setSelProj(null); setSelSess(null); }
        props.onRefresh && props.onRefresh();
      });
    }

    function createSession() {
      if (!selProj || !newSessName.trim()) { return; }
      setSubmitting(true);
      callBridge({ action: 'create_session', project_sys_id: selProj.sys_id, name: newSessName.trim() }, function (d, err) {
        setSubmitting(false);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Session created.', 'success');
        setNewSessName('');
        setShowNewSess(false);
        props.onRefresh && props.onRefresh();
      });
    }

    function submitProject(proj) {
      callBridge({ action: 'update_project_stage', project_sys_id: proj.sys_id, stage: 'review' }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Project submitted for leadership review.', 'success');
        props.onRefresh && props.onRefresh();
      });
    }

    function saveMessages(messages) {
      if (!selSess) { return; }
      callBridge({ action: 'save_session_messages', session_sys_id: selSess.sys_id, messages: messages }, function (d, err) {
        if (err) { ctx.toast('Messages could not be saved.', 'error'); }
      });
    }

    var contextData = {
      project:  selProj ? { name: selProj.name, stage: selProj.stage } : null,
      session:  selSess ? { name: selSess.name } : null
    };

    var isSessionLocked = selProj && (selProj.stage === 'review' || selProj.stage === 'approved' || selProj.stage === 'implementing' || selProj.stage === 'published');

    return h('div', { className: 'oi-workspace-layout' },
      h('div', { className: 'oi-ws-catalog-panel', style: { width: '20rem', minWidth: '16rem' } },
        h('div', { className: 'oi-ws-catalog-head' },
          h('div', { className: 'oi-ws-catalog-title' }, 'Projects'),
          h('button', { className: 'oi-btn primary xs', onClick: function () { setShowNewProj(true); } },
            h(OIIcon, { name: 'plus', size: 14 }), ' New'
          )
        ),
        h('div', { className: 'oi-ws-catalog-body' },
          projects.length === 0
            ? h(EmptyState, { icon: 'folder', title: 'No projects yet', sub: 'Create your first automation project.', action: { label: 'New Project', onClick: function () { setShowNewProj(true); } } })
            : projects.map(function (proj) {
                var sessions = proj.sessions || [];
                var isOpen   = !!expandedProj[proj.sys_id];
                var stCls    = statusClass(proj.stage || 'draft');
                return h('div', { key: proj.sys_id, style: { marginBottom: '0.5rem' } },
                  h('div', {
                    className: 'oi-list-item' + (selProj && selProj.sys_id === proj.sys_id ? ' selected' : ''),
                    style: { background: '#FFFFFF', borderRadius: '0.5rem', border: '0.0625rem solid #DCDCDC', padding: '0.75rem 1rem' },
                    onClick: function () { setSelProj(proj); setSelSess(null); toggleProject(proj.sys_id); }
                  },
                    h('span', { className: 'oi-list-item-icon', style: { color: '#00BF6F' } }, h(OIIcon, { name: 'folder', size: 16 })),
                    h('span', { className: 'oi-list-item-body' },
                      h('span', { className: 'oi-list-item-title', style: { fontSize: '0.875rem' } }, proj.name),
                      h('span', { className: 'oi-badge ' + stCls, style: { fontSize: '0.6875rem', marginTop: '0.25rem' } }, stageLabel(proj.stage))
                    ),
                    h('span', { className: 'oi-list-item-actions' },
                      h('button', {
                        className: 'oi-icon-btn danger',
                        onClick: function (e) { e.stopPropagation(); deleteProject(proj); }
                      }, h(OIIcon, { name: 'remove', size: 14 }))
                    )
                  ),
                  isOpen
                    ? h('div', { style: { paddingLeft: '1.25rem', marginTop: '0.25rem' } },
                        sessions.map(function (sess) {
                          return h('div', {
                            key: sess.sys_id,
                            className: 'oi-list-item' + (selSess && selSess.sys_id === sess.sys_id ? ' selected' : ''),
                            style: { padding: '0.5rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' },
                            onClick: function () { selectSession(proj, sess); }
                          },
                            h('span', { style: { color: '#6E6E6E', marginRight: '0.5rem' } }, h(OIIcon, { name: 'chat', size: 13 })),
                            h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sess.name)
                          );
                        }),
                        !isSessionLocked
                          ? h('button', {
                              className: 'oi-list-item',
                              style: { padding: '0.4375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8125rem', color: '#00BF6F', border: '0.0625rem dashed #00BF6F', background: 'transparent', width: '100%', cursor: 'pointer', marginTop: '0.25rem' },
                              onClick: function (e) { e.stopPropagation(); setSelProj(proj); setShowNewSess(true); }
                            }, h(OIIcon, { name: 'plus', size: 12 }), ' New Session')
                          : null,
                        (proj.stage === 'draft' && sessions.length > 0)
                          ? h('button', {
                              className: 'oi-btn primary xs',
                              style: { width: '100%', marginTop: '0.5rem' },
                              onClick: function () { submitProject(proj); }
                            }, 'Submit for Review')
                          : null,
                        proj.stage === 'approved'
                          ? h('button', {
                              className: 'oi-btn primary xs',
                              style: { width: '100%', marginTop: '0.5rem' },
                              onClick: function () {
                                callBridge({ action: 'implement_project', project_sys_id: proj.sys_id }, function (d, err) {
                                  if (err) { ctx.toast(err, 'error'); return; }
                                  ctx.toast('Implementation started.', 'success');
                                  props.onRefresh && props.onRefresh();
                                });
                              }
                            }, 'Begin Implementation')
                          : null
                      )
                    : null
                );
              })
        )
      ),
      selSess
        ? h(AssistantChat, {
            key:           'creator-' + selSess.sys_id,
            assistantType: 'creator',
            title:         'Creator Assistant',
            tagline:       'Design your automation: ' + selSess.name,
            sectionId:     'creator-studio',
            contextData:   contextData,
            initialMessages: sessMsgs,
            onMessagesChange: saveMessages,
            onDataHint:    noop,
            disabled:      isSessionLocked
          })
        : h('div', { className: 'oi-ws-assistant-panel', style: { alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#6E6E6E' } },
            h(OIIcon, { name: 'chat', size: 48, fill: '#DCDCDC' }),
            h('div', { style: { fontWeight: 600, color: '#6E6E6E' } }, selProj ? 'Select or create a session' : 'Select a project to get started'),
            selProj && h('div', { style: { fontSize: '0.875rem', color: '#6E6E6E' } }, 'Project: ' + selProj.name)
          ),
      h(Modal, {
        open:    showNewProj,
        title:   'New Project',
        onClose: function () { setShowNewProj(false); setNewProjName(''); setNewProjDesc(''); },
        size:    'md',
        footer: h('div', { className: 'oi-form-actions' },
          h('button', { className: 'oi-btn ghost', onClick: function () { setShowNewProj(false); } }, 'Cancel'),
          h('button', { className: 'oi-btn primary', disabled: !newProjName.trim() || submitting, onClick: createProject },
            submitting ? h(Spinner, { small: true }) : 'Create Project'
          )
        )
      },
        h('div', { className: 'oi-form-group' },
          h('label', { className: 'oi-label' }, 'Project Name'),
          h('input', { className: 'oi-input', value: newProjName, onChange: function (e) { setNewProjName(e.target.value); }, placeholder: 'e.g. Employee Onboarding Automation' })
        ),
        h('div', { className: 'oi-form-group' },
          h('label', { className: 'oi-label' }, 'Description (optional)'),
          h('textarea', { className: 'oi-textarea', value: newProjDesc, onChange: function (e) { setNewProjDesc(e.target.value); }, placeholder: 'Describe the automation goal…' })
        )
      ),
      h(Modal, {
        open:    showNewSess,
        title:   selProj ? 'New Session in "' + selProj.name + '"' : 'New Session',
        onClose: function () { setShowNewSess(false); setNewSessName(''); },
        size:    'sm',
        footer: h('div', { className: 'oi-form-actions' },
          h('button', { className: 'oi-btn ghost', onClick: function () { setShowNewSess(false); } }, 'Cancel'),
          h('button', { className: 'oi-btn primary', disabled: !newSessName.trim() || submitting, onClick: createSession },
            submitting ? h(Spinner, { small: true }) : 'Create Session'
          )
        )
      },
        h('div', { className: 'oi-form-group' },
          h('label', { className: 'oi-label' }, 'Session Name'),
          h('input', { className: 'oi-input', value: newSessName, onChange: function (e) { setNewSessName(e.target.value); }, placeholder: 'e.g. Requirements Gathering' })
        )
      )
    );
  }

  /* ─── Governance Control ──────────────────────────────────────────────── */
  function GovernanceControlSection(props) {
    var data    = props.data || {};
    var ctx     = useContext(AppContext);
    var actions = data.pending_actions || data.actions || [];
    var groups  = data.groups || [];

    var tabState = useState('pending');
    var tab   = tabState[0];
    var setTab = tabState[1];

    var selGroupState = useState(null);
    var selGroup   = selGroupState[0];
    var setSelGroup = selGroupState[1];

    var savingState = useState(null);
    var saving   = savingState[0];
    var setSaving = savingState[1];

    function approveAction(action) {
      setSaving(action.sys_id);
      callBridge({ action: 'resolve_action', action_sys_id: action.sys_id, resolution: 'approved' }, function (d, err) {
        setSaving(null);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Action resolved.', 'success');
        props.onRefresh && props.onRefresh();
      });
    }

    function rejectAction(action) {
      setSaving(action.sys_id + '_reject');
      callBridge({ action: 'resolve_action', action_sys_id: action.sys_id, resolution: 'rejected' }, function (d, err) {
        setSaving(null);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Action dismissed.', 'success');
        props.onRefresh && props.onRefresh();
      });
    }

    var contextData = {
      pending_count: actions.length,
      group_count:   groups.length
    };

    return h('div', { className: 'oi-workspace-layout' },
      h('div', { className: 'oi-ws-catalog-panel', style: { width: '100%', flex: 1, borderRight: '0.0625rem solid #DCDCDC' } },
        h('div', { className: 'oi-subtabs', style: { borderRadius: 0 } },
          h('button', { className: 'oi-subtab' + (tab === 'pending' ? ' active' : ''), onClick: function () { setTab('pending'); } },
            'Pending Actions', h('span', { className: 'oi-subtab-count' + (actions.length > 0 ? ' warn' : '') }, actions.length)
          ),
          h('button', { className: 'oi-subtab' + (tab === 'groups' ? ' active' : ''), onClick: function () { setTab('groups'); } },
            'Group Management', h('span', { className: 'oi-subtab-count' }, groups.length)
          )
        ),
        tab === 'pending'
          ? h('div', { className: 'oi-subtab-body' },
              actions.length === 0
                ? h(EmptyState, { icon: 'check', title: 'No pending actions', sub: 'All governance actions have been processed.' })
                : h('div', { className: 'oi-action-list' },
                    actions.map(function (a) {
                      return h('div', { key: a.sys_id, className: 'oi-action-item' },
                        h('div', { className: 'oi-action-info' },
                          h('div', { className: 'oi-action-type' }, a.type || 'Request'),
                          h('div', { className: 'oi-action-desc' }, a.description || a.subject_name || ''),
                          h('div', { className: 'oi-action-meta' }, relTime(a.created_at) + (a.created_by ? ' · ' + a.created_by : ''))
                        ),
                        h('div', { className: 'oi-action-btns' },
                          h('button', { className: 'oi-btn ghost sm', disabled: saving === a.sys_id + '_reject', onClick: function () { rejectAction(a); } },
                            saving === a.sys_id + '_reject' ? h(Spinner, { small: true }) : 'Reject'
                          ),
                          h('button', { className: 'oi-btn primary sm', disabled: saving === a.sys_id, onClick: function () { approveAction(a); } },
                            saving === a.sys_id ? h(Spinner, { small: true }) : 'Approve'
                          )
                        )
                      );
                    })
                  )
            )
          : h('div', { className: 'oi-subtab-body' },
              groups.length === 0
                ? h(EmptyState, { icon: 'group', title: 'No groups configured', sub: 'Groups are managed through the system.' })
                : h('div', { className: 'oi-action-list' },
                    groups.map(function (g) {
                      var memberCount = (g.members || []).filter(function (m) { return m.status !== 'inactive'; }).length;
                      return h('div', {
                        key: g.sys_id,
                        className: 'oi-action-item' + (selGroup && selGroup.sys_id === g.sys_id ? ' selected' : ''),
                        style: { cursor: 'pointer' },
                        onClick: function () { setSelGroup(selGroup && selGroup.sys_id === g.sys_id ? null : g); }
                      },
                        h('div', { className: 'oi-action-info' },
                          h('div', { className: 'oi-action-type' }, g.status === 'active' ? 'Active' : 'Inactive'),
                          h('div', { className: 'oi-action-desc' }, g.name),
                          h('div', { className: 'oi-action-meta' }, (g.member_count || 0) + ' member' + ((g.member_count || 0) !== 1 ? 's' : ''))
                        ),
                        h('span', { className: 'oi-badge ' + (g.status === 'active' ? 'success' : 'neutral') }, g.status || 'active')
                      );
                    })
                  )
            )
      ),
      h(AssistantChat, {
        key:           'governance-chat',
        assistantType: 'operations',
        title:         'Governance Assistant',
        tagline:       'Manage approvals and group governance',
        sectionId:     'governance-control',
        contextData:   contextData,
        onDataHint:    noop
      })
    );
  }

  /* ─── Leadership Insights ─────────────────────────────────────────────── */
  function LeadershipInsightsSection(props) {
    var data     = props.data || {};
    var ctx      = useContext(AppContext);
    var pending  = data.pending_review || [];
    var pipeline = data.pipeline || [];
    var analytics = data.analytics || {};

    var tabState = useState('review');
    var tab   = tabState[0];
    var setTab = tabState[1];

    var selProjState = useState(null);
    var selProj   = selProjState[0];
    var setSelProj = selProjState[1];

    var feedbackState = useState('');
    var feedback   = feedbackState[0];
    var setFeedback = feedbackState[1];

    var savingState = useState(null);
    var saving   = savingState[0];
    var setSaving = savingState[1];

    function approveProject(proj) {
      setSaving(proj.sys_id + '_approve');
      callBridge({ action: 'approve_project', project_sys_id: proj.sys_id, feedback: feedback }, function (d, err) {
        setSaving(null);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Project "' + proj.name + '" approved.', 'success');
        setSelProj(null);
        setFeedback('');
        props.onRefresh && props.onRefresh();
      });
    }

    function rejectProject(proj) {
      if (!feedback.trim()) { ctx.toast('Please provide rejection feedback.', 'warning'); return; }
      setSaving(proj.sys_id + '_reject');
      callBridge({ action: 'reject_project', project_sys_id: proj.sys_id, feedback: feedback }, function (d, err) {
        setSaving(null);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Project "' + proj.name + '" rejected.', 'success');
        setSelProj(null);
        setFeedback('');
        props.onRefresh && props.onRefresh();
      });
    }

    var contextData = {
      pending_review_count: pending.length,
      pipeline_count:       pipeline.length
    };

    return h('div', { className: 'oi-workspace-layout' },
      h('div', { className: 'oi-ws-catalog-panel', style: { width: '100%', flex: 1 } },
        h('div', { className: 'oi-subtabs', style: { borderRadius: 0 } },
          h('button', { className: 'oi-subtab' + (tab === 'review' ? ' active' : ''), onClick: function () { setTab('review'); } },
            'Pending Review', h('span', { className: 'oi-subtab-count' + (pending.length > 0 ? ' warn' : '') }, pending.length)
          ),
          h('button', { className: 'oi-subtab' + (tab === 'pipeline' ? ' active' : ''), onClick: function () { setTab('pipeline'); } },
            'Initiative Pipeline', h('span', { className: 'oi-subtab-count' }, pipeline.length)
          )
        ),
        tab === 'review'
          ? h('div', { className: 'oi-subtab-body' },
              pending.length === 0
                ? h(EmptyState, { icon: 'inbox', title: 'No pending reviews', sub: 'All automation initiatives have been reviewed.' })
                : h('div', null,
                    pending.map(function (proj) {
                      var isSelected = selProj && selProj.sys_id === proj.sys_id;
                      return h('div', { key: proj.sys_id },
                        h('div', {
                          className: 'oi-action-item',
                          style: { cursor: 'pointer', background: isSelected ? 'rgba(0,191,111,0.04)' : '' },
                          onClick: function () { setSelProj(isSelected ? null : proj); setFeedback(''); }
                        },
                          h('div', { className: 'oi-action-info' },
                            h('div', { className: 'oi-action-type' }, 'Automation Initiative'),
                            h('div', { className: 'oi-action-desc' }, proj.name),
                            h('div', { className: 'oi-action-meta' }, (proj.description || '') + ' · ' + relTime(proj.created_at))
                          ),
                          h('span', { className: 'oi-badge pending' }, 'Pending Review')
                        ),
                        isSelected
                          ? h('div', { style: { padding: '1rem 1.5rem', background: '#F9FBF9', borderBottom: '0.0625rem solid #DCDCDC' } },
                              h('div', { className: 'oi-form-group' },
                                h('label', { className: 'oi-label' }, 'Feedback (required for rejection)'),
                                h('textarea', { className: 'oi-textarea', value: feedback, onChange: function (e) { setFeedback(e.target.value); }, placeholder: 'Provide feedback or approval notes…', style: { minHeight: '4rem' } })
                              ),
                              h('div', { className: 'oi-form-actions' },
                                h('button', { className: 'oi-btn danger sm', disabled: saving === proj.sys_id + '_reject', onClick: function () { rejectProject(proj); } },
                                  saving === proj.sys_id + '_reject' ? h(Spinner, { small: true }) : h('span', null, h(OIIcon, { name: 'reject', size: 14 }), ' Reject')
                                ),
                                h('button', { className: 'oi-btn primary sm', disabled: saving === proj.sys_id + '_approve', onClick: function () { approveProject(proj); } },
                                  saving === proj.sys_id + '_approve' ? h(Spinner, { small: true }) : h('span', null, h(OIIcon, { name: 'approve', size: 14 }), ' Approve')
                                )
                              )
                            )
                          : null
                      );
                    })
                  )
            )
          : h('div', { className: 'oi-subtab-body' },
              pipeline.length === 0
                ? h(EmptyState, { icon: 'pipeline', title: 'No initiatives in pipeline', sub: 'Approved initiatives will appear here during implementation.' })
                : h('table', { className: 'oi-table' },
                    h('thead', null, h('tr', null,
                      h('th', null, 'Initiative'),
                      h('th', null, 'Stage'),
                      h('th', null, 'Updated')
                    )),
                    h('tbody', null,
                      pipeline.map(function (proj) {
                        return h('tr', { key: proj.sys_id },
                          h('td', null, h('div', { className: 'oi-td-primary' }, proj.name), h('div', { className: 'oi-td-muted' }, proj.description || '')),
                          h('td', null, h('span', { className: 'oi-badge ' + statusClass(proj.stage) }, stageLabel(proj.stage))),
                          h('td', { className: 'oi-td-muted' }, relTime(proj.updated_at || proj.created_at))
                        );
                      })
                    )
                  )
            )
      ),
      h(AssistantChat, {
        key:           'leadership-chat',
        assistantType: 'leadership',
        title:         'Leadership Assistant',
        tagline:       'Strategic insights and initiative oversight',
        sectionId:     'leadership-insights',
        contextData:   contextData,
        onDataHint:    noop
      })
    );
  }

  /* ─── Developer Hub ───────────────────────────────────────────────────── */
  function DeveloperHubSection(props) {
    var data      = props.data || {};
    var ctx       = useContext(AppContext);
    var inventory = data.inventory || {};
    var journalSummary = data.journal_summary || {};

    var tabState = useState('inventory');
    var tab   = tabState[0];
    var setTab = tabState[1];

    var journalState = useState(null);
    var journal   = journalState[0];
    var setJournal = journalState[1];

    var journalLoadingState = useState(false);
    var journalLoading   = journalLoadingState[0];
    var setJournalLoading = journalLoadingState[1];

    var invTabState = useState('tables');
    var invTab   = invTabState[0];
    var setInvTab = invTabState[1];

    function loadJournal() {
      setJournalLoading(true);
      callBridge({ action: 'get_journal', limit: 50 }, function (d, err) {
        setJournalLoading(false);
        if (err) { ctx.toast(err, 'error'); return; }
        var jd = (d && d.journal) || d;
        setJournal((jd && jd.entries) || []);
      });
    }

    useEffect(function () {
      if (tab === 'journal' && !journal) { loadJournal(); }
    }, [tab]);

    var invSections = [
      { key: 'tables',         label: 'Tables',          icon: 'analytics' },
      { key: 'script_includes',label: 'Script Includes', icon: 'document' },
      { key: 'business_rules', label: 'Business Rules',  icon: 'check' },
      { key: 'scheduled_jobs', label: 'Scheduled Jobs',  icon: 'pipeline' },
      { key: 'ui_pages',       label: 'UI Pages',        icon: 'gallery' },
      { key: 'properties',     label: 'Properties',      icon: 'command' }
    ];

    var contextData = {
      inventory_counts: Object.keys(inventory).reduce(function (acc, k) {
        acc[k] = Array.isArray(inventory[k]) ? inventory[k].length : 0;
        return acc;
      }, {}),
      journal_total: journalSummary.total || 0
    };

    return h('div', { className: 'oi-workspace-layout' },
      h('div', { className: 'oi-ws-catalog-panel', style: { width: '100%', flex: 1 } },
        h('div', { className: 'oi-subtabs', style: { borderRadius: 0 } },
          h('button', { className: 'oi-subtab' + (tab === 'inventory' ? ' active' : ''), onClick: function () { setTab('inventory'); } }, 'Application Inventory'),
          h('button', { className: 'oi-subtab' + (tab === 'journal' ? ' active' : ''), onClick: function () { setTab('journal'); } }, 'Execution Journal',
            journalSummary.total ? h('span', { className: 'oi-subtab-count' }, journalSummary.total) : null
          )
        ),
        tab === 'inventory'
          ? h('div', { className: 'oi-subtab-body' },
              h('div', { className: 'oi-subtabs', style: { borderRadius: 0, borderTop: 'none' } },
                invSections.map(function (s) {
                  var count = Array.isArray(inventory[s.key]) ? inventory[s.key].length : 0;
                  return h('button', { key: s.key, className: 'oi-subtab' + (invTab === s.key ? ' active' : ''), onClick: function () { setInvTab(s.key); } },
                    s.label, h('span', { className: 'oi-subtab-count' }, count)
                  );
                })
              ),
              h('div', null,
                (function () {
                  var items = Array.isArray(inventory[invTab]) ? inventory[invTab] : [];
                  if (!items.length) { return h(EmptyState, { icon: 'document', title: 'No ' + invTab.replace('_', ' ') + ' found', sub: 'No artifacts of this type in the application.' }); }
                  return h('table', { className: 'oi-table' },
                    h('thead', null, h('tr', null,
                      h('th', null, 'Name'),
                      h('th', null, 'API Name'),
                      h('th', null, 'Updated')
                    )),
                    h('tbody', null,
                      items.map(function (item, i) {
                        return h('tr', { key: item.sys_id || i },
                          h('td', null, h('div', { className: 'oi-td-primary' }, item.name || item.label || '')),
                          h('td', null, h('code', { className: 'oi-td-mono' }, item.api_name || item.element || '')),
                          h('td', { className: 'oi-td-muted' }, relTime(item.sys_updated_on))
                        );
                      })
                    )
                  );
                })()
              )
            )
          : h('div', { className: 'oi-subtab-body' },
              h('div', { style: { padding: '1rem 1.5rem', borderBottom: '0.0625rem solid #DCDCDC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                h('div', null,
                  h('span', { style: { fontWeight: 600, fontSize: '0.9375rem' } }, 'Execution Journal'),
                  journalSummary.total ? h('span', { className: 'oi-badge neutral', style: { marginLeft: '0.75rem' } }, journalSummary.total + ' entries') : null
                ),
                h('button', { className: 'oi-btn ghost sm', onClick: loadJournal, disabled: journalLoading },
                  journalLoading ? h(Spinner, { small: true }) : h(OIIcon, { name: 'refresh', size: 14 })
                )
              ),
              journalLoading
                ? h(Spinner, { center: true, label: 'Loading journal…' })
                : (!journal
                    ? h(EmptyState, { icon: 'journal', title: 'No journal data', sub: 'Click refresh to load the execution journal.', action: { label: 'Load Journal', onClick: loadJournal } })
                    : journal.length === 0
                      ? h(EmptyState, { icon: 'journal', title: 'Journal is empty', sub: 'No execution events recorded yet.' })
                      : h('table', { className: 'oi-table' },
                          h('thead', null, h('tr', null,
                            h('th', null, 'Event'),
                            h('th', null, 'Subject'),
                            h('th', null, 'Result'),
                            h('th', null, 'Time')
                          )),
                          h('tbody', null,
                            journal.map(function (entry, i) {
                              return h('tr', { key: entry.id || i },
                                h('td', null,
                                  h('div', { className: 'oi-td-primary' }, (entry.event_type || '').replace(/_/g, ' ')),
                                  entry.context && entry.context.section ? h('div', { className: 'oi-td-muted' }, entry.context.section) : null
                                ),
                                h('td', null,
                                  entry.subject ? h('div', null, h('div', { className: 'oi-td-primary' }, entry.subject.name || entry.subject.type || ''), h('div', { className: 'oi-td-muted' }, entry.subject.type || '')) : h('span', { className: 'oi-td-muted' }, '—')
                                ),
                                h('td', null,
                                  entry.result
                                    ? h('span', { className: 'oi-badge ' + statusClass(entry.result.status || 'neutral') }, entry.result.status || 'ok')
                                    : h('span', { className: 'oi-td-muted' }, '—')
                                ),
                                h('td', { className: 'oi-td-muted' }, relTime(entry.timestamp))
                              );
                            })
                          )
                        )
                  )
            )
      ),
      h(AssistantChat, {
        key:           'developer-chat',
        assistantType: 'developer',
        title:         'Developer Assistant',
        tagline:       'Inspect artifacts and debug the solution',
        sectionId:     'developer-hub',
        contextData:   contextData,
        onDataHint:    noop
      })
    );
  }

  /* ─── Administrator Hub ───────────────────────────────────────────────── */
  function AdminHubSection(props) {
    var data       = props.data || {};
    var ctx        = useContext(AppContext);
    var stats      = data.stats || {};
    var maintRaw   = data.maintenance || {};
    var MAINT_LABELS = {
      'workspace':          'Operations Workspace',
      'automations':        'Automations Workspace',
      'creator-studio':     'Creator Studio',
      'governance-control': 'Governance Control',
      'leadership-insights':'Leadership Insights',
      'developer-hub':      'Developer Hub',
      'admin-hub':          'Administrator Hub'
    };
    var maintenance = Object.keys(maintRaw).map(function (k) {
      return { property: k, label: MAINT_LABELS[k] || k, value: !!maintRaw[k], description: 'Disable user access to this module' };
    });
    var catalog    = data.catalog_categories || [];

    var tabState = useState('catalog');
    var tab   = tabState[0];
    var setTab = tabState[1];

    var showCatModalState = useState(false);
    var showCatModal   = showCatModalState[0];
    var setShowCatModal = showCatModalState[1];

    var showItemModalState = useState(false);
    var showItemModal   = showItemModalState[0];
    var setShowItemModal = showItemModalState[1];

    var selCatState = useState(null);
    var selCat   = selCatState[0];
    var setSelCat = selCatState[1];

    var formState = useState({});
    var form   = formState[0];
    var setForm = formState[1];

    var submittingState = useState(false);
    var submitting   = submittingState[0];
    var setSubmitting = submittingState[1];

    var togglingState = useState(null);
    var toggling   = togglingState[0];
    var setToggling = togglingState[1];

    function openNewCategory() {
      setForm({ name: '', description: '', icon: 'folder', color: '#00BF6F' });
      setShowCatModal(true);
    }

    function openNewItem(cat) {
      setSelCat(cat);
      setForm({ name: '', description: '', action_type: '', action_value: '' });
      setShowItemModal(true);
    }

    function saveCategory() {
      if (!form.name || !form.name.trim()) { return; }
      setSubmitting(true);
      callBridge({
        action:      'save_catalog_category',
        name:        form.name,
        description: form.description || '',
        icon:        form.icon || 'folder',
        color:       form.color || '#00BF6F'
      }, function (d, err) {
        setSubmitting(false);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Category saved.', 'success');
        setShowCatModal(false);
        props.onRefresh && props.onRefresh();
      });
    }

    function saveItem() {
      if (!form.name || !form.name.trim() || !selCat) { return; }
      setSubmitting(true);
      callBridge({
        action:           'save_catalog_item',
        category_sys_id:  selCat.sys_id,
        name:             form.name,
        description:      form.description || '',
        action_type:      form.action_type || '',
        action_value:     form.action_value || ''
      }, function (d, err) {
        setSubmitting(false);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Item saved.', 'success');
        setShowItemModal(false);
        props.onRefresh && props.onRefresh();
      });
    }

    function deleteCategory(cat) {
      if (!window.confirm('Delete category "' + cat.name + '" and all its items?')) { return; }
      callBridge({ action: 'delete_catalog_category', sys_id: cat.sys_id }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Category deleted.', 'success');
        props.onRefresh && props.onRefresh();
      });
    }

    function deleteItem(cat, item) {
      if (!window.confirm('Delete item "' + item.name + '"?')) { return; }
      callBridge({ action: 'delete_catalog_item', category_sys_id: cat.sys_id, item_sys_id: item.sys_id }, function (d, err) {
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast('Item deleted.', 'success');
        props.onRefresh && props.onRefresh();
      });
    }

    function toggleMaintenance(item) {
      setToggling(item.property);
      callBridge({ action: 'toggle_maintenance', section: item.property, enabled: !item.value }, function (d, err) {
        setToggling(null);
        if (err) { ctx.toast(err, 'error'); return; }
        ctx.toast(item.label + ' ' + (!item.value ? 'enabled' : 'disabled') + '.', 'success');
        props.onRefresh && props.onRefresh();
      });
    }

    var contextData = {
      catalog_category_count: catalog.length,
      stats: stats
    };

    return h('div', { className: 'oi-workspace-layout' },
      h('div', { className: 'oi-ws-catalog-panel', style: { flex: 1, width: '100%' } },
        h('div', { className: 'oi-subtabs', style: { borderRadius: 0 } },
          h('button', { className: 'oi-subtab' + (tab === 'catalog' ? ' active' : ''), onClick: function () { setTab('catalog'); } }, 'Automation Catalog'),
          h('button', { className: 'oi-subtab' + (tab === 'maintenance' ? ' active' : ''), onClick: function () { setTab('maintenance'); } }, 'Maintenance Controls'),
          h('button', { className: 'oi-subtab' + (tab === 'overview' ? ' active' : ''), onClick: function () { setTab('overview'); } }, 'System Overview')
        ),
        tab === 'catalog'
          ? h('div', { className: 'oi-subtab-body' },
              h('div', { style: { display: 'flex', justifyContent: 'flex-end', padding: '0.875rem 1.25rem', borderBottom: '0.0625rem solid #DCDCDC' } },
                h('button', { className: 'oi-btn primary sm', onClick: openNewCategory },
                  h(OIIcon, { name: 'plus', size: 14 }), ' New Category'
                )
              ),
              catalog.length === 0
                ? h(EmptyState, { icon: 'folder', title: 'No categories yet', sub: 'Create the first catalog category to get started.', action: { label: 'New Category', onClick: openNewCategory } })
                : catalog.map(function (cat) {
                    var items = cat.items || [];
                    return h('div', { key: cat.sys_id, className: 'oi-panel', style: { margin: '1rem' } },
                      h('div', { className: 'oi-panel-hdr' },
                        h('span', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' } },
                          h('span', { style: { color: cat.color || '#00BF6F' } }, h(OIIcon, { name: cat.icon || 'folder', size: 16 })),
                          h('span', { className: 'oi-panel-title' }, cat.name)
                        ),
                        h('div', { style: { display: 'flex', gap: '0.5rem' } },
                          h('button', { className: 'oi-btn ghost xs', onClick: function () { openNewItem(cat); } }, h(OIIcon, { name: 'plus', size: 12 }), ' Item'),
                          h('button', { className: 'oi-icon-btn danger', onClick: function () { deleteCategory(cat); } }, h(OIIcon, { name: 'remove', size: 14 }))
                        )
                      ),
                      h('div', { className: 'oi-panel-body', style: { padding: '0' } },
                        items.length === 0
                          ? h('div', { className: 'oi-empty-inline', style: { padding: '1.25rem' } }, 'No items in this category.')
                          : h('table', { className: 'oi-table' },
                              h('thead', null, h('tr', null, h('th', null, 'Name'), h('th', null, 'Description'), h('th', null, 'Action'), h('th', null, ''))),
                              h('tbody', null,
                                items.map(function (item) {
                                  return h('tr', { key: item.sys_id },
                                    h('td', null, h('div', { className: 'oi-td-primary' }, item.name)),
                                    h('td', null, h('div', { className: 'oi-td-muted' }, item.description || '—')),
                                    h('td', null, item.action_type ? h('code', { className: 'oi-td-mono' }, item.action_type) : h('span', { className: 'oi-td-muted' }, '—')),
                                    h('td', null, h('button', { className: 'oi-icon-btn danger', onClick: function () { deleteItem(cat, item); } }, h(OIIcon, { name: 'remove', size: 14 })))
                                  );
                                })
                              )
                            )
                      )
                    );
                  })
            )
          : tab === 'maintenance'
            ? h('div', { className: 'oi-subtab-body' },
                maintenance.length === 0
                  ? h(EmptyState, { icon: 'command', title: 'No maintenance controls', sub: 'Maintenance controls are configured in the system.' })
                  : h('div', { className: 'oi-maintenance-list', style: { padding: '1rem 1.5rem' } },
                      maintenance.map(function (item) {
                        return h('div', { key: item.property, className: 'oi-maintenance-item' + (item.value ? ' active' : '') },
                          h('div', { className: 'oi-maintenance-info' },
                            h('div', { className: 'oi-maintenance-label' }, item.label),
                            h('div', { className: 'oi-maintenance-desc' }, item.description || ''),
                            h('div', { className: 'oi-maintenance-prop' }, item.property)
                          ),
                          toggling === item.property
                            ? h(Spinner, { small: true })
                            : h('button', {
                                className: 'oi-toggle' + (item.value ? ' on' : ''),
                                onClick: function () { toggleMaintenance(item); }
                              }, h('span', { className: 'oi-toggle-knob' }))
                        );
                      })
                    )
              )
            : h('div', { className: 'oi-subtab-body' },
                h('div', { style: { padding: '1.5rem' } },
                  h('div', { className: 'oi-stats' },
                    Object.keys(stats).length === 0
                      ? h(EmptyState, { icon: 'analytics', title: 'No statistics available', sub: 'System statistics will appear here once data is collected.' })
                      : Object.keys(stats).map(function (k) {
                          return h('div', { key: k, className: 'oi-stat' },
                            h('div', { className: 'oi-stat-value' }, typeof stats[k] === 'number' ? stats[k] : (stats[k] || '—')),
                            h('div', { className: 'oi-stat-label' }, k.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); })),
                            h('div', { className: 'oi-stat-icon' }, h(OIIcon, { name: 'analytics', size: 40 }))
                          );
                        })
                  )
                )
              )
      ),
      h(AssistantChat, {
        key:           'admin-chat',
        assistantType: 'admin',
        title:         'Administrator Assistant',
        tagline:       'Configure and maintain the solution',
        sectionId:     'admin-hub',
        contextData:   contextData,
        onDataHint:    noop
      }),
      h(Modal, {
        open:    showCatModal,
        title:   'New Catalog Category',
        onClose: function () { setShowCatModal(false); },
        size:    'md',
        footer: h('div', { className: 'oi-form-actions' },
          h('button', { className: 'oi-btn ghost', onClick: function () { setShowCatModal(false); } }, 'Cancel'),
          h('button', { className: 'oi-btn primary', disabled: !form.name || submitting, onClick: saveCategory },
            submitting ? h(Spinner, { small: true }) : 'Save Category'
          )
        )
      },
        h('div', { className: 'oi-form-group' },
          h('label', { className: 'oi-label' }, 'Category Name'),
          h('input', { className: 'oi-input', value: form.name || '', onChange: function (e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'e.g. Employee Services' })
        ),
        h('div', { className: 'oi-form-group' },
          h('label', { className: 'oi-label' }, 'Description'),
          h('textarea', { className: 'oi-textarea', value: form.description || '', onChange: function (e) { setForm(Object.assign({}, form, { description: e.target.value })); }, placeholder: 'Brief description…' })
        ),
        h('div', { className: 'oi-form-row' },
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Icon'),
            h('input', { className: 'oi-input', value: form.icon || '', onChange: function (e) { setForm(Object.assign({}, form, { icon: e.target.value })); }, placeholder: 'folder' })
          ),
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Color'),
            h('input', { className: 'oi-input', type: 'color', value: form.color || '#00BF6F', onChange: function (e) { setForm(Object.assign({}, form, { color: e.target.value })); } })
          )
        )
      ),
      h(Modal, {
        open:    showItemModal,
        title:   selCat ? 'New Item in "' + selCat.name + '"' : 'New Item',
        onClose: function () { setShowItemModal(false); },
        size:    'md',
        footer: h('div', { className: 'oi-form-actions' },
          h('button', { className: 'oi-btn ghost', onClick: function () { setShowItemModal(false); } }, 'Cancel'),
          h('button', { className: 'oi-btn primary', disabled: !form.name || submitting, onClick: saveItem },
            submitting ? h(Spinner, { small: true }) : 'Save Item'
          )
        )
      },
        h('div', { className: 'oi-form-group' },
          h('label', { className: 'oi-label' }, 'Item Name'),
          h('input', { className: 'oi-input', value: form.name || '', onChange: function (e) { setForm(Object.assign({}, form, { name: e.target.value })); }, placeholder: 'e.g. Create User Account' })
        ),
        h('div', { className: 'oi-form-group' },
          h('label', { className: 'oi-label' }, 'Description'),
          h('textarea', { className: 'oi-textarea', value: form.description || '', onChange: function (e) { setForm(Object.assign({}, form, { description: e.target.value })); }, placeholder: 'What does this automation do?' })
        ),
        h('div', { className: 'oi-form-row' },
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Action Type'),
            h('input', { className: 'oi-input', value: form.action_type || '', onChange: function (e) { setForm(Object.assign({}, form, { action_type: e.target.value })); }, placeholder: 'flow, script, etc.' })
          ),
          h('div', { className: 'oi-form-group' },
            h('label', { className: 'oi-label' }, 'Action Value'),
            h('input', { className: 'oi-input', value: form.action_value || '', onChange: function (e) { setForm(Object.assign({}, form, { action_value: e.target.value })); }, placeholder: 'Flow ID or script name' })
          )
        )
      )
    );
  }

  /* ─── Toast Container ─────────────────────────────────────────────────── */
  function ToastLayer(props) {
    var toasts = props.toasts || [];
    if (!toasts.length) { return null; }
    return h('div', { className: 'oi-toasts' },
      toasts.map(function (t) {
        var iconName = t.type === 'success' ? 'check' : t.type === 'error' ? 'error_icon' : t.type === 'warning' ? 'warning_icon' : 'info_icon';
        return h('div', { key: t.id, className: 'oi-toast ' + (t.type || 'info') },
          h('span', { className: 'oi-toast-icon' }, h(OIIcon, { name: iconName, size: 18 })),
          h('span', { className: 'oi-toast-msg' }, t.message),
          h('button', { className: 'oi-toast-close', onClick: function () { props.onDismiss && props.onDismiss(t.id); } }, h(OIIcon, { name: 'close', size: 16 }))
        );
      })
    );
  }

  /* ─── Error Boundary ──────────────────────────────────────────────────── */
  function ErrorBoundary(props) {
    var errState = useState(null);
    var err   = errState[0];
    var setErr = errState[1];
    if (err) {
      return h('div', { className: 'oi-crash' },
        h('div', { className: 'oi-crash-card' },
          h('div', { className: 'oi-crash-icon' }, h(OIIcon, { name: 'error_icon', size: 40, fill: '#D9534F' })),
          h('div', { className: 'oi-crash-title' }, 'Unexpected Error'),
          h('div', { className: 'oi-crash-desc' }, 'The interface encountered an error and cannot continue.'),
          h('code', { className: 'oi-crash-msg' }, err.message || String(err)),
          h('button', { className: 'oi-btn primary', onClick: function () { window.location.reload(); } }, 'Reload')
        )
      );
    }
    return props.children;
  }

  /* ─── Root App ────────────────────────────────────────────────────────── */
  function App() {
    var result   = useReducer(reducer, initialState);
    var state    = result[0];
    var dispatch = result[1];

    function toast(message, type) {
      var id = ++_toastId;
      dispatch({ type: 'PUSH_TOAST', payload: { id: id, message: message, type: type || 'info' } });
      setTimeout(function () { dispatch({ type: 'POP_TOAST', payload: id }); }, 4000);
    }

    function callServer(payload, cb) {
      callBridge(payload, function (data, err) {
        if (err) { toast(err, 'error'); cb && cb(null, err); return; }
        cb && cb(data, null);
      });
    }

    function loadSection(id) {
      dispatch({ type: 'SET_SECTION', payload: id });
      dispatch({ type: 'SET_LOADING', payload: true });
      callServer({ action: 'load_section', section: id }, function (data, err) {
        if (err) { dispatch({ type: 'SET_ERROR', payload: err }); return; }
        dispatch({ type: 'SET_SECTION_DATA', payload: data });
      });
    }

    function refreshSection() {
      loadSection(state.section);
    }

    useEffect(function () {
      callServer({ action: 'init' }, function (data, err) {
        if (err) { dispatch({ type: 'SET_AUTH_DENIED', payload: true }); return; }
        if (data && data.denied) { dispatch({ type: 'SET_AUTH_DENIED', payload: true }); dispatch({ type: 'SET_INIT', payload: data }); return; }
        dispatch({ type: 'SET_INIT', payload: data });
        loadSection('workspace');
      });
    }, []);

    if (state.authDenied) {
      var deniedLogin = (state.initData && state.initData.deniedLogin) || 'Unknown';
      return h('div', { id: 'oi-root' },
        h('div', { className: 'oi-denied' },
          h('div', { className: 'oi-denied-card' },
            h('div', { className: 'oi-denied-icon' }, h(OIIcon, { name: 'denied', size: 56, fill: '#D9534F' })),
            h('h1', { className: 'oi-denied-title' }, 'Access Restricted'),
            h('p', { className: 'oi-denied-desc' }, 'Operations Intelligence is available only to authorised team members. Contact your administrator to request access.'),
            h('code', { className: 'oi-denied-user' }, deniedLogin),
            h('p', { className: 'oi-denied-hint' }, 'If you believe this is an error, please contact your Operations Intelligence administrator.')
          )
        )
      );
    }

    var initData  = state.initData || {};
    var sysRole   = initData.userRole || 'user';
    var userName  = initData.userName || 'User';
    var userEmail = initData.userEmail || '';

    var userInitials  = initData.userInitials || initials(userName);
    var userRoleLabel = ROLE_LABELS[sysRole] || 'User';

    var visibleNav = NAV_ITEMS.filter(function (nav) {
      return nav.roles.indexOf(sysRole) >= 0;
    });

    var breadcrumbLabel = (function () {
      var found = NAV_ITEMS.filter(function (n) { return n.id === state.section; });
      return found.length ? found[0].label : '';
    })();

    function renderSection() {
      if (state.loading) { return h(Spinner, { center: true, large: true, label: 'Loading ' + breadcrumbLabel + '…' }); }
      if (state.error)   {
        return h('div', { style: { padding: '2rem' } },
          h('div', { className: 'oi-error-banner' },
            h(OIIcon, { name: 'error_icon', size: 20 }),
            h('span', null, state.error)
          )
        );
      }

      var d = state.sectionData || {};

      switch (state.section) {
        case 'workspace':           return h(WorkspaceSection,          { data: d.workspace            || {}, onRefresh: refreshSection });
        case 'automations':         return h(AutomationsSection,        { data: d.automations_workspace || {}, onRefresh: refreshSection });
        case 'creator-studio':      return h(CreatorStudioSection,      { data: d.creator_studio        || {}, onRefresh: refreshSection });
        case 'governance-control':  return h(GovernanceControlSection,  { data: d.governance            || {}, onRefresh: refreshSection });
        case 'leadership-insights': return h(LeadershipInsightsSection, { data: d.leadership            || {}, onRefresh: refreshSection });
        case 'developer-hub':       return h(DeveloperHubSection,       { data: d.developer_hub         || {}, onRefresh: refreshSection });
        case 'admin-hub':           return h(AdminHubSection,           { data: d.admin_hub             || {}, onRefresh: refreshSection });
        default:                    return h('div', { style: { padding: '2rem' } }, 'Section not found.');
      }
    }

    var isSplitSection = (state.section === 'workspace' || state.section === 'automations' || state.section === 'creator-studio' || state.section === 'governance-control' || state.section === 'leadership-insights' || state.section === 'developer-hub' || state.section === 'admin-hub');

    var ctxValue = { toast: toast, callServer: callServer, userName: userName, sysRole: sysRole };

    return h(AppContext.Provider, { value: ctxValue },
      h('div', { id: 'oi-root' },
        h('div', { className: 'oi-shell' + (state.mobileOpen ? ' mobile-open' : '') },
          h('div', { className: 'oi-mobile-overlay', onClick: function () { dispatch({ type: 'CLOSE_MOBILE' }); } }),
          h('aside', { className: 'oi-sidebar' },
            h('div', { className: 'oi-brand' },
              h('div', { className: 'oi-brand-icon' }, h(OIIcon, { name: 'workspace', size: 18, fill: '#FFFFFF' })),
              h('div', { className: 'oi-brand-text' }, 'Operations Intelligence')
            ),
            h('nav', { className: 'oi-nav' },
              visibleNav.map(function (nav) {
                return h('button', {
                  key:       nav.id,
                  className: 'oi-nav-item' + (state.section === nav.id ? ' active' : ''),
                  onClick:   function () { if (state.section !== nav.id) { loadSection(nav.id); } else { dispatch({ type: 'CLOSE_MOBILE' }); } }
                },
                  h('span', { className: 'oi-nav-icon' }, h(OIIcon, { name: nav.icon, size: 18 })),
                  h('span', { className: 'oi-nav-label' }, nav.label)
                );
              })
            ),
            h('div', { className: 'oi-sb-footer' },
              h('div', { className: 'oi-user-avatar' }, userInitials),
              h('div', { className: 'oi-user-info' },
                h('div', { className: 'oi-user-name' }, userName),
                h('div', { className: 'oi-user-role' }, userRoleLabel)
              )
            )
          ),
          h('div', { className: 'oi-main' },
            h('header', { className: 'oi-topbar' },
              h('div', { className: 'oi-topbar-left' },
                h('button', { className: 'oi-mobile-btn', onClick: function () { dispatch({ type: 'TOGGLE_MOBILE' }); } }, h(OIIcon, { name: 'menu', size: 22 })),
                h('div', { className: 'oi-breadcrumb' },
                  h('span', { className: 'oi-breadcrumb-root' }, 'Operations Intelligence'),
                  h('span', { className: 'oi-breadcrumb-sep' }, h(OIIcon, { name: 'chevron_right', size: 14 })),
                  h('span', { className: 'oi-breadcrumb-current' }, breadcrumbLabel)
                )
              ),
              h('div', { className: 'oi-topbar-right' },
                state.loading ? h('div', { className: 'oi-topbar-spinner' }, h(Spinner, {})) : null,
                h('button', { className: 'oi-icon-btn', title: 'Refresh', onClick: refreshSection, disabled: state.loading },
                  h(OIIcon, { name: 'refresh', size: 18 })
                )
              )
            ),
            isSplitSection && !state.loading && !state.error
              ? h('div', { style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }, renderSection())
              : h('div', { className: 'oi-content' }, renderSection())
          )
        ),
        h(ToastLayer, { toasts: state.toasts, onDismiss: function (id) { dispatch({ type: 'POP_TOAST', payload: id }); } })
      )
    );
  }

  /* ─── Bootstrap ───────────────────────────────────────────────────────── */
  function mount() {
    var container = document.getElementById('oi-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'oi-root';
      document.body.appendChild(container);
    }
    var root = ReactDOM.createRoot(container);
    root.render(h(App, null));
  }

  window.addEventListener('oi:ready', function (e) {
    _bridge = e.detail;
    mount();
  }, { once: true });

  window.addEventListener('DOMContentLoaded', function () {
    if (!_bridge) {
      var timer = setInterval(function () {
        if (_bridge) { clearInterval(timer); return; }
        mount();
        clearInterval(timer);
      }, 500);
      setTimeout(function () { clearInterval(timer); }, 10000);
    }
  });

})();
