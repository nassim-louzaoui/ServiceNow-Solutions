import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';
import Modal from './Modal.jsx';

// General Configuration section of the Refine modal. Every change here is reflected live in the
// Layout Preview tab. Layouts 3,4,5,6 use the header AS the navigation bar (labels sit under the
// icon, centred); layouts 1,2 have a separate header and navigation bar, each with its own label
// setting, and the navigation bar additionally chooses label alignment (under / right / left).

var HEADER_AS_NAV = { top_bar: 1, bottom_bar: 1, left_bar: 1, right_bar: 1 };

export function defaultGeneral() {
  return {
    profileIcon: true, helpIcon: true, helpHtml: '',
    headerLabels: false,            // layouts 1,2: labels in the header
    navLabels: true,                // navigation-bar labels
    navAlign: 'under',              // under | right | left  (when navLabels)
    barLabels: true,                // layouts 3-6: labels under the header-as-nav icons
    accessManagement: false
  };
}

export default function GeneralConfig(props) {
  var g = props.value || defaultGeneral();
  var layout = props.layout || 'sidebar_left';
  var headerNav = !!HEADER_AS_NAV[layout];
  var m0 = useState(null); var modal = m0[0], setModal = m0[1];

  function set(k, v) { var n = {}; for (var x in g) n[x] = g[x]; n[k] = v; props.onChange(n); }
  function toggle(k) { set(k, !g[k]); }

  function downloadHelp() {
    var html = g.helpHtml || '<!doctype html>\n<html><head><meta charset="utf-8"><title>Solution Help</title></head>\n<body>\n  <h1>Solution Help</h1>\n  <p>Describe how to use this solution here.</p>\n</body></html>';
    try {
      var blob = new Blob([html], { type: 'text/html' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Help.html';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) {}
  }
  function uploadHelp(e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { set('helpHtml', '' + r.result); }; r.readAsText(f);
  }

  return (
    <section className="ei-cfg-sec">
      <div className="ei-cfg-title">General Configuration</div>

      <label className="ei-cfg-row"><input type="checkbox" checked={g.profileIcon} onChange={function () { toggle('profileIcon'); }} />
        <span>Show a profile icon. When clicked it reveals the signed-in user's display name in a dropdown.</span></label>

      <label className="ei-cfg-row"><input type="checkbox" checked={g.helpIcon} onChange={function () { toggle('helpIcon'); }} />
        <span>Show a help icon. When clicked it opens the solution help page (Help.html).</span></label>
      {g.helpIcon ? (
        <div className="ei-cfg-inset">
          <button className="ei-btn-ghost" onClick={downloadHelp}><OIIcon name="document" size={14} fill="currentColor" />Download Help.html template</button>
          <label className="ei-btn-ghost ei-upload"><OIIcon name="plus" size={14} fill="currentColor" />Upload Help.html
            <input type="file" accept=".html,text/html" onChange={uploadHelp} style={{ display: 'none' }} /></label>
          {g.helpHtml ? <button className="ei-btn-ghost" onClick={function () { setModal('help'); }}><OIIcon name="ops_int" size={14} fill="currentColor" />Preview</button> : null}
        </div>
      ) : null}

      {headerNav ? (
        <div className="ei-cfg-group">
          <div className="ei-cfg-sub-title">Navigation bar labels</div>
          <label className="ei-cfg-row"><input type="checkbox" checked={g.barLabels} onChange={function () { toggle('barLabels'); }} />
            <span>Show a label under each navigation icon (otherwise icons only). Labels are centred under the icon.</span></label>
        </div>
      ) : (
        <div className="ei-cfg-group">
          <div className="ei-cfg-sub-title">Header</div>
          <label className="ei-cfg-row"><input type="checkbox" checked={g.headerLabels} onChange={function () { toggle('headerLabels'); }} />
            <span>Show labels next to the header icons (otherwise icons only).</span></label>
          <div className="ei-cfg-sub-title">Navigation bar</div>
          <label className="ei-cfg-row"><input type="checkbox" checked={g.navLabels} onChange={function () { toggle('navLabels'); }} />
            <span>Show labels for the navigation icons (otherwise icons only).</span></label>
          {g.navLabels ? (
            <div className="ei-cfg-inset">
              <span className="ei-cfg-note">Label alignment</span>
              {['under', 'right', 'left'].map(function (a) {
                return (
                  <label key={a} className="ei-cfg-radio"><input type="radio" name="navAlign" checked={g.navAlign === a}
                    onChange={function () { set('navAlign', a); }} />
                    <span>{a === 'under' ? 'Under the icon (thin bar)' : a === 'right' ? 'Icon left, label right (thick bar)' : 'Icon right, label left (thick bar)'}</span></label>
                );
              })}
            </div>
          ) : null}
        </div>
      )}

      <label className="ei-cfg-row"><input type="checkbox" checked={g.accessManagement} onChange={function () { toggle('accessManagement'); }} />
        <span>Enable access management. Roles control which sections and modules each user or group can see and access.</span></label>

      {modal === 'help' ? (
        <Modal title="Help preview" size="wide" onClose={function () { setModal(null); }}>
          <iframe title="help" style={{ width: '100%', height: '55vh', border: '1px solid #D8E2DE', borderRadius: 8, background: '#fff' }}
            srcDoc={g.helpHtml} />
        </Modal>
      ) : null}
    </section>
  );
}
