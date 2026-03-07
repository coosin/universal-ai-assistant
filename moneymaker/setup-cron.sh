#!/bin/bash
# Coosin 定时任务设置脚本

BACKUP_SCRIPT="/home/cool/.openclaw/workspace/moneymaker/backup-system.sh"
MONITOR_SCRIPT="/home/cool/.openclaw/workspace/moneymaker/monitor-gateway.sh"

# 添加定时任务
(crontab -l 2>/dev/null; echo "0 * * * * $BACKUP_SCRIPT") | crontab -
(crontab -l 2>/dev/null; echo "* * * * * $MONITOR_SCRIPT") | crontab -

echo "✅ 定时任务已设置:"
echo "   - 每小时执行系统备份"
echo "   - 每分钟检查网关状态"
echo ""
echo "当前定时任务:"
crontab -l
