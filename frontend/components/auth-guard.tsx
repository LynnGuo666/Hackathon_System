"use client";

import { Spinner } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/web/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.me()
      .then(() => setReady(true))
      .catch(() => {
        const next = window.location.pathname;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="检查登录状态" />
      </div>
    );
  }

  return <>{children}</>;
}
