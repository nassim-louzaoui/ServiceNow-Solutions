import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';

var PROJECTS = [
  { id: 'p1', name: 'Employee Onboarding',               status: 'Draft' },
  { id: 'p2', name: 'IT Asset Lifecycle Management',      status: 'Live'  },
  { id: 'p3', name: 'Change Request Accelerator',         status: 'Draft' },
  { id: 'p4', name: 'Patch Compliance',                   status: 'Draft' },
];

var PROJECT_DETAIL = {
  p1: {
    title: 'Employee Onboarding Automation',
    status: 'Draft',
    trigger: {
      trigger: 'New hire record created in ServiceNow HR module',
      scope:   'All data sources and case IDs 5 and standard roles apply',
      target:  'IT onboarding — Creator Studio',
    },
    steps: [
      { num: 1, label: 'Create Active Directory account with standard and base role +' },
      { num: 2, label: 'Grant role-based access to 8 standard applications' },
      { num: 3, label: 'Assign user to department-specific training courses' },
      { num: 4, label: 'Send personalised welcome email with credentials and IT guide' },
    ],
    logic: [
      { condition: 'Grade 7+',      action: 'Notify the manager → gate',                   status: 'IN PROGRESS' },
      { condition: 'Exception',     action: '3 paths Standard items → flow this with manager', status: null         },
      { condition: 'Next Step',     action: 'Generate spec+complete → submit to Governance Control', status: 'IN PROGRESS' },
    ],
  },
  p2: {
    title: 'IT Asset Lifecycle Management',
    status: 'Live',
    trigger: {
      trigger: 'Asset record created or state changed in CMDB',
      scope:   'All asset categories within x_infte_ops_int scope',
      target:  'ITAM Operations — Asset Workspace',
    },
    steps: [
      { num: 1, label: 'Detect asset state change via CMDB discovery' },
      { num: 2, label: 'Classify asset lifecycle stage automatically' },
      { num: 3, label: 'Trigger compliance and licence checks' },
      { num: 4, label: 'Notify asset owner of required actions' },
    ],
    logic: [
      { condition: 'End-of-life', action: 'Initiate decommission workflow', status: 'APPROVED' },
      { condition: 'Out-of-warranty', action: 'Flag for renewal review',   status: null        },
    ],
  },
  p3: {
    title: 'Change Request Accelerator',
    status: 'Draft',
    trigger: {
      trigger: 'Change request submitted with category = Standard',
      scope:   'All standard change templates in ITSM scope',
      target:  'Change Management — ITSM Operations',
    },
    steps: [
      { num: 1, label: 'Validate change template against CAB criteria' },
      { num: 2, label: 'Auto-approve if pre-approved template matched' },
      { num: 3, label: 'Assign to change coordinator automatically' },
    ],
    logic: [
      { condition: 'Emergency', action: 'Escalate to emergency CAB',       status: 'IN PROGRESS' },
      { condition: 'Standard',  action: 'Auto-approve and schedule',       status: null          },
    ],
  },
  p4: {
    title: 'Patch Compliance Reporter',
    status: 'Draft',
    trigger: {
      trigger: 'Scheduled — weekly at 02:00 UTC on Monday',
      scope:   'All CIs in Production environment',
      target:  'CMDB Workspace — Compliance',
    },
    steps: [
      { num: 1, label: 'Query all production CIs for patch status' },
      { num: 2, label: 'Cross-reference with latest patch catalogue' },
      { num: 3, label: 'Generate compliance report by team' },
      { num: 4, label: 'Send report to IT Security and Leadership' },
    ],
    logic: [
      { condition: 'Critical patch missing', action: 'Alert Security immediately', status: 'IN PROGRESS' },
      { condition: 'Compliant',              action: 'Log to audit trail',         status: null          },
    ],
  },
};

export default function CreatorStudio({ data }) {
  var { callServer, toast } = useApp();
  var [selected, setSelected] = useState('p1');
  var [submitting, setSubmitting] = useState(false);

  var proj = PROJECT_DETAIL[selected] || PROJECT_DETAIL.p1;
  var projMeta = PROJECTS.find(function (p) { return p.id === selected; }) || PROJECTS[0];

  function submitForReview() {
    if (submitting) return;
    setSubmitting(true);
    callServer({ action: 'submit_for_review', project_id: selected, name: proj.title })
      .then(function () { toast(proj.title + ' submitted for review.', 'success'); })
      .catch(function () { toast('Submission failed. Please try again.', 'error'); })
      .finally(function () { setSubmitting(false); });
  }

  return (
    <div className="oi-section">
      <div className="oi-studio-layout">
        <div className="oi-studio-projects">
          <div className="oi-card">
            <div className="oi-card-hdr"><span className="oi-card-title">Projects</span></div>
            <div className="oi-item-list">
              {PROJECTS.map(function (p) {
                return (
                  <button
                    key={p.id}
                    className={'oi-list-item' + (selected === p.id ? ' selected' : '')}
                    onClick={function () { setSelected(p.id); }}
                  >
                    <div className="oi-list-item-icon">
                      <OIIcon name="studio_icon" size={15} fill="#00BF6F" />
                    </div>
                    <div className="oi-list-item-body">
                      <div className="oi-list-item-title">{p.name}</div>
                    </div>
                    <span className={'oi-badge ' + (p.status === 'Live' ? 'success' : 'neutral')}>{p.status}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #EBEBEB' }}>
              <button
                className="oi-btn ghost sm"
                style={{ width: '100%' }}
                onClick={function () { toast('New project creation coming soon.', 'info'); }}
              >
                + New Project
              </button>
            </div>
          </div>
        </div>

        <div className="oi-studio-detail">
          <div className="oi-card">
            <div className="oi-card-hdr">
              <div>
                <div className="oi-card-title">{proj.title}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                  <span className={'oi-badge ' + (projMeta.status === 'Live' ? 'success' : 'neutral')}>{projMeta.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="oi-btn ghost sm" onClick={function () { toast('Generate steps coming soon.', 'info'); }}>Generate Steps</button>
                <button className="oi-btn primary sm" disabled={submitting} onClick={submitForReview}>
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </div>

            <div className="oi-studio-section">
              <div className="oi-studio-section-hdr">TRIGGER &amp; SCOPE</div>
              <div className="oi-studio-fields">
                <div className="oi-studio-field">
                  <span className="oi-studio-field-lbl">Trigger</span>
                  <span className="oi-studio-field-val">{proj.trigger.trigger}</span>
                </div>
                <div className="oi-studio-field">
                  <span className="oi-studio-field-lbl">Scope</span>
                  <span className="oi-studio-field-val">{proj.trigger.scope}</span>
                </div>
                <div className="oi-studio-field">
                  <span className="oi-studio-field-lbl">Target</span>
                  <span className="oi-studio-field-val">{proj.trigger.target}</span>
                </div>
              </div>
            </div>

            <div className="oi-studio-section">
              <div className="oi-studio-section-hdr">AUTOMATION STEPS</div>
              <div className="oi-studio-steps">
                {proj.steps.map(function (step) {
                  return (
                    <div key={step.num} className="oi-studio-step">
                      <div className="oi-studio-step-num">Step {step.num}</div>
                      <div className="oi-studio-step-label">{step.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="oi-studio-section">
              <div className="oi-studio-section-hdr">CONDITIONAL LOGIC</div>
              <table className="oi-table">
                <thead>
                  <tr><th>Condition</th><th>Action</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {proj.logic.map(function (row, i) {
                    return (
                      <tr key={i}>
                        <td className="oi-td-mono">{row.condition}</td>
                        <td>{row.action}</td>
                        <td>{row.status && <span className="oi-badge warning">{row.status}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
