"use client";

import { useEffect } from "react";
import { Button, Card, CardBody, Spinner, Switch } from "@heroui/react";
import { RefreshCw, Save } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { BasicInfoForm } from "./_components/basic-info-form";
import { StageList } from "./_components/stage-list";
import { useSiteConfigForm } from "./_components/use-site-config-form";

export default function AdminSettingsPage() {
  const form = useSiteConfigForm();

  useEffect(() => {
    form.refresh();
  }, []);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground/40">系统配置</p>
              <h2 className="text-xl font-bold text-foreground">比赛基础信息</h2>
              <p className="mt-1 text-xs text-foreground/40">统一控制比赛名称、展示时区和阶段式倒计时。</p>
            </div>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} isLoading={form.loading} onPress={form.refresh}>
              刷新
            </Button>
          </div>

          {form.loading && <Spinner label="正在读取比赛基础信息" />}

          {!form.loading && form.loadError && (
            <Card classNames={{ base: "rounded-card" }}>
              <CardBody className="text-sm text-danger">{form.loadError}</CardBody>
            </Card>
          )}

          {!form.loading && !form.loadError && (
            <Card classNames={{ base: "rounded-card" }}>
              <CardBody className="grid gap-5">
                <BasicInfoForm
                  eventName={form.eventName}
                  timezone={form.timezone}
                  onEventNameChange={form.setEventName}
                  onTimezoneChange={form.changeTimezone}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Switch isSelected={form.countdownEnabled} onValueChange={form.setCountdownEnabled}>
                    {form.countdownEnabled ? "阶段式倒计时已启用" : "阶段式倒计时已禁用"}
                  </Switch>
                  <p className="text-sm text-foreground/60">当前按 {form.timezoneLabel} 展示和编辑</p>
                </div>

                <StageList
                  stages={form.stages}
                  onAdd={form.addStage}
                  onRemove={form.removeStage}
                  onUpdate={form.updateStage}
                />

                <div className="flex justify-end">
                  <Button color="primary" startContent={<Save size={16} />} isLoading={form.saving} onPress={form.save}>
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
