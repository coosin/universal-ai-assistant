#!/bin/bash
# Cloudflare DDNS 一键配置脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONF_FILE="${SCRIPT_DIR}/cloudflare_ddns.conf"
SCRIPT_FILE="${SCRIPT_DIR}/cloudflare_ddns.sh"

echo "=== Cloudflare DDNS 自动更新配置 ==="
echo ""

# 检查脚本是否存在
if [ ! -f "$SCRIPT_FILE" ]; then
    echo "错误: DDNS 脚本不存在: $SCRIPT_FILE"
    exit 1
fi

# 检查是否已有配置
if [ -f "$CONF_FILE" ]; then
    echo "检测到已有配置文件: $CONF_FILE"
    read -p "是否重新配置? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "跳过配置"
        exit 0
    fi
fi

# 创建配置文件
cp "${SCRIPT_DIR}/cloudflare_ddns.conf.example" "$CONF_FILE" 2>/dev/null || true

echo "请提供 Cloudflare API Token"
echo "获取方式："
echo "  1. 登录 https://dash.cloudflare.com/"
echo "  2. My Profile -> API Tokens -> Create Token"
echo "  3. 选择 'Edit zone DNS' 模板"
echo "  4. Zone Resources: Include -> Specific zone -> qlsm.net"
echo "  5. 复制生成的 Token"
echo ""
read -p "请输入 API Token: " -s api_token
echo ""

if [ -z "$api_token" ]; then
    echo "错误: API Token 不能为空"
    exit 1
fi

# 写入配置
cat > "$CONF_FILE" << EOF
# Cloudflare DDNS 配置文件
# 生成时间: $(date)

export CF_API_TOKEN="${api_token}"
EOF

chmod 600 "$CONF_FILE"
echo "配置已保存到: $CONF_FILE"

# 测试配置
echo ""
echo "测试配置..."
source "$CONF_FILE"
if "$SCRIPT_FILE"; then
    echo "✓ 配置测试成功"
else
    echo "✗ 配置测试失败，请检查 API Token 是否正确"
    exit 1
fi

# 设置 cron（如果尚未设置）
if ! crontab -l 2>/dev/null | grep -q "$SCRIPT_FILE"; then
    echo ""
    echo "设置自动更新（每 10 分钟检查一次）..."
    (crontab -l 2>/dev/null | grep -v "$SCRIPT_FILE"; \
     echo "*/10 * * * * source $CONF_FILE 2>/dev/null && $SCRIPT_FILE >> ${HOME}/.openclaw/ddns.log 2>&1") | crontab -
    echo "✓ Cron 任务已设置"
else
    echo "Cron 任务已存在，跳过"
fi

echo ""
echo "=== 配置完成 ==="
echo "配置文件: $CONF_FILE"
echo "日志文件: ${HOME}/.openclaw/ddns.log"
echo "查看日志: tail -f ${HOME}/.openclaw/ddns.log"
echo "手动更新: source $CONF_FILE && $SCRIPT_FILE"
