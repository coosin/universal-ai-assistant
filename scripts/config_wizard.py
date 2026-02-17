#!/usr/bin/env python3
"""
配置向导：交互式生成 ~/.openclaw/openclaw.json
"""
import json
import os
import sys
from pathlib import Path

CONFIG_PATH = Path.home() / ".openclaw" / "openclaw.json"
EXAMPLE = {
    "agent": {
        "model": "anthropic-claude-code/claude-opus-4-6",
        "baseURL": "http://localhost:8080/v1",
        "apiKey": "",
        "fallbacks": ["groq/llama-3.1-70b-versatile"],
    },
    "agents": {
        "list": [
            {"id": "coding", "model": "anthropic-claude-code/claude-opus-4-6", "baseURL": "http://localhost:8080/v1", "apiKey": "", "tools": {"profile": "coding"}},
            {"id": "moneymaker", "model": "anthropic-claude-code/claude-opus-4-6", "baseURL": "http://localhost:8080/v1", "apiKey": "", "tools": {"profile": "full"}},
            {"id": "analytics", "model": "groq/llama-3.1-70b-versatile", "tools": {"allow": ["exec", "read", "write", "message"]}},
        ]
    },
    "cron": {"enabled": True},
    "gateway": {"bind": "127.0.0.1", "port": 18789},
}


def prompt(msg, default=""):
    if default:
        s = input(f"{msg} [{default}]: ").strip() or default
    else:
        s = input(f"{msg}: ").strip()
    return s


def main():
    print("=== OpenClaw 配置向导 ===\n")
    base_url = prompt("CLIProxyAPI baseURL", "http://localhost:8080/v1")
    api_key = prompt("CLIProxyAPI API Key（必填）")
    if not api_key:
        print("API Key 不能为空，退出。")
        return 1
    tel_token = prompt("Telegram Bot Token（可选，直接回车跳过）")
    tel_user = prompt("Telegram 允许的用户 ID（可选，直接回车跳过）")

    cfg = json.loads(json.dumps(EXAMPLE))
    cfg["agent"]["baseURL"] = base_url
    cfg["agent"]["apiKey"] = api_key
    for a in cfg["agents"]["list"]:
        if "baseURL" in a:
            a["baseURL"] = base_url
        if "apiKey" in a:
            a["apiKey"] = api_key
    if tel_token:
        cfg["channels"] = cfg.get("channels") or {}
        cfg["channels"]["telegram"] = {"botToken": tel_token}
        if tel_user:
            cfg["channels"]["telegram"]["allowFrom"] = [s.strip() for s in tel_user.split(",")]

    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    print(f"\n已写入: {CONFIG_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
