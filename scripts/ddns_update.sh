#!/bin/bash
# DDNS 更新脚本 - 将 home.qlsm.net 更新到当前公网 IP
# 用法：需要根据你的域名服务商（阿里云/Cloudflare/其他）配置 API

set -e

DOMAIN="home.qlsm.net"
CURRENT_IP=$(curl -s http://checkip.amazonaws.com || curl -s ifconfig.me || echo "")

if [ -z "$CURRENT_IP" ]; then
    echo "无法获取公网 IP"
    exit 1
fi

echo "当前公网 IP: $CURRENT_IP"
echo "域名: $DOMAIN"

# TODO: 根据你的域名服务商配置 API 更新
# 示例：阿里云 DNS API
# ACCESS_KEY_ID="你的AccessKey"
# ACCESS_KEY_SECRET="你的Secret"
# 
# 或 Cloudflare API
# CF_API_TOKEN="你的Token"
# CF_ZONE_ID="你的Zone ID"

echo ""
echo "请手动在域名服务商处配置："
echo "  记录类型: A"
echo "  主机记录: home (或 @)"
echo "  记录值: $CURRENT_IP"
echo "  TTL: 600"
echo ""
echo "配置后等待 DNS 生效（通常几分钟），然后执行："
echo "  sudo certbot --nginx -d home.qlsm.net"
