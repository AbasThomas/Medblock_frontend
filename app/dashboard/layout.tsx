import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch profile for sidebar/header
  let profile: { name?: string; role?: string; avatar?: string } = {};
  try {
    const { data } = await supabase.from("profiles").select("name, role, avatar").eq("id", user.id).single();
    if (data) profile = data;
  } catch {
    // Profile may not exist yet if Supabase isn't configured — degrade gracefully
  }

  const displayName = profile.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const resolvedRole = profile.role || user.user_metadata?.role;

  return (
    <div className="flex min-h-screen lg:h-screen overflow-hidden bg-transparent">
      <Sidebar role={resolvedRole} />
      <div className="flex flex-1 flex-col overflow-hidden bg-black/10 backdrop-blur-md border-l border-white/5">
        <Header
          userName={displayName}
          userEmail={user.email}
          userAvatar={profile.avatar}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">{children}</main>
      </div>
    </div>
  );
}
