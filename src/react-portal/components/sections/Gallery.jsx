import React, { useState, useEffect } from 'react';
import OIIcon from '../../icons.jsx';
import { useApp } from '../../context.js';
import Badge from '../Badge.jsx';
import { statusClass } from '../../helpers.js';

export default function GallerySection(props) {
  var data = props.data || {};
  var ctx = useApp();
  var operations = data.operations || [];

  var [search, setSearch] = useState('');
  var [filterType, setFilterType] = useState('all');
  var [selected, setSelected] = useState(null);
  var [requestBusy, setRequestBusy] = useState(false);

  var types = ['all'];
  operations.forEach(function (op) {
    if (op.type && types.indexOf(op.type) === -1) {
      types.push(op.type);
    }
  });

  var filtered = operations.filter(function (op) {
    var matchSearch = !search ||
      (op.name && op.name.toLowerCase().indexOf(search.toLowerCase()) !== -1) ||
      (op.description && op.description.toLowerCase().indexOf(search.toLowerCase()) !== -1);
    var matchType = filterType === 'all' || op.type === filterType;
    return matchSearch && matchType;
  });

  function handleRequest(op) {
    setRequestBusy(true);
    ctx.callServer({ action: 'request_operation', operation_sys_id: op.sys_id }).then(function (res) {
      setRequestBusy(false);
      var d = res && res.data ? res.data : res;
      ctx.toast((d && d.message) || 'Access requested.', 'success');
      setSelected(null);
    }).catch(function (err) {
      setRequestBusy(false);
      ctx.toast((err && err.message) || 'Request failed.', 'error');
    });
  }

  return (
    <div className="oi-section">
      <div className="oi-section-header">
        <h1 className="oi-section-title">Operations Gallery</h1>
        <p className="oi-section-subtitle">Browse and request access to available operations.</p>
      </div>

      <div className="oi-gallery-toolbar">
        <div className="oi-search-wrap">
          <OIIcon name="search" size={16} />
          <input
            className="oi-search-input"
            type="text"
            placeholder="Search operations…"
            value={search}
            onChange={function (e) { setSearch(e.target.value); }}
          />
        </div>
        <div className="oi-filter-chips">
          {types.map(function (t) {
            return (
              <button
                key={t}
                className={'oi-filter-chip' + (filterType === t ? ' active' : '')}
                onClick={function () { setFilterType(t); }}
              >
                {t === 'all' ? 'All' : t}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="oi-empty">
          <OIIcon name="gallery" size={40} />
          <div className="oi-empty-title">No operations found</div>
          <div className="oi-empty-desc">Try adjusting your search or filter.</div>
        </div>
      ) : (
        <div className="oi-gallery-grid">
          {filtered.map(function (op) {
            return (
              <div
                key={op.sys_id || op.name}
                className="oi-gallery-card"
                onClick={function () { setSelected(op); }}
              >
                <div className="oi-gallery-card-header">
                  <div className="oi-gallery-card-icon">
                    <OIIcon name={op.icon || 'automation'} size={22} fill="#00BF6F" />
                  </div>
                  <Badge cls={statusClass(op.status)}>{op.status || 'Active'}</Badge>
                </div>
                <div className="oi-gallery-card-name">{op.name}</div>
                {op.description && (
                  <div className="oi-gallery-card-desc">{op.description}</div>
                )}
                <div className="oi-gallery-card-meta">
                  {op.type && <span className="oi-gallery-card-type">{op.type}</span>}
                  {op.owner && <span className="oi-gallery-card-owner">{op.owner}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="oi-modal-overlay" onClick={function () { setSelected(null); }}>
          <div className="oi-modal" onClick={function (e) { e.stopPropagation(); }}>
            <div className="oi-modal-header">
              <div className="oi-modal-title">{selected.name}</div>
              <button className="oi-modal-close" onClick={function () { setSelected(null); }}>
                <OIIcon name="close" size={18} />
              </button>
            </div>
            <div className="oi-modal-body">
              {selected.description && <p className="oi-modal-desc">{selected.description}</p>}
              <div className="oi-detail-rows">
                {selected.type && (
                  <div className="oi-detail-row">
                    <span className="oi-detail-label">Type</span>
                    <span className="oi-detail-value">{selected.type}</span>
                  </div>
                )}
                {selected.owner && (
                  <div className="oi-detail-row">
                    <span className="oi-detail-label">Owner</span>
                    <span className="oi-detail-value">{selected.owner}</span>
                  </div>
                )}
                {selected.status && (
                  <div className="oi-detail-row">
                    <span className="oi-detail-label">Status</span>
                    <Badge cls={statusClass(selected.status)}>{selected.status}</Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="oi-modal-footer">
              <button className="oi-btn ghost" onClick={function () { setSelected(null); }}>Close</button>
              {selected.has_access ? (
                <button className="oi-btn primary" disabled>Access Granted</button>
              ) : (
                <button
                  className="oi-btn primary"
                  disabled={requestBusy}
                  onClick={function () { handleRequest(selected); }}
                >
                  {requestBusy ? <div className="oi-spinner sm" /> : 'Request Access'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
