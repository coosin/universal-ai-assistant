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
   当前优化后的顺序（优先有额度且推理强的模型）：  
   **primary** → **fallback1** → **fallback2** → …（见 `openclaw.json` 中 `agents.defaults.model`）

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

---

## 四、「先显示余额不足，然后马上正常」说明

这是 **OpenClaw 的 fallback 机制在按设计工作**，不是异常：

1. **第一次请求**：用 **primary** 模型（例如 `openrouter/openrouter/free`）发请求。
2. **若上游返回 402/余额不足**：OpenClaw 会**先把这条错误展示给你**，再按 `fallbacks` 顺序换下一个模型重试。
3. **第二次请求**：用第一个 fallback（例如 `cliproxy/openrouter-free`）再发，若该模型/账号有额度就成功，所以你看到「马上正常」。

所以会「先余额不足再正常」= primary 用的 key/账号没额度 → 报错展示 → fallback 用另一个 key/模型成功。

**若希望尽量不看到这条提示**：

- 保证 **primary** 使用的 API Key 在对应平台有可用额度（例如 OpenRouter 新 key 已在 `.env` 与 CLIProxyAPI 中一致配置）。
- 重启 **OpenClaw Gateway**（以及加载了 `.env` 的进程），确保进程内读到的是新 key，这样 primary 第一次就成功，不会先 402。
- 或把最稳定、有额度的模型放在 primary，把容易 402 的放在 fallback。

---

## 五、谁选模型、谁在出错时切换？（重要）

- **模型选择与顺序**：由 **OpenClaw** 在 `~/.openclaw/openclaw.json` 的 `agents.defaults.model`（primary + fallbacks）里配置。**CLIProxyAPI 不选模型、不推荐模型**，只按 OpenClaw 发来的「用哪个模型」做转发；它只负责把请求发到对应厂商并返回结果或错误。
- **出错后换模型**：也是 **OpenClaw** 在做。当某次请求返回 402/余额不足或其它错误时，OpenClaw 会按 fallbacks 顺序自动换下一个模型重试。CLIProxyAPI 只把单次请求的成功/失败返回给 OpenClaw，不会自己“推荐下一个模型”或“自动换掉”。
- **当前优化**：已在 openclaw 中把 **primary** 设为有额度且推理较强的模型（如 `cliproxy/gemini-3-pro`），fallbacks 按强度与额度情况排序，这样第一次请求更容易成功，减少“先报余额不足再正常”的出现。
