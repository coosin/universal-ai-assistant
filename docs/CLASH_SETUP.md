# 在 home 上部署 Clash 作本机代理

用于 Telegram / OpenRouter 等出网，不依赖 myhome 的临时代理。Clash 在 home 本机运行，Gateway 通过 `127.0.0.1:7890` 使用。

## 1. 安装 Clash（mihomo / Clash Meta）

推荐使用 **mihomo**（Clash Meta 维护版）：

```bash
# 以 amd64 为例，其他架构见 https://github.com/MetaCubeX/mihomo/releases
MH_VERSION="v1.18.10"   # 可改为最新 tag
wget -q "https://github.com/MetaCubeX/mihomo/releases/download/${MH_VERSION}/mihomo-linux-amd64-${MH_VERSION}.gz" -O /tmp/mihomo.gz
gunzip -c /tmp/mihomo.gz > /tmp/mihomo && chmod +x /tmp/mihomo
sudo mv /tmp/mihomo /usr/local/bin/mihomo
```

## 2. 配置目录与配置文件

```bash
sudo mkdir -p /etc/clash
# 将你的订阅或 config.yaml 放到 /etc/clash/config.yaml
# 订阅示例：curl -s "你的订阅链接" | base64 -d > /tmp/c.yaml && sudo cp /tmp/c.yaml /etc/clash/config.yaml
```

确保 config 里 HTTP 代理端口为 `7890`（多数订阅默认即是）：

```yaml
# config.yaml 中通常已有，确认即可
port: 7890
socks-port: 7891
```

## 3. systemd 服务（开机自启）

```bash
sudo tee /etc/systemd/system/clash.service << 'EOF'
[Unit]
Description=Clash (mihomo) Proxy
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/mihomo -d /etc/clash
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable clash
sudo systemctl start clash
sudo systemctl status clash
```

## 4. 让 OpenClaw 使用本机 Clash

在项目根目录 `.env` 中设置：

```bash
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
NO_PROXY=localhost,127.0.0.1,::1
```

然后重启 Gateway：

```bash
cd ~/universal-ai-assistant
openclaw gateway stop
./scripts/start_all_services.sh --background
```

## 5. 订阅自动更新（推荐）

在 `.env` 中设置 `CLASH_SUBSCRIPTION_URL=你的订阅链接`，然后执行：

```bash
# 一键安装 cron（每日 6:30 自动更新）
sudo bash scripts/clash_install_cron.sh
```

或手动更新：

```bash
sudo bash scripts/clash_update_subscription.sh
```

## 常用命令

| 操作     | 命令 |
|----------|------|
| 启动     | `sudo systemctl start clash` |
| 停止     | `sudo systemctl stop clash` |
| 状态     | `sudo systemctl status clash` |
| 查看日志 | `journalctl -u clash -f` |
| 测试代理 | `curl -x http://127.0.0.1:7890 https://api.telegram.org` |
