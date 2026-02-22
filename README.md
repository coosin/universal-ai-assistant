# 🦞 Universal AI Assistant

基于 OpenClaw + CLIProxyAPI + Claude Code 的全能个人AI助手。

## 快速开始

```bash
# 安装（Node.js 22+ 与 Docker 需已安装）
chmod +x install.sh start.sh
./install.sh
```

**正式跑起来**（配置 API Key → 启动 → 对话）请按 **[docs/正式跑起来.md](docs/正式跑起来.md)** 一步步做。

- **国内网络/代理**：`start.sh` 会自动加载项目根目录的 `.env`（参考 `.env.example`），用于配置 `HTTP_PROXY/HTTPS_PROXY`、`OPENROUTER_API_KEY` 等。
- **Telegram**：首次私聊 Bot 会给出配对码，按文档执行 `openclaw pairing approve telegram <code>` 授权即可。

```bash
# 配置好后启动
./start.sh
# 或: openclaw gateway --port 18789 --verbose

# 校验配置与环境
./scripts/validate_config.sh
./scripts/health_check.sh
# 或一键诊断
./scripts/doctor.sh

# 首次配置可用向导生成 openclaw.json
python3 scripts/config_wizard.py

# Web 管理界面（可选）
pip install -r web/requirements.txt
python3 web/app.py
# 浏览器打开 http://127.0.0.1:8888 或执行 ./scripts/start_web.sh

# 一键启动所有服务（Gateway + Web + CLIProxyAPI 若镜像已存在）
./scripts/start_all_services.sh              # Gateway 前台
./scripts/start_all_services.sh --background # 全部后台
```

## 一键自动流程（推送与开发准备）

**推荐：在 WSL 里用 Linux 路径运行（避免 CRLF 报错）：**

```bash
wsl -d Ubuntu-22.04
cd /home/cool/universal-ai-assistant
sed -i 's/\r$//' auto_setup.sh
chmod +x auto_setup.sh && bash auto_setup.sh
```

若出现 `\r: command not found` 或 `invalid option`，说明脚本是 CRLF，先执行上面的 `sed -i 's/\r$//' auto_setup.sh` 再运行。详见 [RUN_IN_WSL.md](RUN_IN_WSL.md)。

| 环境 | 操作 |
|------|------|
| **WSL 终端** | `cd /home/cool/universal-ai-assistant` 后执行 `bash auto_setup.sh` |
| **Windows PowerShell** | 在项目目录执行 `.\run_from_windows.ps1`（会调用 WSL） |

脚本会自动：初始化 Git、首次提交、创建 `main` 与 `develop` 分支。

**之后推送（需先在 GitHub/Gitee 创建空仓库）：**
```bash
git remote add origin https://github.com/YOUR_USERNAME/universal-ai-assistant.git
git push -u origin main && git push -u origin develop
```
或执行：`./push_to_remote.sh`（需先执行上面一行添加远程）。

详细步骤见 [SETUP_GIT_AND_PUSH.md](SETUP_GIT_AND_PUSH.md)。

## 开发流程

见 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [GIT_SETUP.md](GIT_SETUP.md)。

## 复盘与排障

- **系统介绍（供 AI 接手）**：`docs/系统介绍-供AI接手开发维护.md` — 项目全貌、配置路径、运维命令、无效命令清单
- 过程总结与最终收尾清单：`docs/开发复盘与收尾.md`
- OpenClaw 调用链路与“计费不足”来源：`docs/OpenClaw与CLIProxy调用逻辑.md`
