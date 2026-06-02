# Backend V2

模块化 FastAPI 后端，保持现有 Go 后端的 API 契约，便于逐步迁移和扩展。

## 结构

```text
app/
├── api/routers/        # HTTP 路由
├── core/               # 配置、异常、鉴权依赖
├── migrations/         # Alembic 数据库迁移
├── repositories/       # SQLite 持久化
├── services/           # 业务逻辑
├── schemas.py          # Pydantic 数据模型
└── main.py             # 应用组装入口
```

## 本地运行

推荐直接使用启动脚本：

```bash
cd backend-v2
./start-backend.sh
```

脚本会自动创建/使用 `.venv`，安装依赖，并启动 `uvicorn`。默认配置：

- `ADMIN_TOKEN=secret`
- `DATABASE_PATH=./hackathon.sqlite`
- `CORS_ORIGIN=http://localhost:3000`
- `HOST=0.0.0.0`
- `PORT=8080`

也可以覆盖配置：

```bash
ADMIN_TOKEN=your-token PORT=8081 ./start-backend.sh
```

手动启动方式：

```bash
cd backend-v2
python -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

## 数据库迁移

应用启动时会自动执行：

```bash
alembic upgrade head
```

也可以手动执行：

```bash
cd backend-v2
DATABASE_PATH=./hackathon.sqlite alembic upgrade head
```

默认配置：

- `DATABASE_PATH=./hackathon.sqlite`
- `ADMIN_TOKEN=`（为空时管理员接口返回 `503`）
- `STATIC_DIR=`（设置后托管前端静态资源和 SPA fallback）
- `CORS_ORIGIN=http://localhost:3000`
