import { useMemo, useState } from "react";
import { errorText, notify } from "@/components/toast";
import { api, type CountdownStage, type SiteConfig } from "@/web/lib/api";
import {
  DEFAULT_TIMEZONE,
  TIMEZONE_OPTIONS,
  fromZonedDateTimeLocal,
  normalizeTimezone,
  toZonedDateTimeLocal,
} from "@/web/lib/timezones";

export type EditableStage = {
  id: string;
  label: string;
  localTime: string;
};

const DEFAULT_STAGES = ["开赛", "提交", "完赛"];

export function useSiteConfigForm() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [eventName, setEventName] = useState("Hackathon");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [walkupCheckinEnabled, setWalkupCheckinEnabled] = useState(false);
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
    setWalkupCheckinEnabled(config.walkupCheckinEnabled ?? false);
    setStages(toEditableStages(config.countdownStages, nextTimezone));
  }

  function changeTimezone(nextTimezone: string) {
    const normalized = normalizeTimezone(nextTimezone);
    setTimezone(normalized);
    setStages((current) =>
      current.map((stage) => ({
        ...stage,
        // 输入框没有时区信息，切换时区时先按旧时区还原 UTC，再按新时区重新展示。
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
      if (!stage.label.trim() && !stage.localTime) continue;
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
        walkupCheckinEnabled,
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

  return {
    eventName,
    timezone,
    timezoneLabel,
    countdownEnabled,
    walkupCheckinEnabled,
    stages,
    loading,
    saving,
    loadError,
    setEventName,
    setCountdownEnabled,
    setWalkupCheckinEnabled,
    changeTimezone,
    updateStage,
    addStage,
    removeStage,
    refresh,
    save,
  };
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
