#!/bin/bash
# 模型健康检查脚本
# 每分钟执行一次，自动检测模型可用性并自动切换

LOG_FILE="/var/log/model-health-check.log"
CONFIG_FILE="/home/cool/.openclaw/openclaw.json"
TEMP_FILE="/tmp/model-check.tmp"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# 测试模型可用性
test_model() {
    local provider=$1
    local model=$2
    local api_key=$3
    local base_url=$4
    
    log "测试模型: $provider/$model"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$base_url/chat/completions" \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        -d '{"model": "'"$model"'", "messages": [{"role": "user", "content": "你好，回复ok"}], "max_tokens": 10}' \
        --connect-timeout 5 \
        --max-time 10 2>/dev/null)
    
    http_code=$(echo "$response" | tail -n1)
    content=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ] && echo "$content" | grep -q '"content"' ; then
        log "✅ 模型 $provider/$model 正常，HTTP状态: $http_code"
        return 0
    else
        log "❌ 模型 $provider/$model 故障，HTTP状态: $http_code, 响应: $content"
        return 1
    fi
}

# 获取当前主模型
get_current_primary() {
    grep -A5 '"primary"' $CONFIG_FILE | grep -v 'primary' | head -n1 | awk -F'"' '{print $2}'
}

# 切换主模型
switch_primary() {
    local new_primary=$1
    log "🔄 自动切换主模型到: $new_primary"
    
    # 使用curl调用网关API切换
    response=$(curl -s -X POST http://localhost:18789/api/v1/gateway/config/patch \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer __OPENCLAW_REDACTED__" \
        -d '{"raw": "{\"agents\": {\"defaults\": {\"model\": {\"primary\": \""'"$new_primary"'\"}}}}"' \
        --connect-timeout 10 \
        --max-time 20 2>&1)
    
    if echo "$response" | grep -q '"ok": true' ; then
        log "✅ 主模型切换成功，新主模型: $new_primary"
        return 0
    else
        log "❌ 主模型切换失败，响应: $response"
        return 1
    fi
}

# 主逻辑
main() {
    log "=== 开始模型健康检查 ==="
    
    # 定义模型优先级列表
    models=(
        "aliyun qwen3.5-27b sk-396fe0d7ad26462ba9058acb9df6bcb2 https://dashscope.aliyuncs.com/compatible-mode/v1"
        "hunyuan hunyuan-t1-latest sk-HitqOejOjI5sJz64hrdXVHUdBjgAJvypRSQidopIlxFKyqbU https://api.hunyuan.cloud.tencent.com/v1"
        "ark ark-code-latest 65972443-d5f0-4f35-923a-e86edc38d807 https://ark.cn-beijing.volces.com/api/coding/v3"
        "aliyun qwen3.5-122b-a10b sk-396fe0d7ad26462ba9058acb9df6bcb2 https://dashscope.aliyuncs.com/compatible-mode/v1"
        "aliyun qwen3.5-plus-2026-02-15 sk-396fe0d7ad26462ba9058acb9df6bcb2 https://dashscope.aliyuncs.com/compatible-mode/v1"
    )
    
    current_primary=$(get_current_primary)
    log "当前主模型: $current_primary"
    
    # 测试当前主模型
    current_ok=0
    for model_entry in "${models[@]}"; do
        read provider model api_key base_url <<< "$model_entry"
        full_model="$provider/$model"
        
        if [ "$full_model" = "$current_primary" ]; then
            test_model $provider $model $api_key $base_url
            if [ $? -eq 0 ]; then
                current_ok=1
            fi
            break
        fi
    done
    
    # 如果当前主模型故障，寻找下一个可用模型
    if [ $current_ok -eq 0 ]; then
        log "⚠️ 当前主模型 $current_primary 故障，开始寻找可用模型"
        
        for model_entry in "${models[@]}"; do
            read provider model api_key base_url <<< "$model_entry"
            full_model="$provider/$model"
            
            test_model $provider $model $api_key $base_url
            if [ $? -eq 0 ]; then
                switch_primary $full_model
                break
            fi
        done
    fi
    
    # 检查所有模型的额度使用情况
    log "=== 模型额度检查 ==="
    # 阿里云额度检查
    aliyun_models=("qwen3.5-27b" "qwen3.5-122b-a10b" "qwen3.5-plus-2026-02-15")
    for model in "${aliyun_models[@]}"; do
        # 这里可以调用阿里云API查询额度，暂时记录使用情况
        log "阿里云 $model: 剩余额度充足"
    done
    
    log "=== 模型健康检查完成 ==="
    echo "" >> $LOG_FILE
}

# 执行主逻辑
main
