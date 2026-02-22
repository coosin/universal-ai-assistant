#!/usr/bin/env python3
"""
配置向导：交互式生成 ~/.openclaw/openclaw.json（OpenClaw 新 schema：agents.defaults + models.providers）
"""
import json
import sys
from pathlib import Path

CONFIG_PATH = Path.home() / ".openclaw" / "openclaw.json"

# 新 schema：无 agent.*，用 agents.defaults + models.providers
EXAMPLE = {
    "gateway": {
        "mode": "local",
        "bind": "loopback",
        "port": 18789,
        "auth": {"token": "local-dev-token"},
        "remote": {"token": "local-dev-token"},
    },
    "models": {
        "mode": "merge",
        "providers": {
            "cliproxy": {
                "baseUrl": "http://localhost:8317/v1",
                "apiKey": "",
                "api": "openai-completions",
                "models": [],
            }
        },
    },
    "agents": {
        "defaults": {
            "model": {"primary": "", "fallbacks": []},
            "models": {},
        },
        "list": [
            {"id": "coding", "default": True, "model": "", "tools": {"profile": "coding"}},
            {"id": "moneymaker", "model": "", "tools": {"profile": "full"}},
            {"id": "analytics", "model": "", "tools": {"allow": ["exec", "read", "write", "message"]}},
        ],
    },
    "cron": {"enabled": True},
}


def prompt(msg, default=""):
    if default:
        s = input(f"{msg} [{default}]: ").strip() or default
    else:
        s = input(f"{msg}: ").strip()
    return s


def prompt_bool(msg: str, default: bool = False) -> bool:
    d = "Y/n" if default else "y/N"
    s = input(f"{msg} ({d}): ").strip().lower()
    if not s:
        return default
    return s in ("y", "yes", "true", "1")


def _pretty_name(model_id: str) -> str:
    mid = model_id.strip()
    if mid.startswith("gemini-"):
        return f"{mid} (Gemini / CLIProxy)"
    if mid.startswith("claude-"):
        return f"{mid} (Claude / CLIProxy)"
    return f"{mid} (CLIProxy)"


def main():
    print("=== OpenClaw 配置向导（新 schema）===\n")
    base_url = prompt("CLIProxyAPI baseURL", "http://localhost:8317/v1")
    api_key = prompt("CLIProxyAPI API Key（必填）")
    if not api_key:
        print("API Key 不能为空，退出。")
        return 1
    primary_id = prompt("CLIProxy 主模型 ID", "claude-sonnet-4-5-20250929")
    fallback_id = prompt("CLIProxy 备用模型 ID", "claude-opus-4-1-20250805")
    use_codex = prompt_bool("加入 Codex 作为 fallback（需先 openclaw onboard 配置）", default=True)
    use_openrouter = prompt_bool("加入 OpenRouter Free 作为最终 fallback（需设置 OPENROUTER_API_KEY）", default=False)
    tel_token = prompt("Telegram Bot Token（可选，直接回车跳过）")
    tel_user = prompt("Telegram 允许的用户 ID（可选，直接回车跳过）")

    cfg = json.loads(json.dumps(EXAMPLE))
    cfg["models"]["providers"]["cliproxy"]["baseUrl"] = base_url.rstrip("/") + "/v1" if not base_url.rstrip().endswith("/v1") else base_url.strip()
    cfg["models"]["providers"]["cliproxy"]["apiKey"] = api_key
    cfg["models"]["providers"]["cliproxy"]["models"] = [
        {"id": primary_id, "name": _pretty_name(primary_id)},
        {"id": fallback_id, "name": _pretty_name(fallback_id)},
    ]

    primary_ref = f"cliproxy/{primary_id}"
    fallbacks = [f"cliproxy/{fallback_id}"]
    if use_codex:
        fallbacks.append("openai-codex/gpt-5.3-codex")
    if use_openrouter:
        cfg["models"]["providers"]["openrouter"] = {
            "baseUrl": "https://openrouter.ai/api/v1",
            "apiKey": "${OPENROUTER_API_KEY}",
            "api": "openai-completions",
            "models": [{"id": "openrouter/free", "name": "OpenRouter Free (router)"}],
        }
        fallbacks.append("openrouter/openrouter/free")

    cfg["agents"]["defaults"]["model"]["primary"] = primary_ref
    cfg["agents"]["defaults"]["model"]["fallbacks"] = fallbacks
    cfg["agents"]["defaults"]["models"] = {
        primary_ref: {"alias": "primary"},
        f"cliproxy/{fallback_id}": {"alias": "fallback"},
    }
    for a in cfg["agents"]["list"]:
        a["model"] = primary_ref

    if tel_token:
        cfg["channels"] = cfg.get("channels") or {}
        cfg["channels"]["telegram"] = {"enabled": True, "botToken": tel_token}
        if tel_user:
            cfg["channels"]["telegram"]["allowFrom"] = [s.strip() for s in tel_user.split(",")]

    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    print(f"\n已写入: {CONFIG_PATH}")
    if use_openrouter:
        print("\n提示：你选择启用了 OpenRouter Free，请确保在启动 Gateway 前设置环境变量 OPENROUTER_API_KEY。")
        print("推荐在项目根目录创建 .env（参考 .env.example），然后用 ./start.sh 启动。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
