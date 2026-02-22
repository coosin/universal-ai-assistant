# 在 Windows PowerShell 中运行，通过 WSL 执行 auto_setup.sh
# 用法：在 PowerShell 中 cd 到本脚本所在目录，然后 .\run_from_windows.ps1
$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Get-Location }.Path

# 将 Windows 路径转为 WSL 路径（例如 C:\Users\coosin\... -> /mnt/c/Users/coosin/...）
# 若当前路径已是 \\wsl.localhost\... 则转为 /home/cool/...
$winPath = $scriptDir -replace '/', '\'
if ($winPath -match '\\\\wsl\.localhost\\Ubuntu-22\.04\\(.+)') {
    $wslPath = '/' + ($Matches[1] -replace '\\', '/')
} else {
    $wslPath = (wsl -e wslpath -a $winPath 2>$null)
    if (-not $wslPath) {
        $wslPath = $winPath -replace '^([A-Z]):\\', '/mnt/$1/' -replace '\\', '/'
    }
}

Write-Host "WSL path: $wslPath"
Write-Host "Running auto_setup.sh in WSL..."
wsl -d Ubuntu-22.04 -e bash -c "cd '$wslPath' && chmod +x auto_setup.sh && bash auto_setup.sh"
Write-Host "Done."
