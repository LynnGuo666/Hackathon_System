"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Switch,
  Textarea,
} from "@heroui/react";
import { useEffect, useState } from "react";
import { errorText, notify } from "@/components/toast";
import { api, type ResourcePool } from "@/web/lib/api";
import {
  distributionLabels,
  phaseLabels,
  typeLabels,
} from "./utils";

type FormState = {
  name: string;
  type: string;
  distributionRule: string;
  visiblePhase: string;
  enabled: boolean;
  allowMultipleClaims: boolean;
  docUrl: string;
  docMarkdown: string;
};

function fromPool(pool: ResourcePool): FormState {
  return {
    name: pool.name,
    type: pool.type,
    distributionRule: pool.distributionRule,
    visiblePhase: pool.visiblePhase,
    enabled: pool.enabled,
    allowMultipleClaims: pool.allowMultipleClaims,
    docUrl: pool.docUrl,
    docMarkdown: pool.docMarkdown,
  };
}

export function PoolEditModal({
  isOpen,
  pool,
  onOpenChange,
  onSaved,
}: {
  isOpen: boolean;
  pool: ResourcePool | null;
  onOpenChange: (isOpen: boolean) => void;
  onSaved: (pool: ResourcePool) => void;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pool) setForm(fromPool(pool));
  }, [pool]);

  if (!form) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!pool || !form) return;
    if (!form.name.trim()) {
      notify.error("请填写资源名称");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updatePool(pool.id, {
        name: form.name.trim(),
        type: form.type,
        distributionRule: form.distributionRule,
        visiblePhase: form.visiblePhase,
        enabled: form.enabled,
        allowMultipleClaims: form.allowMultipleClaims,
        docUrl: form.docUrl,
        docMarkdown: form.docMarkdown,
      });
      notify.success("已更新资源池信息");
      onSaved(updated);
    } catch (error) {
      notify.error(errorText(error, "更新失败"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} size="2xl" onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>
              <h3 className="font-semibold">编辑资源池信息</h3>
            </ModalHeader>
            <ModalBody className="grid gap-3 md:grid-cols-2">
              <Input
                label="资源名称"
                value={form.name}
                onValueChange={(value) => update("name", value)}
              />
              <Select
                label="类型"
                selectedKeys={[form.type]}
                onSelectionChange={(keys) =>
                  update("type", String(Array.from(keys)[0] ?? form.type))
                }
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value}>{label}</SelectItem>
                ))}
              </Select>
              <Select
                label="发放规则"
                selectedKeys={[form.distributionRule]}
                onSelectionChange={(keys) =>
                  update("distributionRule", String(Array.from(keys)[0] ?? form.distributionRule))
                }
              >
                {Object.entries(distributionLabels).map(([value, label]) => (
                  <SelectItem key={value}>{label}</SelectItem>
                ))}
              </Select>
              <Select
                label="可见阶段"
                selectedKeys={[form.visiblePhase]}
                onSelectionChange={(keys) =>
                  update("visiblePhase", String(Array.from(keys)[0] ?? form.visiblePhase))
                }
              >
                {Object.entries(phaseLabels).map(([value, label]) => (
                  <SelectItem key={value}>{label}</SelectItem>
                ))}
              </Select>
              <Switch isSelected={form.enabled} onValueChange={(v) => update("enabled", v)}>
                启用资源池
              </Switch>
              <Switch
                isSelected={form.allowMultipleClaims}
                onValueChange={(v) => update("allowMultipleClaims", v)}
              >
                允许同一选手多次申请/发放
              </Switch>
              <Input
                className="md:col-span-2"
                label="说明文档链接"
                placeholder="https://..."
                value={form.docUrl}
                onValueChange={(value) => update("docUrl", value)}
              />
              <Textarea
                className="md:col-span-2"
                label="说明文档（Markdown）"
                minRows={6}
                placeholder={"# 标题\n- 列表项\n`代码`"}
                value={form.docMarkdown}
                onValueChange={(value) => update("docMarkdown", value)}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                取消
              </Button>
              <Button color="primary" isLoading={saving} onPress={save}>
                保存
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
