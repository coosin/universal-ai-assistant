#!/bin/bash
# 健康检查：Node、Docker、端口、OpenClaw、CLIProxyAPI
# 使用 LF 换行
set -u
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

echo ""
echo "服务连通性（可选）:"
if command -v curl >/dev/null 2>&1; then
  if curl -sS -m 2 -o /dev/null "http://127.0.0.1:8317/v1/models" 2>/dev/null; then
    echo "  [OK] CLIProxyAPI: http://127.0.0.1:8317/v1/models"
  else
    echo "  [WARN] CLIProxyAPI: 无法访问 http://127.0.0.1:8317/v1/models"
  fi

  if curl -sS -m 3 -o /dev/null "https://api.telegram.org" 2>/dev/null; then
    echo "  [OK] Telegram API: https://api.telegram.org"
  else
    echo "  [WARN] Telegram API: 无法访问（国内网络常见；需在 WSL 为 Gateway 配置 HTTP(S)_PROXY）"
  fi

  if curl -sS -m 3 -o /dev/null "https://openrouter.ai/api/v1" 2>/dev/null; then
    echo "  [OK] OpenRouter: https://openrouter.ai/api/v1"
  else
    echo "  [WARN] OpenRouter: 无法访问（可能需代理或 DNS）"
  fi
fi

echo "Done."
