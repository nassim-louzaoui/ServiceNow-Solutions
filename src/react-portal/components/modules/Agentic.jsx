import React, { useMemo } from 'react';
import Chip from '../Chip.jsx';

const WORKSPACES = [
  { name: 'CMDB Enrichment Agent',     status: 'live',   runs: 47,  success: '97%',  last: '12m ago' },
  { name: 'Incident Resolver Agent',   status: 'live',   runs: 103, success: '91%',  last: '4m ago' },
  { name: 'Change Risk Analyser',      status: 'review', runs: 12,  success: '83%',  last: '2h ago' },
  { name: 'SLA Breach Predictor',      status: 'draft',  runs: 0,   success: '—',    last: '—' },
];

const ACTIVITY = [
  { agent: 'Incident Resolver Agent', action: 'Auto-resolved INC0052847 — matched KB article',   time: '4m ago',  status: 'live' },
  { agent: 'CMDB Enrichment Agent',   action: 'Enriched 14 CI records from endpoint telemetry',  time: '12m ago', status: 'live' },
  { agent: 'Incident Resolver Agent', action: 'Escalated INC0052841 — no KB match found',        time: '31m ago', status: 'review' },
  { agent: 'CMDB Enrichment Agent',   action: 'Processed batch of 82 discovery records',         time: '1h ago',  status: 'live' },
  { agent: 'Change Risk Analyser',    action: 'Flagged CHG0008412 as high-risk — manual review', time: '2h ago',  status: 'review' },
];

const Agentic = React.memo(function Agentic() {
  const liveCount = useMemo(() => WORKSPACES.filter(w => w.status === 'live').length, []);

  return (
    <div>
      <div className="grid2" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-num">{liveCount}</div>
          <div className="stat-label">Live Agents</div>
          <div className="stat-delta">&#9650; Running now</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">162</div>
          <div className="stat-label">Total Executions Today</div>
        </div>
      </div>

      <div className="section-title">Agent Workspaces</div>
      <div className="tbl-wrap" style={{ marginBottom: '20px' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Status</th>
              <th>Runs</th>
              <th>Success</th>
              <th>Last Run</th>
            </tr>
          </thead>
          <tbody>
            {WORKSPACES.map(w => (
              <tr key={w.name}>
                <td style={{ fontWeight: 500 }}>{w.name}</td>
                <td><Chip status={w.status} /></td>
                <td>{w.runs}</td>
                <td>{w.success}</td>
                <td style={{ color: '#475569' }}>{w.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title">Recent Activity</div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Action</th>
              <th>Time</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {ACTIVITY.map((a, i) => (
              <tr key={i}>
                <td style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>{a.agent}</td>
                <td>{a.action}</td>
                <td style={{ color: '#475569', whiteSpace: 'nowrap' }}>{a.time}</td>
                <td><Chip status={a.status} label={a.status === 'live' ? 'success' : 'flagged'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default Agentic;
