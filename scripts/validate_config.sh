#!/bin/bash
# 配置校验：检查 OpenClaw 与 CLIProxyAPI 配置是否存在、格式是否正确
# 使用 LF 换行
set -e
OK=0
FAIL=0

check_ok() { echo "  [OK]   $1"; OK=$((OK+1)); }
check_fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }
check_warn() { echo "  [WARN] $1"; }

echo "=== 配置校验 ==="
echo ""

# OpenClaw
OC="$HOME/.openclaw/openclaw.json"
if [ -f "$OC" ]; then
  check_ok "OpenClaw 配置存在: $OC"
  if command -v jq >/dev/null 2>&1; then
    if jq -e . "$OC" >/dev/null 2>&1; then
      check_ok "openclaw.json 格式正确 (JSON)"
      if grep -q "YOUR_CLIPROXYAPI_KEY" "$OC" 2>/dev/null; then
        check_warn "请将 apiKey 从 YOUR_CLIPROXYAPI_KEY 改为实际 Key"
      else
        check_ok "apiKey 已替换（非占位符）"
      fi
    else
      check_fail "openclaw.json 不是合法 JSON"
    fi
  else
    check_warn "未安装 jq，跳过 JSON 校验（可选: apt install jq）"
  fi
else
  check_fail "OpenClaw 配置不存在，请先运行 install.sh"
fi
echo ""

# CLIProxyAPI
CPA_DIR="$HOME/.cliproxyapi"
CPA_CFG="$CPA_DIR/config/config.yaml"
if [ -f "$CPA_CFG" ]; then
  check_ok "CLIProxyAPI 配置存在: $CPA_CFG"
else
  check_fail "CLIProxyAPI 配置不存在，请先运行 install.sh"
fi
echo ""

echo "--- 结果: $OK 通过, $FAIL 失败 ---"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
