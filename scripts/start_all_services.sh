#!/bin/bash
# 一键启动所有服务：CLIProxyAPI（若镜像已存在）、Web 管理、OpenClaw Gateway
# 用法: ./scripts/start_all_services.sh [--background]
# --background: Gateway 也后台运行；否则前台运行（便于看日志）
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# 加载 .env
[ -f "$ROOT/.env" ] && set -a && source "$ROOT/.env" && set +a

echo "=== 启动 Universal AI Assistant 服务 ==="

# 1. CLIProxyAPI（Docker）
if docker images --format '{{.Repository}}' | grep -q 'eceasy/cli-proxy-api'; then
  echo "[1/3] 启动 CLIProxyAPI..."
  docker-compose -f "$ROOT/docker-compose.yml" up -d 2>/dev/null || docker compose -f "$ROOT/docker-compose.yml" up -d 2>/dev/null || true
  sleep 2
else
  echo "[1/3] CLIProxyAPI 镜像未拉取，跳过（网络恢复后执行: docker-compose -f docker-compose.yml pull && docker-compose up -d）"
fi

# 2. Web 管理界面
echo "[2/3] 启动 Web 管理界面..."
if ! ss -tlnp 2>/dev/null | grep -q ':8888 '; then
  (cd "$ROOT" && source venv/bin/activate 2>/dev/null && nohup python3 web/app.py >> web.log 2>&1 &)
  sleep 2
  echo "  Web 已启动: http://127.0.0.1:8888 (或本机 IP:9080)"
else
  echo "  Web 已在运行 (端口 8888)"
fi

# 3. OpenClaw Gateway
echo "[3/3] 启动 OpenClaw Gateway..."
if ss -tlnp 2>/dev/null | grep -q ':18789 '; then
  echo "  Gateway 已在运行 (端口 18789)"
else
  openclaw gateway stop 2>/dev/null || true
  sleep 1
  if [ "$1" = "--background" ]; then
    nohup openclaw gateway --port 18789 --verbose >> "$ROOT/openclaw-gateway.log" 2>&1 &
    sleep 2
    echo "  Gateway 已后台启动: http://127.0.0.1:18789 (或本机 IP:18790)"
  else
    echo "  Gateway 前台运行（Ctrl+C 停止）..."
    exec openclaw gateway --port 18789 --verbose
  fi
fi

echo ""
echo "=== 启动完成 ==="
echo "  Web 管理: http://<本机IP>:9080 或 :8888"
echo "  OpenClaw: http://<本机IP>:18790"
bash "$SCRIPT_DIR/health_check.sh" 2>/dev/null || true
