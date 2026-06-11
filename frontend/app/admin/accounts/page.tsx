"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Input, Select, SelectItem, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type Participant, type ParticipantAccount } from "@/web/lib/api";

const filters = [
  { key: "all", label: "全部" },
  { key: "unbound", label: "未绑定" },
  { key: "bound", label: "已绑定" },
  { key: "pending", label: "pending" },
  { key: "active", label: "active" },
  { key: "disabled", label: "disabled" },
];

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<ParticipantAccount[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [updatingEmail, setUpdatingEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      setAccounts(await api.participants());
    } catch (error) {
      const message = errorText(error, "读取账号失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(email: string, status: Participant["status"]) {
    setUpdatingEmail(email);
    try {
      await api.updateParticipantStatus(email, status);
      await refresh();
      notify.success("账号状态已更新");
    } catch (error) {
      notify.error(errorText(error, "更新账号失败"));
    } finally {
      setUpdatingEmail("");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesQuery = !keyword || [
        account.email,
        account.checkinId,
        account.fullName,
        account.teamName,
        account.school,
        account.phone,
      ].some((value) => value.toLowerCase().includes(keyword));
      const matchesFilter =
        filter === "all" ||
        (filter === "bound" && Boolean(account.checkinId)) ||
        (filter === "unbound" && !account.checkinId) ||
        account.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [accounts, filter, query]);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground/40">运营功能</p>
              <h2 className="text-xl font-bold text-foreground">账号管理</h2>
            </div>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} isLoading={loading} onPress={refresh}>刷新</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Input label="搜索" value={query} onValueChange={setQuery} />
            <Select
              label="筛选"
              selectedKeys={[filter]}
              onSelectionChange={(keys) => setFilter(Array.from(keys)[0]?.toString() || "all")}
            >
              {filters.map((item) => <SelectItem key={item.key}>{item.label}</SelectItem>)}
            </Select>
          </div>

          <Table aria-label="账号列表">
            <TableHeader>
              <TableColumn>邮箱</TableColumn>
              <TableColumn>CheckinID</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>姓名</TableColumn>
              <TableColumn>手机号</TableColumn>
              <TableColumn>队伍</TableColumn>
              <TableColumn>学校</TableColumn>
              <TableColumn>资料更新</TableColumn>
              <TableColumn>创建时间</TableColumn>
              <TableColumn>更新时间</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody
              items={rows}
              isLoading={loading}
              loadingContent={<Spinner size="sm" label="正在读取账号..." />}
              emptyContent={loadError || (query || filter !== "all" ? "没有匹配的账号" : "暂无账号数据")}
            >
              {(row) => (
                <TableRow key={row.email}>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.checkinId || "-"}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={row.status === "active" ? "success" : row.status === "disabled" ? "danger" : "default"} variant="flat">
                      {row.status}
                    </Chip>
                  </TableCell>
                  <TableCell>{row.fullName || "-"}</TableCell>
                  <TableCell>{row.phone || "-"}</TableCell>
                  <TableCell>{row.teamName || "-"}</TableCell>
                  <TableCell>{row.school || "-"}</TableCell>
                  <TableCell>{formatDateTime(row.profileUpdatedAt)}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
                  <TableCell>
                    <Select
                      classNames={{ base: "w-32" }}
                      size="sm"
                      aria-label="状态"
                      selectedKeys={[row.status]}
                      isDisabled={updatingEmail === row.email}
                      onSelectionChange={(keys) => {
                        const status = Array.from(keys)[0]?.toString() as Participant["status"] | undefined;
                        if (status && status !== row.status) {
                          updateStatus(row.email, status);
                        }
                      }}
                    >
                      <SelectItem key="pending">pending</SelectItem>
                      <SelectItem key="active">active</SelectItem>
                      <SelectItem key="disabled">disabled</SelectItem>
                    </Select>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}
