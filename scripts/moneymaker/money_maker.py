#!/usr/bin/env python3
"""
赚钱助手主脚本 - AI 可调用
分析机会、选择方案、执行或返回需确认的说明
"""
import json
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent
RESULTS_FILE = WORKSPACE.parent.parent / "results.json"


def list_opportunities():
    return [
        {
            "id": "online_gig",
            "name": "在线接单",
            "platform": "Fiverr/Upwork/猪八戒",
            "risk": "低",
            "potential": "中",
            "script": "fiverr_placeholder.py",
            "requires_confirmation": False,
        },
        {
            "id": "crypto",
            "name": "加密货币",
            "platform": "Binance/OKX",
            "risk": "高",
            "potential": "高",
            "script": "crypto_placeholder.py",
            "requires_confirmation": True,
        },
        {
            "id": "content",
            "name": "内容创作",
            "platform": "知乎/Medium/公众号",
            "risk": "低",
            "potential": "中",
            "script": "content_placeholder.py",
            "requires_confirmation": False,
        },
    ]


def select_best(opportunities):
    low_risk = [o for o in opportunities if o.get("risk") == "低"]
    return low_risk[0] if low_risk else opportunities[0]


def main():
    opportunities = list_opportunities()
    best = select_best(opportunities)
    out = {
        "opportunities": opportunities,
        "selected": best["name"],
        "platform": best["platform"],
        "risk": best["risk"],
        "requires_confirmation": best.get("requires_confirmation", False),
        "message": "高风险操作需用户确认后再执行对应脚本；低风险可调用对应 script 占位脚本（需自行实现具体逻辑）。",
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
