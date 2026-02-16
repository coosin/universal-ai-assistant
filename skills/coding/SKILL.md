# Coding Assistant Skill - 代码开发助手

## 功能

- 自动写代码、编辑文件、运行测试与构建
- 代码审查与重构建议
- Git 操作（需在 workspace 内）

## 使用示例

- "帮我写一个 React 组件"
- "运行测试并打包"
- "审查这段代码并给出优化建议"

## 工具

- read / write / edit / apply_patch：文件操作
- exec / bash / process：运行命令与后台任务
- sessions_*：多会话与子任务

## 工作区

- 默认 workspace：~/.openclaw/workspace/coding
- 可在 openclaw.json 的 agents.list 中为 coding agent 指定 workspace
