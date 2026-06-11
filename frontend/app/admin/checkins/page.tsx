"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { Download, Plus, RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type CheckinIDRecord } from "@/web/lib/api";

export default function AdminCheckinsPage() {
  const [rows, setRows] = useState<CheckinIDRecord[]>([]);
  const [count, setCount] = useState("100");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [bulkValues, setBulkValues] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      setRows(await api.checkinIds());
    } catch (error) {
      const message = errorText(error, "读取 CheckinID 失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    const nextCount = Number.parseInt(count, 10);
    if (!Number.isInteger(nextCount) || nextCount < 1) {
      notify.error("请填写生成数量");
      return;
    }
    setSaving(true);
    try {
      const created = await api.generateCheckinIds(nextCount);
      notify.success(`已生成 ${created.length} 个 CheckinID`);
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "生成失败"));
    } finally {
      setSaving(false);
    }
  }

  async function importIds(onClose: () => void) {
    const values = bulkValues.split("\n").map((item) => item.trim()).filter(Boolean);
    if (values.length === 0) {
      notify.error("请填写 CheckinID");
      return;
    }
    setSaving(true);
    try {
      const created = await api.importCheckinIds(values);
      notify.success(`已导入 ${created.length} 个 CheckinID`);
      setBulkValues("");
      onClose();
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "导入失败"));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    available: rows.filter((row) => row.status === "available").length,
    bound: rows.filter((row) => row.status === "bound").length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !keyword || [row.id, row.assignedEmail]
        .some((value) => value.toLowerCase().includes(keyword));
      const matchesFilter = filter === "all" || row.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, rows]);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground/40">运营功能</p>
              <h2 className="text-xl font-bold text-foreground">CheckinID</h2>
            </div>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={14} />} isLoading={loading} onPress={refresh}>刷新</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[180px_auto_auto_1fr]">
            <Input label="生成数量" type="number" value={count} onValueChange={setCount} />
            <Button color="primary" startContent={<Plus size={16} />} isLoading={saving} onPress={generate}>
              生成
            </Button>
            <Button variant="flat" startContent={<Download size={16} />} onPress={onOpen}>
              导入
            </Button>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Chip variant="flat">总数 {stats.total}</Chip>
              <Chip variant="flat">未使用 {stats.available}</Chip>
              <Chip variant="flat">已绑定 {stats.bound}</Chip>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Input label="搜索" value={query} onValueChange={setQuery} />
            <Select
              label="状态"
              selectedKeys={[filter]}
              onSelectionChange={(keys) => setFilter(Array.from(keys)[0]?.toString() || "all")}
            >
              <SelectItem key="all">全部</SelectItem>
              <SelectItem key="available">未使用</SelectItem>
              <SelectItem key="bound">已绑定</SelectItem>
            </Select>
          </div>

          <Table aria-label="CheckinID 列表">
            <TableHeader>
              <TableColumn>CheckinID</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>绑定邮箱</TableColumn>
              <TableColumn>绑定时间</TableColumn>
              <TableColumn>创建时间</TableColumn>
            </TableHeader>
            <TableBody
              items={filteredRows}
              isLoading={loading}
              loadingContent={<Spinner size="sm" label="正在读取 CheckinID..." />}
              emptyContent={loadError || (query || filter !== "all" ? "没有匹配的 CheckinID" : "暂无 CheckinID 数据")}
            >
              {(row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.id}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={row.status === "bound" ? "success" : "default"} variant="flat">
                      {row.status === "bound" ? "已绑定" : "未使用"}
                    </Chip>
                  </TableCell>
                  <TableCell>{row.assignedEmail || "-"}</TableCell>
                  <TableCell>{formatDateTime(row.boundAt)}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Modal isOpen={isOpen} size="2xl" onOpenChange={onOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader>导入 CheckinID</ModalHeader>
                  <ModalBody>
                    <Textarea
                      minRows={10}
                      label="批量导入"
                      value={bulkValues}
                      onValueChange={setBulkValues}
                    />
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={onClose}>取消</Button>
                    <Button color="primary" isLoading={saving} onPress={() => importIds(onClose)}>导入</Button>
                  </ModalFooter>
                </>
              )}
            </ModalContent>
          </Modal>
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
