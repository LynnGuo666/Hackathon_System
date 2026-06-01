import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import { CalendarClock, Home, KeyRound, Mail, Map, ShieldCheck, Ticket } from "lucide-react";
import { countdown } from "@/web/lib/mock-data";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", label: "总览", icon: Home },
  { href: "/identity", label: "签到身份", icon: ShieldCheck },
  { href: "/resources", label: "我的资源", icon: Ticket },
  { href: "/navigation", label: "现场导航", icon: Map },
  { href: "/admin/resources", label: "资源后台", icon: KeyRound },
  { href: "/admin/email-outbox", label: "邮件队列", icon: Mail },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-divider bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="text-sm text-foreground/60">Hackathon</p>
            <h1 className="text-lg font-semibold text-foreground">选手服务系统</h1>
          </div>
          <div className="flex items-center gap-3">
            <Chip color="success" variant="flat">{countdown.phase}</Chip>
            <div className="flex items-center gap-2 rounded-md border border-divider bg-content1 px-3 py-2 text-sm">
              <CalendarClock size={16} />
              <span>{countdown.label}</span>
              <strong>{countdown.value}</strong>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-md border border-divider bg-content1 p-2 lg:sticky lg:top-24 lg:h-fit">
          <nav className="grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  as={Link}
                  href={item.href}
                  variant="light"
                  className="justify-start"
                  startContent={<Icon size={17} />}
                >
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
