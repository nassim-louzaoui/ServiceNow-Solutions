import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Execution, Automation, StepEntry } from '../../types';
import { triggerAutomation, loadStepLog } from '../../api/engine';

const STATUS_CLASS: Record<string, string> = {
  success: 'success', running: 'running', pending: 'pending',
  failed: 'failed', error: 'failed', cancelled: 'neutral', skipped: 'neutral',
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`oi-badge ${STATUS_CLASS[status] ?? 'neutral'}`}>{status}</span>;
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

export default function Activity() {
  const { state, dispatch, toast } = useApp();
  const data = state.sectionData;
  const [selected, setSelected] = useState<Execution | null>(null);
  const [stepLog, setStepLog] = useState<StepEntry[] | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [showTrigger, setShowTrigger] = useState(false);
  const [trigAutomation, setTrigAutomation] = useState('');
  const [trigGroup, setTrigGroup] = useState('');
  const [triggering, setTriggering] = useState(false);

  const executions: Execution[] = data?.executions ?? [];
  const automations: Automation[] = data?.automations ?? [];
  const groups = state.init?.userGroups ?? [];

  async function openLog(ex: Execution) {
    setSelected(ex);
    setStepLog(null);
    setLogLoading(true);
    try {
      const res = await loadStepLog(ex.sys_id);
      setStepLog((res.steps as StepEntry[]) ?? []);
    } catch {
      toast('Failed to load step log.', 'error');
      setStepLog([]);
    } finally {
      setLogLoading(false);
    }
  }

  async function handleTrigger() {
    if (!trigAutomation || !trigGroup) {
      toast('Select an automation and group.', 'warning');
      return;
    }
    setTriggering(true);
    try {
      const res = await triggerAutomation(trigAutomation, trigGroup);
      toast('Automation triggered successfully.', 'success');
      setShowTrigger(false);
      setTrigAutomation('');
      setTrigGroup('');
      if (res.execution) {
        dispatch({
          type: 'PATCH_SECTION_DATA',
          payload: { executions: [res.execution as Execution, ...executions] },
        });
      }
    } catch {
      toast('Failed to trigger automation.', 'error');
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="oi-section-body">
      <div className="oi-section-toolbar">
        <div className="oi-section-toolbar-left">
          <h2 className="oi-section-heading">Execution Activity</h2>
          <span className="oi-count-pill">{executions.length}</span>
        </div>
        <div className="oi-section-toolbar-right">
          <button className="oi-btn primary sm" onClick={() => setShowTrigger(true)}>
            <i className="fa fa-play" /> Trigger Automation
          </button>
        </div>
      </div>

      {showTrigger && (
        <div className="oi-panel mb16">
          <div className="oi-panel-hdr">
            <span className="oi-panel-title">Trigger Automation</span>
            <button className="oi-icon-btn" onClick={() => setShowTrigger(false)}>
              <i className="fa fa-times" />
            </button>
          </div>
          <div className="oi-panel-body">
            <div className="oi-form-row">
              <div className="oi-form-group">
                <label className="oi-label">Automation</label>
                <select className="oi-select" value={trigAutomation} onChange={e => setTrigAutomation(e.target.value)}>
                  <option value="">Select automation…</option>
                  {automations.map(a => (
                    <option key={a.sys_id} value={a.sys_id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="oi-form-group">
                <label className="oi-label">Group</label>
                <select className="oi-select" value={trigGroup} onChange={e => setTrigGroup(e.target.value)}>
                  <option value="">Select group…</option>
                  {groups.map(g => (
                    <option key={g.sys_id} value={g.sys_id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="oi-form-actions">
              <button className="oi-btn ghost sm" onClick={() => setShowTrigger(false)}>Cancel</button>
              <button className="oi-btn primary sm" onClick={handleTrigger} disabled={triggering}>
                {triggering ? <span className="oi-spinner xs" /> : <i className="fa fa-play" />}
                {triggering ? ' Triggering…' : ' Trigger'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="oi-split-view">
        <div className={`oi-list-pane${selected ? ' with-detail' : ''}`}>
          {executions.length === 0 ? (
            <div className="oi-empty-state sm">
              <i className="fa fa-history oi-empty-icon" />
              <div className="oi-empty-title">No executions found</div>
              <div className="oi-empty-sub">Trigger an automation to see activity here.</div>
            </div>
          ) : (
            <table className="oi-table clickable">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Automation</th>
                  <th>Group</th>
                  <th>Status</th>
                  <th>Triggered</th>
                </tr>
              </thead>
              <tbody>
                {executions.map(ex => (
                  <tr
                    key={ex.sys_id}
                    className={selected?.sys_id === ex.sys_id ? 'selected' : ''}
                    onClick={() => openLog(ex)}
                  >
                    <td className="oi-td-mono">{ex.number ?? '—'}</td>
                    <td className="oi-td-primary">{ex.automation_name ?? '—'}</td>
                    <td>{ex.group_name ?? '—'}</td>
                    <td><StatusBadge status={ex.status} /></td>
                    <td className="oi-td-muted">{relativeTime(ex.triggered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="oi-detail-pane">
            <div className="oi-detail-hdr">
              <div className="oi-detail-title">
                {selected.automation_name ?? 'Execution'} — {selected.number ?? selected.sys_id.slice(0, 8)}
              </div>
              <button className="oi-icon-btn" onClick={() => { setSelected(null); setStepLog(null); }}>
                <i className="fa fa-times" />
              </button>
            </div>
            <div className="oi-detail-meta">
              <StatusBadge status={selected.status} />
              <span className="oi-detail-group">{selected.group_name}</span>
              <span className="oi-detail-time">{relativeTime(selected.triggered_at)}</span>
            </div>
            <div className="oi-step-log">
              {logLoading ? (
                <div className="oi-spinner-center"><div className="oi-spinner md" /></div>
              ) : (stepLog ?? []).length === 0 ? (
                <div className="oi-empty-inline">No step log available.</div>
              ) : (
                <div className="oi-timeline">
                  {(stepLog ?? []).map((step, i) => (
                    <div key={i} className={`oi-timeline-item ${STATUS_CLASS[step.status] ?? 'neutral'}`}>
                      <div className="oi-timeline-dot" />
                      <div className="oi-timeline-content">
                        <div className="oi-timeline-name">{step.name ?? `Step ${i + 1}`}</div>
                        {step.message && <div className="oi-timeline-msg">{step.message}</div>}
                        {step.duration != null && (
                          <div className="oi-timeline-dur">{step.duration}ms</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
