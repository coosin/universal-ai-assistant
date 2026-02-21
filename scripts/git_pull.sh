#!/bin/bash
# 拉取远程仓库最新代码
# 用法: ./scripts/git_pull.sh
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
git fetch origin 2>/dev/null || true
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || git pull 2>/dev/null || true
echo "完成"
