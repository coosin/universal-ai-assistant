# Web 管理界面 - 打不开时的排查

## 1. 确认服务已启动

在**项目根目录**执行（在 WSL 里执行，不要用 Windows PowerShell 混用）：

```bash
cd /home/cool/universal-ai-assistant
pip install -r web/requirements.txt
python3 web/app.py
```

看到类似输出说明已启动：
```
  Web 管理界面已启动，在浏览器中打开以下地址之一：
    http://127.0.0.1:8888
    http://localhost:8888
```

若报错 `ModuleNotFoundError: No module named 'flask'`，先执行：`pip install -r web/requirements.txt`。

---

## 2. 在 WSL 里运行、在 Windows 浏览器里打开

- **优先试**：http://localhost:8888 或 http://127.0.0.1:8888  
  WSL2 一般会把端口转发到 Windows，用本机浏览器即可。

- **若打不开**：看终端里是否多了一行「本机/WSL IP」的地址，例如：
  ```text
  http://172.22.123.45:8888  (本机/WSL IP，若上面打不开可试此地址)
  ```
  在浏览器里打开这个地址试一下。

- **仍打不开**：在 WSL 里查本机 IP：
  ```bash
  hostname -I | awk '{print $1}'
  ```
  浏览器访问：`http://<得到的IP>:8888`。  
  若 Windows 防火墙提示，选择「允许访问」。

---

## 3. 换端口再试

8888 可能被占用，换一个端口：

```bash
PORT=9999 python3 web/app.py
```

然后打开：http://127.0.0.1:9999 或 http://localhost:9999。

---

## 4. 确认是在 WSL 里启动

若在 **Windows 的 CMD/PowerShell** 里运行 `python web/app.py`：

- 用的是 Windows 的 Python，需要先在 Windows 里安装 Flask：`pip install flask`
- 然后在本机浏览器访问 http://127.0.0.1:8888

建议统一在 **WSL 终端** 里执行上述命令，再用浏览器访问。

---

## 5. 快速自测端口是否通

在 WSL 里另开一个终端：

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8888/
```

若输出 `200`，说明服务正常，多半是浏览器或访问地址不对；若不是 200 或报错，说明服务没起来或端口不对。
