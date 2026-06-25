import React, { useState } from 'react';
import { useApp } from '../../context.js';
import OIIcon from '../../icons.jsx';

var CATEGORIES = [
  { id: 'incidents',    label: 'Incident Management',  icon: 'error_icon',    count: 5 },
  { id: 'changes',      label: 'Change Management',    icon: 'refresh',       count: 3 },
  { id: 'problems',     label: 'Problem Management',   icon: 'warning_icon',  count: 2 },
  { id: 'requests',     label: 'Service Requests',     icon: 'inbox',         count: 8 },
  { id: 'assets',       label: 'Asset Management',     icon: 'document',      count: 4 },
  { id: 'knowledge',    label: 'Knowledge Base',       icon: 'info_icon',     count: 12 },
];

var CATALOG_ITEMS = {
  incidents: [
    { id: 'inc_new',    name: 'Report Incident',           desc: 'Log a new incident for immediate attention.' },
    { id: 'inc_major',  name: 'Escalate to Major Incident', desc: 'Elevate priority and notify stakeholders.' },
    { id: 'inc_review', name: 'Post-Incident Review',       desc: 'Schedule a PIR for a resolved incident.' },
  ],
  changes: [
    { id: 'chg_std',    name: 'Standard Change Request',   desc: 'Submit a pre-approved standard change.' },
    { id: 'chg_normal', name: 'Normal Change Request',     desc: 'Raise a change requiring CAB approval.' },
    { id: 'chg_emerg',  name: 'Emergency Change',          desc: 'Fast-track an urgent change request.' },
  ],
  problems: [
    { id: 'prb_new',    name: 'New Problem Record',        desc: 'Initiate root cause analysis.' },
    { id: 'prb_workaround', name: 'Request Workaround',   desc: 'Document and share a known workaround.' },
  ],
  requests: [
    { id: 'req_access',  name: 'Access Request',           desc: 'Request system or application access.' },
    { id: 'req_hardware', name: 'Hardware Request',        desc: 'Order hardware for an end user.' },
    { id: 'req_software', name: 'Software Licence',        desc: 'Request a software licence or install.' },
    { id: 'req_onboard',  name: 'Onboarding Request',     desc: 'Prepare a new joiner for day one.' },
  ],
  assets: [
    { id: 'ast_return', name: 'Asset Return',              desc: 'Arrange return of company equipment.' },
    { id: 'ast_repair',  name: 'Repair Request',           desc: 'Send an asset for repair or replacement.' },
  ],
  knowledge: [
    { id: 'kb_new',     name: 'Submit Knowledge Article',  desc: 'Contribute a new article to the knowledge base.' },
    { id: 'kb_review',  name: 'Request Article Review',    desc: 'Flag an article for accuracy review.' },
  ],
};

function SectionContent({ data }) {
  var [activeCat, setActiveCat] = useState('incidents');
  var { callServer, toast } = useApp();
  var [requesting, setRequesting] = useState(null);

  var items = CATALOG_ITEMS[activeCat] || [];

  function requestItem(item) {
    setRequesting(item.id);
    callServer({ action: 'request_operation', category: activeCat, item: item.id, name: item.name })
      .then(function () {
        toast('Request submitted: ' + item.name, 'success');
      })
      .catch(function () {
        toast('Failed to submit request. Please try again.', 'error');
      })
      .finally(function () {
        setRequesting(null);
      });
  }

  return (
    <div className="oi-section">
      <div className="oi-toolbar">
        <h1 className="oi-section-title">Operations Workspace</h1>
      </div>

      <div className="oi-workspace-layout">
        <div className="oi-cat-panel">
          <div className="oi-card">
            <div className="oi-card-hdr"><span className="oi-card-title">Service Catalog</span></div>
            <div className="oi-item-list">
              {CATEGORIES.map(function (cat) {
                return (
                  <button
                    key={cat.id}
                    className={'oi-list-item' + (activeCat === cat.id ? ' selected' : '')}
                    onClick={function () { setActiveCat(cat.id); }}
                  >
                    <div className="oi-list-item-icon">
                      <OIIcon name={cat.icon} size={16} fill="#00BF6F" />
                    </div>
                    <div className="oi-list-item-body">
                      <div className="oi-list-item-title">{cat.label}</div>
                    </div>
                    <span className="oi-list-item-count">{cat.count}</span>
                    <span className="oi-list-item-caret"><OIIcon name="chevron_right" size={14} /></span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="oi-items-panel">
          <div className="oi-card">
            <div className="oi-card-hdr">
              <span className="oi-card-title">
                {CATEGORIES.find(function (c) { return c.id === activeCat; })
                  ? CATEGORIES.find(function (c) { return c.id === activeCat; }).label
                  : 'Items'}
              </span>
            </div>
            {items.length === 0 ? (
              <div className="oi-empty">
                <div className="oi-empty-title">No items available</div>
              </div>
            ) : (
              <div className="oi-catalog-items">
                {items.map(function (item) {
                  return (
                    <div key={item.id} className="oi-catalog-item">
                      <div className="oi-catalog-item-body">
                        <div className="oi-catalog-item-name">{item.name}</div>
                        <div className="oi-catalog-item-desc">{item.desc}</div>
                      </div>
                      <button
                        className="oi-btn primary sm"
                        disabled={requesting === item.id}
                        onClick={function () { requestItem(item); }}
                      >
                        {requesting === item.id ? 'Submitting...' : 'Request'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OperationsWorkspace({ data }) {
  return <SectionContent data={data} />;
}
