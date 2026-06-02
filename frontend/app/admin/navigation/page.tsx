"use client";

import { Button, Card, CardBody, CardHeader, Input, Switch, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { Plus, RefreshCw, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, type NavigationLink, type SiteConfig } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function AdminNavigationPage() {
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // countdown config state
  const [cfg, setCfg] = useState<SiteConfig>({ id: "default", countdownTitle: "", countdownEnd: "", countdownEnabled: false, updatedAt: "" });
  const [cfgLoading, setCfgLoading] = useState(false);
  const [cfgMsg, setCfgMsg] = useState("");

  async function refresh() {
    try {
      setLinks(await api.adminNavigationLinks());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取导航配置失败");
    }
  }

  async function loadConfig() {
    try {
      const c = await api.siteConfig();
      setCfg(c);
    } catch {
      // ignore
    }
  }

  async function saveConfig() {
    setCfgLoading(true);
    setCfgMsg("");
    try {
      const saved = await api.updateSiteConfig({
        countdownTitle: cfg.countdownTitle,
        countdownEnd: cfg.countdownEnd,
        countdownEnabled: cfg.countdownEnabled,
      });
      setCfg(saved);
      setCfgMsg("已保存");
    } catch (error) {
      setCfgMsg(error instanceof Error ? error.message : "保存失败");
    } finally {
      setCfgLoading(false);
    }
  }

  async function createLink() {
    setLoading(true);
    setMessage("");
    try {
      const link = await api.createNavigationLink({ title, description, url });
      setMessage(`已添加导航入口：${link.title}`);
      setTitle("");
      setDescription("");
      setUrl("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    loadConfig();
  }, []);

  return (
    <AppShell variant="admin">
      <section className="grid gap-5">
        <div>
          <p className="text-sm text-foreground/60">site navigation</p>
          <h2 className="text-2xl font-semibold">导航与倒计时配置</h2>
        </div>

        {/* 倒计时设置 */}
        <Card className="rounded-md">
          <CardHeader>
            <h3 className="font-semibold">倒计时设置</h3>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-2">
            <Switch
              className="md:col-span-2"
              isSelected={cfg.countdownEnabled}
              onValueChange={(v) => setCfg((c) => ({ ...c, countdownEnabled: v }))}
            >
              启用倒计时
            </Switch>
            <Input
              label="活动名称"
              placeholder="黑客松 2026"
              value={cfg.countdownTitle}
              onValueChange={(v) => setCfg((c) => ({ ...c, countdownTitle: v }))}
            />
            <Input
              label="目标时间"
              type="datetime-local"
              value={cfg.countdownEnd ? cfg.countdownEnd.slice(0, 16) : ""}
              onValueChange={(v) => setCfg((c) => ({ ...c, countdownEnd: v ? new Date(v).toISOString() : "" }))}
            />
            <div className="flex items-center gap-3 md:col-span-2">
              <Button color="primary" startContent={<Save size={16} />} isLoading={cfgLoading} onPress={saveConfig}>
                保存倒计时
              </Button>
              {cfgMsg && <p className="text-sm text-foreground/70">{cfgMsg}</p>}
            </div>
          </CardBody>
        </Card>

        {/* 添加导航 */}
        <Card className="rounded-md">
          <CardHeader>
            <h3 className="font-semibold">添加跳转按钮</h3>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <Input label="按钮名称" placeholder="赛程安排" value={title} onValueChange={setTitle} />
            <Input label="跳转地址" placeholder="/p/dashboard 或 https://example.com" value={url} onValueChange={setUrl} />
            <Input className="md:col-span-2" label="说明" placeholder="显示在按钮上方的简短说明" value={description} onValueChange={setDescription} />
            <div className="flex gap-2 md:col-span-2">
              <Button color="primary" startContent={<Plus size={16} />} isLoading={loading} onPress={createLink}>
                添加
              </Button>
              <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={refresh}>
                刷新
              </Button>
            </div>
            {message && <p className="text-sm text-foreground/70 md:col-span-2">{message}</p>}
          </CardBody>
        </Card>

        {/* 当前导航列表 */}
        <Card className="rounded-md">
          <CardHeader>
            <h3 className="font-semibold">当前导航入口</h3>
          </CardHeader>
          <CardBody>
            <Table aria-label="导航按钮配置">
              <TableHeader>
                <TableColumn>名称</TableColumn>
                <TableColumn>地址</TableColumn>
                <TableColumn>说明</TableColumn>
                <TableColumn>排序</TableColumn>
              </TableHeader>
              <TableBody items={links}>
                {(row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>{row.url}</TableCell>
                    <TableCell>{row.description || "-"}</TableCell>
                    <TableCell>{row.sortOrder}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
}
