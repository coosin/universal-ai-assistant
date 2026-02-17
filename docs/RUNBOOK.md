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

1. 浏览器打开: http://localhost:8081/management.html
2. 添加 Claude Code（或其它 OAuth）账号，完成认证
3. 在配置中复制 API Key

## 4. 配置 OpenClaw

编辑 `~/.openclaw/openclaw.json`：

- 将 `YOUR_CLIPROXYAPI_KEY` 替换为上一步的 API Key
- 可选：配置 `channels.telegram` 等

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

## 6. 首次对话

```bash
openclaw agent --message "你好，请介绍一下你能做什么"
# 指定 agent
openclaw agent --message "请帮我想办法挣点零花钱" --agent moneymaker
```

## 校验与健康检查

```bash
# 配置是否正确
./scripts/validate_config.sh

# 环境与端口
./scripts/health_check.sh
```

## 常见问题

- **端口被占用**：修改 openclaw.json 中 gateway.port 或 docker-compose 端口映射
- **认证失败**：确认 CLIProxyAPI 管理面板中已添加账号并拿到 API Key
- **脚本报 \r 错误**：在 WSL 中执行 `sed -i 's/\r$//' *.sh`
