import React, { useState } from 'react';
import { useApp } from '../../context.js';

var INITIAL_CATEGORIES = [
  {
    id: 'knowledge',
    label: 'Knowledge Management',
    color: '#2E6DA4',
    items: [
      { id: 'km1', name: 'Knowledge Base Search',      desc: 'Search the full knowledge base for solutions',       type: 'Flow', status: 'LIVE'    },
      { id: 'km2', name: 'Submit Knowledge Article',   desc: 'Contribute a new knowledge article for review',     type: 'Flow', status: 'LIVE'    },
    ],
  },
  {
    id: 'itsm',
    label: 'ITSM Operations',
    color: '#E57323',
    items: [
      { id: 'it1', name: 'Incident Report',            desc: 'Raise a new incident through the platform',         type: 'Flow', status: 'LIVE'    },
      { id: 'it2', name: 'Password Reset',             desc: 'Self-service reset across identity systems',        type: 'Flow', status: 'LIVE'    },
      { id: 'it3', name: 'Application Access Request', desc: 'Request access to an application or system',       type: 'Flow', status: 'LIVE'    },
    ],
  },
  {
    id: 'itam',
    label: 'ITAM Operations',
    color: '#00897B',
    items: [
      { id: 'ia1', name: 'New Hardware Request',       desc: 'Request a laptop, monitor or peripheral device',   type: 'Flow', status: 'LIVE'    },
      { id: 'ia2', name: 'Software License Request',   desc: 'Request a commercial software licence',           type: 'Flow', status: 'LIVE'    },
      { id: 'ia3', name: 'Asset Decommission',         desc: 'Retire and securely wipe end-of-life assets',     type: 'Flow', status: 'PENDING' },
    ],
  },
];

var MAINTENANCE_TASKS = [
  { label: 'Rebuild Knowledge Index',  desc: 'Re-index all knowledge articles for search accuracy.',     schedule: 'Scheduled — nightly',   active: false },
  { label: 'Execution Log Cleanup',    desc: 'Archive execution logs older than 90 days.',               schedule: 'Scheduled — weekly',    active: true  },
  { label: 'Role Recertification',     desc: 'Prompt role owners to review access assignments.',         schedule: 'Scheduled — quarterly', active: false },
  { label: 'CMDB Health Check',        desc: 'Run automated discovery reconciliation.',                  schedule: 'On demand',             active: false },
];

var HEALTH_ITEMS = [
  { label: 'Engine Status',       value: 'Online',          status: 'success', prop: 'x_infte_ops_int.engine_key'        },
  { label: 'Update Set',          value: 'In Progress',     status: 'running', prop: 'Operations Intelligence'           },
  { label: 'Service Account',     value: 'Active',          status: 'success', prop: 'svc_operations_intelligence_api'   },
  { label: 'Application Scope',   value: 'x_infte_ops_int', status: 'success', prop: ''                                  },
];

var STATUS_CLASS = { LIVE: 'success', PENDING: 'warning' };

var TABS = ['Service Catalog', 'Maintenance Controls', 'System Overview'];

export default function AdminHub({ data }) {
  var [tab, setTab] = useState(0);
  var [categories, setCategories] = useState(INITIAL_CATEGORIES);
  var [newItem, setNewItem] = useState({});
  var [running, setRunning] = useState({});
  var { callServer, toast } = useApp();

  function deleteItem(catId, itemId) {
    setCategories(function (prev) {
      return prev.map(function (cat) {
        if (cat.id !== catId) return cat;
        return Object.assign({}, cat, { items: cat.items.filter(function (i) { return i.id !== itemId; }) });
      });
    });
    toast('Item removed.', 'info');
  }

  function addItem(catId) {
    var form = newItem[catId] || {};
    if (!form.name) return;
    var item = {
      id: catId + '_' + Date.now(),
      name: form.name,
      desc: form.desc || '',
      type: form.type || 'Flow',
      status: 'PENDING',
    };
    setCategories(function (prev) {
      return prev.map(function (cat) {
        if (cat.id !== catId) return cat;
        return Object.assign({}, cat, { items: cat.items.concat(item) });
      });
    });
    setNewItem(function (prev) { var n = Object.assign({}, prev); delete n[catId]; return n; });
    toast('Item added.', 'success');
  }

  function setField(catId, field, val) {
    setNewItem(function (prev) {
      var n = Object.assign({}, prev);
      n[catId] = Object.assign({}, n[catId] || {}, { [field]: val });
      return n;
    });
  }

  function showAddForm(catId) {
    setNewItem(function (prev) {
      var n = Object.assign({}, prev);
      if (!n[catId]) n[catId] = {};
      return n;
    });
  }

  function runMaintenance(task) {
    if (running[task.label]) return;
    setRunning(function (prev) { var n = Object.assign({}, prev); n[task.label] = true; return n; });
    callServer({ action: 'run_maintenance', task: task.label })
      .then(function () { toast(task.label + ' completed.', 'success'); })
      .catch(function () { toast('Task failed. Please try again.', 'error'); })
      .finally(function () {
        setRunning(function (prev) { var n = Object.assign({}, prev); delete n[task.label]; return n; });
      });
  }

  return (
    <div className="oi-section">
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
            <div style={{ padding: '1rem 1.25rem' }}>
              <div className="oi-admin-catalog-topbar">
                <span className="oi-td-muted" style={{ fontSize: '0.875rem' }}>Manage service catalog categories and items</span>
                <button
                  className="oi-btn primary sm"
                  onClick={function () { toast('New category creation coming soon.', 'info'); }}
                >
                  + New Category
                </button>
              </div>

              {categories.map(function (cat) {
                var form = newItem[cat.id];
                return (
                  <div key={cat.id} className="oi-admin-cat-block">
                    <div className="oi-admin-cat-hdr" style={{ color: cat.color }}>
                      <span className="oi-admin-cat-dot" style={{ background: cat.color }} />
                      {cat.label}
                      <button
                        className="oi-admin-add-item-btn"
                        onClick={function () { showAddForm(cat.id); }}
                      >
                        + Item
                      </button>
                      <button
                        className="oi-admin-delete-cat-btn"
                        onClick={function () { toast('Category removal coming soon.', 'info'); }}
                        title="Remove category"
                      >
                        &#128465;
                      </button>
                    </div>

                    <table className="oi-table">
                      <thead>
                        <tr><th>Name</th><th>Description</th><th>Type</th><th>Status</th><th></th></tr>
                      </thead>
                      <tbody>
                        {form !== undefined && (
                          <tr className="oi-admin-new-row">
                            <td>
                              <input
                                className="oi-admin-input"
                                placeholder="New item name..."
                                value={(form && form.name) || ''}
                                onChange={function (e) { setField(cat.id, 'name', e.target.value); }}
                              />
                            </td>
                            <td>
                              <input
                                className="oi-admin-input"
                                placeholder="Description..."
                                value={(form && form.desc) || ''}
                                onChange={function (e) { setField(cat.id, 'desc', e.target.value); }}
                              />
                            </td>
                            <td>
                              <select
                                className="oi-select"
                                value={(form && form.type) || 'Flow'}
                                onChange={function (e) { setField(cat.id, 'type', e.target.value); }}
                              >
                                <option>Flow</option>
                                <option>Script</option>
                                <option>Catalog</option>
                              </select>
                            </td>
                            <td></td>
                            <td>
                              <button
                                className="oi-btn primary sm"
                                onClick={function () { addItem(cat.id); }}
                              >
                                Add
                              </button>
                            </td>
                          </tr>
                        )}
                        {cat.items.map(function (item) {
                          return (
                            <tr key={item.id}>
                              <td><span className="oi-td-primary">{item.name}</span></td>
                              <td className="oi-td-muted">{item.desc}</td>
                              <td>{item.type}</td>
                              <td>
                                <span className={'oi-badge ' + (STATUS_CLASS[item.status] || 'neutral')}>
                                  {item.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="oi-admin-delete-btn"
                                  onClick={function () { deleteItem(cat.id, item.id); }}
                                  title="Remove item"
                                >
                                  &#128465;
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 1 && (
            <div className="oi-maintenance-list" style={{ padding: '0 1.5rem' }}>
              {MAINTENANCE_TASKS.map(function (t) {
                return (
                  <div key={t.label} className={'oi-maintenance-item' + (t.active ? ' active' : '')}>
                    <div className="oi-maintenance-info">
                      <div className="oi-maintenance-label">{t.label}</div>
                      <div className="oi-maintenance-desc">{t.desc}</div>
                      <div className="oi-maintenance-prop">{t.schedule}</div>
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

          {tab === 2 && (
            <div className="oi-card-body">
              <div className="oi-info-list">
                {HEALTH_ITEMS.map(function (h) {
                  return (
                    <div key={h.label} className="oi-info-row">
                      <div className="oi-info-label">{h.label}</div>
                      <div className="oi-info-value">
                        <span className={'oi-badge ' + h.status}>{h.value}</span>
                        {h.prop && (
                          <span className="oi-td-mono" style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6E6E6E' }}>
                            {h.prop}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
