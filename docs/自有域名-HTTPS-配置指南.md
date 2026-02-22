# OpenClaw Control UI — 自有域名 HTTPS 配置指南

通过 **nginx 反向代理 + Let's Encrypt** 为 Control UI 配置 HTTPS，使用自有域名访问，满足浏览器「安全上下文」、消除 1008 设备身份验证错误。

**前提**：你有一个域名，且该域名的 DNS A 记录已指向网关主机（或前置机）的公网/局域网 IP。

---

## 一、架构示意

```
用户浏览器 → https://openclaw.你的域名.com (443)
    → nginx (TLS 终结，Let's Encrypt 证书)
    → http://127.0.0.1:18789 (OpenClaw Gateway)
```

Gateway 保持只监听 `127.0.0.1:18789`，由 nginx 对外提供 HTTPS。

---

## 二、步骤 1：安装 nginx 与 certbot

在**网关主机**（或运行 OpenClaw 的机器）上执行：

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

---

## 三、步骤 2：DNS 解析

在域名服务商处添加 **A 记录**：

- **主机记录**：例如 `openclaw`（则域名为 `openclaw.你的域名.com`）或 `@`（根域名）
- **记录值**：网关主机的公网 IP（若仅局域网访问则填内网 IP，证书需用 DNS 验证或自签）
- **TTL**：默认即可

等 DNS 生效后，在本地测试：`ping openclaw.你的域名.com` 应解析到该 IP。

---

## 四、步骤 3：nginx 反向代理配置

创建站点配置（将 `openclaw.你的域名.com` 换成你的域名）：

```bash
sudo nano /etc/nginx/sites-available/openclaw
```

写入以下内容（**注意**：Gateway 端口为 **18789**，不是 3000）：

```nginx
server {
    listen 80;
    server_name openclaw.你的域名.com;

    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

启用站点并检查配置：

```bash
sudo ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 五、步骤 4：申请 Let's Encrypt 证书

**确保**：域名已解析到本机、80 端口可从公网访问（若仅内网，需用 DNS 验证或内网 CA）。

```bash
sudo certbot --nginx -d openclaw.你的域名.com
```

按提示操作；选择将 HTTP 重定向到 HTTPS（推荐）。  
certbot 会自动修改 nginx 配置、加入 SSL 并配置自动续期。

验证续期：

```bash
sudo certbot renew --dry-run
```

---

## 六、步骤 5：OpenClaw 信任反向代理

让 OpenClaw 识别「请求经 nginx 转发且为 HTTPS」，需配置 **trustedProxies**（信任来自 nginx 的 `X-Forwarded-*` 头）。

编辑 `~/.openclaw/openclaw.json`，在 `gateway` 中增加 `trustedProxies`（nginx 与 Gateway 同机则为 127.0.0.1）：

```json
"gateway": {
  "port": 18789,
  "mode": "local",
  "bind": "loopback",
  "trustedProxies": ["127.0.0.1", "::1"],
  "controlUi": { "allowInsecureAuth": true },
  "auth": {
    "mode": "token",
    "token": "8f00672a94d1c43f1b74ef97a8fc2ef2",
    "password": "fJvG39k4C5Kox0vL"
  }
}
```

**说明**：

- 仅增加 `trustedProxies`，**不**改为 `auth.mode: "trusted-proxy"`，仍使用 **token 认证**。
- 若 nginx 在另一台机器，将 `trustedProxies` 改为 nginx 所在机器的 IP（如 `["10.0.0.2"]`）。

重启 Gateway：

```bash
systemctl --user restart openclaw-gateway
```

---

## 七、步骤 6：访问与验证

在浏览器中打开：

```
https://openclaw.你的域名.com/?token=8f00672a94d1c43f1b74ef97a8fc2ef2
```

应能正常打开 Control UI，且不再出现 1008。  
可检查证书：浏览器地址栏应显示 Let's Encrypt 有效证书。

---

## 八、仅局域网访问（无公网、无 Let's Encrypt）

若域名只解析到内网 IP、且不打算用 Let's Encrypt（无 80 公网暴露），可：

**方案 A**：自签名证书 + 本地信任

```bash
# 生成自签名证书（示例）
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/openclaw.key \
  -out /etc/nginx/ssl/openclaw.crt \
  -subj "/CN=openclaw.你的域名.com"
```

在 nginx 的 `server` 中配置 `listen 443 ssl` 并引用上述证书与密钥；浏览器首次访问需手动信任该证书。

**方案 B**：内网 DNS + 使用 Tailscale Serve（见 [Control-UI-外网与局域网访问-长期方案.md](Control-UI-外网与局域网访问-长期方案.md)），无需自签证书。

---

## 九、故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 502 Bad Gateway | Gateway 未启动或端口不对 | 检查 `systemctl --user status openclaw-gateway`，确认端口 18789 |
| 仍报 1008 | trustedProxies 未配或未重启 | 确认 `trustedProxies` 含 nginx 的 IP，并重启 Gateway |
| WebSocket 断开 | nginx 超时或未正确升级 | 确认有 `Upgrade`、`Connection` 头，必要时调大 `proxy_read_timeout` |
| certbot 验证失败 | DNS 未生效或 80 被墙 | 检查解析与防火墙，或改用 `certbot certonly --dns-*` |

---

## 十、参考

- [How to Configure OpenClaw Gateway with HTTPS](https://www.openclawexperts.io/guides/setup/how-to-configure-openclaw-gateway-with-https)
- [OpenClaw Trusted Proxy](https://docs.openclaw.ai/gateway/trusted-proxy)（高级：proxy 做认证时用 `auth.mode: "trusted-proxy"`；此处仅用 `trustedProxies` 信任转发头）
