# Daily Skill - 每日简报 / 定时汇总

## 功能

- 配合 cron 做每日/每周汇总（如待办、摘要）
- 可对接日历、邮件、待办 API（需自行配置）

## 使用示例

- "生成今日工作简报"
- "汇总本周完成的任务"
- "每天早上 8 点发我今日要点"（需配置 cron + message 渠道）

## 工具

- cron：定时触发
- message：发送到 Telegram/WhatsApp 等
- read / write：读写本地摘要文件

## 配置建议

- 在 openclaw cron 中添加 isolated job，delivery 到指定 channel
