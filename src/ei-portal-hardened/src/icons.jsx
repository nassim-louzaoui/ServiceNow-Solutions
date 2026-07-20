// Inline stroke icons. Each renders at 100% of its wrapper (.ei-nav-ico), whose size is
// set in vh to exactly match the adjacent label text height. currentColor throughout,
// so an icon always takes the colour of its context. No external icon fonts or sprites.
import React from 'react';

function Svg(props) {
  return React.createElement('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': 'true', focusable: 'false'
  }, props.children);
}
var P = function (d) { return React.createElement('path', { d: d }); };

export var Icon = {
  assistant: function () { return React.createElement(Svg, null, P('M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z')); },
  solutions: function () { return React.createElement(Svg, null, P('M3 3h7v7H3z'), P('M14 3h7v7h-7z'), P('M14 14h7v7h-7z'), P('M3 14h7v7H3z')); },
  models: function () { return React.createElement(Svg, null, P('M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3'), React.createElement('rect', { x: 5, y: 5, width: 14, height: 14, rx: 2 }), React.createElement('rect', { x: 9, y: 9, width: 6, height: 6, rx: 1 })); },
  governance: function () { return React.createElement(Svg, null, P('M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z')); },
  build: function () { return React.createElement(Svg, null, P('M12 5v14M5 12h14')); },
  maintain: function () { return React.createElement(Svg, null, P('M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.1-.5-.5-2.1 2.6-2.6z')); },
  bridge: function () { return React.createElement(Svg, null, P('M4 7v10M20 7v10M4 12h16M8 12v5M16 12v5M2 7h6M16 7h6')); },
  send: function () { return React.createElement(Svg, null, P('M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z')); },
  bell: function () { return React.createElement(Svg, null, P('M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0')); },
  search: function () { return React.createElement(Svg, null, React.createElement('circle', { cx: 11, cy: 11, r: 8 }), P('M21 21l-4.3-4.3')); },
  portal: function () { return React.createElement(Svg, null, P('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3')); }
};
