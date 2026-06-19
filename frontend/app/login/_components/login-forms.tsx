"use client";

import { Button, Input } from "@heroui/react";
import { Hash, Mail, UserRound } from "lucide-react";

export function EmailLoginForm({
  email,
  code,
  loading,
  cooldown,
  onEmailChange,
  onCodeChange,
  onSendCode,
  onVerifyCode,
}: {
  email: string;
  code: string;
  loading: boolean;
  cooldown: number;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onVerifyCode: () => void;
}) {
  const coolingDown = cooldown > 0;
  return (
    <form className="grid gap-4 pt-4" onSubmit={(e) => e.preventDefault()}>
      <Input
        label="邮箱"
        placeholder="player@example.com"
        value={email}
        onValueChange={onEmailChange}
        startContent={<Mail size={16} className="text-foreground/30" />}
        autoComplete="email"
        inputMode="email"
        isRequired
      />
      <Input
        label="验证码"
        placeholder="6 位数字"
        value={code}
        onValueChange={onCodeChange}
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={6}
        isRequired
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="flat"
          isLoading={loading}
          isDisabled={coolingDown}
          onPress={onSendCode}
          type="button"
        >
          {coolingDown ? `重新发送 (${cooldown}s)` : "发送验证码"}
        </Button>
        <Button color="primary" isLoading={loading} onPress={onVerifyCode} type="submit">
          验证进入
        </Button>
      </div>
    </form>
  );
}

export function CheckinLoginForm({
  checkinId,
  email,
  fullName,
  loading,
  onCheckinIdChange,
  onEmailChange,
  onFullNameChange,
  onSubmit,
}: {
  checkinId: string;
  email: string;
  fullName: string;
  loading: boolean;
  onCheckinIdChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form className="grid gap-4 pt-4" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <Input
        label="CheckinID"
        placeholder="000001"
        value={checkinId}
        onValueChange={onCheckinIdChange}
        startContent={<Hash size={16} className="text-foreground/30" />}
        autoComplete="off"
        inputMode="numeric"
        isRequired
      />
      <Input
        label="昵称"
        placeholder="你的现场昵称"
        value={fullName}
        onValueChange={onFullNameChange}
        startContent={<UserRound size={16} className="text-foreground/30" />}
        autoComplete="name"
        isRequired
      />
      <Input
        label="邮箱"
        placeholder="player@example.com"
        value={email}
        onValueChange={onEmailChange}
        startContent={<Mail size={16} className="text-foreground/30" />}
        autoComplete="email"
        inputMode="email"
        isRequired
      />
      <Button color="primary" isLoading={loading} type="submit">
        关联进入
      </Button>
    </form>
  );
}
