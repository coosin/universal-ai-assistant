#!/bin/bash
# 在 myhome（WSL）上运行：把本机（myhome）的配置推送到 home 服务器
# 用法：在 WSL 里执行 bash scripts/sync_myhome_to_home.sh（需在项目根目录或 scripts 目录执行）
# 前提：WSL 的 ~/.ssh/config 里配置了 Host home，指向 home 服务器的 IP
set -e
REMOTE="${1:-home}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_PROJECT="${REMOTE}:~/universal-ai-assistant"

echo "=== 将 myhome 的配置推送到 $REMOTE ==="

if ! ssh -o ConnectTimeout=5 "$REMOTE" "echo ok" 2>/dev/null | grep -q ok; then
  echo "无法连接 $REMOTE。请在 WSL 的 ~/.ssh/config 里配置 Host $REMOTE（HostName=home 的 IP，User=cool）"
  exit 1
fi

echo "[1/4] 推送 ~/.openclaw 到 $REMOTE ..."
rsync -avz --exclude='logs/*' --exclude='*.log' ~/.openclaw/ "$REMOTE:~/.openclaw/" || { echo "  警告: .openclaw 部分失败"; }
echo "[2/4] 推送 ~/.cliproxyapi 到 $REMOTE ..."
rsync -avz ~/.cliproxyapi/ "$REMOTE:~/.cliproxyapi/" || { echo "  警告: .cliproxyapi 部分失败（若 auths 权限拒绝，可在 myhome 执行 chmod 644 ~/.cliproxyapi/auths/*.json 后重试）"; }
ssh "$REMOTE" "mkdir -p ~/universal-ai-assistant"
echo "[3/4] 推送项目 .env 到 $REMOTE ..."
if [ -f "$ROOT/.env" ]; then
  rsync -avz "$ROOT/.env" "$REMOTE_PROJECT/.env" || echo "  跳过: .env 推送失败"
else
  echo "  跳过: 本地无 $ROOT/.env"
fi
echo "[4/4] 推送项目代码（scripts/web/config）..."
if [ -d "$ROOT/scripts" ]; then
  rsync -avz --exclude='venv/' --exclude='node_modules/' --exclude='__pycache__/' "$ROOT/scripts/" "$REMOTE_PROJECT/scripts/"
  [ -d "$ROOT/web" ] && rsync -avz "$ROOT/web/" "$REMOTE_PROJECT/web/"
  [ -d "$ROOT/config" ] && rsync -avz "$ROOT/config/" "$REMOTE_PROJECT/config/"
else
  echo "  跳过: 本地无 scripts 目录"
fi

echo ""
echo "完成。在 home 上可执行: cd ~/universal-ai-assistant && docker restart cliproxyapi 2>/dev/null; openclaw gateway stop; openclaw gateway --port 18789 --verbose &"