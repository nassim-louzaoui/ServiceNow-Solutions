import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';
import { initials } from '../../helpers.js';

var PENDING_ITEMS = [
  {
    id: 'pi1',
    type: 'AUTOMATION INITIATIVE',
    typeColor: '#2E6DA4',
    title: 'Employee Onboarding Automation',
    meta: 'Nassim Louzaoui · Creator Studio · 2h ago',
    note: 'Requires governance approval',
    badge: 'DRAFT READY',
    badgeClass: 'success',
  },
  {
    id: 'pi2',
    type: 'ACCESS MANAGEMENT REQUEST',
    typeColor: '#E57323',
    title: 'Leadership Insights access — Marcus Webb',
    meta: 'Marcus Webb (Leadership) requesting read access · 3h ago',
    note: null,
    badge: 'ACCESS ELEVATION',
    badgeClass: 'warning',
  },
  {
    id: 'pi3',
    type: 'ACCESS MANAGEMENT REQUEST',
    typeColor: '#E57323',
    title: 'Developer Hub access — Sarah Mitchell',
    meta: 'Sarah Mitchell (Marketing Manager) requesting read access · 5h ago',
    note: null,
    badge: 'ACCESS ELEVATION',
    badgeClass: 'warning',
  },
  {
    id: 'pi4',
    type: 'ACCESS MANAGEMENT REQUEST',
    typeColor: '#E57323',
    title: 'New user provisioning — Anna Torres',
    meta: 'Anna Torres, Operations View · 1d ago',
    note: null,
    badge: 'PENDING ONBOARDING',
    badgeClass: 'info',
  },
  {
    id: 'pi5',
    type: 'GROUP MEMBERSHIP',
    typeColor: '#00897B',
    title: 'Add 3 users to Operations Intelligence Creator group',
    meta: 'Requested by HR Manager · James Harris, Priya Nair, Marcus Webb · 1d ago',
    note: null,
    badge: 'BULK UPDATE',
    badgeClass: 'neutral',
  },
];

var MOCK_GROUPS = [
  { id: 'g1', name: 'Platform Team', members: 8, manager: 'Jane Smith' },
  { id: 'g2', name: 'Network Team',  members: 5, manager: 'Mark Jones' },
  { id: 'g3', name: 'Security Team', members: 6, manager: 'Sara Lee'   },
];

var ACCESS_ITEMS = [
  { id: 'a1', user: 'Marcus Webb',    workspace: 'Leadership Insights',             role: 'Read Access', status: 'pending' },
  { id: 'a2', user: 'Sarah Mitchell', workspace: 'Developer Hub',                   role: 'Read Access', status: 'pending' },
  { id: 'a3', user: 'Anna Torres',    workspace: 'Operations Intelligence Creator', role: 'Member',      status: 'pending' },
  { id: 'a4', user: 'James Harris',   workspace: 'Operations Intelligence Creator', role: 'Member',      status: 'pending' },
  { id: 'a5', user: 'Priya Nair',     workspace: 'Operations Intelligence Creator', role: 'Member',      status: 'pending' },
  { id: 'a6', user: 'Dev Team',       workspace: 'Developer Hub',                   role: 'Full Access', status: 'active'  },
  { id: 'a7', user: 'Platform Team',  workspace: 'All Workspaces',                  role: 'Read Access', status: 'active'  },
];

var ACCESS_STATUS_CLASS = { pending: 'warning', active: 'success' };

var TABS = [
  { label: 'Pending Actions', count: 5, countClass: 'warn' },
  { label: 'Group Management', count: 3, countClass: null },
  { label: 'Access Management', count: 7, countClass: null },
];

export default function GovernanceControl({ data }) {
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

  var visibleItems = PENDING_ITEMS.filter(function (item) { return !dismissed[item.id]; });

  return (
    <div className="oi-section">
      <div className="oi-card">
        <div className="oi-subtabs">
          {TABS.map(function (t, i) {
            return (
              <button
                key={t.label}
                className={'oi-subtab' + (tab === i ? ' active' : '')}
                onClick={function () { setTab(i); }}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={'oi-subtab-count' + (t.countClass ? ' ' + t.countClass : '')}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="oi-subtab-body">
          {tab === 0 && (
            <div style={{ padding: '1rem 1.25rem' }}>
              {visibleItems.map(function (item) {
                return (
                  <div key={item.id} className="oi-gov-item">
                    <div className="oi-gov-item-info">
                      <div className="oi-gov-item-type" style={{ color: item.typeColor }}>{item.type}</div>
                      <div className="oi-gov-item-title">{item.title}</div>
                      {item.note && <div className="oi-gov-item-note">{item.note}</div>}
                      <div className="oi-gov-item-meta">{item.meta}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                      <span className={'oi-badge ' + item.badgeClass}>{item.badge}</span>
                      <div className="oi-action-btns">
                        <button
                          className="oi-btn primary sm"
                          disabled={!!actioning[item.id + 'approve']}
                          onClick={function () { act(item.id, item.title, 'approve'); }}
                        >
                          <OIIcon name="approve" size={13} fill="#fff" />
                          Approve
                        </button>
                        <button
                          className="oi-btn ghost sm"
                          disabled={!!actioning[item.id + 'reject']}
                          onClick={function () { act(item.id, item.title, 'reject'); }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {visibleItems.length === 0 && (
                <div className="oi-empty">
                  <div className="oi-empty-icon"><OIIcon name="check" size={36} fill="#DCDCDC" /></div>
                  <div className="oi-empty-title">All caught up</div>
                  <div className="oi-empty-sub">There are no pending actions.</div>
                </div>
              )}
              {visibleItems.length > 0 && (
                <div className="oi-gov-footer">5 items pending. Last refreshed 30s ago.</div>
              )}
            </div>
          )}

          {tab === 1 && (
            <table className="oi-table">
              <thead>
                <tr><th>Group</th><th>Manager</th><th>Members</th><th></th></tr>
              </thead>
              <tbody>
                {MOCK_GROUPS.map(function (g) {
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
            <table className="oi-table">
              <thead>
                <tr><th>User / Group</th><th>Workspace</th><th>Role</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {ACCESS_ITEMS.map(function (a) {
                  return (
                    <tr key={a.id}>
                      <td><span className="oi-td-primary">{a.user}</span></td>
                      <td>{a.workspace}</td>
                      <td>{a.role}</td>
                      <td><span className={'oi-badge ' + ACCESS_STATUS_CLASS[a.status]}>{a.status.toUpperCase()}</span></td>
                      <td>
                        <button
                          className="oi-btn ghost sm"
                          onClick={function () { toast('Access management coming soon.', 'info'); }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
