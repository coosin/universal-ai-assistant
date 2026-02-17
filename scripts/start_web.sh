#!/bin/bash
# 启动 Web 管理界面（需先 pip install -r web/requirements.txt）
# 使用 LF 换行
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
export PORT="${PORT:-8888}"
if [ -f web/requirements.txt ]; then
  pip install -q -r web/requirements.txt 2>/dev/null || true
fi
exec python3 web/app.py
