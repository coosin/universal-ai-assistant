# 在 WSL 里直接运行（推荐，避免 CRLF 问题）

若你在 **Windows 里打开了 PowerShell**，请先进入 WSL，再用 **Linux 路径** 操作：

```bash
# 1. 进入 WSL
wsl -d Ubuntu-22.04

# 2. 用 Linux 路径进入项目（不要用 \\wsl.localhost\...）
cd /home/cool/universal-ai-assistant

# 3. 若有 CRLF 报错，先转成 LF
sed -i 's/\r$//' auto_setup.sh

# 4. 执行
chmod +x auto_setup.sh
bash auto_setup.sh
```

## 若脚本报 `\r: command not found` 或 `invalid option`

说明脚本被保存成了 Windows 换行符 (CRLF)。在 WSL 里执行：

```bash
cd /home/cool/universal-ai-assistant
sed -i 's/\r$//' auto_setup.sh run_auto_setup.sh push_to_remote.sh init_git_and_develop.sh 2>/dev/null
bash auto_setup.sh
```

## 在 Windows 资源管理器里点进 WSL 项目

- 地址栏输入：`\\wsl.localhost\Ubuntu-22.04\home\cool\universal-ai-assistant`
- 在文件夹里右键「在终端中打开」，若打开的是 WSL 终端，则当前目录已是项目目录，直接执行：`bash auto_setup.sh`
