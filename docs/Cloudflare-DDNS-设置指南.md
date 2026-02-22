# Cloudflare DDNS 自动更新设置指南

## 一、获取 Cloudflare API Token

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 右上角点击你的头像 → **My Profile**
3. 左侧菜单选择 **API Tokens**
4. 点击 **Create Token**
5. 选择 **Edit zone DNS** 模板，或自定义：
   - **Permissions**: Zone → DNS → Edit
   - **Zone Resources**: Include → Specific zone → `qlsm.net`
6. 点击 **Continue to summary** → **Create Token**
7. **复制并保存 Token**（只显示一次）

---

## 二、配置 DDNS 脚本

### 方式 A：使用环境变量（推荐）

编辑 `~/.bashrc` 或创建配置文件：

```bash
# 创建配置文件
cp /home/cool/universal-ai-assistant/scripts/cloudflare_ddns.conf.example \
   /home/cool/universal-ai-assistant/scripts/cloudflare_ddns.conf

# 编辑并填入你的 API Token
nano /home/cool/universal-ai-assistant/scripts/cloudflare_ddns.conf
```

在文件中设置：

```bash
export CF_API_TOKEN="你的API_Token"
```

### 方式 B：直接修改脚本

编辑 `/home/cool/universal-ai-assistant/scripts/cloudflare_ddns.sh`，找到：

```bash
CF_API_TOKEN="${CF_API_TOKEN:-你的Cloudflare_API_Token}"
```

改为：

```bash
CF_API_TOKEN="你的实际API_Token"
```

---

## 三、手动测试

```bash
# 如果使用配置文件
source /home/cool/universal-ai-assistant/scripts/cloudflare_ddns.conf
/home/cool/universal-ai-assistant/scripts/cloudflare_ddns.sh

# 或直接运行（如果已修改脚本中的 Token）
/home/cool/universal-ai-assistant/scripts/cloudflare_ddns.sh
```

查看日志：

```bash
tail -f ~/.openclaw/ddns.log
```

---

## 四、设置自动更新（Cron）

脚本已自动设置 cron 任务（每 10 分钟检查一次）。

查看当前 cron 任务：

```bash
crontab -l | grep cloudflare_ddns
```

手动添加/修改（如果需要）：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每 10 分钟执行一次）
*/10 * * * * source /home/cool/universal-ai-assistant/scripts/cloudflare_ddns.conf 2>/dev/null; /home/cool/universal-ai-assistant/scripts/cloudflare_ddns.sh >> ~/.openclaw/ddns.log 2>&1
```

其他时间间隔示例：

- 每 5 分钟：`*/5 * * * *`
- 每 30 分钟：`*/30 * * * *`
- 每小时：`0 * * * *`

---

## 五、验证

1. **检查 DNS 记录**：
   ```bash
   dig +short home.qlsm.net A
   ```

2. **查看更新日志**：
   ```bash
   tail -20 ~/.openclaw/ddns.log
   ```

3. **手动触发更新**：
   ```bash
   /home/cool/universal-ai-assistant/scripts/cloudflare_ddns.sh
   ```

---

## 六、故障排查

| 问题 | 可能原因 | 处理 |
|------|----------|------|
| "无法获取公网 IP" | 网络问题 | 检查网络连接，或更换 IP 查询服务 |
| "无法获取 Zone ID" | API Token 错误或权限不足 | 检查 Token 是否正确，权限是否包含 DNS Edit |
| "记录不存在" | DNS 记录未创建 | 在 Cloudflare 控制台手动创建 `home.qlsm.net` 的 A 记录 |
| "更新失败" | API 调用失败 | 查看日志详情，检查 Token 和网络 |

---

## 七、安全建议

1. **API Token 权限最小化**：只给 DNS Edit 权限，不要用 Global API Key
2. **配置文件权限**：确保配置文件只有你能读：
   ```bash
   chmod 600 /home/cool/universal-ai-assistant/scripts/cloudflare_ddns.conf
   ```
3. **定期检查日志**：确保更新正常，IP 变化时能及时更新

---

## 八、相关文件

- 脚本：`/home/cool/universal-ai-assistant/scripts/cloudflare_ddns.sh`
- 配置示例：`/home/cool/universal-ai-assistant/scripts/cloudflare_ddns.conf.example`
- 日志：`~/.openclaw/ddns.log`
