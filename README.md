# Hackathon 参赛者服务系统

一个为 Hackathon 赛事提供参赛者服务的全栈系统，包含参赛者端和管理后台两个子系统。

## 技术栈

### 后端 (`backend-v2/`)
- **框架**: FastAPI + Uvicorn
- **数据库**: SQLite + SQLAlchemy + Alembic 迁移
- **验证**: Pydantic v2
- **Python**: 3.12+

### 前端 (`frontend/`)
- **框架**: Next.js 15 (App Router)
- **UI 库**: HeroUI v2 + Tailwind CSS v4
- **语言**: TypeScript
- **图标**: Lucide React

## 项目结构

```
├── backend-v2/
│   ├── app/
│   │   ├── api/routers/     # API 路由
│   │   ├── core/            # 配置、依赖注入、错误处理、安全
│   │   ├── migrations/      # Alembic 数据库迁移
│   │   ├── repositories/    # 数据访问层
│   │   ├── schemas/         # Pydantic 数据模型
│   │   └── services/        # 业务逻辑层
│   └── tests/               # pytest 测试
├── frontend/
│   ├── app/                 # Next.js 页面
│   ├── components/          # 可复用组件
│   └── web/lib/api/         # API 客户端
├── CHANGELOG.md             # 更新日志
└── AGENTS.md                # AI 助手指南
```

## 快速开始

### 一键启动

```bash
./start.sh
```

脚本会自动：
1. 创建后端 Python 虚拟环境并安装依赖
2. 构建前端静态资源
3. 启动后端服务（默认端口 8080）

访问 http://localhost:8080 即可使用。

### 手动启动

#### 开发模式：前后端分开运行

```bash
cd backend-v2
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

#### 前端

```bash
cd frontend
npm install
npm run dev
```

后端默认运行在 http://localhost:8080。
前端开发服务器默认运行在 http://localhost:3000。

#### 生产/演示模式：前端 build 后由后端托管

前端使用 Next.js 静态导出，`npm run build` 后会生成 `frontend/out`。
后端通过 `STATIC_DIR` 环境变量挂载这个目录。

```bash
# 1. 构建前端静态产物
cd frontend
npm install
npm run build

# 2. 启动后端并挂载 frontend/out
cd ../backend-v2
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
STATIC_DIR=../frontend/out uvicorn app.main:app --host 0.0.0.0 --port 8080
```

访问 http://localhost:8080 即可同时使用参赛者端、管理后台和后端 API。

挂载规则：
- `/_next/*` 由后端直接返回 Next.js 静态资源
- `/api/*` 保持为后端 API，不会被前端页面兜底捕获
- 其他路径优先匹配 `frontend/out` 中的文件或 HTML 页面

## 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ADMIN_TOKEN` | `secret` | 管理员 API Token |
| `DATABASE_PATH` | `./hackathon.sqlite` | SQLite 数据库路径 |
| `STATIC_DIR` | 空 | 前端静态导出目录，例如 `../frontend/out` |
| `CORS_ORIGIN` | `http://localhost:3000` | CORS 允许的来源 |
| `HOST` | `0.0.0.0` | 后端监听地址 |
| `PORT` | `8080` | 后端监听端口 |

### Docker 部署

```bash
docker compose up -d
```

Docker 镜像会在构建阶段执行前端 build，并将 `frontend/out` 复制进镜像。
运行时默认设置 `STATIC_DIR=/app/frontend/out`，所以后端会直接托管前端页面。

服务将在 http://localhost:8080 启动，数据持久化到 Docker volume。

## 功能模块

### 参赛者端
- 总览页面
- 个人资料管理
- 住宿需求填写
- 签到身份验证
- 资源领取

### 管理后台
- 账号管理
- CheckinID 管理
- 资源发放
- 邮件队列
- 餐饮补给（支持模板批量导入）
- 赛前需求
- 异步任务管理
- 邮件配置
- 插件集成（上级系统对接、OAuth、事件上报）

## 开发

### 代码规范

- 后端：Python snake_case，Pydantic camelCase alias
- 前端：TypeScript，HeroUI 组件库
- 提交格式：`<type>: <description>`（feat/fix/refactor/docs/test/chore）

### 测试

```bash
# 后端测试
cd backend-v2
.venv/bin/pytest tests/ -x -q

# 前端检查
cd frontend
npm run lint
npm run build
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)

当前版本：**v0.6.0**
