import React, { useState } from 'react';
import { useApp } from '../../context.js';

var CATALOG = [
  {
    id: 'knowledge',
    label: 'Knowledge Management',
    color: '#2E6DA4',
    items: [
      { id: 'kb_search', name: 'Knowledge Base Search',      desc: 'Search the full knowledge base for solutions and guidance.' },
      { id: 'kb_submit', name: 'Submit Knowledge Article',   desc: 'Contribute a new knowledge article for review and publication.' },
    ],
  },
  {
    id: 'itsm',
    label: 'ITSM Operations',
    color: '#E57323',
    items: [
      { id: 'itsm_inc', name: 'Incident Report',                     desc: 'Raise a new incident for immediate IT attention and resolution.' },
      { id: 'itsm_sra', name: 'Service Request — Application Access', desc: 'Request access to a business application or system.' },
      { id: 'itsm_pwd', name: 'Password Reset',                      desc: 'Self-service password reset across identity systems.' },
      { id: 'itsm_chg', name: 'Change Request Submission',           desc: 'Submit a change record for CAB review and approval.' },
      { id: 'itsm_prb', name: 'Problem Management Entry',            desc: 'Log a problem record for root cause investigation and resolution.' },
      { id: 'itsm_vpn', name: 'VPN and Remote Access Setup',         desc: 'Configure secure remote access for authorised users.' },
    ],
  },
  {
    id: 'itam',
    label: 'ITAM Operations',
    color: '#00897B',
    items: [
      { id: 'itam_hw',  name: 'New Hardware Request',            desc: 'Request a laptop, monitor, or peripheral device.' },
      { id: 'itam_sw',  name: 'Software Licence Request',        desc: 'Request a commercial software licence or installation.' },
      { id: 'itam_xfr', name: 'Asset Transfer or Reassignment',  desc: 'Reassign an asset to another user or department.' },
      { id: 'itam_dec', name: 'Asset Decommission Request',      desc: 'Retire and securely wipe end-of-life assets.' },
    ],
  },
];

var CATALOG_TOTAL = 24;

export default function OperationsWorkspace({ data }) {
  var { callServer, toast } = useApp();
  var [requesting, setRequesting] = useState({});

  function requestItem(groupId, item) {
    if (requesting[item.id]) return;
    setRequesting(function (prev) { var n = Object.assign({}, prev); n[item.id] = true; return n; });
    callServer({ action: 'request_operation', category: groupId, item: item.id, name: item.name })
      .then(function () { toast('Request submitted: ' + item.name, 'success'); })
      .catch(function () { toast('Failed to submit request. Please try again.', 'error'); })
      .finally(function () {
        setRequesting(function (prev) { var n = Object.assign({}, prev); delete n[item.id]; return n; });
      });
  }

  return (
    <div className="oi-section">
      <div className="oi-catalog-topbar">
        <span className="oi-catalog-count">{CATALOG_TOTAL} <span style={{ fontWeight: 400, fontSize: '0.8rem' }}>AVAILABLE</span></span>
        <button className="oi-btn ghost sm" onClick={function () { toast('Browse all coming soon.', 'info'); }}>Browse All</button>
      </div>

      {CATALOG.map(function (group) {
        return (
          <div key={group.id} className="oi-catalog-group">
            <div className="oi-catalog-group-hdr" style={{ color: group.color }}>
              {group.label}
            </div>
            {group.items.map(function (item) {
              return (
                <div key={item.id} className="oi-catalog-row">
                  <div className="oi-catalog-row-body">
                    <div className="oi-catalog-row-name">{item.name}</div>
                    <div className="oi-catalog-row-desc">{item.desc}</div>
                  </div>
                  <button
                    className="oi-btn primary sm"
                    disabled={!!requesting[item.id]}
                    onClick={function () { requestItem(group.id, item); }}
                  >
                    {requesting[item.id] ? 'Submitting...' : 'Request'}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
