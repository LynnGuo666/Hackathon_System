import type { Metadata } from "next";
import { Agentation } from "agentation";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "黑客松服务系统",
  description: "选手身份、需求审核、邮件通知与唯一资源发放系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <Providers>
          {children}
          {process.env.NODE_ENV === "development" && <Agentation />}
        </Providers>
      </body>
    </html>
  );
}
