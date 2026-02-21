#!/bin/bash
# Clash 订阅自动更新：从 .env 读取 CLASH_SUBSCRIPTION_URL，拉取并写入 /etc/clash/config.yaml
# 用法: sudo bash scripts/clash_update_subscription.sh  或由 cron 每日执行（见下方）
# 配置: 在 .env 中设置 CLASH_SUBSCRIPTION_URL=你的订阅链接
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_DEST="${CLASH_CONFIG:-/etc/clash/config.yaml}"

[ -f "$ROOT/.env" ] && set -a && source "$ROOT/.env" && set +a
URL="${CLASH_SUBSCRIPTION_URL:-}"

if [ -z "$URL" ]; then
  echo "未设置 CLASH_SUBSCRIPTION_URL，请在 .env 中配置后重试"
  exit 1
fi

echo "=== Clash 订阅更新 ==="
echo "  订阅: ${URL:0:50}..."
mkdir -p "$(dirname "$CONFIG_DEST")"
TMP="/tmp/clash_update_$$.yaml"
if curl -sSL -f --connect-timeout 30 -o "$TMP" "$URL"; then
  # 若为 base64 编码则解码（多数订阅为此格式）
  if base64 -d < "$TMP" > "${TMP}.dec" 2>/dev/null && [ -s "${TMP}.dec" ]; then
    mv "${TMP}.dec" "$TMP"
  else
    rm -f "${TMP}.dec"
  fi
  if [ "$(id -u)" = "0" ]; then
    cp "$TMP" "$CONFIG_DEST"
  else
    sudo cp "$TMP" "$CONFIG_DEST"
  fi
  # 注入 DNS 修复，避免国内无法解析代理节点域名（订阅覆盖后自动保留）
  _run() { [ "$(id -u)" = "0" ] && "$@" || sudo "$@"; }
  if ! _run grep -q 'proxy-server-nameserver' "$CONFIG_DEST"; then
    _run sed -i '/^  fallback:/i\  proxy-server-nameserver:\n    - system' "$CONFIG_DEST"
    echo "  已注入 proxy-server-nameserver: system"
  fi
  if ! _run grep -q '127.0.0.53' "$CONFIG_DEST"; then
    _run sed -i '/^  nameserver:/a\    - 127.0.0.53' "$CONFIG_DEST"
    echo "  已注入 nameserver: 127.0.0.53"
  fi
  if [ "$(id -u)" = "0" ]; then
    systemctl restart clash 2>/dev/null && echo "  已重启 clash" || echo "  请手动: sudo systemctl restart clash"
  else
    sudo systemctl restart clash 2>/dev/null && echo "  已重启 clash" || echo "  请手动: sudo systemctl restart clash"
  fi
  rm -f "$TMP"
  echo "  完成: $CONFIG_DEST"
else
  rm -f "$TMP"
  echo "  拉取失败，请检查网络或代理"
  exit 1
fi
