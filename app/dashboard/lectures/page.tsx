"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import {
  Calendar01Icon,
  Clock01Icon,
  Download01Icon,
  PlayIcon,
  SignalIcon,
  Search01Icon,
  SparklesIcon,
  UserGroupIcon,
  VideoReplayIcon,
  PlusSignIcon,
  Cancel01Icon,
} from "hugeicons-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  addUserPoints,
  createLecture,
  getLectures,
  setLectureLiveStatus,
  updateLectureAttendees,
} from "@/lib/supabase/queries";
import { formatDateTime, cn } from "@/lib/utils";

type Lecture = {
  id: string;
  title: string;
  course_code: string;
  lecturer_id?: string;
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

type LectureForm = {
  title: string;
  course_code: string;
  scheduled_at: string;
  duration: string;
  description: string;
  stream_url: string;
  tags: string;
};

export default function LecturesPage() {
  const searchParams = useSearchParams();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    role: "student" | "lecturer" | "admin";
    name: string;
    university: string;
    department: string;
  }>({ role: "student", name: "", university: "", department: "" });

  const [showCreate, setShowCreate] = useState(false);
  const [creatingLecture, setCreatingLecture] = useState(false);
  const [lectureForm, setLectureForm] = useState<LectureForm>({
    title: "",
    course_code: "",
    scheduled_at: "",
    duration: "60",
    description: "",
    stream_url: "",
    tags: "",
  });

  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [sessionConnected, setSessionConnected] = useState(false);

  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const createIntentHandledRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);

  const canCreateLecture = profile.role === "lecturer" || profile.role === "admin";

  const canManageLecture = useCallback(
    (lecture: Lecture) => {
      if (!userId) return false;
      if (profile.role === "admin") return true;
      return profile.role === "lecturer" && lecture.lecturer_id === userId;
    },
    [profile.role, userId],
  );

  const loadIdentity = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      return;
    }

    setUserId(user.id);

    try {
      const { data } = await supabase
        .from("profiles")
        .select("role, name, university, department")
        .eq("id", user.id)
        .single();

      const metadataRole = user.user_metadata?.role;
      const resolvedRole =
        data?.role && (data.role === "student" || data.role === "lecturer" || data.role === "admin")
          ? data.role
          : metadataRole === "student" || metadataRole === "lecturer" || metadataRole === "admin"
            ? metadataRole
            : "student";

      setProfile({
        role: resolvedRole,
        name: data?.name ?? user.email?.split("@")[0] ?? "User",
        university: data?.university ?? "",
        department: data?.department ?? "",
      });
    } catch {
      setProfile((prev) => ({
        ...prev,
        name: user.email?.split("@")[0] ?? "User",
      }));
    }
  }, [supabase]);

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

  const leaveLiveRoom = useCallback(async () => {
    const channel = roomChannelRef.current;
    if (channel) {
      await supabase.removeChannel(channel);
      roomChannelRef.current = null;
    }
    setSessionConnected(false);
    setConnectedPeers(0);
    setActiveLecture(null);
  }, [supabase]);

  const joinLiveRoom = useCallback(
    async (lecture: Lecture) => {
      if (!userId) {
        toast.error("Please sign in to join a live session.");
        return;
      }
      if (!lecture.is_live) {
        toast.error("This session is not live yet.");
        return;
      }

      await leaveLiveRoom();

      const roomChannel = supabase.channel(`lecture-room-${lecture.id}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      roomChannel
        .on("presence", { event: "sync" }, () => {
          const state = roomChannel.presenceState();
          const total = Object.values(state).reduce((sum, entries) => sum + entries.length, 0);
          setConnectedPeers(total);

          if (canManageLecture(lecture)) {
            void updateLectureAttendees(supabase, lecture.id, total);
          }
        })
        .on("broadcast", { event: "session-stopped" }, () => {
          toast.info("Lecture host has ended the live session.");
          void leaveLiveRoom();
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void roomChannel.track({
              user_id: userId,
              name: profile.name || "Participant",
              joined_at: new Date().toISOString(),
            });
            setSessionConnected(true);
            void addUserPoints(supabase, userId, 5).catch(() => {
              // Joining live session should still work if points update fails.
            });
          }
        });

      roomChannelRef.current = roomChannel;
      setActiveLecture(lecture);
    },
    [canManageLecture, leaveLiveRoom, profile.name, supabase, userId],
  );

  useEffect(() => {
    void loadIdentity();
    void loadLectures();

    const channel = supabase
      .channel("lectures-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "lectures" }, () => {
        void loadLectures();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      void leaveLiveRoom();
    };
  }, [leaveLiveRoom, loadIdentity, loadLectures, supabase]);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab === "all" || urlTab === "live" || urlTab === "upcoming" || urlTab === "recorded") {
      setTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("create") === "1" && canCreateLecture && !createIntentHandledRef.current) {
      createIntentHandledRef.current = true;
      setShowCreate(true);
    }
  }, [canCreateLecture, searchParams]);

  const filtered = lectures.filter((lecture) => {
    const matchesSearch =
      !search ||
      lecture.title.toLowerCase().includes(search.toLowerCase()) ||
      lecture.course_code.toLowerCase().includes(search.toLowerCase()) ||
      lecture.lecturer_name.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      tab === "all" ||
      (tab === "live" && lecture.is_live) ||
      (tab === "upcoming" && !lecture.is_live && !lecture.is_recorded && new Date(lecture.scheduled_at) > new Date()) ||
      (tab === "recorded" && lecture.is_recorded);

    return matchesSearch && matchesTab;
  });

  const handleSummarize = async (lecture: Lecture) => {
    const text = lecture.description ?? `${lecture.title} - ${lecture.course_code} by ${lecture.lecturer_name}.`;
    if (!text) return;

    try {
      setSummarizingId(lecture.id);
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: "en" }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSummaries((prev) => ({ ...prev, [lecture.id]: data.summary ?? "" }));
      toast.success("Summary generated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not summarize.");
    } finally {
      setSummarizingId(null);
    }
  };

  const handleCreateLecture = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) return;

    if (!lectureForm.title || !lectureForm.course_code || !lectureForm.scheduled_at) {
      toast.error("Provide title, course code, and scheduled time.");
      return;
    }

    try {
      setCreatingLecture(true);

      await createLecture(supabase, {
        title: lectureForm.title.trim(),
        course_code: lectureForm.course_code.trim().toUpperCase(),
        lecturer_id: userId,
        lecturer_name: profile.name || "Lecturer",
        university: profile.university || "",
        department: profile.department || "",
        scheduled_at: new Date(lectureForm.scheduled_at).toISOString(),
        duration: Number(lectureForm.duration || "60"),
        description: lectureForm.description.trim(),
        stream_url: lectureForm.stream_url.trim(),
        tags: lectureForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        is_live: false,
        is_recorded: false,
        offline_available: false,
      });

      toast.success("Lecture session created.");
      setShowCreate(false);
      setLectureForm({
        title: "",
        course_code: "",
        scheduled_at: "",
        duration: "60",
        description: "",
        stream_url: "",
        tags: "",
      });
      await loadLectures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create lecture.");
    } finally {
      setCreatingLecture(false);
    }
  };

  const toggleLiveState = async (lecture: Lecture) => {
    if (!canManageLecture(lecture)) return;

    try {
      await setLectureLiveStatus(supabase, lecture.id, !lecture.is_live);
      toast.success(lecture.is_live ? "Lecture marked as ended." : "Lecture is now live.");

      if (lecture.is_live && activeLecture?.id === lecture.id && roomChannelRef.current) {
        await roomChannelRef.current.send({ type: "broadcast", event: "session-stopped" });
        await leaveLiveRoom();
      }

      await loadLectures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update live status.");
    }
  };

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "all", label: "All", count: lectures.length },
    { id: "live", label: "Live", count: lectures.filter((lecture) => lecture.is_live).length },
    { id: "upcoming", label: "Upcoming" },
    { id: "recorded", label: "Recorded", count: lectures.filter((lecture) => lecture.is_recorded).length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Lecture Sessions</h1>
          <p className="mt-1 text-sm text-neutral-400 font-light">
            Real-time sessions powered by WebSocket channels and synchronized live status.
          </p>
        </div>
        {canCreateLecture && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A8F6A] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <PlusSignIcon size={16} /> New Lecture
          </button>
        )}
      </div>

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
          <Search01Icon size={16} className="text-neutral-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search lectures"
            className="w-56 bg-transparent text-sm outline-none text-neutral-200 placeholder:text-neutral-500"
          />
        </div>
      </div>

      {activeLecture && (
        <div className="rounded-2xl border border-[#0A8F6A]/30 bg-[#0A8F6A]/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#0A8F6A]">Live Room Connected</p>
              <p className="mt-1 text-sm text-white">{activeLecture.title}</p>
              <p className="mt-1 text-xs text-neutral-400">WebSocket participants: {connectedPeers}</p>
            </div>
            <div className="flex gap-2">
              {activeLecture.stream_url && (
                <a
                  href={activeLecture.stream_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#0A8F6A] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
                >
                  Open Stream
                </a>
              )}
              <button
                onClick={() => void leaveLiveRoom()}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-neutral-300"
              >
                Leave Room
              </button>
            </div>
          </div>
          {!sessionConnected && (
            <p className="mt-2 text-xs text-neutral-400">Connecting to live room...</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-52 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center">
          <VideoReplayIcon size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No lectures found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {search ? "Try a different search." : "Create or schedule a lecture session."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lecture) => (
            <div
              key={lecture.id}
              className="glass-panel flex flex-col rounded-2xl p-6 shadow-2xl group hover:border-[#0A8F6A]/30 transition-all duration-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg",
                    lecture.is_live ? "bg-red-500 shadow-red-500/20 animate-pulse" : "bg-[#0A8F6A] shadow-emerald-500/20",
                  )}
                >
                  {lecture.is_live ? <SignalIcon size={24} /> : <VideoReplayIcon size={24} />}
                </div>
                <div className="flex flex-wrap gap-1">
                  {lecture.is_live && (
                    <span className="rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-[10px] font-bold text-red-500 tracking-widest uppercase">
                      LIVE
                    </span>
                  )}
                  {lecture.is_recorded && (
                    <span className="rounded-full bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 px-3 py-1 text-[10px] font-bold text-[#0A8F6A] tracking-widest uppercase">
                      RECORDED
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#0A8F6A] font-semibold mb-2">{lecture.course_code}</p>
                <p className="text-lg font-medium leading-tight text-white group-hover:text-[#0A8F6A] transition-colors duration-300">{lecture.title}</p>
                <p className="mt-2 text-sm text-neutral-400 font-light">{lecture.lecturer_name}</p>
                {lecture.description && (
                  <p className="mt-4 line-clamp-2 text-xs text-neutral-500 font-light leading-relaxed">{lecture.description}</p>
                )}
              </div>

              <div className="mt-6 space-y-2 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                  <Calendar01Icon size={14} className="text-[#0A8F6A]" />
                  {formatDateTime(lecture.scheduled_at)}
                </div>
                <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <Clock01Icon size={14} className="text-[#0A8F6A]" /> {lecture.duration ?? 60} MIN
                  </span>
                  <span className="flex items-center gap-1.5">
                    <UserGroupIcon size={14} className="text-[#0A8F6A]" />
                    {activeLecture?.id === lecture.id ? connectedPeers : lecture.attendees} PARTICIPANTS
                  </span>
                </div>
              </div>

              {summaries[lecture.id] && (
                <div className="mt-6 rounded-xl bg-[#0A8F6A]/5 border border-[#0A8F6A]/20 p-4 text-xs font-light leading-relaxed text-neutral-300">
                  <p className="font-bold uppercase tracking-[0.2em] text-[#0A8F6A] mb-2 text-[10px]">AI Summary</p>
                  <p>{summaries[lecture.id]}</p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {lecture.is_live ? (
                  <button
                    onClick={() => void joinLiveRoom(lecture)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    <PlayIcon size={14} /> Join Live
                  </button>
                ) : lecture.is_recorded ? (
                  <a
                    href={lecture.recording_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0A8F6A] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <PlayIcon size={14} /> Watch
                  </a>
                ) : (
                  <div className="flex-1" />
                )}

                {lecture.offline_available && (
                  <button className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2.5 text-neutral-400 hover:text-white hover:border-white/20 transition-all">
                    <Download01Icon size={16} />
                  </button>
                )}

                <button
                  onClick={() => void handleSummarize(lecture)}
                  disabled={summarizingId === lecture.id}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-60"
                >
                  <SparklesIcon size={14} className="text-[#0A8F6A]" />
                  {summarizingId === lecture.id ? "..." : "AI Summary"}
                </button>

                {canManageLecture(lecture) && (
                  <button
                    onClick={() => void toggleLiveState(lecture)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition-all",
                      lecture.is_live ? "bg-red-600 hover:bg-red-700" : "bg-[#0A8F6A] hover:opacity-90",
                    )}
                  >
                    <SignalIcon size={14} />
                    {lecture.is_live ? "End" : "Go Live"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-black/80 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Create Lecture Session</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white"
              >
                <Cancel01Icon size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Configure real session details and stream endpoint.</p>

            <form onSubmit={(event) => void handleCreateLecture(event)} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Title</label>
                  <input
                    value={lectureForm.title}
                    onChange={(event) => setLectureForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Lecture title"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Course Code</label>
                  <input
                    value={lectureForm.course_code}
                    onChange={(event) => setLectureForm((prev) => ({ ...prev, course_code: event.target.value.toUpperCase() }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Course code"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={lectureForm.scheduled_at}
                    onChange={(event) => setLectureForm((prev) => ({ ...prev, scheduled_at: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={15}
                    value={lectureForm.duration}
                    onChange={(event) => setLectureForm((prev) => ({ ...prev, duration: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Stream URL</label>
                <input
                  type="url"
                  value={lectureForm.stream_url}
                  onChange={(event) => setLectureForm((prev) => ({ ...prev, stream_url: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  placeholder="https://your-live-stream-link"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Description</label>
                <textarea
                  rows={3}
                  value={lectureForm.description}
                  onChange={(event) => setLectureForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  placeholder="Session overview"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Tags</label>
                <input
                  value={lectureForm.tags}
                  onChange={(event) => setLectureForm((prev) => ({ ...prev, tags: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  placeholder="exam prep, revision, algorithms"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLecture}
                  className="flex-1 rounded-xl bg-[#0A8F6A] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {creatingLecture ? "Creating..." : "Create Lecture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
