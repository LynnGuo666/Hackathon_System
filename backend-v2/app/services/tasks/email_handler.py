import json
import logging

from app.services.email.providers import EmailMessage, build_provider
from app.services.tasks import TaskContext, register_task

logger = logging.getLogger("email-handler")


@register_task("email_send")
def handle_email_send(payload: dict, ctx: TaskContext) -> str:
    """执行邮件发送任务。

    payload: {outbox_id, to, subject, body}
    从 site_config 读取 provider 配置，从 task_secrets 读取加密凭据。
    发送成功后回写 email_outbox 的 status/sent_at。
    """
    config = ctx.repository.get_site_config()
    provider_name = config.get("email_provider", "disabled")
    provider = build_provider(provider_name)

    message = EmailMessage(
        to=payload["to"],
        subject=payload["subject"],
        body=payload["body"],
    )

    def get_secret(key: str) -> str:
        return ctx.repository.get_secret(key)

    result = provider.send(message, config, get_secret)

    outbox_id = payload.get("outbox_id")
    if outbox_id:
        from datetime import UTC, datetime

        now = datetime.now(UTC)
        ctx.repository.mark_email_sent(outbox_id, now)

    return json.dumps({"provider": result.provider, "message_id": result.message_id})
