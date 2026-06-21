import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import type { OIGroup, GroupMember, Person, PendingAction } from '../../types';
import {
  listGroupMembers, addMember, removeMember,
  listPersons, searchUsers, enrollPerson, unenrollPerson,
  createGroup, resolveAction,
} from '../../api/engine';
import Modal, { ConfirmModal } from '../ui/Modal';

type GovernanceTab = 'groups' | 'persons' | 'actions';

export default function Governance() {
  const { state, dispatch, toast } = useApp();
  const data = state.sectionData;
  const [activeTab, setActiveTab] = useState<GovernanceTab>('groups');

  const groups: OIGroup[] = data?.groups ?? [];
  const pendingActions: PendingAction[] = data?.pending_actions ?? [];

  return (
    <div className="oi-section-body">
      <div className="oi-section-toolbar">
        <div className="oi-section-toolbar-left">
          <h2 className="oi-section-heading">Governance</h2>
        </div>
      </div>

      <div className="oi-subtabs">
        <button className={`oi-subtab${activeTab === 'groups' ? ' active' : ''}`} onClick={() => setActiveTab('groups')}>
          <i className="fa fa-layer-group" /> Groups
          <span className="oi-subtab-count">{groups.length}</span>
        </button>
        <button className={`oi-subtab${activeTab === 'persons' ? ' active' : ''}`} onClick={() => setActiveTab('persons')}>
          <i className="fa fa-users" /> Persons
        </button>
        <button className={`oi-subtab${activeTab === 'actions' ? ' active' : ''}`} onClick={() => setActiveTab('actions')}>
          <i className="fa fa-tasks" /> Pending Actions
          {pendingActions.length > 0 && <span className="oi-subtab-count warning">{pendingActions.length}</span>}
        </button>
      </div>

      {activeTab === 'groups' && (
        <GroupsPanel groups={groups} toast={toast} dispatch={dispatch} />
      )}
      {activeTab === 'persons' && (
        <PersonsPanel toast={toast} />
      )}
      {activeTab === 'actions' && (
        <ActionsPanel actions={pendingActions} toast={toast} dispatch={dispatch} />
      )}
    </div>
  );
}

function GroupsPanel({
  groups, toast, dispatch,
}: {
  groups: OIGroup[];
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  dispatch: React.Dispatch<any>;
}) {
  const [selectedGroup, setSelectedGroup] = useState<OIGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ sys_id: string; name: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupType, setNewGroupType] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<GroupMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);

  async function openGroup(group: OIGroup) {
    setSelectedGroup(group);
    setMembers([]);
    setMembersLoading(true);
    try {
      const res = await listGroupMembers(group.sys_id);
      setMembers((res.members as GroupMember[]) ?? []);
    } catch {
      toast('Failed to load group members.', 'error');
    } finally {
      setMembersLoading(false);
    }
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await searchUsers(searchQuery);
      setSearchResults((res.users as { sys_id: string; name: string }[]) ?? []);
    } catch {
      toast('Search failed.', 'error');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, toast]);

  async function handleAddMember() {
    if (!selectedGroup || !selectedUser) return;
    setAdding(true);
    try {
      await addMember(selectedGroup.sys_id, selectedUser, memberRole);
      toast('Member added successfully.', 'success');
      setShowAddMember(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser('');
      setMemberRole('member');
      await openGroup(selectedGroup);
    } catch {
      toast('Failed to add member.', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember() {
    if (!selectedGroup || !confirmRemove) return;
    try {
      await removeMember(selectedGroup.sys_id, confirmRemove.person_sys_id);
      toast('Member removed.', 'success');
      setMembers(prev => prev.filter(m => m.person_sys_id !== confirmRemove.person_sys_id));
    } catch {
      toast('Failed to remove member.', 'error');
    } finally {
      setConfirmRemove(null);
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) { toast('Group name is required.', 'warning'); return; }
    setCreating(true);
    try {
      const res = await createGroup(newGroupName, newGroupDesc, newGroupType);
      toast('Group created successfully.', 'success');
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupType('');
      if (res.group) {
        dispatch({ type: 'PATCH_SECTION_DATA', payload: { groups: [res.group as OIGroup, ...groups] } });
      }
    } catch {
      toast('Failed to create group.', 'error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="oi-split-view">
      <div className={`oi-list-pane${selectedGroup ? ' with-detail' : ''}`}>
        <div className="oi-list-toolbar">
          <button className="oi-btn primary sm" onClick={() => setShowCreateGroup(true)}>
            <i className="fa fa-plus" /> New Group
          </button>
        </div>
        {groups.length === 0 ? (
          <div className="oi-empty-state sm">
            <i className="fa fa-layer-group oi-empty-icon" />
            <div className="oi-empty-title">No groups found</div>
          </div>
        ) : (
          <div className="oi-item-list">
            {groups.map(g => (
              <button
                key={g.sys_id}
                type="button"
                className={`oi-list-item${selectedGroup?.sys_id === g.sys_id ? ' selected' : ''}`}
                onClick={() => openGroup(g)}
              >
                <div className="oi-list-item-icon">
                  <i className="fa fa-layer-group" />
                </div>
                <div className="oi-list-item-body">
                  <div className="oi-list-item-title">{g.name}</div>
                  {g.type && <div className="oi-list-item-sub">{g.type}</div>}
                </div>
                {g.member_count != null && (
                  <div className="oi-list-item-count">{g.member_count}</div>
                )}
                <i className="fa fa-chevron-right oi-list-item-caret" />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedGroup && (
        <div className="oi-detail-pane">
          <div className="oi-detail-hdr">
            <div className="oi-detail-title">{selectedGroup.name}</div>
            <button className="oi-icon-btn" onClick={() => { setSelectedGroup(null); setMembers([]); }}>
              <i className="fa fa-times" />
            </button>
          </div>
          {selectedGroup.type && <div className="oi-detail-meta"><span className="oi-badge neutral">{selectedGroup.type}</span></div>}
          <div className="oi-detail-section-hdr">
            <span>Members</span>
            <button className="oi-btn primary xs" onClick={() => setShowAddMember(true)}>
              <i className="fa fa-plus" /> Add
            </button>
          </div>
          {membersLoading ? (
            <div className="oi-spinner-center"><div className="oi-spinner md" /></div>
          ) : members.length === 0 ? (
            <div className="oi-empty-inline">No members in this group.</div>
          ) : (
            <div className="oi-member-list">
              {members.map(m => (
                <div key={m.person_sys_id} className="oi-member-item">
                  <div className="oi-member-avatar">{(m.person_name ?? m.name ?? '?').charAt(0)}</div>
                  <div className="oi-member-info">
                    <div className="oi-member-name">{m.person_name ?? m.name ?? '—'}</div>
                    <div className="oi-member-role">{m.group_role ?? m.role ?? '—'}</div>
                  </div>
                  <button
                    className="oi-icon-btn danger"
                    title="Remove member"
                    onClick={() => setConfirmRemove(m)}
                  >
                    <i className="fa fa-user-minus" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateGroup && (
        <Modal title="Create Group" onClose={() => setShowCreateGroup(false)} size="sm"
          footer={
            <>
              <button className="oi-btn ghost sm" onClick={() => setShowCreateGroup(false)}>Cancel</button>
              <button className="oi-btn primary sm" onClick={handleCreateGroup} disabled={creating}>
                {creating ? 'Creating…' : 'Create Group'}
              </button>
            </>
          }
        >
          <div className="oi-form-group">
            <label className="oi-label">Name *</label>
            <input className="oi-input" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name" />
          </div>
          <div className="oi-form-group">
            <label className="oi-label">Type</label>
            <input className="oi-input" value={newGroupType} onChange={e => setNewGroupType(e.target.value)} placeholder="e.g. Operations, Support" />
          </div>
          <div className="oi-form-group">
            <label className="oi-label">Description</label>
            <textarea className="oi-textarea" rows={3} value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Optional description" />
          </div>
        </Modal>
      )}

      {showAddMember && (
        <Modal title="Add Member" onClose={() => { setShowAddMember(false); setSearchResults([]); setSearchQuery(''); setSelectedUser(''); }}
          size="sm"
          footer={
            <>
              <button className="oi-btn ghost sm" onClick={() => { setShowAddMember(false); setSearchResults([]); setSearchQuery(''); setSelectedUser(''); }}>Cancel</button>
              <button className="oi-btn primary sm" onClick={handleAddMember} disabled={adding || !selectedUser}>
                {adding ? 'Adding…' : 'Add Member'}
              </button>
            </>
          }
        >
          <div className="oi-form-group">
            <label className="oi-label">Search User</label>
            <div className="oi-search-row">
              <input className="oi-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Name or username…"
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              />
              <button className="oi-btn ghost sm" onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? '…' : <i className="fa fa-search" />}
              </button>
            </div>
          </div>
          {searchResults.length > 0 && (
            <div className="oi-form-group">
              <label className="oi-label">Select User</label>
              <select className="oi-select" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
                <option value="">Choose…</option>
                {searchResults.map(u => (
                  <option key={u.sys_id} value={u.sys_id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="oi-form-group">
            <label className="oi-label">Role</label>
            <select className="oi-select" value={memberRole} onChange={e => setMemberRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="lead">Lead</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </Modal>
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Remove Member"
          message={`Remove ${confirmRemove.person_name ?? confirmRemove.name ?? 'this person'} from the group?`}
          onConfirm={handleRemoveMember}
          onCancel={() => setConfirmRemove(null)}
          danger
        />
      )}
    </div>
  );
}

function PersonsPanel({ toast }: { toast: (msg: string, type?: any) => void }) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [enrollResults, setEnrollResults] = useState<{ sys_id: string; name: string }[]>([]);
  const [enrollSearchLoading, setEnrollSearchLoading] = useState(false);
  const [enrollUser, setEnrollUser] = useState('');
  const [enrollGroup, setEnrollGroup] = useState('');
  const [enrollRole, setEnrollRole] = useState('member');
  const [enrolling, setEnrolling] = useState(false);
  const [confirmUnenroll, setConfirmUnenroll] = useState<Person | null>(null);
  const { state } = useApp();
  const groups = state.init?.userGroups ?? [];

  async function load() {
    setLoading(true);
    try {
      const res = await listPersons();
      setPersons((res.persons as Person[]) ?? []);
      setLoaded(true);
    } catch {
      toast('Failed to load persons.', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!loaded && !loading) {
    load();
  }

  async function handleEnrollSearch() {
    if (!enrollSearch.trim()) return;
    setEnrollSearchLoading(true);
    try {
      const res = await searchUsers(enrollSearch);
      setEnrollResults((res.users as { sys_id: string; name: string }[]) ?? []);
    } catch {
      toast('Search failed.', 'error');
    } finally {
      setEnrollSearchLoading(false);
    }
  }

  async function handleEnroll() {
    if (!enrollUser || !enrollGroup) { toast('Select a user and group.', 'warning'); return; }
    setEnrolling(true);
    try {
      await enrollPerson(enrollUser, enrollGroup, enrollRole);
      toast('Person enrolled successfully.', 'success');
      setShowEnroll(false);
      setEnrollSearch('');
      setEnrollResults([]);
      setEnrollUser('');
      setEnrollGroup('');
      setEnrollRole('member');
      await load();
    } catch {
      toast('Failed to enroll person.', 'error');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleUnenroll() {
    if (!confirmUnenroll) return;
    try {
      await unenrollPerson(confirmUnenroll.sys_id);
      toast('Person unenrolled.', 'success');
      setPersons(prev => prev.filter(p => p.sys_id !== confirmUnenroll.sys_id));
    } catch {
      toast('Failed to unenroll person.', 'error');
    } finally {
      setConfirmUnenroll(null);
    }
  }

  return (
    <div>
      <div className="oi-list-toolbar">
        <button className="oi-btn primary sm" onClick={() => setShowEnroll(true)}>
          <i className="fa fa-user-plus" /> Enroll Person
        </button>
      </div>
      {loading ? (
        <div className="oi-spinner-center"><div className="oi-spinner lg" /></div>
      ) : persons.length === 0 ? (
        <div className="oi-empty-state sm">
          <i className="fa fa-users oi-empty-icon" />
          <div className="oi-empty-title">No enrolled persons</div>
          <div className="oi-empty-sub">Enroll persons to grant access to Operations Intelligence.</div>
        </div>
      ) : (
        <div className="oi-card">
          <div className="oi-card-body">
            <table className="oi-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Groups</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {persons.map(p => (
                  <tr key={p.sys_id}>
                    <td>
                      <div className="oi-person-cell">
                        <div className="oi-avatar-sm">{p.name.charAt(0)}</div>
                        <span className="oi-td-primary">{p.name}</span>
                      </div>
                    </td>
                    <td className="oi-td-mono">{p.user_name ?? '—'}</td>
                    <td>
                      {(p.groups ?? []).map((g, i) => (
                        <span key={i} className="oi-tag">{g.group_name}</span>
                      ))}
                    </td>
                    <td>
                      <button
                        className="oi-btn danger xs"
                        onClick={() => setConfirmUnenroll(p)}
                        title="Unenroll person"
                      >
                        <i className="fa fa-user-minus" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showEnroll && (
        <Modal title="Enroll Person" onClose={() => setShowEnroll(false)} size="sm"
          footer={
            <>
              <button className="oi-btn ghost sm" onClick={() => setShowEnroll(false)}>Cancel</button>
              <button className="oi-btn primary sm" onClick={handleEnroll} disabled={enrolling || !enrollUser}>
                {enrolling ? 'Enrolling…' : 'Enroll'}
              </button>
            </>
          }
        >
          <div className="oi-form-group">
            <label className="oi-label">Search User</label>
            <div className="oi-search-row">
              <input className="oi-input" value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)}
                placeholder="Name or username…"
                onKeyDown={e => { if (e.key === 'Enter') handleEnrollSearch(); }}
              />
              <button className="oi-btn ghost sm" onClick={handleEnrollSearch} disabled={enrollSearchLoading}>
                {enrollSearchLoading ? '…' : <i className="fa fa-search" />}
              </button>
            </div>
          </div>
          {enrollResults.length > 0 && (
            <div className="oi-form-group">
              <label className="oi-label">Select User</label>
              <select className="oi-select" value={enrollUser} onChange={e => setEnrollUser(e.target.value)}>
                <option value="">Choose…</option>
                {enrollResults.map(u => (
                  <option key={u.sys_id} value={u.sys_id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="oi-form-group">
            <label className="oi-label">Initial Group</label>
            <select className="oi-select" value={enrollGroup} onChange={e => setEnrollGroup(e.target.value)}>
              <option value="">Select group…</option>
              {groups.map(g => (
                <option key={g.sys_id} value={g.sys_id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="oi-form-group">
            <label className="oi-label">Role</label>
            <select className="oi-select" value={enrollRole} onChange={e => setEnrollRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="lead">Lead</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </Modal>
      )}

      {confirmUnenroll && (
        <ConfirmModal
          title="Unenroll Person"
          message={`Remove ${confirmUnenroll.name} from all Operations Intelligence groups? This will revoke their access.`}
          onConfirm={handleUnenroll}
          onCancel={() => setConfirmUnenroll(null)}
          danger
        />
      )}
    </div>
  );
}

function ActionsPanel({
  actions,
  toast,
  dispatch,
}: {
  actions: PendingAction[];
  toast: (msg: string, type?: any) => void;
  dispatch: React.Dispatch<any>;
}) {
  const [processing, setProcessing] = useState<string | null>(null);

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

  async function handleResolve(action: PendingAction, resolution: string) {
    setProcessing(action.sys_id + resolution);
    try {
      await resolveAction(action.sys_id, resolution);
      toast(`Action ${resolution}d.`, 'success');
      dispatch({
        type: 'PATCH_SECTION_DATA',
        payload: { pending_actions: actions.filter(a => a.sys_id !== action.sys_id) },
      });
    } catch {
      toast('Failed to resolve action.', 'error');
    } finally {
      setProcessing(null);
    }
  }

  if (actions.length === 0) {
    return (
      <div className="oi-empty-state sm">
        <i className="fa fa-check-circle oi-empty-icon" style={{ color: '#3DB568' }} />
        <div className="oi-empty-title">No pending actions</div>
        <div className="oi-empty-sub">All governance actions have been resolved.</div>
      </div>
    );
  }

  return (
    <div className="oi-action-list standalone">
      {actions.map(a => (
        <div key={a.sys_id} className="oi-action-item">
          <div className="oi-action-info">
            <div className="oi-action-type">{a.type}</div>
            <div className="oi-action-desc">{a.description ?? a.subject_user_name ?? '—'}</div>
            <div className="oi-action-meta">{relativeTime(a.created)}</div>
          </div>
          <div className="oi-action-btns">
            <button
              className="oi-btn primary sm"
              disabled={processing !== null}
              onClick={() => handleResolve(a, 'approve')}
            >
              {processing === a.sys_id + 'approve' ? '…' : 'Approve'}
            </button>
            <button
              className="oi-btn danger sm"
              disabled={processing !== null}
              onClick={() => handleResolve(a, 'reject')}
            >
              {processing === a.sys_id + 'reject' ? '…' : 'Reject'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
