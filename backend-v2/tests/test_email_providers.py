import json
from unittest.mock import MagicMock, patch

from app.services.email.providers import (
    DisabledProvider,
    EmailMessage,
    HTTPProvider,
    SMTPProvider,
    build_provider,
)


def test_disabled_provider_returns_result():
    provider = DisabledProvider()
    msg = EmailMessage(to="a@b.com", subject="hi", body="hello")
    result = provider.send(msg, {}, lambda k: "")
    assert result.provider == "disabled"
    assert result.message_id == ""


def test_build_provider_by_name():
    assert isinstance(build_provider("smtp"), SMTPProvider)
    assert isinstance(build_provider("http"), HTTPProvider)
    assert isinstance(build_provider("disabled"), DisabledProvider)


def test_build_provider_unknown_raises():
    import pytest
    with pytest.raises(ValueError, match="unknown email provider"):
        build_provider("unknown")


def test_smtp_provider_missing_host_raises():
    import pytest
    provider = SMTPProvider()
    msg = EmailMessage(to="a@b.com", subject="hi", body="hello")
    with pytest.raises(ValueError, match="smtp_host"):
        provider.send(msg, {}, lambda k: "password")


def test_smtp_provider_missing_password_raises():
    import pytest
    provider = SMTPProvider()
    msg = EmailMessage(to="a@b.com", subject="hi", body="hello")
    with pytest.raises(ValueError, match="smtp_password"):
        provider.send(msg, {"smtp_host": "smtp.example.com"}, lambda k: "")


def test_smtp_provider_calls_smtplib():
    provider = SMTPProvider()
    msg = EmailMessage(to="a@b.com", subject="hi", body="hello")
    config = {"smtp_host": "smtp.example.com", "smtp_port": 587, "smtp_username": "user", "smtp_from": "from@x.com", "smtp_security": "starttls"}
    secrets = {"smtp_password": "secret123"}

    with patch("app.services.email.providers.smtplib.SMTP") as mock_smtp:
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_smtp.return_value.__exit__ = MagicMock(return_value=False)
        result = provider.send(msg, config, lambda k: secrets.get(k, ""))

    assert result.provider == "smtp"
    mock_server.starttls.assert_called_once()
    mock_server.login.assert_called_once_with("user", "secret123")
    mock_server.sendmail.assert_called_once()


def test_smtp_provider_ssl_calls_smtp_ssl():
    provider = SMTPProvider()
    msg = EmailMessage(to="a@b.com", subject="hi", body="hello")
    config = {"smtp_host": "smtp.example.com", "smtp_port": 465, "smtp_username": "user", "smtp_from": "from@x.com", "smtp_security": "ssl"}
    secrets = {"smtp_password": "secret123"}

    with patch("app.services.email.providers.smtplib.SMTP_SSL") as mock_smtp_ssl:
        mock_server = MagicMock()
        mock_smtp_ssl.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_smtp_ssl.return_value.__exit__ = MagicMock(return_value=False)
        result = provider.send(msg, config, lambda k: secrets.get(k, ""))

    assert result.provider == "smtp"
    mock_server.login.assert_called_once()


def test_http_provider_missing_url_raises():
    import pytest
    provider = HTTPProvider()
    msg = EmailMessage(to="a@b.com", subject="hi", body="hello")
    with pytest.raises(ValueError, match="email_service_url"):
        provider.send(msg, {}, lambda k: "apikey")


def test_http_provider_missing_api_key_raises():
    import pytest
    provider = HTTPProvider()
    msg = EmailMessage(to="a@b.com", subject="hi", body="hello")
    with pytest.raises(ValueError, match="email_service_api_key"):
        provider.send(msg, {"email_service_url": "http://mail:8080"}, lambda k: "")


def test_http_provider_sends_request():
    provider = HTTPProvider()
    msg = EmailMessage(to="a@b.com", subject="hi", body="hello")
    config = {"email_service_url": "http://mail:8080", "email_service_account_id": "acc1"}
    secrets = {"email_service_api_key": "sk_live_123"}

    mock_response = MagicMock()
    mock_response.read.return_value = json.dumps({"message_id": "msg_abc"}).encode()
    mock_response.__enter__ = MagicMock(return_value=mock_response)
    mock_response.__exit__ = MagicMock(return_value=False)

    with patch("app.services.email.providers.urllib.request.urlopen", return_value=mock_response) as mock_urlopen:
        result = provider.send(msg, config, lambda k: secrets.get(k, ""))

    assert result.provider == "http"
    assert result.message_id == "msg_abc"
    call_args = mock_urlopen.call_args[0][0]
    assert call_args.full_url == "http://mail:8080/api/send"
    assert call_args.get_header("Authorization") == "Bearer sk_live_123"
