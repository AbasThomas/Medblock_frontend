"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen01Icon,
  ArrowShrink02Icon,
  ArrowExpand02Icon,
  Activity01Icon,
  DashboardSquare01Icon,
  Logout01Icon,
  Menu01Icon,
  Settings01Icon,
  SparklesIcon,
  Award01Icon as TrophyIcon,
  UserCircleIcon,
  VideoReplayIcon,
  Cancel01Icon,
  Shield01Icon,
} from "hugeicons-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const SIDEBAR_COLLAPSED_KEY = "unibridge.sidebar.collapsed";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: DashboardSquare01Icon, exact: true },
  { href: "/dashboard/lectures", label: "Lectures", icon: VideoReplayIcon },
  { href: "/dashboard/resources", label: "Resources", icon: BookOpen01Icon },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: TrophyIcon },
  { href: "/dashboard/wellness", label: "Wellness", icon: Activity01Icon },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircleIcon },
];

interface SidebarProps {
  role?: string;
}

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative overflow-hidden rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300",
        collapsed ? "flex items-center justify-center px-0" : "flex items-center gap-3",
        isActive
          ? "border-[#0A8F6A]/30 bg-[#0A8F6A]/10 text-white shadow-[0_0_20px_rgba(10,143,106,0.1)]"
          : "border-transparent text-neutral-500 hover:border-white/5 hover:bg-white/[0.02] hover:text-white",
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1 bg-[#0A8F6A] transition-transform duration-500",
          isActive ? "scale-y-100" : "scale-y-0",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-[#0A8F6A]/5 to-transparent transition-opacity duration-500",
          isActive ? "opacity-100" : "opacity-0",
        )}
      />

      <Icon
        className={cn(
          "relative z-10 shrink-0 transition-all duration-300",
          collapsed ? "h-6 w-6" : "h-6 w-6",
          isActive ? "text-[#0A8F6A] drop-shadow-[0_0_8px_rgba(10,143,106,0.6)]" : "group-hover:text-white",
        )}
      />
      {!collapsed && <span className="relative z-10">{label}</span>}

      {isActive && !collapsed && (
        <div className="absolute right-3 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[#0A8F6A] shadow-[0_0_8px_rgba(10,143,106,1)]" />
      )}
    </Link>
  );
}

function SidebarContent({
  role,
  collapsed,
  onToggleCollapse,
  onClose,
}: {
  role?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out.");
      return;
    }
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col border-r border-white/5 bg-black/40 backdrop-blur-md">
      <div className={cn("flex items-center justify-between border-b border-white/5 px-4 py-6", collapsed ? "px-3" : "px-6")}>
        <Link href="/" className={cn("group flex items-center", collapsed ? "justify-center" : "gap-1.5")} onClick={onClose} title={collapsed ? "UniBridge" : undefined}>
          <Image
            src="/logo.png"
            alt="UniBridge logo"
            width={44}
            height={44}
            className="h-11 w-11 object-contain shrink-0"
            priority
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white leading-none">UniBridge</span>
              <span className="text-[11px] uppercase tracking-widest text-neutral-500">Platform</span>
            </div>
          )}
        </Link>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 transition-all hover:bg-white/5 hover:text-white lg:hidden">
            <Cancel01Icon size={20} />
          </button>
        )}
        {!onClose && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-lg p-1 text-neutral-400 transition-all hover:bg-white/5 hover:text-white"
          >
            {collapsed ? <ArrowExpand02Icon size={20} /> : <ArrowShrink02Icon size={20} />}
          </button>
        )}
      </div>

      <nav className={cn("flex-1 overflow-y-auto py-6", collapsed ? "space-y-3 px-3" : "space-y-1 px-4")}>
        {!collapsed && (
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
            Navigation
          </p>
        )}
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} collapsed={collapsed} onClick={onClose} />
          ))}
        </div>

        <div className={cn(collapsed ? "mt-4" : "mt-8")}>
          {!collapsed && (
            <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">
              AI Services
            </p>
          )}
          <div className="space-y-1">
            <NavLink href="/dashboard/ai-tools" label="AI Toolkit" icon={SparklesIcon} collapsed={collapsed} onClick={onClose} />
            {role === "admin" && (
              <NavLink href="/dashboard/admin" label="Admin Hub" icon={Shield01Icon} collapsed={collapsed} onClick={onClose} />
            )}
          </div>
        </div>
      </nav>

      <div className={cn("space-y-2 border-t border-white/5 bg-black/40 backdrop-blur-xl", collapsed ? "px-3 py-4" : "px-4 py-6")}>
        <NavLink href="/dashboard/profile" label="Account Settings" icon={Settings01Icon} collapsed={collapsed} onClick={onClose} />
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "group w-full rounded-xl border border-transparent py-3 text-xs font-bold uppercase tracking-[0.15em] text-neutral-500 transition-all hover:border-red-500/10 hover:bg-red-500/5 hover:text-red-400",
            collapsed ? "flex items-center justify-center px-0" : "flex items-center gap-3 px-4",
          )}
        >
          <Logout01Icon size={24} className="shrink-0 transition-transform group-hover:translate-x-1" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ role }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore storage access issues.
      }
      return next;
    });
  };

  return (
    <>
      <aside
        className={cn(
          "hidden h-screen shrink-0 flex-col transition-all duration-300 lg:flex",
          collapsed ? "w-24" : "w-72",
        )}
      >
        <SidebarContent role={role} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>

      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-white shadow-sm backdrop-blur-md lg:hidden"
      >
        <Menu01Icon size={24} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent role={role} onClose={() => setOpen(false)} />
      </aside>
    </>
  );
}
