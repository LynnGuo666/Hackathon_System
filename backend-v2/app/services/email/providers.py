from __future__ import annotations

import json
import logging
import smtplib
import ssl
import urllib.error
import urllib.request
from dataclasses import dataclass
from email.mime.text import MIMEText
from typing import Protocol

logger = logging.getLogger("email-provider")


@dataclass
class EmailMessage:
    to: str
    subject: str
    body: str


@dataclass
class SendResult:
    provider: str
    message_id: str = ""


class EmailProvider(Protocol):
    def send(self, message: EmailMessage, config: dict, get_secret: callable) -> SendResult: ...


class DisabledProvider:
    """不发送邮件，只入队。安全降级：系统可正常运行但邮件不会实际投递。"""

    def send(self, message: EmailMessage, config: dict, get_secret: callable) -> SendResult:
        logger.info("email provider disabled; skipping send to %s", message.to)
        return SendResult(provider="disabled")


class SMTPProvider:
    """通过 SMTP 发送邮件（标准库 smtplib，无额外依赖）。"""

    def send(self, message: EmailMessage, config: dict, get_secret: callable) -> SendResult:
        host = config.get("smtp_host", "")
        port = int(config.get("smtp_port", 587))
        username = config.get("smtp_username", "")
        from_addr = config.get("smtp_from", username)
        security = config.get("smtp_security", "starttls")
        password = get_secret("smtp_password")

        if not host:
            raise ValueError("smtp_host is required")
        if not password:
            raise ValueError("smtp_password is required (set via email-secrets API)")

        msg = MIMEText(message.body, "plain", "utf-8")
        msg["Subject"] = message.subject
        msg["From"] = from_addr
        msg["To"] = message.to

        if security == "ssl":
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, timeout=30, context=context) as server:
                server.login(username, password)
                server.sendmail(from_addr, [message.to], msg.as_string())
        elif security == "starttls":
            with smtplib.SMTP(host, port, timeout=30) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(username, password)
                server.sendmail(from_addr, [message.to], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=30) as server:
                if username and password:
                    server.login(username, password)
                server.sendmail(from_addr, [message.to], msg.as_string())

        logger.info("email sent via SMTP to %s", message.to)
        return SendResult(provider="smtp")


class HTTPProvider:
    """调用 Email_service HTTP API 发送邮件。"""

    def send(self, message: EmailMessage, config: dict, get_secret: callable) -> SendResult:
        base_url = config.get("email_service_url", "").rstrip("/")
        account_id = config.get("email_service_account_id", "")
        api_key = get_secret("email_service_api_key")

        if not base_url:
            raise ValueError("email_service_url is required")
        if not api_key:
            raise ValueError("email_service_api_key is required (set via email-secrets API)")

        url = f"{base_url}/api/send"
        payload = {
            "account_id": account_id,
            "to": [message.to],
            "subject": message.subject,
            "body": message.body,
            "body_type": "text/plain",
        }
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode("utf-8")
                result = json.loads(body) if body else {}
                msg_id = result.get("message_id", result.get("id", ""))
                logger.info("email sent via HTTP to %s", message.to)
                return SendResult(provider="http", message_id=str(msg_id))
        except urllib.error.HTTPError as exc:
            error_body = exc.read().decode("utf-8", errors="replace")
            try:
                error_data = json.loads(error_body)
                error_msg = error_data.get("error", error_body)
            except json.JSONDecodeError:
                error_msg = error_body
            raise RuntimeError(f"email service returned {exc.code}: {error_msg}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"email service unreachable: {exc.reason}") from exc


def build_provider(provider_name: str) -> EmailProvider:
    """根据配置名称返回对应的 provider 实例。"""
    providers: dict[str, EmailProvider] = {
        "smtp": SMTPProvider(),
        "http": HTTPProvider(),
        "disabled": DisabledProvider(),
    }
    provider = providers.get(provider_name)
    if provider is None:
        raise ValueError(f"unknown email provider: {provider_name!r} (expected: smtp, http, disabled)")
    return provider
