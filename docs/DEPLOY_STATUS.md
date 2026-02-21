# 部署状态与收尾

## 当前已就绪

| 组件 | 状态 | 端口 | 说明 |
|------|------|------|------|
| OpenClaw Gateway | ✅ 运行中 | 18789 | 本机 18789，外网访问用 18790（端口转发） |
| Web 管理界面 | ✅ 运行中 | 8888 | 本机 8888，外网访问用 9080 |
| 端口转发 | ✅ 已配置 | 9080/18790 | `sudo bash scripts/port_forward.sh status` |
| 防火墙 | ✅ 已放行 | 9080,18790,8317,8888 | UFW |

## 未完成（需网络/代理）

- **CLIProxyAPI**：Docker 镜像拉取超时（Docker Hub 连接问题）。  
  **通过本机代理拉取**（本机代理例如 192.168.1.2）：
  ```bash
  cd /home/cool/universal-ai-assistant
  sudo bash scripts/docker_proxy_pull.sh 7890   # 默认 7890，可改为你的代理端口
  ```
  脚本会：配置 Docker 使用该代理 → 拉取镜像 → 启动容器。  
  网络恢复或不用代理时，也可直接：
  ```bash
  docker-compose -f docker-compose.yml pull
  docker-compose -f docker-compose.yml up -d
  ```
  配置 Docker 镜像加速（可选）：见 `scripts/docker_mirror_setup.sh`。

- **Telegram / 出网代理**：若需长期可靠，可在 home 本机部署 **Clash**，Gateway 使用 `127.0.0.1:7890`。详见 **`docs/CLASH_SETUP.md`**。

## 一键启动（日常使用）

```bash
cd /home/cool/universal-ai-assistant
./scripts/start_all_services.sh           # Gateway 前台
./scripts/start_all_services.sh --background  # 全部后台
```

## 校验

```bash
./scripts/health_check.sh
./scripts/doctor.sh
```

## 访问地址（从本机或局域网）

- Web 管理: http://\<本机IP\>:9080 或 :8888  
- OpenClaw: http://\<本机IP\>:18790  
- CLIProxyAPI 管理（容器启动后）: http://\<本机IP\>:8317
