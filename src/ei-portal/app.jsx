// Enterprise Intelligence portal — hardened embedded-React app.
// Three-column house-style shell; first nav tab "Assistant" = Service Catalog
// (category Enterprise Solutions, three catalog items) + Enterprise Assistant chat.
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ---- inline icons (height controlled by CSS, always = adjacent label height) ----
function Ico(p) {
  var paths = {
    assistant: 'M12 3a7 7 0 0 0-7 7v1.6A3 3 0 0 0 4 14v1a3 3 0 0 0 3 3h1v-6H7v-1a5 5 0 0 1 10 0v1h-1v6h1a3 3 0 0 0 3-3v-1a3 3 0 0 0-1-2.4V10a7 7 0 0 0-7-7z',
    insights: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
    solutions: 'M4 7l8-4 8 4-8 4-8-4zm0 5l8 4 8-4M4 17l8 4 8-4',
    diagnostic: 'M3 12h4l2 6 4-12 2 6h6',
    newsol: 'M12 5v14M5 12h14',
    maintain: 'M14 6l4 4-8 8H6v-4l8-8zM13 7l4 4',
    bridge: 'M4 12a4 4 0 0 1 8 0 4 4 0 0 0 8 0M4 12v5m16-5v5M4 12H2m20 0h-2',
    send: 'M4 12l16-8-6 8 6 8-16-8z',
    spark: 'M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4L12 3z'
  };
  var d = paths[p.n] || '';
  var multi = d.indexOf('M') !== d.lastIndexOf('M') && p.n !== 'assistant' && p.n !== 'solutions' && p.n !== 'bridge';
  return React.createElement('svg', { className: p.c || 'ei-ico', viewBox: '0 0 24 24', fill: p.fill || 'none',
    stroke: p.fill ? 'none' : 'currentColor', strokeWidth: p.fill ? 0 : 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('path', { d: d }));
}

var NAV = [
  { id: 'assistant', label: 'Assistant', icon: 'assistant' },
  { id: 'insights', label: 'Insights', icon: 'insights' },
  { id: 'solutions', label: 'Solutions', icon: 'solutions' },
  { id: 'diagnostic', label: 'Diagnostic', icon: 'diagnostic' }
];

var CATALOG = [
  { id: 'new_solution_development', title: 'New Solution Development', icon: 'newsol',
    desc: 'Design and build a new web application. The Enterprise Assistant gathers your requirements, shows live layout previews, and the models build it into Enterprise Solutions.' },
  { id: 'existing_solution_maintenance', title: 'Existing Solution Maintenance', icon: 'maintain',
    desc: 'Adjust an existing web application. Pick the application, then define changes to its modules, content, data, or layout.' },
  { id: 'module_bridge_maintenance', title: 'Module Bridge Maintenance', icon: 'bridge',
    desc: 'Inspect and tune an application bridge. Review the capabilities, methods, and integrations in scope, and adjust them under least privilege.' }
];

function Sidebar(p) {
  return React.createElement('div', { className: 'ei-side' },
    React.createElement('div', { className: 'ei-brand' },
      React.createElement('div', { className: 'ei-brand-mark' }, 'E'),
      React.createElement('span', null, 'Enterprise Intelligence')),
    React.createElement('div', { className: 'ei-nav' },
      NAV.map(function (n) {
        return React.createElement('div', {
          key: n.id, className: 'ei-nav-item' + (p.active === n.id ? ' on' : ''),
          onClick: function () { p.onNav(n.id); }
        }, React.createElement(Ico, { n: n.icon }), React.createElement('span', null, n.label));
      })),
    React.createElement('div', { className: 'ei-side-foot' },
      React.createElement('div', { className: 'ei-avatar' }, p.initials || 'U'),
      React.createElement('span', null, p.userName || 'User')));
}

function Header(p) {
  return React.createElement('div', { className: 'ei-head' },
    React.createElement('div', { className: 'ei-crumb' }, p.title),
    React.createElement('div', { className: 'ei-head-right' },
      React.createElement('div', { className: 'ei-avatar' }, p.initials || 'U')));
}

function CatalogPanel(p) {
  return React.createElement('div', { className: 'ei-panel' },
    React.createElement('div', { className: 'ei-panel-h' }, 'Service Catalog',
      React.createElement('span', { className: 'ei-panel-sub' }, 'Request a solution')),
    React.createElement('div', { className: 'ei-cat' },
      React.createElement('div', { className: 'ei-cat-group' }, 'Enterprise Solutions'),
      CATALOG.map(function (c) {
        return React.createElement('div', { key: c.id, className: 'ei-card', onClick: function () { p.onPick(c); } },
          React.createElement('div', { className: 'ei-card-ico' }, React.createElement(Ico, { n: c.icon })),
          React.createElement('div', null,
            React.createElement('div', { className: 'ei-card-t' }, c.title),
            React.createElement('div', { className: 'ei-card-d' }, c.desc)));
      })));
}

function ChatPanel(p) {
  var msgs = p.messages, busy = p.busy;
  var scrollRef = useRef(null);
  useEffect(function () { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; } }, [msgs, busy]);
  var body;
  if (!msgs.length && !busy) {
    body = React.createElement('div', { className: 'ei-welcome' },
      React.createElement('div', { className: 'ei-welcome-mark' }, React.createElement(Ico, { n: 'spark' })),
      React.createElement('div', { className: 'ei-welcome-t' }, 'Enterprise Assistant'),
      React.createElement('div', null, 'Ask anything, or select a catalog item to begin.'));
  } else {
    body = msgs.map(function (m, i) {
      return React.createElement('div', { key: i, className: 'ei-msg ' + m.role }, m.text);
    });
  }
  return React.createElement('div', { className: 'ei-panel ei-chat' },
    React.createElement('div', { className: 'ei-panel-h' }, 'Enterprise Assistant',
      React.createElement('span', { className: 'ei-panel-sub' }, 'Intelligent guidance')),
    React.createElement('div', { className: 'ei-chat-scroll', ref: scrollRef },
      body,
      busy ? React.createElement('div', { className: 'ei-typing' },
        React.createElement('span'), React.createElement('span'), React.createElement('span')) : null),
    React.createElement('div', { className: 'ei-chat-in' },
      React.createElement('input', {
        className: 'ei-chat-field', placeholder: 'Ask anything...', value: p.draft,
        onChange: function (e) { p.onDraft(e.target.value); },
        onKeyDown: function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); p.onSend(); } }, disabled: busy
      }),
      React.createElement('div', { className: 'ei-send', onClick: p.onSend }, React.createElement(Ico, { n: 'send', fill: true }))));
}

export default function App(p) {
  var bridge = p.bridge;
  var init = (p.init) || {};
  var [active, setActive] = useState('assistant');
  var [messages, setMessages] = useState([]);
  var [draft, setDraft] = useState('');
  var [busy, setBusy] = useState(false);

  var send = useCallback(function (preset) {
    var text = (typeof preset === 'string' ? preset : draft).trim();
    if (!text || busy) { return; }
    setMessages(function (m) { return m.concat([{ role: 'user', text: text }]); });
    setDraft(''); setBusy(true);
    var done = function (reply) {
      setMessages(function (m) { return m.concat([{ role: 'asst', text: reply }]); });
      setBusy(false);
    };
    if (!bridge || !bridge.call) { done('The assistant service is not connected yet.'); return; }
    bridge.call({ action: 'assistant_query', query: text }).then(function (r) {
      var d = r && r.data !== undefined ? r.data : r;
      done((d && (d.reply || d.message)) || 'I have received your request and am processing it.');
    }).catch(function () { done('The assistant is temporarily unavailable. Please try again.'); });
  }, [draft, busy, bridge]);

  var pick = useCallback(function (c) {
    send('I would like to start: ' + c.title + '.');
  }, [send]);

  var content;
  if (active === 'assistant') {
    content = React.createElement('div', { className: 'ei-assist' },
      React.createElement(CatalogPanel, { onPick: pick }),
      React.createElement(ChatPanel, { messages: messages, busy: busy, draft: draft, onDraft: setDraft, onSend: send }));
  } else {
    var lbl = (NAV.filter(function (n) { return n.id === active; })[0] || {}).label;
    content = React.createElement('div', { className: 'ei-stub' }, lbl + ' is coming soon.');
  }

  return React.createElement('div', { className: 'ei-shell' },
    React.createElement(Sidebar, { active: active, onNav: setActive, userName: init.userName, initials: init.initials }),
    React.createElement('div', { className: 'ei-main' },
      React.createElement(Header, { title: (NAV.filter(function (n) { return n.id === active; })[0] || {}).label, initials: init.initials }),
      React.createElement('div', { className: 'ei-body' }, content)));
}
