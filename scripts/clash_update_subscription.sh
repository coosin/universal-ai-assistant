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
    systemctl restart clash 2>/dev/null && echo "  已重启 clash" || echo "  请手动: sudo systemctl restart clash"
  else
    sudo cp "$TMP" "$CONFIG_DEST"
    sudo systemctl restart clash 2>/dev/null && echo "  已重启 clash" || echo "  请手动: sudo systemctl restart clash"
  fi
  rm -f "$TMP"
  echo "  完成: $CONFIG_DEST"
else
  rm -f "$TMP"
  echo "  拉取失败，请检查网络或代理"
  exit 1
fi
