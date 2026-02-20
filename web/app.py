#!/usr/bin/env python3
"""
Web 管理界面 - 轻量 Flask 后端
提供状态、健康检查、配置校验 API，并托管前端静态页
"""
import os
import subprocess
import sys
from pathlib import Path

try:
    from flask import Flask, jsonify, send_from_directory
except ImportError:
    print("请先安装依赖: pip install -r web/requirements.txt")
    sys.exit(1)

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
        "cliproxyapi_8317": port_open(8317),
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
    print("")
    print("  Web 管理界面已启动，在浏览器中打开以下地址之一：")
    print("    http://127.0.0.1:%s" % port)
    print("    http://localhost:%s" % port)
    if os.name != "nt":
        try:
            out = subprocess.run(["hostname", "-I"], capture_output=True, text=True, timeout=2, cwd=ROOT)
            if out.returncode == 0 and out.stdout.strip():
                ip = out.stdout.strip().split()[0]
                if ip and not ip.startswith("127."):
                    print("    http://%s:%s  (本机/WSL IP，若上面打不开可试此地址)" % (ip, port))
        except Exception:
            pass
    print("  按 Ctrl+C 停止服务")
    print("")
    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
