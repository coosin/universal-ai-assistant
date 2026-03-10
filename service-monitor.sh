#!/bin/bash
# 服务监控脚本 - 7×24 小时监控所有核心服务运行状态
# 每 1 分钟执行一次，异常自动重启

# 日志文件
LOG_FILE="/var/log/openclaw-service-monitor.log"
BACKUP_DIR="/home/cool/.openclaw/backups"

# 核心服务列表
SERVICES=(
    "trading-bot-v3.js"                # 交易机器人
    "performance-monitor.js"            # 性能监控
    "multithreading-execution-framework.js"  # 多线程框架
    "auto-backup.sh"                    # 自动备份
)

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# 检查服务是否运行
is_running() {
    local service=$1
    if pgrep -f "$service" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# 启动服务
start_service() {
    local service=$1
    log "🔄 正在启动服务: $service"
    
    case $service in
        "trading-bot-v3.js")
            cd /home/cool/.openclaw/workspace/moneymaker
            nohup node trading-bot-v3.js >> /var/log/trading-bot-v3.log 2>&1 &
            ;;
        "performance-monitor.js")
            cd /home/cool/.openclaw/workspace/moneymaker
            nohup node performance-monitor.js >> /var/log/performance-monitor.log 2>&1 &
            ;;
        "multithreading-execution-framework.js")
            cd /home/cool/.openclaw/workspace
            nohup node multithreading-execution-framework.js >> /var/log/multithreading-framework.log 2>&1 &
            ;;
        "auto-backup.sh")
            cd /home/cool/.openclaw/workspace/moneymaker
            nohup bash auto-backup.sh >> /var/log/auto-backup.log 2>&1 &
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        log "✅ 服务启动成功: $service, PID: $!"
        return 0
    else
        log "❌ 服务启动失败: $service"
        return 1
    fi
}

# 主逻辑
log "🔍 开始服务巡检"

for service in "${SERVICES[@]}"; do
    if is_running "$service"; then
        log "✅ 服务正常运行: $service"
    else
        log "⚠️ 服务未运行: $service，尝试自动重启"
        start_service "$service"
    fi
done

# 检查系统资源
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{print $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

log "📊 系统资源 - CPU: ${CPU_USAGE}%, 内存: ${MEMORY_USAGE}%, 磁盘: ${DISK_USAGE}%"

# 资源告警
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    log "⚠️ CPU使用率过高: ${CPU_USAGE}%"
fi
if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
    log "⚠️ 内存使用率过高: ${MEMORY_USAGE}%"
fi
if (( $DISK_USAGE > 90 )); then
    log "⚠️ 磁盘使用率过高: ${DISK_USAGE}%"
fi

log "✅ 巡检完成"
