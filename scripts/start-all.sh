#!/usr/bin/env bash
set -euo pipefail

pids=()

cleanup() {
  for pid in "${pids[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  wait || true
}

trap cleanup EXIT INT TERM

WEB_PORT="${PORT:-3000}"
GATEWAY_PORT="${API_PORT:-4000}"
LAUNCHES_PORT="${LAUNCHES_PORT:-4101}"
TASKS_PORT="${TASKS_PORT:-4102}"

node services/launches-service/src/index.js &
pids+=("$!")

node services/tasks-service/src/index.js &
pids+=("$!")

PORT="$GATEWAY_PORT" \
LAUNCHES_SERVICE_URL="http://127.0.0.1:${LAUNCHES_PORT}" \
TASKS_SERVICE_URL="http://127.0.0.1:${TASKS_PORT}" \
node services/api-gateway/src/index.js &
pids+=("$!")

PORT="$WEB_PORT" npm run start --workspace @zample/web &
pids+=("$!")

wait -n
exit $?
