#!/bin/bash
# Coosin 网关监控脚本
# 监控网关进程，掉线自动重启

LOG_FILE="/home/cool/.openclaw/logs/gateway-monitor.log"
GATEWAY_PORT=18789
OPENCLAW_DIR="/home/cool/openclaw-stable"

mkdir -p "$(dirname $LOG_FILE)"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 检查网关进程
check_process() {
    if pgrep -f "openclaw-gateway" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# 检查端口响应
check_port() {
    if nc -z 127.0.0.1 $GATEWAY_PORT 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# 重启网关
restart_gateway() {
    log "检测到网关异常，正在重启..."
    
    # 杀掉旧进程
    pkill -f "openclaw-gateway" 2>/dev/null
    sleep 3
    
    # 启动新网关
    cd "$OPENCLAW_DIR"
    if [ -f "start-gateway.js" ]; then
        node start-gateway.js &
        log "网关已重启"
    else
        log "错误：找不到 start-gateway.js"
    fi
}

# 主检查逻辑
if ! check_process || ! check_port; then
    restart_gateway
else
    log "网关运行正常"
fi
