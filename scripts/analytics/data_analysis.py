#!/usr/bin/env python3
"""
数据分析示例脚本 - 读取 CSV 做简单统计
依赖: pip install pandas
用法: python data_analysis.py <file.csv>
"""
import json
import sys
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        out = {
            "usage": "python data_analysis.py <file.csv>",
            "message": "请传入 CSV 文件路径。若未安装 pandas，将仅返回文件行数。",
        }
        try:
            import pandas as pd
            out["pandas"] = "ok"
        except ImportError:
            out["pandas"] = "not installed"
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0

    path = Path(sys.argv[1])
    if not path.exists():
        print(json.dumps({"error": "文件不存在", "path": str(path)}, ensure_ascii=False))
        return 1

    try:
        import pandas as pd
        df = pd.read_csv(path, nrows=10000)
        summary = {
            "rows": len(df),
            "columns": list(df.columns),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "head": df.head(3).to_dict(orient="records"),
        }
        if df.select_dtypes(include=["number"]).size > 0:
            summary["describe"] = df.describe().to_dict()
        print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))
    except ImportError:
        with open(path, encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
        print(json.dumps({"rows": len(lines), "message": "未安装 pandas，仅统计行数"}, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    sys.exit(main())
