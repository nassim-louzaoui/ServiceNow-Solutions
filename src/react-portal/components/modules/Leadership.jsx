import React, { useMemo } from 'react';
import Chip from '../Chip.jsx';

const PIPELINE = [
  { name: 'Employee Onboarding Automation', stage: 'Governance Review',  priority: 'elevated', sla: '2d' },
  { name: 'IT Asset Lifecycle Manager',      stage: 'Leadership Review',  priority: 'elevated', sla: '2d' },
  { name: 'CMDB Enrichment Agent',          stage: 'Active Dev',         priority: 'standard', sla: '14d' },
  { name: 'SLA Breach Predictor',           stage: 'Active Dev',         priority: 'standard', sla: '21d' },
  { name: 'Licence Auto-Provisioning',      stage: 'Creator Studio',     priority: 'standard', sla: '30d' },
];

const Leadership = React.memo(function Leadership() {
  const stats = useMemo(() => ({
    live:       14,
    govReview:  3,
    activeDev:  8,
    thisQ:      4,
  }), []);

  return (
    <div>
      <div className="grid2" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-num">{stats.live}</div>
          <div className="stat-label">Live Automations</div>
          <div className="stat-delta">94% success rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.govReview}</div>
          <div className="stat-label">Awaiting Decision</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.activeDev}</div>
          <div className="stat-label">In Active Development</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.thisQ}</div>
          <div className="stat-label">Est. Ready This Quarter</div>
          <div className="stat-delta">&#9650; On track</div>
        </div>
      </div>

      <div className="section-title">Initiative Pipeline</div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Initiative</th>
              <th>Stage</th>
              <th>Priority</th>
              <th>SLA Remaining</th>
            </tr>
          </thead>
          <tbody>
            {PIPELINE.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td style={{ color: '#94a3b8' }}>{p.stage}</td>
                <td><Chip status={p.priority} /></td>
                <td style={{ color: p.sla === '2d' ? '#ef4444' : '#64748b' }}>{p.sla}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default Leadership;
