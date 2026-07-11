import React, { useDeferredValue, useMemo, useCallback } from 'react';
import { useApp } from '../../context.js';
import { OP_CATS } from '../../data.js';
import { Icons } from '../../icons.js';

const CatalogItem = React.memo(function CatalogItem({ item, onSelect }) {
  const handleClick = useCallback(() => onSelect(item), [item, onSelect]);
  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={handleClick}>
      <div className="card-title">{item.name}</div>
      <div className="card-desc">{item.desc}</div>
    </div>
  );
});

const Operations = React.memo(function Operations() {
  const { state, dispatch } = useApp();
  const deferred = useDeferredValue(state.searchTerm);

  const filtered = useMemo(() => {
    if (!deferred) return OP_CATS;
    const q = deferred.toLowerCase();
    return OP_CATS
      .map(cat => ({ ...cat, items: cat.items.filter(i => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)) }))
      .filter(cat => cat.items.length > 0);
  }, [deferred]);

  const handleSelect = useCallback(item => dispatch({ type: 'SELECT_ITEM', payload: item }), [dispatch]);

  return (
    <div>
      <div className="search-wrap">
        <Icons.search />
        <input
          className="search-input"
          placeholder="Search service catalog..."
          value={state.searchTerm}
          onChange={e => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
        />
      </div>

      {filtered.map(cat => (
        <div key={cat.title} style={{ marginBottom: '20px' }}>
          <div className="section-title">{cat.title}</div>
          {cat.items.map(item => (
            <CatalogItem key={item.name} item={item} onSelect={handleSelect} />
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', padding: '40px 0' }}>
          No items match your search.
        </div>
      )}

      {state.selectedItem && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '340px',
          background: '#1e2942', border: '1px solid #3b82f6', borderRadius: '12px',
          padding: '16px 20px', maxWidth: '340px', boxShadow: '0 8px 32px rgba(0,0,0,.5)',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{state.selectedItem.name}</span>
            <button
              onClick={() => dispatch({ type: 'SELECT_ITEM', payload: null })}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex' }}>
              <Icons.close />
            </button>
          </div>
          <div style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '12px' }}>{state.selectedItem.desc}</div>
          <button className="btn btn-approve" style={{ width: '100%', justifyContent: 'center' }}>
            Submit Request
          </button>
        </div>
      )}
    </div>
  );
});

export default Operations;
