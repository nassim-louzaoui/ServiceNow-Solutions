import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';
import { initials } from '../../helpers.js';

var AUTOMATION_REQUESTS = [
  {
    id: 'ar1',
    title: 'Employee Onboarding Automation',
    desc: 'Automation Requests',
    requestor: 'Marcus Webb',
    time: '13 days',
    urgency: 'high',
  },
  {
    id: 'ar2',
    title: 'Leadership Insights access — Marcus Webb',
    desc: 'Automation Requests',
    requestor: 'Marcus Webb',
    time: '30 min ago',
    urgency: 'medium',
  },
  {
    id: 'ar3',
    title: 'Developer Hub access — Anna Torres',
    desc: 'Automation Requests',
    requestor: 'Anna Torres',
    time: '1 hour ago',
    urgency: 'low',
  },
];

var PENDING_PERMISSIONS = [
  {
    id: 'pp1',
    title: 'New user provisioning — Anna Torres',
    desc: 'Add to Operations Intelligence Creator group',
    time: '6 hours ago',
  },
  {
    id: 'pp2',
    title: 'Role escalation — Dev environment access',
    desc: 'Request elevated developer permissions',
    time: 'Yesterday',
  },
];

var MOCK_GROUPS = [
  { id: 'g1', name: 'Platform Team',   members: 8, manager: 'Jane Smith'  },
  { id: 'g2', name: 'Network Team',    members: 5, manager: 'Mark Jones'  },
  { id: 'g3', name: 'Security Team',   members: 6, manager: 'Sara Lee'    },
  { id: 'g4', name: 'IT Procurement',  members: 3, manager: 'Paul Brown'  },
  { id: 'g5', name: 'Knowledge Team',  members: 4, manager: 'Nina Patel'  },
];

var URGENCY_COLOR = { high: '#C9190B', medium: '#E57323', low: '#3D7317' };
var TABS = ['Pending Actions', 'Group Management', 'Access Management'];

export default function GovernanceControl({ data }) {
  var groups = (data && data.groups) || MOCK_GROUPS;
  var [tab, setTab] = useState(0);
  var [actioning, setActioning] = useState({});
  var [dismissed, setDismissed] = useState({});
  var { callServer, toast } = useApp();

  function act(id, title, action) {
    var key = id + action;
    if (actioning[key]) return;
    setActioning(function (prev) { var n = Object.assign({}, prev); n[key] = true; return n; });
    var serverAction = action === 'approve' ? 'approve_execution' : 'reject_execution';
    callServer({ action: serverAction, approval_id: id, title: title })
      .then(function () {
        toast(title + ' ' + (action === 'approve' ? 'approved.' : 'rejected.'), action === 'approve' ? 'success' : 'info');
        setDismissed(function (prev) { var n = Object.assign({}, prev); n[id] = true; return n; });
      })
      .catch(function () { toast('Action failed. Please try again.', 'error'); })
      .finally(function () {
        setActioning(function (prev) { var n = Object.assign({}, prev); delete n[id + action]; return n; });
      });
  }

  var pendingAR = AUTOMATION_REQUESTS.filter(function (a) { return !dismissed[a.id]; });
  var pendingPP = PENDING_PERMISSIONS.filter(function (p) { return !dismissed[p.id]; });
  var totalPending = pendingAR.length + pendingPP.length;

  return (
    <div className="oi-section">
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
                {i === 0 && totalPending > 0 && (
                  <span className="oi-subtab-count warn">{totalPending}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="oi-subtab-body">
          {tab === 0 && (
            <div style={{ padding: '1rem 1.25rem' }}>
              {pendingAR.length > 0 && (
                <div className="oi-gov-section">
                  <div className="oi-gov-section-hdr">AUTOMATION REQUESTS</div>
                  {pendingAR.map(function (a) {
                    return (
                      <div
                        key={a.id}
                        className="oi-gov-item"
                        style={{ borderLeft: '3px solid ' + URGENCY_COLOR[a.urgency] }}
                      >
                        <div className="oi-gov-item-info">
                          <div className="oi-gov-item-group">{a.desc}</div>
                          <div className="oi-gov-item-title">{a.title}</div>
                          <div className="oi-gov-item-meta">Requested by {a.requestor} &bull; {a.time}</div>
                        </div>
                        <div className="oi-action-btns">
                          <button
                            className="oi-btn primary sm"
                            disabled={!!actioning[a.id + 'approve']}
                            onClick={function () { act(a.id, a.title, 'approve'); }}
                          >
                            <OIIcon name="approve" size={13} fill="#fff" />
                            Approve
                          </button>
                          <button
                            className="oi-btn ghost sm"
                            disabled={!!actioning[a.id + 'reject']}
                            onClick={function () { act(a.id, a.title, 'reject'); }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {pendingPP.length > 0 && (
                <div className="oi-gov-section" style={{ marginTop: '1.25rem' }}>
                  <div className="oi-gov-section-hdr">PENDING PERMISSIONS</div>
                  {pendingPP.map(function (p) {
                    return (
                      <div
                        key={p.id}
                        className="oi-gov-item"
                        style={{ borderLeft: '3px solid #2E6DA4' }}
                      >
                        <div className="oi-gov-item-info">
                          <div className="oi-gov-item-title">{p.title}</div>
                          <div className="oi-gov-item-meta">{p.desc} &bull; {p.time}</div>
                        </div>
                        <div className="oi-action-btns">
                          <button
                            className="oi-btn primary sm"
                            onClick={function () { act(p.id, p.title, 'approve'); }}
                          >
                            Approve
                          </button>
                          <button
                            className="oi-btn ghost sm"
                            onClick={function () { act(p.id, p.title, 'reject'); }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {pendingAR.length === 0 && pendingPP.length === 0 && (
                <div className="oi-empty">
                  <div className="oi-empty-icon"><OIIcon name="check" size={36} fill="#DCDCDC" /></div>
                  <div className="oi-empty-title">All caught up</div>
                  <div className="oi-empty-sub">There are no pending actions.</div>
                </div>
              )}
            </div>
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
