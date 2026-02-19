"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  Clock,
  Download,
  Play,
  Radio,
  Search,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getLectures } from "@/lib/supabase/queries";
import { formatDateTime, cn } from "@/lib/utils";

type Lecture = {
  id: string;
  title: string;
  course_code: string;
  lecturer_name: string;
  university: string;
  department: string;
  scheduled_at: string;
  duration: number;
  is_live: boolean;
  is_recorded: boolean;
  recording_url?: string;
  stream_url?: string;
  attendees: number;
  description?: string;
  tags: string[];
  summary?: string;
  offline_available: boolean;
};

type Tab = "all" | "live" | "upcoming" | "recorded";

export default function LecturesPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const supabase = useMemo(() => createClient(), []);

  const loadLectures = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLectures(supabase, {});
      setLectures(data as Lecture[]);
    } catch (err) {
      toast.error("Failed to load lectures.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadLectures();

    // Realtime subscription for live lecture changes
    const channel = supabase
      .channel("lectures-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, () => {
        void loadLectures();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadLectures, supabase]);

  const filtered = lectures.filter((l) => {
    const matchesSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.course_code.toLowerCase().includes(search.toLowerCase()) ||
      l.lecturer_name.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      tab === "all" ||
      (tab === "live" && l.is_live) ||
      (tab === "upcoming" && !l.is_live && !l.is_recorded && new Date(l.scheduled_at) > new Date()) ||
      (tab === "recorded" && l.is_recorded);

    return matchesSearch && matchesTab;
  });

  const handleSummarize = async (lecture: Lecture) => {
    const text = lecture.description ?? `${lecture.title} – ${lecture.course_code} by ${lecture.lecturer_name}.`;
    if (!text) return;
    try {
      setSummarizingId(lecture.id);
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: "en" }),
      });
      const data = await res.json() as { summary?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSummaries((prev) => ({ ...prev, [lecture.id]: data.summary ?? "" }));
      toast.success("Summary generated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not summarize.");
    } finally {
      setSummarizingId(null);
    }
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "all", label: "All", count: lectures.length },
    { id: "live", label: "Live Now", count: lectures.filter((l) => l.is_live).length },
    { id: "upcoming", label: "Upcoming" },
    { id: "recorded", label: "Recorded", count: lectures.filter((l) => l.is_recorded).length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Lectures</h1>
          <p className="mt-1 text-sm text-neutral-400 font-light">
            Join live sessions, watch recordings, or get AI summaries.
          </p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-black/20 p-1 backdrop-blur-sm">
          {TABS.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all",
                tab === id
                  ? "bg-[#0A8F6A] text-white shadow-[0_0_15px_rgba(10,143,106,0.3)]"
                  : "text-neutral-500 hover:text-white hover:bg-white/5",
              )}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    tab === id ? "bg-white/20" : "bg-white/5 text-neutral-500",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 sm:ml-auto focus-within:border-[#0A8F6A]/50 transition-colors">
          <Search className="h-4 w-4 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lectures…"
            className="w-48 bg-transparent text-sm outline-none text-neutral-200 placeholder:text-neutral-500"
          />
        </div>
      </div>

      {/* Lecture grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center">
          <Video className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No lectures found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search ? "Try a different search." : "Check back when lectures are scheduled."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lecture) => (
            <div
              key={lecture.id}
              className="glass-panel flex flex-col rounded-2xl p-6 shadow-2xl group hover:border-[#0A8F6A]/30 transition-all duration-500"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg",
                    lecture.is_live ? "bg-red-500 shadow-red-500/20 animate-pulse" : "bg-[#0A8F6A] shadow-emerald-500/20",
                  )}
                >
                  {lecture.is_live ? <Radio className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </div>
                <div className="flex flex-wrap gap-1">
                  {lecture.is_live && (
                    <span className="rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-[10px] font-bold text-red-500 tracking-widest uppercase">
                      LIVE
                    </span>
                  )}
                  {lecture.is_recorded && (
                    <span className="rounded-full bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 px-3 py-1 text-[10px] font-bold text-[#0A8F6A] tracking-widest uppercase">
                      Recorded
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="mt-6 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#0A8F6A] font-semibold mb-2">{lecture.course_code}</p>
                <p className="text-lg font-medium leading-tight text-white group-hover:text-[#0A8F6A] transition-colors duration-300">{lecture.title}</p>
                <p className="mt-2 text-sm text-neutral-400 font-light">
                  {lecture.lecturer_name}
                </p>
                {lecture.description && (
                  <p className="mt-4 line-clamp-2 text-xs text-neutral-500 font-light leading-relaxed">
                    {lecture.description}
                  </p>
                )}
              </div>

              {/* Meta */}
              <div className="mt-6 space-y-2 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                  <Calendar className="h-3.5 w-3.5 text-[#0A8F6A]" />
                  {formatDateTime(lecture.scheduled_at)}
                </div>
                <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#0A8F6A]" /> {lecture.duration ?? 60} MIN
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#0A8F6A]" /> {lecture.attendees} ACCESSES
                  </span>
                </div>
              </div>

              {/* AI summary */}
              {summaries[lecture.id] && (
                <div className="mt-6 rounded-xl bg-[#0A8F6A]/5 border border-[#0A8F6A]/20 p-4 text-xs font-light leading-relaxed text-neutral-300">
                  <p className="font-bold uppercase tracking-[0.2em] text-[#0A8F6A] mb-2 text-[10px]">AI Insight Summary</p>
                  <p>{summaries[lecture.id]}</p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                {lecture.is_live ? (
                  <a
                    href={lecture.stream_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    <Play className="h-3.5 w-3.5" /> Join Live
                  </a>
                ) : (
                  lecture.is_recorded && (
                    <a
                      href={lecture.recording_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0A8F6A] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Play className="h-3.5 w-3.5" /> Watch
                    </a>
                  )
                )}
                {lecture.offline_available && (
                  <button className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2.5 text-neutral-400 hover:text-white hover:border-white/20 transition-all">
                    <Download className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => void handleSummarize(lecture)}
                  disabled={summarizingId === lecture.id}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#0A8F6A]" />
                  {summarizingId === lecture.id ? "..." : "AI Sync"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
