#!/bin/bash
# 端口转发：将外部端口转发到本机服务（便于从局域网/外网访问）
# 需要 sudo 执行
# 用法: sudo bash scripts/port_forward.sh [setup|status|clear]

set -e

# 转发规则：外部端口 -> 本机端口
# Web 管理界面 8888 -> 可从 9080 访问
# OpenClaw Gateway 18789 (仅监听 127.0.0.1) -> 可从 18790 访问
# CLIProxyAPI 8317 -> 可从 8318 访问（若容器启动）
declare -A FORWARD=(
  ["9080"]="8888"    # 外部 9080 -> Web 管理
  ["18790"]="18789"  # 外部 18790 -> OpenClaw Gateway
  ["8318"]="8317"    # 外部 8318 -> CLIProxyAPI（可选）
)

action="${1:-setup}"

case "$action" in
  setup)
    echo "=== 设置端口转发 ==="
    # 9080/8318: REDIRECT 即可（服务监听 0.0.0.0）
    for ext in 9080 8318; do
      inner="${FORWARD[$ext]}"
      if sudo iptables -t nat -C PREROUTING -p tcp --dport "$ext" -j REDIRECT --to-ports "$inner" 2>/dev/null; then
        echo "  已存在: $ext -> $inner"
      else
        sudo iptables -t nat -A PREROUTING -p tcp --dport "$ext" -j REDIRECT --to-ports "$inner"
        echo "  已添加: $ext -> $inner"
      fi
    done
    # 18790 -> 127.0.0.1:18789（Gateway 只监听 loopback，需 DNAT）
    if sudo iptables -t nat -C PREROUTING -p tcp --dport 18790 -j DNAT --to-destination 127.0.0.1:18789 2>/dev/null; then
      echo "  已存在: 18790 -> 127.0.0.1:18789"
    else
      sudo iptables -t nat -A PREROUTING -p tcp --dport 18790 -j DNAT --to-destination 127.0.0.1:18789
      echo "  已添加: 18790 -> 127.0.0.1:18789"
    fi
    # 本机访问自己时也走转发（OUTPUT）
    for ext in 9080 8318; do
      inner="${FORWARD[$ext]}"
      if ! sudo iptables -t nat -C OUTPUT -p tcp -d 127.0.0.1 --dport "$ext" -j REDIRECT --to-ports "$inner" 2>/dev/null; then
        sudo iptables -t nat -A OUTPUT -p tcp -d 127.0.0.1 --dport "$ext" -j REDIRECT --to-ports "$inner"
      fi
    done
    if ! sudo iptables -t nat -C OUTPUT -p tcp -d 127.0.0.1 --dport 18790 -j DNAT --to-destination 127.0.0.1:18789 2>/dev/null; then
      sudo iptables -t nat -A OUTPUT -p tcp -d 127.0.0.1 --dport 18790 -j DNAT --to-destination 127.0.0.1:18789
    fi
    # 本机用公网 IP 访问 18790 时也 DNAT（本机 IP，可按需改为 $(hostname -I | awk '{print $1}')）
    if ! sudo iptables -t nat -C OUTPUT -p tcp -d 192.168.1.100 --dport 18790 -j DNAT --to-destination 127.0.0.1:18789 2>/dev/null; then
      sudo iptables -t nat -A OUTPUT -p tcp -d 192.168.1.100 --dport 18790 -j DNAT --to-destination 127.0.0.1:18789
    fi
    # 外网访问 18790 需 DNAT 到 127.0.0.1，并启用 route_localnet
    if [ -f /etc/sysctl.d/99-route-localnet.conf ] 2>/dev/null; then
      sudo sysctl -p /etc/sysctl.d/99-route-localnet.conf 2>/dev/null || true
    else
      echo "  建议执行: echo 'net.ipv4.conf.all.route_localnet=1' | sudo tee /etc/sysctl.d/99-route-localnet.conf && sudo sysctl -p /etc/sysctl.d/99-route-localnet.conf"
    fi
    echo ""
    echo "端口转发已启用。从其他机器访问本机时可用："
    echo "  Web 管理:    http://<本机IP>:9080"
    echo "  OpenClaw:    ws://<本机IP>:18790 或 http://<本机IP>:18790"
    echo "  CLIProxyAPI: http://<本机IP>:8318 (若已启动)"
    ;;
  status)
    echo "=== 当前端口转发规则 (NAT PREROUTING) ==="
    sudo iptables -t nat -L PREROUTING -n -v --line-numbers 2>/dev/null | head -30
    echo ""
    echo "本机监听端口:"
    ss -tlnp 2>/dev/null | grep -E "8888|18789|8317|9080|18790|8318" || true
    ;;
  clear)
    echo "=== 清除端口转发规则 ==="
    for ext in 9080 8318; do
      inner="${FORWARD[$ext]}"
      sudo iptables -t nat -D PREROUTING -p tcp --dport "$ext" -j REDIRECT --to-ports "$inner" 2>/dev/null && echo "  已删除: $ext -> $inner" || true
      sudo iptables -t nat -D OUTPUT -p tcp -d 127.0.0.1 --dport "$ext" -j REDIRECT --to-ports "$inner" 2>/dev/null || true
    done
    sudo iptables -t nat -D PREROUTING -p tcp --dport 18790 -j DNAT --to-destination 127.0.0.1:18789 2>/dev/null && echo "  已删除: 18790 -> 127.0.0.1:18789" || true
    sudo iptables -t nat -D OUTPUT -p tcp -d 127.0.0.1 --dport 18790 -j DNAT --to-destination 127.0.0.1:18789 2>/dev/null || true
    echo "已清除。"
    ;;
  save)
    # 持久化规则（需安装 iptables-persistent: apt install iptables-persistent）
    if command -v netfilter-persistent &>/dev/null; then
      sudo netfilter-persistent save && echo "规则已保存，重启后仍生效。"
    else
      echo "可选：安装 iptables-persistent 后执行 save 使重启后规则保留："
      echo "  sudo apt install -y iptables-persistent"
      echo "  sudo bash $0 setup && sudo netfilter-persistent save"
    fi
    ;;
  *)
    echo "用法: sudo bash $0 {setup|status|clear|save}"
    exit 1
    ;;
esac
