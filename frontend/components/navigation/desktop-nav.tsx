"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { LogOut } from "lucide-react";
import { type NavItem, type NavGroup } from "./nav-items";

type DesktopNavProps = {
  items: NavItem[];
  groups?: NavGroup[];
  variant: "participant" | "admin";
  onLogout?: () => void;
};

export function DesktopNav({ items, groups, variant, onLogout }: DesktopNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => isActive(item.href));
  };

  return (
    <nav
      aria-label={variant === "admin" ? "管理导航" : "选手导航"}
      className="hidden min-w-0 flex-1 flex-wrap items-center gap-1 md:flex"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Button
            key={item.href}
            as={Link}
            href={item.href}
            color={active ? "primary" : "default"}
            variant={active ? "flat" : "light"}
            size="sm"
            startContent={<Icon size={16} />}
          >
            {item.label}
          </Button>
        );
      })}

      {groups?.map((group) => {
        const Icon = group.icon;
        const active = isGroupActive(group);
        const groupItems = group.items.map((item) => ({
          key: item.href,
          label: item.label,
          href: item.href,
          icon: item.icon,
          color: isActive(item.href) ? "primary" as const : "default" as const,
        }));

        return (
          <Dropdown key={group.label}>
            <DropdownTrigger>
              <Button
                color={active ? "primary" : "default"}
                variant={active ? "flat" : "light"}
                size="sm"
                startContent={<Icon size={16} />}
              >
                {group.label}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label={group.label}
              items={groupItems}
            >
              {(item) => {
                const ItemIcon = item.icon;
                return (
                  <DropdownItem
                    key={item.key}
                    href={item.href}
                    startContent={<ItemIcon size={16} />}
                    color={item.color}
                  >
                    {item.label}
                  </DropdownItem>
                );
              }}
            </DropdownMenu>
          </Dropdown>
        );
      })}

      {variant === "admin" && onLogout && (
        <Button
          size="sm"
          variant="light"
          className="text-danger"
          startContent={<LogOut size={16} />}
          onPress={onLogout}
        >
          退出登录
        </Button>
      )}
    </nav>
  );
}
