"""通用异步任务注册与执行。

任务通过 task_type 字符串 + payload dict 定义，用 @register_task 装饰器绑定 handler。
worker 领取任务后查 registry 调对应 handler。新增任务类型只需写一个 handler 并注册。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable

from app.core.errors import AppError
from app.schemas import AsyncTask

if TYPE_CHECKING:
    from app.core.config import Settings
    from app.repositories.sqlite import SQLiteRepository

# handler 签名：(payload, ctx) -> result 字符串。抛异常由 worker 记 failed。
TaskHandler = Callable[["dict", "TaskContext"], str]

TASK_REGISTRY: dict[str, TaskHandler] = {}


def register_task(task_type: str) -> Callable[[TaskHandler], TaskHandler]:
    """装饰器：注册某个 task_type 的 handler。"""

    def decorator(handler: TaskHandler) -> TaskHandler:
        TASK_REGISTRY[task_type] = handler
        return handler

    return decorator


@dataclass
class TaskContext:
    """注入给 handler 的运行上下文：能读配置、读写仓储、解密凭据。"""

    repository: "SQLiteRepository"
    settings: "Settings"


class UnknownTaskType(AppError):
    status_code = 500


def execute_task(task: AsyncTask, ctx: TaskContext) -> str:
    """查 registry 找 handler 执行。未注册的类型抛 UnknownTaskType。"""
    handler = TASK_REGISTRY.get(task.task_type)
    if not handler:
        raise UnknownTaskType(f"no handler registered for task_type={task.task_type}")
    return handler(task.payload, ctx)
