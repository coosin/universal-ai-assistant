#!/bin/bash
# 初始化 Git 并创建 develop 分支，便于后续推送与开发
set -e
cd "$(dirname "$0")"

echo "=== 1. 初始化 Git ==="
git init
git add .
echo "=== 2. 首次提交 ==="
git commit -m "Initial commit: Universal AI Assistant v1.0.0"
echo "=== 3. 创建 develop 分支 ==="
git checkout -b develop
git checkout main
echo "=== 4. 完成 ==="
echo ""
echo "下一步：添加远程并推送（请把 YOUR_USERNAME 换成你的用户名）："
echo "  git remote add origin https://github.com/YOUR_USERNAME/universal-ai-assistant.git"
echo "  git push -u origin main"
echo "  git push -u origin develop"
echo ""
echo "或运行: chmod +x push_to_remote.sh && ./push_to_remote.sh（需先执行上面的 remote add）"
