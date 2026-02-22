#!/bin/bash
# Cloudflare 关闭代理脚本（将 DNS 记录改为 DNS only，灰色云）

set -e

# 加载配置
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONF_FILE="${SCRIPT_DIR}/cloudflare_ddns.conf"

if [ -f "$CONF_FILE" ]; then
    source "$CONF_FILE"
fi

ZONE_NAME="qlsm.net"
RECORD_NAME="home.qlsm.net"
ZONE_ID="aec3fa11ba66c9abc5a429bad2ce2ddf"  # 从日志中获取
RECORD_ID="03b67bc3ee8d624f6ffc09a71247fd77"  # 从日志中获取

if [ -z "$CF_API_TOKEN" ] || [ "$CF_API_TOKEN" = "你的Cloudflare_API_Token" ]; then
    echo "错误: 请先配置 CF_API_TOKEN"
    exit 1
fi

# 获取当前记录信息
current_record=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json")

current_ip=$(echo "$current_record" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
proxied=$(echo "$current_record" | grep -o '"proxied":[^,}]*' | cut -d':' -f2 | tr -d ' ')

echo "当前记录 IP: $current_ip"
echo "当前代理状态: $proxied"

if [ "$proxied" = "true" ]; then
    echo "关闭代理（改为 DNS only）..."
    response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data "{\"type\":\"A\",\"name\":\"${RECORD_NAME}\",\"content\":\"${current_ip}\",\"ttl\":600,\"proxied\":false}")
    
    if echo "$response" | grep -q '"success":true'; then
        echo "✓ 代理已关闭，DNS 记录改为 DNS only（灰色云）"
        echo "等待几分钟让 DNS 生效，然后访问: https://home.qlsm.net"
    else
        echo "✗ 关闭代理失败: $response"
        exit 1
    fi
else
    echo "代理已关闭，无需操作"
fi
