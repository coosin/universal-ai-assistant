#!/bin/bash
# 配置 Docker 镜像加速（拉取超时时可尝试）
# 需 sudo 执行
set -e
CONF="/etc/docker/daemon.json"
BACKUP="/etc/docker/daemon.json.bak.$(date +%Y%m%d)"
if [ ! -f "$CONF" ] || [ "$(cat "$CONF" 2>/dev/null)" = "{}" ] || [ "$(cat "$CONF" 2>/dev/null)" = "" ]; then
  [ -f "$CONF" ] && sudo cp "$CONF" "$BACKUP" 2>/dev/null || true
  echo '{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}' | sudo tee "$CONF" > /dev/null
  echo "已写入 $CONF，重启 Docker 后生效: sudo systemctl restart docker"
else
  echo "当前 $CONF 已有内容，请手动添加 registry-mirrors，例如："
  echo '  "registry-mirrors": ["https://docker.1ms.run"]'
fi
