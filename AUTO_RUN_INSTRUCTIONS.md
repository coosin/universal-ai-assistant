# 一键自动流程说明

## 已提供的自动脚本

| 脚本 | 作用 |
|------|------|
| `auto_setup.sh` | 核心逻辑：`git init` → `git add` → 首次提交 → 创建 `main` / `develop` |
| `run_auto_setup.sh` | 在 WSL/Linux 下一键执行 `auto_setup.sh` |
| `run_auto_setup.ps1` | 在 Windows PowerShell 下一键调用 WSL 执行 `auto_setup.sh` |
| `push_to_remote.sh` | 在已配置 `origin` 后一键推送 `main` 和 `develop` |

## 你只需做两步

### 第一步：执行自动流程（任选一种）

在 **Cursor 终端** 里先进入项目目录，再执行下面其中一条。

- **若终端是 WSL / Bash：**
  ```bash
  cd cool/universal-ai-assistant
  chmod +x run_auto_setup.sh auto_setup.sh
  ./run_auto_setup.sh
  ```

- **若终端是 PowerShell：**
  ```powershell
  cd cool\universal-ai-assistant
  .\run_auto_setup.ps1
  ```

- **或直接执行核心脚本（Bash）：**
  ```bash
  cd cool/universal-ai-assistant
  bash auto_setup.sh
  ```

执行成功后，会看到类似输出：
```
[1/4] 初始化 Git 仓库...
[2/4] 首次提交...
[3/4] 创建 develop 分支...
[4/4] 完成.
```

### 第二步：添加远程并推送（需先创建空仓库）

1. 在 GitHub 或 Gitee 新建空仓库，名称：`universal-ai-assistant`（不要勾选 README）。
2. 在项目目录执行（把 `YOUR_USERNAME` 换成你的用户名）：
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/universal-ai-assistant.git
   ./push_to_remote.sh
   ```
   若用 Gitee，把地址换成：`https://gitee.com/YOUR_USERNAME/universal-ai-assistant.git`

之后日常开发按 [CONTRIBUTING.md](CONTRIBUTING.md) 的流程即可。
