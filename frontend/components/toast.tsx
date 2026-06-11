"use client";

import { addToast } from "@heroui/react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type ToastTone = "success" | "danger" | "warning" | "default";

const toastConfig: Record<ToastTone, { icon: typeof CheckCircle2; timeout: number; ariaRole: string }> = {
  success: { icon: CheckCircle2, timeout: 3000, ariaRole: "status" },
  danger: { icon: XCircle, timeout: 5000, ariaRole: "alert" },
  warning: { icon: AlertTriangle, timeout: 4000, ariaRole: "status" },
  default: { icon: Info, timeout: 3000, ariaRole: "status" },
};

function showToast(title: string, tone: ToastTone) {
  const { icon: Icon, timeout } = toastConfig[tone];
  addToast({
    title: (
      <span role="status" aria-live="polite" className="flex max-w-[560px] items-start gap-2 whitespace-normal leading-snug">
        <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="break-words">{title}</span>
      </span>
    ),
    color: tone,
    timeout,
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
