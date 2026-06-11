# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
