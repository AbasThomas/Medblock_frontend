import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight01Icon,
  BookOpen01Icon,
  Calendar01Icon,
  Activity01Icon,
  Award01Icon as TrophyIcon,
  VideoReplayIcon,
} from "hugeicons-react";
import { createClient } from "@/lib/supabase/server";
import { getLectures, getResources, getOpportunities } from "@/lib/supabase/queries";
import { formatNaira, formatDateTime, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Stat Card

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="glass-panel p-6 rounded-2xl group border-[#0A8F6A]/5 hover:border-[#0A8F6A]/30 transition-all duration-500 relative overflow-hidden shadow-2xl">
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#0A8F6A]/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
      <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#0A8F6A]/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-2 group-hover:text-white transition-colors">{label}</p>
          <p className="text-3xl font-bold text-white tracking-tighter group-hover:text-[#0A8F6A] transition-colors">{value}</p>
          {sub && <p className="mt-1 text-[10px] text-[#0A8F6A] font-bold uppercase tracking-widest opacity-80">{sub}</p>}
        </div>
        <div className={cn("rounded-2xl p-3 bg-white/[0.02] border border-white/10 text-white shadow-xl group-hover:scale-110 group-hover:bg-[#0A8F6A] group-hover:border-[#0A8F6A] transition-all duration-500")}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// Page

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  let profile: { name?: string; role?: string; university?: string; points?: number; plan?: string } = {};
  let lectures: {
    id: string; title: string; course_code: string; lecturer_name: string;
    scheduled_at: string; is_live: boolean; duration?: number; university?: string; recording_url?: string;
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
    lectures = (lectureRes ?? [])
      .filter((item) => Boolean(item.recording_url))
      .slice(0, 5) as typeof lectures;
    resources = (resourceRes ?? []) as typeof resources;
    opportunities = (oppRes ?? []) as typeof opportunities;
  } catch {
    // Supabase not configured - show empty states
  }

  const displayName = profile.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
  const resolvedRole = profile.role || user.user_metadata?.role || "student";
  if (resolvedRole === "lecturer") {
    redirect("/dashboard/lecturer");
  }
  const videoLessons = lectures;

  return (
    <div className="space-y-6 animate-reveal">
      {/* Welcome banner */}
      <div className="rounded-3xl bg-hero-gradient p-10 text-white relative overflow-hidden group shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-emerald-600/20 transition-all duration-1000"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#0A8F6A]/5 rounded-full blur-[80px] pointer-events-none group-hover:opacity-100 transition-opacity"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0A8F6A] mb-4">Academic Overview</p>
            <h1 className="text-4xl md:text-5xl font-medium tracking-tighter">Welcome back, {displayName}</h1>
            <p className="text-sm text-neutral-400 font-light max-w-xl">
              <span className="text-[#0A8F6A] font-bold">Institution:</span> {profile.university || "Not set"} -{" "}
              <span className="uppercase text-[9px] font-bold tracking-widest bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">{resolvedRole}</span> -{" "}
              <span className="uppercase text-[9px] font-bold tracking-widest text-[#0A8F6A] bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 px-2 py-0.5 rounded-md">{profile.plan || "basic"} Plan</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard/lectures"
              className="group/btn relative inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-all backdrop-blur-md overflow-hidden"
            >
              <div className="absolute inset-0 bg-[#0A8F6A]/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
              <VideoReplayIcon size={16} className="relative z-10 text-[#0A8F6A]" />
              <span className="relative z-10">Video Lessons</span>
            </Link>
            <Link
              href="/dashboard/opportunities"
              className="group/btn relative inline-flex items-center gap-2 rounded-xl bg-[#0A8F6A] px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
              <TrophyIcon size={16} className="relative z-10" />
              <span className="relative z-10">Opportunities</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Video Lessons"
          value={videoLessons.length}
          sub="On-demand learning"
          icon={VideoReplayIcon}
        />
        <StatCard
          label="Resources Available"
          value={resources.length}
          sub="Browse marketplace"
          icon={BookOpen01Icon}
        />
        <StatCard
          label="Opportunities"
          value={opportunities.length}
          sub="Open applications"
          icon={TrophyIcon}
        />
        <StatCard
          label="Points Earned"
          value={profile.points ?? 0}
          sub="Gamification score"
          icon={Activity01Icon}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Video Lessons */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-white tracking-tight">Recent Video Lessons</h2>
            <Link href="/dashboard/lectures" className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 hover:underline transition-colors">
              View all <ArrowRight01Icon size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {videoLessons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-neutral-500 bg-white/5">
                No video lessons yet. Check back soon.
              </div>
            ) : (
              videoLessons.map((lecture) => (
                <div key={lecture.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition-colors group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-lg bg-emerald-600/80 shadow-emerald-500/20">
                    <VideoReplayIcon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{lecture.title}</p>
                    <p className="text-xs text-neutral-500">
                      {lecture.course_code} - {lecture.lecturer_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                      <Calendar01Icon size={12} />
                      Uploaded {formatDateTime(lecture.scheduled_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Resources */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-white tracking-tight">Recent Resources</h2>
            <Link href="/dashboard/resources" className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 hover:underline transition-colors">
              View all <ArrowRight01Icon size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {resources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-neutral-500 bg-white/5">
                No resources yet. Be the first to upload!
              </div>
            ) : (
              resources.map((resource) => (
                <div key={resource.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition-colors group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/5 text-neutral-400 group-hover:text-white transition-colors">
                    <BookOpen01Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{resource.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-white/5 bg-white/5 text-neutral-400")}>
                        {resource.type}
                      </span>
                      <span className="text-xs text-neutral-500">{resource.course_code}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {resource.downloads} downloads - * {resource.rating} - {timeAgo(resource.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Opportunities */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-white tracking-tight">Open Opportunities</h2>
          <Link href="/dashboard/opportunities" className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 hover:underline transition-colors">
            View all <ArrowRight01Icon size={12} />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {opportunities.length === 0 ? (
            <div className="col-span-4 rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-neutral-500 bg-white/5">
              No opportunities found. Check back later.
            </div>
          ) : (
            opportunities.map((opp) => (
              <div key={opp.id} className="rounded-xl border border-white/5 bg-white/5 p-4 hover:bg-white/10 hover:border-white/10 transition-all group cursor-pointer">
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20")}>
                  {opp.type}
                </span>
                <p className="mt-3 text-sm font-medium leading-snug text-neutral-200 group-hover:text-white transition-colors line-clamp-2 min-h-[2.5rem]">{opp.title}</p>
                <p className="mt-1 text-xs text-neutral-500">{opp.organization}</p>
                {opp.amount && (
                  <p className="mt-2 text-sm font-semibold text-emerald-400">{formatNaira(opp.amount)}</p>
                )}
                <p className="mt-2 text-xs text-neutral-500 pt-2 border-t border-white/5 flex justify-between items-center">
                  <span>{new Date(opp.deadline).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                  {opp.is_remote && <span className="text-neutral-400">Remote</span>}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
