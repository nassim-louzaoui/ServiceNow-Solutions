import React, { useState, useRef } from 'react';
import OIIcon from '../../icons.jsx';

// Access Management Configuration. The developer creates roles; each role is either User based or
// Group based. A role tile opens a small dropdown menu with three actions, each opening a single
// sub-window (only one may be open at a time, closed via its own Save/Cancel):
//   Appoint   -> search users/groups on the instance and tag members onto the role.
//   Configure -> all-active toggle, membership type (user/group), and Access Management visibility.
//   Allocate  -> tick the sections/modules of the navigation this role can see and access.
// The whole model is lifted to the parent via onChange. Shape:
//   { roles: [ { id, name, mode:'user'|'group', allActive, mgmtVisible,
//                members:[{sys_id,label}], allocations:[itemId...] } ] }

var auid = 0;
function rid() { auid += 1; return 'role_' + auid + '_' + Date.now(); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

// Flatten the active navigation into the ordered list of allocatable items (sections and modules).
function navItems(nav) {
  var out = [];
  (nav || []).forEach(function (item) {
    if (item.kind === 'section') {
      out.push({ id: item.id, label: item.label, kind: 'section' });
      (item.children || []).forEach(function (m) { out.push({ id: m.id, label: m.label, kind: 'module', parent: item.id }); });
    } else if (item.kind === 'module') {
      out.push({ id: item.id, label: item.label, kind: 'module' });
    }
  });
  return out;
}

// Validation invoked by RefineModal on save.
export function validateAccess(accessModel, nav) {
  var errors = [];
  var roles = (accessModel && accessModel.roles) || [];
  var items = navItems(nav);
  var hasAllActive = roles.some(function (r) { return r.allActive; });

  // 1) Every section/module must be allocated to a role, unless an all-active role exists.
  if (!hasAllActive) {
    var unallocated = items.filter(function (it) {
      return !roles.some(function (r) { return (r.allocations || []).indexOf(it.id) >= 0; });
    });
    if (unallocated.length) {
      errors.push('These items are not allocated to any role: ' +
        unallocated.map(function (it) { return it.label; }).join(', ') + '.');
    }
  }

  // 2) A role allocated to nothing (and not the all-active role) is an error.
  var empty = roles.filter(function (r) { return !r.allActive && (r.allocations || []).length === 0; });
  if (empty.length) {
    errors.push('These roles are not allocated to anything: ' +
      empty.map(function (r) { return r.name; }).join(', ') + '.');
  }

  // 3) At least one role must grant Access Management module visibility.
  if (!roles.some(function (r) { return r.mgmtVisible; })) {
    errors.push('At least one role must grant visibility and access to the Access Management module.');
  }

  return { ok: errors.length === 0, errors: errors };
}

export default function AccessManagement(props) {
  var m0 = useState(props.value && props.value.roles ? clone(props.value) : { roles: [] });
  var model = m0[0], setModel = m0[1];
  var n0 = useState(''); var newName = n0[0], setNewName = n0[1];
  var s0 = useState(null); var selectedId = s0[0], setSelectedId = s0[1];
  var mn0 = useState(null); var menuId = mn0[0], setMenuId = mn0[1];       // role whose action menu is open
  var p0 = useState(null); var panel = p0[0], setPanel = p0[1];           // 'appoint' | 'allocate' | 'configure'
  var pr0 = useState(null); var panelRole = pr0[0], setPanelRole = pr0[1]; // role id the panel belongs to

  // Appoint sub-window state.
  var sq0 = useState(''); var query = sq0[0], setQuery = sq0[1];
  var sr0 = useState([]); var results = sr0[0], setResults = sr0[1];
  var searched0 = useState(false); var searched = searched0[0], setSearched = searched0[1];
  var dm0 = useState([]); var draftMembers = dm0[0], setDraftMembers = dm0[1];
  var seq = useRef(0);

  // Configure sub-window state.
  var cfg0 = useState({ allActive: false, mode: 'user', mgmtVisible: false });
  var cfgDraft = cfg0[0], setCfgDraft = cfg0[1];

  // Allocate sub-window state.
  var al0 = useState([]); var allocDraft = al0[0], setAllocDraft = al0[1];

  var nav = props.nav || [];

  function commit(next) { setModel(next); if (props.onChange) props.onChange(next); }
  function roleById(id) { return model.roles.filter(function (r) { return r.id === id; })[0]; }

  // ---- role CRUD ----
  function createRole() {
    var nm = newName.trim(); if (!nm) return;
    var n = clone(model);
    n.roles.push({ id: rid(), name: nm, mode: 'user', allActive: false, mgmtVisible: false, members: [], allocations: [] });
    setNewName(''); commit(n);
  }
  function deleteRole() {
    if (!selectedId) return;
    var n = clone(model);
    n.roles = n.roles.filter(function (r) { return r.id !== selectedId; });
    commit(n);
    if (menuId === selectedId) setMenuId(null);
    if (panelRole === selectedId) closePanel();
    setSelectedId(null);
  }
  function selectRole(id) {
    setSelectedId(id);
    setMenuId(menuId === id ? null : id); // toggle the action menu for this tile
  }

  // ---- panel open / close ----
  function closePanel() { setPanel(null); setPanelRole(null); }
  function openPanel(type, role) {
    if (panel) return; // one sub-window at a time; blocked until the open one is closed
    if (type === 'appoint') {
      if (role.allActive) return; // appoint disabled when every user is auto-aligned
      setDraftMembers(clone(role.members || []));
      setQuery(''); setResults([]); setSearched(false);
    } else if (type === 'configure') {
      setCfgDraft({ allActive: !!role.allActive, mode: role.mode || 'user', mgmtVisible: !!role.mgmtVisible });
    } else if (type === 'allocate') {
      setAllocDraft(clone(role.allocations || []));
    }
    setPanel(type); setPanelRole(role.id);
  }

  // ---- appoint ----
  function runSearch(q, mode) {
    var text = q.trim();
    if (!text) { setResults([]); setSearched(false); return; }
    seq.current += 1; var mine = seq.current;
    setSearched(true);
    if (!props.callServer) return;
    props.callServer({ action: 'user_search', mode: mode, q: text }).then(function (r) {
      if (mine !== seq.current) return; // ignore stale responses
      var res = (r && r.result) || r || [];
      setResults(res);
    }).catch(function () { if (mine === seq.current) setResults([]); });
  }
  function onQuery(e, mode) {
    var v = e.target.value; setQuery(v); runSearch(v, mode);
  }
  function isTagged(sysId) { return draftMembers.some(function (mm) { return mm.sys_id === sysId; }); }
  function toggleMember(u) {
    if (isTagged(u.sys_id)) setDraftMembers(draftMembers.filter(function (mm) { return mm.sys_id !== u.sys_id; }));
    else setDraftMembers(draftMembers.concat([{ sys_id: u.sys_id, label: u.label }]));
  }
  function saveAppoint(role) {
    var n = clone(model);
    var t = n.roles.filter(function (r) { return r.id === role.id; })[0];
    if (t) t.members = clone(draftMembers);
    commit(n); closePanel();
  }

  // ---- configure ----
  function saveConfigure(role) {
    var n = clone(model);
    n.roles.forEach(function (r) {
      if (r.id === role.id) {
        r.allActive = cfgDraft.allActive; r.mode = cfgDraft.mode; r.mgmtVisible = cfgDraft.mgmtVisible;
      } else if (cfgDraft.allActive) {
        r.allActive = false; // only one all-active role at a time
      }
    });
    commit(n); closePanel();
  }

  // ---- allocate ----
  function allocHas(id) { return allocDraft.indexOf(id) >= 0; }
  function toggleItem(id) {
    if (allocHas(id)) setAllocDraft(allocDraft.filter(function (x) { return x !== id; }));
    else setAllocDraft(allocDraft.concat([id]));
  }
  function toggleSection(section) {
    var childIds = (section.children || []).map(function (c) { return c.id; });
    var ids = [section.id].concat(childIds);
    if (allocHas(section.id)) {
      setAllocDraft(allocDraft.filter(function (x) { return ids.indexOf(x) < 0; }));
    } else {
      var next = allocDraft.slice();
      ids.forEach(function (x) { if (next.indexOf(x) < 0) next.push(x); });
      setAllocDraft(next);
    }
  }
  function saveAllocate(role) {
    var n = clone(model);
    var t = n.roles.filter(function (r) { return r.id === role.id; })[0];
    if (t) t.allocations = allocDraft.slice();
    commit(n); closePanel();
  }

  var anotherAllActive = model.roles.some(function (r) { return r.allActive && r.id !== panelRole; });

  // ---- appoint tile rendering ----
  function renderAppointTiles(role) {
    var text = query.trim();
    if (!text || !searched) {
      // Search cleared: pin the tagged members at the top, stacked vertically.
      if (!draftMembers.length) return <div className="ei-nc-hint small">Search to appoint {role.mode === 'group' ? 'groups' : 'users'}.</div>;
      return draftMembers.map(function (u) {
        return (
          <div key={u.sys_id} className="ei-acc-usertile tagged selected" onClick={function () { toggleMember(u); }}>
            <OIIcon name={role.mode === 'group' ? 'group' : 'user'} size={16} fill="#00895E" />
            <span className="ei-acc-usertile-lbl">{u.label}</span>
            <OIIcon name="check" size={15} fill="#00895E" />
          </div>
        );
      });
    }
    // Active search: tagged results at top, divider, then fresh results below.
    var top = results.filter(function (u) { return isTagged(u.sys_id); });
    var rest = results.filter(function (u) { return !isTagged(u.sys_id); });
    var tiles = [];
    top.forEach(function (u) {
      tiles.push(
        <div key={'t_' + u.sys_id} className="ei-acc-usertile tagged selected" onClick={function () { toggleMember(u); }}>
          <OIIcon name={role.mode === 'group' ? 'group' : 'user'} size={16} fill="#00895E" />
          <span className="ei-acc-usertile-lbl">{u.label}{u.sub ? <em className="ei-acc-usertile-sub">{u.sub}</em> : null}</span>
          <OIIcon name="check" size={15} fill="#00895E" />
        </div>
      );
    });
    if (top.length && rest.length) tiles.push(<div key="div" className="ei-acc-divider" />);
    rest.forEach(function (u) {
      tiles.push(
        <div key={'r_' + u.sys_id} className="ei-acc-usertile" onClick={function () { toggleMember(u); }}>
          <OIIcon name={role.mode === 'group' ? 'group' : 'user'} size={16} fill="#7A8783" />
          <span className="ei-acc-usertile-lbl">{u.label}{u.sub ? <em className="ei-acc-usertile-sub">{u.sub}</em> : null}</span>
        </div>
      );
    });
    if (!tiles.length) return <div className="ei-nc-hint small">No matches.</div>;
    return tiles;
  }

  function renderPanel(role) {
    if (panel === 'appoint') {
      return (
        <div className="ei-acc-sub">
          <div className="ei-acc-sub-title">Appoint {role.mode === 'group' ? 'groups' : 'users'}</div>
          <div className="ei-acc-search">
            <div className="ei-acc-search-bar">
              <OIIcon name="search" size={15} fill="#7A8783" />
              <input className="ei-wiz-input one" placeholder={role.mode === 'group' ? 'Search groups by name' : 'Search users by email or display name'}
                value={query} onChange={function (e) { onQuery(e, role.mode); }} />
            </div>
            <div className="ei-acc-search-list">{renderAppointTiles(role)}</div>
          </div>
          <div className="ei-acc-actions">
            <button className="ei-btn-primary" onClick={function () { saveAppoint(role); }}>Save changes</button>
            <button className="ei-btn-ghost" onClick={closePanel}>Cancel</button>
          </div>
        </div>
      );
    }
    if (panel === 'configure') {
      return (
        <div className="ei-acc-sub">
          <div className="ei-acc-sub-title">Configure role</div>
          <div className="ei-acc-form">
            <label className={'ei-cfg-row' + (anotherAllActive ? ' disabled' : '')}>
              <input type="checkbox" checked={cfgDraft.allActive} disabled={anotherAllActive}
                onChange={function () { setCfgDraft({ allActive: !cfgDraft.allActive, mode: cfgDraft.mode, mgmtVisible: cfgDraft.mgmtVisible }); }} />
              All active users of the instance are automatically aligned to this role.
            </label>
            <div className="ei-acc-form-group">
              <div className="ei-cfg-title">Membership type</div>
              <label className="ei-cfg-row">
                <input type="radio" name={'mt_' + role.id} checked={cfgDraft.mode === 'user'}
                  onChange={function () { setCfgDraft({ allActive: cfgDraft.allActive, mode: 'user', mgmtVisible: cfgDraft.mgmtVisible }); }} />
                User based
              </label>
              <label className="ei-cfg-row">
                <input type="radio" name={'mt_' + role.id} checked={cfgDraft.mode === 'group'}
                  onChange={function () { setCfgDraft({ allActive: cfgDraft.allActive, mode: 'group', mgmtVisible: cfgDraft.mgmtVisible }); }} />
                Group based
              </label>
            </div>
            <label className="ei-cfg-row">
              <input type="checkbox" checked={cfgDraft.mgmtVisible}
                onChange={function () { setCfgDraft({ allActive: cfgDraft.allActive, mode: cfgDraft.mode, mgmtVisible: !cfgDraft.mgmtVisible }); }} />
              This role grants visibility and access to the Access Management module.
            </label>
          </div>
          <div className="ei-acc-actions">
            <button className="ei-btn-primary" onClick={function () { saveConfigure(role); }}>Save changes</button>
            <button className="ei-btn-ghost" onClick={closePanel}>Cancel</button>
          </div>
        </div>
      );
    }
    if (panel === 'allocate') {
      return (
        <div className="ei-acc-sub">
          <div className="ei-acc-sub-title">Allocate navigation</div>
          <div className="ei-acc-alloc">
            {nav.length === 0 ? <div className="ei-nc-hint small">There is no navigation to allocate.</div> : null}
            {nav.map(function (item) {
              if (item.kind === 'section') {
                return (
                  <div key={item.id} className="ei-acc-alloc-section">
                    <label className="ei-cfg-row">
                      <input type="checkbox" checked={allocHas(item.id)} onChange={function () { toggleSection(item); }} />
                      <strong>{item.label}</strong>
                    </label>
                    <div className="ei-acc-alloc-children">
                      {(item.children || []).map(function (mm) {
                        return (
                          <label key={mm.id} className="ei-cfg-row">
                            <input type="checkbox" checked={allocHas(mm.id)} onChange={function () { toggleItem(mm.id); }} />
                            {mm.icon ? <OIIcon name={mm.icon} size={14} fill="#00895E" /> : null}
                            {mm.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <label key={item.id} className="ei-cfg-row">
                  <input type="checkbox" checked={allocHas(item.id)} onChange={function () { toggleItem(item.id); }} />
                  {item.icon ? <OIIcon name={item.icon} size={14} fill="#00895E" /> : null}
                  {item.label}
                </label>
              );
            })}
          </div>
          <div className="ei-acc-actions">
            <button className="ei-btn-primary" onClick={function () { saveAllocate(role); }}>Save changes</button>
            <button className="ei-btn-ghost" onClick={closePanel}>Cancel</button>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="ei-acc">
      <div className="ei-cfg-title">Access Management Configuration</div>

      <div className="ei-acc-toolbar">
        <input className="ei-wiz-input one" placeholder="Role name" value={newName}
          onChange={function (e) { setNewName(e.target.value); }}
          onKeyDown={function (e) { if (e.key === 'Enter') createRole(); }} />
        <button className="ei-btn-primary" onClick={createRole}>Create role</button>
        {selectedId ? <button className="ei-btn-ghost" onClick={deleteRole}>Delete role</button> : null}
      </div>

      <div className="ei-acc-roles">
        {model.roles.length === 0 ? <div className="ei-nc-hint">Create a role to grant access against the navigation.</div> : null}
        {model.roles.map(function (role) {
          var otherAllActive = model.roles.some(function (r) { return r.allActive && r.id !== role.id; });
          return (
            <div key={role.id} className={'ei-acc-role' + (selectedId === role.id ? ' selected' : '')}
              onClick={function () { selectRole(role.id); }}>
              <OIIcon name={role.mode === 'group' ? 'group' : 'user'} size={16} fill={selectedId === role.id ? '#00895E' : '#7A8783'} />
              <span className="ei-acc-role-nm">{role.name}</span>
              <span className="ei-acc-role-meta">
                {role.allActive ? <span className="ei-badge success">All users</span> : null}
                {role.mgmtVisible ? <OIIcon name="lock" size={13} fill="#00895E" /> : null}
                {!role.allActive && (role.members || []).length ? <em>{role.members.length} appointed</em> : null}
                {(role.allocations || []).length ? <em>{role.allocations.length} allocated</em> : null}
              </span>

              {menuId === role.id ? (
                <div className="ei-acc-menu" onClick={function (e) { e.stopPropagation(); }}>
                  <button className="ei-acc-menu-opt" disabled={!!panel || role.allActive}
                    onClick={function () { openPanel('appoint', role); }}>Appoint</button>
                  <button className="ei-acc-menu-opt" disabled={!!panel}
                    onClick={function () { openPanel('allocate', role); }}>Allocate</button>
                  <button className={'ei-acc-menu-opt' + (otherAllActive ? ' faded' : '')} disabled={!!panel}
                    onClick={function () { openPanel('configure', role); }}>Configure</button>
                </div>
              ) : null}

              {panel && panelRole === role.id ? (
                <div onClick={function (e) { e.stopPropagation(); }}>{renderPanel(role)}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
