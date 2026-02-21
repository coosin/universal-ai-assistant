#!/bin/bash
# 在 myhome（WSL）上运行：从 home 拉取配置到本机（含记忆库 workspace/memory、sessions 等）
# 用法：bash scripts/sync_pull_from_home.sh
# 前提：~/.ssh/config 里配置了 Host home
set -e
REMOTE="${1:-home}"
echo "=== 从 $REMOTE 拉取配置到 myhome（含记忆库）==="

if ! ssh -o ConnectTimeout=5 "$REMOTE" "echo ok" 2>/dev/null | grep -q ok; then
  echo "无法连接 $REMOTE。请检查 ~/.ssh/config 中 Host $REMOTE 的配置"
  exit 1
fi

echo "[1/2] 拉取 ~/.openclaw（含 workspace、workspace-*/memory、agents/sessions）..."
rsync -avz --exclude='logs/*' --exclude='*.log' "$REMOTE:~/.openclaw/" ~/.openclaw/
echo "[2/2] 拉取 ~/.cliproxyapi ..."
rsync -avz "$REMOTE:~/.cliproxyapi/" ~/.cliproxyapi/

echo ""
echo "完成。记忆库位于 ~/.openclaw/workspace/memory/ 和 ~/.openclaw/agents/*/sessions/"
