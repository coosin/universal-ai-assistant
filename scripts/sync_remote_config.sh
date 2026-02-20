#!/bin/bash
# 同步远程配置：拉取仓库最新内容，并将 config/*.example 同步到本地配置目录（先备份）
# 用法: ./scripts/sync_remote_config.sh [--dry-run]
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
DRY_RUN=false
[ "$1" = "--dry-run" ] && DRY_RUN=true

echo "=== 同步远程配置 ==="

# 1. 拉取远程
echo "[1/3] 拉取远程仓库..."
git fetch origin 2>/dev/null || true
if git pull origin main 2>&1 | grep -q "Already up to date"; then
  echo "  已是最新"
else
  echo "  已更新"
fi

# 2. 备份并同步 CLIProxyAPI 配置
echo ""
echo "[2/3] CLIProxyAPI 配置 ~/.cliproxyapi/config/config.yaml"
CLI_SRC="$ROOT/config/cliproxyapi.yaml.example"
CLI_DST="$HOME/.cliproxyapi/config/config.yaml"
if [ ! -f "$CLI_SRC" ]; then
  echo "  跳过：示例不存在 $CLI_SRC"
elif [ "$DRY_RUN" = true ]; then
  echo "  [dry-run] 会复制: $CLI_SRC -> $CLI_DST（现有文件会备份为 .bak）"
else
  mkdir -p "$(dirname "$CLI_DST")"
  [ -f "$CLI_DST" ] && cp "$CLI_DST" "${CLI_DST}.bak.$(date +%Y%m%d%H%M)" && echo "  已备份到 ${CLI_DST}.bak.*"
  cp "$CLI_SRC" "$CLI_DST"
  echo "  已同步（如需恢复: cp ~/.cliproxyapi/config/config.yaml.bak.* ~/.cliproxyapi/config/config.yaml）"
fi

# 3. 备份并同步 OpenClaw 配置（可选，易覆盖已有 agent 等）
echo ""
echo "[3/3] OpenClaw 配置 ~/.openclaw/openclaw.json"
OC_SRC="$ROOT/config/openclaw.json.example"
OC_DST="$HOME/.openclaw/openclaw.json"
if [ ! -f "$OC_SRC" ]; then
  echo "  跳过：示例不存在 $OC_SRC"
elif [ "$DRY_RUN" = true ]; then
  echo "  [dry-run] 会复制: $OC_SRC -> $OC_DST（现有文件会备份为 .bak）"
else
  [ -f "$OC_DST" ] && cp "$OC_DST" "${OC_DST}.bak.$(date +%Y%m%d%H%M)" && echo "  已备份到 ${OC_DST}.bak.*"
  cp "$OC_SRC" "$OC_DST"
  echo "  已同步（OpenClaw 若在运行需重启；恢复: cp ~/.openclaw/openclaw.json.bak.* ~/.openclaw/openclaw.json）"
fi

echo ""
echo "Done. CLIProxyAPI 若在 Docker 中运行，需重启容器使配置生效: docker restart cliproxyapi"
