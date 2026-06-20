#!/usr/bin/env bash
# Operations Intelligence — Engine Self-Update
# Reads 02b_engine_operation_script.js and pushes it to the instance
# via engine.selfupdate so no manual Background Script copy-paste is needed.
# Usage: bash update_engine.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$(cd "$SCRIPT_DIR/../.." && pwd)/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
fi

ENGINE_FILE="$SCRIPT_DIR/02b_engine_operation_script.js"
INSTANCE="${SNOW_INSTANCE:-https://everestdev.service-now.com}"
API_PATH="${ENGINE_ENDPOINT:-/api/x_infte_ops_int/ops_int_engine/v1}"
BASE_URL="${INSTANCE}${API_PATH}"
KEY="${ENGINE_KEY:-}"
SN_USER="${SNOW_USER:-}"
SN_PASS="${SNOW_PASS:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'

if [[ -z "$KEY" ]]; then
  echo -e "${RED}ERROR: ENGINE_KEY not set. Add it to .env in the repo root.${NC}"; exit 1
fi
if [[ -z "$SN_USER" || -z "$SN_PASS" ]]; then
  echo -e "${RED}ERROR: SNOW_USER and SNOW_PASS must be set in .env${NC}"; exit 1
fi
if [[ ! -f "$ENGINE_FILE" ]]; then
  echo -e "${RED}ERROR: Engine file not found: $ENGINE_FILE${NC}"; exit 1
fi

echo "================================================================"
echo "  OPERATIONS INTELLIGENCE — ENGINE SELF-UPDATE"
echo "  Instance : $INSTANCE"
echo "  Engine   : $ENGINE_FILE"
echo "================================================================"

echo "Encoding engine script ($(wc -l < "$ENGINE_FILE") lines)..."
SCRIPT_JSON=$(jq -Rs '.' < "$ENGINE_FILE")

echo "Sending engine.selfupdate to instance..."
PAYLOAD="{\"op\":\"engine.selfupdate\",\"data\":{\"script\":${SCRIPT_JSON}}}"

RAW=$(curl -s -X POST "$BASE_URL" \
  -u "${SN_USER}:${SN_PASS}" \
  -H "Content-Type: application/json" \
  -H "X-Engine-Key: $KEY" \
  -d "$PAYLOAD")

RESULT=$(echo "$RAW" | jq 'if type=="object" and has("result") then .result else . end' 2>/dev/null || echo "$RAW")
echo "$RESULT" | jq .

OK=$(echo "$RESULT" | jq -r '.ok // "false"')
if [[ "$OK" == "true" ]]; then
  BYTES=$(echo "$RESULT" | jq -r '.bytes // "unknown"')
  echo -e "${GREEN}Engine updated successfully! ($BYTES bytes)${NC}"
  echo "Run test_engine.sh to verify."
else
  echo -e "${RED}Engine update FAILED${NC}"
  exit 1
fi
