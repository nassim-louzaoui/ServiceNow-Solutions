api.controller = function($scope, $timeout, spModal, spUtil) {
    var c = this;

    c.ui = {
        section:           '',
        loading:           false,
        search:            '',
        selectedGroup:     '',
        activityFilter:    'all',
        expandedExecution: null,
        mobileNavOpen:     false,
        stepLogLoading:    false,
        commandTab:        'stats',      // 'stats' | 'people' | 'groups'
        userSearchQuery:   '',
        userSearchResults: [],
        userSearchLoading: false,
        persons:           [],
        personsLoading:    false,
        newGroupName:      '',
        newGroupDesc:      '',
        newGroupType:      'custom_group',
        expandedGroup:     null,
        groupMembers:      [],
        groupMembersLoading: false,
        addMemberPersonId: '',
        addMemberRole:     'user',
        govExpandedGroup:  null,
        govGroupMembers:   [],
        govGroupMembersLoading: false,
        govAddPersonId:    '',
        govAddRole:        'user'
    };

    c.statusFilters = [
        { value: 'all',        label: 'All' },
        { value: 'success',    label: 'Success' },
        { value: 'failed',     label: 'Failed' },
        { value: 'running',    label: 'Running' },
        { value: 'pending',    label: 'Pending' },
        { value: 'cancelled',  label: 'Cancelled' }
    ];

    c.groupTypes = [
        { value: 'custom_group',    label: 'Custom Group' },
        { value: 'leadership_group', label: 'Leadership Group' },
        { value: 'creator_group',   label: 'Creator Group' }
    ];

    c.memberRoles = [
        { value: 'user',       label: 'User' },
        { value: 'creator',    label: 'Creator' },
        { value: 'leadership', label: 'Leadership' },
        { value: 'admin',      label: 'Admin' }
    ];

    c.roleLabel = function() {
        var map = { admin: 'Admin', leadership: 'Leadership', creator: 'Creator', user: 'User' };
        return map[c.data.userRole] || c.data.userRole || '';
    };

    c.navigate = function(sectionId) {
        if (c.ui.loading) { return; }
        c.ui.mobileNavOpen  = false;
        c.ui.loading        = true;
        c.ui.expandedExecution = null;
        c.server.get({ action: 'load_section', section: sectionId }).then(function(response) {
            c.data.sectionData = response.data.sectionData;
            c.ui.section       = sectionId;
            c.ui.search        = '';
            c.ui.loading       = false;
            c.ui.commandTab    = 'stats';
        }, function() {
            c.ui.loading = false;
        });
    };

    c.selectGroup = function(groupSysId) { c.ui.selectedGroup = groupSysId; };

    c.filteredAutomations = function() {
        if (!c.data.sectionData || !c.data.sectionData.automations) { return []; }
        var automations = c.data.sectionData.automations;
        var search      = c.ui.search ? c.ui.search.toLowerCase() : '';
        var group       = c.ui.selectedGroup;
        var result      = [];
        var i;
        for (i = 0; i < automations.length; i++) {
            var a = automations[i];
            if (group && a.owner_group_sys_id !== group) { continue; }
            if (search) {
                var hay = ((a.name || '') + ' ' + (a.short_description || '') + ' ' + (a.owner_group || '')).toLowerCase();
                if (hay.indexOf(search) === -1) { continue; }
            }
            result.push(a);
        }
        return result;
    };

    c.filteredExecutions = function() {
        if (!c.data.sectionData || !c.data.sectionData.executions) { return []; }
        var executions = c.data.sectionData.executions;
        var filter     = c.ui.activityFilter;
        var search     = c.ui.search ? c.ui.search.toLowerCase() : '';
        var result     = [];
        var i;
        for (i = 0; i < executions.length; i++) {
            var e = executions[i];
            if (filter !== 'all' && e.status !== filter) { continue; }
            if (search) {
                var hay = ((e.number || '') + ' ' + (e.automation || '') + ' ' + (e.channel || '')).toLowerCase();
                if (hay.indexOf(search) === -1) { continue; }
            }
            result.push(e);
        }
        return result;
    };

    c.toggleExecution = function(exc) {
        if (c.ui.expandedExecution && c.ui.expandedExecution.sys_id === exc.sys_id) {
            c.ui.expandedExecution = null;
            return;
        }
        c.ui.expandedExecution  = exc;
        exc.stepLog             = null;
        c.ui.stepLogLoading     = true;
        c.server.get({ action: 'step_log', execution_sys_id: exc.sys_id }).then(function(response) {
            exc.stepLog         = response.data.stepLog || [];
            c.ui.stepLogLoading = false;
        }, function() {
            exc.stepLog         = [];
            c.ui.stepLogLoading = false;
        });
    };

    c.isExpandedExecution = function(exc) {
        return c.ui.expandedExecution && c.ui.expandedExecution.sys_id === exc.sys_id;
    };

    c.toggleMaintenance = function(maintenanceItem) {
        if (!maintenanceItem) { return; }
        c.server.get({ action: 'toggle_maintenance', prop_name: maintenanceItem.prop_name }).then(function() {
            maintenanceItem.enabled = !maintenanceItem.enabled;
        });
    };

    c.stepLogEntries = function() {
        if (!c.ui.expandedExecution || !c.ui.expandedExecution.stepLog) { return []; }
        return c.ui.expandedExecution.stepLog;
    };

    c.statusClass = function(status) {
        var map = { success: 'oi-badge-success', failed: 'oi-badge-danger', error: 'oi-badge-danger',
                    running: 'oi-badge-info', pending: 'oi-badge-warning', cancelled: 'oi-badge-muted', skipped: 'oi-badge-muted' };
        return 'oi-badge ' + (map[status] || 'oi-badge-muted');
    };

    c.stepStatusDot = function(status) {
        var map = { success: 'oi-dot-success', failed: 'oi-dot-danger', error: 'oi-dot-danger',
                    running: 'oi-dot-info', pending: 'oi-dot-warning', skipped: 'oi-dot-muted', cancelled: 'oi-dot-muted' };
        return 'oi-step-dot ' + (map[status] || 'oi-dot-muted');
    };

    c.pendingActionIcon = function(actionType) {
        var map = { approve_member: 'fa-user-plus', review_automation: 'fa-cogs', approve_artifact: 'fa-cube', review_use_case: 'fa-lightbulb-o' };
        return 'fa ' + (map[actionType] || 'fa-bell');
    };

    // ── Automation trigger ────────────────────────────────────────────────────
    c.triggerAutomation = function(card) {
        spModal.confirm('Run automation "' + (card.name || card.sys_id) + '"?').then(function(confirmed) {
            if (!confirmed) { return; }
            c.server.get({
                action:            'trigger_automation',
                automation_sys_id: card.sys_id,
                group_sys_id:      card.owner_group_sys_id || ''
            }).then(function(response) {
                var t = response.data.triggered;
                if (t && t.ok) {
                    spUtil.addInfoMessage('Execution ' + (t.number || t.sys_id) + ' started.');
                } else {
                    spUtil.addErrorMessage(t && t.error ? t.error : 'Failed to trigger automation.');
                }
            }, function() {
                spUtil.addErrorMessage('Server error while triggering automation.');
            });
        });
    };

    // ── Governance action resolve ─────────────────────────────────────────────
    c.resolveAction = function(action, resolution) {
        spModal.confirm(resolution === 'approved' ? 'Approve this action?' : 'Reject this action?').then(function(confirmed) {
            if (!confirmed) { return; }
            c.server.get({ action: 'resolve_action', action_sys_id: action.sys_id, resolution: resolution }).then(function(response) {
                if (response.data.resolved) {
                    var pending = c.data.sectionData && c.data.sectionData.pending;
                    if (pending) {
                        var i;
                        for (i = 0; i < pending.length; i++) {
                            if (pending[i].sys_id === action.sys_id) { pending.splice(i, 1); break; }
                        }
                    }
                    spUtil.addInfoMessage('Action ' + resolution + '.');
                } else {
                    spUtil.addErrorMessage('Could not resolve action.');
                }
            }, function() {
                spUtil.addErrorMessage('Server error while resolving action.');
            });
        });
    };

    // ── Governance: group member management ───────────────────────────────────
    c.toggleGovGroup = function(grp) {
        if (c.ui.govExpandedGroup && c.ui.govExpandedGroup.sys_id === grp.sys_id) {
            c.ui.govExpandedGroup  = null;
            c.ui.govGroupMembers   = [];
            return;
        }
        c.ui.govExpandedGroup       = grp;
        c.ui.govGroupMembers        = [];
        c.ui.govGroupMembersLoading = true;
        c.ui.govAddPersonId         = '';
        c.ui.govAddRole             = 'user';
        c.server.get({ action: 'list_group_members', group_sys_id: grp.sys_id }).then(function(response) {
            c.ui.govGroupMembers        = response.data.group_members || [];
            c.ui.govGroupMembersLoading = false;
        }, function() {
            c.ui.govGroupMembersLoading = false;
        });
    };

    c.govAddMember = function(grp) {
        if (!c.ui.govAddPersonId) { spUtil.addErrorMessage('Select a person first.'); return; }
        c.server.get({ action: 'add_member', group_sys_id: grp.sys_id, person_sys_id: c.ui.govAddPersonId, group_role: c.ui.govAddRole })
            .then(function(response) {
                if (response.data.member_added) {
                    spUtil.addInfoMessage('Member added.');
                    c.toggleGovGroup(grp);
                    $timeout(function() { c.toggleGovGroup(grp); }, 50);
                } else {
                    spUtil.addErrorMessage('Could not add member.');
                }
            }, function() { spUtil.addErrorMessage('Server error.'); });
    };

    c.govRemoveMember = function(grp, member) {
        spModal.confirm('Remove ' + member.person_name + ' from ' + grp.name + '?').then(function(confirmed) {
            if (!confirmed) { return; }
            c.server.get({ action: 'remove_member', group_sys_id: grp.sys_id, person_sys_id: member.person_sys_id })
                .then(function(response) {
                    if (response.data.member_removed) {
                        spUtil.addInfoMessage('Member removed.');
                        c.ui.govGroupMembers = c.ui.govGroupMembers.filter(function(m) { return m.person_sys_id !== member.person_sys_id; });
                    } else {
                        spUtil.addErrorMessage('Could not remove member.');
                    }
                }, function() { spUtil.addErrorMessage('Server error.'); });
        });
    };

    // ── Command: tab navigation ───────────────────────────────────────────────
    c.setCommandTab = function(tab) {
        c.ui.commandTab      = tab;
        c.ui.expandedGroup   = null;
        c.ui.groupMembers    = [];
        if (tab === 'people') { c.loadPersons(); }
    };

    // ── Command: People management ────────────────────────────────────────────
    c.loadPersons = function() {
        c.ui.personsLoading = true;
        c.server.get({ action: 'list_persons' }).then(function(response) {
            c.ui.persons        = response.data.persons || [];
            c.ui.personsLoading = false;
        }, function() {
            c.ui.personsLoading = false;
        });
    };

    c.searchUsers = function() {
        var q = c.ui.userSearchQuery;
        if (!q || q.length < 2) { c.ui.userSearchResults = []; return; }
        c.ui.userSearchLoading = true;
        c.server.get({ action: 'search_users', query: q }).then(function(response) {
            c.ui.userSearchResults = response.data.users || [];
            c.ui.userSearchLoading = false;
        }, function() {
            c.ui.userSearchLoading = false;
        });
    };

    c.enrollUser = function(user) {
        var groups    = (c.data.sectionData && c.data.sectionData.groups) || [];
        var groupOpts = groups.map(function(g) { return '<option value="' + g.sys_id + '">' + g.name + '</option>'; }).join('');
        spModal.open({
            title:   'Enroll ' + user.name,
            message: '<p>Select a group and role to assign:</p>' +
                     '<div class="form-group"><label>Group (optional)</label>' +
                     '<select id="oi-enroll-group" class="form-control"><option value="">— No group —</option>' + groupOpts + '</select></div>' +
                     '<div class="form-group"><label>Role</label>' +
                     '<select id="oi-enroll-role" class="form-control">' +
                     '<option value="user">User</option><option value="creator">Creator</option>' +
                     '<option value="leadership">Leadership</option><option value="admin">Admin</option>' +
                     '</select></div>',
            buttons: [{ label: 'Enroll', primary: true }, { label: 'Cancel' }]
        }).then(function(btn) {
            if (!btn || btn.label === 'Cancel') { return; }
            var grpId  = document.getElementById('oi-enroll-group') ? document.getElementById('oi-enroll-group').value : '';
            var role   = document.getElementById('oi-enroll-role')  ? document.getElementById('oi-enroll-role').value  : 'user';
            c.server.get({ action: 'enroll_person', user_sys_id: user.sys_id, group_sys_id: grpId, group_role: role }).then(function(response) {
                var e = response.data.enrolled;
                if (e && e.ok) {
                    spUtil.addInfoMessage((e.name || 'User') + ' enrolled.');
                    user.already_enrolled = true;
                    user.person_sys_id    = e.person_sys_id;
                } else {
                    spUtil.addErrorMessage(e && e.error ? e.error : 'Enrollment failed.');
                }
            }, function() { spUtil.addErrorMessage('Server error.'); });
        });
    };

    c.unenrollPerson = function(person) {
        spModal.confirm('Remove ' + person.name + ' from Operations Intelligence? This will revoke all OI roles.').then(function(confirmed) {
            if (!confirmed) { return; }
            c.server.get({ action: 'unenroll_person', person_sys_id: person.sys_id }).then(function(response) {
                if (response.data.unenrolled && response.data.unenrolled.ok) {
                    spUtil.addInfoMessage(person.name + ' removed.');
                    c.ui.persons = c.ui.persons.filter(function(p) { return p.sys_id !== person.sys_id; });
                } else {
                    spUtil.addErrorMessage('Could not remove person.');
                }
            }, function() { spUtil.addErrorMessage('Server error.'); });
        });
    };

    // ── Command: Group management ─────────────────────────────────────────────
    c.createGroup = function() {
        var name = c.ui.newGroupName ? c.ui.newGroupName.trim() : '';
        if (!name) { spUtil.addErrorMessage('Group name is required.'); return; }
        c.server.get({ action: 'create_group', name: name, description: c.ui.newGroupDesc, type: c.ui.newGroupType })
            .then(function(response) {
                var cg = response.data.created_group;
                if (cg && cg.ok) {
                    spUtil.addInfoMessage('Group "' + cg.name + '" created.');
                    c.ui.newGroupName = '';
                    c.ui.newGroupDesc = '';
                    if (c.data.sectionData && c.data.sectionData.groups) {
                        c.data.sectionData.groups.push({ sys_id: cg.sys_id, name: cg.name, type: c.ui.newGroupType });
                    }
                } else {
                    spUtil.addErrorMessage(cg && cg.error ? cg.error : 'Could not create group.');
                }
            }, function() { spUtil.addErrorMessage('Server error.'); });
    };

    c.toggleGroup = function(grp) {
        if (c.ui.expandedGroup && c.ui.expandedGroup.sys_id === grp.sys_id) {
            c.ui.expandedGroup    = null;
            c.ui.groupMembers     = [];
            return;
        }
        c.ui.expandedGroup      = grp;
        c.ui.groupMembers       = [];
        c.ui.groupMembersLoading = true;
        c.ui.addMemberPersonId  = '';
        c.ui.addMemberRole      = 'user';
        c.server.get({ action: 'list_group_members', group_sys_id: grp.sys_id }).then(function(response) {
            c.ui.groupMembers        = response.data.group_members || [];
            c.ui.groupMembersLoading = false;
        }, function() {
            c.ui.groupMembersLoading = false;
        });
    };

    c.addMemberToGroup = function(grp) {
        if (!c.ui.addMemberPersonId) { spUtil.addErrorMessage('Select a person.'); return; }
        c.server.get({ action: 'add_member', group_sys_id: grp.sys_id, person_sys_id: c.ui.addMemberPersonId, group_role: c.ui.addMemberRole })
            .then(function(response) {
                if (response.data.member_added) {
                    spUtil.addInfoMessage('Member added.');
                    c.toggleGroup(grp);
                    $timeout(function() { c.toggleGroup(grp); }, 50);
                } else {
                    spUtil.addErrorMessage('Could not add member.');
                }
            }, function() { spUtil.addErrorMessage('Server error.'); });
    };

    c.removeMemberFromGroup = function(grp, member) {
        spModal.confirm('Remove ' + member.person_name + ' from ' + grp.name + '?').then(function(confirmed) {
            if (!confirmed) { return; }
            c.server.get({ action: 'remove_member', group_sys_id: grp.sys_id, person_sys_id: member.person_sys_id })
                .then(function(response) {
                    if (response.data.member_removed) {
                        spUtil.addInfoMessage('Member removed.');
                        c.ui.groupMembers = c.ui.groupMembers.filter(function(m) { return m.person_sys_id !== member.person_sys_id; });
                    } else {
                        spUtil.addErrorMessage('Could not remove member.');
                    }
                }, function() { spUtil.addErrorMessage('Server error.'); });
        });
    };

    c.toggleMobileNav = function() { c.ui.mobileNavOpen = !c.ui.mobileNavOpen; };

    c.$onInit = function() {
        if (c.data && c.data.initialSection) {
            $timeout(function() { c.navigate(c.data.initialSection); }, 50);
        }
    };

    $timeout(function() {
        if (!c.ui.section && c.data && c.data.initialSection) { c.navigate(c.data.initialSection); }
    }, 300);
};
