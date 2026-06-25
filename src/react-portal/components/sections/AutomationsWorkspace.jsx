import React, { useState } from 'react';
import { useApp } from '../../context.js';

var GROUPS = [
  {
    id: 'knowledge',
    label: 'Knowledge Management',
    color: '#2E6DA4',
    items: [
      { id: 'km1', name: 'Knowledge Base Publisher',  status: 'live',    desc: 'Automatically publishes approved articles to the knowledge portal.' },
      { id: 'km2', name: 'Knowledge Scheduler',       status: 'live',    desc: 'Schedules periodic review cycles for all published articles.' },
      { id: 'km3', name: 'Article Expiry Review',     status: 'pending', desc: 'Flags articles approaching their expiry date for author review.' },
      { id: 'km4', name: 'Brain Scan',                status: 'live',    desc: 'Analyses knowledge gaps and suggests new article topics.' },
    ],
  },
  {
    id: 'itsm',
    label: 'ITSM Operations',
    color: '#E57323',
    items: [
      { id: 'it1', name: 'Password Reset Flow',       status: 'live',    desc: 'Self-service password reset with identity provider integration.' },
      { id: 'it2', name: 'Application Access Flow',   status: 'live',    desc: 'Automated provisioning of application access upon approval.' },
      { id: 'it3', name: 'Server Health Check',       status: 'live',    desc: 'Monitors server uptime and alerts on threshold breaches.' },
      { id: 'it4', name: 'VDI 1',                     status: 'pending', desc: 'Provisions virtual desktop instances for remote workers.' },
    ],
  },
  {
    id: 'itam',
    label: 'ITAM Operations',
    color: '#00897B',
    items: [
      { id: 'ia1', name: 'Asset Lifecycle Manager',   status: 'live',    desc: 'Tracks asset lifecycle from procurement to decommission.' },
      { id: 'ia2', name: 'Licence Compliance Alert',  status: 'live',    desc: 'Alerts when licence usage approaches contractual limits.' },
      { id: 'ia3', name: 'Asset Decommissioner',      status: 'live',    desc: 'Automates secure wipe and disposal of end-of-life assets.' },
      { id: 'ia4', name: 'Hardware Rotation',         status: 'pending', desc: 'Schedules hardware rotation cycles and refresh requests.' },
    ],
  },
];

var TOTAL = GROUPS.reduce(function (n, g) { return n + g.items.length; }, 0);
var STATUS_CLASS = { live: 'success', pending: 'warning', inactive: 'neutral' };

export default function AutomationsWorkspace({ data }) {
  var { callServer, toast } = useApp();
  var [running, setRunning] = useState({});

  function runAutomation(item) {
    if (running[item.id]) return;
    setRunning(function (prev) { var n = Object.assign({}, prev); n[item.id] = true; return n; });
    callServer({ action: 'run_automation', automation_id: item.id, name: item.name })
      .then(function () { toast('Automation started: ' + item.name, 'success'); })
      .catch(function () { toast('Failed to start automation.', 'error'); })
      .finally(function () {
        setRunning(function (prev) { var n = Object.assign({}, prev); delete n[item.id]; return n; });
      });
  }

  return (
    <div className="oi-section">
      <div className="oi-catalog-topbar">
        <span className="oi-catalog-count">{TOTAL} <span style={{ fontWeight: 400, fontSize: '0.8rem' }}>AUTOMATIONS</span></span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select className="oi-select"><option>All Categories</option></select>
          <select className="oi-select"><option>All Types</option></select>
          <select className="oi-select"><option>All Statuses</option></select>
        </div>
      </div>

      {GROUPS.map(function (group) {
        return (
          <div key={group.id} className="oi-auto-group">
            <div className="oi-auto-group-hdr">
              <span className="oi-auto-group-label" style={{ color: group.color }}>{group.label}</span>
              <span className="oi-auto-group-count">{group.items.length} AUTOMATIONS</span>
              <a
                className="oi-auto-group-link"
                href="#"
                onClick={function (e) { e.preventDefault(); toast('View all coming soon.', 'info'); }}
              >
                View all in library
              </a>
            </div>
            <div className="oi-auto-grid">
              {group.items.map(function (item) {
                return (
                  <div key={item.id} className="oi-auto-card">
                    <div className="oi-auto-card-top">
                      <span className="oi-auto-card-name">{item.name}</span>
                      <span className={'oi-badge ' + STATUS_CLASS[item.status]}>{item.status.toUpperCase()}</span>
                    </div>
                    <div className="oi-auto-card-desc">{item.desc}</div>
                    <button
                      className="oi-btn ghost xs"
                      disabled={!!running[item.id]}
                      onClick={function () { runAutomation(item); }}
                    >
                      {running[item.id] ? 'Running...' : 'Run'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
