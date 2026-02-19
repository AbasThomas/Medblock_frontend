import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAdminStats,
  getPendingResources,
  getAllUsers,
} from "@/lib/supabase/queries";
import { AdminPanel } from "./admin-panel";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Check admin role
  let isAdmin = false;
  try {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = data?.role === "admin";
  } catch {
    // Table not set up yet
  }

  if (!isAdmin) {
    redirect("/dashboard");
  }

  let stats = { totalUsers: 0, totalResources: 0, totalLectures: 0, totalOpportunities: 0, pendingApprovals: 0 };
  let pendingResources: {
    id: string; title: string; type: string; course_code: string;
    uploader_name: string; created_at: string; description: string;
  }[] = [];
  let users: {
    id: string; name: string; email: string; role: string; plan: string;
    university: string; points: number; created_at: string;
  }[] = [];

  try {
    [stats, pendingResources, users] = await Promise.all([
      getAdminStats(supabase),
      getPendingResources(supabase) as Promise<typeof pendingResources>,
      getAllUsers(supabase) as Promise<typeof users>,
    ]);
  } catch {
    // Tables not set up yet
  }

  return <AdminPanel stats={stats} pendingResources={pendingResources} users={users} />;
}
