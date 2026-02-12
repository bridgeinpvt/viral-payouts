"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Store,
  Megaphone,
  BarChart3,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { UserMenu } from "./user-menu";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/creator/dashboard", icon: LayoutDashboard },
  { label: "Marketplace", href: "/creator/marketplace", icon: Store },
  { label: "My Campaigns", href: "/creator/my-campaigns", icon: Megaphone },
  { label: "Analytics", href: "/creator/analytics", icon: BarChart3 },
  { label: "Wallet", href: "/creator/wallet", icon: Wallet },
];

const bottomNavItems: NavItem[] = [
  { label: "Settings", href: "/creator/settings", icon: Settings },
];

export function CreatorSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link href="/creator/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Rocket className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-foreground">Nocage</span>
          )}
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block rounded-md p-1.5 hover:bg-muted">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden rounded-md p-1.5 hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
      </div>

      {!collapsed && (
        <div className="border-b border-border px-4 py-2">
          <span className="text-xs font-medium uppercase text-muted-foreground">Creator</span>
        </div>
      )}

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
            </Link>
          );
        })}

        <div className="my-4 border-t border-border" />

        {bottomNavItems.map((item) => {
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

      <div className="border-t border-border p-3">
        <UserMenu collapsed={collapsed} />
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 hover:bg-muted">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/creator/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Rocket className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Nocage</span>
        </Link>
        <div className="w-9" />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-[280px] border-r border-border bg-card transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-screen border-r border-border bg-card transition-all duration-300 lg:block",
          collapsed ? "w-[70px]" : "w-[260px]"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
