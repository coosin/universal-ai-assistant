#!/bin/bash
# Coosin 系统自动备份脚本
# 备份关键配置和工作区文件

BACKUP_DIR="/home/cool/.openclaw/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "[$(date)] 开始系统备份..."

# 备份配置文件
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
  /home/cool/.openclaw/openclaw.json \
  /home/cool/.cloudflared/config.yml \
  2>/dev/null

# 备份工作区（排除 node_modules 和大文件）
tar -czf "$BACKUP_DIR/workspace_$DATE.tar.gz" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  -C /home/cool/.openclaw workspace \
  2>/dev/null

# 清理旧备份
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] 备份完成: config_$DATE.tar.gz, workspace_$DATE.tar.gz"
