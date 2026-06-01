# 黑客松服务系统实现说明

## 身份规则

- 赛前使用 `email` 作为登录与需求填写身份。
- 邮箱验证码验证成功后，系统创建 `pending` 状态选手。
- 现场签到后绑定 `CheckinID`，选手状态变为 `active`。
- 赛中资源发放、核销、审计均使用 `CheckinID`。

## SQLite 数据约束

- `participants.email` 唯一。
- `participants.checkin_id` 唯一，但允许赛前为空。
- `resource_assignments(checkin_id, pool_id)` 唯一，保证一个资源池内一人一份。
- `resource_assignments.resource_item_id` 唯一，保证一个兑换码不会发给多人。

## 邮件 Outbox

邮件不在业务操作中直接发送，而是写入 `email_outbox`：

1. 验证码、签到成功、资源发放写入待发送邮件。
2. 邮件发送失败不回滚主业务。
3. 后台可通过邮件队列重试失败任务。

## API 启动

```bash
cd backend
DATABASE_PATH=./hackathon.sqlite go run ./cmd/server
```

默认监听 `:8080`。

## 前端启动与挂载

```bash
cd frontend
npm install
npm run dev
```

默认访问 `http://localhost:3000`。

生产构建：

```bash
cd frontend
npm run build
cd ../backend
STATIC_DIR=../frontend/out go run ./cmd/server
```

构建后 Go 后端会挂载静态前端；开发时仍然可以用 Next dev server。
