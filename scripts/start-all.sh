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

export PORT="${PORT:-3000}"
export API_PORT="${API_PORT:-4000}"
export LAUNCHES_PORT="${LAUNCHES_PORT:-4101}"
export TASKS_PORT="${TASKS_PORT:-4102}"

node services/launches-service/src/index.js &
pids+=("$!")

node services/tasks-service/src/index.js &
pids+=("$!")

node services/api-gateway/src/index.js &
pids+=("$!")

npm run start --workspace @zample/web &
pids+=("$!")

wait -n
exit $?
