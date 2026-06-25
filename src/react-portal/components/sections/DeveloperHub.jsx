import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';

var MAIN_TABS = [
  { id: 'inventory', label: 'Application Inventory' },
  { id: 'journal',   label: 'Execution Journal', count: '1,247' },
];

var SUB_TABS = [
  { id: 'tables',     label: 'Tables',          count: 8  },
  { id: 'scripts',    label: 'Script Includes', count: 12 },
  { id: 'rules',      label: 'Business Rules',  count: 6  },
  { id: 'jobs',       label: 'Scheduled Jobs',  count: 4  },
  { id: 'properties', label: 'Properties',      count: 15 },
  { id: 'roles',      label: 'Roles',           count: 5  },
];

var DATA = {
  tables: [
    { name: 'Service Catalog Items',       api: 'x_infte_ops_int_catalog_item',      records: 24,    scope: 'X_INFTE_OPS_INT', updated: '1d ago'  },
    { name: 'Service Catalog Categories',  api: 'x_infte_ops_int_catalog_category',  records: 5,     scope: 'X_INFTE_OPS_INT', updated: '5d ago'  },
    { name: 'Creator Projects',            api: 'x_infte_ops_int_creator_project',   records: 4,     scope: 'X_INFTE_OPS_INT', updated: '5d ago'  },
    { name: 'Creator Sessions',            api: 'x_infte_ops_int_creator_session',   records: 11,    scope: 'X_INFTE_OPS_INT', updated: '2d ago'  },
    { name: 'Persons',                     api: 'x_infte_ops_int_person',            records: 18,    scope: 'X_INFTE_OPS_INT', updated: '1d ago'  },
    { name: 'Audit Events',                api: 'x_infte_ops_int_audit',             records: 3841,  scope: 'X_INFTE_OPS_INT', updated: '1h ago'  },
    { name: 'Governance Actions',          api: 'x_infte_ops_int_gov_action',        records: 9,     scope: 'X_INFTE_OPS_INT', updated: '5h ago'  },
    { name: 'Notification Queue',          api: 'x_infte_ops_int_notification',      records: 142,   scope: 'X_INFTE_OPS_INT', updated: '1d ago'  },
  ],
  scripts: [
    { name: 'Operations Intelligence Engine',  type: 'Script Include', scope: 'x_infte_ops_int', updated: '2 days ago'  },
    { name: 'Execution Log Handler',           type: 'Script Include', scope: 'x_infte_ops_int', updated: '1 week ago'  },
    { name: 'Automation Trigger Utility',      type: 'Script Include', scope: 'x_infte_ops_int', updated: '3 days ago'  },
    { name: 'Creator Assist Bridge',           type: 'Script Include', scope: 'x_infte_ops_int', updated: '2 days ago'  },
    { name: 'Governance Action Handler',       type: 'Script Include', scope: 'x_infte_ops_int', updated: '5 days ago'  },
    { name: 'Notification Queue Processor',    type: 'Script Include', scope: 'x_infte_ops_int', updated: '1 day ago'   },
    { name: 'Catalogue Item Builder',          type: 'Script Include', scope: 'x_infte_ops_int', updated: '1 week ago'  },
    { name: 'Person Identity Resolver',        type: 'Script Include', scope: 'x_infte_ops_int', updated: '4 days ago'  },
    { name: 'Audit Event Writer',              type: 'Script Include', scope: 'x_infte_ops_int', updated: '1 day ago'   },
    { name: 'SLA Breach Detector',             type: 'Script Include', scope: 'x_infte_ops_int', updated: '3 days ago'  },
    { name: 'Change Risk Scorer',              type: 'Script Include', scope: 'x_infte_ops_int', updated: '6 days ago'  },
    { name: 'Dispatch Router',                 type: 'Script Include', scope: 'x_infte_ops_int', updated: '2 days ago'  },
  ],
  rules: [
    { name: 'Auto-Assign Incident on Insert',        table: 'incident',                        when: 'before insert', active: true  },
    { name: 'Log Execution on State Change',         table: 'x_infte_ops_int_audit',           when: 'after update',  active: true  },
    { name: 'Validate Automation Name',              table: 'x_infte_ops_int_catalog_item',    when: 'before insert', active: false },
    { name: 'Governance Action on Approval',         table: 'x_infte_ops_int_gov_action',      when: 'after insert',  active: true  },
    { name: 'Notify Creator on Project Submit',      table: 'x_infte_ops_int_creator_project', when: 'after update',  active: true  },
    { name: 'Clear Notification on Send',            table: 'x_infte_ops_int_notification',    when: 'after update',  active: true  },
  ],
  jobs: [
    { name: 'SLA Breach Scanner',       schedule: 'Every 15 minutes', active: true,  last_run: '8 min ago'   },
    { name: 'Knowledge Article Expiry', schedule: 'Daily at 01:00',   active: true,  last_run: 'Yesterday'   },
    { name: 'Execution Log Cleanup',    schedule: 'Weekly',           active: false, last_run: '2 weeks ago' },
    { name: 'Audit Archiver',           schedule: 'Monthly',          active: true,  last_run: '12 days ago' },
  ],
  properties: [
    { name: 'x_infte_ops_int.engine_key',      value: '••••••••••••', desc: 'Engine API authentication key'        },
    { name: 'x_infte_ops_int.svc_password',    value: '••••••••••••', desc: 'Service account password'             },
    { name: 'x_infte_ops_int.default_module',  value: 'workspace',    desc: 'Default portal module'                },
    { name: 'x_infte_ops_int.assist_api_endpoint', value: '',         desc: 'Creator Assistant API endpoint'       },
    { name: 'x_infte_ops_int.log_level',       value: 'info',         desc: 'Engine logging verbosity'             },
  ],
  roles: [
    { name: 'x_infte_ops_int.leadership',    desc: 'Leadership access for executive insights'      },
    { name: 'x_infte_ops_int.administrator', desc: 'Full administrator access'                     },
    { name: 'x_infte_ops_int.developer',     desc: 'Developer access to artifact management'       },
    { name: 'x_infte_ops_int.creator',       desc: 'Creator access for building automations'       },
    { name: 'x_infte_ops_int.member',        desc: 'Standard member access to Operations Workspace' },
  ],
};

export default function DeveloperHub({ data }) {
  var [mainTab, setMainTab] = useState('inventory');
  var [subTab, setSubTab]   = useState('tables');
  var items = DATA[subTab] || [];

  return (
    <div className="oi-section">
      <div className="oi-dev-main-tabs">
        {MAIN_TABS.map(function (t) {
          return (
            <button
              key={t.id}
              className={'oi-dev-main-tab' + (mainTab === t.id ? ' active' : '')}
              onClick={function () { setMainTab(t.id); }}
            >
              {t.label}
              {t.count && <span className="oi-dev-tab-count">{t.count}</span>}
            </button>
          );
        })}
      </div>

      {mainTab === 'inventory' && (
        <div className="oi-card">
          <div className="oi-subtabs">
            {SUB_TABS.map(function (t) {
              return (
                <button
                  key={t.id}
                  className={'oi-subtab' + (subTab === t.id ? ' active' : '')}
                  onClick={function () { setSubTab(t.id); }}
                >
                  {t.label}
                  <span className="oi-subtab-count">{t.count}</span>
                </button>
              );
            })}
          </div>

          <div className="oi-subtab-body">
            {subTab === 'tables' && (
              <table className="oi-table">
                <thead>
                  <tr><th>Table Name</th><th>API Name</th><th>Records</th><th>Scope</th><th>Updated</th></tr>
                </thead>
                <tbody>
                  {items.map(function (r) {
                    return (
                      <tr key={r.api}>
                        <td><span className="oi-td-primary">{r.name}</span></td>
                        <td><span className="oi-td-mono">{r.api}</span></td>
                        <td>{r.records.toLocaleString()}</td>
                        <td><span className="oi-scope-tag">{r.scope}</span></td>
                        <td className="oi-td-muted">{r.updated}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {subTab === 'scripts' && (
              <table className="oi-table">
                <thead><tr><th>Name</th><th>Type</th><th>Scope</th><th>Updated</th></tr></thead>
                <tbody>
                  {items.map(function (r) {
                    return (
                      <tr key={r.name}>
                        <td><span className="oi-td-primary">{r.name}</span></td>
                        <td>{r.type}</td>
                        <td><span className="oi-tag">{r.scope}</span></td>
                        <td className="oi-td-muted">{r.updated}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {subTab === 'rules' && (
              <table className="oi-table">
                <thead><tr><th>Name</th><th>Table</th><th>When</th><th>Active</th></tr></thead>
                <tbody>
                  {items.map(function (r) {
                    return (
                      <tr key={r.name}>
                        <td><span className="oi-td-primary">{r.name}</span></td>
                        <td><span className="oi-td-mono">{r.table}</span></td>
                        <td>{r.when}</td>
                        <td>
                          <span className={'oi-badge ' + (r.active ? 'success' : 'neutral')}>
                            {r.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {subTab === 'jobs' && (
              <table className="oi-table">
                <thead><tr><th>Name</th><th>Schedule</th><th>Last Run</th><th>Status</th></tr></thead>
                <tbody>
                  {items.map(function (r) {
                    return (
                      <tr key={r.name}>
                        <td><span className="oi-td-primary">{r.name}</span></td>
                        <td>{r.schedule}</td>
                        <td className="oi-td-muted">{r.last_run}</td>
                        <td>
                          <span className={'oi-badge ' + (r.active ? 'success' : 'neutral')}>
                            {r.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {subTab === 'properties' && (
              <table className="oi-table">
                <thead><tr><th>Property</th><th>Value</th><th>Description</th></tr></thead>
                <tbody>
                  {items.map(function (r) {
                    return (
                      <tr key={r.name}>
                        <td><span className="oi-td-mono">{r.name}</span></td>
                        <td><span className="oi-td-mono" style={{ color: '#6E6E6E' }}>{r.value || '—'}</span></td>
                        <td className="oi-td-muted">{r.desc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {subTab === 'roles' && (
              <table className="oi-table">
                <thead><tr><th>Role Name</th><th>Description</th></tr></thead>
                <tbody>
                  {items.map(function (r) {
                    return (
                      <tr key={r.name}>
                        <td><span className="oi-td-mono">{r.name}</span></td>
                        <td className="oi-td-muted">{r.desc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {mainTab === 'journal' && (
        <div className="oi-card">
          <div className="oi-empty" style={{ padding: '3rem' }}>
            <div className="oi-empty-title">Execution Journal</div>
            <div className="oi-empty-sub">1,247 execution records — full log viewer coming soon.</div>
          </div>
        </div>
      )}
    </div>
  );
}
