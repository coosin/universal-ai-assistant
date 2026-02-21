#!/bin/bash
# 为 Clash (mihomo) 下载 GeoIP 数据库，解决 "can't download MMDB" 导致无法启动
# 用法: 若有代理先 export HTTPS_PROXY=http://192.168.1.2:7897 再 sudo -E bash scripts/clash_download_geodata.sh
set -e
CLASH_DIR="${CLASH_DIR:-/etc/clash}"
# 使用 jsdelivr 镜像，国内较易访问
MMDB_URL="${MMDB_URL:-https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb}"

echo "=== 下载 GeoIP 数据库到 $CLASH_DIR ==="
sudo mkdir -p "$CLASH_DIR"
if curl -sSL -f -o /tmp/Country.mmdb "$MMDB_URL"; then
  sudo mv /tmp/Country.mmdb "$CLASH_DIR/Country.mmdb"
  echo "  已保存: $CLASH_DIR/Country.mmdb"
  sudo systemctl restart clash 2>/dev/null && echo "  已重启 clash 服务" || echo "  请手动: sudo systemctl restart clash"
else
  echo "  下载失败。若在国内请先设代理再执行，例如:"
  echo "  export HTTPS_PROXY=http://192.168.1.2:7897"
  echo "  sudo -E bash scripts/clash_download_geodata.sh"
  exit 1
fi
