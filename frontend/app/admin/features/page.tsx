"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, Chip, useDisclosure } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type EventLocation, type FeatureLink, type SiteConfig } from "@/web/lib/api";
import { CountdownModal } from "./_components/countdown-modal";
import { FeaturesTable } from "./_components/features-table";
import { LocationModal } from "./_components/location-modal";
import { fromDateTimeLocal, toDateTimeLocal } from "./_components/datetime";

export default function AdminFeaturesPage() {
  const [modules, setModules] = useState<FeatureLink[]>([]);
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [manualLocationName, setManualLocationName] = useState("");
  const [countdownTitle, setCountdownTitle] = useState("");
  const [countdownEnd, setCountdownEnd] = useState("");
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingCountdown, setSavingCountdown] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { isOpen: isLocationOpen, onOpen: openLocation, onOpenChange: onLocationOpenChange } = useDisclosure();
  const { isOpen: isCountdownOpen, onOpen: openCountdown, onOpenChange: onCountdownOpenChange } = useDisclosure();

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const [featureRows, currentLocation, currentConfig] = await Promise.all([
        api.adminFeatureLinks(),
        api.adminEventLocation(),
        api.siteConfig(),
      ]);
      setModules(featureRows);
      setLocation(currentLocation);
      setSiteConfig(currentConfig);
      setManualLocationName(currentLocation.name);
      setCountdownTitle(currentConfig.countdownTitle);
      setCountdownEnd(toDateTimeLocal(currentConfig.countdownEnd));
      setCountdownEnabled(currentConfig.countdownEnabled);
    } catch (error) {
      const message = errorText(error, "读取模块配置失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleModule(module: FeatureLink, enabled: boolean) {
    setUpdatingId(module.id);
    try {
      const saved = await api.updateFeatureEnabled(module.id, enabled);
      setModules((current) => current.map((item) => item.id === saved.id ? saved : item));
      notify.success(`${saved.title} 已${saved.enabled ? "启用" : "禁用"}`);
    } catch (error) {
      notify.error(errorText(error, "更新模块失败"));
    } finally {
      setUpdatingId("");
    }
  }

  async function saveManualLocation() {
    if (!manualLocationName.trim()) {
      notify.error("请填写地点名称");
      return;
    }
    setSavingLocation(true);
    try {
      const saved = await api.updateEventLocation({
        id: location?.id || "default",
        name: manualLocationName.trim(),
        address: location?.address || manualLocationName.trim(),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        osmType: location?.osmType || "",
        osmId: location?.osmId || "",
        osmUrl: location?.osmUrl || "",
        updatedAt: location?.updatedAt || "",
      });
      setLocation(saved);
      notify.success("赛事地点已保存");
    } catch (error) {
      notify.error(errorText(error, "保存地点失败"));
    } finally {
      setSavingLocation(false);
    }
  }

  async function saveCountdown() {
    if (countdownEnabled && !countdownEnd) {
      notify.error("请选择结束时间");
      return;
    }
    setSavingCountdown(true);
    try {
      const saved = await api.updateSiteConfig({
        id: "default",
        countdownTitle: countdownTitle.trim(),
        countdownEnd: fromDateTimeLocal(countdownEnd),
        countdownEnabled,
        updatedAt: siteConfig?.updatedAt ?? "",
      });
      setSiteConfig(saved);
      setCountdownTitle(saved.countdownTitle);
      setCountdownEnd(toDateTimeLocal(saved.countdownEnd));
      setCountdownEnabled(saved.countdownEnabled);
      notify.success("倒计时已保存");
    } catch (error) {
      notify.error(errorText(error, "保存倒计时失败"));
    } finally {
      setSavingCountdown(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-5">
          <div>
            <h2 className="text-2xl font-semibold">功能模块</h2>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Chip variant="flat">{modules.filter((item) => item.enabled).length} 个启用</Chip>
            <Button size="sm" variant="flat" startContent={<RefreshCw size={16} />} isLoading={loading} onPress={refresh}>
              刷新
            </Button>
          </div>

          {loadError && (
            <Card className="rounded-md">
              <CardBody className="text-sm text-danger">{loadError}</CardBody>
            </Card>
          )}

          <FeaturesTable
            modules={modules}
            loading={loading}
            loadError={loadError}
            updatingId={updatingId}
            onToggle={toggleModule}
            onOpenLocation={openLocation}
            onOpenCountdown={openCountdown}
          />

          <LocationModal
            isOpen={isLocationOpen}
            location={location}
            locationName={manualLocationName}
            saving={savingLocation}
            onOpenChange={onLocationOpenChange}
            onLocationNameChange={setManualLocationName}
            onSave={saveManualLocation}
          />

          <CountdownModal
            isOpen={isCountdownOpen}
            title={countdownTitle}
            end={countdownEnd}
            enabled={countdownEnabled}
            saving={savingCountdown}
            onOpenChange={onCountdownOpenChange}
            onTitleChange={setCountdownTitle}
            onEndChange={setCountdownEnd}
            onEnabledChange={setCountdownEnabled}
            onSave={saveCountdown}
          />
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}
