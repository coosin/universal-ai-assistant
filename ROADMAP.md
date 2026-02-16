# 开发路线图 (ROADMAP)

## 阶段一：基础可用

- [x] 项目结构与 Git 流程
- [x] 一键安装脚本骨架
- [x] OpenClaw / CLIProxyAPI 配置模板
- [x] 安装脚本增强：创建目录、部署 Skills、启动 Docker
- [x] 启动脚本：一键启动 Gateway + CLIProxyAPI
- [x] Skills 模板入库：moneymaker / coding / analytics

## 阶段二：核心能力

- [x] 赚钱助手：money_maker.py 完善，fiverr/crypto/content 占位脚本
- [x] 代码助手：CLAUDE.md 模板与 workspace 说明
- [x] 数据分析：data_analysis.py 示例脚本
- [x] 文档：RUNBOOK 从安装到首次对话

## 阶段三：体验与扩展

- [x] 健康检查脚本：scripts/health_check.sh
- [ ] 可选：Web 配置向导或配置校验
- [ ] 更多 Skill 模板与示例

## 分支与发布

- `develop`：日常开发
- `feature/*`：功能分支，合并回 develop
- `main`：稳定版本，从 develop 合并并打 tag
