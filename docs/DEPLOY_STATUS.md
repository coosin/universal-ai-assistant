# 部署状态与收尾

## 当前已就绪

| 组件 | 状态 | 端口 | 说明 |
|------|------|------|------|
| OpenClaw Gateway | ✅ 运行中 | 18789 | 本机 18789，外网访问用 18790（端口转发） |
| Web 管理界面 | ✅ 运行中 | 8888 | 本机 8888，外网访问用 9080 |
| 端口转发 | ✅ 已配置 | 9080/18790/8318 | `sudo bash scripts/port_forward.sh status` |
| 防火墙 | ✅ 已放行 | 9080,18790,8318,8888 | UFW |

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

## 双机同步（myhome ↔ home）

- **myhome**：你本机 WSL2（Ubuntu），从 Windows `ssh myhome` 进入。
- **home**：局域网服务器（当前部署的这台）。home 无法直连 WSL，所以同步要在 **myhome（WSL）上** 做推送。

**把 myhome 的配置推到 home（在 WSL 里执行）：**

1. 在 WSL 的 `~/.ssh/config` 里加一段，例如：
   ```
   Host home
       HostName 192.168.1.100
       User cool
   ```
   （HostName 改成 home 的实际 IP，和本机 `ip addr` 里一致。）

2. 在 WSL 里进入项目目录，执行：
   ```bash
   bash scripts/sync_myhome_to_home.sh
   ```

3. **同步范围**（完整）：
   | 内容 | 说明 |
   |------|------|
   | `~/.openclaw/` | openclaw.json、**workspace/memory**（记忆库）、workspace-*、agents/sessions、devices 等（排除 logs） |
   | `~/.cliproxyapi/` | config.yaml、auths 等 |
   | `~/universal-ai-assistant/.env` | API Key 等环境变量 |
   | `~/universal-ai-assistant/scripts/` | 脚本 |
   | `~/universal-ai-assistant/web/` | Web 管理界面 |
   | `~/universal-ai-assistant/config/` | 配置示例 |

4. **反向同步（home → myhome）**：若主要在 home 上使用控制界面，记忆会写在 home 上。在 myhome 执行以下命令可拉取 home 的记忆库：
   ```bash
   bash scripts/sync_pull_from_home.sh
   ```

5. **若 auths 同步失败**（Permission denied）：在 myhome 执行 `chmod 644 ~/.cliproxyapi/auths/*.json` 后重试。

---

## 访问地址（从本机或局域网）

- Web 管理: http://\<本机IP\>:9080 或 :8888  
- OpenClaw: http://\<本机IP\>:18790  
- CLIProxyAPI 管理（容器启动后）: http://\<本机IP\>:8318 或 54545（见 docker-compose 映射）
