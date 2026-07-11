import React from 'react';
import { ADMIN_CATS } from '../../data.js';
import Chip from '../Chip.jsx';

const PROPS = [
  { name: 'x_infte_ops_int.engine_key',       value: '••••••••••••••••',      ok: true },
  { name: 'x_infte_ops_int.assist_api_endpoint', value: '(not set)',          ok: false },
  { name: 'x_infte_ops_int.svc_password',      value: '••••••••••••••••',     ok: true },
];

const Admin = React.memo(function Admin() {
  return (
    <div>
      <div className="section-title">System Properties</div>
      <div className="card" style={{ marginBottom: '20px', padding: '0 16px' }}>
        {PROPS.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < PROPS.length - 1 ? '1px solid #1e2942' : 'none' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8', flex: 1 }}>{p.name}</span>
            <span style={{ fontSize: '12px', color: p.ok ? '#64748b' : '#ef4444' }}>{p.value}</span>
            <Chip status={p.ok ? 'live' : 'pending'} label={p.ok ? 'set' : 'missing'} />
          </div>
        ))}
      </div>

      {ADMIN_CATS.map(cat => (
        <div key={cat.title} style={{ marginBottom: '20px' }}>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
            {cat.title}
          </div>
          <div className="card" style={{ padding: '0 16px' }}>
            {cat.items.map((item, i) => (
              <div key={i} className="admin-item">
                <span className="admin-dot" style={{ background: cat.color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="admin-name">{item.name}</div>
                  <div className="admin-desc">{item.desc}</div>
                </div>
                <span className="admin-type">{item.type}</span>
                <Chip status={item.status} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

export default Admin;
