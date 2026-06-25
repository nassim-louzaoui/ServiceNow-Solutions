import React from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';

var STATS = [
  { label: 'Total Operations', value: '1,284', icon: 'ops_workspace', delta: '+12%' },
  { label: 'Automated',        value: '891',   icon: 'automations',   delta: '+8%'  },
  { label: 'Success Rate',     value: '94.2%', icon: 'check',         delta: '+2.1%' },
  { label: 'Active Agents',    value: '7',     icon: 'agentic',       delta: 'Stable' },
];

var MOCK_INITIATIVES = [
  { id: 'i1', name: 'ITSM Modernisation',        owner: 'Jane Smith',  status: 'running', pct: 72, due: 'Q3 2025' },
  { id: 'i2', name: 'Automation First Programme', owner: 'Mark Jones',  status: 'running', pct: 55, due: 'Q4 2025' },
  { id: 'i3', name: 'Zero-Touch Onboarding',      owner: 'Sara Lee',    status: 'pending', pct: 30, due: 'Q1 2026' },
  { id: 'i4', name: 'Self-Service Portal Refresh', owner: 'Paul Brown', status: 'success', pct: 100, due: 'Complete' },
];

var MOCK_DECISIONS = [
  { id: 'd1', title: 'Approve Q4 automation roadmap budget', urgency: 'High',   due: 'End of week' },
  { id: 'd2', title: 'Review ITSM vendor renewal proposal',  urgency: 'Medium', due: 'Next month' },
  { id: 'd3', title: 'Endorse Zero-Touch Onboarding scope',  urgency: 'Low',    due: '2 weeks' },
];

var URGENCY_CLASS = { High: 'danger', Medium: 'warning', Low: 'neutral' };

export default function LeadershipInsights({ data }) {
  var stats       = (data && data.stats)       || null;
  var initiatives = (data && data.initiatives) || MOCK_INITIATIVES;
  var decisions   = (data && data.decisions)   || MOCK_DECISIONS;
  var { toast }   = useApp();

  return (
    <div className="oi-section">
      <div className="oi-toolbar">
        <h1 className="oi-section-title">Leadership Insights</h1>
      </div>

      <div className="oi-stats">
        {STATS.map(function (s) {
          return (
            <div key={s.label} className="oi-stat">
              <div className="oi-stat-value">{s.value}</div>
              <div className="oi-stat-label">{s.label}</div>
              <div style={{ fontSize: '0.75rem', color: '#00895E', marginTop: '0.25rem', fontWeight: 600 }}>{s.delta}</div>
              <div className="oi-stat-icon"><OIIcon name={s.icon} size={40} /></div>
            </div>
          );
        })}
      </div>

      <div className="oi-card">
        <div className="oi-card-hdr">
          <span className="oi-card-title">Initiative Pipeline</span>
        </div>
        <table className="oi-table">
          <thead>
            <tr><th>Initiative</th><th>Owner</th><th>Progress</th><th>Due</th><th>Status</th></tr>
          </thead>
          <tbody>
            {initiatives.map(function (ini) {
              return (
                <tr key={ini.id}>
                  <td><span className="oi-td-primary">{ini.name}</span></td>
                  <td>{ini.owner}</td>
                  <td>
                    <div className="oi-progress-row">
                      <div className="oi-progress-bar">
                        <div className="oi-progress-fill" style={{ width: ini.pct + '%' }} />
                      </div>
                      <span className="oi-progress-label">{ini.pct}%</span>
                    </div>
                  </td>
                  <td className="oi-td-muted">{ini.due}</td>
                  <td>
                    <span className={'oi-badge ' + (ini.status === 'success' ? 'success' : ini.status === 'running' ? 'running' : 'pending')}>
                      {ini.status === 'success' ? 'Complete' : ini.status === 'running' ? 'In Progress' : 'Planned'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="oi-card">
        <div className="oi-card-hdr">
          <span className="oi-card-title">Pending Decisions</span>
        </div>
        {decisions.length === 0 ? (
          <div className="oi-empty">
            <div className="oi-empty-title">No pending decisions</div>
          </div>
        ) : (
          <div className="oi-action-list">
            {decisions.map(function (d) {
              return (
                <div key={d.id} className="oi-action-item">
                  <div className="oi-action-info">
                    <div className="oi-action-desc">{d.title}</div>
                    <div className="oi-action-meta">Due: {d.due}</div>
                  </div>
                  <span className={'oi-badge ' + (URGENCY_CLASS[d.urgency] || 'neutral')}>{d.urgency}</span>
                  <div className="oi-action-btns">
                    <button
                      className="oi-btn primary sm"
                      onClick={function () { toast('Decision noted: ' + d.title, 'success'); }}
                    >
                      Decide
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
