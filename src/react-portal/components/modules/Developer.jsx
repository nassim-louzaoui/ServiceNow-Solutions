import React, { useCallback } from 'react';
import { useApp } from '../../context.js';
import { DEV_TABLES } from '../../data.js';

const SCRIPT_INCLUDES = [
  { name: 'Operations Intelligence Engine',  scope: 'x_infte_ops_int', methods: ['dispatch', 'ping', 'help'],                    upd: '1d ago' },
  { name: 'Creator Assist Bridge',           scope: 'x_infte_ops_int', methods: ['generateSpec', 'hasActiveToken'],              upd: '2d ago' },
  { name: 'Governance Controller',           scope: 'x_infte_ops_int', methods: ['approve', 'deny', 'escalate', 'listPending'], upd: '5d ago' },
];

const TABS = ['tables', 'scripts'];
const TAB_LABELS = { tables: 'Tables', scripts: 'Script Includes' };

const Developer = React.memo(function Developer() {
  const { state, dispatch } = useApp();
  const setTab = useCallback(tab => dispatch({ type: 'SET_DEV_TAB', payload: tab }), [dispatch]);

  return (
    <div>
      <div className="tabs" style={{ maxWidth: '280px' }}>
        {TABS.map(t => (
          <button
            key={t}
            className={`tab-btn${state.devTab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {state.devTab === 'tables' && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Table Name</th>
                <th>API Name</th>
                <th>Records</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {DEV_TABLES.map(t => (
                <tr key={t.api}>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#94a3b8' }}>{t.api}</td>
                  <td style={{ color: '#64748b' }}>{t.rec}</td>
                  <td style={{ color: '#475569' }}>{t.upd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state.devTab === 'scripts' && (
        <div>
          {SCRIPT_INCLUDES.map(s => (
            <div className="card" key={s.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div className="card-title">{s.name}</div>
                <span className="dev-meta">{s.upd}</span>
              </div>
              <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#94a3b8', marginBottom: '8px' }}>{s.scope}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {s.methods.map(m => (
                  <span key={m} style={{ background: '#1e2942', color: '#64748b', borderRadius: '4px', padding: '2px 8px', fontSize: '11.5px', fontFamily: 'monospace' }}>
                    {m}()
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default Developer;
