#!/bin/bash
# 在 home 上运行：把 home 的 ~/.openclaw 和 ~/.cliproxyapi 自动推送到 myhome
# 用法：bash scripts/sync_home_to_myhome.sh
# 前提：home 的 ~/.ssh/config 配置 Host myhome，且可免密 SSH
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
[ -f "$ROOT/.env" ] && set -a && source "$ROOT/.env" 2>/dev/null && set +a
REMOTE="${MYHOME_HOST:-myhome}"

if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE" "echo ok" 2>/dev/null | grep -q ok; then
  echo "$(date '+%Y-%m-%d %H:%M'): 无法连接 $REMOTE，跳过同步"
  exit 0
fi

rsync -az --exclude='logs/*' --exclude='*.log' ~/.openclaw/ "$REMOTE:~/.openclaw/"
rsync -az ~/.cliproxyapi/ "$REMOTE:~/.cliproxyapi/"
echo "$(date '+%Y-%m-%d %H:%M'): 已同步到 $REMOTE"
