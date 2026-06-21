import { useApp } from '../../context/AppContext';
import type { Execution, PendingAction } from '../../types';
import { resolveAction } from '../../api/engine';

function statusDot(status: string) {
  const cls = ['success', 'running', 'pending'].includes(status) ? status : status === 'failed' || status === 'error' ? 'failed' : 'neutral';
  return <span className={`oi-status-dot ${cls}`} />;
}

function relativeTime(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Workspace() {
  const { state, dispatch, toast } = useApp();
  const data = state.sectionData;

  async function handleResolve(action: PendingAction, resolution: string) {
    try {
      await resolveAction(action.sys_id, resolution);
      toast(`Action ${resolution}d successfully.`, 'success');
      const remaining = (data?.pending_actions ?? []).filter(a => a.sys_id !== action.sys_id);
      dispatch({ type: 'PATCH_SECTION_DATA', payload: { pending_actions: remaining } });
    } catch {
      toast('Failed to resolve action.', 'error');
    }
  }

  if (!data) {
    return (
      <div className="oi-empty-state">
        <i className="fa fa-tachometer-alt oi-empty-icon" />
        <div className="oi-empty-title">Loading workspace…</div>
      </div>
    );
  }

  const stats = data.stats ?? {};
  const executions: Execution[] = (data.executions ?? []).slice(0, 5);
  const pending: PendingAction[] = data.pending_actions ?? [];

  return (
    <div className="oi-section-body">
      <div className="oi-stat-row">
        <div className="oi-stat-card">
          <div className="oi-stat-value">{stats.persons ?? 0}</div>
          <div className="oi-stat-label">Enrolled Persons</div>
          <i className="fa fa-users oi-stat-icon" />
        </div>
        <div className="oi-stat-card">
          <div className="oi-stat-value">{stats.automations ?? 0}</div>
          <div className="oi-stat-label">Automations</div>
          <i className="fa fa-robot oi-stat-icon" />
        </div>
        <div className="oi-stat-card">
          <div className="oi-stat-value">{stats.executions_today ?? 0}</div>
          <div className="oi-stat-label">Executions Today</div>
          <i className="fa fa-play-circle oi-stat-icon" />
        </div>
        <div className="oi-stat-card">
          <div className="oi-stat-value">{stats.groups ?? 0}</div>
          <div className="oi-stat-label">Groups</div>
          <i className="fa fa-layer-group oi-stat-icon" />
        </div>
      </div>

      <div className="oi-content-row">
        <div className="oi-card oi-card-grow">
          <div className="oi-card-hdr">
            <span className="oi-card-title">Recent Executions</span>
          </div>
          <div className="oi-card-body">
            {executions.length === 0 ? (
              <div className="oi-empty-inline">No recent executions.</div>
            ) : (
              <table className="oi-table">
                <thead>
                  <tr>
                    <th>Automation</th>
                    <th>Group</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map(ex => (
                    <tr key={ex.sys_id}>
                      <td className="oi-td-primary">{ex.automation_name ?? '—'}</td>
                      <td>{ex.group_name ?? '—'}</td>
                      <td>
                        <span className="oi-exec-status">
                          {statusDot(ex.status)}
                          <span className="oi-status-text">{ex.status}</span>
                        </span>
                      </td>
                      <td className="oi-td-muted">{relativeTime(ex.triggered_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {pending.length > 0 && (
          <div className="oi-card oi-card-side">
            <div className="oi-card-hdr">
              <span className="oi-card-title">Pending Actions</span>
              <span className="oi-badge warning">{pending.length}</span>
            </div>
            <div className="oi-card-body oi-action-list">
              {pending.map(a => (
                <div key={a.sys_id} className="oi-action-item">
                  <div className="oi-action-info">
                    <div className="oi-action-type">{a.type}</div>
                    <div className="oi-action-desc">{a.description ?? a.subject_user_name ?? ''}</div>
                    <div className="oi-action-meta">{relativeTime(a.created)}</div>
                  </div>
                  <div className="oi-action-btns">
                    <button className="oi-btn primary xs" onClick={() => handleResolve(a, 'approve')}>Approve</button>
                    <button className="oi-btn danger xs" onClick={() => handleResolve(a, 'reject')}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
