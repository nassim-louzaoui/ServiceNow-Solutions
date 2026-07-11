import React, { useDeferredValue, useMemo } from 'react';
import { useApp } from '../../context.js';
import { AUTO_CATS } from '../../data.js';
import { Icons } from '../../icons.js';
import Chip from '../Chip.jsx';

const AutoItem = React.memo(function AutoItem({ item }) {
  return (
    <div className="auto-item">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card-title">{item.name}</div>
        <div className="card-desc" style={{ marginTop: '4px' }}>{item.desc}</div>
        <div className="auto-meta">
          <span className="auto-tag">{item.type}</span>
          <span>{item.date}</span>
        </div>
      </div>
      <Chip status={item.status} />
    </div>
  );
});

const Automations = React.memo(function Automations() {
  const { state, dispatch } = useApp();
  const deferred = useDeferredValue(state.searchTerm);

  const filtered = useMemo(() => {
    if (!deferred) return AUTO_CATS;
    const q = deferred.toLowerCase();
    return AUTO_CATS
      .map(cat => ({ ...cat, items: cat.items.filter(i => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)) }))
      .filter(cat => cat.items.length > 0);
  }, [deferred]);

  const counts = useMemo(() => {
    const all = AUTO_CATS.flatMap(c => c.items);
    return {
      live:    all.filter(i => i.status === 'live').length,
      review:  all.filter(i => i.status === 'review').length,
      draft:   all.filter(i => i.status === 'draft').length,
      pending: all.filter(i => i.status === 'pending').length,
    };
  }, []);

  return (
    <div>
      <div className="grid3" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-num">{counts.live}</div>
          <div className="stat-label">Live</div>
          <div className="stat-delta">&#9650; Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{counts.review + counts.draft}</div>
          <div className="stat-label">In Review / Draft</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{counts.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="search-wrap">
        <Icons.search />
        <input
          className="search-input"
          placeholder="Search automations..."
          value={state.searchTerm}
          onChange={e => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
        />
      </div>

      {filtered.map(cat => (
        <div key={cat.title} style={{ marginBottom: '20px' }}>
          <div className="section-title">{cat.title}</div>
          {cat.items.map(item => <AutoItem key={item.name} item={item} />)}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', padding: '40px 0' }}>No automations match your search.</div>
      )}
    </div>
  );
});

export default Automations;
