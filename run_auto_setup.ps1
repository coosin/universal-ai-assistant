# 一键自动流程（在 Cursor/VS Code 终端或 PowerShell 中运行）
# 会调用 WSL 执行 auto_setup.sh
$dir = $PSScriptRoot
$wslDir = (wsl -e wslpath -a $dir 2>$null)
if (-not $wslDir) { $wslDir = $dir -replace '\\', '/' }
Write-Host "Running auto_setup in WSL: $wslDir"
wsl -e bash -c "cd '$wslDir' && chmod +x auto_setup.sh && bash auto_setup.sh"
