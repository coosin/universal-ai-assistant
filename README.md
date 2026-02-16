# 🦞 Universal AI Assistant

基于 OpenClaw + CLIProxyAPI + Claude Code 的全能个人AI助手。

## 快速开始

```bash
chmod +x install.sh && ./install.sh
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
