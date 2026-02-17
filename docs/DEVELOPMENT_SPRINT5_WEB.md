# 第五轮开发 - Web 管理界面

## 本轮完成

- **web/app.py**：Flask 后端，提供 `/api/status`、`/api/health`、`/api/validate`，并托管静态页
- **web/static/**：单页仪表盘（index.html + style.css + app.js），深色主题，展示状态、校验与健康检查结果、快捷链接
- **web/requirements.txt**：Flask 依赖
- **web/README.md**：Web 使用说明
- **scripts/start_web.sh**：一键启动 Web（pip install + python web/app.py）
- **README.md / docs/RUNBOOK.md**：增加 Web 启动说明
- **ROADMAP.md**：勾选「Web 管理界面」
- **CHANGELOG.md**：Unreleased 增加 Web 管理界面

## 提交到 feature 分支

```bash
cd /home/cool/universal-ai-assistant
git checkout develop
git pull origin develop
git checkout -b feature/sprint5-web-dashboard
sed -i 's/\r$//' scripts/start_web.sh 2>/dev/null
git add .
git commit -m "feat: Web 管理界面（Flask + 仪表盘，状态/校验/健康检查）"
git push -u origin feature/sprint5-web-dashboard
```

然后创建 PR：`feature/sprint5-web-dashboard` -> `develop`，合并即可。
