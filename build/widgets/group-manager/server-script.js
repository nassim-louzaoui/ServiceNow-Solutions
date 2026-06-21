(function() {
    var userSysId = gs.getUserID();
    var pr = new PermissionResolver();
    data.personSysId = pr.getPersonByUser(userSysId);
    data.message = '';
    data.error = '';

    if (input && input.action) {
        _handleAction(input);
    }

    data.groups = [];
    data.onboarding = [];
    if (data.personSysId) {
        _loadOwnedGroups(data.personSysId);
        _loadOnboardingQueue(data.personSysId);
    }

    function _ownedGroupSysIds(personSysId) {
        var ids = [];
        var grp = new GlideRecord('x_infte_ops_int_group');
        grp.addQuery('owner', personSysId);
        grp.addQuery('status', 'active');
        grp.query();
        while (grp.next()) {
            ids.push('' + grp.getUniqueValue());
        }
        return ids;
    }

    function _loadOwnedGroups(personSysId) {
        var gm = new GroupManager();
        var grp = new GlideRecord('x_infte_ops_int_group');
        grp.addQuery('owner', personSysId);
        grp.addQuery('status', 'active');
        grp.addNullQuery('parent_group');
        grp.orderBy('type');
        grp.query();
        while (grp.next()) {
            data.groups.push(_buildGroupNode(grp, gm));
        }

        var childGrp = new GlideRecord('x_infte_ops_int_group');
        childGrp.addQuery('owner', personSysId);
        childGrp.addQuery('status', 'active');
        childGrp.addNotNullQuery('parent_group');
        childGrp.orderBy('name');
        childGrp.query();
        while (childGrp.next()) {
            var node = _buildGroupNode(childGrp, gm);
            node.parent_group = '' + childGrp.getValue('parent_group');
            var attached = false;
            var i;
            for (i = 0; i < data.groups.length; i++) {
                if (data.groups[i].sys_id === node.parent_group) {
                    data.groups[i].children.push(node);
                    attached = true;
                    break;
                }
            }
            if (!attached) {
                data.groups.push(node);
            }
        }
    }

    function _buildGroupNode(grp, gm) {
        var groupSysId = '' + grp.getUniqueValue();
        return {
            sys_id: groupSysId,
            name: '' + grp.getValue('name'),
            type: '' + grp.getValue('type'),
            description: '' + grp.getValue('description'),
            members: gm.getMembers(groupSysId),
            children: []
        };
    }

    function _loadOnboardingQueue(personSysId) {
        var nowMs = new GlideDateTime().getNumericValue();
        var req = new GlideRecord('x_infte_ops_int_onboarding_request');
        req.addQuery('initiated_by', personSysId);
        req.addQuery('status', 'IN', 'pending,expired');
        req.orderByDesc('invited_at');
        req.query();
        while (req.next()) {
            var expiryStr = '' + req.getValue('expiry_at');
            var status = '' + req.getValue('status');
            var expiryMs = null;
            if (expiryStr) {
                var gdt = new GlideDateTime(expiryStr);
                expiryMs = gdt.getNumericValue();
            }
            var expiringSoon = (status === 'pending' && expiryMs !== null && (expiryMs - nowMs) < 12 * 3600000 && (expiryMs - nowMs) > 0);
            var count = parseInt(req.getValue('re_invitation_count') || '0', 10);
            data.onboarding.push({
                sys_id: '' + req.getUniqueValue(),
                number: '' + req.getValue('number'),
                nominee: '' + req.getDisplayValue('nominee'),
                target_group: '' + req.getDisplayValue('target_group'),
                group_role: '' + req.getValue('group_role'),
                system_role: '' + req.getValue('system_role'),
                status: status,
                expiry_at: expiryStr,
                expired: status === 'expired',
                expiring_soon: expiringSoon,
                re_invitation_count: count,
                can_reinvite: count < 2 && (status === 'expired' || status === 'pending')
            });
        }
    }

    function _handleAction(inp) {
        var action = '' + inp.action;
        var pr2 = new PermissionResolver();

        if (action === 'add_member') {
            var groupSysId = '' + (inp.group_sys_id || '');
            var personToAdd = '' + (inp.person_sys_id || '');
            var role = '' + (inp.group_role || 'user');
            if (!pr2.canManageGroup(userSysId, groupSysId)) {
                data.error = 'You do not manage this group.';
                return;
            }
            if (!groupSysId || !personToAdd) {
                data.error = 'Group and person are required.';
                return;
            }
            var added = new GroupManager().addMember(groupSysId, personToAdd, role, data.personSysId);
            data.message = added ? 'Member added.' : 'Could not add member.';
            return;
        }

        if (action === 'remove_member') {
            var rGroup = '' + (inp.group_sys_id || '');
            var rPerson = '' + (inp.person_sys_id || '');
            if (!pr2.canManageGroup(userSysId, rGroup)) {
                data.error = 'You do not manage this group.';
                return;
            }
            var removed = new GroupManager().removeMember(rGroup, rPerson);
            data.message = removed ? 'Member removed.' : 'Member was not active.';
            return;
        }

        if (action === 'reinvite') {
            var reqSysId = '' + (inp.onboarding_request_sys_id || '');
            if (!reqSysId) {
                data.error = 'Missing onboarding request.';
                return;
            }
            var ob = new GlideRecord('x_infte_ops_int_onboarding_request');
            if (!ob.get(reqSysId) || '' + ob.getValue('initiated_by') !== '' + data.personSysId) {
                data.error = 'This onboarding request is not yours to manage.';
                return;
            }
            var result = new OnboardingService().reinvite(reqSysId);
            if (result && result.reinvited) {
                data.message = 'Re-invitation sent.';
            } else {
                data.error = (result && result.error === 'max_reinvitations_reached') ?
                    'Maximum re-invitations reached.' : 'Could not re-invite.';
            }
            return;
        }

        data.error = 'Unknown action.';
    }

    data.candidatePersons = [];
    if (data.personSysId) {
        _loadCandidatePersons();
    }

    function _loadCandidatePersons() {
        var seen = {};
        var rel = new GlideRecord('x_infte_ops_int_reporting_relationship');
        rel.addQuery('leader', data.personSysId);
        rel.addQuery('status', 'active');
        rel.query();
        while (rel.next()) {
            var p = '' + rel.getValue('direct_report');
            if (!seen[p]) {
                seen[p] = true;
                data.candidatePersons.push({ sys_id: p, name: '' + rel.getDisplayValue('direct_report') });
            }
        }
    }
})();
