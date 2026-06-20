"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import { useEffect, useState } from "react";
import { errorText, notify } from "@/components/toast";
import { api, type ResourceItem } from "@/web/lib/api";

export function ItemDocModal({
  isOpen,
  poolId,
  item,
  onOpenChange,
  onSaved,
}: {
  isOpen: boolean;
  poolId: string;
  item: ResourceItem | null;
  onOpenChange: (isOpen: boolean) => void;
  onSaved: (item: ResourceItem) => void;
}) {
  const [docUrl, setDocUrl] = useState("");
  const [docMarkdown, setDocMarkdown] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setDocUrl(item.docUrl);
      setDocMarkdown(item.docMarkdown);
    }
  }, [item]);

  async function save() {
    if (!item) return;
    setSaving(true);
    try {
      const updated = await api.updateResourceItem(poolId, item.id, {
        docUrl,
        docMarkdown,
      });
      notify.success("已更新 Key 说明");
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
              <h3 className="font-semibold">编辑 Key 说明 · {item?.publicLabel}</h3>
            </ModalHeader>
            <ModalBody className="grid gap-3">
              <Input
                label="说明文档链接"
                placeholder="https://..."
                value={docUrl}
                onValueChange={setDocUrl}
              />
              <Textarea
                label="说明文档（Markdown）"
                minRows={6}
                placeholder={"# 标题\n- 列表项\n`代码`"}
                value={docMarkdown}
                onValueChange={setDocMarkdown}
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
