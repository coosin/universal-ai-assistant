#!/bin/bash
# 一键自动流程（在 WSL/Linux 终端中执行）
cd "$(dirname "$0")"
chmod +x auto_setup.sh 2>/dev/null
bash auto_setup.sh
