"use client";

import { useState, useEffect, useCallback } from "react";
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

  const supabase = createClient();

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
          <h1 className="text-xl font-bold">Lectures</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Join live sessions, watch recordings, or get AI summaries.
          </p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-xl border bg-white p-1">
          {TABS.map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === id
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    tab === id ? "bg-white/20" : "bg-muted",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 sm:ml-auto">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lectures…"
            className="w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lecture) => (
            <div
              key={lecture.id}
              className="flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white",
                    lecture.is_live ? "bg-red-500" : "bg-primary",
                  )}
                >
                  {lecture.is_live ? <Radio className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </div>
                <div className="flex flex-wrap gap-1">
                  {lecture.is_live && (
                    <span className="badge-live rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      LIVE
                    </span>
                  )}
                  {lecture.is_recorded && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      Recorded
                    </span>
                  )}
                  {lecture.offline_available && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                      Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="mt-3 flex-1">
                <p className="text-sm font-semibold leading-snug">{lecture.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {lecture.course_code} · {lecture.lecturer_name}
                </p>
                {lecture.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {lecture.description}
                  </p>
                )}
              </div>

              {/* Meta */}
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateTime(lecture.scheduled_at)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {lecture.duration ?? 60} min
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {lecture.attendees}
                </span>
              </div>

              {/* AI summary */}
              {summaries[lecture.id] && (
                <div className="mt-3 rounded-xl bg-accent p-3 text-xs text-accent-foreground">
                  <p className="font-medium">AI Summary</p>
                  <p className="mt-1">{summaries[lecture.id]}</p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {lecture.is_live && (
                  <a
                    href={lecture.stream_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 py-2 text-xs font-semibold text-white hover:bg-red-600"
                  >
                    <Play className="h-3.5 w-3.5" /> Join Live
                  </a>
                )}
                {lecture.is_recorded && (
                  <a
                    href={lecture.recording_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-white"
                  >
                    <Play className="h-3.5 w-3.5" /> Watch
                  </a>
                )}
                {lecture.offline_available && (
                  <button className="flex items-center justify-center rounded-xl border p-2 hover:bg-muted">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => void handleSummarize(lecture)}
                  disabled={summarizingId === lecture.id}
                  className="flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {summarizingId === lecture.id ? "…" : "AI Summary"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
