"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Notification01Icon, Search01Icon } from "hugeicons-react";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import { getNotifications, markAllNotificationsRead } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export function Header({ userName, userEmail, userAvatar }: HeaderProps) {
  const [notifs, setNotifs] = useState<{ id: string; title: string; message: string; read: boolean; type: string; created_at: string }[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const loadNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const data = await getNotifications(supabase, user.id, 10);
        setNotifs(data as typeof notifs);
      } catch {
        // gracefully ignore if table doesn't exist yet
      }
    };
    void loadNotifications();
  }, [supabase]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    try {
      await markAllNotificationsRead(supabase, user.id);
      setNotifs((n) => n.map((item) => ({ ...item, read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/5 bg-black/10 px-8 backdrop-blur-xl">
      {/* Left: search (desktop only) */}
      <div className="hidden items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-2.5 text-sm text-neutral-400 focus-within:border-[#0A8F6A]/50 focus-within:bg-white/5 transition-all duration-500 md:flex w-[450px] group shadow-2xl">
        <Search01Icon size={16} className="text-neutral-500 group-focus-within:text-[#0A8F6A] transition-colors" />
        <input
          type="text"
          placeholder="Search resources, lectures..."
          className="bg-transparent border-none outline-none w-full placeholder:text-neutral-600 text-xs font-bold tracking-widest text-white"
        />
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-neutral-600">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      {/* Spacer for mobile */}
      <div className="w-10 lg:hidden" />

      {/* Right */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-[#0A8F6A]/30 transition-all duration-500 text-neutral-500 hover:text-white group shadow-xl"
          >
            <Notification01Icon size={20} className="group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-lg bg-[#0A8F6A] text-[9px] font-bold text-white shadow-[0_0_15px_rgba(10,143,106,0.5)] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifs(false)}
              />
              <div className="absolute right-0 top-14 z-20 w-80 rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-2xl overflow-hidden animate-reveal">
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 bg-white/[0.02]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#0A8F6A]">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                      <Notification01Icon size={32} className="text-neutral-800 mb-3" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">No new alerts</p>
                    </div>
                  ) : (
                    notifs.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "border-b border-white/5 px-5 py-4 last:border-0 hover:bg-white/[0.02] transition-all",
                          !notif.read && "bg-[#0A8F6A]/5",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_8px_rgba(10,143,106,1)]",
                              !notif.read ? "bg-[#0A8F6A]" : "bg-transparent",
                            )}
                          />
                          <div>
                            <p className="text-xs font-bold text-white tracking-wide uppercase">{notif.title}</p>
                            <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed font-light">{notif.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar */}
        <Link href="/dashboard/profile" className="flex items-center gap-4 group">
          <div className="flex text-right flex-col hidden md:block">
            <p className="text-xs font-bold uppercase tracking-widest text-white group-hover:text-[#0A8F6A] transition-colors">{userName ?? "User Account"}</p>
            <p className="text-[10px] text-neutral-600 font-medium group-hover:text-neutral-400">{userEmail}</p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-[#0A8F6A] rounded-2xl blur-lg opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 text-xs font-bold text-[#0A8F6A] transition-all group-hover:scale-105 group-hover:border-[#0A8F6A]/50 relative z-10">
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatar} alt={userName} className="h-full w-full rounded-2xl object-cover" />
              ) : (
                getInitials(userName ?? userEmail ?? "U")
              )}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
