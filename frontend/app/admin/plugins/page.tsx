"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Spinner,
  Switch,
  Textarea,
} from "@heroui/react";
import {
  EyeOff,
  KeyRound,
  Plug,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Unplug,
  Wand2,
} from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import { api, type PluginIntegration, type PluginSecretState } from "@/web/lib/api";

type BusyAction =
  | "loading"
  | "saving-config"
  | "toggling"
  | "testing"
  | "syncing"
  | `secret:set:${string}`
  | `secret:delete:${string}`
  | "";

export default function AdminPluginsPage() {
  const [plugins, setPlugins] = useState<PluginIntegration[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [configDraft, setConfigDraft] = useState("{}");
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState<BusyAction>("loading");
  const [loadError, setLoadError] = useState("");
  const [runtimeMessage, setRuntimeMessage] = useState("");

  const selectedPlugin = useMemo(
    () => plugins.find((plugin) => plugin.id === selectedId) ?? plugins[0],
    [plugins, selectedId],
  );

  async function refresh(preferredId?: string) {
    setBusyAction("loading");
    setLoadError("");
    try {
      const rows = await api.adminPlugins();
      setPlugins(rows);
      const nextSelected = preferredId && rows.some((item) => item.id === preferredId)
        ? preferredId
        : rows[0]?.id ?? "";
      setSelectedId(nextSelected);
      setRuntimeMessage("");
    } catch (error) {
      const message = errorText(error, "读取插件列表失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setBusyAction("");
    }
  }

  function replacePlugin(updated: PluginIntegration) {
    setPlugins((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedId(updated.id);
  }

  async function togglePlugin(plugin: PluginIntegration, enabled: boolean) {
    setBusyAction("toggling");
    try {
      const updated = await api.updatePlugin(plugin.id, { enabled });
      replacePlugin(updated);
      notify.success(`${updated.name} 已${updated.enabled ? "启用" : "停用"}`);
    } catch (error) {
      notify.error(errorText(error, "更新插件状态失败"));
    } finally {
      setBusyAction("");
    }
  }

  async function saveConfig(plugin: PluginIntegration) {
    let parsed: Record<string, unknown>;
    try {
      const value = JSON.parse(configDraft || "{}");
      if (!value || Array.isArray(value) || typeof value !== "object") {
        notify.error("配置 JSON 必须是对象");
        return;
      }
      parsed = value as Record<string, unknown>;
    } catch {
      notify.error("配置 JSON 格式不正确");
      return;
    }

    setBusyAction("saving-config");
    try {
      const updated = await api.updatePlugin(plugin.id, { config: parsed });
      replacePlugin(updated);
      notify.success("插件配置已保存");
    } catch (error) {
      notify.error(errorText(error, "保存插件配置失败"));
    } finally {
      setBusyAction("");
    }
  }

  async function saveSecret(plugin: PluginIntegration, secret: PluginSecretState) {
    const value = secretDrafts[secret.key]?.trim() ?? "";
    if (!value) {
      notify.error("Secret 为空时不会覆盖现有值");
      return;
    }

    setBusyAction(`secret:set:${secret.key}`);
    try {
      const updated = await api.setPluginSecret(plugin.id, secret.key, value);
      replacePlugin(updated);
      setSecretDrafts((current) => ({ ...current, [secret.key]: "" }));
      notify.success(`${secret.label || secret.key} 已写入`);
    } catch (error) {
      notify.error(errorText(error, "写入 Secret 失败"));
    } finally {
      setBusyAction("");
    }
  }

  async function deleteSecret(plugin: PluginIntegration, secret: PluginSecretState) {
    setBusyAction(`secret:delete:${secret.key}`);
    try {
      const updated = await api.deletePluginSecret(plugin.id, secret.key);
      replacePlugin(updated);
      setSecretDrafts((current) => ({ ...current, [secret.key]: "" }));
      notify.success(`${secret.label || secret.key} 已删除`);
    } catch (error) {
      notify.error(errorText(error, "删除 Secret 失败"));
    } finally {
      setBusyAction("");
    }
  }

  async function testConnection(plugin: PluginIntegration) {
    setBusyAction("testing");
    try {
      const result = await api.testPluginConnection(plugin.id);
      const message = result.message || `连接测试状态：${result.status}`;
      setRuntimeMessage(message);
      notify.success(message);
      await refresh(plugin.id);
    } catch (error) {
      notify.error(errorText(error, "测试连接失败"));
    } finally {
      setBusyAction("");
    }
  }

  async function triggerSync(plugin: PluginIntegration) {
    setBusyAction("syncing");
    try {
      const result = await api.triggerPluginSync(plugin.id);
      const message = result.message || (result.taskId ? `同步任务已创建：${result.taskId}` : "同步已触发");
      setRuntimeMessage(message);
      notify.success(message);
      await refresh(plugin.id);
    } catch (error) {
      notify.error(errorText(error, "触发同步失败"));
    } finally {
      setBusyAction("");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!selectedPlugin) return;
    setConfigDraft(JSON.stringify(selectedPlugin.config ?? {}, null, 2));
    setSecretDrafts({});
    setRuntimeMessage("");
  }, [selectedPlugin?.id]);

  const loading = busyAction === "loading";

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground/40">系统配置</p>
              <h2 className="text-xl font-bold text-foreground">插件集成</h2>
              <p className="mt-1 text-xs text-foreground/40">
                管理外部服务插件的启停、配置、密钥和同步动作。
              </p>
            </div>
            <Button
              variant="flat"
              size="sm"
              startContent={<RefreshCw size={16} />}
              isLoading={loading}
              onPress={() => refresh(selectedPlugin?.id)}
            >
              刷新
            </Button>
          </div>

          {loading && <Spinner label="正在读取插件配置" />}

          {!loading && loadError && (
            <Card classNames={{ base: "rounded-card" }}>
              <CardBody className="text-sm text-danger">{loadError}</CardBody>
            </Card>
          )}

          {!loading && !loadError && (
            <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
              <Card classNames={{ base: "rounded-card" }}>
                <CardBody className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Plug size={18} />
                    <h3 className="font-semibold">插件列表</h3>
                  </div>

                  {plugins.length === 0 && (
                    <div className="rounded-lg border border-dashed border-divider p-4 text-sm text-foreground/50">
                      暂无插件数据
                    </div>
                  )}

                  {plugins.map((plugin) => {
                    const active = plugin.id === selectedPlugin?.id;
                    return (
                      <button
                        key={plugin.id}
                        type="button"
                        className={[
                          "rounded-lg border p-3 text-left transition",
                          active
                            ? "border-primary bg-primary/10"
                            : "border-divider bg-content1 hover:bg-content2",
                        ].join(" ")}
                        onClick={() => setSelectedId(plugin.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{plugin.name}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-foreground/50">
                              {plugin.description || plugin.provider}
                            </p>
                          </div>
                          <Chip
                            size="sm"
                            color={plugin.enabled ? "success" : "default"}
                            variant="flat"
                          >
                            {plugin.enabled ? "启用" : "停用"}
                          </Chip>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <StatusChip status={plugin.status || "unknown"} />
                          <span className="text-xs text-foreground/40">{plugin.provider}</span>
                        </div>
                      </button>
                    );
                  })}
                </CardBody>
              </Card>

              {selectedPlugin && (
                <div className="grid gap-4">
                  <Card classNames={{ base: "rounded-card" }}>
                    <CardBody className="grid gap-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold">{selectedPlugin.name}</h3>
                            <StatusChip status={selectedPlugin.status || "unknown"} />
                            <Chip size="sm" variant="flat">{selectedPlugin.provider}</Chip>
                          </div>
                          <p className="mt-1 text-sm text-foreground/55">{selectedPlugin.description}</p>
                          {selectedPlugin.lastError && (
                            <p className="mt-2 text-xs text-danger">{selectedPlugin.lastError}</p>
                          )}
                        </div>
                        <Switch
                          isSelected={selectedPlugin.enabled}
                          isDisabled={busyAction === "toggling"}
                          onValueChange={(enabled) => togglePlugin(selectedPlugin, enabled)}
                        >
                          {selectedPlugin.enabled ? "插件已启用" : "插件已停用"}
                        </Switch>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <MetaItem label="上次同步" value={formatDateTime(selectedPlugin.lastSyncAt)} />
                        <MetaItem label="上次测试" value={formatDateTime(selectedPlugin.lastTestAt)} />
                        <MetaItem label="更新时间" value={formatDateTime(selectedPlugin.updatedAt)} />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="flat"
                          startContent={<ShieldCheck size={16} />}
                          isLoading={busyAction === "testing"}
                          onPress={() => testConnection(selectedPlugin)}
                        >
                          测试连接
                        </Button>
                        <Button
                          color="primary"
                          variant="flat"
                          startContent={<Wand2 size={16} />}
                          isLoading={busyAction === "syncing"}
                          onPress={() => triggerSync(selectedPlugin)}
                        >
                          触发同步
                        </Button>
                      </div>

                      {runtimeMessage && (
                        <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success-700">
                          {runtimeMessage}
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  <Card classNames={{ base: "rounded-card" }}>
                    <CardBody className="grid gap-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold">插件配置</h3>
                        <Button
                          color="primary"
                          startContent={<Save size={16} />}
                          isLoading={busyAction === "saving-config"}
                          onPress={() => saveConfig(selectedPlugin)}
                        >
                          保存配置
                        </Button>
                      </div>
                      <Textarea
                        minRows={10}
                        label="JSON 配置"
                        value={configDraft}
                        onValueChange={setConfigDraft}
                        classNames={{ input: "font-mono text-xs" }}
                      />
                    </CardBody>
                  </Card>

                  <Card classNames={{ base: "rounded-card" }}>
                    <CardBody className="grid gap-4">
                      <div className="flex items-center gap-2">
                        <KeyRound size={18} />
                        <h3 className="font-semibold">Secret 管理</h3>
                      </div>

                      {selectedPlugin.secrets.length === 0 && (
                        <div className="rounded-lg border border-dashed border-divider p-4 text-sm text-foreground/50">
                          该插件没有声明 Secret
                        </div>
                      )}

                      <div className="grid gap-3">
                        {selectedPlugin.secrets.map((secret) => (
                          <div key={secret.key} className="grid gap-3 rounded-lg border border-divider p-3 md:grid-cols-[1fr_220px_auto] md:items-end">
                            <div className="grid gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">{secret.label || secret.key}</span>
                                <Chip
                                  size="sm"
                                  color={secret.configured ? "success" : "warning"}
                                  variant="flat"
                                  startContent={<EyeOff size={12} />}
                                >
                                  {secret.configured ? "已设置" : "未设置"}
                                </Chip>
                              </div>
                              <p className="text-xs text-foreground/45">
                                {secret.key}
                                {secret.updatedAt ? ` · ${formatDateTime(secret.updatedAt)}` : ""}
                              </p>
                            </div>
                            <Input
                              type="password"
                              label="新 Secret"
                              value={secretDrafts[secret.key] ?? ""}
                              placeholder={secret.configured ? "留空则不修改" : "输入后写入"}
                              onValueChange={(value) => {
                                setSecretDrafts((current) => ({ ...current, [secret.key]: value }));
                              }}
                            />
                            <div className="flex gap-2">
                              <Button
                                color="primary"
                                variant="flat"
                                isLoading={busyAction === `secret:set:${secret.key}`}
                                onPress={() => saveSecret(selectedPlugin, secret)}
                              >
                                写入
                              </Button>
                              <Button
                                isIconOnly
                                color="danger"
                                variant="flat"
                                aria-label={`删除 ${secret.label || secret.key}`}
                                isDisabled={!secret.configured}
                                isLoading={busyAction === `secret:delete:${secret.key}`}
                                onPress={() => deleteSecret(selectedPlugin, secret)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                </div>
              )}

              {!selectedPlugin && (
                <Card classNames={{ base: "rounded-card" }}>
                  <CardBody className="flex min-h-56 items-center justify-center gap-3 text-foreground/45">
                    <Unplug size={24} />
                    <span>请选择一个插件</span>
                  </CardBody>
                </Card>
              )}
            </div>
          )}
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-content2 px-3 py-2">
      <p className="text-xs text-foreground/45">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}
