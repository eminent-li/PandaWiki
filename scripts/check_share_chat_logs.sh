#!/usr/bin/env bash

set -euo pipefail

COMPOSE_CMD="${COMPOSE_CMD:-docker compose}"
SERVICE="${SERVICE:-api}"
SINCE="${SINCE:-30m}"
QUERY_KEYWORD="${1:-FY26 L3 投放表现}"
CONVERSATION_ID="${CONVERSATION_ID:-}"

PATTERN='/share/v1/chat/message|retrieve chunks result|get related documents from raglite|get node release by doc ids|chat stream finished|start assistant post process|assistant answer saved|assistant post process finished|failed to save assistant answer to conversation message|failed to update model usage|对话超时|对话失败|context canceled'

echo "== services =="
${COMPOSE_CMD} ps --services || true
echo

echo "== filtered ${SERVICE} logs since ${SINCE} =="
${COMPOSE_CMD} logs "${SERVICE}" --since "${SINCE}" 2>&1 | grep -E "${PATTERN}" || true
echo

if [[ -n "${QUERY_KEYWORD}" ]]; then
  echo "== keyword: ${QUERY_KEYWORD} =="
  ${COMPOSE_CMD} logs "${SERVICE}" --since "${SINCE}" 2>&1 | grep -F "${QUERY_KEYWORD}" || true
  echo
fi

if [[ -n "${CONVERSATION_ID}" ]]; then
  echo "== conversation_id: ${CONVERSATION_ID} =="
  ${COMPOSE_CMD} logs "${SERVICE}" --since "${SINCE}" 2>&1 | grep -F "${CONVERSATION_ID}" || true
  echo
fi

echo "== recent request lines =="
${COMPOSE_CMD} logs "${SERVICE}" --since "${SINCE}" 2>&1 | grep -E 'REQUEST|/share/v1/chat/message' | tail -n 50 || true