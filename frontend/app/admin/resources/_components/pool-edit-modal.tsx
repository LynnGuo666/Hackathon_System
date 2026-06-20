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
import { api, type AllowedTagOption, type ResourcePool } from "@/web/lib/api";
import { claimModeLabels, participantTagLabels, typeLabels } from "./utils";

type FormState = {
  name: string;
  type: string;
  claimMode: string;
  requireReview: boolean;
  allowedTags: string[];
  enabled: boolean;
  allowMultipleClaims: boolean;
  docUrl: string;
  docMarkdown: string;
};

function fromPool(pool: ResourcePool): FormState {
  return {
    name: pool.name,
    type: pool.type,
    claimMode: pool.claimMode || "self_claim",
    requireReview: pool.requireReview ?? false,
    allowedTags: pool.allowedTags ?? [],
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
  const [tagOptions, setTagOptions] = useState<AllowedTagOption[]>([]);

  useEffect(() => {
    if (pool) setForm(fromPool(pool));
  }, [pool]);

  useEffect(() => {
    if (isOpen) {
      api
        .allowedTagOptions()
        .then(setTagOptions)
        .catch(() => setTagOptions([]));
    }
  }, [isOpen]);

  if (!form) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      // 联动：self_apply_review 隐含需审核且锁定；admin_only 隐藏审核开关。
      if (key === "claimMode") {
        if (value === "self_apply_review") {
          next.requireReview = true;
        } else if (value === "admin_only") {
          next.requireReview = false;
        }
      }
      return next;
    });
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
        claimMode: form.claimMode,
        requireReview: form.requireReview,
        allowedTags: form.allowedTags,
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

  const showReviewSwitch = form.claimMode !== "admin_only";
  const reviewLocked = form.claimMode === "self_apply_review";

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
                label="领取方式"
                selectedKeys={[form.claimMode]}
                onSelectionChange={(keys) =>
                  update("claimMode", String(Array.from(keys)[0] ?? form.claimMode))
                }
              >
                {Object.entries(claimModeLabels).map(([value, label]) => (
                  <SelectItem key={value}>{label}</SelectItem>
                ))}
              </Select>
              <Select
                label="可领取角色（白名单）"
                selectionMode="multiple"
                selectedKeys={new Set(form.allowedTags)}
                onSelectionChange={(keys) =>
                  update("allowedTags", Array.from(keys).map(String))
                }
                description="空 = 任何登录选手可领；关闭对应系统后该角色不可选"
              >
                {tagOptions.map((option) => (
                  <SelectItem
                    key={option.tag}
                    isDisabled={!option.systemEnabled}
                  >
                    {participantTagLabels[option.tag] ?? option.tag}
                    {!option.systemEnabled ? "（系统未开启）" : ""}
                  </SelectItem>
                ))}
              </Select>
              {showReviewSwitch && (
                <Switch
                  isSelected={form.requireReview}
                  isDisabled={reviewLocked}
                  onValueChange={(v) => update("requireReview", v)}
                >
                  {reviewLocked
                    ? "需审核（申请方式已锁定）"
                    : form.requireReview
                      ? "领取需审核"
                      : "领取需审核"}
                </Switch>
              )}
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
