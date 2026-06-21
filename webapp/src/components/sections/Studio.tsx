import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Automation } from '../../types';
import { triggerAutomation } from '../../api/engine';
import { ConfirmModal } from '../ui/Modal';

const CATEGORY_COLORS: Record<string, string> = {
  blue: '#0072CE', green: '#3DB568', amber: '#F0AD00',
  red: '#D9534F', purple: '#7B5EA7', teal: '#17A2B8',
};

function AutomationCard({
  automation,
  groups,
  onTrigger,
}: {
  automation: Automation;
  groups: { sys_id: string; name: string }[];
  onTrigger: (autoSysId: string, groupSysId: string) => void;
}) {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const color = automation.category_color ? (CATEGORY_COLORS[automation.category_color] ?? '#0072CE') : '#0072CE';

  function handleTrigger() {
    if (!selectedGroup) return;
    onTrigger(automation.sys_id, selectedGroup);
    setShowDrop(false);
    setSelectedGroup('');
  }

  return (
    <div className="oi-auto-card" style={{ borderTopColor: color }}>
      <div className="oi-auto-card-icon" style={{ color }}>
        <i className={`fa ${automation.category_icon ?? 'fa-cog'}`} />
      </div>
      <div className="oi-auto-card-body">
        <div className="oi-auto-card-name">{automation.name}</div>
        {automation.short_description && (
          <div className="oi-auto-card-desc">{automation.short_description}</div>
        )}
        {automation.owner_group && (
          <div className="oi-auto-card-owner">
            <i className="fa fa-layer-group" /> {automation.owner_group}
          </div>
        )}
      </div>
      <div className="oi-auto-card-actions">
        {automation.schedule_active && (
          <span className="oi-badge success xs" title="Scheduled">
            <i className="fa fa-clock" /> Scheduled
          </span>
        )}
        {!showDrop ? (
          <button className="oi-btn primary xs" onClick={() => setShowDrop(true)}>
            <i className="fa fa-play" /> Run
          </button>
        ) : (
          <div className="oi-trigger-drop">
            <select
              className="oi-select xs"
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
            >
              <option value="">Select group…</option>
              {groups.map(g => (
                <option key={g.sys_id} value={g.sys_id}>{g.name}</option>
              ))}
            </select>
            <button className="oi-btn primary xs" onClick={handleTrigger} disabled={!selectedGroup}>
              Confirm
            </button>
            <button className="oi-btn ghost xs" onClick={() => { setShowDrop(false); setSelectedGroup(''); }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Studio() {
  const { state, toast } = useApp();
  const data = state.sectionData;
  const [search, setSearch] = useState('');
  const [confirmTrigger, setConfirmTrigger] = useState<{ autoSysId: string; groupSysId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'automations' | 'artifacts'>('automations');

  const automations: Automation[] = data?.automations ?? [];
  const artifacts = data?.artifacts ?? [];
  const groups = state.init?.userGroups ?? [];

  const filtered = search.trim()
    ? automations.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : automations;

  async function handleTrigger(autoSysId: string, groupSysId: string) {
    setConfirmTrigger({ autoSysId, groupSysId });
  }

  async function confirmTriggerAction() {
    if (!confirmTrigger) return;
    try {
      await triggerAutomation(confirmTrigger.autoSysId, confirmTrigger.groupSysId);
      toast('Automation triggered successfully.', 'success');
    } catch {
      toast('Failed to trigger automation.', 'error');
    } finally {
      setConfirmTrigger(null);
    }
  }

  return (
    <div className="oi-section-body">
      <div className="oi-section-toolbar">
        <div className="oi-section-toolbar-left">
          <h2 className="oi-section-heading">Automation Studio</h2>
        </div>
        <div className="oi-section-toolbar-right">
          <div className="oi-search-wrap">
            <i className="fa fa-search oi-search-icon" />
            <input
              className="oi-search-input"
              placeholder="Search automations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="oi-subtabs">
        <button
          className={`oi-subtab${activeTab === 'automations' ? ' active' : ''}`}
          onClick={() => setActiveTab('automations')}
        >
          <i className="fa fa-robot" /> Automations
          <span className="oi-subtab-count">{automations.length}</span>
        </button>
        <button
          className={`oi-subtab${activeTab === 'artifacts' ? ' active' : ''}`}
          onClick={() => setActiveTab('artifacts')}
        >
          <i className="fa fa-archive" /> Artifacts
          <span className="oi-subtab-count">{artifacts.length}</span>
        </button>
      </div>

      {activeTab === 'automations' && (
        <div className="oi-auto-grid">
          {filtered.length === 0 ? (
            <div className="oi-empty-state sm">
              <i className="fa fa-robot oi-empty-icon" />
              <div className="oi-empty-title">{search ? 'No results found' : 'No automations'}</div>
              <div className="oi-empty-sub">
                {search ? 'Try a different search term.' : 'No automations are available for your groups.'}
              </div>
            </div>
          ) : (
            filtered.map(a => (
              <AutomationCard
                key={a.sys_id}
                automation={a}
                groups={groups}
                onTrigger={handleTrigger}
              />
            ))
          )}
        </div>
      )}

      {activeTab === 'artifacts' && (
        <div className="oi-card">
          <div className="oi-card-body">
            {artifacts.length === 0 ? (
              <div className="oi-empty-state sm">
                <i className="fa fa-archive oi-empty-icon" />
                <div className="oi-empty-title">No artifacts</div>
              </div>
            ) : (
              <table className="oi-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {artifacts.map((art, i) => (
                    <tr key={i}>
                      <td className="oi-td-primary">{art.display_name}</td>
                      <td>{art.artifact_type}</td>
                      <td>
                        <span className={`oi-badge ${art.status === 'active' ? 'success' : 'neutral'}`}>
                          {art.status}
                        </span>
                      </td>
                      <td className="oi-td-muted">{art.updated_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {confirmTrigger && (
        <ConfirmModal
          title="Trigger Automation"
          message="Are you sure you want to trigger this automation? This will immediately execute the automation for the selected group."
          onConfirm={confirmTriggerAction}
          onCancel={() => setConfirmTrigger(null)}
        />
      )}
    </div>
  );
}
