#!/bin/bash
# 通过本机代理拉取 Docker 镜像（适用于服务器无直连 Docker Hub 时）
# 用法: sudo bash scripts/docker_proxy_pull.sh [代理端口]
# 示例: sudo bash scripts/docker_proxy_pull.sh 7897
# 默认代理: 192.168.1.2:7897
set -e
PROXY_HOST="${DOCKER_PROXY_HOST:-192.168.1.2}"
PROXY_PORT="${1:-7897}"
PROXY_URL="http://${PROXY_HOST}:${PROXY_PORT}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DROPDIR="/etc/systemd/system/docker.service.d"
CONF="$DROPDIR/http-proxy.conf"

echo "=== 通过代理拉取镜像 ==="
echo "  代理: $PROXY_URL"
echo ""

# 0. 检查本机代理是否可从本机访问
echo "[0/3] 检查代理连通性..."
if curl -sS -m 5 -x "$PROXY_URL" -o /dev/null "https://registry-1.docker.io/v2/" 2>/dev/null; then
  echo "  代理可达，继续"
else
  echo "  无法通过代理访问 Docker Hub。请确认："
  echo "  1) 本机 192.168.1.2 上代理已开启，且监听 0.0.0.0:${PROXY_PORT}（允许局域网），不要只监听 127.0.0.1"
  echo "  2) 本机防火墙已放行 ${PROXY_PORT} 入站"
  echo "  3) 端口正确（常见 7890/1080/8080），可传参: sudo bash $0 <端口>"
  if [ -t 0 ]; then
    read -p "  仍要继续配置 Docker 并尝试拉取？[y/N] " -n 1 -r; echo
    [[ ! $REPLY =~ ^[yY]$ ]] && exit 1
  else
    echo "  非交互模式，继续配置并尝试拉取..."
  fi
fi
echo ""

# 1. 配置 Docker 使用代理
echo "[1/3] 配置 Docker 使用代理..."
sudo mkdir -p "$DROPDIR"
sudo tee "$CONF" << EOF
[Service]
Environment="HTTP_PROXY=$PROXY_URL"
Environment="HTTPS_PROXY=$PROXY_URL"
Environment="NO_PROXY=localhost,127.0.0.1,::1"
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
echo "  已设置并重启 Docker"
sleep 2

# 2. 拉取镜像
echo ""
echo "[2/3] 拉取 CLIProxyAPI 镜像..."
if docker-compose -f "$ROOT/docker-compose.yml" pull 2>&1; then
  echo "  拉取成功"
else
  echo "  拉取失败。请确认本机 192.168.1.2 代理："
  echo "  - 已开启并监听 0.0.0.0:${PROXY_PORT}（允许局域网），不要只监听 127.0.0.1"
  echo "  - 本机防火墙已放行 ${PROXY_PORT}"
  exit 1
fi

# 3. 启动容器
echo ""
echo "[3/3] 启动 CLIProxyAPI 容器..."
cd "$ROOT"
docker-compose -f docker-compose.yml up -d 2>/dev/null || docker compose -f docker-compose.yml up -d 2>/dev/null || true
sleep 2
if docker ps --format '{{.Names}}' | grep -q cliproxyapi; then
  echo "  CLIProxyAPI 已启动"
  echo "  管理界面: http://<本机IP>:8317/management.html"
else
  echo "  启动异常，请检查: docker logs cliproxyapi"
fi
echo ""
echo "Done."
