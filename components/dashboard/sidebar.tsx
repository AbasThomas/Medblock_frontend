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
  Cpu,
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
        "flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 relative group overflow-hidden border",
        isActive
          ? "bg-[#0A8F6A]/10 text-white border-[#0A8F6A]/30 shadow-[0_0_20px_rgba(10,143,106,0.1)]"
          : "text-neutral-500 border-transparent hover:text-white hover:bg-white/[0.02] hover:border-white/5"
      )}
    >
      <div className={cn(
        "absolute left-0 top-0 h-full w-1 bg-[#0A8F6A] transition-transform duration-500",
        isActive ? "scale-y-100" : "scale-y-0"
      )} />
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r from-[#0A8F6A]/5 to-transparent transition-opacity duration-500",
        isActive ? "opacity-100" : "opacity-0"
      )} />

      <Icon className={cn(
        "h-4 w-4 shrink-0 transition-all duration-300 relative z-10",
        isActive ? "text-[#0A8F6A] drop-shadow-[0_0_8px_rgba(10,143,106,0.6)]" : "group-hover:text-white"
      )} />
      <span className="relative z-10">{label}</span>

      {isActive && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-[#0A8F6A] shadow-[0_0_8px_rgba(10,143,106,1)]" />
      )}
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
    <div className="flex h-full flex-col backdrop-blur-md bg-black/40 border-r border-white/5">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 group" onClick={onClose}>
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 group-hover:bg-[#0A8F6A]/20 transition-all">
            <Cpu className="h-4 w-4 text-[#0A8F6A]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-white tracking-tight">UniBridge</span>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Protocol</span>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:text-white hover:bg-white/5 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
        <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Navigation
        </p>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} onClick={onClose} />
          ))}
        </div>

        <div className="mt-8">
          <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">
            AI SERVICES
          </p>
          <div className="space-y-1">
            <NavLink href="/dashboard/ai-tools" label="AI Toolkit" icon={Sparkles} onClick={onClose} />
            {role === "admin" && (
              <NavLink href="/dashboard/admin" label="Admin Hub" icon={Shield} onClick={onClose} />
            )}
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/5 px-4 py-6 space-y-2 bg-black/40 backdrop-blur-xl">
        <NavLink href="/dashboard/profile" label="ACCOUNT SETTINGS" icon={Settings} onClick={onClose} />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] text-neutral-500 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/10 border border-transparent transition-all group"
        >
          <LogOut className="h-4 w-4 shrink-0 group-hover:translate-x-1 transition-transform" />
          <span>SIGN OUT</span>
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
      <aside className="hidden h-screen w-64 shrink-0 flex-col lg:flex">
        <SidebarContent role={role} />
      </aside>

      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/50 backdrop-blur-md shadow-sm lg:hidden text-white"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
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
