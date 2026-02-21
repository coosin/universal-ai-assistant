#!/bin/bash
# 启动 CLIProxyAPI 容器（当 docker-compose 因旧容器报错时的备用方案）
# 用法: ./scripts/start_cliproxyapi.sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

echo "=== 启动 CLIProxyAPI ==="
if docker ps --format '{{.Names}}' | grep -q cliproxyapi; then
  echo "  容器已在运行"
  exit 0
fi
# 尝试 docker-compose，失败则直接启动已有容器
if (docker-compose -f "$ROOT/docker-compose.yml" up -d 2>/dev/null || docker compose -f "$ROOT/docker-compose.yml" up -d 2>/dev/null); then
  echo "  已通过 docker-compose 启动"
else
  for cid in $(docker ps -a --filter "ancestor=eceasy/cli-proxy-api" --format '{{.ID}}'); do
    docker start "$cid" && echo "  已启动容器 $cid" && exit 0
  done
  echo "  未找到 CLIProxyAPI 容器，请先执行: docker-compose pull && docker-compose up -d"
  exit 1
fi
