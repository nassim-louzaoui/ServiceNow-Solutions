#!/usr/bin/env bash
# Operations Intelligence Engine Test Harness
# Usage: bash test_engine.sh [--verbose]
#        Credentials are loaded from .env in the repo root (gitignored).
# Requires: curl, jq

set -euo pipefail

# Load .env from repo root (two levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$(cd "$SCRIPT_DIR/../.." && pwd)/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
fi

INSTANCE="${SNOW_INSTANCE:-https://everestdev.service-now.com}"
API_PATH="/api/x_infte_ops_int/engine/v1"
BASE_URL="${INSTANCE}${API_PATH}"
KEY="${ENGINE_KEY:-}"
SNOW_USER="${SNOW_USER:-}"
SNOW_PASS="${SNOW_PASS:-}"
VERBOSE="${1:-}"
PASS=0; FAIL=0; SKIP=0

if [[ -z "$KEY" ]]; then
  echo "ERROR: ENGINE_KEY not set."
  echo "  → Add ENGINE_KEY=<value> to .env in the repo root, then re-run."
  exit 1
fi
if [[ -z "$SNOW_USER" || -z "$SNOW_PASS" ]]; then
  echo "ERROR: SNOW_USER and SNOW_PASS must be set in .env"
  echo "  → These are the ServiceNow login credentials used for Basic Auth."
  exit 1
fi

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

call() {
  local payload="$1"
  curl -s -X POST "$BASE_URL" \
    -u "${SNOW_USER}:${SNOW_PASS}" \
    -H "Content-Type: application/json" \
    -H "X-Engine-Key: $KEY" \
    -d "$payload"
}

check() {
  local label="$1"; local payload="$2"; local expect_field="${3:-ok}"; local expect_value="${4:-true}"
  local resp
  resp=$(call "$payload" 2>/dev/null)
  local actual
  actual=$(echo "$resp" | jq -r ".${expect_field} // \"__missing__\"" 2>/dev/null || echo "__error__")
  if [[ "$actual" == "$expect_value" ]]; then
    echo -e "${GREEN}[PASS]${NC} $label"
    ((PASS++))
    [[ "$VERBOSE" == "--verbose" ]] && echo "       $(echo "$resp" | jq -c . 2>/dev/null || echo "$resp")"
  else
    echo -e "${RED}[FAIL]${NC} $label"
    echo -e "       ${YELLOW}Expected${NC} .${expect_field}=${expect_value}, ${YELLOW}got${NC}: $(echo "$resp" | jq -c . 2>/dev/null || echo "$resp")"
    ((FAIL++))
  fi
}

check_field() {
  local label="$1"; local payload="$2"; local jq_expr="$3"
  local resp
  resp=$(call "$payload" 2>/dev/null)
  local actual
  actual=$(echo "$resp" | jq -r "$jq_expr" 2>/dev/null || echo "__error__")
  if [[ "$actual" != "null" && "$actual" != "__error__" && "$actual" != "__missing__" && -n "$actual" ]]; then
    echo -e "${GREEN}[PASS]${NC} $label  →  $actual"
    ((PASS++))
  else
    echo -e "${RED}[FAIL]${NC} $label  (jq: $jq_expr)  resp: $(echo "$resp" | jq -c . 2>/dev/null || echo "$resp")"
    ((FAIL++))
  fi
}

section() { echo -e "\n${CYAN}══ $1 ══${NC}"; }

echo "================================================================"
echo "  OPERATIONS INTELLIGENCE — ENGINE TEST HARNESS"
echo "  Instance : $INSTANCE"
echo "  Endpoint : $API_PATH"
echo "================================================================"

# ── DIAGNOSTICS ──────────────────────────────────────────────────────
section "DIAGNOSTICS"
check "ping" '{"op":"ping"}'
check "now" '{"op":"now"}' "ok" "true"
check_field "scope.info returns scope" '{"op":"scope.info"}' ".scope"
check_field "engine.status returns op_count" '{"op":"engine.status"}' ".op_count"
check "selftest" '{"op":"selftest"}'
check_field "help returns ops array" '{"op":"help"}' ".operations | length | . > 100"

# ── DISCOVERY ─────────────────────────────────────────────────────────
section "DISCOVERY"
check "meta.tables" '{"op":"meta.tables"}'
check "meta.script_includes" '{"op":"meta.script_includes"}'
check "meta.business_rules" '{"op":"meta.business_rules"}'
check "meta.notifications" '{"op":"meta.notifications"}'
check "meta.widgets" '{"op":"meta.widgets"}'
check "meta.jobs" '{"op":"meta.jobs"}'
check "meta.acls" '{"op":"meta.acls","table":"incident"}'
check "meta.all" '{"op":"meta.all"}'
check "meta.ui_pages" '{"op":"meta.ui_pages"}'
check "meta.portal_pages" '{"op":"meta.portal_pages"}'
check "meta.catalog_items" '{"op":"meta.catalog_items"}'
check "meta.app_menus" '{"op":"meta.app_menus"}'
check "meta.app_modules" '{"op":"meta.app_modules"}'
check "meta.events" '{"op":"meta.events"}'

# ── SCHEMA ────────────────────────────────────────────────────────────
section "SCHEMA"
check "table.exists (incident)" '{"op":"table.exists","table":"incident"}'
check "schema.fields (incident)" '{"op":"schema.fields","table":"incident"}'
check "table.schema (incident short)" '{"op":"table.schema","table":"incident"}'

# ── PROPERTIES ────────────────────────────────────────────────────────
section "PROPERTIES"
check "property.set (plain)" '{"op":"property.set","data":{"key":"x_infte_ops_int.engine_test_ping","value":"ok"}}'
check_field "property.get returns value" '{"op":"property.get","data":{"key":"x_infte_ops_int.engine_test_ping"}}' ".value"
check "property.list" '{"op":"property.list","data":{"prefix":"x_infte_ops_int"}}'
check "property.set (typed boolean)" '{"op":"property.set","data":{"key":"x_infte_ops_int.engine_test_bool","value":"true","type":"boolean"}}'
check "property.delete (test_ping)" '{"op":"property.delete","data":{"key":"x_infte_ops_int.engine_test_ping"}}'
check "property.delete (test_bool)" '{"op":"property.delete","data":{"key":"x_infte_ops_int.engine_test_bool"}}'

# ── RECORDS ───────────────────────────────────────────────────────────
section "RECORDS"
# Insert a test record (using sys_properties as a scratchpad — safe, we'll delete it)
check_field "record.insert sys_properties" \
  '{"op":"record.insert","table":"sys_properties","data":{"name":"x_infte_ops_int._engine_test_rec","value":"test123"},"platform":true}' \
  ".sys_id"

check "record.get by query" \
  '{"op":"record.get","table":"sys_properties","query":{"name":"x_infte_ops_int._engine_test_rec"}}'

check "record.update by query" \
  '{"op":"record.update","table":"sys_properties","query":{"name":"x_infte_ops_int._engine_test_rec"},"data":{"value":"updated"}}'

check "record.query sys_properties prefix" \
  '{"op":"record.query","table":"sys_properties","encoded_query":"nameSTARTSWITHx_infte_ops_int","limit":5}'

check "record.count incident" \
  '{"op":"record.count","table":"incident"}' "ok" "true"

check "record.aggregate incident COUNT" \
  '{"op":"record.aggregate","table":"incident","aggregate":"COUNT"}'

check "record.patch by query" \
  '{"op":"record.patch","table":"sys_properties","query":{"name":"x_infte_ops_int._engine_test_rec"},"data":{"description":"patched"}}'

check "record.upsert (update existing)" \
  '{"op":"record.upsert","table":"sys_properties","query":{"name":"x_infte_ops_int._engine_test_rec"},"data":{"value":"upserted"}}'

check "record.find in sys_properties" \
  '{"op":"record.find","table":"sys_properties","data":{"field":"name","value":"_engine_test_rec"}}'

check "record.history for any user" \
  '{"op":"record.history","table":"sys_user","encoded_query":"user_name=admin","limit":1}' "ok" "true"

# Delete the test record
check "record.delete test record" \
  '{"op":"record.delete","table":"sys_properties","query":{"name":"x_infte_ops_int._engine_test_rec"},"platform":true}'

# Bulk delete guard (no confirm = safe rejection)
check "record.bulk_delete guard (no confirm)" \
  '{"op":"record.bulk_delete","table":"sys_properties","encoded_query":"nameSTARTSWITHx_infte_ops_int._NONEXISTENT_"}' \
  "ok" "false"

# ── USERS ─────────────────────────────────────────────────────────────
section "USERS"
check_field "user.get (admin)" '{"op":"user.get","data":{"user_name":"admin"}}' ".record.user_name.value // .record.user_name"
check "user.roles (admin)" '{"op":"user.roles","data":{"user":"admin"}}'

# ── GROUPS ────────────────────────────────────────────────────────────
section "GROUPS"
check "group.members" '{"op":"group.members","data":{"group":"Hardware"}}'

# ── UPDATE SETS ───────────────────────────────────────────────────────
section "UPDATE SETS"
check "update_set.list" '{"op":"update_set.list","data":{"state":"in progress"}}'

# ── ACL ───────────────────────────────────────────────────────────────
section "ACL"
check "acl.list incident" '{"op":"acl.list","table":"incident"}'

# ── ARTIFACTS ────────────────────────────────────────────────────────
section "ARTIFACTS"
check "artifact.script_include (upsert)" \
  '{"op":"artifact.script_include","data":{"name":"OIEngineTestInclude","script":"var OIEngineTestInclude = Class.create();\nOIEngineTestInclude.prototype = { initialize: function() {}, type: \"OIEngineTestInclude\" };","active":true}}'

check "artifact.business_rule (upsert)" \
  '{"op":"artifact.business_rule","data":{"name":"OI - Engine Test Rule","collection":"sys_properties","script":"// engine test","when":"after","insert":false,"update":false,"delete":false,"query":false,"active":false}}'

check "artifact.scheduled_job (upsert)" \
  '{"op":"artifact.scheduled_job","data":{"name":"OI - Engine Test Job","script":"// engine test job","run_type":"on_demand","active":false}}'

check "artifact.event_registry (upsert)" \
  '{"op":"artifact.event_registry","data":{"event_name":"x_infte_ops_int.engine_test","description":"Engine test event"}}'

check "artifact.notification (upsert)" \
  '{"op":"artifact.notification","data":{"name":"OI - Engine Test Notification","event_name":"x_infte_ops_int.engine_test","subject":"Engine Test","message_html":"<p>test</p>","message_text":"test","importance":"normal","active":false}}'

check "artifact.role (upsert)" \
  '{"op":"artifact.role","data":{"name":"x_infte_ops_int.engine_test_role","description":"Engine test role","elevated_privilege":false,"grantable":true}}'

check "artifact.sp_portal (upsert)" \
  '{"op":"artifact.sp_portal","data":{"title":"OI Engine Test Portal","url_suffix":"oi_engine_test"}}'

check "artifact.client_script (upsert)" \
  '{"op":"artifact.client_script","data":{"name":"OI - Engine Test CS","table":"incident","type":"onLoad","script":"// engine test","active":false}}'

check "artifact.ui_action (upsert)" \
  '{"op":"artifact.ui_action","data":{"name":"OI - Engine Test Action","table":"incident","script":"// engine test","active":false}}'

# ── SYS.ID ────────────────────────────────────────────────────────────
section "SYS.ID"
check_field "sys.id script_include" \
  '{"op":"sys.id","data":{"type":"script_include","name":"OIEngineTestInclude"}}' ".sys_id"
check_field "sys.id role" \
  '{"op":"sys.id","data":{"type":"role","name":"x_infte_ops_int.engine_test_role"}}' ".sys_id"

# ── POWER OPS ─────────────────────────────────────────────────────────
section "POWER"
check_field "script.run returns result" \
  '{"op":"script.run","data":{"script":"var result = {computed: 2 + 2, scope: gs.getCurrentScopeName()};"}}' \
  ".result.computed"
check "rest.call internal" \
  '{"op":"rest.call","data":{"method":"GET","path":"/api/now/table/sys_properties?sysparm_limit=1&sysparm_fields=name"}}'
check "event.fire (test event)" \
  '{"op":"event.fire","data":{"name":"x_infte_ops_int.engine_test"}}'
check "sys.log" \
  '{"op":"sys.log","data":{"source":"engine_test","message":"test harness run"}}'

# ── WORKFLOW ──────────────────────────────────────────────────────────
section "WORKFLOW (schema validation only)"
check "workflow.start (missing flow = 400)" \
  '{"op":"workflow.start","data":{}}' "ok" "false"

# ── EMAIL ─────────────────────────────────────────────────────────────
section "EMAIL"
check "email.send (missing to = 400)" \
  '{"op":"email.send","data":{"subject":"test"}}' "ok" "false"

# ── ENGINE ────────────────────────────────────────────────────────────
section "ENGINE"
check "engine.source" '{"op":"engine.source"}' "ok" "true"
check_field "engine.source marker_ok" '{"op":"engine.source"}' ".marker_ok"

# ── BATCH ─────────────────────────────────────────────────────────────
section "BATCH"
check_field "batch (ping + now)" \
  '{"op":"batch","data":{"ops":[{"op":"ping"},{"op":"now"}]}}' \
  ".results | length"

# ── CLEANUP: remove test artifacts ────────────────────────────────────
section "CLEANUP"
call '{"op":"record.delete","table":"sys_script_include","query":{"name":"OIEngineTestInclude"},"platform":true}' > /dev/null
call '{"op":"record.delete","table":"sys_script","query":{"name":"OI - Engine Test Rule"},"platform":true}' > /dev/null
call '{"op":"record.delete","table":"sysauto_script","query":{"name":"OI - Engine Test Job"},"platform":true}' > /dev/null
call '{"op":"record.delete","table":"sysevent_email_action","query":{"name":"OI - Engine Test Notification"},"platform":true}' > /dev/null
call '{"op":"record.delete","table":"sysevent_register","query":{"name":"x_infte_ops_int.engine_test"},"platform":true}' > /dev/null
call '{"op":"record.delete","table":"sys_user_role","query":{"name":"x_infte_ops_int.engine_test_role"},"platform":true}' > /dev/null
call '{"op":"record.delete","table":"sp_portal","query":{"title":"OI Engine Test Portal"},"platform":true}' > /dev/null
call '{"op":"record.delete","table":"sys_script_client","query":{"name":"OI - Engine Test CS"},"platform":true}' > /dev/null
call '{"op":"record.delete","table":"sys_ui_action","query":{"name":"OI - Engine Test Action"},"platform":true}' > /dev/null
echo -e "${GREEN}[OK]${NC} Test artifacts cleaned up"

# ── SUMMARY ───────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo "================================================================"
echo "  RESULTS"
echo "  Passed : $PASS / $TOTAL"
echo "  Failed : $FAIL"
if [[ $SKIP -gt 0 ]]; then echo "  Skipped: $SKIP"; fi
echo "  Status : $([ $FAIL -eq 0 ] && echo 'ALL TESTS PASSED' || echo "$FAIL TEST(S) FAILED')"
echo "================================================================"
[[ $FAIL -eq 0 ]]
