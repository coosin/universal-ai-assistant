#!/bin/bash
# 在 home 上安装定时任务：每隔 30 分钟自动推送记录到 myhome（用户 crontab，无需 sudo）
# 用法：bash scripts/sync_install_cron.sh
# 前提：.env 中可设 MYHOME_HOST（默认 myhome），且 sync_home_to_myhome.sh 能连通
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CRON_LINE="*/30 * * * * $ROOT/scripts/sync_home_to_myhome.sh >> $ROOT/sync-to-myhome.log 2>&1"

echo "=== 安装 home→myhome 自动同步 cron ==="
[ -f "$ROOT/.env" ] && set -a && source "$ROOT/.env" 2>/dev/null && set +a
REMOTE="${MYHOME_HOST:-myhome}"

# 测试连通（失败也继续安装，等网络恢复后自动生效）
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$REMOTE" "echo ok" 2>/dev/null | grep -q ok; then
  echo "  [提示] 当前无法连接 $REMOTE，cron 仍会安装，网络恢复后自动生效"
  echo "  确保: 1) ~/.ssh/config 已配置  2) ssh-copy-id $REMOTE 免密"
fi

# 添加到用户 crontab
(crontab -l 2>/dev/null | grep -v "sync_home_to_myhome.sh" | grep -v "^# Universal AI sync"; echo "# Universal AI sync home->myhome"; echo "$CRON_LINE") | crontab -
echo "  已安装（每 30 分钟）"
echo "  验证: crontab -l | grep sync"
echo "  卸载: crontab -e 删除对应行"
echo "完成"
