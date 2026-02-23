#!/bin/bash
# 启动 CLIProxyAPI 容器；支持 --update 拉取最新镜像并重建容器
# 用法: ./scripts/start_cliproxyapi.sh [--update]
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

UPDATE=
[[ "${1:-}" == "--update" ]] && UPDATE=1

run_cliproxyapi() {
  mkdir -p "$HOME/.cliproxyapi/logs"
  docker run -d \
    --name cliproxyapi \
    --restart unless-stopped \
    --network host \
    -v "$HOME/.cliproxyapi/config/config.yaml:/CLIProxyAPI/config.yaml" \
    -v "$HOME/.cliproxyapi/auths:/root/.cli-proxy-api" \
    -v "$HOME/.cliproxyapi/logs:/CLIProxyAPI/logs" \
    -e CONFIG_PATH=/CLIProxyAPI/config.yaml \
    -e HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:7890}" \
    -e HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:7890}" \
    eceasy/cli-proxy-api:latest
}

echo "=== 启动 CLIProxyAPI ==="
if [[ -n "$UPDATE" ]]; then
  echo "  拉取最新镜像..."
  docker pull eceasy/cli-proxy-api:latest
  docker stop cliproxyapi 2>/dev/null || true
  docker rm cliproxyapi 2>/dev/null || true
  run_cliproxyapi
  echo "  已用最新镜像启动，管理界面: http://<本机IP>:8317/management.html"
  exit 0
fi

if docker ps --format '{{.Names}}' | grep -q cliproxyapi; then
  echo "  容器已在运行"
  exit 0
fi

# 尝试 docker-compose，失败则启动已有容器或直接用 docker run
if (docker-compose -f "$ROOT/docker-compose.yml" up -d 2>/dev/null || docker compose -f "$ROOT/docker-compose.yml" up -d 2>/dev/null); then
  echo "  已通过 docker-compose 启动"
else
  for cid in $(docker ps -a --filter "ancestor=eceasy/cli-proxy-api" --format '{{.ID}}' 2>/dev/null); do
    docker start "$cid" 2>/dev/null && echo "  已启动已有容器 $cid" && exit 0
  done
  echo "  使用 docker run 启动..."
  run_cliproxyapi
  echo "  已启动，管理界面: http://<本机IP>:8317/management.html"
fi
