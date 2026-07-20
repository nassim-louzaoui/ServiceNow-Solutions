// Enterprise Intelligence — application shell (React owns the entire subtree after mount).
// No window globals: everything runs inside the mount closure. The data bridge is passed in.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from './icons.jsx';

// Navigation model. The Assistant tab is the primary surface (Service Catalog + chat).
var NAV = [
  { id: 'assistant', label: 'Assistant', icon: 'assistant', title: 'Enterprise Assistant', sub: 'Develop and maintain solutions through one conversation.' },
  { id: 'solutions', label: 'Solutions', icon: 'solutions', title: 'Solutions', sub: 'Every solution built and deployed by the factory.' },
  { id: 'models', label: 'Models', icon: 'models', title: 'Intelligence Models', sub: 'The models that power development, integration, and technology reasoning.' },
  { id: 'governance', label: 'Governance', icon: 'governance', title: 'Governance', sub: 'Authorization, validation, and the durable audit of every action.' }
];

// The Enterprise Solutions catalog. Three closed loop items.
var CATALOG = [
  { id: 'new', icon: 'build', title: 'New Solution Development',
    desc: 'Design and build a new scoped solution from a plain description, with its own house style and security bridge.' },
  { id: 'maintain', icon: 'maintain', title: 'Existing Solution Maintenance',
    desc: 'Extend, correct, and harden a solution already in production, with impact analysis before every change.' },
  { id: 'bridge', icon: 'bridge', title: 'Module Bridge Maintenance',
    desc: 'Tune the secure bridge that connects a solution back to the intelligence core, capability by capability.' }
];

function NavIcon(props) {
  return React.createElement('span', { className: 'ei-nav-ico' }, Icon[props.name]());
}

function Sidebar(props) {
  return React.createElement('nav', { className: 'ei-side' },
    React.createElement('div', { className: 'ei-brand' },
      React.createElement('div', { className: 'ei-brand-mark' }, 'E'),
      React.createElement('div', { className: 'ei-brand-txt' }, 'Enterprise Intelligence')
    ),
    React.createElement('div', { className: 'ei-nav' },
      NAV.map(function (n) {
        return React.createElement('div', {
          key: n.id,
          className: 'ei-nav-item' + (props.active === n.id ? ' on' : ''),
          onClick: function () { props.onNav(n.id); }
        }, React.createElement(NavIcon, { name: n.icon }), React.createElement('span', null, n.label));
      })
    ),
    React.createElement('div', { className: 'ei-side-foot' },
      React.createElement('div', { className: 'ei-portal-btn' },
        React.createElement(NavIcon, { name: 'portal' }),
        React.createElement('span', null, 'Open Service Portal')
      ),
      React.createElement('div', { className: 'ei-user' },
        React.createElement('div', { className: 'ei-avatar' }, props.initials || 'U'),
        React.createElement('div', { className: 'ei-user-meta' },
          React.createElement('div', { className: 'ei-user-name' }, props.userName || 'User'),
          React.createElement('div', { className: 'ei-user-role' }, 'Signed in')
        )
      )
    )
  );
}

function Header(props) {
  return React.createElement('header', { className: 'ei-head' },
    React.createElement('div', { className: 'ei-crumb' },
      React.createElement('div', { className: 'ei-crumb-t' }, props.title),
      React.createElement('div', { className: 'ei-crumb-s' }, props.sub)
    ),
    React.createElement('div', { className: 'ei-head-r' },
      React.createElement('div', { className: 'ei-icon-btn', title: 'Search' }, React.createElement(NavIcon, { name: 'search' })),
      React.createElement('div', { className: 'ei-icon-btn', title: 'Notifications' }, React.createElement(NavIcon, { name: 'bell' }))
    )
  );
}

function Catalog(props) {
  return React.createElement('section', { className: 'ei-panel' },
    React.createElement('div', { className: 'ei-panel-h' },
      React.createElement('div', { className: 'ei-panel-t' },
        React.createElement(NavIcon, { name: 'solutions' }),
        React.createElement('span', null, 'Service Catalog')
      ),
      React.createElement('div', { className: 'ei-panel-s' }, 'Enterprise Solutions')
    ),
    React.createElement('div', { className: 'ei-cat' },
      React.createElement('div', { className: 'ei-cat-grp' }, 'Enterprise Solutions'),
      CATALOG.map(function (c) {
        return React.createElement('div', {
          key: c.id, className: 'ei-card', onClick: function () { props.onPick(c); }
        },
          React.createElement('div', { className: 'ei-card-ico' }, React.createElement(NavIcon, { name: c.icon })),
          React.createElement('div', { className: 'ei-card-b' },
            React.createElement('div', { className: 'ei-card-t' }, c.title),
            React.createElement('div', { className: 'ei-card-d' }, c.desc)
          )
        );
      })
    )
  );
}

function Chat(props) {
  var msgs = props.msgs, busy = props.busy;
  var scroller = useRef(null);
  var field = useRef(null);
  var draft = useState('')[0];
  var setDraft = useState('')[1];
  var value = useState('');
  var text = value[0], setText = value[1];

  useEffect(function () {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs.length, busy]);

  var submit = useCallback(function () {
    var t = (text || '').trim();
    if (!t || busy) return;
    setText('');
    if (field.current) field.current.style.height = 'auto';
    props.onSend(t);
  }, [text, busy, props]);

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }
  function onInput(e) {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, window.innerHeight * 0.14) + 'px';
  }

  var body;
  if (!msgs.length) {
    body = React.createElement('div', { className: 'ei-welcome' },
      React.createElement('div', { className: 'ei-welcome-mark' }, React.createElement(NavIcon, { name: 'assistant' })),
      React.createElement('div', { className: 'ei-welcome-t' }, 'How can I help you build today?'),
      React.createElement('div', { className: 'ei-welcome-d' },
        'Describe a solution to develop, a change to make, or a bridge to tune.\nOr select a catalog item to begin a guided flow.')
    );
  } else {
    body = msgs.map(function (m, i) {
      return React.createElement('div', { key: i, className: 'ei-msg ' + m.role }, m.text);
    });
    if (busy) {
      body = body.concat([React.createElement('div', { key: 'typing', className: 'ei-typing' },
        React.createElement('i', null), React.createElement('i', null), React.createElement('i', null))]);
    }
  }

  return React.createElement('section', { className: 'ei-panel' },
    React.createElement('div', { className: 'ei-panel-h' },
      React.createElement('div', { className: 'ei-panel-t' },
        React.createElement(NavIcon, { name: 'assistant' }),
        React.createElement('span', null, 'Enterprise Assistant')
      ),
      React.createElement('div', { className: 'ei-panel-s' }, 'One voice across every model')
    ),
    React.createElement('div', { className: 'ei-chat' },
      React.createElement('div', { className: 'ei-chat-scroll', ref: scroller }, body),
      React.createElement('div', { className: 'ei-chat-in' },
        React.createElement('textarea', {
          className: 'ei-field', ref: field, rows: 1, value: text,
          placeholder: 'Message the Enterprise Assistant',
          onChange: onInput, onKeyDown: onKey
        }),
        React.createElement('div', { className: 'ei-send', onClick: submit, title: 'Send' },
          React.createElement(NavIcon, { name: 'send' }))
      )
    )
  );
}

function AssistantView(props) {
  return React.createElement('div', { className: 'ei-assist' },
    React.createElement(Catalog, { onPick: props.onPick }),
    React.createElement(Chat, { msgs: props.msgs, busy: props.busy, onSend: props.onSend })
  );
}

function SectionView(props) {
  return React.createElement('div', { className: 'ei-sec' },
    React.createElement('div', { className: 'ei-sec-main' },
      React.createElement('div', { className: 'ei-sec-t' }, props.nav.title),
      React.createElement('div', { className: 'ei-sec-d' }, props.nav.sub),
      React.createElement('div', { className: 'ei-stat-row' },
        React.createElement('div', { className: 'ei-stat' },
          React.createElement('div', { className: 'ei-stat-v' }, props.stat ? props.stat.a : '4'),
          React.createElement('div', { className: 'ei-stat-l' }, props.stat ? props.stat.al : 'Models')),
        React.createElement('div', { className: 'ei-stat' },
          React.createElement('div', { className: 'ei-stat-v' }, props.stat ? props.stat.b : '910'),
          React.createElement('div', { className: 'ei-stat-l' }, props.stat ? props.stat.bl : 'Script Includes'))
      )
    ),
    React.createElement('div', { className: 'ei-panel' },
      React.createElement('div', { className: 'ei-panel-h' },
        React.createElement('div', { className: 'ei-panel-t' },
          React.createElement(NavIcon, { name: 'assistant' }),
          React.createElement('span', null, 'Assistant')),
        React.createElement('div', { className: 'ei-panel-s' }, 'Ask about this section')),
      React.createElement(Chat, { msgs: props.msgs, busy: props.busy, onSend: props.onSend })
    )
  );
}

export function App(props) {
  var bridge = props.bridge;
  var init = props.init || {};
  var navState = useState('assistant');
  var active = navState[0], setActive = navState[1];
  var msgState = useState([]);
  var msgs = msgState[0], setMsgs = msgState[1];
  var busyState = useState(false);
  var busy = busyState[0], setBusy = busyState[1];

  var send = useCallback(function (text) {
    setMsgs(function (prev) { return prev.concat([{ role: 'user', text: text }]); });
    setBusy(true);
    var done = function (reply) {
      setBusy(false);
      setMsgs(function (prev) { return prev.concat([{ role: 'asst', text: reply }]); });
    };
    if (bridge && bridge.call) {
      bridge.call({ action: 'assistant_query', text: text }).then(function (d) {
        done((d && d.reply) ? d.reply : 'I did not receive a response. Please try again.');
      })['catch'](function () { done('The Assistant is not reachable right now. Please try again.'); });
    } else {
      done('The Assistant is not connected in this preview.');
    }
  }, [bridge]);

  var pick = useCallback(function (item) {
    setActive('assistant');
    var intro = 'You selected ' + item.title + '.\n' + item.desc + '\nTell me what you have in mind and we will begin.';
    setMsgs(function (prev) { return prev.concat([{ role: 'asst', text: intro }]); });
  }, []);

  var nav = NAV.filter(function (n) { return n.id === active; })[0] || NAV[0];

  var view;
  if (active === 'assistant') {
    view = React.createElement(AssistantView, { msgs: msgs, busy: busy, onSend: send, onPick: pick });
  } else {
    view = React.createElement(SectionView, { nav: nav, msgs: msgs, busy: busy, onSend: send });
  }

  return React.createElement('div', { className: 'ei-shell' },
    React.createElement(Sidebar, { active: active, onNav: setActive, userName: init.userName, initials: init.initials }),
    React.createElement('div', { className: 'ei-main' },
      React.createElement(Header, { title: nav.title, sub: nav.sub }),
      React.createElement('div', { className: 'ei-body' }, view)
    )
  );
}
