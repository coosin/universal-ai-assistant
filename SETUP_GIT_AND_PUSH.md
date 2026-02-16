# 推送并进入开发流程 - 操作步骤

按顺序在**项目根目录**执行以下命令（把 `YOUR_USERNAME` 换成你的 GitHub/Gitee 用户名）。

## 1. 初始化 Git 并提交

```bash
cd universal-ai-assistant
# 若在 cool 目录下则: cd cool/universal-ai-assistant

git init
git add .
git commit -m "Initial commit: Universal AI Assistant v1.0.0"
```

## 2. 创建 develop 分支并进入开发流程

```bash
git checkout -b develop
git add .
git commit -m "chore: setup develop branch" || true
git checkout main
```

## 3. 添加远程仓库并推送

**先到 GitHub/Gitee 创建空仓库 `universal-ai-assistant`，不要初始化 README。**

然后执行：

```bash
# GitHub
git remote add origin https://github.com/YOUR_USERNAME/universal-ai-assistant.git

# 或 Gitee
# git remote add origin https://gitee.com/YOUR_USERNAME/universal-ai-assistant.git

git branch -M main
git push -u origin main
git push -u origin develop
```

## 4. 日常开发

```bash
git checkout develop
git pull origin develop
git checkout -b feature/xxx
# 开发后
git add .
git commit -m "feat: 描述"
git push -u origin feature/xxx
# 在网页上创建 PR: feature/xxx -> develop
```

详见 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [GIT_SETUP.md](GIT_SETUP.md)。
