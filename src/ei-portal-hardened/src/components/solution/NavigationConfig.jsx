import React, { useState } from 'react';
import OIIcon, { ICON_NAMES } from '../../icons.jsx';

// Navigation Configuration. The user creates Section and Module artifacts with the toolbar; they
// appear (inactive) in the Section and Module containers. Dragging an artifact into the Navigation
// Layout container makes it active navigation: a module can sit standalone, or be dropped inside a
// section (which looks like a collapsible compact container). Only items in the Navigation Layout
// become the solution's real navigation. Each module has an icon frame that opens a monochrome icon
// picker. State shape (lifted to the parent via onChange):
//   { pool: { sections:[{id,label}], modules:[{id,label,icon}] },
//     nav: [ {kind:'module', id,label,icon} | {kind:'section', id,label,open, children:[module...]} ] }

var uid = 0;
function nid(p) { uid += 1; return p + '_' + uid; }

export default function NavigationConfig(props) {
  var v0 = useState(props.value || { pool: { sections: [], modules: [] }, nav: [] });
  var st = v0[0], setSt = v0[1];
  var d0 = useState(null); var drag = d0[0], setDrag = d0[1]; // {from:'pool-module'|'pool-section'|'nav', id, parent}
  var ip0 = useState(null); var iconFor = ip0[0], setIconFor = ip0[1]; // module id whose icon picker is open
  var mk0 = useState(''); var makeName = mk0[0], setMakeName = mk0[1];
  var mkt0 = useState('module'); var makeKind = mkt0[0], setMakeKind = mkt0[1];

  function commit(next) { setSt(next); if (props.onChange) props.onChange(next); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function createArtifact() {
    if (!makeName.trim()) return;
    var n = clone(st);
    if (makeKind === 'section') n.pool.sections.push({ id: nid('sec'), label: makeName.trim() });
    else n.pool.modules.push({ id: nid('mod'), label: makeName.trim(), icon: '' });
    setMakeName(''); commit(n);
  }

  // ---- drag helpers ----
  function onDragStart(from, id, parent) { return function (e) { setDrag({ from: from, id: id, parent: parent }); try { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; } catch (x) {} }; }
  function allow(e) { e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch (x) {} }

  // remove an item from wherever it is, return the item object
  function extract(n, d) {
    if (d.from === 'pool-module') { var i = n.pool.modules.findIndex(function (m) { return m.id === d.id; }); if (i < 0) return null; return n.pool.modules.splice(i, 1)[0]; }
    if (d.from === 'pool-section') { var j = n.pool.sections.findIndex(function (s) { return s.id === d.id; }); if (j < 0) return null; var s = n.pool.sections.splice(j, 1)[0]; s.kind = 'section'; s.open = true; s.children = []; return s; }
    if (d.from === 'nav') {
      if (d.parent) { var sec = n.nav.find(function (x) { return x.kind === 'section' && x.id === d.parent; }); if (!sec) return null; var k = sec.children.findIndex(function (m) { return m.id === d.id; }); if (k < 0) return null; return sec.children.splice(k, 1)[0]; }
      var t = n.nav.findIndex(function (x) { return x.id === d.id; }); if (t < 0) return null; return n.nav.splice(t, 1)[0];
    }
    return null;
  }

  function dropOnNav(e) {
    e.preventDefault(); if (!drag) return; var n = clone(st); var item = extract(n, drag);
    if (!item) { setDrag(null); return; }
    if (drag.from === 'pool-module' || (drag.from === 'nav' && !item.kind)) n.nav.push({ kind: 'module', id: item.id, label: item.label, icon: item.icon });
    else if (item.kind === 'section') n.nav.push(item);
    commit(n); setDrag(null);
  }
  function dropOnSection(secId) {
    return function (e) {
      e.preventDefault(); e.stopPropagation(); if (!drag) return; var n = clone(st); var item = extract(n, drag);
      if (!item || item.kind === 'section') { commit(n); setDrag(null); return; }
      var sec = n.nav.find(function (x) { return x.kind === 'section' && x.id === secId; });
      if (sec) sec.children.push({ id: item.id, label: item.label, icon: item.icon });
      commit(n); setDrag(null);
    };
  }
  function dropOnPool(kind) {
    return function (e) {
      e.preventDefault(); if (!drag || drag.from === ('pool-' + kind)) { setDrag(null); return; } var n = clone(st); var item = extract(n, drag);
      if (!item) { setDrag(null); return; }
      if (kind === 'module' && !item.kind) n.pool.modules.push({ id: item.id, label: item.label, icon: item.icon });
      if (kind === 'section' && item.kind === 'section') n.pool.sections.push({ id: item.id, label: item.label });
      commit(n); setDrag(null);
    };
  }
  function toggleSection(id) { var n = clone(st); var s = n.nav.find(function (x) { return x.kind === 'section' && x.id === id; }); if (s) s.open = !s.open; commit(n); }
  function setIcon(modId, icon) {
    var n = clone(st);
    n.nav.forEach(function (x) {
      if (x.kind === 'module' && x.id === modId) x.icon = icon;
      if (x.kind === 'section') x.children.forEach(function (m) { if (m.id === modId) m.icon = icon; });
    });
    n.pool.modules.forEach(function (m) { if (m.id === modId) m.icon = icon; });
    commit(n); setIconFor(null);
  }

  function ModuleTile(props2) {
    var m = props2.m;
    return (
      <div className="ei-nc-mod" draggable onDragStart={onDragStart(props2.from, m.id, props2.parent)}>
        <button className="ei-nc-mod-icon" title="Choose an icon" onClick={function (e) { e.stopPropagation(); setIconFor(iconFor === m.id ? null : m.id); }}>
          {m.icon ? <OIIcon name={m.icon} size={15} fill="#00895E" /> : <OIIcon name="plus" size={13} fill="#9AA6A2" />}
        </button>
        <span className="ei-nc-mod-nm">{m.label}</span>
        {iconFor === m.id ? (
          <div className="ei-icon-picker" onClick={function (e) { e.stopPropagation(); }}>
            {ICON_NAMES.map(function (nm) { return <button key={nm} className="ei-icon-opt" title={nm} onClick={function () { setIcon(m.id, nm); }}><OIIcon name={nm} size={16} fill="#334" /></button>; })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ei-nc">
      <div className="ei-nc-toolbar">
        <select className="ei-cfg-select" value={makeKind} onChange={function (e) { setMakeKind(e.target.value); }}>
          <option value="module">Module</option>
          <option value="section">Section</option>
        </select>
        <input className="ei-wiz-input one" placeholder={makeKind === 'section' ? 'Section label' : 'Module label'} value={makeName}
          onChange={function (e) { setMakeName(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') createArtifact(); }} />
        <button className="ei-btn-primary" onClick={createArtifact}>Create</button>
      </div>
      <div className="ei-nc-cols">
        <div className="ei-nc-col wide">
          <div className="ei-nc-col-label">Navigation Layout</div>
          <div className="ei-nc-drop layout" onDragOver={allow} onDrop={dropOnNav}>
            {st.nav.length === 0 ? <div className="ei-nc-hint">Drag sections and modules here to build the navigation.</div> : null}
            {st.nav.map(function (item) {
              if (item.kind === 'section') {
                return (
                  <div key={item.id} className="ei-nc-section" onDragOver={allow} onDrop={dropOnSection(item.id)} draggable onDragStart={onDragStart('nav', item.id, null)}>
                    <div className="ei-nc-section-hd" onClick={function () { toggleSection(item.id); }}>
                      <OIIcon name={item.open ? 'chevron_down' : 'chevron_right'} size={14} fill="#CFE8DE" />
                      <span>{item.label}</span>
                    </div>
                    {item.open ? (
                      <div className="ei-nc-section-body">
                        {item.children.length === 0 ? <div className="ei-nc-hint small">Drop modules here.</div>
                          : item.children.map(function (m) { return <ModuleTile key={m.id} m={m} from="nav" parent={item.id} />; })}
                      </div>
                    ) : null}
                  </div>
                );
              }
              return <ModuleTile key={item.id} m={item} from="nav" parent={null} />;
            })}
          </div>
        </div>
        <div className="ei-nc-side">
          <div className="ei-nc-col">
            <div className="ei-nc-col-label">Sections</div>
            <div className="ei-nc-drop pool" onDragOver={allow} onDrop={dropOnPool('section')}>
              {st.pool.sections.length === 0 ? <div className="ei-nc-hint small">Created sections appear here.</div>
                : st.pool.sections.map(function (s) { return <div key={s.id} className="ei-nc-sectile" draggable onDragStart={onDragStart('pool-section', s.id, null)}><span>{s.label}</span></div>; })}
            </div>
          </div>
          <div className="ei-nc-col">
            <div className="ei-nc-col-label">Modules</div>
            <div className="ei-nc-drop pool" onDragOver={allow} onDrop={dropOnPool('module')}>
              {st.pool.modules.length === 0 ? <div className="ei-nc-hint small">Created modules appear here.</div>
                : st.pool.modules.map(function (m) { return <ModuleTile key={m.id} m={m} from="pool-module" parent={null} />; })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
