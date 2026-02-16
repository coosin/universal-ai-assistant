#!/bin/bash
# Universal AI Assistant - 一键安装脚本 (Ubuntu/WSL2)
set -e
echo "[INFO] 检查环境..."
command -v node >/dev/null 2>&1 || { echo "请先安装 Node.js 22+"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "请先安装 Docker"; exit 1; }
echo "[INFO] 安装 OpenClaw..."
npm install -g openclaw@latest
echo "[INFO] 创建配置目录..."
mkdir -p ~/.openclaw/workspace ~/.cliproxyapi/config ~/.cliproxyapi/auths
[ -f config/openclaw.json.example ] && cp config/openclaw.json.example ~/.openclaw/openclaw.json 2>/dev/null || true
[ -f config/cliproxyapi.yaml.example ] && cp config/cliproxyapi.yaml.example ~/.cliproxyapi/config/config.yaml 2>/dev/null || true
echo "[SUCCESS] 安装完成。请配置 ~/.openclaw/openclaw.json 和 CLIProxyAPI。"
