import React from 'react';
import OIIcon from '../../icons.jsx';

// The six solution layouts, each rendered as the ACTUAL shell. When `general` and `nav` are supplied
// (from the Refine preview) the shell reflects the live configuration: navigation items with their
// icons and optional labels + alignment, and the header profile / help icons.
//   sidebar_left / sidebar_right : vertical Navigation + top Header + Content.
//   top_bar / bottom_bar         : one full-width bar that IS Navigation+Header; Content adjacent.
//   left_bar / right_bar         : that combined bar as a vertical rail; Content adjacent.
export var LAYOUTS = [
  { id: 'sidebar_left', name: 'Sidebar left' },
  { id: 'sidebar_right', name: 'Sidebar right' },
  { id: 'top_bar', name: 'Top bar' },
  { id: 'bottom_bar', name: 'Bottom bar' },
  { id: 'left_bar', name: 'Left bar' },
  { id: 'right_bar', name: 'Right bar' }
];

function flatten(nav) {
  var out = [];
  (nav || []).forEach(function (it) {
    if (it.kind === 'section') { out.push({ section: true, label: it.label }); (it.children || []).forEach(function (m) { out.push({ label: m.label, icon: m.icon }); }); }
    else out.push({ label: it.label, icon: it.icon });
  });
  return out;
}

function Items(props) {
  var items = flatten(props.nav);
  if (!items.length) return <span className="ei-lf-ph">Navigation</span>;
  var withLabel = props.labels, align = props.align || 'under';
  return (
    <div className={'ei-lf-items ' + (props.vertical ? 'v' : 'h') + (withLabel ? ' lbl align-' + align : ' icononly')}>
      {items.map(function (it, i) {
        if (it.section) return <div key={i} className="ei-lf-sec">{it.label}</div>;
        return (
          <div key={i} className="ei-lf-item" title={it.label}>
            <span className="ei-lf-ic"><OIIcon name={it.icon || 'ops_workspace'} size={14} fill="#CFE8DE" /></span>
            {withLabel ? <span className="ei-lf-lb">{it.label}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function HeaderBar(props) {
  var g = props.general || {};
  return (
    <div className="ei-lf-header">
      <span className="ei-lf-brand">{props.brand || 'Solution'}</span>
      <span className="ei-lf-hr">
        {g.helpIcon !== false ? <OIIcon name="ops_int" size={13} fill="#CFE8DE" /> : null}
        {g.profileIcon !== false ? <span className="ei-lf-prof">U</span> : null}
      </span>
    </div>
  );
}

export default function LayoutFrame(props) {
  var id = props.layout || 'sidebar_left';
  var g = props.general || {};
  var nav = props.nav;
  var configured = !!props.general;
  var barLabels = g.barLabels !== false;      // header-as-nav layouts
  var navLabels = g.navLabels !== false, navAlign = g.navAlign || 'under';

  function Nav(p) {
    if (!configured) return <div className={'ei-lf-nav ' + (p.vertical ? 'v' : 'h')}><span>Navigation</span></div>;
    return <div className={'ei-lf-nav ' + (p.vertical ? 'v' : 'h')}><Items nav={nav} vertical={p.vertical} labels={navLabels} align={navAlign} /></div>;
  }
  function Bar(p) {
    if (!configured) return <div className={'ei-lf-bar ' + (p.vertical ? 'v' : 'h')}><span>Navigation and Header</span></div>;
    return <div className={'ei-lf-bar ' + (p.vertical ? 'v' : 'h')}>
      <span className="ei-lf-brand sm">{props.brand || 'Solution'}</span>
      <Items nav={nav} vertical={p.vertical} labels={barLabels} align="under" />
    </div>;
  }
  function Header() { return configured ? <HeaderBar general={g} brand={props.brand} /> : <div className="ei-lf-header"><span>Header</span></div>; }
  function Content() { return <div className="ei-lf-content"><span>Content Area</span></div>; }

  if (id === 'sidebar_left') return <div className="ei-lf row"><Nav vertical /><div className="ei-lf col"><Header /><Content /></div></div>;
  if (id === 'sidebar_right') return <div className="ei-lf row"><div className="ei-lf col"><Header /><Content /></div><Nav vertical /></div>;
  if (id === 'top_bar') return <div className="ei-lf col"><Bar /><Content /></div>;
  if (id === 'bottom_bar') return <div className="ei-lf col"><Content /><Bar /></div>;
  if (id === 'left_bar') return <div className="ei-lf row"><Bar vertical /><Content /></div>;
  if (id === 'right_bar') return <div className="ei-lf row"><Content /><Bar vertical /></div>;
  return <div className="ei-lf row"><Nav vertical /><div className="ei-lf col"><Header /><Content /></div></div>;
}
