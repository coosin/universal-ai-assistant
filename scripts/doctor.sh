#!/bin/bash
# 一键诊断：配置校验 + 健康检查
# 使用 LF 换行
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "=== Universal AI Assistant - 诊断 ==="
echo ""
bash "$SCRIPT_DIR/validate_config.sh" || true
echo ""
bash "$SCRIPT_DIR/health_check.sh" || true
