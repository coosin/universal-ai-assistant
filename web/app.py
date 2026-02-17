#!/usr/bin/env python3
"""
Web 管理界面 - 轻量 Flask 后端
提供状态、健康检查、配置校验 API，并托管前端静态页
"""
import os
import subprocess
import sys
from pathlib import Path

from flask import Flask, jsonify, send_from_directory

# 项目根目录（web 的上一级）
ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

app = Flask(__name__, static_folder="static", static_url_path="")


def run_script(script_path: str, timeout: int = 15):
    path = ROOT / script_path
    if not path.exists():
        return False, f"脚本不存在: {path}"
    try:
        out = subprocess.run(
            ["bash", str(path)],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=ROOT,
            env={**os.environ, "HOME": os.environ.get("HOME", str(Path.home()))},
        )
        return out.returncode == 0, (out.stdout or "") + (out.stderr or "")
    except subprocess.TimeoutExpired:
        return False, "执行超时"
    except Exception as e:
        return False, str(e)


def port_open(port: int) -> bool:
    try:
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            return s.connect_ex(("127.0.0.1", port)) == 0
    except Exception:
        return False


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/status")
def api_status():
    return jsonify({
        "gateway_18789": port_open(18789),
        "cliproxyapi_8080": port_open(8080),
        "cliproxyapi_8081": port_open(8081),
        "openclaw_config": (Path.home() / ".openclaw" / "openclaw.json").exists(),
        "cliproxyapi_config": (Path.home() / ".cliproxyapi" / "config" / "config.yaml").exists(),
    })


@app.route("/api/health")
def api_health():
    ok, output = run_script("scripts/health_check.sh")
    return jsonify({"ok": ok, "output": output})


@app.route("/api/validate")
def api_validate():
    ok, output = run_script("scripts/validate_config.sh")
    return jsonify({"ok": ok, "output": output})


def main():
    port = int(os.environ.get("PORT", 8888))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Web 管理界面: http://127.0.0.1:{port}")
    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
