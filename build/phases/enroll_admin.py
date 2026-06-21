#!/usr/bin/env python3
"""
Operations Intelligence — Admin Enrollment

Enrolls a ServiceNow user as an Operations Intelligence administrator
through the application's own data model:

  1. Creates an x_infte_ops_int_person record for the user (if not already present).
  2. Ensures an "Administrators" group exists in x_infte_ops_int_group.
  3. Adds the person to that group with group_role = 'admin'.
  4. The existing Group Member Role Sync Business Rule fires automatically,
     calling RoleSyncService.syncGroupMembers() which assigns the
     x_infte_ops_int.admin ServiceNow role.

The entire operation runs as svc_operations_intelligence_api via script.run,
so the Role Assignment Guard Business Rules allow the resulting sys_user_has_role
insert.

Usage:
    python3 build/phases/enroll_admin.py <snow_username>
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec


def enroll(username):
    script = (
        "(function() {\n"
        "    var targetUsername = '" + username.replace("'", "\\'") + "';\n"
        "    var result = { ok: false, steps: [] };\n"
        "\n"
        "    var uGr = new GlideRecord('sys_user');\n"
        "    uGr.addQuery('user_name', targetUsername);\n"
        "    uGr.addQuery('active', true);\n"
        "    uGr.setLimit(1);\n"
        "    uGr.query();\n"
        "    if (!uGr.next()) {\n"
        "        result.error = 'User not found or inactive: ' + targetUsername;\n"
        "        return result;\n"
        "    }\n"
        "    var userSysId = '' + uGr.getUniqueValue();\n"
        "    var userName  = '' + uGr.getDisplayValue('name');\n"
        "    result.steps.push('Found user: ' + userName + ' (' + userSysId + ')');\n"
        "\n"
        "    var pGr = new GlideRecord('x_infte_ops_int_person');\n"
        "    pGr.addQuery('user', userSysId);\n"
        "    pGr.setLimit(1);\n"
        "    pGr.query();\n"
        "    var personSysId;\n"
        "    if (pGr.next()) {\n"
        "        personSysId = '' + pGr.getUniqueValue();\n"
        "        if (pGr.getValue('active') !== 'true' && pGr.getValue('active') !== '1') {\n"
        "            pGr.setValue('active', true);\n"
        "            pGr.update();\n"
        "            result.steps.push('Reactivated existing person record: ' + personSysId);\n"
        "        } else {\n"
        "            result.steps.push('Found existing person record: ' + personSysId);\n"
        "        }\n"
        "    } else {\n"
        "        var newP = new GlideRecord('x_infte_ops_int_person');\n"
        "        newP.initialize();\n"
        "        newP.setValue('user', userSysId);\n"
        "        newP.setValue('active', true);\n"
        "        personSysId = '' + newP.insert();\n"
        "        if (!personSysId) {\n"
        "            result.error = 'Failed to create person record for ' + userName;\n"
        "            return result;\n"
        "        }\n"
        "        result.steps.push('Created person record: ' + personSysId);\n"
        "    }\n"
        "\n"
        "    var ADMIN_GROUP_NAME = 'Administrators';\n"
        "    var gGr = new GlideRecord('x_infte_ops_int_group');\n"
        "    gGr.addQuery('name', ADMIN_GROUP_NAME);\n"
        "    gGr.addQuery('status', '!=', 'archived');\n"
        "    gGr.setLimit(1);\n"
        "    gGr.query();\n"
        "    var groupSysId;\n"
        "    if (gGr.next()) {\n"
        "        groupSysId = '' + gGr.getUniqueValue();\n"
        "        result.steps.push('Found Administrators group: ' + groupSysId);\n"
        "    } else {\n"
        "        groupSysId = new GroupManager().createGroup(\n"
        "            ADMIN_GROUP_NAME,\n"
        "            'Operations Intelligence platform administrators.',\n"
        "            'custom_group',\n"
        "            personSysId,\n"
        "            null,\n"
        "            personSysId\n"
        "        );\n"
        "        if (!groupSysId) {\n"
        "            result.error = 'Failed to create Administrators group.';\n"
        "            return result;\n"
        "        }\n"
        "        result.steps.push('Created Administrators group: ' + groupSysId);\n"
        "    }\n"
        "\n"
        "    var added = new GroupManager().addMember(groupSysId, personSysId, 'admin', personSysId);\n"
        "    if (!added) {\n"
        "        result.error = 'GroupManager.addMember returned false.';\n"
        "        return result;\n"
        "    }\n"
        "    result.steps.push('Added ' + userName + ' to Administrators group with role admin.');\n"
        "\n"
        "    var synced = new RoleSyncService().syncPersonRoles(personSysId);\n"
        "    result.steps.push('RoleSyncService.syncPersonRoles: ' + (synced ? 'ok' : 'no-op'));\n"
        "\n"
        "    result.ok = true;\n"
        "    result.person_sys_id = personSysId;\n"
        "    result.group_sys_id  = groupSysId;\n"
        "    result.user_name     = userName;\n"
        "    return result;\n"
        "})()"
    )

    r = ec.op("script.run", script=script)
    return r


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 enroll_admin.py <snow_username>")
        sys.exit(1)
    username = sys.argv[1]
    print("Enrolling '%s' as Operations Intelligence administrator..." % username)
    result = enroll(username)
    if result.get("ok"):
        print("SUCCESS")
        for step in result.get("steps", []):
            print("  +", step)
        print("  Person sys_id:", result.get("person_sys_id", ""))
        print("  Group  sys_id:", result.get("group_sys_id", ""))
        print("  User name    :", result.get("user_name", ""))
    else:
        err = result.get("error") or result.get("message") or json.dumps(result)
        print("FAILED:", err)
        for step in result.get("steps", []):
            print("  .", step)
        sys.exit(1)


if __name__ == "__main__":
    main()
