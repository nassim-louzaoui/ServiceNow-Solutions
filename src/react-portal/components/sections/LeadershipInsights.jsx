import React, { useState } from 'react';
import { useApp } from '../../context.js';

var STATS = [
  { label: 'Automations Live',         value: '14',   color: '#2E6DA4' },
  { label: 'Pending Review',           value: '3',    color: '#E57323' },
  { label: 'In Development',           value: '8',    color: '#00897B' },
  { label: 'Automation Success Rate',  value: '94%',  color: '#00BF6F' },
];

var PIPELINE = [
  { initiative: 'Employee Onboarding Automation',  creator: 'N. Louzaoui', stage: 'GOVERNANCE REVIEW', stageColor: '#E57323', pct: 72, status: 'PENDING',  statusClass: 'warning' },
  { initiative: 'IT Asset Lifecycle Management',   creator: 'D. Chen',     stage: 'LEADERSHIP REVIEW', stageColor: '#2E6DA4', pct: 55, status: 'PENDING',  statusClass: 'warning' },
  { initiative: 'Change Request Accelerator',      creator: 'P. Nair',     stage: 'APPROVED',          stageColor: '#3D7317', pct: 88, status: 'LIVE',     statusClass: 'success' },
  { initiative: 'Patch Compliance Reporter',       creator: 'M. Webb',     stage: 'CREATOR STUDIO',    stageColor: '#6E6E6E', pct: 25, status: 'DRAFT',    statusClass: 'neutral' },
];

var PENDING_DECISION = {
  title: 'Pending Leadership Decision — IT Asset Lifecycle Management',
  summary: 'Tracks hardware assets from procurement through decommission, consolidating data from ServiceNow, Flexera, and the procurement system into a unified lifecycle view with automated compliance alerts.',
};

export default function LeadershipInsights({ data }) {
  var { callServer, toast } = useApp();
  var [notes, setNotes] = useState('');
  var [deciding, setDeciding] = useState(null);

  function decide(action) {
    if (deciding) return;
    setDeciding(action);
    callServer({ action: 'leadership_decision', initiative: PENDING_DECISION.title, decision: action, notes: notes })
      .then(function () {
        toast(action === 'approve' ? 'Initiative approved.' : 'Initiative rejected.', action === 'approve' ? 'success' : 'info');
        setNotes('');
      })
      .catch(function () { toast('Decision failed. Please try again.', 'error'); })
      .finally(function () { setDeciding(null); });
  }

  return (
    <div className="oi-section">
      <div className="oi-leadership-stats">
        {STATS.map(function (s) {
          return (
            <div key={s.label} className="oi-leadership-stat">
              <div className="oi-leadership-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="oi-leadership-stat-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="oi-card">
        <div className="oi-card-hdr">
          <span className="oi-card-title">Initiative Pipeline</span>
          <span className="oi-td-muted" style={{ fontSize: '0.8rem' }}>JUN 2025</span>
        </div>
        <table className="oi-table">
          <thead>
            <tr>
              <th>Initiative</th>
              <th>Creator</th>
              <th>Stage</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {PIPELINE.map(function (row) {
              return (
                <tr key={row.initiative}>
                  <td><span className="oi-td-primary">{row.initiative}</span></td>
                  <td>{row.creator}</td>
                  <td>
                    <span
                      className="oi-stage-badge"
                      style={{ color: row.stageColor, borderColor: row.stageColor }}
                    >
                      {row.stage}
                    </span>
                  </td>
                  <td>
                    <div className="oi-progress-row">
                      <div className="oi-progress-bar">
                        <div className="oi-progress-fill" style={{ width: row.pct + '%' }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={'oi-badge ' + row.statusClass}>{row.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="oi-card" style={{ marginTop: '1rem' }}>
        <div className="oi-card-hdr">
          <span className="oi-card-title">{PENDING_DECISION.title}</span>
        </div>
        <div className="oi-card-body">
          <div className="oi-leadership-decision-section">
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#6E6E6E', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Initiative Summary
            </div>
            <div style={{ fontSize: '0.875rem', color: '#2E2E2E', lineHeight: 1.5 }}>
              {PENDING_DECISION.summary}
            </div>
          </div>
          <div className="oi-decision-row">
            <textarea
              className="oi-decision-notes"
              placeholder="Add approval notes or feedback..."
              value={notes}
              onChange={function (e) { setNotes(e.target.value); }}
              rows={2}
            />
            <div className="oi-decision-btns">
              <button
                className="oi-btn primary sm"
                disabled={!!deciding}
                onClick={function () { decide('approve'); }}
              >
                &#10003; Approve
              </button>
              <button
                className="oi-btn ghost sm"
                disabled={!!deciding}
                onClick={function () { decide('reject'); }}
              >
                &#10007; Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
