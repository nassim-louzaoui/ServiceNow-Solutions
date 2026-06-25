import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';
import { useApp } from '../../context.js';
import Badge from '../Badge.jsx';
import { statusClass, relTime } from '../../helpers.js';

export default function CommandSection(props) {
  var data = props.data || {};
  var ctx = useApp();
  var executions = data.executions || [];
  var summary = data.summary || {};

  var [selected, setSelected] = useState(null);
  var [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    ctx.loadSection('command');
    setTimeout(function () { setRefreshing(false); }, 800);
  }

  function handleApprove(exec) {
    ctx.callServer({ action: 'approve_execution', execution_sys_id: exec.sys_id }).then(function (res) {
      var d = res && res.data ? res.data : res;
      ctx.toast((d && d.message) || 'Approved.', 'success');
      setSelected(null);
      ctx.loadSection('command');
    }).catch(function (err) {
      ctx.toast((err && err.message) || 'Approval failed.', 'error');
    });
  }

  function handleReject(exec) {
    ctx.callServer({ action: 'reject_execution', execution_sys_id: exec.sys_id }).then(function (res) {
      var d = res && res.data ? res.data : res;
      ctx.toast((d && d.message) || 'Rejected.', 'success');
      setSelected(null);
      ctx.loadSection('command');
    }).catch(function (err) {
      ctx.toast((err && err.message) || 'Rejection failed.', 'error');
    });
  }

  var running = executions.filter(function (e) { return e.state === 'running' || e.state === 'executing'; });
  var pending = executions.filter(function (e) { return e.state === 'pending' || e.state === 'waiting'; });
  var recent = executions.filter(function (e) {
    return e.state !== 'running' && e.state !== 'executing' && e.state !== 'pending' && e.state !== 'waiting';
  });

  return (
    <div className="oi-section">
      <div className="oi-section-header">
        <div>
          <h1 className="oi-section-title">Operations Command</h1>
          <p className="oi-section-subtitle">Monitor, approve, and track automation executions.</p>
        </div>
        <button className="oi-btn ghost" onClick={handleRefresh} disabled={refreshing}>
          <OIIcon name="refresh" size={16} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="oi-stat-row">
        <div className="oi-stat-card">
          <div className="oi-stat-val">{summary.total_today !== undefined ? summary.total_today : executions.length}</div>
          <div className="oi-stat-label">Total Today</div>
        </div>
        <div className="oi-stat-card">
          <div className="oi-stat-val success">{summary.succeeded !== undefined ? summary.succeeded : 0}</div>
          <div className="oi-stat-label">Succeeded</div>
        </div>
        <div className="oi-stat-card">
          <div className="oi-stat-val warning">{running.length}</div>
          <div className="oi-stat-label">Running</div>
        </div>
        <div className="oi-stat-card">
          <div className="oi-stat-val error">{summary.failed !== undefined ? summary.failed : 0}</div>
          <div className="oi-stat-label">Failed</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="oi-cmd-section">
          <div className="oi-cmd-section-title">
            <OIIcon name="warning_icon" size={16} fill="#E57323" />
            Pending Approval
            <Badge cls="warning">{pending.length}</Badge>
          </div>
          <div className="oi-card">
            <table className="oi-table">
              <thead>
                <tr>
                  <th>Automation</th>
                  <th>Requested By</th>
                  <th>Group</th>
                  <th>Requested</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map(function (exec) {
                  return (
                    <tr key={exec.sys_id || exec.name}>
                      <td>
                        <div className="oi-table-cell-primary">{exec.automation_name || exec.name}</div>
                      </td>
                      <td>{exec.requested_by || '—'}</td>
                      <td>{exec.group_name || '—'}</td>
                      <td>{exec.requested_at ? relTime(exec.requested_at) : relTime(exec.sys_created_on)}</td>
                      <td>
                        <div className="oi-action-btns">
                          <button className="oi-btn primary xs" onClick={function () { handleApprove(exec); }}>
                            <OIIcon name="approve" size={14} />
                            Approve
                          </button>
                          <button className="oi-btn ghost xs" onClick={function () { handleReject(exec); }}>
                            <OIIcon name="reject" size={14} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {running.length > 0 && (
        <div className="oi-cmd-section">
          <div className="oi-cmd-section-title">
            <div className="oi-pulse-dot" />
            Active Executions
          </div>
          <div className="oi-card">
            <table className="oi-table">
              <thead>
                <tr>
                  <th>Automation</th>
                  <th>Triggered By</th>
                  <th>Group</th>
                  <th>Started</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {running.map(function (exec) {
                  return (
                    <tr key={exec.sys_id || exec.name} onClick={function () { setSelected(exec); }} style={{ cursor: 'pointer' }}>
                      <td><div className="oi-table-cell-primary">{exec.automation_name || exec.name}</div></td>
                      <td>{exec.triggered_by || exec.requested_by || '—'}</td>
                      <td>{exec.group_name || '—'}</td>
                      <td>{exec.started_at ? relTime(exec.started_at) : relTime(exec.sys_created_on)}</td>
                      <td><Badge cls="warning">Running</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="oi-cmd-section">
        <div className="oi-cmd-section-title">Execution History</div>
        {recent.length === 0 && running.length === 0 && pending.length === 0 ? (
          <div className="oi-empty">
            <OIIcon name="command" size={40} />
            <div className="oi-empty-title">No executions yet</div>
            <div className="oi-empty-desc">Automation runs will appear here.</div>
          </div>
        ) : recent.length === 0 ? (
          <div className="oi-empty-inline">No completed executions yet.</div>
        ) : (
          <div className="oi-card">
            <table className="oi-table">
              <thead>
                <tr>
                  <th>Automation</th>
                  <th>Triggered By</th>
                  <th>Group</th>
                  <th>Completed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(function (exec) {
                  return (
                    <tr key={exec.sys_id || exec.name} onClick={function () { setSelected(exec); }} style={{ cursor: 'pointer' }}>
                      <td><div className="oi-table-cell-primary">{exec.automation_name || exec.name}</div></td>
                      <td>{exec.triggered_by || exec.requested_by || '—'}</td>
                      <td>{exec.group_name || '—'}</td>
                      <td>{exec.completed_at ? relTime(exec.completed_at) : (exec.sys_updated_on ? relTime(exec.sys_updated_on) : '—')}</td>
                      <td><Badge cls={statusClass(exec.state)}>{exec.state || 'Unknown'}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="oi-modal-overlay" onClick={function () { setSelected(null); }}>
          <div className="oi-modal" onClick={function (e) { e.stopPropagation(); }}>
            <div className="oi-modal-header">
              <div className="oi-modal-title">{selected.automation_name || selected.name}</div>
              <button className="oi-modal-close" onClick={function () { setSelected(null); }}>
                <OIIcon name="close" size={18} />
              </button>
            </div>
            <div className="oi-modal-body">
              <div className="oi-detail-rows">
                <div className="oi-detail-row">
                  <span className="oi-detail-label">Status</span>
                  <Badge cls={statusClass(selected.state)}>{selected.state || 'Unknown'}</Badge>
                </div>
                {selected.group_name && (
                  <div className="oi-detail-row">
                    <span className="oi-detail-label">Group</span>
                    <span className="oi-detail-value">{selected.group_name}</span>
                  </div>
                )}
                {(selected.triggered_by || selected.requested_by) && (
                  <div className="oi-detail-row">
                    <span className="oi-detail-label">Triggered By</span>
                    <span className="oi-detail-value">{selected.triggered_by || selected.requested_by}</span>
                  </div>
                )}
                {selected.output && (
                  <div className="oi-detail-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                    <span className="oi-detail-label">Output</span>
                    <pre className="oi-code-block">{selected.output}</pre>
                  </div>
                )}
                {selected.error && (
                  <div className="oi-detail-row" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                    <span className="oi-detail-label">Error</span>
                    <pre className="oi-code-block error">{selected.error}</pre>
                  </div>
                )}
              </div>
            </div>
            <div className="oi-modal-footer">
              <button className="oi-btn ghost" onClick={function () { setSelected(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
