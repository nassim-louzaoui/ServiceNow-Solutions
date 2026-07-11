import React, { useCallback } from 'react';
import { useApp } from '../../context.js';
import { GOV_PENDING, GOV_GROUP, GOV_ACCESS } from '../../data.js';
import Chip from '../Chip.jsx';

const GovItem = React.memo(function GovItem({ item, actions }) {
  return (
    <div className="gov-item">
      <div>
        <div className="gov-who">{item.who}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="gov-title">{item.title}</div>
        <div className="gov-sub">{item.sub}</div>
        {item.priority && (
          <div className="gov-actions">
            <Chip status={item.priority} />
            {actions}
          </div>
        )}
        {!item.priority && actions && (
          <div className="gov-actions">{actions}</div>
        )}
      </div>
      <div className="gov-time">{item.time}</div>
    </div>
  );
});

const TABS = ['pending', 'group', 'access'];
const TAB_LABELS = { pending: 'Pending Approval', group: 'Group Requests', access: 'Access Requests' };

const Governance = React.memo(function Governance() {
  const { state, dispatch } = useApp();
  const setTab = useCallback(tab => dispatch({ type: 'SET_GOV_TAB', payload: tab }), [dispatch]);

  const pendingActions = (
    <>
      <button className="btn btn-approve">Approve</button>
      <button className="btn btn-deny">Deny</button>
      <button className="btn btn-escalate">Escalate</button>
    </>
  );

  const groupActions = (
    <>
      <button className="btn btn-approve">Approve</button>
      <button className="btn btn-deny">Deny</button>
    </>
  );

  const accessActions = (
    <>
      <button className="btn btn-review">Review</button>
    </>
  );

  return (
    <div>
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`tab-btn${state.govTab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '0 16px' }}>
        {state.govTab === 'pending' && GOV_PENDING.map((item, i) => (
          <GovItem key={i} item={item} actions={pendingActions} />
        ))}
        {state.govTab === 'group' && GOV_GROUP.map((item, i) => (
          <GovItem key={i} item={{ ...item, priority: undefined }} actions={groupActions} />
        ))}
        {state.govTab === 'access' && GOV_ACCESS.map((item, i) => (
          <GovItem key={i} item={{ ...item, priority: undefined }} actions={accessActions} />
        ))}
      </div>
    </div>
  );
});

export default Governance;
