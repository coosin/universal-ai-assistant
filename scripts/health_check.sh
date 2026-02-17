#!/bin/bash
# 健康检查：Node、Docker、端口、OpenClaw、CLIProxyAPI
# 使用 LF 换行
set -e
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
echo ""

echo "端口占用:"
for port in 18789 8080 8081; do
    if (ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -q ":$port "; then
        echo "  [IN USE] $port"
    else
        echo "  [FREE]   $port"
    fi
done
echo ""

echo "Docker 容器:"
docker ps --format "  {{.Names}}: {{.Status}}" 2>/dev/null | grep -E "cliproxyapi|openclaw" || echo "  (无相关容器)"
echo "Done."
