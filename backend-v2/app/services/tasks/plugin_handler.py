import json

from app.plugins import get_plugin
from app.services.tasks import TaskContext, register_task


@register_task("plugin_report_event")
def handle_plugin_report_event(payload: dict, ctx: TaskContext) -> str:
    plugin_id = payload["pluginId"]
    event_id = payload["eventId"]
    connector = get_plugin(plugin_id)
    config = ctx.repository.get_plugin_config(plugin_id)
    event = ctx.repository.get_plugin_sync_event(event_id)
    secrets_map = {
        key: ctx.repository.get_secret(f"plugin:{plugin_id}:{key}")
        for key in connector.manifest.secret_keys
    }
    result = connector.report_event(config.config, secrets_map, event.payload)
    ctx.repository.mark_plugin_sync_event_succeeded(event_id)
    ctx.repository.mark_plugin_ready(plugin_id)
    return json.dumps(_redact(result), ensure_ascii=False)


@register_task("plugin_import_pull")
def handle_plugin_import_pull(payload: dict, ctx: TaskContext) -> str:
    plugin_id = payload["pluginId"]
    cursor = payload.get("cursor", "")
    connector = get_plugin(plugin_id)
    config = ctx.repository.get_plugin_config(plugin_id)
    secrets_map = {
        key: ctx.repository.get_secret(f"plugin:{plugin_id}:{key}")
        for key in connector.manifest.secret_keys
    }
    result = connector.pull_imports(config.config, secrets_map, cursor=cursor)
    records = result.get("records", [])
    batch = ctx.repository.create_plugin_import_batch(
        plugin_id,
        "pull",
        metadata={"cursor": cursor, "nextCursor": result.get("nextCursor", "")},
    )
    ctx.repository.update_plugin_import_batch(
        batch.id,
        total_count=len(records),
        success_count=0,
        failed_count=0,
        metadata={"cursor": cursor, "nextCursor": result.get("nextCursor", ""), "records": records},
    )
    ctx.repository.mark_plugin_ready(plugin_id)
    return json.dumps({"batchId": batch.id, "count": len(records)}, ensure_ascii=False)


def _redact(value: dict) -> dict:
    return {
        key: ("[redacted]" if "token" in key.lower() or "secret" in key.lower() else item)
        for key, item in value.items()
    }
