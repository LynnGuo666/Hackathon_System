"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const router = useRouter();
  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    router.replace(token ? "/admin/resources" : "/admin/login");
  }, [router]);
  return null;
}
