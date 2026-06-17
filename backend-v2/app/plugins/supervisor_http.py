from __future__ import annotations

import json
from typing import Any
from urllib import error, parse, request

from app.core.errors import ServiceUnavailable
from app.plugins.registry import PluginManifest, register_plugin


class SupervisorHTTPPlugin:
    manifest = PluginManifest(
        id="supervisor_http",
        name="上级系统 HTTP",
        description="通过标准 HTTP 接口对接上级系统，支持 OAuth 登录、事件上报和拉取导入。",
        config_schema={
            "baseUrl": "上级系统 API 根地址",
            "oauthAuthorizeUrl": "OAuth 授权地址",
            "oauthTokenUrl": "OAuth Token 地址",
            "oauthUserinfoUrl": "OAuth UserInfo 地址",
            "oauthClientId": "OAuth Client ID",
            "oauthScopes": "OAuth scope，默认 openid email profile",
        },
        secret_keys=("api_token", "oauth_client_secret"),
        supports_oauth=True,
        supports_reporting=True,
        supports_import=True,
    )

    def test_connection(self, config: dict[str, Any], secrets: dict[str, str]) -> dict[str, Any]:
        base_url = _required_url(config, "baseUrl")
        token = secrets.get("api_token", "")
        response = _json_request(f"{base_url.rstrip('/')}/health", token=token, timeout=5)
        return {"ok": True, "status": response.get("status", "ok")}

    def build_oauth_authorization_url(
        self,
        config: dict[str, Any],
        secrets: dict[str, str],
        *,
        state: str,
        nonce: str,
        code_challenge: str,
        redirect_uri: str,
    ) -> str:
        authorize_url = _required_url(config, "oauthAuthorizeUrl")
        client_id = _required_value(config, "oauthClientId")
        scopes = config.get("oauthScopes") or "openid email profile"
        query = parse.urlencode(
            {
                "response_type": "code",
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": scopes,
                "state": state,
                "nonce": nonce,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
            }
        )
        return f"{authorize_url}?{query}"

    def exchange_oauth_code(
        self,
        config: dict[str, Any],
        secrets: dict[str, str],
        *,
        code: str,
        code_verifier: str,
        redirect_uri: str,
        nonce: str,
    ) -> dict[str, Any]:
        token_url = _required_url(config, "oauthTokenUrl")
        userinfo_url = _required_url(config, "oauthUserinfoUrl")
        client_id = _required_value(config, "oauthClientId")
        client_secret = secrets.get("oauth_client_secret", "")
        token_response = _form_request(
            token_url,
            {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": client_id,
                "client_secret": client_secret,
                "code_verifier": code_verifier,
            },
            timeout=10,
        )
        access_token = token_response.get("access_token")
        if not access_token:
            raise ServiceUnavailable("oauth token response missing access_token")
        userinfo = _json_request(userinfo_url, token=access_token, timeout=10)
        email = str(userinfo.get("email") or "").strip().lower()
        subject = str(userinfo.get("sub") or userinfo.get("id") or "").strip()
        email_verified = userinfo.get("email_verified", True)
        if not email or not subject:
            raise ServiceUnavailable("oauth userinfo missing subject or email")
        if email_verified is not True:
            raise ServiceUnavailable("oauth email is not verified")
        return {"subject": subject, "email": email, "emailVerified": True}

    def report_event(
        self, config: dict[str, Any], secrets: dict[str, str], event: dict[str, Any]
    ) -> dict[str, Any]:
        base_url = _required_url(config, "baseUrl")
        token = secrets.get("api_token", "")
        response = _json_request(
            f"{base_url.rstrip('/')}/events",
            method="POST",
            body=event,
            token=token,
            timeout=10,
        )
        return {"ok": True, "remoteId": response.get("id", "")}

    def pull_imports(
        self, config: dict[str, Any], secrets: dict[str, str], cursor: str = ""
    ) -> dict[str, Any]:
        base_url = _required_url(config, "baseUrl")
        token = secrets.get("api_token", "")
        suffix = f"?{parse.urlencode({'cursor': cursor})}" if cursor else ""
        return _json_request(f"{base_url.rstrip('/')}/imports{suffix}", token=token, timeout=15)


def _required_value(config: dict[str, Any], key: str) -> str:
    value = str(config.get(key) or "").strip()
    if not value:
        raise ServiceUnavailable(f"plugin config missing {key}")
    return value


def _required_url(config: dict[str, Any], key: str) -> str:
    value = _required_value(config, key)
    if not value.startswith(("http://", "https://")):
        raise ServiceUnavailable(f"plugin config {key} must be an http url")
    return value


def _json_request(
    url: str,
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    token: str = "",
    timeout: int = 10,
) -> dict[str, Any]:
    data = None if body is None else json.dumps(body).encode()
    headers = {"Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(url, data=data, headers=headers, method=method)
    return _open_json(req, timeout)


def _form_request(url: str, data: dict[str, str], *, timeout: int = 10) -> dict[str, Any]:
    req = request.Request(
        url,
        data=parse.urlencode(data).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )
    return _open_json(req, timeout)


def _open_json(req: request.Request, timeout: int) -> dict[str, Any]:
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
    except error.HTTPError as exc:
        raise ServiceUnavailable(f"plugin request failed: HTTP {exc.code}") from exc
    except error.URLError as exc:
        raise ServiceUnavailable(f"plugin request failed: {exc.reason}") from exc
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ServiceUnavailable("plugin response is not json") from exc
    return parsed if isinstance(parsed, dict) else {"data": parsed}


register_plugin(SupervisorHTTPPlugin())
