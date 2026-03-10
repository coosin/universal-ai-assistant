#!/bin/bash
# 异常自愈脚本 - 按总章程要求执行

# 1. 检查网关状态
if ! systemctl is-active openclaw-gateway.service > /dev/null 2>&1; then
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 网关异常，正在重启..."
    systemctl restart openclaw-gateway.service
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 网关已重启"
fi

# 2. 检查交易机器人状态
if ! pgrep -f "trading-bot.js" > /dev/null 2>&1; then
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 交易机器人异常，正在重启..."
    cd /home/cool/.openclaw/workspace/moneymaker
    nohup node trading-bot.js >> trading.log 2>&1 &
    echo $! > trading-bot.pid
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 交易机器人已重启，PID: $(cat trading-bot.pid)"
fi

# 3. 检查看门狗状态
if ! pgrep -f "watchdog.sh" > /dev/null 2>&1; then
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 看门狗异常，正在重启..."
    cd /home/cool/.openclaw/workspace/moneymaker
    nohup ./watchdog.sh >> watchdog.log 2>&1 &
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 看门狗已重启"
fi

# 4. 检查磁盘空间
DISK_USAGE=$(df /home | grep -v Filesystem | awk '{print $5}' | sed 's/%//g')
if [ $DISK_USAGE -gt 90 ]; then
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 磁盘空间不足，正在清理旧日志..."
    find /home/cool/.openclaw/workspace/moneymaker -name "*.log" -mtime +3 -delete
    find /home/cool/.openclaw/backups -name "*" -mtime +7 -delete
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 磁盘清理完成，当前使用率: $(df /home | grep -v Filesystem | awk '{print $5}')"
fi

# 5. 检查内存使用
MEMORY_USAGE=$(free | grep Mem | awk '{print $3/$2 * 100.0}' | cut -d. -f1)
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 内存不足，正在清理缓存..."
    sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
    echo "[$(date +%Y-%m-%d_%H:%M:%S)] 内存清理完成，当前使用率: ${MEMORY_USAGE}%"
fi
