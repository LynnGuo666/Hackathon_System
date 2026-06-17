from fastapi import APIRouter, Depends

from app.core.security import require_admin_token
from app.schemas import (
    PluginDetail,
    PluginIntegration,
    PluginSecretStatusList,
    PluginSyncResult,
    PluginTestResult,
    PluginUpdateInput,
    SecretValueInput,
)
from app.services.hackathon import HackathonService
from app.core.dependencies import service

router = APIRouter(dependencies=[Depends(require_admin_token)])


@router.get("/plugins", response_model=list[PluginIntegration], response_model_by_alias=True)
def admin_plugins(svc: HackathonService = Depends(service)) -> list[PluginIntegration]:
    return svc.list_plugin_integrations()


@router.get("/plugins/{plugin_id}", response_model=PluginDetail, response_model_by_alias=True)
def admin_plugin(plugin_id: str, svc: HackathonService = Depends(service)) -> PluginDetail:
    return svc.get_plugin_detail(plugin_id)


@router.put("/plugins/{plugin_id}", response_model=PluginDetail, response_model_by_alias=True)
def update_plugin(
    plugin_id: str,
    input: PluginUpdateInput,
    svc: HackathonService = Depends(service),
) -> PluginDetail:
    return svc.update_plugin(plugin_id, input)


@router.patch("/plugins/{plugin_id}", response_model=PluginIntegration, response_model_by_alias=True)
def patch_plugin(
    plugin_id: str,
    input: PluginUpdateInput,
    svc: HackathonService = Depends(service),
) -> PluginIntegration:
    return svc.update_plugin_integration(plugin_id, input)


@router.get(
    "/plugins/{plugin_id}/secrets",
    response_model=PluginSecretStatusList,
    response_model_by_alias=True,
)
def plugin_secrets(plugin_id: str, svc: HackathonService = Depends(service)) -> PluginSecretStatusList:
    return svc.plugin_secret_status(plugin_id)


@router.put("/plugins/{plugin_id}/secrets/{key}", response_model=PluginIntegration, response_model_by_alias=True)
def set_plugin_secret(
    plugin_id: str,
    key: str,
    input: SecretValueInput,
    svc: HackathonService = Depends(service),
) -> PluginIntegration:
    svc.set_plugin_secret(plugin_id, key, input.value)
    return svc._integration_for(plugin_id)


@router.delete("/plugins/{plugin_id}/secrets/{key}", response_model=PluginIntegration, response_model_by_alias=True)
def delete_plugin_secret(
    plugin_id: str,
    key: str,
    svc: HackathonService = Depends(service),
) -> PluginIntegration:
    svc.delete_plugin_secret(plugin_id, key)
    return svc._integration_for(plugin_id)


@router.post("/plugins/{plugin_id}/test", response_model=PluginTestResult, response_model_by_alias=True)
def test_plugin(plugin_id: str, svc: HackathonService = Depends(service)) -> PluginTestResult:
    return svc.test_plugin_connection(plugin_id)


@router.post("/plugins/{plugin_id}/sync", response_model=PluginSyncResult, response_model_by_alias=True)
def sync_plugin(plugin_id: str, svc: HackathonService = Depends(service)) -> PluginSyncResult:
    return svc.trigger_plugin_sync_result(plugin_id)


@router.get("/plugins/{plugin_id}/status", response_model=PluginDetail, response_model_by_alias=True)
def plugin_status(plugin_id: str, svc: HackathonService = Depends(service)) -> PluginDetail:
    return svc.get_plugin_detail(plugin_id)
