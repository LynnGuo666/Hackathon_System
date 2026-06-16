"""后台任务 worker：轮询 async_tasks 表，领取并执行任务。

进程内单线程运行（由 lifespan 启动为 daemon 线程）。SQLite 单连接由 BEGIN IMMEDIATE
+ busy_timeout 串行化写，因此 worker 线程与请求线程共用连接是安全的。
"""

from __future__ import annotations

import logging
import threading
import time
from typing import TYPE_CHECKING

from app.services.tasks import TaskContext, execute_task

if TYPE_CHECKING:
    from app.core.config import Settings
    from app.repositories.sqlite import SQLiteRepository

logger = logging.getLogger("task-worker")

# 第 N 次失败后的退避秒数上限。指数退避避免对下游（SMTP/邮件服务）形成重试风暴。
MAX_BACKOFF_SECONDS = 300


class TaskWorker:
    def __init__(
        self,
        repository: "SQLiteRepository",
        settings: "Settings",
        *,
        poll_interval: float | None = None,
        batch_size: int | None = None,
    ) -> None:
        self.repository = repository
        self.settings = settings
        self.poll_interval = poll_interval if poll_interval is not None else settings.task_worker_poll_interval
        self.batch_size = batch_size if batch_size is not None else settings.task_worker_batch_size
        self._stop = threading.Event()

    def stop(self) -> None:
        self._stop.set()

    def run_forever(self) -> None:
        logger.info("task worker started (poll=%.1fs batch=%d)", self.poll_interval, self.batch_size)
        while not self._stop.is_set():
            try:
                self.tick()
            except Exception:
                # tick 内部已兜底单任务异常，这里只防 claim 层面的不可预期错误拖垮线程。
                logger.exception("task worker tick failed")
            self._stop.wait(self.poll_interval)
        logger.info("task worker stopped")

    def tick(self) -> int:
        """领取并执行一批任务，返回本轮处理数量。测试可单独调用而无需启动线程。"""
        tasks = self.repository.claim_pending_tasks(limit=self.batch_size)
        ctx = TaskContext(repository=self.repository, settings=self.settings)
        for task in tasks:
            try:
                result = execute_task(task, ctx)
                self.repository.mark_task_succeeded(task.id, result)
            except Exception as exc:
                # 失败次数从 1 开始计；第 N 次退避 = min(MAX, 10 * 2^(N-1))。
                attempt_after = task.attempts + 1
                backoff = min(MAX_BACKOFF_SECONDS, 10 * (2 ** max(0, attempt_after - 1)))
                logger.warning(
                    "task %s failed (attempt %d): %s; backoff=%ds",
                    task.id,
                    attempt_after,
                    exc,
                    backoff,
                )
                self.repository.mark_task_failed(task.id, str(exc), backoff_seconds=backoff)
        return len(tasks)

    @staticmethod
    def backoff_seconds(attempts: int) -> int:
        return min(MAX_BACKOFF_SECONDS, 10 * (2 ** max(0, attempts - 1)))
