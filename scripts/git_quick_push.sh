#!/bin/bash
# 快速提交并推送到当前分支
# 用法: ./scripts/git_quick_push.sh [提交信息]
# 示例: ./scripts/git_quick_push.sh "更新配置文件"

set -e

# 获取脚本所在目录并切换到仓库根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# 检查是否在 git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    exit 1
fi

# 检查是否有远程仓库
if ! git remote | grep -q "^origin$"; then
    echo "❌ 错误: 未配置远程仓库 origin"
    echo "请先执行: git remote add origin <你的仓库地址>"
    exit 1
fi

# 获取当前分支名
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 当前分支: $CURRENT_BRANCH"

# 检查是否有改动
if git diff --quiet && git diff --cached --quiet; then
    echo "ℹ️  没有需要提交的改动"
    exit 0
fi

# 添加所有改动
echo "📦 添加所有改动..."
git add .

# 获取提交信息
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    # 如果没有提供提交信息，使用默认格式
    COMMIT_MSG="auto: $(date '+%Y-%m-%d %H:%M:%S') 更新"
fi

# 提交
echo "💾 提交改动: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# 推送
echo "🚀 推送到远程分支 origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

echo "✅ 完成！已推送到 origin/$CURRENT_BRANCH"
