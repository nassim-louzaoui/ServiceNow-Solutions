import React from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';

var WORKSPACES = [
  {
    id: 'cmdb',
    name: 'CMDB Workspace',
    desc: 'Configuration Management Database — explore CIs, impact relationships and availability metrics across the full infrastructure inventory.',
    status: 'ONLINE',
    stat: '14,832 CIs',
    icon: 'developer',
  },
  {
    id: 'svc_ops',
    name: 'Service Operations Workspace',
    desc: 'Monitor service health, manage incidents and coordinate operational response — real-time alerting with contextual assignment guidance.',
    status: 'ONLINE',
    stat: '3 open P1s',
    icon: 'ops_workspace',
  },
];

var ACTIVITY = [
  { workspace: 'Service Operations', event: 'INC0012847 — P1 resolved',           impact: 'SAP Production', status: 'resolved',  time: '4 min ago'  },
  { workspace: 'CMDB Workspace',     event: 'CI relationship mapped — 12 nodes',  impact: 'Network tier',   status: 'complete',  time: '22 min ago' },
  { workspace: 'Service Operations', event: 'Alert triggered — disk threshold',    impact: 'DB Cluster A',   status: 'warning',   time: '1h 10m ago' },
];

var STATUS_LABELS = { resolved: 'RESOLVED', complete: 'COMPLETE', warning: 'WARNING' };
var STATUS_CLASS  = { resolved: 'success',  complete: 'running',  warning: 'warning'  };

export default function AgenticWorkspace({ data }) {
  var { toast } = useApp();

  return (
    <div className="oi-section">
      <div className="oi-agentic-cards">
        {WORKSPACES.map(function (ws) {
          return (
            <div key={ws.id} className="oi-agentic-card">
              <div className="oi-agentic-card-icon">
                <OIIcon name={ws.icon} size={28} fill="#00BF6F" />
              </div>
              <div className="oi-agentic-card-name">{ws.name}</div>
              <div className="oi-agentic-card-desc">{ws.desc}</div>
              <div className="oi-agentic-card-foot">
                <span className="oi-badge success">{ws.status}</span>
                <span className="oi-agentic-stat">{ws.stat}</span>
                <a
                  className="oi-agentic-open"
                  href="#"
                  onClick={function (e) { e.preventDefault(); toast('Opening ' + ws.name + '...', 'info'); }}
                >
                  <OIIcon name="open_in_new" size={13} fill="currentColor" />
                  Open Workspace
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="oi-card" style={{ marginTop: '1.25rem' }}>
        <div className="oi-card-hdr">
          <span className="oi-card-title">Recent Workspace Activity</span>
        </div>
        <table className="oi-table">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Event</th>
              <th>Impact</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {ACTIVITY.map(function (row, i) {
              return (
                <tr key={i}>
                  <td><span className="oi-td-primary">{row.workspace}</span></td>
                  <td>{row.event}</td>
                  <td className="oi-td-muted">{row.impact}</td>
                  <td>
                    <span className={'oi-badge ' + STATUS_CLASS[row.status]}>{STATUS_LABELS[row.status]}</span>
                  </td>
                  <td className="oi-td-muted">{row.time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
