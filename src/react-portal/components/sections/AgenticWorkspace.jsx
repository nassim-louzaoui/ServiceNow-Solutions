import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';
import { statusClass } from '../../helpers.js';

var WORKSPACES = [
  { id: 'cmdb',     name: 'CMDB Intelligence',      desc: 'AI-powered configuration item analysis and relationship mapping.', icon: 'document',    active: true  },
  { id: 'serviceops', name: 'Service Operations',   desc: 'Autonomous incident triage, routing, and resolution assistance.', icon: 'ops_workspace', active: true },
  { id: 'change',   name: 'Change Intelligence',    desc: 'Risk assessment and collision detection for change requests.',    icon: 'refresh',     active: false },
  { id: 'capacity', name: 'Capacity Planning',      desc: 'Predictive analysis for resource and infrastructure planning.',   icon: 'insights',    active: false },
];

var MOCK_TASKS = [
  { id: 't1', name: 'Triage INC0123456 — Database Timeout',      workspace: 'Service Operations', status: 'running', agent: 'Operations Assistant', updated: '3 min ago' },
  { id: 't2', name: 'Map CI relationships for Production DB',     workspace: 'CMDB Intelligence',  status: 'success', agent: 'CMDB Agent',           updated: '1 hour ago' },
  { id: 't3', name: 'Identify root cause for CHG0045678',        workspace: 'Change Intelligence', status: 'pending', agent: 'Change Agent',         updated: '12 min ago' },
  { id: 't4', name: 'Summarise SLA breaches — last 30 days',     workspace: 'Service Operations', status: 'success', agent: 'Operations Assistant', updated: '2 hours ago' },
  { id: 't5', name: 'Capacity forecast — Q3 Infrastructure',     workspace: 'Capacity Planning',  status: 'pending', agent: 'Capacity Agent',       updated: '30 min ago' },
];

var STATUS_LABELS = { success: 'Completed', running: 'In Progress', pending: 'Queued', failed: 'Failed' };

export default function AgenticWorkspace({ data }) {
  var tasks = (data && data.tasks) || MOCK_TASKS;
  var { callServer, toast } = useApp();
  var [activating, setActivating] = useState(null);

  function activate(ws) {
    if (ws.active || activating) return;
    setActivating(ws.id);
    callServer({ action: 'activate_workspace', workspace: ws.id })
      .then(function () {
        toast(ws.name + ' activated.', 'success');
      })
      .catch(function () {
        toast('Activation failed. Please try again.', 'error');
      })
      .finally(function () { setActivating(null); });
  }

  return (
    <div className="oi-section">
      <div className="oi-toolbar">
        <h1 className="oi-section-title">Agentic Workspace</h1>
      </div>

      <div className="oi-agentic-grid">
        {WORKSPACES.map(function (ws) {
          return (
            <div key={ws.id} className={'oi-agentic-card' + (ws.active ? ' active' : '')}>
              <div className="oi-agentic-card-hdr">
                <div className="oi-agentic-card-icon">
                  <OIIcon name={ws.icon} size={18} fill={ws.active ? '#FFFFFF' : '#00BF6F'} />
                </div>
                {ws.active && <span className="oi-badge success">Active</span>}
              </div>
              <div className="oi-agentic-card-name">{ws.name}</div>
              <div className="oi-agentic-card-desc">{ws.desc}</div>
              {!ws.active && (
                <button
                  className="oi-btn ghost sm"
                  disabled={activating === ws.id}
                  onClick={function () { activate(ws); }}
                >
                  {activating === ws.id ? 'Activating...' : 'Activate'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="oi-card">
        <div className="oi-card-hdr">
          <span className="oi-card-title">Agentic Task Activity</span>
        </div>
        <table className="oi-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Workspace</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(function (t) {
              var sc = statusClass(t.status);
              return (
                <tr key={t.id}>
                  <td><span className="oi-td-primary">{t.name}</span></td>
                  <td>{t.workspace}</td>
                  <td>{t.agent}</td>
                  <td>
                    <span className={'oi-badge ' + sc}>
                      <span className={'oi-dot ' + sc} />
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td className="oi-td-muted">{t.updated}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
