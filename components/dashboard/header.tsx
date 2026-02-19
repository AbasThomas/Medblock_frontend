"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
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
  const supabase = createClient();

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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white/90 px-4 backdrop-blur md:px-6">
      {/* Left: search (desktop only) */}
      <div className="hidden items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground md:flex">
        <Search className="h-3.5 w-3.5" />
        <span>Search lectures, resources…</span>
      </div>

      {/* Spacer for mobile (because of the fixed sidebar button) */}
      <div className="w-10 lg:hidden" />

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white hover:bg-muted"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
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
              <div className="absolute right-0 top-11 z-20 w-80 rounded-xl border bg-white shadow-lg">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </p>
                  ) : (
                    notifs.map((notif) => (
                      <div
                        key={notif.id}
                        className={cn(
                          "border-b px-4 py-3 last:border-0",
                          !notif.read && "bg-accent/30",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                              !notif.read ? "bg-primary" : "bg-transparent",
                            )}
                          />
                          <div>
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-xs text-muted-foreground">{notif.message}</p>
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
        <Link href="/dashboard/profile" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt={userName} className="h-full w-full rounded-xl object-cover" />
            ) : (
              getInitials(userName ?? userEmail ?? "U")
            )}
          </div>
          <div className="hidden text-sm md:block">
            <p className="font-medium leading-tight">{userName ?? "User"}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
