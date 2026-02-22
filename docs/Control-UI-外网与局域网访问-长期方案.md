# Control UI 外网 / 局域网访问 — 长期方案（基于官网文档）

> 问题：通过 `http://192.168.1.100:18790` 访问控制界面会报 **1008：需要设备身份验证（请使用 HTTPS 或 localhost）**。  
> 原因：浏览器要求「安全上下文」（HTTPS 或 localhost），非 localhost 的 HTTP 无法做设备身份验证。  
> 来源：OpenClaw 官网 [Tailscale](https://docs.openclaw.ai/gateway/tailscale)、[Remote Access](https://docs.openclaw.ai/gateway/remote)、[Security](https://docs.openclaw.ai/gateway/security)。

---

## 方案一：Tailscale Serve（推荐 — 局域网/组网内 HTTPS）

**适用**：同一 Tailscale 组网内的设备（家里多台机器、办公室 + 家里等）。  
**效果**：Control UI 通过 **HTTPS** 访问，满足安全上下文，不再出现 1008。

### 1. 前置条件

- 在网关主机（home）上安装并登录 **Tailscale**：
  ```bash
  # 安装（Ubuntu/Debian）
  curl -fsSL https://tailscale.com/install.sh | sh
  sudo tailscale up
  ```
- Tailnet 已开启 HTTPS（CLI 会提示若未开启）。

### 2. 配置 OpenClaw

在 `~/.openclaw/openclaw.json` 的 `gateway` 中增加 `tailscale`，例如：

```json
"gateway": {
  "port": 18789,
  "mode": "local",
  "bind": "loopback",
  "tailscale": { "mode": "serve" },
  "controlUi": { "allowInsecureAuth": true },
  "auth": {
    "mode": "token",
    "token": "你的token",
    "password": "你的password"
  }
}
```

或启动时用 CLI：

```bash
openclaw gateway --tailscale serve
```

### 3. 访问方式

- 启动后访问：**`https://<机器 Tailscale 名>/`**（或你配置的 `gateway.controlUi.basePath`）。
- 同一 Tailnet 内的设备用该 HTTPS 地址即可，无需再走 `http://192.168.1.100:18790`。
- 若开启 `gateway.auth.allowTailscale: true`，同 Tailnet 用户可用 Tailscale 身份头认证（无需 token）；否则仍需 token/password。

### 4. 自定义 HTTPS 端口（可选）

```json
"tailscale": { "mode": "serve", "httpsPort": 8443 }
```

或：`openclaw gateway --tailscale serve --tailscale-https-port 8443`

---

## 方案二：Tailscale Funnel（公网 HTTPS）

**适用**：需要从**公网**（非 Tailnet）访问 Control UI。  
**注意**：会暴露到互联网，必须使用**密码认证**（不能仅 token）。

### 配置示例

```json
"gateway": {
  "bind": "loopback",
  "tailscale": { "mode": "funnel" },
  "auth": { "mode": "password", "password": "强密码" }
}
```

或：`openclaw gateway --tailscale funnel --auth password`  
密码建议用环境变量：`OPENCLAW_GATEWAY_PASSWORD`，不要写死在配置里。

### 限制（官网）

- Funnel 仅支持端口 443、8443、10000（TLS）。
- 需 Tailscale v1.38.3+、MagicDNS、HTTPS 开启等，见 [Tailscale Funnel](https://tailscale.com/kb/1223/tailscale-funnel)。

---

## 方案三：SSH 隧道（通用备选，无需 Tailscale）

**适用**：任意能 SSH 到网关主机的机器（局域网或跳板到外网均可）。

在**你的电脑**上执行（保持连接不关）：

```bash
ssh -N -L 18789:127.0.0.1:18789 cool@192.168.1.100
```

然后在本地浏览器打开：

```
http://127.0.0.1:18789/?token=8f00672a94d1c43f1b74ef97a8fc2ef2
```

对浏览器而言是 localhost，不会触发 1008。  
若网关端口不是 18789，把两处 `18789` 改成实际端口。

---

## 方案四：自建反向代理 + HTTPS（nginx + Let's Encrypt）

**适用**：有域名、希望用自定义域名 + 证书做长期 HTTPS。

1. 在网关主机或前置机上安装 **nginx** 和 **certbot**。
2. 用 nginx 反代 `http://127.0.0.1:18789`，并设置 `X-Forwarded-Proto: https` 等头。
3. 用 **Let's Encrypt** 为域名申请证书（`certbot`）。
4. 在 OpenClaw 的 gateway 配置中设置 **trustProxy: true**（若文档支持），以信任 nginx 转发的头。

这样访问 `https://你的域名` 即满足安全上下文。  
具体 nginx 配置可参考：[How to Configure OpenClaw Gateway with HTTPS](https://www.openclawexperts.io/guides/setup/how-to-configure-openclaw-gateway-with-https)。

---

## 对比小结

| 方案           | 场景           | 是否需要 Tailscale | 是否 HTTPS | 备注                    |
|----------------|----------------|--------------------|------------|-------------------------|
| Tailscale Serve| 组网/局域网    | 是                 | 是         | 官网推荐，配置简单      |
| Tailscale Funnel | 公网        | 是                 | 是         | 必须密码认证            |
| SSH 隧道       | 任意可 SSH     | 否                 | 否（本地=localhost） | 通用、无需改 Gateway 配置 |
| nginx + 证书   | 自定义域名/公网 | 否               | 是         | 需维护域名与证书        |

---

## 建议

- **仅局域网/多设备组网**：优先用 **Tailscale Serve**，一次配置长期用 HTTPS，避免 1008。  
- **需要从外网访问**：在 Tailscale 与自建 nginx 之间二选一（Funnel 或 自有域名 + Let's Encrypt）。  
- **临时或不想动 Gateway**：用 **SSH 隧道** 即可，访问 `http://127.0.0.1:18789/?token=...`。

文档参考：  
- [Tailscale (Gateway dashboard)](https://docs.openclaw.ai/gateway/tailscale)  
- [Remote access (SSH, tunnels, tailnets)](https://docs.openclaw.ai/gateway/remote)  
- [Security](https://docs.openclaw.ai/gateway/security)
