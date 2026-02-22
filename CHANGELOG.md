# Changelog

## [Unreleased]

- Web 管理界面：`web/app.py` + 静态仪表盘（服务状态、配置校验、健康检查、快捷链接）
- CLI 配置向导：`scripts/config_wizard.py`
- 一键诊断：`scripts/doctor.sh`

## [1.0.0] - 2025-02

### 新增

- 项目骨架与 Git 流程（main / develop / feature）
- 一键安装：`install.sh`（OpenClaw、目录、Skills、Docker）
- 一键启动：`start.sh`（CLIProxyAPI + Gateway）
- 配置模板：OpenClaw、CLIProxyAPI
- Skills：moneymaker、coding、analytics、research、daily
- 脚本：money_maker.py、占位脚本、data_analysis.py、health_check.sh、validate_config.sh
- 模板：CLAUDE.md、workspace 说明
- 文档：README、ROADMAP、RUNBOOK、CONTRIBUTING、GIT_SETUP、各 Sprint 说明

### 修复

- 安装与启动脚本 CRLF 换行问题说明（RUN_IN_WSL）
- Git 首次提交缺少 user.name/email 时自动使用本仓库身份
