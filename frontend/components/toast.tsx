"use client";

import { addToast } from "@heroui/react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type ToastTone = "success" | "danger" | "warning" | "default";

const toastIcons = {
  success: CheckCircle2,
  danger: XCircle,
  warning: AlertTriangle,
  default: Info,
};

function showToast(title: string, tone: ToastTone) {
  const Icon = toastIcons[tone];
  addToast({
    title: (
      <span className="flex items-center gap-2">
        <Icon size={18} />
        <span>{title}</span>
      </span>
    ),
    color: tone,
  });
}

export const notify = {
  success: (title: string) => showToast(title, "success"),
  error: (title: string) => showToast(title, "danger"),
  warning: (title: string) => showToast(title, "warning"),
  info: (title: string) => showToast(title, "default"),
};

export function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
