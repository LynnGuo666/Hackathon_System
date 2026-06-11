import { BedDouble, ClipboardList, Home, LayoutDashboard, LogOut, MapPin, Settings2, SlidersHorizontal, Ticket, UserRoundPen, Utensils, Users, CheckCircle, Gift, Mail, Coffee, Bed, Navigation } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

export const featureNavIcons: Record<string, LucideIcon> = {
  "/p/profile": UserRoundPen,
  "/p/accommodation": BedDouble,
  "/p/meal-order": Utensils,
  "/p/location": MapPin,
  "/p/resources": Ticket,
};

export const participantNavItems: NavItem[] = [
  { href: "/p/dashboard", label: "总览", icon: Home },
  { href: "/p/services", label: "赛事服务", icon: ClipboardList },
  { href: "/p/enrollment", label: "报名", icon: ClipboardList },
];

export const adminNavGroups: NavGroup[] = [
  {
    label: "运营功能",
    icon: Users,
    items: [
      { href: "/admin/enrollments", label: "报名审核", icon: ClipboardList },
      { href: "/admin/accounts", label: "账号管理", icon: Users },
      { href: "/admin/checkins", label: "CheckinID", icon: CheckCircle },
      { href: "/admin/resources", label: "资源发放", icon: Gift },
      { href: "/admin/email-outbox", label: "邮件队列", icon: Mail },
      { href: "/admin/meal-orders", label: "餐饮补给", icon: Coffee },
      { href: "/admin/accommodation", label: "赛前需求", icon: Bed },
    ],
  },
  {
    label: "系统配置",
    icon: Settings2,
    items: [
      { href: "/admin/settings", label: "比赛基础信息", icon: SlidersHorizontal },
      { href: "/admin/features", label: "功能模块", icon: Settings2 },
      { href: "/admin/navigation", label: "入口导航", icon: Navigation },
    ],
  },
];

export const adminNavItems: NavItem[] = [
  { href: "/admin", label: "后台首页", icon: LayoutDashboard },
];
