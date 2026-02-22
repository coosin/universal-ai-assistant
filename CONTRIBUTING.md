# 开发流程 (Contributing)

## 路线图

开发任务与优先级见 [ROADMAP.md](ROADMAP.md)。

## 分支策略

- **main** - 稳定版本
- **develop** - 开发主分支
- **feature/xxx** - 功能分支

## 日常流程

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature
# 开发...
git add .
git commit -m "feat: 描述"
git push -u origin feature/your-feature
# 创建 PR: feature/your-feature → develop
```

## Commit 规范

- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档
- `chore:` 构建/工具
