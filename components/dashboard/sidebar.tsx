"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Trophy,
  User,
  Video,
  X,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/lectures", label: "Lectures", icon: Video },
  { href: "/dashboard/resources", label: "Resources", icon: BookOpen },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: Trophy },
  { href: "/dashboard/wellness", label: "Wellness", icon: HeartPulse },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  role?: string;
}

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "nav-link",
        isActive && "active",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

function SidebarContent({ role, onClose }: { role?: string; onClose?: () => void }) {
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
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-base">UniBridge</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} onClick={onClose} />
        ))}

        <>
          <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Tools
          </p>
          <NavLink href="/dashboard/ai-tools" label="AI Tools" icon={Sparkles} onClick={onClose} />
          {role === "admin" && (
            <NavLink href="/dashboard/admin" label="Admin Hub" icon={Shield} onClick={onClose} />
          )}
        </>
      </nav>

      {/* Bottom */}
      <div className="border-t px-3 py-3 space-y-0.5">
        <NavLink href="/dashboard/profile" label="Settings" icon={Settings} onClick={onClose} />
        <button
          onClick={handleLogout}
          className="nav-link w-full text-left text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ role }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r bg-white lg:flex">
        <SidebarContent role={role} />
      </aside>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-xl border bg-white shadow-sm lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-white shadow-xl transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent role={role} onClose={() => setOpen(false)} />
      </aside>
    </>
  );
}
