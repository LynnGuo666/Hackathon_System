"use client";

import { Button, Input } from "@heroui/react";
import { Hash, Mail, UserRound } from "lucide-react";

export function EmailLoginForm({
  email,
  code,
  loading,
  onEmailChange,
  onCodeChange,
  onSendCode,
  onVerifyCode,
}: {
  email: string;
  code: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSendCode: () => void;
  onVerifyCode: () => void;
}) {
  return (
    <div className="grid gap-4 pt-4">
      <Input
        label="邮箱"
        placeholder="player@example.com"
        value={email}
        onValueChange={onEmailChange}
        startContent={<Mail size={16} />}
      />
      <Input label="验证码" placeholder="6 位数字" value={code} onValueChange={onCodeChange} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="flat" isLoading={loading} onPress={onSendCode}>
          发送验证码
        </Button>
        <Button color="primary" isLoading={loading} onPress={onVerifyCode}>
          验证进入
        </Button>
      </div>
    </div>
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
    <div className="grid gap-4 pt-4">
      <Input
        label="CheckinID"
        placeholder="000001"
        value={checkinId}
        onValueChange={onCheckinIdChange}
        startContent={<Hash size={16} />}
      />
      <Input
        label="昵称"
        placeholder="你的现场昵称"
        value={fullName}
        onValueChange={onFullNameChange}
        startContent={<UserRound size={16} />}
      />
      <Input
        label="邮箱"
        placeholder="player@example.com"
        value={email}
        onValueChange={onEmailChange}
        startContent={<Mail size={16} />}
      />
      <Button color="primary" isLoading={loading} onPress={onSubmit}>
        关联进入
      </Button>
    </div>
  );
}
