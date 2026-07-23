import React from 'react';

// The six solution layouts, each rendered as the ACTUAL shell with labelled regions:
//   sidebar_left  : vertical Navigation on the left, Header across the top, Content fills the rest.
//   sidebar_right : same but the Navigation is on the right.
//   top_bar       : one full width bar at the top that IS the Navigation and Header; Content below.
//   bottom_bar    : that combined bar at the bottom; Content above.
//   left_bar      : that combined bar as a vertical rail on the left; Content to the right.
//   right_bar     : that combined bar as a vertical rail on the right; Content to the left.
export var LAYOUTS = [
  { id: 'sidebar_left', name: 'Sidebar left' },
  { id: 'sidebar_right', name: 'Sidebar right' },
  { id: 'top_bar', name: 'Top bar' },
  { id: 'bottom_bar', name: 'Bottom bar' },
  { id: 'left_bar', name: 'Left bar' },
  { id: 'right_bar', name: 'Right bar' }
];

function Nav(props) { return <div className={'ei-lf-nav ' + (props.vertical ? 'v' : 'h')}><span>Navigation</span></div>; }
function Header() { return <div className="ei-lf-header"><span>Header</span></div>; }
function Bar(props) { return <div className={'ei-lf-bar ' + (props.vertical ? 'v' : 'h')}><span>Navigation and Header</span></div>; }
function Content() { return <div className="ei-lf-content"><span>Content Area</span></div>; }

export default function LayoutFrame(props) {
  var id = props.layout || 'sidebar_left';
  if (id === 'sidebar_left') {
    return <div className="ei-lf row"><Nav vertical /><div className="ei-lf col"><Header /><Content /></div></div>;
  }
  if (id === 'sidebar_right') {
    return <div className="ei-lf row"><div className="ei-lf col"><Header /><Content /></div><Nav vertical /></div>;
  }
  if (id === 'top_bar') {
    return <div className="ei-lf col"><Bar /><Content /></div>;
  }
  if (id === 'bottom_bar') {
    return <div className="ei-lf col"><Content /><Bar /></div>;
  }
  if (id === 'left_bar') {
    return <div className="ei-lf row"><Bar vertical /><Content /></div>;
  }
  if (id === 'right_bar') {
    return <div className="ei-lf row"><Content /><Bar vertical /></div>;
  }
  return <div className="ei-lf row"><Nav vertical /><div className="ei-lf col"><Header /><Content /></div></div>;
}
