#!/bin/bash
# Cloudflare DDNS 自动更新脚本
# 自动将 home.qlsm.net 的 A 记录更新为当前公网 IP

set -e

# ===== 配置区域 =====
# 方式 1：使用 API Token（推荐，更安全）
CF_API_TOKEN="${CF_API_TOKEN:-你的Cloudflare_API_Token}"

# 方式 2：使用 Global API Key + Email（备选）
# CF_EMAIL="${CF_EMAIL:-your-email@example.com}"
# CF_API_KEY="${CF_API_KEY:-your-global-api-key}"

# 域名配置
ZONE_NAME="qlsm.net"
RECORD_NAME="home.qlsm.net"
TTL=600  # TTL 秒数（自动更新建议 600）

# 日志文件
LOG_FILE="${HOME}/.openclaw/ddns.log"
mkdir -p "$(dirname "$LOG_FILE")"

# ===== 函数 =====
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

get_current_ip() {
    local ip=$(curl -s --max-time 10 http://checkip.amazonaws.com || \
               curl -s --max-time 10 http://ifconfig.me || \
               curl -s --max-time 10 http://icanhazip.com || echo "")
    if [ -z "$ip" ]; then
        log "错误: 无法获取公网 IP"
        return 1
    fi
    echo "$ip"
}

get_zone_id() {
    local zone_name="$1"
    if [ -n "$CF_API_TOKEN" ] && [ "$CF_API_TOKEN" != "你的Cloudflare_API_Token" ]; then
        curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${zone_name}" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json" | \
            grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
    elif [ -n "$CF_EMAIL" ] && [ -n "$CF_API_KEY" ]; then
        curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${zone_name}" \
            -H "X-Auth-Email: ${CF_EMAIL}" \
            -H "X-Auth-Key: ${CF_API_KEY}" \
            -H "Content-Type: application/json" | \
            grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
    else
        log "错误: 未配置 Cloudflare API 凭证"
        return 1
    fi
}

get_record_id() {
    local zone_id="$1"
    local record_name="$2"
    if [ -n "$CF_API_TOKEN" ] && [ "$CF_API_TOKEN" != "你的Cloudflare_API_Token" ]; then
        curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?name=${record_name}&type=A" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json" | \
            grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
    elif [ -n "$CF_EMAIL" ] && [ -n "$CF_API_KEY" ]; then
        curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?name=${record_name}&type=A" \
            -H "X-Auth-Email: ${CF_EMAIL}" \
            -H "X-Auth-Key: ${CF_API_KEY}" \
            -H "Content-Type: application/json" | \
            grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
    fi
}

get_current_record_ip() {
    local zone_id="$1"
    local record_id="$2"
    if [ -n "$CF_API_TOKEN" ] && [ "$CF_API_TOKEN" != "你的Cloudflare_API_Token" ]; then
        curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json" | \
            grep -o '"content":"[^"]*"' | cut -d'"' -f4
    elif [ -n "$CF_EMAIL" ] && [ -n "$CF_API_KEY" ]; then
        curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}" \
            -H "X-Auth-Email: ${CF_EMAIL}" \
            -H "X-Auth-Key: ${CF_API_KEY}" \
            -H "Content-Type: application/json" | \
            grep -o '"content":"[^"]*"' | cut -d'"' -f4
    fi
}

update_record() {
    local zone_id="$1"
    local record_id="$2"
    local new_ip="$3"
    local record_name="$4"
    
    if [ -n "$CF_API_TOKEN" ] && [ "$CF_API_TOKEN" != "你的Cloudflare_API_Token" ]; then
        response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"A\",\"name\":\"${record_name}\",\"content\":\"${new_ip}\",\"ttl\":${TTL}}")
    elif [ -n "$CF_EMAIL" ] && [ -n "$CF_API_KEY" ]; then
        response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}" \
            -H "X-Auth-Email: ${CF_EMAIL}" \
            -H "X-Auth-Key: ${CF_API_KEY}" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"A\",\"name\":\"${record_name}\",\"content\":\"${new_ip}\",\"ttl\":${TTL}}")
    fi
    
    if echo "$response" | grep -q '"success":true'; then
        return 0
    else
        log "更新失败: $response"
        return 1
    fi
}

# ===== 主流程 =====
main() {
    log "开始 DDNS 更新检查..."
    
    # 检查 API 凭证
    if [ "$CF_API_TOKEN" = "你的Cloudflare_API_Token" ] && [ -z "$CF_EMAIL" ]; then
        log "错误: 请先配置 Cloudflare API 凭证"
        log "编辑此脚本，设置 CF_API_TOKEN 或 CF_EMAIL + CF_API_KEY"
        exit 1
    fi
    
    # 获取当前公网 IP
    current_ip=$(get_current_ip)
    if [ -z "$current_ip" ]; then
        exit 1
    fi
    log "当前公网 IP: $current_ip"
    
    # 获取 Zone ID
    zone_id=$(get_zone_id "$ZONE_NAME")
    if [ -z "$zone_id" ]; then
        log "错误: 无法获取 Zone ID，请检查域名和 API 凭证"
        exit 1
    fi
    log "Zone ID: $zone_id"
    
    # 获取 Record ID（如果不存在则创建）
    record_id=$(get_record_id "$zone_id" "$RECORD_NAME")
    if [ -z "$record_id" ]; then
        log "警告: 记录不存在，尝试创建..."
        # 创建记录的逻辑可以后续添加
        log "请先在 Cloudflare 控制台手动创建 A 记录: $RECORD_NAME"
        exit 1
    fi
    log "Record ID: $record_id"
    
    # 获取当前 DNS 记录中的 IP
    dns_ip=$(get_current_record_ip "$zone_id" "$record_id")
    log "DNS 记录中的 IP: ${dns_ip:-未设置}"
    
    # 比较 IP，如果不同则更新
    if [ "$current_ip" = "$dns_ip" ]; then
        log "IP 未变化，无需更新"
        exit 0
    fi
    
    log "IP 已变化，开始更新..."
    if update_record "$zone_id" "$record_id" "$current_ip" "$RECORD_NAME"; then
        log "更新成功: $RECORD_NAME -> $current_ip"
    else
        log "更新失败"
        exit 1
    fi
}

main "$@"
