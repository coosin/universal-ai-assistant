# 第四轮开发 (Sprint 4) 说明

## 本轮完成

- **scripts/config_wizard.py**：CLI 配置向导，交互式输入 API Key / baseURL / 可选 Telegram，生成 `~/.openclaw/openclaw.json`
- **scripts/doctor.sh**：一键诊断，依次执行 validate_config.sh 与 health_check.sh
- **CHANGELOG.md**：版本与变更记录
- **ROADMAP.md**：阶段三全部勾选完成（含配置向导、doctor）
- **README.md**：快速开始中增加 doctor、config_wizard 说明
- **docs/RUNBOOK.md**：配置步骤增加「配置向导」、校验小节增加 doctor

## 提交到 feature 分支

```bash
cd /home/cool/universal-ai-assistant
git checkout develop
git pull origin develop
git checkout -b feature/sprint4-wizard-and-doctor
sed -i 's/\r$//' scripts/doctor.sh 2>/dev/null
git add .
git commit -m "feat: 配置向导、doctor 一键诊断、CHANGELOG、ROADMAP 收尾"
git push -u origin feature/sprint4-wizard-and-doctor
```

然后创建 PR：`feature/sprint4-wizard-and-doctor` -> `develop`，合并即可。当前路线图规划已全部完成。
