#!/bin/bash
# 自动备份脚本 - 按总章程要求执行

# 备份目录
BACKUP_DIR="/home/cool/.openclaw/backups"
mkdir -p $BACKUP_DIR

# 备份时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 1. 备份核心配置
cp /home/cool/.openclaw/openclaw.json $BACKUP_DIR/openclaw.json_$TIMESTAMP

# 2. 备份总章程与核心规则
cp /home/cool/.openclaw/workspace/总章程.md $BACKUP_DIR/总章程.md_$TIMESTAMP
cp /home/cool/.openclaw/workspace/IDENTITY.md $BACKUP_DIR/IDENTITY.md_$TIMESTAMP
cp /home/cool/.openclaw/workspace/SOUL.md $BACKUP_DIR/SOUL.md_$TIMESTAMP
cp /home/cool/.openclaw/workspace/USER.md $BACKUP_DIR/USER.md_$TIMESTAMP

# 3. 备份数据库
sqlite3 /home/cool/.openclaw/memory/coding.sqlite ".backup $BACKUP_DIR/coding.sqlite_$TIMESTAMP"
sqlite3 /home/cool/.openclaw/memory/moneymaker.sqlite ".backup $BACKUP_DIR/moneymaker.sqlite_$TIMESTAMP"

# 4. 备份交易日志
cp /home/cool/.openclaw/workspace/moneymaker/trading.log $BACKUP_DIR/trading.log_$TIMESTAMP

# 5. 清理7天前的旧备份
find $BACKUP_DIR -type f -mtime +7 -delete

echo "[$TIMESTAMP] 自动备份完成，备份文件存储在 $BACKUP_DIR"
