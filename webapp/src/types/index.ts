export type SectionId = 'workspace' | 'activity' | 'studio' | 'governance' | 'command';
export type UserRole = 'admin' | 'leadership' | 'creator' | 'user';
export type ExecStatus = 'success' | 'failed' | 'error' | 'running' | 'pending' | 'cancelled' | 'skipped';

export interface NavSection {
  id: SectionId;
  label: string;
  icon: string;
}

export interface OIGroup {
  sys_id: string;
  name: string;
  type?: string;
  member_count?: number;
}

export interface Automation {
  sys_id: string;
  name: string;
  short_description?: string;
  category_color?: string;
  category_icon?: string;
  schedule_active?: boolean;
  owner_group?: string;
  owner_group_sys_id?: string;
}

export interface Execution {
  sys_id: string;
  number?: string;
  automation_name?: string;
  group_name?: string;
  status: ExecStatus;
  triggered_at?: string;
  stepLog?: StepEntry[];
}

export interface StepEntry {
  name?: string;
  message?: string;
  status: string;
  duration?: number;
}

export interface PendingAction {
  sys_id: string;
  type: string;
  description?: string;
  subject_user_name?: string;
  created?: string;
}

export interface Person {
  sys_id: string;
  name: string;
  user_name?: string;
  groups?: { group_name: string; group_role: string }[];
}

export interface GroupMember {
  person_sys_id: string;
  person_name?: string;
  name?: string;
  group_role?: string;
  role?: string;
}

export interface SectionData {
  automations?: Automation[];
  executions?: Execution[];
  deliverable_types?: { name: string; icon?: string }[];
  artifacts?: { display_name: string; artifact_type: string; status: string; updated_at: string }[];
  pending_actions?: PendingAction[];
  groups?: OIGroup[];
  stats?: { persons?: number; automations?: number; executions_today?: number; groups?: number };
  maintenance?: Record<string, boolean>;
}

export interface InitData {
  denied?: boolean;
  deniedLogin?: string;
  userName?: string;
  userInitials?: string;
  userRole?: UserRole;
  sections?: NavSection[];
  userGroups?: OIGroup[];
  initialSection?: SectionId;
  sectionData?: SectionData;
}

declare global {
  interface Window {
    __OI__?: {
      serverCall: (input: Record<string, unknown>) => Promise<{ data: InitData & Record<string, unknown> }>;
    };
    __OI_INIT__?: InitData;
    React: typeof import('react');
    ReactDOM: typeof import('react-dom');
  }
}
