import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar01Icon,
  SignalIcon,
  VideoReplayIcon,
  BookOpen01Icon,
  Award01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  UserGroupIcon,
} from "hugeicons-react";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDateTime } from "@/lib/utils";

type LecturerLecture = {
  id: string;
  title: string;
  course_code: string;
  scheduled_at: string;
  is_live: boolean;
  is_recorded: boolean;
  attendees: number;
  stream_url?: string;
};

export default async function LecturerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [profileRes, lecturesRes, resourcesRes, opportunitiesRes] = await Promise.all([
    supabase.from("profiles").select("name, role, university").eq("id", user.id).single(),
    supabase
      .from("lectures")
      .select("id, title, course_code, scheduled_at, is_live, is_recorded, attendees, stream_url")
      .eq("lecturer_id", user.id)
      .order("scheduled_at", { ascending: false })
      .limit(10),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("uploaded_by", user.id),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("created_by", user.id),
  ]);

  const profile = profileRes.data;
  const resolvedRole = profile?.role || user.user_metadata?.role;
  if (resolvedRole !== "lecturer" && resolvedRole !== "admin") {
    redirect("/dashboard");
  }

  const lectures = (lecturesRes.data ?? []) as LecturerLecture[];
  const liveCount = lectures.filter((lecture) => lecture.is_live).length;
  const upcomingCount = lectures.filter(
    (lecture) => !lecture.is_live && !lecture.is_recorded && new Date(lecture.scheduled_at) > new Date(),
  ).length;
  const recordedCount = lectures.filter((lecture) => lecture.is_recorded).length;

  const stats = [
    { label: "Total Sessions", value: lectures.length, icon: VideoReplayIcon },
    { label: "Live Sessions", value: liveCount, icon: SignalIcon },
    { label: "Upcoming Sessions", value: upcomingCount, icon: Calendar01Icon },
    { label: "Published Recordings", value: recordedCount, icon: Clock01Icon },
    { label: "Resources Uploaded", value: resourcesRes.count ?? 0, icon: BookOpen01Icon },
    { label: "Opportunities Posted", value: opportunitiesRes.count ?? 0, icon: Award01Icon },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">Lecturer Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Welcome, {profile?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Lecturer"}
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Manage lecture delivery, activate live sessions, and publish teaching assets for your institution.
        </p>
        <p className="mt-1 text-xs uppercase tracking-widest text-neutral-500">{profile?.university || "Institution not set"}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/lectures?create=1"
            className="rounded-xl bg-[#0A8F6A] px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-opacity hover:opacity-90"
          >
            Post Lecture
          </Link>
          <Link
            href="/dashboard/lectures?tab=live"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
          >
            Manage Live Sessions
          </Link>
          <Link
            href="/dashboard/resources"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
          >
            Upload Resources
          </Link>
          <Link
            href="/dashboard/opportunities?mine=1"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
          >
            Post Opportunities
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
              <Icon size={22} className="text-[#0A8F6A]" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">My Lecture Sessions</h2>
          <Link
            href="/dashboard/lectures"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-[#0A8F6A] hover:text-emerald-400"
          >
            Open Studio <ArrowRight01Icon size={14} />
          </Link>
        </div>

        {lectures.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/15 py-10 text-center text-sm text-neutral-500">
            No lecture sessions created yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {lectures.map((lecture) => (
              <div
                key={lecture.id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-white">{lecture.title}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        lecture.is_live
                          ? "bg-red-500/15 text-red-400"
                          : lecture.is_recorded
                            ? "bg-[#0A8F6A]/15 text-[#0A8F6A]"
                            : "bg-white/10 text-neutral-400",
                      )}
                    >
                      {lecture.is_live ? "Live" : lecture.is_recorded ? "Recorded" : "Scheduled"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-widest text-neutral-500">{lecture.course_code}</p>
                  <p className="mt-2 text-xs text-neutral-400">{formatDateTime(lecture.scheduled_at)}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <span className="inline-flex items-center gap-1">
                    <UserGroupIcon size={14} className="text-[#0A8F6A]" /> {lecture.attendees ?? 0}
                  </span>
                  {lecture.stream_url && (
                    <a
                      href={lecture.stream_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
                    >
                      Stream
                    </a>
                  )}
                  <Link
                    href="/dashboard/lectures"
                    className="rounded-lg bg-[#0A8F6A] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
