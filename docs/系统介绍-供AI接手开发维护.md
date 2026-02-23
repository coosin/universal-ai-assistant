# Universal AI Assistant 系统介绍（供 AI 接手开发/维护）

> 本文档面向其他 AI，帮助快速理解项目全貌，直接接手开发或维护工作。  
> 最后更新：2026-02-23

---

## 〇、部署环境与运行前提

### 运行环境

- **宿主**：老式华为笔记本，裸机 Linux（非 WSL，仅此单机）
- **项目路径**：`/home/cool/universal-ai-assistant`
- **用户**：`cool`

### 代理与网络

- **代理软件**：Clash（mihomo），监听 `127.0.0.1:7890`（HTTP） / `7891`（SOCKS5）
- **托管方式**：systemd 服务 `clash.service`，开机自启
- **用途**：访问 Telegram、OpenRouter、部分海外 API 需经代理
- **配置位置**：
  - 项目 `.env`：`HTTP_PROXY=http://127.0.0.1:7890`
  - systemd 的 `openclaw-gateway.service`：已注入 `HTTP_PROXY/HTTPS_PROXY`
  - `docker-compose.yml`：CLIProxyAPI 容器内 `HTTP_PROXY=http://127.0.0.1:7890`

**注意**：

- **SiliconFlow**：`api.siliconflow.cn` 可能因 TLS/网络问题不可达，与代理无关；OpenRouter 经代理可正常访问
- 修改代理后需重启 Gateway、CLIProxyAPI 容器，或重载 systemd 服务

### Git 仓库

| 项目 | 说明 |
|------|------|
| 远程 | `git@github.com:coosin/universal-ai-assistant.git`（SSH） |
| 分支 | `main`（主分支）、`develop`（开发分支） |
| 推送 | `git push origin main` / `git push origin develop` |

**禁止提交**（已在 `.gitignore`）：

- `.env`（含 API Key、代理配置）
- `~/.openclaw/openclaw.json`
- `~/.cliproxyapi/config/config.yaml`

**开发流程**：`develop` 为主开发分支，功能在 `feature/xxx` 分支开发，合并后推 `main`。详见 `CONTRIBUTING.md`、`GIT_SETUP.md`。

### 其他注意事项

- **换行符**：若脚本报 `\r: command not found`（如从别处复制后含 CRLF），执行 `sed -i 's/\r$//' 脚本名` 转成 LF。
- **配置同步**：`scripts/sync_remote_config.sh` 会拉取远程并用 `config/*.example` 覆盖本地配置，**会覆盖** `~/.openclaw/openclaw.json` 和 `~/.cliproxyapi/config/config.yaml`，执行前会备份。慎用，或先用 `--dry-run` 预览。
- **Docker 镜像**：拉取 `eceasy/cli-proxy-api` 时若遇 403，可配置 Docker 镜像加速或代理；勿用 `ghcr.io` 源（易 403）。

---

## 一、项目概述

**Universal AI Assistant** 是一个基于 **OpenClaw + CLIProxyAPI + Claude Code** 的全能个人 AI 助手。用户可通过终端 CLI、Web 管理界面、Telegram 等方式与 AI 对话。

### 核心架构

```
用户 → OpenClaw Gateway (18789) → CLIProxyAPI (8317) → 上游厂商 (Claude/OpenRouter/SiliconFlow 等)
         ↑
         └── openclaw.json 配置模型、provider、fallback
```

- **OpenClaw Gateway**：统一入口，负责路由、模型选择、fallback 重试
- **CLIProxyAPI**：代理层，管理多厂商 API Key，按 OpenAI 兼容格式转发请求
- **Web 管理**：Flask 后端 + 静态前端，提供状态、健康检查、一键启动等

---

## 二、目录结构

```
/home/cool/universal-ai-assistant/
├── config/                    # 示例配置（安装时复制到用户目录）
│   ├── openclaw.json.example
│   └── cliproxyapi.yaml.example
├── docs/                      # 文档
│   ├── 系统介绍-供AI接手开发维护.md  # 本文档
│   ├── 正式跑起来.md
│   ├── OpenClaw与CLIProxy调用逻辑.md
│   ├── 操作命令清单-20260222.md
│   └── 给其他AI的反馈-20260222.md
├── scripts/                   # 运维脚本
│   ├── start_all_services.sh  # 一键启动所有服务
│   ├── start_web.sh           # 启动 Web 管理
│   ├── port_forward.sh        # 端口转发（需 sudo）
│   ├── health_check.sh        # 健康检查
│   ├── validate_config.sh    # 配置校验
│   ├── doctor.sh              # 一键诊断
│   └── ...
├── web/                       # Web 管理界面
│   ├── app.py                 # Flask 后端
│   ├── requirements.txt
│   └── static/                # 前端静态资源
├── docker-compose.yml         # CLIProxyAPI 容器
├── .env                       # 本地环境变量（不提交）
├── .env.example               # 环境变量示例
├── install.sh                 # 安装脚本
├── start.sh                   # 启动 Gateway + CLIProxyAPI
└── README.md
```

---

## 三、关键配置路径

| 用途 | 路径 |
|------|------|
| OpenClaw 主配置 | `~/.openclaw/openclaw.json` |
| OpenClaw 工作区 | `~/.openclaw/workspace/` |
| CLIProxyAPI 配置 | `~/.cliproxyapi/config/config.yaml` |
| CLIProxyAPI 认证 | `~/.cliproxyapi/auths/` |
| 项目环境变量 | `universal-ai-assistant/.env` |
| systemd 服务 | `~/.config/systemd/user/openclaw-gateway.service` |

---

## 四、端口与网络

| 服务 | 监听地址 | 端口 | 说明 |
|------|----------|------|------|
| OpenClaw Gateway | 127.0.0.1 | 18789 | 仅 loopback，安全 |
| 外部访问 Gateway | 本机 IP | 18790 | port_forward 转发到 127.0.0.1:18789 |
| 外网 HTTPS（Tunnel） | home.qlsm.net | 443 | Cloudflare Tunnel，无需端口映射 |
| Web 管理 | 127.0.0.1 | 8888 | Flask |
| 外部访问 Web | 本机 IP | 9080 | port_forward 转发到 8888 |
| CLIProxyAPI | 0.0.0.0 | 8317 | Docker host 网络，直连 |

**端口转发**：`scripts/port_forward.sh` 使用 iptables 实现。需 `sudo` 执行，且需 `net.ipv4.conf.all.route_localnet=1` 才能让 18790 的 DNAT 生效。

---

## 五、环境变量

### 项目 `.env`（启动时由 start.sh / start_all_services.sh 加载）

```bash
# OpenRouter API Key（OpenClaw 直连 OpenRouter 时用）
OPENROUTER_API_KEY=sk-or-v1-xxx

# 代理（国内访问 Telegram / OpenRouter 常用）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
NO_PROXY=localhost,127.0.0.1,::1
```

### systemd 服务中注入的变量

- `OPENROUTER_API_KEY`
- `HTTP_PROXY` / `HTTPS_PROXY`
- `OPENCLAW_GATEWAY_TOKEN`（CLI 连接 Gateway 时用）

### 用户 shell 中需 export（新开终端/SSH 后）

```bash
export OPENROUTER_API_KEY="sk-or-v1-xxx"
export OPENCLAW_GATEWAY_TOKEN="8f00672a94d1c43f1b74ef97a8fc2ef2"
```

建议写入 `~/.bashrc`，登录后 `source ~/.bashrc`。

---

## 六、服务启动方式

### 方式 A：一键启动（推荐）

```bash
cd /home/cool/universal-ai-assistant
./scripts/start_all_services.sh              # Gateway 前台
./scripts/start_all_services.sh --background # 全部后台
```

会依次：端口转发 → CLIProxyAPI (Docker) → Web (8888) → OpenClaw Gateway (18789)。

### 方式 B：单独启动

```bash
# 1. CLIProxyAPI
docker compose -f docker-compose.yml up -d

# 2. Web 管理
pip install -r web/requirements.txt
python3 web/app.py

# 3. Gateway（加载 .env）
source .env 2>/dev/null || true
openclaw gateway --port 18789 --verbose
```

### 方式 C：systemd 托管 Gateway

```bash
systemctl --user start openclaw-gateway
systemctl --user status openclaw-gateway
```

systemd 服务已注入 `OPENROUTER_API_KEY`、`HTTP_PROXY`、`HTTPS_PROXY`、`OPENCLAW_GATEWAY_TOKEN`，不依赖 `.env`。

---

## 七、常用运维命令

| 操作 | 命令 |
|------|------|
| 健康检查 | `./scripts/health_check.sh` |
| 配置校验 | `./scripts/validate_config.sh` |
| 一键诊断 | `./scripts/doctor.sh` |
| 端口转发状态 | `sudo bash scripts/port_forward.sh status` |
| 设置端口转发 | `sudo bash scripts/port_forward.sh setup` |
| 清除端口转发 | `sudo bash scripts/port_forward.sh clear` |
| OpenClaw 状态 | `openclaw status`（需 `OPENCLAW_GATEWAY_TOKEN`） |
| OpenClaw 诊断 | `openclaw doctor` |
| 配置向导 | `python3 scripts/config_wizard.py` |

---

## 八、调用逻辑与「计费不足」

详见 `docs/OpenClaw与CLIProxy调用逻辑.md`。简要：

1. **OpenClaw** 根据 agent 的 `model` 选择 provider 和模型，向 `baseUrl` 发 OpenAI 兼容请求。
2. **CLIProxyAPI** 用 API Key 找到背后账号，向厂商发真实推理；**计费校验在 CLIProxy**。
3. 若 primary 返回 402/余额不足，**OpenClaw 会先展示错误**，再按 `fallbacks` 换下一个模型重试。
4. 「先显示余额不足再马上正常」= primary 失败 → fallback 成功，属于正常 fallback 行为。

---

## 九、无效命令（勿用）

以下命令在 **OpenClaw 2026.2.19-2** 中**不存在或无效**，执行会报错：

| 无效命令 | 说明 |
|----------|------|
| `openclaw gateway pair-status` | gateway 无此子命令 |
| `openclaw gateway repair-pairing` | gateway 无此子命令 |
| `openclaw agents deadlock-check` | agents 无此子命令 |
| `openclaw agents restart --all` | agents 无 restart |
| `openclaw network fix-deps` | 无 network 命令 |
| `openclaw monitor --alerts` | 无 monitor 命令 |
| `openclaw doctor --full` | 无 --full 选项 |
| `openclaw config set performance.memory_limit` | 配置键不存在 |
| `openclaw config set logging.path` | 配置键不存在 |
| `openclaw pending-config` | 命令不存在 |
| `openclaw config set gateway.logFile` | 配置键不存在 |

**建议**：推荐 openclaw 命令前，先用 `openclaw <cmd> --help` 确认是否存在。

---

## 十、CLI 连接 Gateway 的认证

Gateway 默认需 pairing，CLI 连接方式：

**方式 A：token（推荐）**

```bash
export OPENCLAW_GATEWAY_TOKEN="8f00672a94d1c43f1b74ef97a8fc2ef2"
openclaw status
```

**方式 B：Control UI 带 token**

```
http://127.0.0.1:18789/?token=8f00672a94d1c43f1b74ef97a8fc2ef2
```

**方式 C：外网访问（Cloudflare Tunnel）**

- 地址：`https://home.qlsm.net/?token=8f00672a94d1c43f1b74ef97a8fc2ef2`
- 若报「设备令牌不匹配」：在网关主机执行 `openclaw devices list`，对 Pending 设备执行 `openclaw devices approve <Request ID>`
- 获取最新带 token 的 URL：`openclaw dashboard --no-open`（将输出中的 127.0.0.1:18789 换成 home.qlsm.net 即可）

---

## 十一、Docker 与 CLIProxyAPI

- **镜像**：`eceasy/cli-proxy-api:latest`（勿用 ghcr.io，易 403）。上游 [router-for-me/CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) 当前 v6.8.x；需锁定版本时可改用 tag 如 `eceasy/cli-proxy-api:v6.8.26`。
- **网络**：`network_mode: host`，容器直接监听 8317
- **挂载**：`~/.cliproxyapi/config/config.yaml`、`~/.cliproxyapi/auths`、`~/.cliproxyapi/logs`（日志持久化，可选先 `mkdir -p ~/.cliproxyapi/logs`）
- **更新**：定期 `docker compose pull` 拉取最新镜像后 `docker compose up -d`；更多配置项见上游 `config.example.yaml`
- **代理**：docker-compose 中 `HTTP_PROXY/HTTPS_PROXY` 指向本机 Clash（如 127.0.0.1:7890）

---

## 十二、Web 管理 API

| 路径 | 说明 |
|------|------|
| `/` | 前端静态页 |
| `/api/status` | 端口 18789/8317 是否开放、配置文件是否存在 |
| `/api/health` | 执行 health_check.sh |
| `/api/validate` | 执行 validate_config.sh |
| `/api/run/<script_id>` | 执行白名单脚本（doctor、start_all_services 等） |

---

## 十三、故障排查速查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 401 Missing Authentication | API Key 格式错误或未配置 | 检查 openclaw.json、.env、systemd 中的 key |
| 计费不足 | primary 模型对应账号额度不足 | 充值或调整 primary/fallback 顺序 |
| fetch failed / 网络错误 | 代理未生效或不可达 | 检查 HTTP_PROXY、Clash 是否运行 |
| pairing required | 未设置 OPENCLAW_GATEWAY_TOKEN | export 或写入 .bashrc |
| 1008 设备令牌不匹配 | 通过 Tunnel/外网访问视为新设备 | `openclaw devices list` → `openclaw devices approve <Request ID>`，或使用 `openclaw dashboard --no-open` 获取带 token 的 URL |
| 端口被占用 | 旧进程未释放 | `fuser -k 18789/tcp` 或重启服务 |

---

## 十四、备份与恢复

完整备份建议包含：

- 项目目录：`/home/cool/universal-ai-assistant`
- `~/.openclaw/`（含 openclaw.json、workspace）
- `~/.cliproxyapi/`（含 config、auths）

示例：`tar czvf backup.tar.gz universal-ai-assistant .openclaw .cliproxyapi`

---

## 十五、给接手 AI 的经验与建议

本节汇总开发/排障过程中的经验，供后续 AI 少走弯路。

### 15.1 推荐做法

1. **推荐 openclaw 命令前先验证**：`openclaw <cmd> --help` 确认子命令存在。当前版本 2026.2.21-2 中，大量「看起来合理」的命令（如 `gateway pair-status`、`agents restart`、`doctor --full`）并不存在，详见 `docs/给其他AI的反馈-20260222.md`。
2. **修改 systemd 后必须**：`systemctl --user daemon-reload`，再 `restart openclaw-gateway`，否则不生效。
3. **环境变量有多个入口**：`.env` 只被 `start.sh` / `start_all_services.sh` 加载；systemd 不读 `.env`，需在 service 里显式写 `Environment=`；新开 SSH 终端需 `source ~/.bashrc` 或手动 export。
4. **排查网络问题先区分**：OpenRouter 经代理可访问；SiliconFlow (`api.siliconflow.cn`) 可能因 TLS 握手失败不可达，与代理无关，不要一味调代理。
5. **「先余额不足再马上正常」是正常行为**：primary 失败 → OpenClaw 展示错误 → fallback 换模型成功，不是 bug。

### 15.2 常见陷阱

| 陷阱 | 说明 | 建议 |
|------|------|------|
| 盲目执行其他 AI 建议的 openclaw 命令 | 很多命令在当前版本不存在，会报错 | 先 `--help` 验证 |
| 修改 `gateway.auth` 后忘记传 token | 会导致 pairing required，CLI 无法连接 | 同时配置 `OPENCLAW_GATEWAY_TOKEN` 或 Control UI 带 `?token=` |
| 执行 `sync_remote_config.sh` 未备份 | 会用 example 覆盖本地配置，丢失 agent、API Key 等 | 脚本会备份，但恢复需手动；慎用或先 `--dry-run` |
| 401 时只改 openclaw.json | OpenRouter 用 `${OPENROUTER_API_KEY}`，若 systemd 启动则读不到 .env | 同时检查 systemd 的 Environment、.bashrc |

### 15.3 配置变更生效时机

| 变更类型 | 生效方式 |
|----------|----------|
| openclaw.json | 部分变更可热加载（官网：gateway watches config and hot-reloads safe changes）；涉及 auth/port/bind 等建议重启 Gateway |
| ~/.cliproxyapi/config/config.yaml | `docker compose restart cliproxyapi` |
| .env | 仅对**新启动**的进程生效，已运行的 Gateway 不会重读 |
| systemd Environment | `daemon-reload` + `restart` |

### 15.4 日志与排查

- OpenClaw 日志：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`
- systemd 日志：`journalctl -u openclaw-gateway -f`
- 健康检查：`./scripts/doctor.sh`、`openclaw doctor`

### 15.5 参考文档

- `docs/其他AI建议分析-20260222.md` — 哪些建议有效、哪些无效的完整分析
- `docs/问题分析与修复总结-20260222.md` — 历史问题的根因与修复步骤

---

## 十六、相关文档

- `docs/正式跑起来.md` — 首次部署完整步骤
- `docs/OpenClaw与CLIProxy调用逻辑.md` — 调用链与计费逻辑
- `docs/操作命令清单-20260222.md` — 日常操作命令
- `docs/给其他AI的反馈-20260222.md` — 无效命令与实测反馈
- `docs/Control-UI-外网与局域网访问-长期方案.md` — Tailscale/SSH/nginx 外网访问
- `docs/自有域名-HTTPS-配置指南.md` — nginx + Let's Encrypt 自有域名 HTTPS
- `docs/Cloudflare-Tunnel-配置指南.md` — Cloudflare Tunnel（无需端口映射）
- `docs/Cloudflare-DDNS-设置指南.md` — 动态 DNS 自动更新
- `docs/路由器端口映射设置.md` — 家庭宽带端口映射
- `docs/外网访问超时-排查与解决.md` — 超时排查
