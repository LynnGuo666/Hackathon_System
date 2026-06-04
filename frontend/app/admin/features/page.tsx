"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, Chip, useDisclosure } from "@heroui/react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type EventLocation, type FeatureLink } from "@/web/lib/api";
import { FeaturesTable, type ModuleRow } from "./_components/features-table";
import { LocationModal } from "./_components/location-modal";

/** 始终存在的固定模块 */
const FIXED_MODULES: Omit<ModuleRow, "enabled" | "updatedAt">[] = [
  {
    id: "accounts",
    title: "账号管理",
    description: "管理选手账号的创建、激活和禁用",
    url: "/admin/accounts",
    sortOrder: 10,
    alwaysOn: true,
    action: { type: "link", href: "/admin/accounts" },
  },
  {
    id: "checkins",
    title: "CheckinID",
    description: "管理 CheckinID 的生成和绑定",
    url: "/admin/checkins",
    sortOrder: 20,
    alwaysOn: true,
    action: { type: "link", href: "/admin/checkins" },
  },
  {
    id: "resources",
    title: "资源发放",
    description: "管理兑换码、链接等资源的发放",
    url: "/admin/resources",
    sortOrder: 30,
    action: { type: "link", href: "/admin/resources" },
  },
  {
    id: "meal-orders",
    title: "餐饮补给",
    description: "管理选手的餐饮和饮料订单",
    url: "/admin/meal-orders",
    sortOrder: 40,
    action: { type: "link", href: "/admin/meal-orders" },
  },
  {
    id: "email-outbox",
    title: "邮件队列",
    description: "查看和管理邮件发送队列",
    url: "/admin/email-outbox",
    sortOrder: 50,
    action: { type: "link", href: "/admin/email-outbox" },
  },
  {
    id: "accommodation",
    title: "赛前需求",
    description: "管理选手的住宿和赛前需求",
    url: "/admin/accommodation",
    sortOrder: 60,
    action: { type: "link", href: "/admin/accommodation" },
  },
];

/** API FeatureLink 中，这些 id 有专属弹窗或跳转，需要映射 action */
function resolveAction(feature: FeatureLink): ModuleRow["action"] {
  if (feature.id === "feat_location" || feature.url === "/p/location") {
    return { type: "modal", modal: "location" };
  }
  if (feature.id === "feat_countdown") {
    return { type: "link", href: "/admin/settings" };
  }
  if (feature.id === "feat_navigation" || feature.url === "/p/navigation") {
    return { type: "link", href: "/admin/navigation" };
  }
  return { type: "none" };
}

export default function AdminFeaturesPage() {
  const [modules, setModules] = useState<FeatureLink[]>([]);
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [manualLocationName, setManualLocationName] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const router = useRouter();
  const { isOpen: isLocationOpen, onOpen: openLocation, onOpenChange: onLocationOpenChange } = useDisclosure();

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const [featureRows, currentLocation] = await Promise.all([
        api.adminFeatureLinks(),
        api.adminEventLocation(),
      ]);
      setModules(featureRows);
      setLocation(currentLocation);
      setManualLocationName(currentLocation.name);
    } catch (error) {
      const message = errorText(error, "读取模块配置失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleModule(module: ModuleRow, enabled: boolean) {
    const apiId = module.featureId ?? module.id;
    setUpdatingId(module.id);
    try {
      const saved = await api.updateFeatureEnabled(apiId, enabled);
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

  /** 将固定模块和 API 模块合并为统一列表 */
  function buildModuleList(): ModuleRow[] {
    const fixedIds = new Set(FIXED_MODULES.map((m) => m.id));

    // 构建 API FeatureLink 查找表（按 url 匹配）
    const apiByUrl = new Map<string, FeatureLink>();
    for (const f of modules) {
      apiByUrl.set(f.url, f);
    }

    const fixedRows: ModuleRow[] = FIXED_MODULES.map((m) => {
      const matched = apiByUrl.get(m.url);
      return {
        ...m,
        enabled: m.alwaysOn ? true : (matched?.enabled ?? true),
        updatedAt: "",
        featureId: matched?.id,
      };
    });

    // API 模块：跳过已作为固定模块展示的
    const apiRows: ModuleRow[] = modules
      .filter((f) => !fixedIds.has(f.id) && !fixedIds.has(f.url.replace("/admin/", "").replace("/p/", "")))
      .map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        url: f.url,
        sortOrder: f.sortOrder,
        updatedAt: f.updatedAt,
        enabled: f.enabled,
        featureId: f.id,
        action: resolveAction(f),
      }));

    return [...fixedRows, ...apiRows].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  useEffect(() => {
    refresh();
  }, []);

  const rows = buildModuleList();
  const enabledCount = rows.filter((r) => r.enabled).length;

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-5">
          <div>
            <h2 className="text-2xl font-semibold">功能模块</h2>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Chip variant="flat">{enabledCount} 个启用</Chip>
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
            modules={rows}
            loading={loading}
            loadError={loadError}
            updatingId={updatingId}
            onToggle={toggleModule}
            onOpenLocation={openLocation}
            onOpenCountdown={() => router.push("/admin/settings")}
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
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}
