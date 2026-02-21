#!/bin/bash
# 安装 Clash 订阅自动更新 cron（每日 6:30 执行）
# 用法: sudo bash scripts/clash_install_cron.sh
# 前提: .env 中已设置 CLASH_SUBSCRIPTION_URL
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CRON_FILE="/etc/cron.d/universal-ai-clash-update"

echo "=== 安装 Clash 订阅自动更新 cron ==="
[ -f "$ROOT/.env" ] && set -a && source "$ROOT/.env" && set +a
if [ -z "${CLASH_SUBSCRIPTION_URL:-}" ]; then
  echo "  请在 .env 中先设置 CLASH_SUBSCRIPTION_URL"
  exit 1
fi

# 使用 root 运行，以便读取 .env 并写入 /etc/clash
cat > "$CRON_FILE" << EOF
# Universal AI Assistant - Clash 订阅每日更新
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 6 * * * root . $ROOT/.env 2>/dev/null; [ -n "\$CLASH_SUBSCRIPTION_URL" ] && $ROOT/scripts/clash_update_subscription.sh
EOF
echo "  已创建: $CRON_FILE"
echo "  执行时间: 每日 6:30"
echo "  验证: sudo cat $CRON_FILE"
echo "  卸载: sudo rm $CRON_FILE"
echo "完成"
