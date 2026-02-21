import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LecturerHubClient } from "./lecturer-hub-client";

export default async function LecturerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [profileRes, lecturesRes, resourcesRes, opportunitiesRes, eventsRes] = await Promise.all([
    supabase.from("profiles").select("name, role, university").eq("id", user.id).single(),
    supabase
      .from("lectures")
      .select("*")
      .eq("lecturer_id", user.id)
      .order("scheduled_at", { ascending: false }),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("uploaded_by", user.id),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("created_by", user.id),
    supabase.from("student_events").select("id", { count: "exact", head: true }).eq("created_by", user.id),
  ]);

  const profile = profileRes.data;
  const resolvedRole = profile?.role || user.user_metadata?.role;

  // Only lecturers and admins can access this page
  if (resolvedRole !== "lecturer" && resolvedRole !== "admin") {
    redirect("/dashboard");
  }

  const initialSessions = (lecturesRes.data ?? []) as Parameters<typeof LecturerHubClient>[0]["initialSessions"];

  return (
    <LecturerHubClient
      initialSessions={initialSessions}
      profile={{
        name: profile?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Lecturer",
        role: resolvedRole,
        university: profile?.university || "",
      }}
      userId={user.id}
      resourceCount={resourcesRes.count ?? 0}
      opportunityCount={opportunitiesRes.count ?? 0}
      eventCount={eventsRes.count ?? 0}
    />
  );
}
