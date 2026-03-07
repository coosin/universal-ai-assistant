#!/bin/bash
# Coosin 系统看门狗 - 保证24小时在线
# 功能：监控网关状态、交易机器人运行状态，异常自动恢复

# 配置
WORKDIR="/home/cool/.openclaw/workspace/moneymaker"
LOG_FILE="$WORKDIR/watchdog.log"
TRADING_BOT_PID_FILE="$WORKDIR/trading-bot.pid"
PROXY_URL="http://127.0.0.1:7890"
OKX_API_URL="https://www.okx.com/api/v5/public/time"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 检查代理是否正常
check_proxy() {
    log "🔍 检查代理连接..."
    # 先检查代理端口是否存活
    if nc -z 127.0.0.1 7890; then
        log "✅ 代理端口存活"
        # 再测试API连接，允许SSL错误（代码层面已经处理）
        if curl -x "$PROXY_URL" --connect-timeout 10 -k -s "$OKX_API_URL" > /dev/null; then
            log "✅ OKX API 连接正常"
            return 0
        else
            log "⚠️ OKX API 连接异常，但代理端口正常，继续运行"
            return 0 # 代理正常，API波动不影响运行
        fi
    else
        log "❌ 代理端口不通，需要检查代理服务"
        return 1
    fi
}

# 检查交易机器人是否运行
check_trading_bot() {
    log "🔍 检查交易机器人状态..."
    
    # 检查进程是否存在
    local pids=$(pgrep -f "node trading-bot.js" | grep -v grep)
    if [ -n "$pids" ]; then
        # 取第一个PID
        local pid=$(echo "$pids" | head -n1)
        echo "$pid" > "$TRADING_BOT_PID_FILE"
        log "✅ 交易机器人运行中，PID: $pid"
        return 0
    else
        log "❌ 交易机器人未运行"
        return 1
    fi
}

# 启动交易机器人
start_trading_bot() {
    log "🚀 正在启动交易机器人..."
    cd "$WORKDIR" || exit 1
    
    # 杀死可能存在的旧进程
    pkill -f "node trading-bot.js" 2>/dev/null
    sleep 2
    
    # 后台启动 - 使用 setsid 完全脱离终端
    setsid node trading-bot.js >> trading-bot.log 2>&1 < /dev/null &
    local pid=$!
    
    # 等待3秒确认进程启动
    sleep 3
    
    if pgrep -f "node trading-bot.js" > /dev/null; then
        local actual_pid=$(pgrep -f "node trading-bot.js" | head -n1)
        echo "$actual_pid" > "$TRADING_BOT_PID_FILE"
        log "✅ 交易机器人启动成功，PID: $actual_pid"
        return 0
    else
        log "❌ 交易机器人启动失败，返回码: $?"
        return 1
    fi
}

# 检查系统负载
check_system_health() {
    log "🔍 检查系统健康状态..."
    
    # 检查磁盘空间
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log "⚠️ 磁盘空间不足: ${disk_usage}%"
    fi
    
    # 检查内存使用
    local mem_usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
    if [ "$mem_usage" -gt 90 ]; then
        log "⚠️ 内存使用率过高: ${mem_usage}%"
    fi
    
    log "✅ 系统健康状态正常"
}

# 主循环
main() {
    log "🐶 Coosin 看门狗启动"
    
    while true; do
        log "===== 开始新一轮检查 ====="
        
        # 检查系统健康
        check_system_health
        
        # 检查代理
        if ! check_proxy; then
            log "⚠️ 代理异常，等待1分钟后重试..."
            sleep 60
            continue
        fi
        
        # 检查交易机器人
        if ! check_trading_bot; then
            log "⚠️ 交易机器人异常，尝试重启..."
            start_trading_bot
        fi
        
        log "===== 检查完成，休眠1分钟 ====="
        sleep 60
    done
}

# 运行主程序
main
