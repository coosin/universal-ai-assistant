#!/bin/bash
# Universal AI Assistant - 一键安装 (Ubuntu/WSL2)
# 使用 LF 换行，避免 Windows 编辑后出现 CRLF 报错
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/5] 检查环境..."
command -v node >/dev/null 2>&1 || { echo "请先安装 Node.js 22+"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "请先安装 Docker"; exit 1; }

echo "[2/5] 安装 OpenClaw..."
if ! npm install -g openclaw@latest 2>/dev/null; then
  echo "  无写权限，使用 sudo 安装..."
  sudo npm install -g openclaw@latest
fi

echo "[3/5] 创建配置与工作区目录..."
mkdir -p ~/.openclaw/workspace/coding ~/.openclaw/workspace/moneymaker ~/.openclaw/workspace/analytics
mkdir -p ~/.openclaw/workspace/skills
mkdir -p ~/.cliproxyapi/config ~/.cliproxyapi/auths

echo "[4/5] 部署配置与 Skills..."
[ -f config/openclaw.json.example ] && cp config/openclaw.json.example ~/.openclaw/openclaw.json 2>/dev/null || true
[ -f config/cliproxyapi.yaml.example ] && cp config/cliproxyapi.yaml.example ~/.cliproxyapi/config/config.yaml 2>/dev/null || true
if [ -d skills ]; then
  cp -r skills/* ~/.openclaw/workspace/skills/ 2>/dev/null || true
fi
[ -f templates/CLAUDE.md ] && cp templates/CLAUDE.md ~/.openclaw/workspace/coding/ 2>/dev/null || true

echo "[5/5] 启动 CLIProxyAPI (Docker)..."
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
  (docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d 2>/dev/null) || (docker-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d 2>/dev/null) || echo "请手动执行: docker compose up -d"
fi

echo ""
echo "[SUCCESS] 安装完成。"
echo "  1. 编辑 ~/.openclaw/openclaw.json 填入 API Key"
echo "  2. 访问 http://localhost:8317/management.html 配置 CLIProxyAPI"
echo "  3. 运行 start.sh 或执行: openclaw gateway --port 18789 --verbose"
