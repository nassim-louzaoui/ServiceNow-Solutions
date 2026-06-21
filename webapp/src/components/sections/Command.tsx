import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { toggleMaintenance } from '../../api/engine';

const MAINTENANCE_LABELS: Record<string, { label: string; desc: string }> = {
  'x_infte_ops_int.maintenance_mode': {
    label: 'Maintenance Mode',
    desc: 'Suspends all automation execution and blocks new triggers.',
  },
  'x_infte_ops_int.disable_notifications': {
    label: 'Disable Notifications',
    desc: 'Suppresses all outbound notification delivery.',
  },
  'x_infte_ops_int.readonly_mode': {
    label: 'Read-Only Mode',
    desc: 'Prevents any writes or mutations through the engine.',
  },
};

export default function Command() {
  const { state, dispatch, toast } = useApp();
  const data = state.sectionData;
  const maintenance = data?.maintenance ?? {};
  const [toggling, setToggling] = useState<string | null>(null);

  const maintenanceKeys = Object.keys(MAINTENANCE_LABELS);

  async function handleToggle(propName: string) {
    setToggling(propName);
    try {
      const res = await toggleMaintenance(propName);
      toast(`${MAINTENANCE_LABELS[propName]?.label ?? propName} updated.`, 'success');
      const newMaintenance = { ...maintenance };
      if (typeof res.new_value === 'boolean') {
        newMaintenance[propName] = res.new_value as boolean;
      } else {
        newMaintenance[propName] = !maintenance[propName];
      }
      dispatch({ type: 'PATCH_SECTION_DATA', payload: { maintenance: newMaintenance } });
    } catch {
      toast('Failed to update setting.', 'error');
    } finally {
      setToggling(null);
    }
  }

  const stats = data?.stats ?? {};
  const role = state.init?.userRole;

  return (
    <div className="oi-section-body">
      <div className="oi-section-toolbar">
        <div className="oi-section-toolbar-left">
          <h2 className="oi-section-heading">Command Centre</h2>
        </div>
        <div className="oi-section-toolbar-right">
          <span className="oi-badge success">
            <span className="oi-status-dot success sm" /> System Online
          </span>
        </div>
      </div>

      <div className="oi-command-grid">
        <div className="oi-card">
          <div className="oi-card-hdr">
            <span className="oi-card-title">System Overview</span>
          </div>
          <div className="oi-card-body">
            <div className="oi-info-list">
              <div className="oi-info-row">
                <span className="oi-info-label">Application Scope</span>
                <span className="oi-info-value oi-mono">x_infte_ops_int</span>
              </div>
              <div className="oi-info-row">
                <span className="oi-info-label">Your Role</span>
                <span className="oi-info-value">
                  <span className="oi-badge primary">{role ?? '—'}</span>
                </span>
              </div>
              <div className="oi-info-row">
                <span className="oi-info-label">Enrolled Persons</span>
                <span className="oi-info-value">{stats.persons ?? '—'}</span>
              </div>
              <div className="oi-info-row">
                <span className="oi-info-label">Active Groups</span>
                <span className="oi-info-value">{stats.groups ?? '—'}</span>
              </div>
              <div className="oi-info-row">
                <span className="oi-info-label">Automations</span>
                <span className="oi-info-value">{stats.automations ?? '—'}</span>
              </div>
              <div className="oi-info-row">
                <span className="oi-info-label">Executions Today</span>
                <span className="oi-info-value">{stats.executions_today ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="oi-card">
          <div className="oi-card-hdr">
            <span className="oi-card-title">Operational Controls</span>
          </div>
          <div className="oi-card-body">
            {maintenanceKeys.length === 0 ? (
              <div className="oi-empty-inline">No operational controls available.</div>
            ) : (
              <div className="oi-maintenance-list">
                {maintenanceKeys.map(key => {
                  const meta = MAINTENANCE_LABELS[key];
                  const isOn = !!maintenance[key];
                  const isToggling = toggling === key;
                  return (
                    <div key={key} className={`oi-maintenance-item${isOn ? ' active' : ''}`}>
                      <div className="oi-maintenance-info">
                        <div className="oi-maintenance-label">{meta.label}</div>
                        <div className="oi-maintenance-desc">{meta.desc}</div>
                        <div className="oi-maintenance-prop oi-mono">{key}</div>
                      </div>
                      <button
                        type="button"
                        className={`oi-toggle${isOn ? ' on' : ''}`}
                        onClick={() => handleToggle(key)}
                        disabled={isToggling}
                        title={isOn ? 'Disable' : 'Enable'}
                        aria-label={`${isOn ? 'Disable' : 'Enable'} ${meta.label}`}
                        aria-pressed={isOn}
                      >
                        <span className="oi-toggle-knob" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="oi-card oi-card-full">
          <div className="oi-card-hdr">
            <span className="oi-card-title">Security</span>
          </div>
          <div className="oi-card-body">
            <div className="oi-security-notice">
              <i className="fa fa-shield-alt oi-security-icon" />
              <div className="oi-security-text">
                <div className="oi-security-title">Server-Side Access Control</div>
                <div className="oi-security-desc">
                  All operations are validated server-side on every request. Access is enforced
                  at the engine level regardless of client state. Session re-authentication runs
                  every 60 seconds. Unauthorized requests are rejected at the engine layer.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
