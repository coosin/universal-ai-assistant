# 用 SSH 推送（解决 GnuTLS -110 错误）

HTTPS 推送若出现 `GnuTLS recv error (-110): The TLS connection was non-properly terminated`，可改用 SSH 推送。

## 1. 把本机公钥加到 GitHub

本机已生成公钥，内容如下（若你已添加过其它机器的公钥，可跳过）：

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG1tbU8v5hxhoCTNVV369MVQ5T0fTga4wWqGok7twJkt coosin@github
```

在 GitHub 网页：**Settings → SSH and GPG keys → New SSH key**，Title 随便填（如 `home-server`），Key 粘贴上面整行，保存。

## 2. 推送

当前仓库已改为 SSH 地址，在项目目录执行：

```bash
cd /home/cool/universal-ai-assistant
git push origin main
```

首次连接会提示 `Are you sure you want to continue connecting?`，输入 `yes` 即可。

**home 无直连外网时**：已在 `~/.ssh/config` 为 `Host github.com` 配置 `ProxyCommand nc -X 5 -x 127.0.0.1:7891 %h %p`，推送会经本机 Clash SOCKS5（7891）。确保 Clash 已启动；面板「Git 快速推送」同样走该配置。

## 3. 改回 HTTPS（可选）

若以后想用 HTTPS：

```bash
git remote set-url origin https://github.com/coosin/universal-ai-assistant.git
```
