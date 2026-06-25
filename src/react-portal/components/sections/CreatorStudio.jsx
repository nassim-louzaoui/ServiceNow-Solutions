import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';
import { statusClass } from '../../helpers.js';

var MOCK_PROJECTS = [
  { id: 'p1', name: 'Incident Auto-Escalation',   type: 'Business Rule',   status: 'active',  steps: 4, last_edit: '2 hours ago' },
  { id: 'p2', name: 'Weekly SLA Report',           type: 'Scheduled Job',   status: 'active',  steps: 3, last_edit: 'Yesterday' },
  { id: 'p3', name: 'Change Risk Scoring',         type: 'Script Include',  status: 'draft',   steps: 5, last_edit: '3 days ago' },
  { id: 'p4', name: 'New Hire Onboarding Catalog', type: 'Service Catalog', status: 'draft',   steps: 6, last_edit: '1 week ago' },
];

var PROJECT_STEPS = {
  p1: [
    { id: 's1', label: 'Trigger Condition',    desc: 'Incident priority changes to 1 — Critical', status: 'success' },
    { id: 's2', label: 'Condition Filter',     desc: 'Assignment group is IT Operations',          status: 'success' },
    { id: 's3', label: 'Notification Action',  desc: 'Notify manager via email and Slack',         status: 'success' },
    { id: 's4', label: 'Update Record',        desc: 'Set escalated flag to true',                  status: 'pending' },
  ],
  p2: [
    { id: 's1', label: 'Schedule',      desc: 'Every Monday at 08:00 UTC',                          status: 'success' },
    { id: 's2', label: 'Data Query',    desc: 'Incidents resolved in the previous 7 days',          status: 'success' },
    { id: 's3', label: 'Email Report',  desc: 'Send to IT Leadership distribution list',            status: 'pending' },
  ],
  p3: [
    { id: 's1', label: 'Input Parsing',        desc: 'Accept change request sys_id',               status: 'success' },
    { id: 's2', label: 'CI Impact Analysis',   desc: 'Query CMDB for affected configuration items', status: 'success' },
    { id: 's3', label: 'Risk Calculation',     desc: 'Weighted score from CI count and priority',   status: 'running' },
    { id: 's4', label: 'Output Formatting',    desc: 'Return risk level: Low / Medium / High',      status: 'pending' },
    { id: 's5', label: 'Update Change Record', desc: 'Write risk score to change request field',    status: 'pending' },
  ],
  p4: [
    { id: 's1', label: 'Catalog Category',    desc: 'Human Resources > Onboarding',                status: 'success' },
    { id: 's2', label: 'Request Variables',   desc: 'Collect: name, start date, role, department', status: 'success' },
    { id: 's3', label: 'Create AD Account',   desc: 'Call integration to provision account',       status: 'pending' },
    { id: 's4', label: 'Assign Laptop',       desc: 'Auto-assign from asset pool',                 status: 'pending' },
    { id: 's5', label: 'Send Welcome Email',  desc: 'Trigger notification to new joiner',          status: 'pending' },
    { id: 's6', label: 'Notify Manager',      desc: 'Alert hiring manager on completion',          status: 'pending' },
  ],
};

export default function CreatorStudio({ data }) {
  var projects = (data && data.projects) || MOCK_PROJECTS;
  var [selected, setSelected] = useState(projects[0] ? projects[0].id : null);
  var { callServer, toast } = useApp();
  var [building, setBuilding] = useState(false);

  var proj = projects.find(function (p) { return p.id === selected; });
  var steps = (selected && PROJECT_STEPS[selected]) || [];

  function buildProject() {
    if (!proj || building) return;
    setBuilding(true);
    callServer({ action: 'create_deliverable', project_id: proj.id, name: proj.name, type: proj.type })
      .then(function () {
        toast(proj.name + ' deployed successfully.', 'success');
      })
      .catch(function () {
        toast('Build failed. Please try again.', 'error');
      })
      .finally(function () { setBuilding(false); });
  }

  return (
    <div className="oi-section">
      <div className="oi-toolbar">
        <h1 className="oi-section-title">Creator Studio</h1>
        <button className="oi-btn primary sm" onClick={function () { toast('New project creation coming soon.', 'info'); }}>
          <OIIcon name="plus" size={15} fill="#FFFFFF" />
          New Project
        </button>
      </div>

      <div className="oi-studio-layout">
        <div className="oi-studio-projects">
          <div className="oi-card">
            <div className="oi-card-hdr"><span className="oi-card-title">My Projects</span></div>
            <div className="oi-item-list">
              {projects.map(function (p) {
                var sc = statusClass(p.status === 'active' ? 'success' : 'pending');
                return (
                  <button
                    key={p.id}
                    className={'oi-list-item' + (selected === p.id ? ' selected' : '')}
                    onClick={function () { setSelected(p.id); }}
                  >
                    <div className="oi-list-item-icon">
                      <OIIcon name="studio_icon" size={16} fill="#00BF6F" />
                    </div>
                    <div className="oi-list-item-body">
                      <div className="oi-list-item-title">{p.name}</div>
                      <div className="oi-list-item-sub">{p.type} &bull; {p.steps} steps</div>
                    </div>
                    <span className={'oi-badge ' + sc}>{p.status}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="oi-studio-detail">
          {proj ? (
            <div className="oi-card">
              <div className="oi-card-hdr">
                <div>
                  <div className="oi-card-title">{proj.name}</div>
                  <div className="oi-td-muted" style={{ marginTop: '0.25rem' }}>{proj.type} &bull; Last edited {proj.last_edit}</div>
                </div>
                <button
                  className="oi-btn primary sm"
                  disabled={building}
                  onClick={buildProject}
                >
                  {building ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
              <div className="oi-card-body">
                <div className="oi-timeline">
                  {steps.map(function (step, i) {
                    var sc = statusClass(step.status);
                    return (
                      <div key={step.id} className={'oi-tl-item ' + sc}>
                        <div className="oi-tl-side">
                          <div className={'oi-tl-dot'} />
                          {i < steps.length - 1 && <div className="oi-tl-line" />}
                        </div>
                        <div className="oi-tl-content">
                          <div className="oi-tl-name">Step {i + 1}: {step.label}</div>
                          <div className="oi-tl-msg">{step.desc}</div>
                        </div>
                        <span className={'oi-badge ' + sc}>{step.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="oi-card">
              <div className="oi-empty">
                <div className="oi-empty-icon"><OIIcon name="studio_icon" size={36} fill="#DCDCDC" /></div>
                <div className="oi-empty-title">Select a project</div>
                <div className="oi-empty-sub">Choose a project from the list to view its build steps.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
