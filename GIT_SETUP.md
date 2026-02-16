# Git 仓库设置与推送

## 首次推送到远程

### 1. 在 GitHub 创建仓库

1. 打开 https://github.com/new
2. 仓库名: `universal-ai-assistant`
3. 不要勾选 “Add a README”
4. 创建后复制仓库 URL

### 2. 本地添加远程并推送

在项目根目录执行：

```bash
# 添加远程（把 YOUR_USERNAME 换成你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/universal-ai-assistant.git

# 推送 main 和 develop
git branch -M main
git push -u origin main
git push -u origin develop
```

### 3. Gitee（国内）

```bash
# 在 Gitee 创建仓库后
git remote add origin https://gitee.com/YOUR_USERNAME/universal-ai-assistant.git
git push -u origin main
git push -u origin develop
```

## 后续开发

- 新功能在 `feature/xxx` 分支开发，合并到 `develop`
- 发布时把 `develop` 合并到 `main` 并打 tag

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。
