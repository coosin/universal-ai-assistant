# OpenClaw 调用 CLIProxy 的逻辑 & 为何老是“计费不足”

## 一、OpenClaw 调用 CLIProxy 的流程

1. **请求入口**  
   你执行 `openclaw agent --message "..." --agent moneymaker` 或通过 Web/Telegram 发消息时，请求会发到 **OpenClaw Gateway**（本机端口 18789）。

2. **模型解析**  
   Gateway 根据当前 **agent** 的 `model`（或 `agents.defaults.model`）得到「用哪个模型」：
   - 例如 `cliproxy/claude-sonnet-4-5-20250929` 表示：**provider = cliproxy**，**模型 id = claude-sonnet-4-5-20250929**。

3. **查配置并发请求**  
   - 在 `openclaw.json` 的 `models.providers.cliproxy` 里找到：
     - `baseUrl`：`http://localhost:8317/v1`
     - `apiKey`：你的 CLIProxyAPI Key  
   - Gateway 按 **OpenAI 兼容 API** 向 CLIProxy 发请求：  
     `POST http://localhost:8317/v1/chat/completions`，  
     Header 里带 `Authorization: Bearer <apiKey>`，Body 里 `model` 填 `claude-sonnet-4-5-20250929`（或你配置的其它模型 id）。

4. **CLIProxy 做的事**  
   CLIProxy 用你的 API Key 找到背后绑定的账号（如 Claude Code），用该账号向厂商（如 Anthropic）发起真实推理；再把结果按 OpenAI 格式返回给 OpenClaw。

5. **Fallback（备用模型）**  
   若这次请求**失败**（包括 CLIProxy 返回“计费不足”等错误），OpenClaw 会按 **`agents.defaults.model.fallbacks`** 里的顺序，**依次换下一个模型**再试，直到成功或全部失败。  
   你当前顺序大致是：  
   **primary** → **cliproxy/claude-opus** → **openai-codex/gpt-5.3-codex** → **openrouter/openrouter/free**。

所以：**OpenClaw 只负责“选哪个 provider/模型、往哪个 baseUrl 发请求、失败后换 fallback”；真正做计费校验并返回“计费不足”的是 CLIProxy（以及背后的 Claude/厂商账号）。**

---

## 二、为什么老是显示“计费不足”

- **“计费不足”是 CLIProxy 返回的**，不是 OpenClaw 自己写的。  
  CLIProxy 在每次用 Claude（或其它已配置账号）发请求前，会查该账号的额度/余额；不足就拒绝请求并返回错误，OpenClaw 会把这条错误信息展示给你。

- **你当前 primary 是 cliproxy 的 Claude**（如 `claude-sonnet-4-5-20250929`），所以：
  - 每次对话都会**先**走 CLIProxy 的 Claude；
  - 若 Claude 账号已没额度，你就会**先**看到“计费不足”；
  - 之后 OpenClaw 才会自动用 fallback（例如 Codex、OpenRouter Free），所以理论上后面仍可能成功，只是第一下报错会反复出现。

- **若希望少看到“计费不足”**，可以：
  1. **在 CLIProxy 里给 Claude 账号充值/恢复额度**，或添加有额度的新账号；  
  2. **把 primary 改成不依赖额度的模型**，例如把 **OpenRouter Free** 或 **Codex** 设成 primary，CLIProxy 的 Claude 只作 fallback；  
  3. 确认 **fallback 配置正确**（Codex、OpenRouter 的 provider 和模型 id 在 `openclaw.json` 里都配好），这样即使 primary 报计费不足，也会自动切到下一个模型。

---

## 三、小结

| 环节           | 谁在做 |
|----------------|--------|
| 选模型、选 provider、发 HTTP 请求 | OpenClaw Gateway |
| 收到请求、查账号、向厂商发推理、计费校验 | CLIProxy |
| 返回“计费不足”等错误               | CLIProxy（额度不足时） |
| 收到错误后换 fallback 再试         | OpenClaw |

因此：**调用逻辑是 OpenClaw → CLIProxy（8317）→ 厂商；老是显示计费不足，是因为 primary 用的是 CLIProxy 的 Claude，而该账号额度不足，CLIProxy 先报错，OpenClaw 再按 fallback 换别的模型。**
