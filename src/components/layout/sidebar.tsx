"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Store,
  Wallet,
  Bookmark,
  Settings,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Users,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { useState } from "react";
import { RoleSwitcher } from "./role-switcher";
import { UserMenu } from "./user-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const brandNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Creators", href: "/creators", icon: Users },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Wallet", href: "/wallet", icon: Wallet },
];

const creatorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Marketplace", href: "/marketplace", icon: Store },
  { label: "My Campaigns", href: "/my-campaigns", icon: Megaphone },
  { label: "Earnings", href: "/earnings", icon: DollarSign },
  { label: "Saved", href: "/saved", icon: Bookmark },
];

const commonNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const activeRole = (session?.user as any)?.activeRole || "CREATOR";
  const isBrand = activeRole === "BRAND";

  const navItems = isBrand ? brandNavItems : creatorNavItems;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-foreground">
                ViralManager
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1.5 hover:bg-muted"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Role Switcher */}
        {!collapsed && (
          <div className="border-b border-border p-4">
            <RoleSwitcher />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", collapsed && "mx-auto")} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Separator */}
          <div className="my-4 border-t border-border" />

          {/* Common items */}
          {commonNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", collapsed && "mx-auto")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="border-t border-border p-3">
          <UserMenu collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}
