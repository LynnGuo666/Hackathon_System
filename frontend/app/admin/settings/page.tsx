"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, Input, Select, SelectItem, Spinner, Switch } from "@heroui/react";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type CountdownStage, type SiteConfig } from "@/web/lib/api";
import {
  DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
  fromZonedDateTimeLocal,
  normalizeTimezone,
  toZonedDateTimeLocal,
} from "@/web/lib/timezones";

type EditableStage = {
  id: string;
  label: string;
  localTime: string;
};

const DEFAULT_STAGES = ["开赛", "提交", "完赛"];

export default function AdminSettingsPage() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [eventName, setEventName] = useState("Hackathon");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [stages, setStages] = useState<EditableStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const timezoneLabel = useMemo(
    () => TIMEZONE_OPTIONS.find((item) => item.value === timezone)?.label ?? timezone,
    [timezone],
  );

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const config = await api.siteConfig();
      applyConfig(config, normalizeTimezone(config.timezone));
    } catch (error) {
      const message = errorText(error, "读取比赛基础信息失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  function applyConfig(config: SiteConfig, nextTimezone: string) {
    setSiteConfig(config);
    setEventName(config.eventName || "Hackathon");
    setTimezone(nextTimezone);
    setCountdownEnabled(config.countdownEnabled);
    setStages(toEditableStages(config.countdownStages, nextTimezone));
  }

  function changeTimezone(nextTimezone: string) {
    const normalized = normalizeTimezone(nextTimezone);
    setTimezone(normalized);
    setStages((current) =>
      current.map((stage) => ({
        ...stage,
        localTime: stage.localTime
          ? toZonedDateTimeLocal(fromZonedDateTimeLocal(stage.localTime, timezone), normalized)
          : "",
      })),
    );
  }

  function updateStage(id: string, patch: Partial<EditableStage>) {
    setStages((current) => current.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)));
  }

  function addStage() {
    const index = stages.length;
    setStages((current) => [
      ...current,
      {
        id: `stage_${Date.now()}`,
        label: DEFAULT_STAGES[index] ?? `阶段 ${index + 1}`,
        localTime: "",
      },
    ]);
  }

  function removeStage(id: string) {
    setStages((current) => current.filter((stage) => stage.id !== id));
  }

  async function save() {
    if (!eventName.trim()) {
      notify.error("请填写比赛名称");
      return;
    }
    const normalizedStages: CountdownStage[] = [];
    for (const stage of stages) {
      if (!stage.label.trim() && !stage.localTime) {
        continue;
      }
      if (!stage.label.trim()) {
        notify.error("请填写阶段名称");
        return;
      }
      if (!stage.localTime) {
        notify.error(`请填写「${stage.label}」的时间`);
        return;
      }
      normalizedStages.push({
        id: stage.id,
        label: stage.label.trim(),
        time: fromZonedDateTimeLocal(stage.localTime, timezone),
      });
    }

    setSaving(true);
    try {
      const saved = await api.updateSiteConfig({
        id: "default",
        eventName: eventName.trim(),
        timezone,
        countdownEnabled,
        countdownStages: normalizedStages,
        updatedAt: siteConfig?.updatedAt ?? "",
      });
      applyConfig(saved, normalizeTimezone(saved.timezone));
      notify.success("比赛基础信息已保存");
    } catch (error) {
      notify.error(errorText(error, "保存比赛基础信息失败"));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">比赛基础信息</h2>
              <p className="mt-1 text-sm text-foreground/60">统一控制比赛名称、展示时区和阶段式倒计时。</p>
            </div>
            <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={loading} onPress={refresh}>
              刷新
            </Button>
          </div>

          {loading && <Spinner label="正在读取比赛基础信息" />}

          {!loading && loadError && (
            <Card className="rounded-md">
              <CardBody className="text-sm text-danger">{loadError}</CardBody>
            </Card>
          )}

          {!loading && !loadError && (
            <Card className="rounded-md">
              <CardBody className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="比赛名称" value={eventName} onValueChange={setEventName} />
                  <Select
                    label="展示时区"
                    selectedKeys={[timezone]}
                    onSelectionChange={(keys) => changeTimezone(String(Array.from(keys)[0] ?? DEFAULT_TIMEZONE))}
                  >
                    {TIMEZONE_OPTIONS.map((item) => (
                      <SelectItem key={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Switch isSelected={countdownEnabled} onValueChange={setCountdownEnabled}>
                    {countdownEnabled ? "阶段式倒计时已启用" : "阶段式倒计时已禁用"}
                  </Switch>
                  <p className="text-sm text-foreground/60">当前按 {timezoneLabel} 展示和编辑</p>
                </div>

                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">倒计时阶段</h3>
                    <Button size="sm" variant="flat" startContent={<Plus size={16} />} onPress={addStage}>
                      添加阶段
                    </Button>
                  </div>

                  {stages.length === 0 && (
                    <Card className="rounded-md border border-dashed border-divider shadow-none">
                      <CardBody className="items-start gap-3">
                        <p className="text-sm text-foreground/60">还没有阶段，可以添加开赛、提交、完赛等时间点。</p>
                        <Button size="sm" color="primary" variant="flat" startContent={<Plus size={16} />} onPress={addStage}>
                          添加阶段
                        </Button>
                      </CardBody>
                    </Card>
                  )}

                  {stages.map((stage, index) => (
                    <div key={stage.id} className="grid gap-3 rounded-md border border-divider p-3 md:grid-cols-[1fr_1fr_auto]">
                      <Input
                        label={`阶段 ${index + 1}`}
                        value={stage.label}
                        onValueChange={(value) => updateStage(stage.id, { label: value })}
                      />
                      <Input
                        type="datetime-local"
                        label="阶段时间"
                        value={stage.localTime}
                        onValueChange={(value) => updateStage(stage.id, { localTime: value })}
                      />
                      <Button
                        isIconOnly
                        className="self-end"
                        variant="light"
                        color="danger"
                        aria-label="删除阶段"
                        onPress={() => removeStage(stage.id)}
                      >
                        <Trash2 size={17} />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button color="primary" startContent={<Save size={16} />} isLoading={saving} onPress={save}>
                    保存
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function toEditableStages(stages: CountdownStage[], timezone: string): EditableStage[] {
  if (stages.length === 0) {
    return DEFAULT_STAGES.map((label, index) => ({
      id: `stage_default_${index}`,
      label,
      localTime: "",
    }));
  }
  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    localTime: toZonedDateTimeLocal(stage.time, timezone),
  }));
}
