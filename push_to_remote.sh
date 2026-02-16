#!/bin/bash
# 推送到远程仓库
set -e
if git remote | grep -q "^origin$"; then
  echo "已配置 origin，正在推送..."
  git branch -M main 2>/dev/null || true
  git push -u origin main
  git push -u origin develop 2>/dev/null || true
  echo "推送完成。"
else
  echo "未配置远程仓库。请先执行："
  echo "  git remote add origin https://github.com/YOUR_USERNAME/universal-ai-assistant.git"
  echo "  ./push_to_remote.sh"
  exit 1
fi
