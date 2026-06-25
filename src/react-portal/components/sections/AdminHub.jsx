import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';

var HEALTH_ITEMS = [
  { label: 'Engine Status',        value: 'Online',    status: 'success', prop: 'x_infte_ops_int.engine_key' },
  { label: 'Update Set',           value: 'In Progress', status: 'running', prop: 'Operations Intelligence' },
  { label: 'Service Account',      value: 'Active',    status: 'success', prop: 'svc_operations_intelligence_api' },
  { label: 'Application Scope',    value: 'x_infte_ops_int', status: 'success', prop: '' },
];

var MOCK_CATEGORIES = [
  { id: 'c1', name: 'Incident Management',  items: 3, active: true  },
  { id: 'c2', name: 'Change Management',    items: 3, active: true  },
  { id: 'c3', name: 'Problem Management',   items: 2, active: true  },
  { id: 'c4', name: 'Service Requests',     items: 4, active: true  },
  { id: 'c5', name: 'Asset Management',     items: 2, active: false },
  { id: 'c6', name: 'Knowledge Base',       items: 2, active: true  },
];

var MAINTENANCE_TASKS = [
  { label: 'Rebuild Knowledge Index',   desc: 'Re-index all knowledge articles for search accuracy.',   prop: 'Scheduled — nightly',  active: false },
  { label: 'Execution Log Cleanup',     desc: 'Archive execution logs older than 90 days.',             prop: 'Scheduled — weekly',   active: true  },
  { label: 'Role Recertification',      desc: 'Prompt role owners to review access assignments.',       prop: 'Scheduled — quarterly', active: false },
  { label: 'CMDB Health Check',         desc: 'Run automated discovery reconciliation.',                prop: 'On demand',            active: false },
];

var TABS = ['System Overview', 'Service Catalog', 'Maintenance'];

export default function AdminHub({ data }) {
  var [tab, setTab] = useState(0);
  var categories = (data && data.categories) || MOCK_CATEGORIES;
  var { callServer, toast } = useApp();
  var [running, setRunning] = useState({});

  function runMaintenance(task) {
    if (running[task.label]) return;
    setRunning(function (prev) { var n = Object.assign({}, prev); n[task.label] = true; return n; });
    callServer({ action: 'run_maintenance', task: task.label })
      .then(function () {
        toast(task.label + ' completed.', 'success');
      })
      .catch(function () {
        toast('Task failed. Please try again.', 'error');
      })
      .finally(function () {
        setRunning(function (prev) { var n = Object.assign({}, prev); delete n[task.label]; return n; });
      });
  }

  return (
    <div className="oi-section">
      <div className="oi-toolbar">
        <h1 className="oi-section-title">Administrator Hub</h1>
      </div>

      <div className="oi-card">
        <div className="oi-subtabs">
          {TABS.map(function (t, i) {
            return (
              <button
                key={t}
                className={'oi-subtab' + (tab === i ? ' active' : '')}
                onClick={function () { setTab(i); }}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="oi-subtab-body">
          {tab === 0 && (
            <div className="oi-card-body">
              <div className="oi-info-list">
                {HEALTH_ITEMS.map(function (h) {
                  return (
                    <div key={h.label} className="oi-info-row">
                      <div className="oi-info-label">{h.label}</div>
                      <div className="oi-info-value">
                        <span className={'oi-badge ' + h.status}>{h.value}</span>
                        {h.prop && <span className="oi-td-mono" style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6E6E6E' }}>{h.prop}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 1 && (
            <table className="oi-table">
              <thead>
                <tr><th>Category</th><th>Items</th><th>Active</th><th></th></tr>
              </thead>
              <tbody>
                {categories.map(function (cat) {
                  return (
                    <tr key={cat.id}>
                      <td><span className="oi-td-primary">{cat.name}</span></td>
                      <td>{cat.items}</td>
                      <td>
                        <span className={'oi-badge ' + (cat.active ? 'success' : 'neutral')}>{cat.active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td>
                        <button
                          className="oi-btn ghost xs"
                          onClick={function () { toast('Category editing coming soon.', 'info'); }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 2 && (
            <div className="oi-maintenance-list" style={{ padding: '0 1.5rem' }}>
              {MAINTENANCE_TASKS.map(function (t) {
                return (
                  <div key={t.label} className={'oi-maintenance-item' + (t.active ? ' active' : '')}>
                    <div className="oi-maintenance-info">
                      <div className="oi-maintenance-label">{t.label}</div>
                      <div className="oi-maintenance-desc">{t.desc}</div>
                      <div className="oi-maintenance-prop">{t.prop}</div>
                    </div>
                    <button
                      className="oi-btn ghost sm"
                      disabled={!!running[t.label]}
                      onClick={function () { runMaintenance(t); }}
                    >
                      {running[t.label] ? 'Running...' : 'Run Now'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
