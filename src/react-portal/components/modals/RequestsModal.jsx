import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';
import { useApp } from '../../context.js';
import Badge from '../Badge.jsx';
import { statusClass, relTime } from '../../helpers.js';

export default function RequestsModal() {
  var ctx = useApp();
  var state = ctx.state;
  var requests = (state.sectionData && state.sectionData.requests) || state.requests || [];

  var [loading, setLoading] = useState(false);
  var [selected, setSelected] = useState(null);

  function handleClose() {
    ctx.dispatch({ type: 'CLOSE_REQUESTS' });
  }

  function handleLoadRequests() {
    setLoading(true);
    ctx.callServer({ action: 'load_requests' }).then(function (res) {
      setLoading(false);
      var d = res && res.data ? res.data : res;
      ctx.dispatch({ type: 'SET_REQUESTS', payload: d.requests || [] });
    }).catch(function () {
      setLoading(false);
    });
  }

  if (!state.showRequests) { return null; }

  return (
    <div className="oi-modal-overlay" onClick={handleClose}>
      <div className="oi-modal oi-requests-modal" onClick={function (e) { e.stopPropagation(); }}>
        <div className="oi-modal-header">
          <div className="oi-modal-title">
            <OIIcon name="inbox" size={18} fill="#00BF6F" />
            My Requests
          </div>
          <button className="oi-modal-close" onClick={handleClose}>
            <OIIcon name="close" size={18} />
          </button>
        </div>
        <div className="oi-modal-body">
          {loading ? (
            <div className="oi-loading-center">
              <div className="oi-spinner" />
              <span>Loading requests…</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="oi-empty">
              <OIIcon name="request" size={36} />
              <div className="oi-empty-title">No requests</div>
              <div className="oi-empty-desc">You have no pending or recent requests.</div>
              <button className="oi-btn ghost" style={{ marginTop: '1rem' }} onClick={handleLoadRequests}>
                Check for Requests
              </button>
            </div>
          ) : (
            <div className="oi-requests-list">
              {requests.map(function (req) {
                return (
                  <div
                    key={req.sys_id || req.number}
                    className="oi-request-item"
                    onClick={function () { setSelected(selected && selected.sys_id === req.sys_id ? null : req); }}
                  >
                    <div className="oi-request-item-header">
                      <div className="oi-request-item-name">
                        {req.number && <span className="oi-request-number">{req.number}</span>}
                        {req.name || req.short_description || req.automation_name}
                      </div>
                      <Badge cls={statusClass(req.state || req.status)}>{req.state || req.status || 'Unknown'}</Badge>
                    </div>
                    {req.requested_at && (
                      <div className="oi-request-item-meta">
                        Requested {relTime(req.requested_at)}
                        {req.group_name && ' · ' + req.group_name}
                      </div>
                    )}
                    {selected && selected.sys_id === req.sys_id && (
                      <div className="oi-request-detail">
                        {req.description && <p className="oi-request-desc">{req.description}</p>}
                        <div className="oi-detail-rows">
                          {req.approved_by && (
                            <div className="oi-detail-row">
                              <span className="oi-detail-label">Approved By</span>
                              <span className="oi-detail-value">{req.approved_by}</span>
                            </div>
                          )}
                          {req.completed_at && (
                            <div className="oi-detail-row">
                              <span className="oi-detail-label">Completed</span>
                              <span className="oi-detail-value">{relTime(req.completed_at)}</span>
                            </div>
                          )}
                          {req.output && (
                            <div className="oi-detail-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                              <span className="oi-detail-label">Result</span>
                              <pre className="oi-code-block">{req.output}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="oi-modal-footer">
          <button className="oi-btn ghost" onClick={handleClose}>Close</button>
          {requests.length > 0 && (
            <button className="oi-btn ghost" onClick={handleLoadRequests} disabled={loading}>
              <OIIcon name="refresh" size={14} />
              Refresh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
