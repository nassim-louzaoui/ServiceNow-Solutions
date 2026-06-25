import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';
import { initials } from '../../helpers.js';

var MOCK_APPROVALS = [
  { id: 'ap1', title: 'Emergency Change — Network Firewall Update', requestor: 'Alice Chen',    group: 'Network Team',     urgency: 'High',   requested: '20 min ago' },
  { id: 'ap2', title: 'Standard Change — Patch Deployment Batch 4', requestor: 'Bob Patel',    group: 'Platform Team',    urgency: 'Medium', requested: '1 hour ago' },
  { id: 'ap3', title: 'Access Request — CRM Admin Role',            requestor: 'Carol Davis',   group: 'Security Team',    urgency: 'Low',    requested: '3 hours ago' },
  { id: 'ap4', title: 'Software Licence — Splunk Enterprise',       requestor: 'David Kim',     group: 'IT Procurement',   urgency: 'Medium', requested: 'Yesterday' },
];

var MOCK_GROUPS = [
  { id: 'g1', name: 'Platform Team',    members: 8,  manager: 'Jane Smith' },
  { id: 'g2', name: 'Network Team',     members: 5,  manager: 'Mark Jones' },
  { id: 'g3', name: 'Security Team',    members: 6,  manager: 'Sara Lee' },
  { id: 'g4', name: 'IT Procurement',   members: 3,  manager: 'Paul Brown' },
  { id: 'g5', name: 'Knowledge Team',   members: 4,  manager: 'Nina Patel' },
];

var URGENCY_CLASS = { High: 'danger', Medium: 'warning', Low: 'neutral' };

var TABS = ['Pending Approvals', 'Group Management', 'Access Management'];

export default function GovernanceControl({ data }) {
  var approvals = (data && data.approvals) || MOCK_APPROVALS;
  var groups    = (data && data.groups)    || MOCK_GROUPS;
  var [tab, setTab]         = useState(0);
  var [actioning, setActioning] = useState({});
  var [dismissed, setDismissed] = useState({});
  var { callServer, toast } = useApp();

  function act(approval, action) {
    var key = approval.id + action;
    if (actioning[key]) return;
    setActioning(function (prev) { var n = Object.assign({}, prev); n[key] = true; return n; });
    var serverAction = action === 'approve' ? 'approve_execution' : 'reject_execution';
    callServer({ action: serverAction, approval_id: approval.id, title: approval.title })
      .then(function () {
        toast(approval.title + ' ' + (action === 'approve' ? 'approved.' : 'rejected.'), action === 'approve' ? 'success' : 'info');
        setDismissed(function (prev) { var n = Object.assign({}, prev); n[approval.id] = true; return n; });
      })
      .catch(function () {
        toast('Action failed. Please try again.', 'error');
      })
      .finally(function () {
        setActioning(function (prev) { var n = Object.assign({}, prev); delete n[approval.id + action]; return n; });
      });
  }

  var pending = approvals.filter(function (a) { return !dismissed[a.id]; });

  return (
    <div className="oi-section">
      <div className="oi-toolbar">
        <h1 className="oi-section-title">Governance Control</h1>
      </div>

      <div className="oi-card">
        <div className="oi-subtabs">
          {TABS.map(function (t, i) {
            return (
              <button
                key={t}
                className={'oi-subtab' + (tab === i ? ' active' : '')}
                onClick={function () { setTab(i); }}
              >
                {t}
                {i === 0 && pending.length > 0 && (
                  <span className={'oi-subtab-count' + (pending.length > 0 ? ' warn' : '')}>{pending.length}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="oi-subtab-body">
          {tab === 0 && (
            pending.length === 0 ? (
              <div className="oi-empty">
                <div className="oi-empty-icon"><OIIcon name="check" size={36} fill="#DCDCDC" /></div>
                <div className="oi-empty-title">All caught up</div>
                <div className="oi-empty-sub">There are no pending approvals.</div>
              </div>
            ) : (
              <div className="oi-action-list">
                {pending.map(function (a) {
                  return (
                    <div key={a.id} className="oi-action-item">
                      <div className="oi-action-info">
                        <div className="oi-action-type">{a.group}</div>
                        <div className="oi-action-desc" title={a.title}>{a.title}</div>
                        <div className="oi-action-meta">
                          Requested by {a.requestor} &bull; {a.requested}
                        </div>
                      </div>
                      <span className={'oi-badge ' + (URGENCY_CLASS[a.urgency] || 'neutral')}>{a.urgency}</span>
                      <div className="oi-action-btns">
                        <button
                          className="oi-btn primary sm"
                          disabled={!!actioning[a.id + 'approve']}
                          onClick={function () { act(a, 'approve'); }}
                        >
                          <OIIcon name="approve" size={14} fill="#FFFFFF" />
                          Approve
                        </button>
                        <button
                          className="oi-btn ghost sm"
                          disabled={!!actioning[a.id + 'reject']}
                          onClick={function () { act(a, 'reject'); }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === 1 && (
            <table className="oi-table">
              <thead>
                <tr><th>Group</th><th>Manager</th><th>Members</th><th></th></tr>
              </thead>
              <tbody>
                {groups.map(function (g) {
                  return (
                    <tr key={g.id}>
                      <td><span className="oi-td-primary">{g.name}</span></td>
                      <td>
                        <div className="oi-person-cell">
                          <div className="oi-avatar-sm">{initials(g.manager)}</div>
                          {g.manager}
                        </div>
                      </td>
                      <td>{g.members} members</td>
                      <td>
                        <button
                          className="oi-btn ghost sm"
                          onClick={function () { toast('Group management coming soon.', 'info'); }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 2 && (
            <div className="oi-empty">
              <div className="oi-empty-icon"><OIIcon name="lock" size={36} fill="#DCDCDC" /></div>
              <div className="oi-empty-title">Access Management</div>
              <div className="oi-empty-sub">Role assignments and access reviews are managed here.</div>
              <button
                className="oi-btn ghost sm"
                style={{ marginTop: '0.5rem' }}
                onClick={function () { toast('Access management coming soon.', 'info'); }}
              >
                <OIIcon name="person_add" size={14} />
                Grant Access
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
