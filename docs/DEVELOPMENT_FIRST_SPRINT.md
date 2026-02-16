# 第一轮开发 (First Sprint) 说明

## 本轮完成内容

- **ROADMAP.md**：阶段一/二/三 路线图
- **Skills 入库**：`skills/moneymaker`、`skills/coding`、`skills/analytics` 的 SKILL.md
- **install.sh 增强**：创建目录、复制配置与 Skills、启动 Docker
- **start.sh**：一键启动 CLIProxyAPI + OpenClaw Gateway
- **docs/RUNBOOK.md**：从安装到首次对话的 Runbook
- **CONTRIBUTING.md**：增加 ROADMAP 链接

## 你本地需要执行的 Git 命令

在项目根目录执行（建议在 develop 上直接提交，或按流程走 feature 分支）：

```bash
cd /home/cool/universal-ai-assistant

# 方案 A：直接提交到 develop（简单）
git checkout develop
git pull origin develop
git add .
git status
git commit -m "feat: 路线图与安装/启动增强、Skills 模板、Runbook"
git push origin develop

# 方案 B：走 feature 分支再合并（规范）
git checkout develop
git pull origin develop
git checkout -b feature/install-and-skills
git add .
git commit -m "feat: 路线图与安装/启动增强、Skills 模板、Runbook"
git push -u origin feature/install-and-skills
# 然后在 GitHub 创建 PR: feature/install-and-skills -> develop，合并后删除分支
```

合并到 develop 后，后续新功能继续从 develop 拉 feature/* 开发。
