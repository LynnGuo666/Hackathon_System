from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from app.core.errors import NotFound


@dataclass(frozen=True)
class PluginManifest:
    id: str
    name: str
    description: str = ""
    config_schema: dict[str, Any] = field(default_factory=dict)
    secret_keys: tuple[str, ...] = ()
    supports_oauth: bool = False
    supports_reporting: bool = False
    supports_import: bool = False


class PluginConnector(Protocol):
    manifest: PluginManifest

    def test_connection(self, config: dict[str, Any], secrets: dict[str, str]) -> dict[str, Any]:
        ...

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
        ...

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
        ...

    def report_event(
        self, config: dict[str, Any], secrets: dict[str, str], event: dict[str, Any]
    ) -> dict[str, Any]:
        ...

    def pull_imports(
        self, config: dict[str, Any], secrets: dict[str, str], cursor: str = ""
    ) -> dict[str, Any]:
        ...


_REGISTRY: dict[str, PluginConnector] = {}


def register_plugin(connector: PluginConnector) -> PluginConnector:
    _REGISTRY[connector.manifest.id] = connector
    return connector


def list_plugins() -> list[PluginConnector]:
    return sorted(_REGISTRY.values(), key=lambda item: item.manifest.id)


def get_plugin(plugin_id: str) -> PluginConnector:
    connector = _REGISTRY.get(plugin_id)
    if not connector:
        raise NotFound("plugin not found")
    return connector
