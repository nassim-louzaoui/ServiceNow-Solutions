#!/usr/bin/env python3
"""
Phase 9b — Virtual Agent Conversational Flow Definitions

Builds and deploys JSON conversation flow definitions to all 23
[Operations Intelligence] sys_cs_topic records. Each topic gets a
complete Skills-based VA flow: ScriptedAction (business logic) +
TextOutputPrompt (user-facing message) + bookend goals.

Idempotent: safe to re-run. Overwrites existing definition if any.
"""
import hashlib
import json
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

VENDOR_ID     = "c2f0b8f187033200246ddd4c97cb0bb9"
APP_SCOPE_ID  = "75be0bf9fbe9cb5052eef5c9beefdce8"


def _h(seed):
    return hashlib.md5(seed.encode("utf-8")).hexdigest()


def _sf(name, ftype="String", encrypt=False, default_value=None):
    f = {
        "type": ftype, "name": name, "unique": False,
        "key_phrases": [], "mask_type": "NONE", "input_format_type": "",
        "list": False, "expert_mode": False, "choices": [], "static_enum_list": []
    }
    if encrypt:
        f["encrypt_if_secure"] = True
    if default_value is not None:
        f["default_value"] = default_value
    return f


def build_definition(sys_id, full_name, key_phrases, action_script, default_msg):
    """
    Construct a complete sys_cs_topic.definition JSON blob.

    Flow topology (all nodes silent — zero user-input steps):
      RootDecision → RootDecisionBranch → StartGoal
        → ScriptedAction (runs action_script, sets vaVars.oi_msg)
        → TextOutputPrompt (displays vaVars.oi_msg)
        → TerminateGoal
    """
    n    = full_name
    seg  = _h(n + "_seg")
    root = _h(n + "_root")
    sg   = _h(n + "_sg")
    sa   = _h(n + "_sa")
    tp   = _h(n + "_tp")
    tg   = _h(n + "_tg")

    root_lbl = "RootDecision_for_goal_primary___RootDecision_" + root
    br_lbl   = "RootDecisionBranch_" + root + "___RootDecisionBranch_" + root
    sg_lbl   = "Start___" + sg
    sa_lbl   = "Action___" + sa
    tp_lbl   = "Response___" + tp
    tg_lbl   = "End___" + tg

    def js_sq(s):
        return s.replace("\\", "\\\\").replace("'", "\\'")

    sa_prompt = (
        "vaVars.previous_graph_node='" + sa_lbl + "';"
        "(function execute() { " + action_script + " })();"
        "vaInputs.__silent_ScriptedAction_" + sa + "=true;null;"
    )
    sa_ack = (
        "vaVars.previous_graph_node='" + sa_lbl + "';"
        "var ackMsg=null;ackMsg=null;ackMsg;"
    )

    tp_ack = (
        "vaVars.previous_graph_node='" + tp_lbl + "';"
        "var ackMsg=null;"
        "ackMsg=(function execute() {"
        "var textVariations=[function() { return (function execute() {"
        " return vaVars.oi_msg || '" + js_sq(default_msg) + "';"
        " })() }];"
        "if(vaContext.global_record_in_progress) return textVariations[0]();"
        "var index=Math.floor(Math.random()*textVariations.length);"
        "return textVariations[index]();"
        "})();ackMsg;"
    )

    variables = [
        {"name": "__segment_trigger_" + seg + "_done",
         "type": "java.lang.Object", "init_value": "false"},
        {"name": "previous_graph_node", "type": "java.lang.Object"},
        {"name": "oi_msg",              "type": "java.lang.Object"}
    ]

    fields = [
        {
            "type": "Reference", "table_name": "sys_user", "auto_select": False,
            "name": "user", "unique": False, "key_phrases": [], "mask_type": "NONE",
            "input_format_type": "", "list": False, "expert_mode": False,
            "choices": [], "static_enum_list": []
        },
        _sf("RootDecisionBranch_" + root, ftype="Boolean", default_value="true"),
        _sf("__silent_Branch_RootDecisionBranch_" + root),
        _sf("__silent_StartGoal_" + sg),
        _sf("__silent_Decision_RootDecision_" + root),
        _sf("__silent_ScriptedAction_" + sa),
        _sf("__silent_TextOutputPrompt_" + tp, encrypt=True),
        _sf("__silent_TerminateGoal_" + tg),
    ]

    greeting = (
        "vaInputs.initialize('user');"
        "vaInputs.initialize('RootDecisionBranch_" + root + "');"
        "null;"
    )

    task_fields = [
        {
            "name": "__silent_Decision_RootDecision_" + root,
            "direction": "Input", "required": True,
            "prompt_msg": (
                "vaVars.previous_graph_node='" + root_lbl + "';"
                "vaInputs.__silent_Decision_RootDecision_" + root + "=true;null;"
            ),
            "confirm_msg_on_default_value": {"msg": "", "val_for_confirm": True},
            "nlu_text_input": False, "nlu_confirmation_prompt": False,
            "acknowledge_msg": (
                "vaVars.previous_graph_node='" + root_lbl + "';"
                "var ackMsg=null;ackMsg=null;"
                "vaInputs.RootDecisionBranch_" + root + "=true;ackMsg;"
            )
        },
        {
            "name": "__silent_Branch_RootDecisionBranch_" + root,
            "applicable": (
                "(vaVars.previous_graph_node=='" + root_lbl + "') && "
                "(((vaInputs.RootDecisionBranch_" + root + ".getValue()==true)))"
            ),
            "direction": "Input", "required": True,
            "prompt_msg": (
                "vaVars.previous_graph_node='" + br_lbl + "';"
                "vaInputs.__silent_Branch_RootDecisionBranch_" + root + "=true;null;"
            ),
            "acknowledge_msg": (
                "vaVars.previous_graph_node='" + br_lbl + "';"
                "var ackMsg=null;ackMsg=null;ackMsg;"
            )
        },
        {
            "name": "__silent_StartGoal_" + sg,
            "applicable": "(vaVars.previous_graph_node=='" + br_lbl + "')",
            "direction": "Input", "required": True,
            "prompt_msg": (
                "vaVars.previous_graph_node='" + sg_lbl + "';"
                "vaInputs.__silent_StartGoal_" + sg + "=true;null;"
            ),
            "acknowledge_msg": (
                "vaVars.previous_graph_node='" + sg_lbl + "';"
                "var ackMsg=null;ackMsg=null;ackMsg;"
            )
        },
        {
            "name": "__silent_ScriptedAction_" + sa,
            "applicable": "(vaVars.previous_graph_node=='" + sg_lbl + "')",
            "direction": "Input", "required": True,
            "prompt_msg": sa_prompt,
            "acknowledge_msg": sa_ack
        },
        {
            "name": "__silent_TextOutputPrompt_" + tp,
            "applicable": "(vaVars.previous_graph_node=='" + sa_lbl + "')",
            "direction": "Input", "required": True,
            "request_feedback": True,
            "prompt_msg": (
                "vaVars.previous_graph_node='" + tp_lbl + "';"
                "vaInputs.__silent_TextOutputPrompt_" + tp + "=true;null;"
            ),
            "acknowledge_msg": tp_ack
        },
        {
            "name": "__silent_TerminateGoal_" + tg,
            "applicable": "(vaVars.previous_graph_node=='" + tp_lbl + "')",
            "direction": "Input", "required": True,
            "prompt_msg": (
                "vaVars.previous_graph_node='" + tg_lbl + "';"
                "vaInputs.__silent_TerminateGoal_" + tg + "=true;null;"
            ),
            "acknowledge_msg": (
                "vaVars.previous_graph_node='" + tg_lbl + "';"
                "var ackMsg=null;ackMsg=null;"
                "vaVars.__segment_trigger_" + seg + "_done=true;ackMsg;"
            )
        }
    ]

    return {
        "id": sys_id,
        "name": full_name,
        "system_topic": False,
        "autopilot_topic": False,
        "vendor_id": VENDOR_ID,
        "applicability": "true",
        "categories": [],
        "key_phrases": key_phrases,
        "variables": variables,
        "fields": fields,
        "tasks": [{
            "type": "Consumer to system",
            "show_as_button": True,
            "name": "primary",
            "applicability": (
                "vaVars.__segment_trigger_" + seg + "_done==false && true"
            ),
            "mode": "Qmode",
            "greeting_msg": greeting,
            "fields": task_fields
        }],
        "roles": [],
        "active": True,
        "published": True,
        "topic_type": "STANDARD",
        "visible": True,
        "discoverable": True,
        "sys_scope": APP_SCOPE_ID,
        "sys_domain": "global",
        "title": full_name,
        "nlu_intent_label": "",
        "nlu_model_label": "",
        "dialog_acts_enabled": False,
        "modify_confirmation_enabled": False
    }


# =============================================================================
# Topic definitions: (short_name, key_phrases, action_script, default_msg)
# action_script runs inside (function execute() { ... })() in VA context.
# Sets vaVars.oi_msg with the message to display. OIDataStore is available.
# =============================================================================

TOPICS = [

    (
        "Welcome",
        ["welcome", "hello", "hi", "good morning", "good afternoon", "hey", "start", "home"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " if(_pr){"
            "  var _role=''+(_pr.system_role||'');"
            "  var _fname=''+gs.getUser().getFullName();"
            "  if(_role==='admin') vaVars.oi_msg='Welcome to Operations Command, '+_fname+'. How can I assist with platform administration?';"
            "  else if(_role==='leadership'){"
            "   var _pid=''+(_pr.sys_id||'');"
            "   var _pac=_store.find('pending_actions',function(pa){"
            "    return ''+pa.assigned_to===_pid&&(pa.status==='pending'||pa.status==='escalated');"
            "   });"
            "   var _cnt=_pac.length;"
            "   vaVars.oi_msg=_cnt>0?"
            "    'Welcome back, '+_fname+'. You have '+_cnt+' pending approval'+(+_cnt===1?'':'s')+' awaiting review.':"
            "    'Welcome to Operations Governance, '+_fname+'. How can I assist today?';"
            "  }else if(_role==='creator'){"
            "   vaVars.oi_msg='Welcome back, '+_fname+'. What would you like to build today?';"
            "  }else{"
            "   vaVars.oi_msg='Welcome, '+_fname+'. How can the Operations Assistant help you today?';"
            "  }"
            " }else{"
            "  vaVars.oi_msg='Welcome to Operations Intelligence. You are not yet registered. Please contact your administrator to begin onboarding.';"
            " }"
            "}catch(e){vaVars.oi_msg='Welcome to Operations Intelligence. How can I assist you today?';}"
        ),
        "Welcome to Operations Intelligence."
    ),

    (
        "Complete Onboarding",
        ["complete onboarding", "finish onboarding", "my onboarding", "onboarding status",
         "continue onboarding", "setup account", "activate account"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " if(_pr){"
            "  var _role=''+(_pr.system_role||'');"
            "  var _pid=''+(_pr.sys_id||'');"
            "  var _obrs=_store.find('onboarding_requests',function(o){return ''+o.person===_pid;});"
            "  _obrs.sort(function(a,b){return (a.submitted_at||'')<(b.submitted_at||'')?1:-1;});"
            "  if(_obrs.length>0){"
            "   var _st=''+(_obrs[0].status||'');"
            "   vaVars.oi_msg='Your onboarding request is currently '+_st+'. Your role is '+_role+'. If you need assistance, please contact your administrator.';"
            "  }else{"
            "   vaVars.oi_msg='You are registered in Operations Intelligence with the role of '+_role+'. Your initial setup is complete. Navigate to Operations Workspace to explore available automations.';"
            "  }"
            " }else{"
            "  vaVars.oi_msg='Your Operations Intelligence account has not been set up yet. Please contact your administrator to initiate the onboarding process.';"
            " }"
            "}catch(e){vaVars.oi_msg='I was unable to retrieve your onboarding status. Please contact your administrator.';}"
        ),
        "Please contact your administrator to complete your onboarding."
    ),

    (
        "Creator Assist Setup",
        ["creator assist", "creator assist setup", "enable creator assist",
         "configure creator assist", "creator credentials", "github credentials"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " if(_pr){"
            "  var _en=_pr.spec_assist_enabled;"
            "  var _role=''+(_pr.system_role||'');"
            "  if(_en===true||_en==='true'||_en==='1'){"
            "   vaVars.oi_msg='Creator Assist is enabled for your account. Manage your creator credentials in Operations Studio under Creator Credentials.';"
            "  }else if(_role==='creator'||_role==='admin'){"
            "   vaVars.oi_msg='Creator Assist is not yet enabled for your account. An administrator can activate it from your person record in Operations Command. Once enabled, add your credentials under Creator Credentials in Operations Studio.';"
            "  }else{"
            "   vaVars.oi_msg='Creator Assist is available to creators and administrators. Contact your administrator to request creator access if you need to build automations.';"
            "  }"
            " }else{"
            "  vaVars.oi_msg='Complete your onboarding before configuring Creator Assist. Contact your administrator to get started.';"
            " }"
            "}catch(e){vaVars.oi_msg='I was unable to retrieve your Creator Assist status. Please contact your administrator.';}"
        ),
        "Contact your administrator to configure Creator Assist for your account."
    ),

    (
        "Onboard Leadership",
        ["onboard leadership", "add leader", "new leader", "add leadership",
         "onboard manager", "add manager", "create leader"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'){"
            "  vaVars.oi_msg='To onboard a new leadership member, navigate to Operations Command and select Onboarding Requests. Click New and set the Designation field to Leadership. Complete the form with the user details and submit.';"
            " }else{"
            "  vaVars.oi_msg='Onboarding leadership members requires administrator access. Please contact your system administrator to initiate this process.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your system administrator to onboard a new leadership member.';}"
        ),
        "Contact your administrator to onboard a new leadership member."
    ),

    (
        "Onboard Sub-Leadership",
        ["onboard sub-leadership", "onboard sub leadership", "add sub-leader",
         "new sub-leader", "add team lead", "onboard deputy"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='leadership'){"
            "  vaVars.oi_msg='To onboard a new sub-leadership member, navigate to Operations Governance and select Onboarding Requests. Click New and set the Designation to Sub-Leadership. Complete the form and submit for processing.';"
            " }else{"
            "  vaVars.oi_msg='Onboarding sub-leadership members requires administrator or leadership access. Please contact your manager.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to onboard a new sub-leadership member.';}"
        ),
        "Contact your administrator or leadership to onboard a sub-leadership member."
    ),

    (
        "Onboard User",
        ["onboard user", "add user", "new user", "add member", "onboard team member",
         "add employee", "new employee", "create user"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='leadership'){"
            "  vaVars.oi_msg='To onboard a new user, navigate to Operations Governance and select Onboarding Requests. Click New, set the Designation to User, and assign the appropriate group. Submit the form to create the user account.';"
            " }else{"
            "  vaVars.oi_msg='Onboarding new users requires administrator or leadership access. Contact your manager to request that a new user be added.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to onboard a new user.';}"
        ),
        "Contact your administrator or leadership to onboard a new user."
    ),

    (
        "Appoint Creator",
        ["appoint creator", "make creator", "assign creator", "creator role",
         "promote to creator", "grant creator access"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='leadership'){"
            "  vaVars.oi_msg='To appoint a creator, the user must first be onboarded as a regular user. Navigate to Operations Command or Governance, open the person record, and update the System Role field to Creator. The user will receive the creator role immediately.';"
            " }else{"
            "  vaVars.oi_msg='Appointing creators requires administrator or leadership access. Contact your administrator if you believe a user should be granted creator privileges.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to appoint a creator.';}"
        ),
        "Contact your administrator to appoint a creator."
    ),

    (
        "Create Group",
        ["create group", "new group", "add group", "create automation group",
         "set up group", "new team group"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='leadership'){"
            "  vaVars.oi_msg='To create an automation group, navigate to Operations Governance and select Groups. Click New to define the group name, description, and members. Members can be assigned automations once the group is created.';"
            " }else{"
            "  vaVars.oi_msg='Creating groups requires administrator or leadership access. Contact your manager if you need a new group set up.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to create a new group.';}"
        ),
        "Contact your administrator or leadership to create a new group."
    ),

    (
        "Create Automation",
        ["create automation", "new automation", "build automation", "add automation",
         "make automation", "design automation", "new workflow"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='creator'){"
            "  vaVars.oi_msg='To create a new automation, navigate to Operations Studio and select Automations. Click New to define the automation name, description, category, and workflow steps. Once complete, submit it for approval before it can be assigned to groups.';"
            " }else{"
            "  vaVars.oi_msg='Creating automations requires creator or administrator access. Contact your administrator if you would like to request creator privileges to build automations.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to create a new automation.';}"
        ),
        "Contact your administrator or request creator access to create automations."
    ),

    (
        "Review Approvals",
        ["review approvals", "pending approvals", "my approvals", "approve items",
         "items to approve", "what needs approval", "approval queue"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " if(_pr){"
            "  var _pid=''+(_pr.sys_id||'');"
            "  var _pa=_store.find('pending_actions',function(pa){"
            "   return ''+pa.assigned_to===_pid&&(pa.status==='pending'||pa.status==='escalated');"
            "  });"
            "  var _cnt=_pa.length;"
            "  if(_cnt===0)vaVars.oi_msg='You have no pending approvals at this time.';"
            "  else vaVars.oi_msg='You have '+_cnt+' pending approval'+(+_cnt===1?'':'s')+' awaiting your review. Navigate to Operations Governance and select Pending Actions to review and act on them.';"
            " }else{"
            "  vaVars.oi_msg='You are not registered in Operations Intelligence or do not have approval responsibilities. Contact your administrator.';"
            " }"
            "}catch(e){vaVars.oi_msg='I was unable to retrieve your approval queue. Please navigate to Operations Governance to check manually.';}"
        ),
        "Navigate to Operations Governance to review your pending approvals."
    ),

    (
        "Deactivation Action",
        ["deactivate", "deactivation", "remove user", "offboard user",
         "deactivate account", "remove access", "offboarding"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='leadership'){"
            "  vaVars.oi_msg='To deactivate a user, navigate to Operations Command, locate the person record, and select Deactivate. This will remove their group memberships, cancel scheduled automations, and revoke their platform access. The action can be reversed by re-inviting the user.';"
            " }else{"
            "  vaVars.oi_msg='Deactivation actions require administrator or leadership access. If you believe a user should be deactivated, please contact your manager or administrator.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to process a deactivation.';}"
        ),
        "Contact your administrator to process a deactivation action."
    ),

    (
        "Re-invite User",
        ["re-invite", "reinvite", "restore access", "reactivate user",
         "re-activate", "restore user", "bring back user"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='leadership'){"
            "  vaVars.oi_msg='To re-invite a deactivated user, navigate to Operations Command, locate the person record with status Deactivated, and select Re-invite. This will restore their platform access and return them to their previous group assignments.';"
            " }else{"
            "  vaVars.oi_msg='Re-inviting users requires administrator or leadership access. Contact your administrator to restore a deactivated user.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to re-invite a user.';}"
        ),
        "Contact your administrator to re-invite a deactivated user."
    ),

    (
        "Check Status",
        ["check status", "status", "my status", "execution status", "what is running",
         "request status", "track request", "my requests"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " if(_pr){"
            "  var _pid=''+(_pr.sys_id||'');"
            "  var _exs=_store.find('executions',function(e){return ''+e.triggered_by===_pid;});"
            "  _exs.sort(function(a,b){return (a.triggered_at||'')<(b.triggered_at||'')?1:-1;});"
            "  if(_exs.length>0){"
            "   var _ex=_exs[0];"
            "   var _exst=''+(_ex.status||'');"
            "   var _exnm=''+(_ex.automation||'');"
            "   var _exdt=''+(_ex.triggered_at||'');"
            "   vaVars.oi_msg='Your most recent execution: automation '+_exnm+' — Status: '+_exst+' (started '+_exdt+'). Navigate to Operations Workspace and select Executions to view full details.';"
            "  }else{"
            "   vaVars.oi_msg='No recent execution records found for your account. Navigate to Operations Workspace and select Executions to view the full history.';"
            "  }"
            " }else{"
            "  vaVars.oi_msg='You are not yet registered in Operations Intelligence. Contact your administrator to complete onboarding.';"
            " }"
            "}catch(e){vaVars.oi_msg='I was unable to retrieve your execution status. Navigate to Operations Workspace to check manually.';}"
        ),
        "Navigate to Operations Workspace to check your execution status."
    ),

    (
        "Help and Fallback",
        ["help", "what can you do", "how do i", "what should i do", "guide me",
         "i don't know", "i need help", "assist me", "support"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'unregistered'):'unregistered';"
            " if(_role==='admin'){"
            "  vaVars.oi_msg='As an administrator I can help you: onboard users and leaders, manage groups, review approvals, monitor executions, and manage platform configuration. What would you like to do?';"
            " }else if(_role==='leadership'){"
            "  vaVars.oi_msg='As a leadership member I can help you: review pending approvals, manage your group, onboard users, check execution status, and view available automations. What would you like to do?';"
            " }else if(_role==='creator'){"
            "  vaVars.oi_msg='As a creator I can help you: create automations and flows, manage your artifacts, request custom tables or UI pages, schedule reports, and check artifact status. What would you like to build?';"
            " }else if(_role==='user'){"
            "  vaVars.oi_msg='I can help you check the status of your requests, browse available automations for your group, or get general information about Operations Intelligence. What do you need?';"
            " }else{"
            "  vaVars.oi_msg='Welcome to Operations Intelligence. You are not yet registered. Please contact your administrator to start the onboarding process.';"
            " }"
            "}catch(e){vaVars.oi_msg='I am the Operations Intelligence assistant. I can help with onboarding, automations, approvals, and status checks. What do you need?';}"
        ),
        "I can help with onboarding, automations, approvals, and status checks. What do you need?"
    ),

    (
        "Approval Review",
        ["approval review", "review pending", "approve automation", "approve artifact",
         "approve request", "review my items", "pending review"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " if(_pr){"
            "  var _pid=''+(_pr.sys_id||'');"
            "  var _all=_store.find('pending_actions',function(pa){"
            "   return ''+pa.assigned_to===_pid&&(pa.status==='pending'||pa.status==='escalated');"
            "  });"
            "  _all.sort(function(a,b){return (a.created_at||'')>(b.created_at||'')?1:-1;});"
            "  var _items=[];"
            "  var _i;"
            "  for(_i=0;_i<_all.length&&_i<5;_i++){_items.push('\\u2022 '+''+(+_all[_i].action_type||'')+'('+(+_all[_i].related_automation||_all[_i].related_artifact||'')+')');}"
            "  if(_items.length===0)vaVars.oi_msg='You have no pending approvals at this time.';"
            "  else vaVars.oi_msg='Pending approvals requiring your attention:\\n'+_items.join('\\n')+'\\n\\nNavigate to Operations Governance and select Pending Actions to approve or reject each item.';"
            " }else{"
            "  vaVars.oi_msg='You do not have any approval responsibilities in Operations Intelligence.';"
            " }"
            "}catch(e){vaVars.oi_msg='I was unable to retrieve your pending approvals. Navigate to Operations Governance to check manually.';}"
        ),
        "Navigate to Operations Governance to review your pending approvals."
    ),

    (
        "Create Report or Dashboard",
        ["create report", "new report", "build report", "dashboard",
         "create dashboard", "reporting", "build dashboard", "data report"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='creator'){"
            "  vaVars.oi_msg='To request a new report or dashboard, navigate to Operations Studio and select Use Case Requests. Click New, set the Type to Report or Dashboard, and describe the data, metrics, and layout you need in the Specification field. Your request will be reviewed and built by the platform team.';"
            " }else{"
            "  vaVars.oi_msg='Creating reports and dashboards requires creator or administrator access. Contact your administrator if you need a report or dashboard built.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to request a new report or dashboard.';}"
        ),
        "Contact your administrator or use Use Case Requests in Operations Studio."
    ),

    (
        "Create Notification Rule",
        ["create notification", "notification rule", "add notification",
         "set up notification", "email alert", "alert rule", "notification trigger"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='creator'){"
            "  vaVars.oi_msg='To create a notification rule, navigate to Operations Studio and select Automations. Click New and set the category to Notification. Define the trigger condition, recipient list, message template, and delivery channel. Submit for approval to activate.';"
            " }else{"
            "  vaVars.oi_msg='Creating notification rules requires creator or administrator access. Contact your administrator to request this capability.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to create a notification rule.';}"
        ),
        "Navigate to Operations Studio to create a notification automation."
    ),

    (
        "Create Scheduled Data Report",
        ["scheduled report", "schedule report", "recurring report",
         "create scheduled report", "automatic report", "data schedule"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='creator'){"
            "  vaVars.oi_msg='To create a scheduled data report, navigate to Operations Studio and select Automation Schedules. Define the schedule interval, data source automation, output format, and delivery method. Reports can be delivered via email or stored on the platform.';"
            " }else{"
            "  vaVars.oi_msg='Creating scheduled reports requires creator or administrator access. Contact your administrator if you need a recurring data report set up.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to set up a scheduled report.';}"
        ),
        "Navigate to Automation Schedules in Operations Studio to create a scheduled report."
    ),

    (
        "Create Flow",
        ["create flow", "new flow", "build flow", "create workflow",
         "new workflow", "automation flow", "design flow"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='creator'){"
            "  vaVars.oi_msg='To create an automation flow, navigate to Operations Studio and select Approved Flows or Automations. Use the flow designer to define triggers, conditions, and sequential action steps. Once your flow is ready, submit it for approval and then assign it to the relevant groups.';"
            " }else{"
            "  vaVars.oi_msg='Creating automation flows requires creator or administrator access. Contact your administrator if you would like to request creator privileges.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to create an automation flow.';}"
        ),
        "Navigate to Operations Studio to create an automation flow."
    ),

    (
        "Request Custom Table",
        ["custom table", "request table", "new table", "data model",
         "extend table", "create table", "schema request"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='creator'){"
            "  vaVars.oi_msg='To request a custom table, navigate to Operations Studio and select Use Case Requests. Click New, set the Type to Custom Table, and provide the schema requirements in the Specification field. Include field names, types, relationships, and intended use. The platform team will review and build it.';"
            " }else{"
            "  vaVars.oi_msg='Requesting custom tables requires creator or administrator access. Contact your administrator if you need a new data table added to the platform.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to request a custom table.';}"
        ),
        "Navigate to Use Case Requests in Operations Studio to request a custom table."
    ),

    (
        "Request UI Page",
        ["request ui page", "ui page", "custom page", "new page",
         "portal page", "custom interface", "user interface"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " var _role=_pr?''+(_pr.system_role||'user'):'user';"
            " if(_role==='admin'||_role==='creator'){"
            "  vaVars.oi_msg='To request a custom UI page, navigate to Operations Studio and select Use Case Requests. Click New, set the Type to UI Page, and describe the layout, widgets, data requirements, and user interactions in the Specification field. The platform team will design and deploy it.';"
            " }else{"
            "  vaVars.oi_msg='Requesting custom UI pages requires creator or administrator access. Contact your administrator if you need a new portal page.';"
            " }"
            "}catch(e){vaVars.oi_msg='Please contact your administrator to request a custom UI page.';}"
        ),
        "Navigate to Use Case Requests in Operations Studio to request a UI page."
    ),

    (
        "Manage My Artifacts",
        ["my artifacts", "manage artifacts", "view artifacts", "artifact list",
         "what did i build", "my creations", "artifacts"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " if(_pr){"
            "  var _pid=''+(_pr.sys_id||'');"
            "  var _ar=_store.find('managed_artifacts',function(a){"
            "   return ''+a.created_by_person===_pid&&a.status==='active';"
            "  });"
            "  var _cnt=_ar.length;"
            "  if(_cnt===0)vaVars.oi_msg='You have no active managed artifacts. Navigate to Operations Studio to create your first automation or request an artifact build.';"
            "  else vaVars.oi_msg='You have '+_cnt+' active managed artifact'+(+_cnt===1?'':'s')+'. Navigate to Operations Studio and select Managed Artifacts to view, update, or manage them.';"
            " }else{"
            "  vaVars.oi_msg='You are not yet registered in Operations Intelligence. Complete onboarding before managing artifacts.';"
            " }"
            "}catch(e){vaVars.oi_msg='I was unable to retrieve your artifacts. Navigate to Operations Studio to check manually.';}"
        ),
        "Navigate to Operations Studio to manage your artifacts."
    ),

    (
        "Check Artifact Status",
        ["artifact status", "check artifact", "build status", "deployment status",
         "artifact progress", "artifact build", "is my artifact ready"],
        (
            "try{"
            " var _uid=gs.getUserID();"
            " var _store=new OIDataStore();"
            " var _persons=_store.find('persons',function(p){return ''+p.user_sys_id===''+_uid;});"
            " var _pr=_persons.length>0?_persons[0]:null;"
            " if(_pr){"
            "  var _pid=''+(_pr.sys_id||'');"
            "  var _ars=_store.find('managed_artifacts',function(a){return ''+a.created_by_person===_pid;});"
            "  _ars.sort(function(a,b){return (a.updated_at||'')<(b.updated_at||'')?1:-1;});"
            "  if(_ars.length>0){"
            "   var _ar=_ars[0];"
            "   var _arst=''+(_ar.status||'');"
            "   var _arnm=''+(_ar.display_name||'');"
            "   var _ardt=''+(_ar.updated_at||'');"
            "   vaVars.oi_msg='Your most recent artifact: \"'+_arnm+'\" — Status: '+_arst+' (last updated '+_ardt+'). Navigate to Managed Artifacts in Operations Studio to view full build history and deployment details.';"
            "  }else{"
            "   vaVars.oi_msg='No artifacts found for your account. Navigate to Operations Studio to request your first artifact build.';"
            "  }"
            " }else{"
            "  vaVars.oi_msg='You are not yet registered in Operations Intelligence. Complete onboarding to access artifact management.';"
            " }"
            "}catch(e){vaVars.oi_msg='I was unable to retrieve your artifact status. Navigate to Operations Studio to check manually.';}"
        ),
        "Navigate to Operations Studio to check your artifact status."
    ),

]


def build():
    log = []
    updated = failed = skipped = 0

    r = ec.op(
        "record.query",
        table="sys_cs_topic",
        encoded_query="nameLIKE[Operations Intelligence]",
        fields=["sys_id", "name"],
        limit=30
    )
    if not r.get("ok"):
        log.append("ABORT: could not query sys_cs_topic — " + str(r)[:200])
        return log

    id_map = {}
    for rec in r.get("records", []):
        id_map[rec["name"]] = rec["sys_id"]
    log.append("Found %d topic records on instance." % len(id_map))

    for (short_name, key_phrases, action_script, default_msg) in TOPICS:
        full_name = "[Operations Intelligence] " + short_name
        sys_id = id_map.get(full_name)
        if not sys_id:
            log.append("%-40s SKIP — not found on instance" % short_name)
            skipped += 1
            continue

        defn = build_definition(
            sys_id, full_name, key_phrases, action_script, default_msg
        )
        defn_str = json.dumps(defn, ensure_ascii=False, separators=(",", ":"))

        upd = ec.op(
            "record.update",
            table="sys_cs_topic",
            data={
                "sys_id":     sys_id,
                "definition": defn_str,
                "active":     "true",
                "published":  "1"
            }
        )
        if upd.get("ok"):
            updated += 1
            log.append("%-40s OK  (%d bytes)" % (short_name, len(defn_str)))
        else:
            failed += 1
            log.append("%-40s FAIL: %s" % (short_name, str(upd)[:200]))

        time.sleep(0.4)

    log.append("")
    log.append("=== VA flows: %d updated, %d failed, %d skipped (of %d) ===" % (
        updated, failed, skipped, len(TOPICS)))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
