"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { Menu, LogOut } from "lucide-react";
import { type NavItem, type NavGroup } from "./nav-items";

type MobileNavProps = {
  items: NavItem[];
  groups?: NavGroup[];
  variant: "participant" | "admin";
  onLogout?: () => void;
};

type MenuItem = {
  key: string;
  label: string;
  href?: string;
  icon: typeof LogOut;
  color: "primary" | "default" | "danger";
};

export function MobileNav({ items, groups, variant, onLogout }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const allItems = [
    ...items,
    ...(groups?.flatMap((group) => group.items) ?? []),
  ];

  const menuItems: MenuItem[] = allItems.map((item) => ({
    key: item.href,
    label: item.label,
    href: item.href,
    icon: item.icon,
    color: isActive(item.href) ? "primary" : "default",
  }));

  const logoutItem: MenuItem = {
    key: "logout",
    label: "退出登录",
    icon: LogOut,
    color: "danger",
  };

  const itemsList = variant === "admin" && onLogout
    ? [...menuItems, logoutItem]
    : menuItems;

  return (
    <nav
      aria-label={variant === "admin" ? "管理导航" : "选手导航"}
      className="flex items-center md:hidden"
    >
      <Dropdown placement="bottom-start">
        <DropdownTrigger>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            aria-label="打开导航菜单"
          >
            <Menu size={20} />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label="导航菜单"
          className="w-56"
          items={itemsList}
          onAction={(key) => {
            if (key === "logout" && onLogout) {
              onLogout();
            } else {
              router.push(key as string);
            }
          }}
        >
          {(item) => {
            const Icon = item.icon;
            return (
              <DropdownItem
                key={item.key}
                href={item.href}
                startContent={<Icon size={16} />}
                color={item.color}
              >
                {item.label}
              </DropdownItem>
            );
          }}
        </DropdownMenu>
      </Dropdown>
    </nav>
  );
}
