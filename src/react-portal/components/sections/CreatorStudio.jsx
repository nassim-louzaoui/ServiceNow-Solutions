import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';

var PROJECTS = [
  { id: 'p1', name: 'Employee Onboarding', status: 'Draft', subItems: ['Requirements', 'Technical Spec'] },
  { id: 'p2', name: 'IT Asset Lifecycle',  status: 'Review' },
  { id: 'p3', name: 'Change Accelerator',  status: 'Live'  },
  { id: 'p4', name: 'Patch Compliance',    status: 'Draft' },
];

var STATUS_CLASS = { Draft: 'neutral', Review: 'warning', Live: 'success' };

var PROJECT_DETAIL = {
  p1: {
    title: 'Employee Onboarding Automation',
    subtitle: 'Captured by Creator Assistance',
    status: 'Draft',
    trigger: {
      trigger: 'New hire record created in ServiceNow HR module',
      scope:   'All data sources and case IDs 5 and standard roles apply',
      owner:   'Nassim Louzaoui — Creator Studio',
      target:  'IT onboarding — Creator Studio',
    },
    steps: [
      { num: 1, label: 'Create Active Directory account with standard and base role +', badge: 'AL'     },
      { num: 2, label: 'Grant role-based access to 8 standard applications',           badge: 'ACCESS' },
      { num: 3, label: 'Assign user to department-specific training courses',           badge: 'GROUP'  },
      { num: 4, label: 'Send personalised welcome email with credentials and IT guide', badge: 'EMAIL'  },
    ],
    logic: [
      { condition: 'Senior Hire Gate', action: 'Approval required from management chain',    status: 'APPROVAL REQUIRED' },
      { condition: 'Execution Paths',  action: 'Standard, Senior, Executive track selection', status: null               },
    ],
    review: [
      { label: 'Stage',     value: 'IN PROGRESS',               badge: 'warning' },
      { label: 'Next Step', value: 'Submit to Governance Control', badge: null    },
    ],
  },
  p2: {
    title: 'IT Asset Lifecycle Management',
    subtitle: null,
    status: 'Review',
    trigger: {
      trigger: 'Asset record created or state changed in CMDB',
      scope:   'All asset categories within x_infte_ops_int scope',
      owner:   null,
      target:  'ITAM Operations — Asset Workspace',
    },
    steps: [
      { num: 1, label: 'Detect asset state change via CMDB discovery',  badge: null },
      { num: 2, label: 'Classify asset lifecycle stage automatically',   badge: null },
      { num: 3, label: 'Trigger compliance and licence checks',          badge: null },
      { num: 4, label: 'Notify asset owner of required actions',         badge: null },
    ],
    logic: [
      { condition: 'End-of-life',    action: 'Initiate decommission workflow', status: 'APPROVED' },
      { condition: 'Out-of-warranty', action: 'Flag for renewal review',       status: null       },
    ],
    review: null,
  },
  p3: {
    title: 'Change Accelerator',
    subtitle: null,
    status: 'Live',
    trigger: {
      trigger: 'Change request submitted with category = Standard',
      scope:   'All standard change templates in ITSM scope',
      owner:   null,
      target:  'Change Management — ITSM Operations',
    },
    steps: [
      { num: 1, label: 'Validate change template against CAB criteria', badge: null },
      { num: 2, label: 'Auto-approve if pre-approved template matched', badge: null },
      { num: 3, label: 'Assign to change coordinator automatically',    badge: null },
    ],
    logic: [
      { condition: 'Emergency', action: 'Escalate to emergency CAB', status: 'IN PROGRESS' },
      { condition: 'Standard',  action: 'Auto-approve and schedule', status: null          },
    ],
    review: null,
  },
  p4: {
    title: 'Patch Compliance Reporter',
    subtitle: null,
    status: 'Draft',
    trigger: {
      trigger: 'Scheduled — weekly at 02:00 UTC on Monday',
      scope:   'All CIs in Production environment',
      owner:   null,
      target:  'CMDB Workspace — Compliance',
    },
    steps: [
      { num: 1, label: 'Query all production CIs for patch status',    badge: null },
      { num: 2, label: 'Cross-reference with latest patch catalogue',  badge: null },
      { num: 3, label: 'Generate compliance report by team',           badge: null },
      { num: 4, label: 'Send report to IT Security and Leadership',    badge: null },
    ],
    logic: [
      { condition: 'Critical patch missing', action: 'Alert Security immediately', status: 'IN PROGRESS' },
      { condition: 'Compliant',              action: 'Log to audit trail',         status: null          },
    ],
    review: null,
  },
};

var STEP_BADGE_CLASS = { AL: 'al', ACCESS: 'access', GROUP: 'group', EMAIL: 'email' };

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
                  <div key={p.id}>
                    <button
                      className={'oi-list-item' + (selected === p.id ? ' selected' : '')}
                      onClick={function () { setSelected(p.id); }}
                    >
                      <div className="oi-list-item-icon">
                        <OIIcon name="studio_icon" size={15} fill="#00BF6F" />
                      </div>
                      <div className="oi-list-item-body">
                        <div className="oi-list-item-title">{p.name}</div>
                      </div>
                      <span className={'oi-badge ' + STATUS_CLASS[p.status]}>{p.status}</span>
                    </button>
                    {selected === p.id && p.subItems && (
                      <div className="oi-list-subitems">
                        {p.subItems.map(function (sub) {
                          return <div key={sub} className="oi-list-subitem">{sub}</div>;
                        })}
                      </div>
                    )}
                  </div>
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
                {proj.subtitle && <div className="oi-studio-subtitle">{proj.subtitle}</div>}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                  <span className={'oi-badge ' + STATUS_CLASS[projMeta.status]}>{projMeta.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="oi-btn ghost sm" onClick={function () { toast('Generate spec coming soon.', 'info'); }}>Generate Spec</button>
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
                {proj.trigger.owner && (
                  <div className="oi-studio-field">
                    <span className="oi-studio-field-lbl">Owner</span>
                    <span className="oi-studio-field-val">{proj.trigger.owner}</span>
                  </div>
                )}
                <div className="oi-studio-field">
                  <span className="oi-studio-field-lbl">Target</span>
                  <span className="oi-studio-field-val">{proj.trigger.target}</span>
                </div>
              </div>
            </div>

            <div className="oi-studio-section">
              <div className="oi-studio-section-hdr">AUTOMATED ACTIONS</div>
              <div className="oi-studio-steps">
                {proj.steps.map(function (step) {
                  return (
                    <div key={step.num} className="oi-studio-step">
                      <div className="oi-studio-step-num">Step {step.num}</div>
                      <div className="oi-studio-step-content">
                        {step.badge && (
                          <span className={'oi-step-badge ' + STEP_BADGE_CLASS[step.badge]}>{step.badge}</span>
                        )}
                        <div className="oi-studio-step-label">{step.label}</div>
                      </div>
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

            {proj.review && (
              <div className="oi-studio-section">
                <div className="oi-studio-section-hdr">REVIEW STATUS</div>
                <div className="oi-studio-fields">
                  {proj.review.map(function (row, i) {
                    return (
                      <div key={i} className="oi-studio-field">
                        <span className="oi-studio-field-lbl">{row.label}</span>
                        <span className="oi-studio-field-val">
                          {row.badge
                            ? <span className={'oi-badge ' + row.badge}>{row.value}</span>
                            : row.value
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
