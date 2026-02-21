#!/bin/bash
# 健康检查：Node、Docker、端口、OpenClaw、CLIProxyAPI
# 使用 LF 换行
set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
[ -f "$ROOT/.env" ] && set -a && source "$ROOT/.env" 2>/dev/null && set +a
CURL_PROXY=""
[ -n "${HTTP_PROXY:-}" ] && CURL_PROXY="-x $HTTP_PROXY"

echo "=== Universal AI Assistant 健康检查 ==="
echo ""

check() {
    if command -v "$1" >/dev/null 2>&1; then
        echo "[OK] $1: $(command -v "$1")"
    else
        echo "[FAIL] 未找到: $1"
    fi
}

check node
check npm
check docker
check openclaw 2>/dev/null || echo "[WARN] openclaw 未安装或不在 PATH"
check curl 2>/dev/null || echo "[WARN] curl 未安装（网络连通性检查将跳过）"
echo ""

echo "端口占用:"
for port in 18789 8317; do
    if (ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -q ":$port "; then
        echo "  [IN USE] $port"
    else
        echo "  [FREE]   $port"
    fi
done
echo ""

echo "Docker 容器:"
docker ps --format "  {{.Names}}: {{.Status}}" 2>/dev/null | grep -E "cliproxyapi|openclaw" || echo "  (无相关容器)"
# 若 8317 空闲且有已退出的 cliproxyapi 容器，提示可启动
if ! (ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -q ":8317 "; then
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q cliproxyapi; then
    echo "  [提示] CLIProxyAPI 已退出，可执行: ./scripts/start_cliproxyapi.sh 或 面板「启动 CLIProxyAPI」"
  fi
fi

echo ""
echo "服务连通性（可选）:"
if command -v curl >/dev/null 2>&1; then
  if curl -sS -m 2 -o /dev/null "http://127.0.0.1:8317/v1/models" 2>/dev/null; then
    echo "  [OK] CLIProxyAPI: http://127.0.0.1:8317/v1/models"
  else
    echo "  [WARN] CLIProxyAPI: 无法访问 http://127.0.0.1:8317/v1/models"
  fi

  if curl -sS -m 5 $CURL_PROXY -o /dev/null "https://api.telegram.org" 2>/dev/null; then
    echo "  [OK] Telegram API: https://api.telegram.org"
  else
    echo "  [WARN] Telegram API: 无法访问（若已配 .env 中 HTTP_PROXY，Gateway 会走代理，可忽略）"
  fi

  if curl -sS -m 5 $CURL_PROXY -o /dev/null "https://openrouter.ai/api/v1" 2>/dev/null; then
    echo "  [OK] OpenRouter: https://openrouter.ai/api/v1"
  else
    echo "  [WARN] OpenRouter: 无法访问（若已配代理，Gateway 会走代理，可忽略）"
  fi
fi

echo "Done."
