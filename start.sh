#!/bin/bash
# 一键启动：CLIProxyAPI (Docker) + OpenClaw Gateway
# 使用 LF 换行
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f "$SCRIPT_DIR/.env" ]; then
  # shellcheck disable=SC1090
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

echo "启动 CLIProxyAPI..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d 2>/dev/null || docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d 2>/dev/null || true
sleep 2
echo "启动 OpenClaw Gateway (端口 18789)..."
exec openclaw gateway --port 18789 --verbose
