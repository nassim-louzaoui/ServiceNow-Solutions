api.controller = function($scope, $timeout, spModal, spUtil) {
    var c = this;

    /*
     * UI state namespace — all mutable view state lives here so template
     * bindings stay predictable and we avoid polluting the controller root
     * with transient values that conflict with c.data (server-populated).
     */
    c.ui = {
        section:              '',
        loading:              false,
        error:                '',
        search:               '',
        selectedGroup:        '',
        activityFilter:       'all',
        expandedExecution:    null,
        stepLogLoading:       false,
        mobileNavOpen:        false,
        sidebarCollapsed:     false,

        commandTab:           'stats',

        userSearchQuery:      '',
        userSearchResults:    [],
        userSearchLoading:    false,

        persons:              [],
        personsLoading:       false,

        newGroupName:         '',
        newGroupDesc:         '',
        newGroupType:         'custom_group',

        expandedGroup:        null,
        groupMembers:         [],
        groupMembersLoading:  false,
        addMemberPersonId:    '',
        addMemberRole:        'user',

        govExpandedGroup:     null,
        govGroupMembers:      [],
        govGroupMembersLoading: false,
        govAddPersonId:       '',
        govAddRole:           'user',
        govTab:               'actions',

        maintenanceItems:     []
    };

    c.statusFilters = [
        { value: 'all',       label: 'All' },
        { value: 'success',   label: 'Success' },
        { value: 'failed',    label: 'Failed' },
        { value: 'running',   label: 'Running' },
        { value: 'pending',   label: 'Pending' },
        { value: 'cancelled', label: 'Cancelled' }
    ];

    c.groupTypes = [
        { value: 'custom_group',     label: 'Custom Group' },
        { value: 'leadership_group', label: 'Leadership Group' },
        { value: 'creator_group',    label: 'Creator Group' }
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

    /*
     * Core server call wrapper.
     * Uses c.server.get() — the SP widget's built-in RPC proxy.
     * Resolves with response.data (the object the server script populated in `data`).
     */
    function serverCall(inputData, successCb, errorCb) {
        c.ui.loading = true;
        c.ui.error   = '';
        c.server.get(inputData).then(function(response) {
            c.ui.loading = false;
            if (successCb) { successCb(response.data); }
        }, function() {
            c.ui.loading = false;
            c.ui.error = 'An unexpected error occurred. Please refresh and try again.';
            if (errorCb) { errorCb(); }
        });
    }

    /*
     * Lightweight server call that does NOT set the global loading flag —
     * used for sub-panel loads (step log, group members) that have their
     * own local loading indicators.
     */
    function serverCallQuiet(inputData, successCb, errorCb) {
        c.server.get(inputData).then(function(response) {
            if (successCb) { successCb(response.data); }
        }, function() {
            if (errorCb) { errorCb(); }
        });
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    c.navigate = function(sectionId) {
        if (c.ui.loading) { return; }
        c.ui.mobileNavOpen     = false;
        c.ui.expandedExecution = null;
        c.ui.expandedGroup     = null;
        c.ui.govExpandedGroup  = null;
        c.ui.search            = '';
        c.ui.activityFilter    = 'all';
        c.ui.loading           = true;
        c.ui.error             = '';

        c.server.get({ action: 'load_section', section: sectionId }).then(function(response) {
            c.data.sectionData = response.data.sectionData;
            c.ui.section       = sectionId;
            c.ui.loading       = false;
            c.ui.commandTab    = 'stats';

            if (sectionId === 'command') {
                var mnt = (c.data.sectionData && c.data.sectionData.maintenance) ? c.data.sectionData.maintenance : {};
                c.ui.maintenanceItems = [
                    { key: 'workspace',  label: 'Workspace',  desc: 'Disable automation execution for all users',   prop: 'x_infte_ops_int.maintenance.workspace',  enabled: !!mnt.workspace  },
                    { key: 'activity',   label: 'Activity',   desc: 'Hide execution history from users',             prop: 'x_infte_ops_int.maintenance.activity',   enabled: !!mnt.activity   },
                    { key: 'studio',     label: 'Studio',     desc: 'Disable Studio access for creators',            prop: 'x_infte_ops_int.maintenance.studio',     enabled: !!mnt.studio     },
                    { key: 'governance', label: 'Governance', desc: 'Disable governance actions for leadership',     prop: 'x_infte_ops_int.maintenance.governance', enabled: !!mnt.governance }
                ];
                c.loadPersons();
            }
        }, function() {
            c.ui.loading = false;
            c.ui.error   = 'Failed to load section. Please try again.';
        });
    };

    c.toggleMobileNav = function() {
        c.ui.mobileNavOpen = !c.ui.mobileNavOpen;
    };

    c.toggleSidebar = function() {
        c.ui.sidebarCollapsed = !c.ui.sidebarCollapsed;
    };

    c.currentSectionLabel = function() {
        if (!c.ui.section || !c.data.sections) { return 'Operations Intelligence'; }
        var i;
        for (i = 0; i < c.data.sections.length; i++) {
            if (c.data.sections[i].id === c.ui.section) { return c.data.sections[i].label; }
        }
        return 'Operations Intelligence';
    };

    // ── Workspace ─────────────────────────────────────────────────────────────

    c.selectGroup = function(groupSysId) {
        c.ui.selectedGroup = groupSysId;
    };

    c.filteredAutomations = function() {
        if (!c.data.sectionData || !c.data.sectionData.automations) { return []; }
        var automations = c.data.sectionData.automations;
        var search      = c.ui.search ? c.ui.search.toLowerCase() : '';
        var group       = c.ui.selectedGroup;
        var result      = [];
        var i, a, hay;
        for (i = 0; i < automations.length; i++) {
            a = automations[i];
            if (group && a.owner_group_sys_id !== group) { continue; }
            if (search) {
                hay = ((a.name || '') + ' ' + (a.short_description || '') + ' ' + (a.owner_group || '')).toLowerCase();
                if (hay.indexOf(search) === -1) { continue; }
            }
            result.push(a);
        }
        return result;
    };

    c.triggerAutomation = function(auto) {
        spModal.confirm('Run automation "' + (auto.name || auto.sys_id) + '"?').then(function(confirmed) {
            if (!confirmed) { return; }
            serverCallQuiet({
                action:            'trigger_automation',
                automation_sys_id: auto.sys_id,
                group_sys_id:      auto.owner_group_sys_id || ''
            }, function(d) {
                var t = d.triggered;
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

    // ── Activity ──────────────────────────────────────────────────────────────

    c.filteredExecutions = function() {
        if (!c.data.sectionData || !c.data.sectionData.executions) { return []; }
        var executions = c.data.sectionData.executions;
        var filter     = c.ui.activityFilter;
        var search     = c.ui.search ? c.ui.search.toLowerCase() : '';
        var result     = [];
        var i, e, hay;
        for (i = 0; i < executions.length; i++) {
            e = executions[i];
            if (filter !== 'all' && e.status !== filter) { continue; }
            if (search) {
                hay = ((e.number || '') + ' ' + (e.automation_name || '') + ' ' + (e.channel || '')).toLowerCase();
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
        c.ui.expandedExecution = exc;
        exc.stepLog            = null;
        c.ui.stepLogLoading    = true;

        serverCallQuiet({ action: 'step_log', execution_sys_id: exc.sys_id }, function(d) {
            exc.stepLog         = d.stepLog || [];
            c.ui.stepLogLoading = false;
        }, function() {
            exc.stepLog         = [];
            c.ui.stepLogLoading = false;
        });
    };

    c.isExpandedExecution = function(exc) {
        return c.ui.expandedExecution && c.ui.expandedExecution.sys_id === exc.sys_id;
    };

    c.stepLogEntries = function() {
        if (!c.ui.expandedExecution || !c.ui.expandedExecution.stepLog) { return []; }
        return c.ui.expandedExecution.stepLog;
    };

    // ── Governance ────────────────────────────────────────────────────────────

    c.resolveAction = function(action, resolution) {
        var confirmMsg = resolution === 'approved' ? 'Approve this action?' : 'Reject this action?';
        spModal.confirm(confirmMsg).then(function(confirmed) {
            if (!confirmed) { return; }
            serverCallQuiet({
                action:         'resolve_action',
                action_sys_id:  action.sys_id,
                resolution:     resolution
            }, function(d) {
                if (d.resolved) {
                    var pending = c.data.sectionData && c.data.sectionData.pending_actions;
                    if (pending) {
                        var i;
                        for (i = 0; i < pending.length; i++) {
                            if (pending[i].sys_id === action.sys_id) {
                                pending.splice(i, 1);
                                break;
                            }
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

        serverCallQuiet({ action: 'list_group_members', group_sys_id: grp.sys_id }, function(d) {
            c.ui.govGroupMembers        = d.group_members || [];
            c.ui.govGroupMembersLoading = false;
        }, function() {
            c.ui.govGroupMembersLoading = false;
        });
    };

    c.govAddMember = function(grp) {
        if (!c.ui.govAddPersonId) { spUtil.addErrorMessage('Select a person first.'); return; }
        serverCallQuiet({
            action:         'add_member',
            group_sys_id:   grp.sys_id,
            person_sys_id:  c.ui.govAddPersonId,
            group_role:     c.ui.govAddRole
        }, function(d) {
            if (d.member_added) {
                spUtil.addInfoMessage('Member added.');
                c.ui.govExpandedGroup = null;
                $timeout(function() { c.toggleGovGroup(grp); }, 50);
            } else {
                spUtil.addErrorMessage('Could not add member.');
            }
        }, function() {
            spUtil.addErrorMessage('Server error.');
        });
    };

    c.govRemoveMember = function(grp, member) {
        spModal.confirm('Remove ' + member.person_name + ' from ' + grp.name + '?').then(function(confirmed) {
            if (!confirmed) { return; }
            serverCallQuiet({
                action:        'remove_member',
                group_sys_id:  grp.sys_id,
                person_sys_id: member.person_sys_id
            }, function(d) {
                if (d.member_removed) {
                    spUtil.addInfoMessage('Member removed.');
                    c.ui.govGroupMembers = c.ui.govGroupMembers.filter(function(m) {
                        return m.person_sys_id !== member.person_sys_id;
                    });
                } else {
                    spUtil.addErrorMessage('Could not remove member.');
                }
            }, function() {
                spUtil.addErrorMessage('Server error.');
            });
        });
    };

    // ── Command: tab navigation ───────────────────────────────────────────────

    c.setCommandTab = function(tab) {
        c.ui.commandTab    = tab;
        c.ui.expandedGroup = null;
        c.ui.groupMembers  = [];
        if (tab === 'people') { c.loadPersons(); }
    };

    // ── Command: maintenance toggles ──────────────────────────────────────────

    c.toggleMaintenance = function(item) {
        if (!item) { return; }
        serverCallQuiet({ action: 'toggle_maintenance', prop_name: item.prop }, function() {
            item.enabled = !item.enabled;
        });
    };

    // ── Command: people management ────────────────────────────────────────────

    c.loadPersons = function() {
        c.ui.personsLoading = true;
        serverCallQuiet({ action: 'list_persons' }, function(d) {
            c.ui.persons        = d.persons || [];
            c.ui.personsLoading = false;
        }, function() {
            c.ui.personsLoading = false;
        });
    };

    c.searchUsers = function() {
        var q = c.ui.userSearchQuery;
        if (!q || q.length < 2) { c.ui.userSearchResults = []; return; }
        c.ui.userSearchLoading = true;
        serverCallQuiet({ action: 'search_users', query: q }, function(d) {
            c.ui.userSearchResults = d.users || [];
            c.ui.userSearchLoading = false;
        }, function() {
            c.ui.userSearchLoading = false;
        });
    };

    c.enrollUser = function(user) {
        var groups    = (c.data.sectionData && c.data.sectionData.groups) || [];
        var groupOpts = '';
        var gi;
        for (gi = 0; gi < groups.length; gi++) {
            groupOpts += '<option value="' + groups[gi].sys_id + '">' + groups[gi].name + '</option>';
        }

        spModal.open({
            title:   'Enroll ' + user.name,
            message: '<p>Select a group and role to assign:</p>' +
                     '<div class="form-group"><label>Group (optional)</label>' +
                     '<select id="oi-enroll-group" class="form-control"><option value="">— No group —</option>' + groupOpts + '</select></div>' +
                     '<div class="form-group"><label>Role</label>' +
                     '<select id="oi-enroll-role" class="form-control">' +
                     '<option value="user">User</option>' +
                     '<option value="creator">Creator</option>' +
                     '<option value="leadership">Leadership</option>' +
                     '<option value="admin">Admin</option>' +
                     '</select></div>',
            buttons: [{ label: 'Enroll', primary: true }, { label: 'Cancel' }]
        }).then(function(btn) {
            if (!btn || btn.label === 'Cancel') { return; }
            var grpEl  = document.getElementById('oi-enroll-group');
            var roleEl = document.getElementById('oi-enroll-role');
            var grpId  = grpEl  ? grpEl.value  : '';
            var role   = roleEl ? roleEl.value  : 'user';
            serverCallQuiet({
                action:        'enroll_person',
                user_sys_id:   user.sys_id,
                group_sys_id:  grpId,
                group_role:    role
            }, function(d) {
                var e = d.enrolled;
                if (e && e.ok) {
                    spUtil.addInfoMessage((e.name || 'User') + ' enrolled.');
                    user.already_enrolled = true;
                    user.person_sys_id    = e.person_sys_id;
                } else {
                    spUtil.addErrorMessage(e && e.error ? e.error : 'Enrollment failed.');
                }
            }, function() {
                spUtil.addErrorMessage('Server error during enrollment.');
            });
        });
    };

    c.unenrollPerson = function(person) {
        spModal.confirm('Remove ' + person.name + ' from Operations Intelligence? This will revoke all roles.').then(function(confirmed) {
            if (!confirmed) { return; }
            serverCallQuiet({ action: 'unenroll_person', person_sys_id: person.sys_id }, function(d) {
                if (d.unenrolled && d.unenrolled.ok) {
                    spUtil.addInfoMessage(person.name + ' removed from Operations Intelligence.');
                    c.ui.persons = c.ui.persons.filter(function(p) { return p.sys_id !== person.sys_id; });
                } else {
                    spUtil.addErrorMessage('Could not remove person.');
                }
            }, function() {
                spUtil.addErrorMessage('Server error.');
            });
        });
    };

    // ── Command: group management ─────────────────────────────────────────────

    c.createGroup = function() {
        var name = c.ui.newGroupName ? c.ui.newGroupName.trim() : '';
        if (!name) { spUtil.addErrorMessage('Group name is required.'); return; }

        serverCallQuiet({
            action:      'create_group',
            name:        name,
            description: c.ui.newGroupDesc || '',
            type:        c.ui.newGroupType  || 'custom_group'
        }, function(d) {
            var cg = d.created_group;
            if (cg && cg.ok) {
                spUtil.addInfoMessage('Group "' + cg.name + '" created.');
                c.ui.newGroupName = '';
                c.ui.newGroupDesc = '';
                if (c.data.sectionData && c.data.sectionData.groups) {
                    c.data.sectionData.groups.push({
                        sys_id: cg.sys_id,
                        name:   cg.name,
                        type:   c.ui.newGroupType
                    });
                }
            } else {
                spUtil.addErrorMessage(cg && cg.error ? cg.error : 'Could not create group.');
            }
        }, function() {
            spUtil.addErrorMessage('Server error.');
        });
    };

    c.toggleGroup = function(grp) {
        if (c.ui.expandedGroup && c.ui.expandedGroup.sys_id === grp.sys_id) {
            c.ui.expandedGroup = null;
            c.ui.groupMembers  = [];
            return;
        }
        c.ui.expandedGroup       = grp;
        c.ui.groupMembers        = [];
        c.ui.groupMembersLoading = true;
        c.ui.addMemberPersonId   = '';
        c.ui.addMemberRole       = 'user';

        serverCallQuiet({ action: 'list_group_members', group_sys_id: grp.sys_id }, function(d) {
            c.ui.groupMembers        = d.group_members || [];
            c.ui.groupMembersLoading = false;
        }, function() {
            c.ui.groupMembersLoading = false;
        });
    };

    c.addMemberToGroup = function(grp) {
        if (!c.ui.addMemberPersonId) { spUtil.addErrorMessage('Select a person.'); return; }
        serverCallQuiet({
            action:        'add_member',
            group_sys_id:  grp.sys_id,
            person_sys_id: c.ui.addMemberPersonId,
            group_role:    c.ui.addMemberRole
        }, function(d) {
            if (d.member_added) {
                spUtil.addInfoMessage('Member added.');
                c.ui.expandedGroup = null;
                $timeout(function() { c.toggleGroup(grp); }, 50);
            } else {
                spUtil.addErrorMessage('Could not add member.');
            }
        }, function() {
            spUtil.addErrorMessage('Server error.');
        });
    };

    c.removeMemberFromGroup = function(grp, member) {
        spModal.confirm('Remove ' + member.person_name + ' from ' + grp.name + '?').then(function(confirmed) {
            if (!confirmed) { return; }
            serverCallQuiet({
                action:        'remove_member',
                group_sys_id:  grp.sys_id,
                person_sys_id: member.person_sys_id
            }, function(d) {
                if (d.member_removed) {
                    spUtil.addInfoMessage('Member removed.');
                    c.ui.groupMembers = c.ui.groupMembers.filter(function(m) {
                        return m.person_sys_id !== member.person_sys_id;
                    });
                } else {
                    spUtil.addErrorMessage('Could not remove member.');
                }
            }, function() {
                spUtil.addErrorMessage('Server error.');
            });
        });
    };

    // ── CSS class helpers ─────────────────────────────────────────────────────

    c.statusClass = function(status) {
        var map = {
            success:   'oi-badge-success',
            failed:    'oi-badge-danger',
            error:     'oi-badge-danger',
            running:   'oi-badge-info',
            pending:   'oi-badge-warning',
            cancelled: 'oi-badge-muted',
            skipped:   'oi-badge-muted'
        };
        return 'oi-badge ' + (map[status] || 'oi-badge-muted');
    };

    c.stepStatusDot = function(status) {
        var map = {
            success:   'oi-dot-success',
            failed:    'oi-dot-danger',
            error:     'oi-dot-danger',
            running:   'oi-dot-info',
            pending:   'oi-dot-warning',
            skipped:   'oi-dot-muted',
            cancelled: 'oi-dot-muted'
        };
        return 'oi-step-dot ' + (map[status] || 'oi-dot-muted');
    };

    c.pendingActionIcon = function(actionType) {
        var map = {
            approve_member:    'fa-user-plus',
            review_automation: 'fa-cogs',
            approve_artifact:  'fa-cube',
            review_use_case:   'fa-lightbulb-o'
        };
        return 'fa ' + (map[actionType] || 'fa-bell');
    };

    // ── Initialisation ────────────────────────────────────────────────────────

    c.$onInit = function() {
        if (c.data && c.data.initialSection) {
            $timeout(function() { c.navigate(c.data.initialSection); }, 50);
        } else if (c.data && c.data.sections && c.data.sections.length > 0) {
            $timeout(function() { c.navigate(c.data.sections[0].id); }, 50);
        }
    };

    /*
     * Fallback guard: if $onInit did not fire (SP version quirk) or the
     * section is still blank after the initial digest, navigate to the
     * first available section.
     */
    $timeout(function() {
        if (!c.ui.section && c.data && c.data.sections && c.data.sections.length > 0) {
            c.navigate(c.data.sections[0].id);
        }
    }, 300);
};
