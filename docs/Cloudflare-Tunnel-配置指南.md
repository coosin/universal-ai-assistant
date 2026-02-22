# Cloudflare Tunnel 配置指南（无需端口映射）

Cloudflare Tunnel 可以让你无需配置路由器端口映射，直接从外网访问 OpenClaw Control UI。

---

## 一、快速配置（推荐）

运行一键配置脚本：

```bash
/home/cool/universal-ai-assistant/scripts/setup_cloudflare_tunnel.sh
```

脚本会：
1. 打开浏览器让你登录 Cloudflare
2. 创建隧道
3. 配置 DNS 路由
4. 创建配置文件
5. 测试运行

---

## 二、手动配置步骤

### 步骤 1：登录 Cloudflare

```bash
cloudflared tunnel login
```

这会打开浏览器，选择域名 `qlsm.net` 并授权。

### 步骤 2：创建隧道

```bash
cloudflared tunnel create openclaw
```

### 步骤 3：配置 DNS 路由

```bash
cloudflared tunnel route dns openclaw home.qlsm.net
```

### 步骤 4：创建配置文件

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

内容：

```yaml
tunnel: <隧道ID>  # 从 cloudflared tunnel list 获取
credentials-file: /home/cool/.cloudflared/<隧道ID>.json

ingress:
  - hostname: home.qlsm.net
    service: https://127.0.0.1:443
  - service: http_status:404
```

**获取隧道 ID**：

```bash
cloudflared tunnel list
```

### 步骤 5：测试运行

```bash
cloudflared tunnel --config ~/.cloudflared/config.yml run openclaw
```

访问 `https://home.qlsm.net/?token=你的token` 测试。

---

## 三、设置为系统服务（开机自启）

创建 systemd 服务：

```bash
sudo tee /etc/systemd/system/cloudflared-tunnel.service > /dev/null << EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=cool
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/cool/.cloudflared/config.yml run openclaw
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cloudflared-tunnel
sudo systemctl start cloudflared-tunnel
sudo systemctl status cloudflared-tunnel
```

---

## 四、配置说明

### 配置文件位置

- 配置文件：`~/.cloudflared/config.yml`
- 凭证文件：`~/.cloudflared/<隧道ID>.json`

### 服务指向

当前配置指向 `http://127.0.0.1:18789`（OpenClaw Gateway 直连，无需 nginx）。

若希望经 nginx（HTTPS 终结在本地），改为：

```yaml
ingress:
  - hostname: home.qlsm.net
    service: https://127.0.0.1:443
    originRequest:
      noTLSVerify: true
```

---

## 五、验证

1. **检查服务状态**：
   ```bash
   sudo systemctl status cloudflared-tunnel
   ```

2. **查看日志**：
   ```bash
   sudo journalctl -u cloudflared-tunnel -f
   ```

3. **测试访问**：
   从外网访问：`https://home.qlsm.net/?token=你的token`

---

## 六、优势

- ✅ **无需端口映射**：穿透 NAT/防火墙
- ✅ **自动 HTTPS**：Cloudflare 提供证书
- ✅ **无需公网 IP**：即使 CGNAT 也能用
- ✅ **运营商封禁端口也不影响**

---

## 七、注意事项

1. **DNS 记录**：Tunnel 会自动创建 DNS 记录，无需手动配置
2. **代理状态**：Tunnel 模式下，DNS 记录会自动设为「代理」（橙色云），这是正常的
3. **性能**：流量会经过 Cloudflare，可能有轻微延迟
4. **免费额度**：Cloudflare Tunnel 免费版有流量限制，个人使用通常足够

---

## 八、故障排查

| 问题 | 处理 |
|------|------|
| "tunnel not found" | 检查隧道 ID 是否正确，运行 `cloudflared tunnel list` |
| "credentials file not found" | 检查 `~/.cloudflared/<隧道ID>.json` 是否存在 |
| "DNS already exists" | DNS 路由已存在，可跳过或删除后重建 |
| 访问超时 | 检查 Tunnel 服务是否运行，查看日志 |

---

## 九、相关文件

- 配置脚本：`scripts/setup_cloudflare_tunnel.sh`
- 配置文件：`~/.cloudflared/config.yml`
- 服务文件：`/etc/systemd/system/cloudflared-tunnel.service`
