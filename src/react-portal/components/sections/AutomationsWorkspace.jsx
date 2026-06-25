import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';
import { statusClass } from '../../helpers.js';

var MOCK_AUTOMATIONS = [
  { id: 'a1', name: 'Incident Auto-Assignment',     type: 'Business Rule',  last_run: '2 hours ago',  status: 'success', owner: 'Platform Team' },
  { id: 'a2', name: 'SLA Breach Notification',      type: 'Scheduled Job',  last_run: '1 hour ago',   status: 'running', owner: 'ITSM Team' },
  { id: 'a3', name: 'Change Advisory Board Report', type: 'Report',         last_run: 'Yesterday',    status: 'success', owner: 'Change Mgmt' },
  { id: 'a4', name: 'Asset Discovery Sync',         type: 'Integration',    last_run: '30 min ago',   status: 'pending', owner: 'Asset Team' },
  { id: 'a5', name: 'Knowledge Article Expiry',     type: 'Scheduled Job',  last_run: '3 days ago',   status: 'success', owner: 'Knowledge Mgmt' },
  { id: 'a6', name: 'Stale Incident Closure',       type: 'Business Rule',  last_run: '12 hours ago', status: 'failed',  owner: 'Platform Team' },
];

var STATUS_FILTERS = [
  { id: 'all',     label: 'All' },
  { id: 'success', label: 'Healthy' },
  { id: 'running', label: 'Running' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed',  label: 'Failed' },
];

var STATUS_LABELS = {
  success: 'Healthy',
  running: 'Running',
  pending: 'Pending',
  failed:  'Failed',
};

export default function AutomationsWorkspace({ data }) {
  var items = (data && data.automations) || MOCK_AUTOMATIONS;
  var [filter, setFilter]   = useState('all');
  var [search, setSearch]   = useState('');
  var [running, setRunning] = useState({});
  var { callServer, toast } = useApp();

  var visible = items.filter(function (a) {
    var matchStatus = filter === 'all' || a.status === filter;
    var matchSearch = !search || a.name.toLowerCase().indexOf(search.toLowerCase()) >= 0;
    return matchStatus && matchSearch;
  });

  function runAutomation(item) {
    if (running[item.id]) return;
    setRunning(function (prev) { var n = Object.assign({}, prev); n[item.id] = true; return n; });
    callServer({ action: 'trigger_automation', automation_id: item.id, name: item.name })
      .then(function () {
        toast(item.name + ' triggered successfully.', 'success');
      })
      .catch(function () {
        toast('Failed to trigger automation.', 'error');
      })
      .finally(function () {
        setRunning(function (prev) { var n = Object.assign({}, prev); delete n[item.id]; return n; });
      });
  }

  return (
    <div className="oi-section">
      <div className="oi-toolbar">
        <h1 className="oi-section-title">Automations Workspace</h1>
        <div className="oi-toolbar-right">
          <div className="oi-search-wrap">
            <span className="oi-search-icon"><OIIcon name="search" size={15} /></span>
            <input
              className="oi-search-input"
              placeholder="Search automations..."
              value={search}
              onChange={function (e) { setSearch(e.target.value); }}
            />
          </div>
        </div>
      </div>

      <div className="oi-filter-bar">
        {STATUS_FILTERS.map(function (f) {
          return (
            <button
              key={f.id}
              className={'oi-filter-chip' + (filter === f.id ? ' active' : '')}
              onClick={function () { setFilter(f.id); }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="oi-card">
          <div className="oi-empty">
            <div className="oi-empty-icon"><OIIcon name="automations" size={36} fill="#DCDCDC" /></div>
            <div className="oi-empty-title">No automations found</div>
            <div className="oi-empty-sub">Try adjusting your search or filter.</div>
          </div>
        </div>
      ) : (
        <div className="oi-auto-grid">
          {visible.map(function (item) {
            var sc = statusClass(item.status);
            return (
              <div key={item.id} className="oi-auto-card">
                <div className="oi-auto-card-icon">
                  <OIIcon name="automations" size={20} fill="#00BF6F" />
                </div>
                <div className="oi-auto-card-name">{item.name}</div>
                <div className="oi-auto-card-desc">{item.type}</div>
                <div className="oi-auto-card-owner">
                  <OIIcon name="user" size={12} fill="#6E6E6E" />
                  {item.owner}
                </div>
                <div className="oi-auto-card-foot">
                  <span className={'oi-badge ' + sc}>{STATUS_LABELS[item.status] || item.status}</span>
                  <span className="oi-td-muted">{item.last_run}</span>
                  <button
                    className="oi-btn primary sm"
                    disabled={!!running[item.id]}
                    onClick={function () { runAutomation(item); }}
                  >
                    <OIIcon name="play" size={13} fill="#FFFFFF" />
                    {running[item.id] ? 'Running...' : 'Run'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
