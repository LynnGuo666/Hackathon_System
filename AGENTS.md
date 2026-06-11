# AGENTS.md - Hackathon System

## 项目简介

Hackathon 参赛者服务系统，包含参赛者端和管理后台两个子系统。

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
│   │   ├── api/routers/     # API 路由（public, auth, participant, admin/）
│   │   ├── core/            # 配置、依赖注入、错误处理、安全
│   │   ├── migrations/      # Alembic 数据库迁移
│   │   ├── repositories/    # 数据访问层（RepositoryMixin 模式）
│   │   ├── schemas/         # Pydantic 数据模型
│   │   └── services/        # 业务逻辑层（ServiceMixin 模式）
│   ├── tests/               # pytest 测试
│   └── pyproject.toml       # 项目配置和版本号
├── frontend/
│   ├── app/                 # Next.js 页面（admin/, p/）
│   ├── components/          # 可复用组件
│   ├── web/lib/api/         # API 客户端
│   └── package.json         # 依赖和版本号
├── CHANGELOG.md             # 更新日志
└── AGENTS.md                # 本文件
```

## 代码规范

### 后端
- **Mixin 模式**: 每个功能模块由 RepositoryMixin + ServiceMixin 组成
- **命名**: Python 代码用 snake_case，Pydantic 模型用 camelCase alias
- **路由**: 参赛者端路由在 `api/routers/`，管理端在 `api/routers/admin/`
- **错误处理**: 继承 `AppError`，使用 `Conflict`、`NotFound` 等预定义错误类
- **数据库**: 日期存储为 ISO 文本，ID 使用 `new_id("prefix")` 生成

### 前端
- **页面**: 使用 `"use client"` 客户端组件
- **API 调用**: 通过 `web/lib/api/` 统一管理
- **UI 组件**: 使用 HeroUI 组件库
- **样式**: Tailwind CSS，使用 `classNames` 自定义

## 版本管理

### 版本号规则
- 使用语义化版本：`MAJOR.MINOR.PATCH`
- 后端版本：`backend-v2/pyproject.toml` 中 `version` 字段
- 前端版本：`frontend/package.json` 中 `version` 字段

### 版本更新流程
1. 修改 `backend-v2/pyproject.toml` 中 `version`
2. 修改 `frontend/package.json` 中 `version`
3. 在 `CHANGELOG.md` 顶部添加新版本条目
4. 提交时 commit message 格式：`feat: xxx` 或 `fix: xxx`

### CHANGELOG 格式
```markdown
## [版本号] - YYYY-MM-DD

### Added
- 新功能

### Changed
- 功能变更

### Fixed
- Bug 修复
```

## 测试

### 后端测试
```bash
cd backend-v2
.venv/bin/pytest tests/ -x -q
```

### 前端检查
```bash
cd frontend
npm run lint
npm run build
```

## 提交规范

Commit message 格式：`<type>: <description>`

类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构
- `docs`: 文档更新
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
- `feat: add enrollment system`
- `fix: resolve login redirect issue`
- `docs: update CHANGELOG for v0.2.0`
