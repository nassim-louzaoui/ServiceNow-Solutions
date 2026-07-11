import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';
import { useApp } from '../../context.js';
import Badge from '../Badge.jsx';
import { statusClass, relTime } from '../../helpers.js';

export default function StudioSection(props) {
  var data = props.data || {};
  var ctx = useApp();
  var automations = data.automations || [];

  var [showCreate, setShowCreate] = useState(false);
  var [selected, setSelected] = useState(null);
  var [runBusy, setRunBusy] = useState({});
  var [form, setForm] = useState({ name: '', description: '', script: '', group_sys_id: '' });
  var [saving, setSaving] = useState(false);

  var groups = data.groups || [];

  function handleCreate() {
    if (!form.name.trim()) {
      ctx.toast('Name is required.', 'error');
      return;
    }
    setSaving(true);
    ctx.callServer({
      action: 'create_automation',
      name: form.name.trim(),
      description: form.description.trim(),
      script: form.script.trim(),
      group_sys_id: form.group_sys_id,
    }).then(function (res) {
      setSaving(false);
      var d = res && res.data ? res.data : res;
      ctx.toast((d && d.message) || 'Automation created.', 'success');
      setShowCreate(false);
      setForm({ name: '', description: '', script: '', group_sys_id: '' });
      ctx.loadSection('studio');
    }).catch(function (err) {
      setSaving(false);
      ctx.toast((err && err.message) || 'Creation failed.', 'error');
    });
  }

  function handleRun(automation) {
    var sysId = automation.sys_id;
    setRunBusy(function (prev) { var n = Object.assign({}, prev); n[sysId] = true; return n; });
    ctx.callServer({ action: 'trigger_automation', automation_sys_id: sysId }).then(function (res) {
      setRunBusy(function (prev) { var n = Object.assign({}, prev); n[sysId] = false; return n; });
      var d = res && res.data ? res.data : res;
      ctx.toast((d && d.message) || 'Automation triggered.', 'success');
    }).catch(function (err) {
      setRunBusy(function (prev) { var n = Object.assign({}, prev); n[sysId] = false; return n; });
      ctx.toast((err && err.message) || 'Trigger failed.', 'error');
    });
  }

  return (
    <div className="oi-section">
      <div className="oi-section-header">
        <div>
          <h1 className="oi-section-title">Operations Studio</h1>
          <p className="oi-section-subtitle">Create and manage your automated operations.</p>
        </div>
        <button className="oi-btn primary" onClick={function () { setShowCreate(true); }}>
          <OIIcon name="plus" size={16} />
          New Automation
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="oi-empty">
          <OIIcon name="studio" size={40} />
          <div className="oi-empty-title">No automations yet</div>
          <div className="oi-empty-desc">Create your first automation to get started.</div>
          <button className="oi-btn primary" style={{ marginTop: '1rem' }} onClick={function () { setShowCreate(true); }}>
            Create Automation
          </button>
        </div>
      ) : (
        <div className="oi-card">
          <table className="oi-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Group</th>
                <th>Status</th>
                <th>Last Run</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {automations.map(function (auto) {
                return (
                  <tr key={auto.sys_id || auto.name} onClick={function () { setSelected(auto); }} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="oi-table-cell-primary">{auto.name}</div>
                      {auto.description && <div className="oi-table-cell-sub">{auto.description}</div>}
                    </td>
                    <td>{auto.group_name || '—'}</td>
                    <td><Badge cls={statusClass(auto.status)}>{auto.status || 'Active'}</Badge></td>
                    <td>{auto.last_run ? relTime(auto.last_run) : '—'}</td>
                    <td onClick={function (e) { e.stopPropagation(); }}>
                      <button
                        className="oi-btn primary xs"
                        disabled={!!runBusy[auto.sys_id]}
                        onClick={function () { handleRun(auto); }}
                      >
                        {runBusy[auto.sys_id] ? <div className="oi-spinner sm" /> : <OIIcon name="play" size={14} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="oi-modal-overlay" onClick={function () { setSelected(null); }}>
          <div className="oi-modal" onClick={function (e) { e.stopPropagation(); }}>
            <div className="oi-modal-header">
              <div className="oi-modal-title">{selected.name}</div>
              <button className="oi-modal-close" onClick={function () { setSelected(null); }}>
                <OIIcon name="close" size={18} />
              </button>
            </div>
            <div className="oi-modal-body">
              <div className="oi-detail-rows">
                {selected.description && (
                  <div className="oi-detail-row">
                    <span className="oi-detail-label">Description</span>
                    <span className="oi-detail-value">{selected.description}</span>
                  </div>
                )}
                <div className="oi-detail-row">
                  <span className="oi-detail-label">Group</span>
                  <span className="oi-detail-value">{selected.group_name || '—'}</span>
                </div>
                <div className="oi-detail-row">
                  <span className="oi-detail-label">Status</span>
                  <Badge cls={statusClass(selected.status)}>{selected.status || 'Active'}</Badge>
                </div>
                {selected.last_run && (
                  <div className="oi-detail-row">
                    <span className="oi-detail-label">Last Run</span>
                    <span className="oi-detail-value">{relTime(selected.last_run)}</span>
                  </div>
                )}
              </div>
              {selected.script && (
                <div className="oi-detail-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                  <span className="oi-detail-label">Script</span>
                  <pre className="oi-code-block">{selected.script}</pre>
                </div>
              )}
            </div>
            <div className="oi-modal-footer">
              <button className="oi-btn ghost" onClick={function () { setSelected(null); }}>Close</button>
              <button
                className="oi-btn primary"
                disabled={!!runBusy[selected.sys_id]}
                onClick={function () { handleRun(selected); setSelected(null); }}
              >
                Run Now
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="oi-modal-overlay" onClick={function () { setShowCreate(false); }}>
          <div className="oi-modal" onClick={function (e) { e.stopPropagation(); }}>
            <div className="oi-modal-header">
              <div className="oi-modal-title">New Automation</div>
              <button className="oi-modal-close" onClick={function () { setShowCreate(false); }}>
                <OIIcon name="close" size={18} />
              </button>
            </div>
            <div className="oi-modal-body">
              <div className="oi-form-row">
                <label className="oi-label">Name <span className="oi-required">*</span></label>
                <input
                  className="oi-input"
                  type="text"
                  placeholder="Automation name"
                  value={form.name}
                  onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { name: e.target.value }); }); }}
                />
              </div>
              <div className="oi-form-row">
                <label className="oi-label">Description</label>
                <input
                  className="oi-input"
                  type="text"
                  placeholder="Brief description"
                  value={form.description}
                  onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { description: e.target.value }); }); }}
                />
              </div>
              {groups.length > 0 && (
                <div className="oi-form-row">
                  <label className="oi-label">Group</label>
                  <select
                    className="oi-input"
                    value={form.group_sys_id}
                    onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { group_sys_id: e.target.value }); }); }}
                  >
                    <option value="">— Select a group —</option>
                    {groups.map(function (g) {
                      return <option key={g.sys_id} value={g.sys_id}>{g.name}</option>;
                    })}
                  </select>
                </div>
              )}
              <div className="oi-form-row">
                <label className="oi-label">Script</label>
                <textarea
                  className="oi-input"
                  rows={6}
                  placeholder="// JavaScript"
                  style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                  value={form.script}
                  onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { script: e.target.value }); }); }}
                />
              </div>
            </div>
            <div className="oi-modal-footer">
              <button className="oi-btn ghost" onClick={function () { setShowCreate(false); }}>Cancel</button>
              <button className="oi-btn primary" disabled={saving || !form.name.trim()} onClick={handleCreate}>
                {saving ? <div className="oi-spinner sm" /> : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
