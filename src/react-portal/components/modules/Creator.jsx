import React, { useState, useMemo, useCallback } from 'react';

const PROJECTS = [
  { id: 'onboard',  name: 'Employee Onboarding Automation',  status: 'review',  steps: 14, conditions: 3 },
  { id: 'offboard', name: 'Offboarding Workflow',             status: 'live',    steps: 11, conditions: 2 },
  { id: 'license',  name: 'Licence Auto-Provisioning',        status: 'draft',   steps: 6,  conditions: 1 },
  { id: 'asset',    name: 'Asset Return Flow',                 status: 'draft',   steps: 4,  conditions: 0 },
];

const STATUS_COLOR = { live: '#10b981', review: '#f59e0b', draft: '#475569' };

const Creator = React.memo(function Creator() {
  const [selected, setSelected] = useState('onboard');

  const project = useMemo(() => PROJECTS.find(p => p.id === selected), [selected]);
  const handleSelect = useCallback(id => setSelected(id), []);

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="col" style={{ maxWidth: '220px', flex: '0 0 220px' }}>
        <div className="section-title">Projects</div>
        <div>
          {PROJECTS.map(p => (
            <div
              key={p.id}
              className={`tree-item${selected === p.id ? ' active' : ''}`}
              onClick={() => handleSelect(p.id)}
              style={{ '--mod-color': '#f97316' }}
            >
              <span className="dot" />
              <span style={{ flex: 1, minWidth: 0 }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="col">
        {project && (
          <div>
            <div className="section-title">Project Detail</div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div className="card-title" style={{ flex: 1 }}>{project.name}</div>
                <span className={`chip ${project.status}`}>{project.status}</span>
              </div>
              <div className="grid2" style={{ marginBottom: '16px' }}>
                <div className="stat-card" style={{ padding: '12px' }}>
                  <div className="stat-num" style={{ fontSize: '22px' }}>{project.steps}</div>
                  <div className="stat-label">Steps Defined</div>
                </div>
                <div className="stat-card" style={{ padding: '12px' }}>
                  <div className="stat-num" style={{ fontSize: '22px' }}>{project.conditions}</div>
                  <div className="stat-label">Conditions</div>
                </div>
              </div>
              <div className="section-title" style={{ marginTop: '4px' }}>Flow Steps</div>
              {Array.from({ length: Math.min(project.steps, 5) }, (_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #1e2942' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#1e2942', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {['Trigger: Service Catalog Submission', 'Validate required fields', 'Create AD user account', 'Provision standard application suite', 'Send welcome email notification'][i]}
                  </span>
                </div>
              ))}
              {project.steps > 5 && (
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '8px', textAlign: 'center' }}>
                  +{project.steps - 5} more steps
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-review">Edit Flow</button>
                {project.status === 'draft' && <button className="btn btn-approve">Submit for Review</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default Creator;
