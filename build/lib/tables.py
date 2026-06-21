#!/usr/bin/env python3
"""
Operations Intelligence — Data Model Definition

The authoritative, machine-readable form of the 19-table data model defined in
architecture/solution-architecture.md. Field type shorthands map to ServiceNow
glide object names in phases/phase1_tables.py.

Shorthands:
  str(n)   string, max_length n (default 255)
  txt      long string, max_length 4000
  json     large string for JSON payloads, max_length 16000
  dt       glide_date_time
  bool     boolean
  int      integer
  ref(T)   reference to physical table T (use scope() for in-scope tables)
  pw2      password2 (encrypted)
  choice   string + choice list (choices listed separately)
"""

# Choice lists keyed by (table_short, field) -> list of (value, label, sequence)
CHOICES = {}


def _c(table_short, field, pairs):
    CHOICES[(table_short, field)] = [
        (v, l, i * 10) for i, (v, l) in enumerate(pairs)
    ]


# Autonumber prefixes keyed by table short name
AUTONUMBER = {
    "onboarding_request": "ONB",
    "automation": "AUT",
    "execution": "EXC",
    "use_case_request": "UCR",
    "pending_action": "PND",
    "managed_artifact": "ART",
}

# Field definition tuples: (element, type, label, opts_dict)
# Tables are listed in creation order; reference targets may be other in-scope
# tables — all tables are created before any field is added, so forward and
# self references resolve cleanly.

TABLES = [
    ("person", "Person", [
        ("user", "ref:sys_user", "User", {"mandatory": True}),
        ("onboarded_by", "ref:person", "Onboarded By", {}),
        ("onboarded_at", "dt", "Onboarded At", {}),
        ("onboarding_status", "choice", "Onboarding Status", {"max_length": 40}),
        ("invitation_sent_at", "dt", "Invitation Sent At", {}),
        ("delegation_rights", "bool", "Delegation Rights", {"default": "false"}),
        ("copilot_enabled", "bool", "Copilot Enabled", {"default": "false"}),
        ("active", "bool", "Active", {"default": "true"}),
    ]),
    ("reporting_relationship", "Reporting Relationship", [
        ("leader", "ref:person", "Leader", {"mandatory": True}),
        ("direct_report", "ref:person", "Direct Report", {"mandatory": True}),
        ("relationship_type", "choice", "Relationship Type", {"max_length": 40}),
        ("created_by_person", "ref:person", "Created By", {}),
        ("created_at", "dt", "Created At", {}),
        ("status", "choice", "Status", {"max_length": 40}),
    ]),
    ("group", "Group", [
        ("name", "str:200", "Name", {"mandatory": True}),
        ("description", "txt", "Description", {}),
        ("type", "choice", "Type", {"max_length": 40}),
        ("owner", "ref:person", "Owner", {}),
        ("parent_group", "ref:group", "Parent Group", {}),
        ("created_by_person", "ref:person", "Created By", {}),
        ("created_at", "dt", "Created At", {}),
        ("status", "choice", "Status", {"max_length": 40}),
    ]),
    ("group_member", "Group Member", [
        ("group", "ref:group", "Group", {"mandatory": True}),
        ("member", "ref:person", "Member", {"mandatory": True}),
        ("group_role", "choice", "Group Role", {"max_length": 40}),
        ("added_by", "ref:person", "Added By", {}),
        ("added_at", "dt", "Added At", {}),
        ("status", "choice", "Status", {"max_length": 40}),
    ]),
    ("onboarding_request", "Onboarding Request", [
        ("number", "str:40", "Number", {"read_only": True}),
        ("nominee", "ref:person", "Nominee", {}),
        ("initiated_by", "ref:person", "Initiated By", {}),
        ("target_group", "ref:group", "Target Group", {}),
        ("group_role", "choice", "Group Role", {"max_length": 40}),
        ("system_role", "choice", "System Role", {"max_length": 40}),
        ("delegation_rights", "bool", "Delegation Rights", {"default": "false"}),
        ("status", "choice", "Status", {"max_length": 40}),
        ("re_invitation_count", "int", "Re-invitation Count", {"default": "0"}),
        ("invited_at", "dt", "Invited At", {}),
        ("completed_at", "dt", "Completed At", {}),
        ("expiry_at", "dt", "Expiry At", {}),
        ("decline_reason", "txt", "Decline Reason", {}),
    ]),
    ("automation_category", "Automation Category", [
        ("name", "str:200", "Name", {"mandatory": True}),
        ("description", "txt", "Description", {}),
        ("color", "str:20", "Color", {}),
        ("icon", "str:80", "Icon", {}),
        ("active", "bool", "Active", {"default": "true"}),
        ("created_by_person", "ref:person", "Created By", {}),
    ]),
    ("approved_flow", "Approved Flow", [
        ("flow_sys_id", "str:40", "Flow Sys ID", {}),
        ("display_name", "str:200", "Display Name", {"mandatory": True}),
        ("description", "txt", "Description", {}),
        ("input_variables", "json", "Input Variables", {}),
        ("active", "bool", "Active", {"default": "true"}),
        ("approved_by", "ref:person", "Approved By", {}),
        ("approved_at", "dt", "Approved At", {}),
    ]),
    ("automation", "Automation", [
        ("number", "str:40", "Number", {"read_only": True}),
        ("name", "str:200", "Name", {"mandatory": True}),
        ("short_description", "str:255", "Short Description", {}),
        ("description", "txt", "Description", {}),
        ("category", "ref:automation_category", "Category", {}),
        ("trigger_phrases", "json", "Trigger Phrases", {}),
        ("status", "choice", "Status", {"max_length": 40}),
        ("version", "int", "Version", {"default": "1"}),
        ("base_automation", "ref:automation", "Base Automation", {}),
        ("owner_group", "ref:group", "Owner Group", {}),
        ("created_by_person", "ref:person", "Created By", {}),
        ("submitted_at", "dt", "Submitted At", {}),
        ("approved_at", "dt", "Approved At", {}),
        ("approved_by", "ref:person", "Approved By", {}),
        ("rejected_at", "dt", "Rejected At", {}),
        ("rejected_by", "ref:person", "Rejected By", {}),
        ("rejected_reason", "txt", "Rejected Reason", {}),
        ("estimated_time_saved", "int", "Estimated Time Saved", {"default": "0"}),
        ("usage_count", "int", "Usage Count", {"default": "0"}),
        ("browsable", "bool", "Browsable", {"default": "false"}),
        ("active", "bool", "Active", {"default": "true"}),
    ]),
    ("automation_version", "Automation Version", [
        ("automation", "ref:automation", "Automation", {"mandatory": True}),
        ("version_number", "int", "Version Number", {}),
        ("snapshot_steps", "json", "Snapshot Steps", {}),
        ("snapshot_inputs", "json", "Snapshot Inputs", {}),
        ("snapshot_trigger_phrases", "json", "Snapshot Trigger Phrases", {}),
        ("published_at", "dt", "Published At", {}),
        ("published_by", "ref:person", "Published By", {}),
    ]),
    ("automation_step", "Automation Step", [
        ("automation", "ref:automation", "Automation", {"mandatory": True}),
        ("order", "int", "Order", {}),
        ("name", "str:200", "Name", {}),
        ("action_type", "choice", "Action Type", {"max_length": 40}),
        ("configuration", "json", "Configuration", {}),
        ("branch_true_step", "int", "Branch True Step", {}),
        ("branch_false_step", "int", "Branch False Step", {}),
        ("on_failure", "choice", "On Failure", {"max_length": 40}),
        ("active", "bool", "Active", {"default": "true"}),
    ]),
    ("automation_input", "Automation Input", [
        ("automation", "ref:automation", "Automation", {"mandatory": True}),
        ("order", "int", "Order", {}),
        ("label", "str:255", "Label", {}),
        ("field_name", "str:100", "Field Name", {}),
        ("input_type", "choice", "Input Type", {"max_length": 40}),
        ("choices", "json", "Choices", {}),
        ("required", "bool", "Required", {"default": "false"}),
        ("validation_regex", "str:255", "Validation Regex", {}),
    ]),
    ("group_automation", "Group Automation", [
        ("group", "ref:group", "Group", {"mandatory": True}),
        ("automation", "ref:automation", "Automation", {"mandatory": True}),
        ("added_by", "ref:person", "Added By", {}),
        ("added_at", "dt", "Added At", {}),
        ("approval_status", "choice", "Approval Status", {"max_length": 40}),
        ("approved_by", "ref:person", "Approved By", {}),
        ("approved_at", "dt", "Approved At", {}),
        ("rejected_reason", "txt", "Rejected Reason", {}),
    ]),
    ("execution", "Execution", [
        ("number", "str:40", "Number", {"read_only": True}),
        ("automation", "ref:automation", "Automation", {}),
        ("automation_version", "int", "Automation Version", {}),
        ("triggered_by", "ref:person", "Triggered By", {}),
        ("triggered_at", "dt", "Triggered At", {}),
        ("channel", "choice", "Channel", {"max_length": 40}),
        ("status", "choice", "Status", {"max_length": 40}),
        ("is_test", "bool", "Is Test", {"default": "false"}),
        ("input_values", "json", "Input Values", {}),
        ("completed_at", "dt", "Completed At", {}),
        ("group", "ref:group", "Group", {}),
    ]),
    ("execution_step_log", "Execution Step Log", [
        ("execution", "ref:execution", "Execution", {"mandatory": True}),
        ("step_order", "int", "Step Order", {}),
        ("step_name", "str:200", "Step Name", {}),
        ("action_type", "str:40", "Action Type", {}),
        ("status", "choice", "Status", {"max_length": 40}),
        ("started_at", "dt", "Started At", {}),
        ("completed_at", "dt", "Completed At", {}),
        ("output", "json", "Output", {}),
        ("error_message", "txt", "Error Message", {}),
    ]),
    ("automation_schedule", "Automation Schedule", [
        ("automation", "ref:automation", "Automation", {"mandatory": True}),
        ("schedule_type", "choice", "Schedule Type", {"max_length": 40}),
        ("cron_expression", "str:100", "Cron Expression", {}),
        ("run_at", "dt", "Run At", {}),
        ("timezone", "str:80", "Timezone", {}),
        ("active", "bool", "Active", {"default": "true"}),
        ("sysauto_sys_id", "str:40", "Scheduled Job Sys ID", {}),
        ("created_at", "dt", "Created At", {}),
    ]),
    ("use_case_request", "Use Case Request", [
        ("number", "str:40", "Number", {"read_only": True}),
        ("title", "str:255", "Title", {}),
        ("description", "txt", "Description", {}),
        ("structured_spec", "json", "Structured Spec", {}),
        ("submitted_by", "ref:person", "Submitted By", {}),
        ("target_group", "ref:group", "Target Group", {}),
        ("additional_groups", "json", "Additional Groups", {}),
        ("status", "choice", "Status", {"max_length": 40}),
        ("copilot_enhanced", "bool", "Copilot Enhanced", {"default": "false"}),
        ("copilot_phrases_applied", "bool", "Copilot Phrases Applied", {"default": "false"}),
        ("submitted_at", "dt", "Submitted At", {}),
        ("reviewed_by", "ref:person", "Reviewed By", {}),
        ("reviewed_at", "dt", "Reviewed At", {}),
        ("resulting_automation", "ref:automation", "Resulting Automation", {}),
    ]),
    ("creator_credential", "Creator Credential", [
        ("user", "ref:person", "User", {"mandatory": True}),
        ("github_pat", "pw2", "GitHub Personal Access Token", {}),
        ("token_status", "choice", "Token Status", {"max_length": 40}),
        ("connected_at", "dt", "Connected At", {}),
        ("last_validated_at", "dt", "Last Validated At", {}),
        ("last_validation_result", "choice", "Last Validation Result", {"max_length": 40}),
    ]),
    ("pending_action", "Pending Action", [
        ("number", "str:40", "Number", {"read_only": True}),
        ("action_type", "choice", "Action Type", {"max_length": 60}),
        ("subject_user", "ref:person", "Subject User", {}),
        ("related_automation", "ref:automation", "Related Automation", {}),
        ("related_artifact", "ref:managed_artifact", "Related Artifact", {}),
        ("related_group", "ref:group", "Related Group", {}),
        ("assigned_to", "ref:person", "Assigned To", {}),
        ("status", "choice", "Status", {"max_length": 40}),
        ("created_at", "dt", "Created At", {}),
        ("deadline_at", "dt", "Deadline At", {}),
        ("actioned_at", "dt", "Actioned At", {}),
        ("actioned_by", "ref:person", "Actioned By", {}),
        ("resolution", "choice", "Resolution", {"max_length": 40}),
        ("notes", "txt", "Notes", {}),
    ]),
    ("managed_artifact", "Managed Artifact", [
        ("number", "str:40", "Number", {"read_only": True}),
        ("display_name", "str:255", "Display Name", {"mandatory": True}),
        ("description", "txt", "Description", {}),
        ("artifact_type", "choice", "Artifact Type", {"max_length": 40}),
        ("owner_group", "ref:group", "Owner Group", {}),
        ("created_by_person", "ref:person", "Created By", {}),
        ("status", "choice", "Status", {"max_length": 40}),
        ("approval_required", "bool", "Approval Required", {"default": "false"}),
        ("approved_by", "ref:person", "Approved By", {}),
        ("approved_at", "dt", "Approved At", {}),
        ("rejected_reason", "txt", "Rejected Reason", {}),
        ("artifact_sys_ids", "json", "Artifact Sys IDs", {}),
        ("creation_spec", "json", "Creation Spec", {}),
        ("copilot_assisted", "bool", "Copilot Assisted", {"default": "false"}),
        ("copilot_spec_applied", "bool", "Copilot Spec Applied", {"default": "false"}),
        ("created_at", "dt", "Created At", {}),
        ("updated_at", "dt", "Updated At", {}),
    ]),
]

# --- Choice lists ---
_c("person", "onboarding_status", [
    ("pending", "Pending"), ("in_progress", "In Progress"), ("complete", "Complete")])
_c("reporting_relationship", "relationship_type", [
    ("primary", "Primary"), ("secondary", "Secondary")])
_c("reporting_relationship", "status", [
    ("active", "Active"), ("inactive", "Inactive")])
_c("group", "type", [
    ("leadership_group", "Leadership Group"), ("custom_group", "Custom Group")])
_c("group", "status", [
    ("active", "Active"), ("archived", "Archived")])
_c("group_member", "group_role", [
    ("creator", "Creator"), ("user", "User")])
_c("group_member", "status", [
    ("active", "Active"), ("inactive", "Inactive")])
_c("onboarding_request", "group_role", [
    ("creator", "Creator"), ("user", "User")])
_c("onboarding_request", "system_role", [
    ("leadership", "Leadership"), ("user", "User")])
_c("onboarding_request", "status", [
    ("pending", "Pending"), ("accepted", "Accepted"),
    ("declined", "Declined"), ("expired", "Expired")])
_c("automation", "status", [
    ("draft", "Draft"), ("in_review", "In Review"), ("testing", "Testing"),
    ("pending_approval", "Pending Approval"), ("published", "Published"),
    ("deprecation_queued", "Deprecation Queued"), ("deprecated", "Deprecated")])
_c("automation_step", "action_type", [
    ("record_create", "Record Create"), ("record_update", "Record Update"),
    ("record_query", "Record Query"), ("flow_trigger", "Flow Trigger"),
    ("rest_call", "REST Call"), ("send_notification", "Send Notification"),
    ("approval_gate", "Approval Gate"), ("conditional_branch", "Conditional Branch")])
_c("automation_step", "on_failure", [
    ("stop", "Stop"), ("continue", "Continue"), ("skip", "Skip")])
_c("automation_input", "input_type", [
    ("text", "Text"), ("number", "Number"), ("date", "Date"),
    ("choice", "Choice"), ("boolean", "Boolean")])
_c("group_automation", "approval_status", [
    ("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected")])
_c("execution", "channel", [
    ("va", "Virtual Agent"), ("portal", "Portal"), ("scheduled", "Scheduled")])
_c("execution", "status", [
    ("pending", "Pending"), ("running", "Running"), ("success", "Success"),
    ("failed", "Failed"), ("awaiting_approval", "Awaiting Approval"),
    ("cancelled", "Cancelled")])
_c("execution_step_log", "status", [
    ("pending", "Pending"), ("running", "Running"), ("success", "Success"),
    ("failed", "Failed"), ("skipped", "Skipped")])
_c("automation_schedule", "schedule_type", [
    ("recurring", "Recurring"), ("one_time", "One Time")])
_c("use_case_request", "status", [
    ("draft", "Draft"), ("submitted", "Submitted"), ("in_review", "In Review"),
    ("approved", "Approved"), ("rejected", "Rejected"),
    ("building", "Building"), ("complete", "Complete")])
_c("creator_credential", "token_status", [
    ("active", "Active"), ("expired", "Expired"), ("revoked", "Revoked")])
_c("creator_credential", "last_validation_result", [
    ("success", "Success"), ("failed", "Failed")])
_c("pending_action", "action_type", [
    ("user_deactivation", "User Deactivation"),
    ("automation_approval", "Automation Approval"),
    ("onboarding_expiry", "Onboarding Expiry"),
    ("token_expiry", "Token Expiry"),
    ("leader_reassignment", "Leader Reassignment"),
    ("artifact_approval", "Artifact Approval")])
_c("pending_action", "status", [
    ("pending", "Pending"), ("actioned", "Actioned"),
    ("auto_resolved", "Auto Resolved"), ("escalated", "Escalated")])
_c("pending_action", "resolution", [
    ("approved", "Approved"), ("rejected", "Rejected"),
    ("approved_removal", "Approved Removal"), ("notified_user", "Notified User"),
    ("reassigned", "Reassigned"), ("no_action", "No Action")])
_c("managed_artifact", "artifact_type", [
    ("report", "Report"), ("pa_dashboard", "Performance Analytics Dashboard"),
    ("notification_rule", "Notification Rule"),
    ("scheduled_data_job", "Scheduled Data Job"), ("flow", "Flow"),
    ("custom_table", "Custom Table"), ("ui_page", "UI Page")])
_c("managed_artifact", "status", [
    ("draft", "Draft"), ("pending_approval", "Pending Approval"),
    ("active", "Active"), ("inactive", "Inactive"), ("archived", "Archived")])
