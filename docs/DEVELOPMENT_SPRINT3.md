# 第三轮开发 (Sprint 3) 说明

## 本轮完成

- **scripts/validate_config.sh**：校验 ~/.openclaw/openclaw.json 存在与 JSON 格式，可选 jq 检查 apiKey 是否已替换；校验 CLIProxyAPI 配置存在
- **skills/research/SKILL.md**：调研助手（web_search / web_fetch）
- **skills/daily/SKILL.md**：每日简报 / 定时汇总（cron + message）
- **ROADMAP.md**：阶段三勾选完成（配置校验、更多 Skill）
- **docs/RUNBOOK.md**：增加「校验与健康检查」小节

## 提交到 feature 分支

```bash
cd /home/cool/universal-ai-assistant
git checkout develop
git pull origin develop
git checkout -b feature/sprint3-validate-and-skills
sed -i 's/\r$//' scripts/validate_config.sh 2>/dev/null
git add .
git commit -m "feat: 配置校验脚本、research/daily Skill、RUNBOOK 更新"
git push -u origin feature/sprint3-validate-and-skills
```

然后创建 PR：`feature/sprint3-validate-and-skills` -> `develop`，合并即可。
