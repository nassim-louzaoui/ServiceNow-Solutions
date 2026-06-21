#!/usr/bin/env python3
"""
Operations Intelligence — Engine Client

Thin Python wrapper over the Operations Intelligence Engine Scripted REST API.
Every platform mutation in the build harness goes through this client so there
is exactly one place that knows the endpoint, the credentials, and the response
envelope shape.

Credentials live in the source of truth by explicit project directive.
"""

import json
import urllib.request
import urllib.error

INSTANCE = "https://everestdev.service-now.com"
ENDPOINT = INSTANCE + "/api/x_infte_ops_int/ops_int_engine/v1"
SERVICE_ACCOUNT = "svc_operations_intelligence_api"
SERVICE_PASSWORD = "H!^j46ZKAHA7RLfDb6Va97Pu7pB8sTcF"
ENGINE_KEY = "EPpXxygqG5AvP8zEPAQ847sFqW6NGqYYp5P6VWJn"
APP_SCOPE = "x_infte_ops_int"

import base64
_AUTH = "Basic " + base64.b64encode(
    (SERVICE_ACCOUNT + ":" + SERVICE_PASSWORD).encode("utf-8")
).decode("ascii")


class EngineError(Exception):
    pass


import time


def call(payload, timeout=120, retries=3):
    """POST a single engine request. Returns the unwrapped result object.

    Retries on transient transport failures (dropped connection, timeout) with
    exponential backoff. The live instance occasionally drops or rate-limits
    self-calls under rapid batch load; a short backoff clears it.
    """
    data = json.dumps(payload).encode("utf-8")
    last_err = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(ENDPOINT, data=data, method="POST")
        req.add_header("Authorization", _AUTH)
        req.add_header("X-Engine-Key", ENGINE_KEY)
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8")
            try:
                parsed = json.loads(body)
            except ValueError:
                raise EngineError("Non-JSON response: " + body[:500])
            return parsed.get("result", parsed)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            try:
                parsed = json.loads(body)
                return parsed.get("result", parsed)
            except ValueError:
                last_err = "HTTP %s: %s" % (e.code, body[:200])
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last_err = "Transport error: " + str(e)
        if attempt < retries:
            time.sleep(2 ** attempt)
    raise EngineError(last_err or "unknown transport failure")


def op(name, **kwargs):
    """Convenience: call a single op with top-level fields as kwargs."""
    payload = {"op": name}
    payload.update(kwargs)
    return call(payload)


def batch(ops, stop_on_error=True, timeout=300):
    """Run a list of op dicts in one HTTP call."""
    return call({"op": "batch", "ops": ops, "stop_on_error": stop_on_error}, timeout=timeout)


def require(result, context=""):
    """Raise if an engine result is not ok. Returns the result on success."""
    if not isinstance(result, dict) or not result.get("ok", False):
        raise EngineError((context + ": " if context else "") + json.dumps(result)[:600])
    return result


def table(short_name):
    """Physical table name for an unprefixed table short name."""
    return APP_SCOPE + "_" + short_name
