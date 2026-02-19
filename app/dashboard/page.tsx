import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  HeartPulse,
  Trophy,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLectures, getResources, getOpportunities } from "@/lib/supabase/queries";
import { formatNaira, formatDateTime, timeAgo, getResourceTypeColor, getOpportunityTypeColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("rounded-xl p-2.5", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  let profile: { name?: string; role?: string; university?: string; points?: number; plan?: string } = {};
  let lectures: {
    id: string; title: string; course_code: string; lecturer_name: string;
    scheduled_at: string; is_live: boolean; duration?: number; university?: string;
  }[] = [];
  let resources: {
    id: string; title: string; type: string; course_code: string;
    downloads: number; rating: number; uploader_name: string; created_at: string;
  }[] = [];
  let opportunities: {
    id: string; title: string; type: string; organization: string;
    amount?: number; deadline: string; is_remote: boolean;
  }[] = [];

  try {
    const [profileRes, lectureRes, resourceRes, oppRes] = await Promise.all([
      supabase.from("profiles").select("name, role, university, points, plan").eq("id", user.id).single(),
      getLectures(supabase, {}),
      getResources(supabase, { isApproved: true }, 4),
      getOpportunities(supabase, {}, 4),
    ]);

    if (profileRes.data) profile = profileRes.data;
    lectures = (lectureRes ?? []).slice(0, 5) as typeof lectures;
    resources = (resourceRes ?? []) as typeof resources;
    opportunities = (oppRes ?? []) as typeof opportunities;
  } catch {
    // Supabase not configured — show empty states
  }

  const displayName = profile.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
  const liveLectures = lectures.filter((l) => l.is_live);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-hero-gradient p-6 text-white">
        <p className="text-sm text-white/70">Good day 👋</p>
        <h1 className="mt-1 text-2xl font-bold">Welcome back, {displayName}</h1>
        <p className="mt-1 text-sm text-white/80">
          {profile.university ?? "University of Lagos"} ·{" "}
          <span className="capitalize">{profile.role ?? "student"}</span> ·{" "}
          <span className="capitalize">{profile.plan ?? "basic"} plan</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/lectures"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/30"
          >
            <Video className="h-3.5 w-3.5" /> View Lectures
          </Link>
          <Link
            href="/dashboard/opportunities"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/30"
          >
            <Trophy className="h-3.5 w-3.5" /> Find Opportunities
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Lectures"
          value={lectures.length}
          sub={`${liveLectures.length} live now`}
          icon={Video}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Resources Available"
          value={resources.length}
          sub="Browse marketplace"
          icon={BookOpen}
          color="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          label="Opportunities"
          value={opportunities.length}
          sub="Open applications"
          icon={Trophy}
          color="bg-orange-100 text-orange-700"
        />
        <StatCard
          label="Points Earned"
          value={profile.points ?? 0}
          sub="Gamification score"
          icon={HeartPulse}
          color="bg-purple-100 text-purple-700"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Lectures */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent Lectures</h2>
            <Link href="/dashboard/lectures" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {lectures.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed py-8 text-center text-sm text-muted-foreground">
                No lectures yet. Check back soon.
              </div>
            ) : (
              lectures.map((lecture) => (
                <div key={lecture.id} className="flex items-start gap-3 rounded-xl border p-3">
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white",
                    lecture.is_live ? "bg-red-500" : "bg-primary",
                  )}>
                    <Video className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{lecture.title}</p>
                      {lecture.is_live && (
                        <span className="badge-live shrink-0 text-[10px] font-semibold text-red-600">
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lecture.course_code} · {lecture.lecturer_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(lecture.scheduled_at)}
                    </p>
                  </div>
                  {lecture.is_live && (
                    <Link
                      href={`/dashboard/lectures`}
                      className="shrink-0 rounded-lg bg-primary px-2 py-1 text-[10px] font-semibold text-white"
                    >
                      Join
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Resources */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent Resources</h2>
            <Link href="/dashboard/resources" className="flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {resources.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed py-8 text-center text-sm text-muted-foreground">
                No resources yet. Be the first to upload!
              </div>
            ) : (
              resources.map((resource) => (
                <div key={resource.id} className="flex items-start gap-3 rounded-xl border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{resource.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", getResourceTypeColor(resource.type))}>
                        {resource.type}
                      </span>
                      <span className="text-xs text-muted-foreground">{resource.course_code}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {resource.downloads} downloads · ⭐ {resource.rating} · {timeAgo(resource.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Opportunities */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Open Opportunities</h2>
          <Link href="/dashboard/opportunities" className="flex items-center gap-1 text-xs text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {opportunities.length === 0 ? (
            <div className="col-span-4 rounded-xl border-2 border-dashed py-8 text-center text-sm text-muted-foreground">
              No opportunities found. Check back later.
            </div>
          ) : (
            opportunities.map((opp) => (
              <div key={opp.id} className="rounded-xl border p-4 hover:shadow-sm transition-shadow">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", getOpportunityTypeColor(opp.type))}>
                  {opp.type}
                </span>
                <p className="mt-2 text-sm font-medium leading-snug">{opp.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{opp.organization}</p>
                {opp.amount && (
                  <p className="mt-1 text-sm font-semibold text-primary">{formatNaira(opp.amount)}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Deadline: {new Date(opp.deadline).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                  {opp.is_remote && " · Remote"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
