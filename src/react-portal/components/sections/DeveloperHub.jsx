import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';

var TABS = [
  { id: 'tables',    label: 'Tables'          },
  { id: 'scripts',   label: 'Script Includes' },
  { id: 'rules',     label: 'Business Rules'  },
  { id: 'properties', label: 'Properties'     },
  { id: 'jobs',      label: 'Scheduled Jobs'  },
  { id: 'roles',     label: 'Roles'           },
];

var MOCK_DATA = {
  tables: [
    { name: 'x_infte_ops_int_automation',  label: 'Automation',           count: 12, scope: 'x_infte_ops_int' },
    { name: 'x_infte_ops_int_initiative',  label: 'Initiative',           count: 5,  scope: 'x_infte_ops_int' },
    { name: 'x_infte_ops_int_execution',   label: 'Execution Log',        count: 287, scope: 'x_infte_ops_int' },
    { name: 'x_infte_ops_int_agent_task',  label: 'Agent Task',           count: 43, scope: 'x_infte_ops_int' },
  ],
  scripts: [
    { name: 'Operations Intelligence Engine',  type: 'Script Include',  scope: 'x_infte_ops_int', updated: '2 days ago' },
    { name: 'Execution Log Handler',            type: 'Script Include',  scope: 'x_infte_ops_int', updated: '1 week ago' },
    { name: 'Automation Trigger Utility',       type: 'Script Include',  scope: 'x_infte_ops_int', updated: '3 days ago' },
  ],
  rules: [
    { name: 'Auto-Assign Incident on Insert',   table: 'incident',         when: 'before insert',  active: true  },
    { name: 'Log Execution on State Change',    table: 'x_infte_ops_int_execution', when: 'after update', active: true },
    { name: 'Validate Automation Name',         table: 'x_infte_ops_int_automation', when: 'before insert', active: false },
  ],
  properties: [
    { name: 'x_infte_ops_int.engine_key',     value: '••••••••••••',   desc: 'Engine API authentication key' },
    { name: 'x_infte_ops_int.svc_password',   value: '••••••••••••',   desc: 'Service account password' },
    { name: 'x_infte_ops_int.default_module', value: 'workspace',      desc: 'Default portal module' },
  ],
  jobs: [
    { name: 'SLA Breach Scanner',        schedule: 'Every 15 minutes', active: true,  last_run: '8 min ago' },
    { name: 'Knowledge Article Expiry',  schedule: 'Daily at 01:00',   active: true,  last_run: 'Yesterday' },
    { name: 'Execution Log Cleanup',     schedule: 'Weekly',           active: false, last_run: '2 weeks ago' },
  ],
  roles: [
    { name: 'x_infte_ops_int.leadership',    desc: 'Leadership access for executive insights' },
    { name: 'x_infte_ops_int.administrator', desc: 'Full administrator access' },
    { name: 'x_infte_ops_int.developer',     desc: 'Developer access to artifact management' },
    { name: 'x_infte_ops_int.creator',       desc: 'Creator access for building automations' },
  ],
};

export default function DeveloperHub({ data }) {
  var [tab, setTab] = useState('tables');
  var items = MOCK_DATA[tab] || [];

  return (
    <div className="oi-section">
      <div className="oi-toolbar">
        <h1 className="oi-section-title">Developer Hub</h1>
        <div className="oi-toolbar-right">
          <div className="oi-app-badge">
            <OIIcon name="developer" size={14} fill="#00BF6F" />
            <span>Scope: x_infte_ops_int</span>
          </div>
        </div>
      </div>

      <div className="oi-card">
        <div className="oi-subtabs">
          {TABS.map(function (t) {
            return (
              <button
                key={t.id}
                className={'oi-subtab' + (tab === t.id ? ' active' : '')}
                onClick={function () { setTab(t.id); }}
              >
                {t.label}
                <span className="oi-subtab-count">{MOCK_DATA[t.id] ? MOCK_DATA[t.id].length : 0}</span>
              </button>
            );
          })}
        </div>

        <div className="oi-subtab-body">
          {tab === 'tables' && (
            <table className="oi-table">
              <thead><tr><th>Table Name</th><th>Label</th><th>Records</th><th>Scope</th></tr></thead>
              <tbody>
                {items.map(function (r) {
                  return (
                    <tr key={r.name}>
                      <td><span className="oi-td-mono">{r.name}</span></td>
                      <td><span className="oi-td-primary">{r.label}</span></td>
                      <td>{r.count.toLocaleString()}</td>
                      <td><span className="oi-tag">{r.scope}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'scripts' && (
            <table className="oi-table">
              <thead><tr><th>Name</th><th>Type</th><th>Scope</th><th>Updated</th></tr></thead>
              <tbody>
                {items.map(function (r) {
                  return (
                    <tr key={r.name}>
                      <td><span className="oi-td-primary">{r.name}</span></td>
                      <td>{r.type}</td>
                      <td><span className="oi-tag">{r.scope}</span></td>
                      <td className="oi-td-muted">{r.updated}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'rules' && (
            <table className="oi-table">
              <thead><tr><th>Name</th><th>Table</th><th>When</th><th>Active</th></tr></thead>
              <tbody>
                {items.map(function (r) {
                  return (
                    <tr key={r.name}>
                      <td><span className="oi-td-primary">{r.name}</span></td>
                      <td className="oi-td-mono">{r.table}</td>
                      <td>{r.when}</td>
                      <td>
                        <span className={'oi-badge ' + (r.active ? 'success' : 'neutral')}>{r.active ? 'Active' : 'Inactive'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'properties' && (
            <table className="oi-table">
              <thead><tr><th>Property</th><th>Value</th><th>Description</th></tr></thead>
              <tbody>
                {items.map(function (r) {
                  return (
                    <tr key={r.name}>
                      <td><span className="oi-td-mono">{r.name}</span></td>
                      <td><span className="oi-td-mono" style={{ color: '#6E6E6E' }}>{r.value}</span></td>
                      <td className="oi-td-muted">{r.desc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'jobs' && (
            <table className="oi-table">
              <thead><tr><th>Name</th><th>Schedule</th><th>Last Run</th><th>Status</th></tr></thead>
              <tbody>
                {items.map(function (r) {
                  return (
                    <tr key={r.name}>
                      <td><span className="oi-td-primary">{r.name}</span></td>
                      <td>{r.schedule}</td>
                      <td className="oi-td-muted">{r.last_run}</td>
                      <td>
                        <span className={'oi-badge ' + (r.active ? 'success' : 'neutral')}>{r.active ? 'Active' : 'Inactive'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'roles' && (
            <table className="oi-table">
              <thead><tr><th>Role Name</th><th>Description</th></tr></thead>
              <tbody>
                {items.map(function (r) {
                  return (
                    <tr key={r.name}>
                      <td><span className="oi-td-mono">{r.name}</span></td>
                      <td className="oi-td-muted">{r.desc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
