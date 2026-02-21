#!/bin/bash
# 在 home 上安装 Clash（mihomo）并配置 systemd 服务
# 用法: sudo bash scripts/clash_setup.sh
# 安装后需手动将订阅或 config.yaml 放到 /etc/clash/config.yaml，再 systemctl start clash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MH_VERSION="${MH_VERSION:-v1.19.20}"
INSTALL_DIR="/usr/local/bin"
CONFIG_DIR="/etc/clash"
SVC_FILE="/etc/systemd/system/clash.service"

echo "=== 安装 Clash (mihomo) ==="

# 架构（amd64 用 v1 兼容老 CPU，避免 v3 需新指令集）
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)   MH_ARCH="amd64-v1" ;;
  aarch64|arm64) MH_ARCH="arm64" ;;
  armv7l)   MH_ARCH="armv7" ;;
  *) echo "不支持的架构: $ARCH"; exit 1 ;;
esac
echo "  架构: $ARCH -> mihomo-$MH_ARCH"

# 下载（若有 HTTP_PROXY/HTTPS_PROXY 会自动走代理）
TAG="${MH_VERSION#v}"
URL="https://github.com/MetaCubeX/mihomo/releases/download/${MH_VERSION}/mihomo-linux-${MH_ARCH}-${MH_VERSION}.gz"
echo "  下载: $URL"
mkdir -p /tmp/clash-install
if ! curl -sSL -f --connect-timeout 30 -o /tmp/clash-install/mihomo.gz "$URL"; then
  echo "  下载失败。若在国内可先设代理再执行，例如:"
  echo "    export HTTPS_PROXY=http://192.168.1.2:7897"
  echo "    sudo -E bash scripts/clash_setup.sh"
  exit 1
fi
gunzip -c /tmp/clash-install/mihomo.gz > /tmp/clash-install/mihomo
chmod +x /tmp/clash-install/mihomo

# 安装
cp /tmp/clash-install/mihomo "$INSTALL_DIR/mihomo"
echo "  已安装: $INSTALL_DIR/mihomo"
rm -rf /tmp/clash-install

# 配置目录
mkdir -p "$CONFIG_DIR"
if [ ! -f "$CONFIG_DIR/config.yaml" ]; then
  # 最小示例，用户需替换为真实订阅或配置
  cat > "$CONFIG_DIR/config.yaml" << 'YAML'
# 占位配置，请替换为你的订阅内容或完整 config.yaml
# 可执行: curl -s "你的订阅链接" | base64 -d | sudo tee /etc/clash/config.yaml
port: 7890
socks-port: 7891
allow-lan: false
mode: rule
log-level: info
YAML
  echo "  已创建占位 $CONFIG_DIR/config.yaml，请替换为你的订阅或完整配置"
else
  echo "  已有 $CONFIG_DIR/config.yaml，未覆盖"
fi

# systemd
cat > "$SVC_FILE" << EOF
[Unit]
Description=Clash (mihomo) Proxy
After=network.target

[Service]
Type=simple
ExecStart=$INSTALL_DIR/mihomo -d $CONFIG_DIR
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
echo "  已创建 $SVC_FILE"

systemctl daemon-reload
systemctl enable clash
echo ""
echo "=== 安装完成 ==="
echo "1. 将你的 Clash 订阅或 config.yaml 放到: $CONFIG_DIR/config.yaml"
echo "   订阅示例: curl -s \"订阅链接\" | base64 -d | sudo tee $CONFIG_DIR/config.yaml"
echo "2. 启动: sudo systemctl start clash"
echo "3. 测试: curl -x http://127.0.0.1:7890 https://api.telegram.org"
echo "4. 在项目 .env 中设置: HTTP_PROXY=http://127.0.0.1:7890 与 HTTPS_PROXY=同上"
echo "5. 重启 Gateway: openclaw gateway stop && ./scripts/start_all_services.sh --background"
