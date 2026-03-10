#!/bin/bash
# 自动归档脚本 - 每日凌晨 2 点自动执行
# 将重要文档同步备份到 memory 目录，保持版本一致性

LOG_FILE="/var/log/document-archive.log"
ARCHIVE_DIR="/home/cool/.openclaw/workspace/memory/archives"
DATE=$(date +%Y%m%d)

# 创建日志文件权限
sudo touch $LOG_FILE 2>/dev/null
sudo chown cool:cool $LOG_FILE 2>/dev/null

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "=== 开始文档自动归档 ==="

# 创建归档目录
mkdir -p "$ARCHIVE_DIR/$DATE"

# 定义需要同步的核心文档
declare -a DOCS=(
    "ORGANIZATION.md"
    "DEPARTMENT-TASKS.md"
    "TASK-TRACKER.md"
    "DOCUMENT-VERSION-MANAGER.md"
    "总章程.md"
    "config-optimization.md"
)

# 逐个同步文档
for doc in "${DOCS[@]}"; do
    src="/home/cool/.openclaw/workspace/$doc"
    dst="$ARCHIVE_DIR/$DATE/$doc"
    
    if [ -f "$src" ]; then
        cp "$src" "$dst"
        log "✅ 已归档：$doc ($(stat -c%s "$src") 字节)"
    else
        log "⚠️ 跳过：$doc (文件不存在)"
    fi
done

# 生成本日归档清单
cat > "$ARCHIVE_DIR/$DATE/README.md" << EOF
# 文档归档快照 - $DATE

## 归档时间
$(date '+%Y-%m-%d %H:%M:%S')

## 包含文档
EOF

for doc in "${DOCS[@]}"; do
    dst="$ARCHIVE_DIR/$DATE/$doc"
    if [ -f "$dst" ]; then
        echo "- ✅ $doc" >> "$ARCHIVE_DIR/$DATE/README.md"
    fi
done

echo "" >> "$ARCHIVE_DIR/$DATE/README.md"
echo "## 说明" >> "$ARCHIVE_DIR/$DATE/README.md"
echo "这是系统自动生成的每日文档快照，用于追溯历史记录和版本比对。" >> "$ARCHIVE_DIR/$DATE/README.md"

# Git 提交（如果配置了仓库）
cd /home/cool/.openclaw/workspace
if git status >/dev/null 2>&1; then
    git add memory/archives/$DATE/ 2>/dev/null
    git commit -m "Auto archive: $DATE" 2>/dev/null && \
        log "✅ Git 归档成功" || \
        log "⚠️ Git 提交失败（非致命）"
else
    log "ℹ️ Git 未配置，跳过版本控制"
fi

# 清理 30 天前的旧归档
find $ARCHIVE_DIR -type d -mtime +30 -exec rm -rf {} + 2>/dev/null
log "✅ 已清理 30 天前的旧归档"

log "=== 文档归档完成 ==="
