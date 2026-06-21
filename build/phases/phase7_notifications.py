#!/usr/bin/env python3
"""
Phase 7 — Notification Templates and Events

Registers one platform event per notification and creates all 22 notification
email templates (sysevent_email_action) in the application scope. NotificationService
fires the per-template event (slug derived from the template name) with the
recipient as event parm1; each template renders the formal message.

Event slug convention: 'x_infte_ops_int.' + lower_snake(template tail).
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

PERSON = ec.table("person")

# (template name, trigger table, subject, body paragraph)
TEMPLATES = [
    ("Operations Intelligence - Onboarding Invitation", PERSON,
     "You have been invited to Operations Intelligence",
     "You have been invited to join Operations Intelligence. Please complete your onboarding to activate your access."),
    ("Operations Intelligence - Onboarding Reminder", PERSON,
     "Reminder: complete your Operations Intelligence onboarding",
     "Your Operations Intelligence onboarding invitation is awaiting completion and will expire soon. Please complete it at your earliest convenience."),
    ("Operations Intelligence - Onboarding Expired", PERSON,
     "An Operations Intelligence onboarding invitation has expired",
     "An onboarding invitation you initiated has expired without completion. You may re-send the invitation from Operations Governance."),
    ("Operations Intelligence - Invitation Declined", PERSON,
     "An Operations Intelligence invitation was declined",
     "An onboarding invitation you initiated was declined by the nominee."),
    ("Operations Intelligence - Onboarding Complete", PERSON,
     "Operations Intelligence onboarding completed",
     "A nominee you invited has completed onboarding and now has Operations Intelligence access."),
    ("Operations Intelligence - Added to Group", PERSON,
     "You have been added to an Operations Intelligence group",
     "You have been added to a new group in Operations Intelligence. Its automations and deliverables are now available to you."),
    ("Operations Intelligence - Automation Submitted", PERSON,
     "An automation is awaiting your approval",
     "An automation has been submitted for your approval. Please review it in Operations Governance."),
    ("Operations Intelligence - Cross-Group Approval Request", PERSON,
     "Cross-group publishing requires your approval",
     "An automation is requesting publication to a group you own. Please review and approve or reject the request."),
    ("Operations Intelligence - Approval Escalated", PERSON,
     "An approval has been escalated to you",
     "An approval that was not actioned within the response window has been escalated to you for resolution."),
    ("Operations Intelligence - Automation Approved", PERSON,
     "An automation has been approved and published",
     "An automation has been approved and is now published and available to the relevant groups."),
    ("Operations Intelligence - Automation Rejected", PERSON,
     "An automation was rejected",
     "An automation you submitted was rejected. Please review the reason and revise before resubmitting."),
    ("Operations Intelligence - User Deactivation Alert", PERSON,
     "Action required: a user in your team was deactivated",
     "A member of your team has been deactivated. Please choose how to handle their access within the response window."),
    ("Operations Intelligence - Auto Removal Executed", PERSON,
     "Automatic removal has been completed",
     "Automatic removal has been completed for a deactivated user, including group membership and credential revocation."),
    ("Operations Intelligence - Copilot Token Expired", PERSON,
     "Your Copilot token requires attention",
     "Your Copilot integration token could not be validated. Please reconnect it in Operations Studio to restore AI assistance."),
    ("Operations Intelligence - Leader Reassignment Required", PERSON,
     "Leadership reassignment required",
     "A leader has been deactivated and their direct reports require reassignment. Please action this in Operations Governance."),
    ("Operations Intelligence - Flow Activated", PERSON,
     "A flow has been activated in your group",
     "A creator has activated a new flow in a group under your leadership. You may deactivate it from Operations Governance if required."),
    ("Operations Intelligence - Custom Table Submitted", PERSON,
     "A custom table is awaiting your approval",
     "A creator has requested a custom table that requires your approval. Please review the specification in Operations Governance."),
    ("Operations Intelligence - Custom Table Approved", PERSON,
     "Your custom table was approved",
     "A custom table you requested has been approved and created."),
    ("Operations Intelligence - Custom Table Rejected", PERSON,
     "Your custom table request was rejected",
     "A custom table you requested was rejected. Please review the reason provided."),
    ("Operations Intelligence - UI Page Submitted", PERSON,
     "A UI page is awaiting your approval",
     "A creator has requested a UI page that requires your approval. Please review the implementation plan in Operations Governance."),
    ("Operations Intelligence - UI Page Approved", PERSON,
     "Your UI page was approved",
     "A UI page you requested has been approved and created."),
    ("Operations Intelligence - UI Page Rejected", PERSON,
     "Your UI page request was rejected",
     "A UI page you requested was rejected. Please review the reason provided."),
]


def slug(name):
    tail = name.split(" - ", 1)[1]
    s = ""
    for ch in tail.lower():
        if ch.isalnum():
            s += ch
        elif ch in (" ", "-"):
            s += "_"
    while "__" in s:
        s = s.replace("__", "_")
    return "x_infte_ops_int." + s.strip("_")


def build():
    log = []
    ev_ok = nf_ok = ev_fail = nf_fail = 0
    for name, tbl, subject, body in TEMPLATES:
        ev = slug(name)
        # Register the event
        r1 = ec.op("artifact.event_registry",
                   data={"event_name": ev, "table": tbl,
                         "description": name + " event"})
        if r1.get("ok"):
            ev_ok += 1
        else:
            ev_fail += 1
            log.append("EVENT FAIL %s: %s" % (ev, str(r1)[:140]))
        # Create the notification
        html = ("<p>" + body + "</p>"
                "<p>This is an automated message from Operations Intelligence.</p>")
        r2 = ec.op("artifact.notification",
                   data={"name": name, "event_name": ev, "subject": subject,
                         "message_html": html, "active": True,
                         "send_when": "event"})
        if r2.get("ok"):
            nf_ok += 1
        else:
            nf_fail += 1
            log.append("NOTIF FAIL %s: %s" % (name, str(r2)[:140]))
        time.sleep(0.4)
    log.append("=== events: %d ok / %d fail ; notifications: %d ok / %d fail ===" % (
        ev_ok, ev_fail, nf_ok, nf_fail))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
