#!/bin/bash
# 全自动：初始化 Git、首次提交、创建 develop 分支
# 请勿用 Windows 编辑器保存为 CRLF，否则 WSL 会报错
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/4] 初始化 Git 仓库..."
git init 2>/dev/null || true
# 若未配置过全局 identity，用本仓库身份避免 commit 报错
git config user.email 2>/dev/null | grep -q . || git config user.email "openclaw@local.dev"
git config user.name  2>/dev/null | grep -q . || git config user.name "Universal AI Assistant"
git add .
echo "[2/4] 首次提交..."
if git diff --cached --quiet 2>/dev/null; then
  git commit --allow-empty -m "Initial commit: Universal AI Assistant v1.0.0" || true
else
  git commit -m "Initial commit: Universal AI Assistant v1.0.0" || true
fi
echo "[3/4] 创建 develop 分支..."
git branch -M main 2>/dev/null || true
git branch develop 2>/dev/null || true
echo "[4/4] 完成."
echo ""
echo "本地 Git 已就绪。推送步骤（需先创建远程仓库）："
echo "  git remote add origin https://github.com/YOUR_USERNAME/universal-ai-assistant.git"
echo "  git push -u origin main && git push -u origin develop"
