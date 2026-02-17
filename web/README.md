# Web 管理界面

轻量仪表盘：查看服务状态、运行配置校验与健康检查。

## 安装依赖

```bash
pip install -r web/requirements.txt
```

## 启动

在**项目根目录**执行：

```bash
python3 web/app.py
```

或：

```bash
./scripts/start_web.sh
```

默认端口 8888，浏览器打开 http://127.0.0.1:8888 。

## 环境变量

- `PORT`：端口，默认 8888
- `HOST`：监听地址，默认 0.0.0.0

## API

- `GET /api/status` - 服务与配置文件状态
- `GET /api/validate` - 执行配置校验脚本
- `GET /api/health` - 执行健康检查脚本
