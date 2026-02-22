#!/bin/bash
# Cloudflare Tunnel 一键配置脚本

set -e

TUNNEL_NAME="openclaw"
DOMAIN="home.qlsm.net"
LOCAL_PORT="443"  # nginx HTTPS 端口

echo "=== Cloudflare Tunnel 配置 ==="
echo ""

# 检查 cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "错误: cloudflared 未安装"
    echo "安装命令: wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /tmp/cloudflared && chmod +x /tmp/cloudflared && sudo mv /tmp/cloudflared /usr/local/bin/"
    exit 1
fi

echo "步骤 1: 登录 Cloudflare（会打开浏览器）..."
cloudflared tunnel login

echo ""
echo "步骤 2: 创建隧道 '$TUNNEL_NAME'..."
cloudflared tunnel create "$TUNNEL_NAME" || {
    echo "隧道可能已存在，继续..."
}

echo ""
echo "步骤 3: 配置 DNS 路由..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN" || {
    echo "DNS 路由可能已存在，继续..."
}

echo ""
echo "步骤 4: 创建隧道配置文件..."
TUNNEL_CONFIG_DIR="${HOME}/.cloudflared"
mkdir -p "$TUNNEL_CONFIG_DIR"

cat > "${TUNNEL_CONFIG_DIR}/config.yml" << EOF
tunnel: $(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}' | head -1)
credentials-file: ${TUNNEL_CONFIG_DIR}/$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}' | head -1).json

ingress:
  - hostname: ${DOMAIN}
    service: https://127.0.0.1:${LOCAL_PORT}
  - service: http_status:404
EOF

echo "配置文件已创建: ${TUNNEL_CONFIG_DIR}/config.yml"

echo ""
echo "步骤 5: 测试隧道..."
echo "按 Ctrl+C 停止测试"
cloudflared tunnel --config "${TUNNEL_CONFIG_DIR}/config.yml" run "$TUNNEL_NAME"
