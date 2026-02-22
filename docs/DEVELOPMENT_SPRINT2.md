# 第二轮开发 (Sprint 2) 说明

## 本轮完成

- **scripts/moneymaker/**：money_maker.py 完善（list_opportunities/select_best），新增 fiverr_placeholder.py、crypto_placeholder.py、content_placeholder.py
- **templates/**：CLAUDE.md、workspace_README.md，install 时复制 CLAUDE.md 到 workspace/coding
- **scripts/analytics/**：data_analysis.py（CSV 简单统计，可选 pandas）
- **scripts/health_check.sh**：检查 Node/Docker/端口/容器
- **ROADMAP.md**：阶段一/二/三 勾选更新

## 提交到 feature 分支

```bash
cd /home/cool/universal-ai-assistant
git checkout develop
git pull origin develop
git checkout -b feature/sprint2-core-scripts
sed -i 's/\r$//' install.sh start.sh scripts/health_check.sh 2>/dev/null
git add .
git commit -m "feat: 阶段二核心脚本与模板、健康检查、ROADMAP 更新"
git push -u origin feature/sprint2-core-scripts
```

然后在 GitHub 创建 PR：`feature/sprint2-core-scripts` -> `develop`，合并即可。
