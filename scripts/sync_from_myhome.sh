#!/bin/bash
# 从 myhome 拉取所有配置到本机（会先备份本机当前配置）
# 使用前：确保本机 ~/.ssh/config 里配置了 Host myhome（HostName、User）
set -e
BACKUP_DIR=~/.backup_before_myhome_pull
echo "=== 从 myhome 拉取配置 ==="

# 0. 检查能否连接 myhome
if ! ssh -o ConnectTimeout=5 myhome "echo ok" 2>/dev/null | grep -q ok; then
  echo "无法连接 myhome。请检查："
  echo "  1) 本机 ~/.ssh/config 中是否有 Host myhome，且 HostName/User 正确"
  echo "  2) 本机能否 ssh myhome 登录（如未配密钥需先配置）"
  exit 1
fi

# 1. 备份本机配置
echo "[1/3] 备份本机配置到 $BACKUP_DIR ..."
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d%H%M)
[ -d ~/.openclaw ]   && cp -a ~/.openclaw   "$BACKUP_DIR/openclaw.$TS"
[ -d ~/.cliproxyapi ] && cp -a ~/.cliproxyapi "$BACKUP_DIR/cliproxyapi.$TS"
echo "  已备份"

# 2. 从 myhome 拉取 .openclaw 和 .cliproxyapi
echo "[2/3] 从 myhome 拉取 ~/.openclaw 和 ~/.cliproxyapi ..."
rsync -avz --delete myhome:~/.openclaw/   ~/.openclaw/
rsync -avz --delete myhome:~/.cliproxyapi/ ~/.cliproxyapi/
echo "  已拉取"

# 3. 提示
echo "[3/3] 完成。"
echo "  若需恢复本机原配置: cp -a $BACKUP_DIR/openclaw.$TS ~/.openclaw; cp -a $BACKUP_DIR/cliproxyapi.$TS ~/.cliproxyapi"
echo "  重启服务: docker restart cliproxyapi; openclaw gateway stop; openclaw gateway --port 18789 --verbose &"
