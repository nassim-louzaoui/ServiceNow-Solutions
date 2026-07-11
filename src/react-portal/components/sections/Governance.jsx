import React, { useState } from 'react';
import OIIcon from '../../icons.jsx';
import { useApp } from '../../context.js';
import Badge from '../Badge.jsx';
import { initials } from '../../helpers.js';

export default function GovernanceSection(props) {
  var data = props.data || {};
  var ctx = useApp();
  var groups = data.groups || [];
  var roles = data.roles || [];

  var [activeGroup, setActiveGroup] = useState(null);
  var [modal, setModal] = useState(null);
  var [saving, setSaving] = useState(false);
  var [addMemberForm, setAddMemberForm] = useState({ user_sys_id: '', user_name: '' });
  var [enrollForm, setEnrollForm] = useState({ email: '' });
  var [grantRoleForm, setGrantRoleForm] = useState({ user_sys_id: '', user_name: '', role_sys_id: '' });
  var [createGroupForm, setCreateGroupForm] = useState({ name: '', description: '', manager_sys_id: '' });

  function openModal(name, group) {
    setActiveGroup(group || null);
    setModal(name);
  }

  function closeModal() {
    setModal(null);
    setActiveGroup(null);
    setAddMemberForm({ user_sys_id: '', user_name: '' });
    setEnrollForm({ email: '' });
    setGrantRoleForm({ user_sys_id: '', user_name: '', role_sys_id: '' });
    setCreateGroupForm({ name: '', description: '', manager_sys_id: '' });
  }

  function handleAddMember() {
    if (!addMemberForm.user_name.trim()) {
      ctx.toast('User name is required.', 'error');
      return;
    }
    setSaving(true);
    ctx.callServer({
      action: 'add_group_member',
      group_sys_id: activeGroup.sys_id,
      user_name: addMemberForm.user_name.trim(),
    }).then(function (res) {
      setSaving(false);
      var d = res && res.data ? res.data : res;
      ctx.toast((d && d.message) || 'Member added.', 'success');
      closeModal();
      ctx.loadSection('governance');
    }).catch(function (err) {
      setSaving(false);
      ctx.toast((err && err.message) || 'Failed to add member.', 'error');
    });
  }

  function handleEnrollUser() {
    if (!enrollForm.email.trim()) {
      ctx.toast('Email is required.', 'error');
      return;
    }
    setSaving(true);
    ctx.callServer({
      action: 'enroll_user',
      email: enrollForm.email.trim(),
    }).then(function (res) {
      setSaving(false);
      var d = res && res.data ? res.data : res;
      ctx.toast((d && d.message) || 'User enrolled.', 'success');
      closeModal();
      ctx.loadSection('governance');
    }).catch(function (err) {
      setSaving(false);
      ctx.toast((err && err.message) || 'Enrollment failed.', 'error');
    });
  }

  function handleGrantRole() {
    if (!grantRoleForm.user_name.trim() || !grantRoleForm.role_sys_id) {
      ctx.toast('User and role are required.', 'error');
      return;
    }
    setSaving(true);
    ctx.callServer({
      action: 'grant_role',
      user_name: grantRoleForm.user_name.trim(),
      role_sys_id: grantRoleForm.role_sys_id,
    }).then(function (res) {
      setSaving(false);
      var d = res && res.data ? res.data : res;
      ctx.toast((d && d.message) || 'Role granted.', 'success');
      closeModal();
    }).catch(function (err) {
      setSaving(false);
      ctx.toast((err && err.message) || 'Grant failed.', 'error');
    });
  }

  function handleCreateGroup() {
    if (!createGroupForm.name.trim()) {
      ctx.toast('Group name is required.', 'error');
      return;
    }
    setSaving(true);
    ctx.callServer({
      action: 'create_group',
      name: createGroupForm.name.trim(),
      description: createGroupForm.description.trim(),
    }).then(function (res) {
      setSaving(false);
      var d = res && res.data ? res.data : res;
      ctx.toast((d && d.message) || 'Group created.', 'success');
      closeModal();
      ctx.loadSection('governance');
    }).catch(function (err) {
      setSaving(false);
      ctx.toast((err && err.message) || 'Group creation failed.', 'error');
    });
  }

  return (
    <div className="oi-section">
      <div className="oi-section-header">
        <div>
          <h1 className="oi-section-title">Operations Governance</h1>
          <p className="oi-section-subtitle">Manage groups, memberships, and access control.</p>
        </div>
        <div className="oi-header-actions">
          <button className="oi-btn ghost" onClick={function () { openModal('enroll'); }}>
            <OIIcon name="person_add" size={16} />
            Enroll User
          </button>
          <button className="oi-btn ghost" onClick={function () { openModal('grant_role'); }}>
            <OIIcon name="lock" size={16} />
            Grant Role
          </button>
          <button className="oi-btn primary" onClick={function () { openModal('create_group'); }}>
            <OIIcon name="plus" size={16} />
            New Group
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="oi-empty">
          <OIIcon name="group" size={40} />
          <div className="oi-empty-title">No groups found</div>
          <div className="oi-empty-desc">Create a group to start organizing users and automations.</div>
          <button className="oi-btn primary" style={{ marginTop: '1rem' }} onClick={function () { openModal('create_group'); }}>
            Create Group
          </button>
        </div>
      ) : (
        <div className="oi-groups-grid">
          {groups.map(function (group) {
            var members = group.members || [];
            return (
              <div key={group.sys_id || group.name} className="oi-group-card">
                <div className="oi-group-card-header">
                  <div className="oi-group-icon">
                    <OIIcon name="group" size={20} fill="#00BF6F" />
                  </div>
                  <div className="oi-group-meta">
                    <div className="oi-group-name">{group.name}</div>
                    {group.description && <div className="oi-group-desc">{group.description}</div>}
                  </div>
                </div>

                <div className="oi-group-stats">
                  <div className="oi-group-stat">
                    <span className="oi-group-stat-val">{members.length}</span>
                    <span className="oi-group-stat-label">Members</span>
                  </div>
                  {group.automation_count !== undefined && (
                    <div className="oi-group-stat">
                      <span className="oi-group-stat-val">{group.automation_count}</span>
                      <span className="oi-group-stat-label">Automations</span>
                    </div>
                  )}
                </div>

                {members.length > 0 && (
                  <div className="oi-member-avatars">
                    {members.slice(0, 5).map(function (m, idx) {
                      return (
                        <div
                          key={m.sys_id || idx}
                          className="oi-member-avatar"
                          title={m.name || m.user_name}
                        >
                          {initials(m.name || m.user_name || '?')}
                        </div>
                      );
                    })}
                    {members.length > 5 && (
                      <div className="oi-member-avatar more">+{members.length - 5}</div>
                    )}
                  </div>
                )}

                <div className="oi-group-actions">
                  <button
                    className="oi-btn ghost xs"
                    onClick={function () { openModal('add_member', group); }}
                  >
                    <OIIcon name="person_add" size={14} />
                    Add Member
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal === 'create_group' && (
        <div className="oi-modal-overlay" onClick={closeModal}>
          <div className="oi-modal" onClick={function (e) { e.stopPropagation(); }}>
            <div className="oi-modal-header">
              <div className="oi-modal-title">New Group</div>
              <button className="oi-modal-close" onClick={closeModal}><OIIcon name="close" size={18} /></button>
            </div>
            <div className="oi-modal-body">
              <div className="oi-form-row">
                <label className="oi-label">Group Name <span className="oi-required">*</span></label>
                <input
                  className="oi-input"
                  type="text"
                  placeholder="e.g. IT Operations"
                  value={createGroupForm.name}
                  onChange={function (e) { setCreateGroupForm(function (f) { return Object.assign({}, f, { name: e.target.value }); }); }}
                />
              </div>
              <div className="oi-form-row">
                <label className="oi-label">Description</label>
                <textarea
                  className="oi-input"
                  rows={3}
                  placeholder="Group purpose or description"
                  value={createGroupForm.description}
                  onChange={function (e) { setCreateGroupForm(function (f) { return Object.assign({}, f, { description: e.target.value }); }); }}
                />
              </div>
            </div>
            <div className="oi-modal-footer">
              <button className="oi-btn ghost" onClick={closeModal}>Cancel</button>
              <button className="oi-btn primary" disabled={saving || !createGroupForm.name.trim()} onClick={handleCreateGroup}>
                {saving ? <div className="oi-spinner sm" /> : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'add_member' && activeGroup && (
        <div className="oi-modal-overlay" onClick={closeModal}>
          <div className="oi-modal" onClick={function (e) { e.stopPropagation(); }}>
            <div className="oi-modal-header">
              <div className="oi-modal-title">Add Member to {activeGroup.name}</div>
              <button className="oi-modal-close" onClick={closeModal}><OIIcon name="close" size={18} /></button>
            </div>
            <div className="oi-modal-body">
              <div className="oi-form-row">
                <label className="oi-label">User Name <span className="oi-required">*</span></label>
                <input
                  className="oi-input"
                  type="text"
                  placeholder="ServiceNow user name"
                  value={addMemberForm.user_name}
                  onChange={function (e) { setAddMemberForm(function (f) { return Object.assign({}, f, { user_name: e.target.value }); }); }}
                />
              </div>
            </div>
            <div className="oi-modal-footer">
              <button className="oi-btn ghost" onClick={closeModal}>Cancel</button>
              <button className="oi-btn primary" disabled={saving || !addMemberForm.user_name.trim()} onClick={handleAddMember}>
                {saving ? <div className="oi-spinner sm" /> : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'enroll' && (
        <div className="oi-modal-overlay" onClick={closeModal}>
          <div className="oi-modal" onClick={function (e) { e.stopPropagation(); }}>
            <div className="oi-modal-header">
              <div className="oi-modal-title">Enroll User</div>
              <button className="oi-modal-close" onClick={closeModal}><OIIcon name="close" size={18} /></button>
            </div>
            <div className="oi-modal-body">
              <p className="oi-modal-desc">Send an Operations Intelligence enrollment invitation to a user.</p>
              <div className="oi-form-row">
                <label className="oi-label">Email Address <span className="oi-required">*</span></label>
                <input
                  className="oi-input"
                  type="email"
                  placeholder="user@company.com"
                  value={enrollForm.email}
                  onChange={function (e) { setEnrollForm(function (f) { return Object.assign({}, f, { email: e.target.value }); }); }}
                />
              </div>
            </div>
            <div className="oi-modal-footer">
              <button className="oi-btn ghost" onClick={closeModal}>Cancel</button>
              <button className="oi-btn primary" disabled={saving || !enrollForm.email.trim()} onClick={handleEnrollUser}>
                {saving ? <div className="oi-spinner sm" /> : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'grant_role' && (
        <div className="oi-modal-overlay" onClick={closeModal}>
          <div className="oi-modal" onClick={function (e) { e.stopPropagation(); }}>
            <div className="oi-modal-header">
              <div className="oi-modal-title">Grant Role</div>
              <button className="oi-modal-close" onClick={closeModal}><OIIcon name="close" size={18} /></button>
            </div>
            <div className="oi-modal-body">
              <div className="oi-form-row">
                <label className="oi-label">User Name <span className="oi-required">*</span></label>
                <input
                  className="oi-input"
                  type="text"
                  placeholder="ServiceNow user name"
                  value={grantRoleForm.user_name}
                  onChange={function (e) { setGrantRoleForm(function (f) { return Object.assign({}, f, { user_name: e.target.value }); }); }}
                />
              </div>
              <div className="oi-form-row">
                <label className="oi-label">Role <span className="oi-required">*</span></label>
                <select
                  className="oi-input"
                  value={grantRoleForm.role_sys_id}
                  onChange={function (e) { setGrantRoleForm(function (f) { return Object.assign({}, f, { role_sys_id: e.target.value }); }); }}
                >
                  <option value="">— Select a role —</option>
                  {roles.map(function (r) {
                    return <option key={r.sys_id} value={r.sys_id}>{r.name}</option>;
                  })}
                </select>
              </div>
            </div>
            <div className="oi-modal-footer">
              <button className="oi-btn ghost" onClick={closeModal}>Cancel</button>
              <button
                className="oi-btn primary"
                disabled={saving || !grantRoleForm.user_name.trim() || !grantRoleForm.role_sys_id}
                onClick={handleGrantRole}
              >
                {saving ? <div className="oi-spinner sm" /> : 'Grant Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
