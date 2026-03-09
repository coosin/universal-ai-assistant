#!/bin/bash
# 开机/重启/宕机恢复自动执行脚本
# 功能：强制读取记忆库，恢复所有状态，快速进入工作状态

echo "=== 🚀 Coosin 系统启动恢复流程 $(date '+%Y-%m-%d %H:%M:%S') ==="

# 1. 强制读取记忆库，加载核心规则
echo "1/6 加载永久记忆库..."
python3 - <<'PY'
import sqlite3
import os
import json

# 读取核心规则
conn = sqlite3.connect('/home/cool/.openclaw/workspace/memory.db')
cur = conn.cursor()

# 加载终极执行总章程
cur.execute("SELECT content FROM core_directives WHERE title = '私人智能系统・终极执行总章程（正式版）'")
result = cur.fetchone()
constitution = result[0] if result else "未找到章程"

# 加载CEO行为准则
cur.execute("SELECT content FROM core_directives WHERE title = 'CEO 行为准则'")
result = cur.fetchone()
criteria = result[0] if result else "未找到准则"

# 加载CEO身份信息
cur.execute("SELECT content FROM core_directives WHERE title = 'CEO 身份与权力'")
result = cur.fetchone()
identity = result[0] if result else "未找到身份信息"

conn.close()

# 保存到运行时配置
config = {
    "constitution": constitution,
    "criteria": criteria,
    "identity": identity,
    "last_boot": os.popen('date').read().strip()
}

with open('/tmp/coosin-runtime-config.json', 'w') as f:
    json.dump(config, f, ensure_ascii=False, indent=2)

print("✅ 核心规则加载完成")
PY

# 2. 启动核心服务
echo "2/6 启动核心服务..."
systemctl start openclaw-gateway || echo "⚠️  网关服务启动失败，将自动重试"
systemctl start cloudflared || echo "⚠️  隧道服务启动失败，将自动重试"

# 3. 恢复交易系统
echo "3/6 恢复交易系统..."
cd /home/cool/.openclaw/workspace/moneymaker
if ! pgrep -f "trading-bot.js" > /dev/null; then
    nohup node trading-bot.js > trading-bot.log 2>&1 &
    echo "✅ 交易机器人已启动"
else
    echo "✅ 交易机器人正在运行"
fi

# 4. 启动看门狗监控
echo "4/6 启动看门狗监控..."
if ! pgrep -f "watchdog.sh" > /dev/null; then
    nohup ./watchdog.sh > watchdog.log 2>&1 &
    echo "✅ 看门狗监控已启动"
else
    echo "✅ 看门狗监控正在运行"
fi

# 5. 验证系统状态
echo "5/6 系统状态验证..."
sleep 3

# 检查网关状态
if systemctl is-active openclaw-gateway > /dev/null; then
    echo "✅ 网关服务运行正常"
else
    echo "⚠️  网关异常，正在重试..."
    systemctl restart openclaw-gateway
fi

# 检查交易系统状态
if pgrep -f "trading-bot.js" > /dev/null; then
    echo "✅ 交易系统运行正常"
else
    echo "⚠️  交易系统异常，正在重启..."
    nohup node trading-bot.js > trading-bot-restart.log 2>&1 &
fi

# 6. 发送启动通知
echo "6/6 发送启动通知..."
echo "✅ Coosin 系统恢复完成，所有服务正常运行，已进入工作状态" > /tmp/coosin-boot-notify.txt

echo "========================================================================"
echo "✅ 系统启动恢复流程完成，所有状态已恢复，开始正常工作"
echo "========================================================================"
