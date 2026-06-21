import type { InitData } from '../types';

type AnyData = InitData & Record<string, unknown>;

async function callSP(input: Record<string, unknown>): Promise<AnyData> {
  if (window.__OI__?.serverCall) {
    const res = await window.__OI__.serverCall(input);
    return res.data as AnyData;
  }
  if (import.meta.env.PROD) {
    throw new Error('SP bridge unavailable in production');
  }
  const res = await fetch('/api/x_infte_ops_int/ops_int_engine/v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Engine call failed: ' + res.status);
  const json = await res.json();
  return (json.result ?? json) as AnyData;
}

export async function loadSection(section: string): Promise<AnyData> {
  return callSP({ action: 'load_section', section });
}

export async function triggerAutomation(automationSysId: string, groupSysId: string): Promise<AnyData> {
  return callSP({ action: 'trigger_automation', automation_sys_id: automationSysId, group_sys_id: groupSysId });
}

export async function loadStepLog(executionSysId: string): Promise<AnyData> {
  return callSP({ action: 'step_log', execution_sys_id: executionSysId });
}

export async function resolveAction(actionSysId: string, resolution: string): Promise<AnyData> {
  return callSP({ action: 'resolve_action', action_sys_id: actionSysId, resolution });
}

export async function listGroupMembers(groupSysId: string): Promise<AnyData> {
  return callSP({ action: 'list_group_members', group_sys_id: groupSysId });
}

export async function addMember(groupSysId: string, personSysId: string, groupRole: string): Promise<AnyData> {
  return callSP({ action: 'add_member', group_sys_id: groupSysId, person_sys_id: personSysId, group_role: groupRole });
}

export async function removeMember(groupSysId: string, personSysId: string): Promise<AnyData> {
  return callSP({ action: 'remove_member', group_sys_id: groupSysId, person_sys_id: personSysId });
}

export async function listPersons(): Promise<AnyData> {
  return callSP({ action: 'list_persons' });
}

export async function searchUsers(query: string): Promise<AnyData> {
  return callSP({ action: 'search_users', query });
}

export async function enrollPerson(userSysId: string, groupSysId: string, groupRole: string): Promise<AnyData> {
  return callSP({ action: 'enroll_person', user_sys_id: userSysId, group_sys_id: groupSysId, group_role: groupRole });
}

export async function unenrollPerson(personSysId: string): Promise<AnyData> {
  return callSP({ action: 'unenroll_person', person_sys_id: personSysId });
}

export async function createGroup(name: string, description: string, type: string): Promise<AnyData> {
  return callSP({ action: 'create_group', name, description, type });
}

export async function toggleMaintenance(propName: string): Promise<AnyData> {
  return callSP({ action: 'toggle_maintenance', prop_name: propName });
}
