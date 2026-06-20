#!/usr/bin/env bash
# Operations Intelligence Engine Test Harness
# Usage: bash test_engine.sh [--verbose]
#        Credentials are loaded from .env in the repo root (gitignored).
# Requires: curl, jq

# Load .env from repo root (two levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$(cd "$SCRIPT_DIR/../.." && pwd)/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
fi

INSTANCE="${SNOW_INSTANCE:-https://everestdev.service-now.com}"
API_PATH="${ENGINE_ENDPOINT:-/api/x_infte_ops_int/ops_int_engine/v1}"
BASE_URL="${INSTANCE}${API_PATH}"
KEY="${ENGINE_KEY:-}"
SN_USER="${SNOW_USER:-}"
SN_PASS="${SNOW_PASS:-}"
VERBOSE="${1:-}"
PASS=0; FAIL=0

if [[ -z "$KEY" ]]; then
  echo "ERROR: ENGINE_KEY not set. Add it to .env in the repo root."; exit 1
fi
if [[ -z "$SN_USER" || -z "$SN_PASS" ]]; then
  echo "ERROR: SNOW_USER and SNOW_PASS must be set in .env"; exit 1
fi

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

call() {
  local raw
  raw=$(curl -s -X POST "$BASE_URL" \
    -u "${SN_USER}:${SN_PASS}" \
    -H "Content-Type: application/json" \
    -H "X-Engine-Key: $KEY" \
    -d "$1")
  # Unwrap ServiceNow's {"result":{...}} envelope
  echo "$raw" | jq 'if type=="object" and has("result") then .result else . end' 2>/dev/null || echo "$raw"
}

# Safe jq: handles boolean false correctly (jq's // treats false as falsy)
jqr() {
  local json="$1" expr="$2"
  echo "$json" | jq -r "($expr) | if . == null then \"__null__\" else tostring end" 2>/dev/null || echo "__error__"
}

check() {
  local label="$1" payload="$2" field="${3:-ok}" want="${4:-true}"
  local resp actual
  resp=$(call "$payload")
  actual=$(jqr "$resp" ".${field}")
  if [[ "$actual" == "$want" ]]; then
    echo -e "${GREEN}[PASS]${NC} $label"
    PASS=$((PASS+1))
    if [[ "$VERBOSE" == "--verbose" ]]; then
      echo "       $(echo "$resp" | jq -c . 2>/dev/null || echo "$resp")"
    fi
  else
    echo -e "${RED}[FAIL]${NC} $label"
    echo -e "       ${YELLOW}want${NC} .${field}=${want}  ${YELLOW}got${NC}: $(echo "$resp" | jq -c . 2>/dev/null || echo "$resp")"
    FAIL=$((FAIL+1))
  fi
}

chkf() {
  local label="$1" payload="$2" expr="$3"
  local resp actual
  resp=$(call "$payload")
  actual=$(jqr "$resp" "$expr")
  if [[ -n "$actual" && "$actual" != "__null__" && "$actual" != "__error__" && "$actual" != "0" ]]; then
    echo -e "${GREEN}[PASS]${NC} $label  →  $actual"
    PASS=$((PASS+1))
  else
    echo -e "${RED}[FAIL]${NC} $label  (expr: $expr)"
    echo -e "       resp: $(echo "$resp" | jq -c . 2>/dev/null || echo "$resp")"
    FAIL=$((FAIL+1))
  fi
}

section() { echo -e "\n${CYAN}══ $1 ══${NC}"; }

echo "================================================================"
echo "  OPERATIONS INTELLIGENCE — ENGINE TEST HARNESS"
echo "  Instance : $INSTANCE"
echo "  Endpoint : $API_PATH"
echo "  User     : $SN_USER"
echo "================================================================"

# ── DIAGNOSTICS ───────────────────────────────────────────────────────
section "DIAGNOSTICS"
check "ping"                       '{"op":"ping"}'
check "now"                        '{"op":"now"}'
chkf  "scope.info → scope"        '{"op":"scope.info"}'       ".scope"
chkf  "engine.status → op_count"  '{"op":"engine.status"}'    ".op_count"
check "selftest"                   '{"op":"selftest"}'
chkf  "help → op count"           '{"op":"help"}'             ".operations | length"

# ── DISCOVERY ─────────────────────────────────────────────────────────
section "DISCOVERY"
check "meta.tables"          '{"op":"meta.tables"}'
check "meta.script_includes" '{"op":"meta.script_includes"}'
check "meta.business_rules"  '{"op":"meta.business_rules"}'
check "meta.notifications"   '{"op":"meta.notifications"}'
check "meta.widgets"         '{"op":"meta.widgets"}'
check "meta.jobs"            '{"op":"meta.jobs"}'
check "meta.acls"            '{"op":"meta.acls","table":"incident"}'
check "meta.all"             '{"op":"meta.all"}'
check "meta.ui_pages"        '{"op":"meta.ui_pages"}'
check "meta.portal_pages"    '{"op":"meta.portal_pages"}'
check "meta.catalog_items"   '{"op":"meta.catalog_items"}'
check "meta.app_menus"       '{"op":"meta.app_menus"}'
check "meta.app_modules"     '{"op":"meta.app_modules"}'
check "meta.events"          '{"op":"meta.events"}'

# ── SCHEMA ────────────────────────────────────────────────────────────
section "SCHEMA"
check "table.exists"  '{"op":"table.exists","table":"incident"}'
check "schema.fields" '{"op":"schema.fields","table":"incident"}'
check "table.schema"  '{"op":"table.schema","table":"incident"}'

# ── PROPERTIES ────────────────────────────────────────────────────────
section "PROPERTIES"
check "property.set (string)"        '{"op":"property.set","data":{"key":"x_infte_ops_int._test_ping","value":"ok"}}'
chkf  "property.get → value"         '{"op":"property.get","data":{"key":"x_infte_ops_int._test_ping"}}' ".value"
check "property.list"                 '{"op":"property.list","data":{"prefix":"x_infte_ops_int"}}'
check "property.set (typed boolean)"  '{"op":"property.set","data":{"key":"x_infte_ops_int._test_bool","value":"true","type":"boolean"}}'
check "property.delete (_test_ping)"  '{"op":"property.delete","data":{"key":"x_infte_ops_int._test_ping"}}'
check "property.delete (_test_bool)"  '{"op":"property.delete","data":{"key":"x_infte_ops_int._test_bool"}}'

# ── RECORDS ───────────────────────────────────────────────────────────
section "RECORDS"
chkf "record.insert → sys_id" \
  '{"op":"record.insert","table":"sys_properties","data":{"name":"x_infte_ops_int._test_rec","value":"v1"},"platform":true}' \
  ".sys_id"

check "record.get by query" \
  '{"op":"record.get","table":"sys_properties","query":{"name":"x_infte_ops_int._test_rec"}}'

check "record.update" \
  '{"op":"record.update","table":"sys_properties","query":{"name":"x_infte_ops_int._test_rec"},"data":{"value":"v2"}}'

check "record.query" \
  '{"op":"record.query","table":"sys_properties","encoded_query":"nameSTARTSWITHx_infte_ops_int","limit":5}'

check "record.count"     '{"op":"record.count","table":"incident"}'
check "record.aggregate" '{"op":"record.aggregate","table":"incident","aggregate":"COUNT"}'

check "record.patch" \
  '{"op":"record.patch","table":"sys_properties","query":{"name":"x_infte_ops_int._test_rec"},"data":{"description":"patched"}}'

check "record.upsert (update existing)" \
  '{"op":"record.upsert","table":"sys_properties","query":{"name":"x_infte_ops_int._test_rec"},"data":{"value":"v3"}}'

check "record.find" \
  '{"op":"record.find","table":"sys_properties","data":{"field":"name","value":"_test_rec"}}'

# record.history requires a sys_id — resolve admin user first
ADMIN_SYS_ID=$(call '{"op":"user.get","data":{"user_name":"admin"}}' | jq -r '.record.sys_id // empty' 2>/dev/null || echo "")
if [[ -n "$ADMIN_SYS_ID" ]]; then
  check "record.history (admin user)" \
    "{\"op\":\"record.history\",\"table\":\"sys_user\",\"data\":{\"sys_id\":\"${ADMIN_SYS_ID}\"},\"limit\":3}"
else
  echo -e "${YELLOW}[SKIP]${NC} record.history (could not resolve admin sys_id)"
fi

check "record.delete" \
  '{"op":"record.delete","table":"sys_properties","query":{"name":"x_infte_ops_int._test_rec"},"platform":true}'

# bulk_delete with no matches returns ok:false with "Add confirm:true" message — that IS the guard working
check "record.bulk_delete guard (no confirm → ok=false)" \
  '{"op":"record.bulk_delete","table":"sys_properties","encoded_query":"nameSTARTSWITHx_infte_ops_int._NONE_"}' \
  "ok" "false"

# ── USERS ─────────────────────────────────────────────────────────────
section "USERS"
chkf "user.get admin → user_name" '{"op":"user.get","data":{"user_name":"admin"}}' ".record.user_name"
check "user.roles"                 '{"op":"user.roles","data":{"user":"admin"}}'

# ── GROUPS ────────────────────────────────────────────────────────────
section "GROUPS"
# Use a group that exists on a dev instance
check "group.members" '{"op":"group.members","data":{"group":"Service Desk"}}'

# ── UPDATE SETS ───────────────────────────────────────────────────────
section "UPDATE SETS"
check "update_set.list" '{"op":"update_set.list","data":{"state":"in progress"}}'

# ── ACL ───────────────────────────────────────────────────────────────
section "ACL"
check "acl.list" '{"op":"acl.list","table":"incident"}'

# ── ARTIFACTS ─────────────────────────────────────────────────────────
section "ARTIFACTS"
check "artifact.script_include" \
  '{"op":"artifact.script_include","data":{"name":"OIEngineTestInclude","script":"var OIEngineTestInclude=Class.create();OIEngineTestInclude.prototype={initialize:function(){},type:\"OIEngineTestInclude\"};","active":false}}'

check "artifact.business_rule" \
  '{"op":"artifact.business_rule","data":{"name":"OI - Engine Test Rule","collection":"sys_properties","script":"// test","when":"after","insert":false,"update":false,"delete":false,"query":false,"active":false}}'

check "artifact.scheduled_job" \
  '{"op":"artifact.scheduled_job","data":{"name":"OI - Engine Test Job","script":"// test","run_type":"on_demand","active":false}}'

check "artifact.event_registry" \
  '{"op":"artifact.event_registry","data":{"event_name":"x_infte_ops_int.engine_test","description":"Engine test event"}}'

check "artifact.notification" \
  '{"op":"artifact.notification","data":{"name":"OI - Engine Test Notif","event_name":"x_infte_ops_int.engine_test","subject":"Test","message_html":"<p>test</p>","message_text":"test","active":false}}'

check "artifact.role" \
  '{"op":"artifact.role","data":{"name":"x_infte_ops_int.engine_test_role","description":"Engine test","grantable":true}}'

check "artifact.sp_portal" \
  '{"op":"artifact.sp_portal","data":{"title":"OI Engine Test Portal","url_suffix":"oi_engine_test"}}'

check "artifact.client_script" \
  '{"op":"artifact.client_script","data":{"name":"OI - Engine Test CS","table":"incident","type":"onLoad","script":"// test","active":false}}'

check "artifact.ui_action" \
  '{"op":"artifact.ui_action","data":{"name":"OI - Engine Test Action","table":"incident","script":"// test","active":false}}'

# ── SYS.ID ────────────────────────────────────────────────────────────
section "SYS.ID"
chkf "sys.id script_include" '{"op":"sys.id","data":{"type":"script_include","name":"OIEngineTestInclude"}}' ".sys_id"
chkf "sys.id role"           '{"op":"sys.id","data":{"type":"role","name":"x_infte_ops_int.engine_test_role"}}' ".sys_id"

# ── POWER ─────────────────────────────────────────────────────────────
section "POWER"
chkf "script.run → computed" \
  '{"op":"script.run","data":{"script":"var result={computed:2+2};"}}' \
  ".result.computed"

check "rest.call" \
  '{"op":"rest.call","data":{"method":"GET","path":"/api/now/table/sys_properties?sysparm_limit=1&sysparm_fields=name"}}'

check "event.fire" \
  '{"op":"event.fire","data":{"name":"x_infte_ops_int.engine_test"}}'

check "sys.log" \
  '{"op":"sys.log","data":{"source":"engine_test","message":"test harness run"}}'

# ── WORKFLOW ──────────────────────────────────────────────────────────
section "WORKFLOW"
check "workflow.start (missing data.flow → error)" \
  '{"op":"workflow.start","data":{}}' "ok" "false"

# ── EMAIL ─────────────────────────────────────────────────────────────
section "EMAIL"
check "email.send (missing data.to → error)" \
  '{"op":"email.send","data":{"subject":"test"}}' "ok" "false"

# ── ENGINE ────────────────────────────────────────────────────────────
section "ENGINE"
check "engine.source"           '{"op":"engine.source"}'
chkf  "engine.source marker_ok" '{"op":"engine.source"}' ".marker_ok"

# ── BATCH ─────────────────────────────────────────────────────────────
section "BATCH"
chkf "batch (ping+now) → 2 results" \
  '{"op":"batch","data":{"ops":[{"op":"ping"},{"op":"now"}]}}' \
  ".results | length"

# ── CLEANUP ───────────────────────────────────────────────────────────
section "CLEANUP"
call '{"op":"record.delete","table":"sys_script_include","query":{"name":"OIEngineTestInclude"},"platform":true}'          > /dev/null
call '{"op":"record.delete","table":"sys_script","query":{"name":"OI - Engine Test Rule"},"platform":true}'                > /dev/null
call '{"op":"record.delete","table":"sysauto_script","query":{"name":"OI - Engine Test Job"},"platform":true}'             > /dev/null
call '{"op":"record.delete","table":"sysevent_email_action","query":{"name":"OI - Engine Test Notif"},"platform":true}'    > /dev/null
call '{"op":"record.delete","table":"sysevent_register","query":{"event_name":"x_infte_ops_int.engine_test"},"platform":true}' > /dev/null
call '{"op":"record.delete","table":"sys_user_role","query":{"name":"x_infte_ops_int.engine_test_role"},"platform":true}'  > /dev/null
call '{"op":"record.delete","table":"sp_portal","query":{"title":"OI Engine Test Portal"},"platform":true}'                > /dev/null
call '{"op":"record.delete","table":"sys_script_client","query":{"name":"OI - Engine Test CS"},"platform":true}'           > /dev/null
call '{"op":"record.delete","table":"sys_ui_action","query":{"name":"OI - Engine Test Action"},"platform":true}'           > /dev/null
echo -e "${GREEN}[OK]${NC} Test artifacts removed"

# ── SUMMARY ───────────────────────────────────────────────────────────
TOTAL=$((PASS+FAIL))
echo ""
echo "================================================================"
echo "  RESULTS"
echo "  Passed : $PASS / $TOTAL"
echo "  Failed : $FAIL"
if [[ $FAIL -eq 0 ]]; then
  echo "  Status : ALL TESTS PASSED"
else
  echo "  Status : $FAIL TEST(S) FAILED"
fi
echo "================================================================"
exit $FAIL
