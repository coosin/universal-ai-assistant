# 运行手册 (RUNBOOK)

从零到首次与 AI 对话的完整步骤。

## 1. 环境要求

- WSL2 (Ubuntu 22.04) 或 Linux
- Node.js 22+
- Docker 与 Docker Compose

## 2. 安装

```bash
cd /home/cool/universal-ai-assistant
sed -i 's/\r$//' install.sh start.sh 2>/dev/null
chmod +x install.sh start.sh
./install.sh
```

## 3. 配置 CLIProxyAPI

1. 浏览器打开: http://localhost:8317/management.html
2. 添加 Claude Code（或其它 OAuth）账号，完成认证
3. 在配置中复制 API Key

## 4. 配置 OpenClaw

方式一（推荐）：运行配置向导

```bash
python3 scripts/config_wizard.py
# 按提示输入 CLIProxyAPI API Key、可选 Telegram 等
```

方式二：手动编辑 `~/.openclaw/openclaw.json`，将 `YOUR_CLIPROXYAPI_KEY` 替换为上一步的 API Key，可选配置 `channels.telegram` 等

## 5. 启动服务

```bash
cd /home/cool/universal-ai-assistant
./start.sh
```

或分别启动：

```bash
docker compose up -d
openclaw gateway --port 18789 --verbose
```

## 5.1 Web 管理界面（可选）

```bash
cd /home/cool/universal-ai-assistant
pip install -r web/requirements.txt
python3 web/app.py
# 或: ./scripts/start_web.sh
```
浏览器打开 http://127.0.0.1:8888 可查看状态、运行配置校验与健康检查。

## 6. 首次对话

```bash
openclaw agent --message "你好，请介绍一下你能做什么"
# 指定 agent
openclaw agent --message "请帮我想办法挣点零花钱" --agent moneymaker
```

## 校验与健康检查

```bash
# 一键诊断（配置 + 环境）
./scripts/doctor.sh

# 或分别执行
./scripts/validate_config.sh
./scripts/health_check.sh
```

## 常见问题

- **端口被占用**：修改 openclaw.json 中 gateway.port 或 docker-compose 端口映射
- **认证失败**：确认 CLIProxyAPI 管理面板中已添加账号并拿到 API Key
- **脚本报 \r 错误**：在 WSL 中执行 `sed -i 's/\r$//' *.sh`
