#!/usr/bin/env python3
"""赚钱助手主脚本 - AI 可调用"""
import json, sys
from pathlib import Path

def main():
    opportunities = [
        {"name": "在线接单", "platform": "Fiverr/Upwork", "risk": "低"},
        {"name": "加密货币", "platform": "Binance", "risk": "高", "requires_confirmation": True},
    ]
    best = next((o for o in opportunities if o.get("risk") == "低"), opportunities[0])
    out = {"selected": best["name"], "message": "请配置对应脚本后执行"}
    print(json.dumps(out, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    sys.exit(main())
