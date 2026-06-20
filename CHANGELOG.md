# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-06-20

### Added
- 资源领取模型重构：领取方式（自助领取 / 自助申请审核 / 仅管理员发放）、是否需审核、可重复领取三字段正交设计，弃用旧 distribution_rule 语义
- 角色 tag 机制：报名终审通过自动打「已通过审核」tag、签到绑定自动打「已签到」tag，存独立表 participant_tags
- 池配角色白名单 allowed_tags：选手能否自助领取/申请完全由白名单决定，空数组=最宽松（任何登录选手可领）
- 资源申请审核流：独立表 resource_requests，pending 不分配 item，管理员批准时才分配并回填 assignment_id，拒绝不归还
- 两个系统开关（site_config）：enrollment_review_enabled / checkin_enabled，关闭时对应 tag 在池白名单中灰显不可选
- 迁移 0018_resource_claim_model：新三列 + 旧 distribution_rule→claim_mode 数据映射、两系统开关列、participant_tags / resource_requests 表
- 选手端 /p/resources 自助领取/申请入口与「我的申请」段，管理端申请审批面板
- 端点：选手 POST /resources/{id}/apply、GET /resources/requests、GET /resources/my-eligibility；管理端 GET /resources/requests、POST /resources/requests/{id}/review、GET /resources/allowed-tags

### Changed
- visible_phase 废弃：保留列/字段向后兼容，前端移除编辑 UI、后端不再过滤
- admin 手动发放不受白名单限制（assign_resource 独立路径），选手自助准入走白名单校验
- 报名审核/签到系统开关默认开启，迁移后行为不变

## [0.5.0] - 2026-06-18

### Added
- 插件集成系统：可插拔的 PluginConnector 协议和 registry，支持启用/禁用、配置、加密 secrets 管理
- 内置 supervisor_http 连接器：通过标准 HTTP 对接上级系统，支持 OAuth 登录、事件上报、拉取导入
- 数据库迁移 0015_plugin_system：plugins / plugin_secrets / participant_sessions 表
- 管理端插件页面：插件列表、配置编辑、secrets 管理、连接测试、手动同步
- 参赛者端 OAuth 登录入口（/api/auth/oauth/{provider}/start 与 callback）
- 参赛者会话改用 participant_session cookie，支持登出和后端会话撤销
- 餐饮补给模板导入：管理端粘贴模板内容即可批量创建 meal/drink slot
- 模板预览接口（/admin/meal-supply/templates/preview）和导入接口，支持 create_only / upsert 模式
- 前端模板导入 Modal 与 meal-orders 管理页接入，参赛者端 slot 卡片同步增强

### Changed
- 参赛者认证 cookie 由 participant_email 升级为 participant_session（带服务端会话）
- meal_orders 服务扩展模板解析、去重、批量落库逻辑
- enrollments / participants 服务接入插件事件上报钩子

## [0.4.0] - 2026-06-16

### Added
- 通用异步任务框架：async_tasks 表 + 后台 worker 轮询执行，支持退避重试和手动重试
- 邮件双通道发送：SMTP 和 HTTP（Email_service API）两种 provider，抽象可扩展
- AES-256-GCM 加密凭据存储（task_secrets 表），密钥文件首次启动生成
- 管理端异步任务页面：查看任务列表、筛选、手动重试
- 管理端邮件配置：provider 选择、SMTP/HTTP 配置表单、凭据加密存储
- email_send 任务 handler，发送成功后回写 email_outbox 状态

### Changed
- enqueue_email 现在同时写 email_outbox 和入队 async_tasks（双写桥接）
- Dockerfile 改为 Python 多阶段构建（替换旧 Go 构建）
- docker-compose.yml 适配 Python 后端环境变量

### Fixed
- Docker 构建适配 backend-v2 Python 后端

## [0.3.0] - 2026-06-12

### Changed
- 功能模块排序按赛事生命周期分组（基础设置→赛前收集→赛事运营→运维工具）
- 管理端和参与者端模块 sortOrder 统一为百位/千位数
- 始终启用模块显示为不可操作的开关，而非纯文本

### Fixed
- 修复功能模块开关操作报 "failed to fetch" 的问题（固定模块与后端 feature ID 映射错误）
- 后端补充缺失的邮件队列功能模块（feat_email_outbox）
- 移除功能模块页面冗余的错误提示卡片

## [0.2.0] - 2026-06-11

### Added
- 报名系统：参赛者报名表单和管理端多级审核（初审→复审）
- 版本管理系统：前后端独立版本号，API 暴露版本信息，UI 展示
- AGENTS.md 项目规范文件

### Changed
- 优化导航结构，新增报名相关入口
- 管理后台首页新增报名审核模块

## [0.1.0] - 2026-06-02

### Added
- 初始版本：参赛者服务系统基础功能
- 参赛者端：总览、资料、住宿需求、签到身份、资源领取
- 管理端：账号管理、CheckinID、资源发放、邮件队列、餐饮补给、赛前需求
- 系统配置：比赛基础信息、功能模块、入口导航
- 数据库迁移系统（Alembic）
- 邮件验证码认证
