#!/usr/bin/env python3
"""
Phase 8 — Platform Configuration Properties

Sets the system properties the Script Includes read at runtime: Creator Assist
endpoint and timeout, flow action cap, NLU model placeholder, maintenance-mode
state, and debug flag. sys_properties is platform-global by ServiceNow
architecture (the one intentional exception to scope isolation).
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))
import engine_client as ec

PROPS = [
    ("x_infte_ops_int.assist_api_endpoint", "https://api.githubcopilot.com",
     "string", "Creator Assist chat completions base endpoint."),
    ("x_infte_ops_int.assist_model", "gpt-4o",
     "string", "Creator Assist language model identifier."),
    ("x_infte_ops_int.assist_timeout_ms", "15000",
     "integer", "Creator Assist API timeout in milliseconds."),
    ("x_infte_ops_int.max_flow_actions", "20",
     "integer", "Maximum number of actions a creator flow may contain."),
    ("x_infte_ops_int.nlu_model_sys_id", "",
     "string", "Sys ID of the Operations Intelligence NLU model (set during VA setup)."),
    ("x_infte_ops_int.debug_mode", "false",
     "true_false", "Enables verbose Operations Intelligence diagnostic logging."),
    # Specification Assist integration controls (read by ReasoningEngine)
    ("x_infte_ops_int.spec_assist_integration_enabled", "false",
     "true_false", "Master toggle enabling Specification Assist integration for eligible roles."),
    ("x_infte_ops_int.spec_assist_mode", "internal",
     "string", "Reasoning mode: internal (default), balanced, or copilot."),
    # Maintenance-mode state (read/written by MaintenanceManager)
    ("x_infte_ops_int.maintenance_sections", "[]",
     "string", "JSON array of portal sections currently in maintenance, or [\"all\"]."),
    ("x_infte_ops_int.maintenance_message", "",
     "string", "Message shown on the maintenance overlay."),
    ("x_infte_ops_int.maintenance_return_at", "",
     "string", "Estimated maintenance return datetime (ISO), or empty."),
    ("x_infte_ops_int.maintenance_initiated_by", "",
     "string", "User who initiated the active maintenance state."),
    ("x_infte_ops_int.maintenance_initiated_at", "",
     "string", "Datetime the active maintenance state began."),
]


def build():
    log = []
    ok = 0
    for key, value, ptype, desc in PROPS:
        r = ec.op("property.set", data={"key": key, "value": value,
                                        "type": ptype, "description": desc})
        if r.get("ok"):
            ok += 1
            log.append("%-44s = %s" % (key, value if value else "(empty)"))
        else:
            log.append("%-44s FAIL: %s" % (key, str(r)[:140]))
    log.append("=== properties set: %d / %d ===" % (ok, len(PROPS)))
    return log


if __name__ == "__main__":
    for line in build():
        print(line)
