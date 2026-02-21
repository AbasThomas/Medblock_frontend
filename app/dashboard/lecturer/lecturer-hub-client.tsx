"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import {
  SignalIcon,
  Calendar01Icon,
  VideoReplayIcon,
  BookOpen01Icon,
  Award01Icon,
  Clock01Icon,
  UserGroupIcon,
  PlusSignIcon,
  Cancel01Icon,
  PencilEdit01Icon,
  Delete01Icon,
  PlayIcon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  LinkSquare01Icon,
} from "hugeicons-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  createLecture,
  deleteLecture,
  getLecturerLectures,
  setLectureLiveStatus,
  updateLecture,
  updateLectureAttendees,
} from "@/lib/supabase/queries";
import { cn, formatDateTime } from "@/lib/utils";

type Session = {
  id: string;
  title: string;
  course_code: string;
  scheduled_at: string;
  is_live: boolean;
  is_recorded: boolean;
  recording_url?: string;
  stream_url?: string;
  attendees: number;
  description?: string;
  duration: number;
  tags?: string[];
  lecturer_id?: string;
  lecturer_name?: string;
};

type FilterTab = "all" | "live" | "upcoming" | "recorded";

type CreateForm = {
  title: string;
  course_code: string;
  scheduled_at: string;
  duration: string;
  description: string;
  stream_url: string;
  tags: string;
};

type EditForm = {
  title: string;
  course_code: string;
  scheduled_at: string;
  duration: string;
  description: string;
  stream_url: string;
  tags: string;
};

const BLANK_CREATE: CreateForm = {
  title: "",
  course_code: "",
  scheduled_at: "",
  duration: "60",
  description: "",
  stream_url: "",
  tags: "",
};

export function LecturerHubClient({
  initialSessions,
  profile,
  userId,
  resourceCount,
  opportunityCount,
  eventCount,
}: {
  initialSessions: Session[];
  profile: { name: string; role: string; university: string };
  userId: string;
  resourceCount: number;
  opportunityCount: number;
  eventCount: number;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [liveAttendees, setLiveAttendees] = useState<Record<string, number>>({});
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(BLANK_CREATE);
  const [creatingSession, setCreatingSession] = useState(false);

  // Edit
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(BLANK_CREATE);
  const [savingEdit, setSavingEdit] = useState(false);

  // Recording modal (shown after ending a live session)
  const [showRecording, setShowRecording] = useState<Session | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [savingRecording, setSavingRecording] = useState(false);

  // Live toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const presenceChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  // ── Real-time: reload my sessions on any change ──────────────────────────
  const reloadSessions = useCallback(async () => {
    try {
      const data = await getLecturerLectures(supabase, userId);
      setSessions(data as Session[]);
    } catch {
      // Silently fail – user sees stale data
    }
  }, [supabase, userId]);

  useEffect(() => {
    const channel = supabase
      .channel(`lecturer-sessions-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lectures", filter: `lecturer_id=eq.${userId}` },
        () => void reloadSessions(),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, userId, reloadSessions]);

  // ── Real-time: presence tracking for each live session ───────────────────
  const liveSessionIds = sessions
    .filter((s) => s.is_live)
    .map((s) => s.id)
    .join(",");

  useEffect(() => {
    const liveSessions = sessions.filter((s) => s.is_live);
    const liveIds = new Set(liveSessions.map((s) => s.id));

    // Remove presence channels for sessions no longer live
    presenceChannelsRef.current.forEach((ch, id) => {
      if (!liveIds.has(id)) {
        void supabase.removeChannel(ch);
        presenceChannelsRef.current.delete(id);
      }
    });

    // Add presence channel for newly live sessions
    for (const session of liveSessions) {
      if (!presenceChannelsRef.current.has(session.id)) {
        const ch = supabase.channel(`lecture-room-${session.id}`);
        ch.on("presence", { event: "sync" }, () => {
          const state = ch.presenceState();
          const count = Object.values(state).reduce((sum, entries) => sum + entries.length, 0);
          setLiveAttendees((prev) => ({ ...prev, [session.id]: count }));
          void updateLectureAttendees(supabase, session.id, count).catch(() => {});
        }).subscribe();
        presenceChannelsRef.current.set(session.id, ch);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSessionIds, supabase]);

  // Cleanup all presence channels on unmount
  useEffect(() => {
    return () => {
      presenceChannelsRef.current.forEach((ch) => { void supabase.removeChannel(ch); });
      presenceChannelsRef.current.clear();
    };
  }, [supabase]);

  // ── Computed lists ────────────────────────────────────────────────────────
  const liveSessions = sessions.filter((s) => s.is_live);
  const upcomingSessions = sessions.filter(
    (s) => !s.is_live && !s.is_recorded && new Date(s.scheduled_at) > new Date(),
  );
  const recordedSessions = sessions.filter((s) => s.is_recorded);

  const filteredSessions = sessions.filter((s) => {
    if (filterTab === "live") return s.is_live;
    if (filterTab === "upcoming")
      return !s.is_live && !s.is_recorded && new Date(s.scheduled_at) > new Date();
    if (filterTab === "recorded") return s.is_recorded;
    return true;
  });

  const stats = [
    { label: "Total Sessions", value: sessions.length, icon: VideoReplayIcon },
    { label: "Live Now", value: liveSessions.length, icon: SignalIcon, accent: liveSessions.length > 0 },
    { label: "Upcoming", value: upcomingSessions.length, icon: Calendar01Icon },
    { label: "Recorded", value: recordedSessions.length, icon: Clock01Icon },
    { label: "Resources", value: resourceCount, icon: BookOpen01Icon },
    { label: "Opportunities", value: opportunityCount, icon: Award01Icon },
    { label: "Hosted Events", value: eventCount, icon: UserGroupIcon },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleGoLive = async (session: Session) => {
    if (togglingId) return;
    setTogglingId(session.id);
    try {
      await setLectureLiveStatus(supabase, session.id, true);
      toast.success(`"${session.title}" is now LIVE`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to go live");
    } finally {
      setTogglingId(null);
    }
  };

  const handleEndLive = async (session: Session) => {
    if (togglingId) return;
    setTogglingId(session.id);
    try {
      // Broadcast end event to all presence-channel listeners
      const ch = presenceChannelsRef.current.get(session.id);
      if (ch) {
        await ch.send({ type: "broadcast", event: "session-stopped", payload: {} });
      }
      await setLectureLiveStatus(supabase, session.id, false);
      toast.success("Session ended");
      // Prompt to save recording
      setShowRecording(session);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end session");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title || !createForm.course_code || !createForm.scheduled_at) {
      toast.error("Title, course code, and scheduled time are required.");
      return;
    }
    setCreatingSession(true);
    try {
      await createLecture(supabase, {
        title: createForm.title.trim(),
        course_code: createForm.course_code.trim().toUpperCase(),
        lecturer_id: userId,
        lecturer_name: profile.name,
        university: profile.university,
        department: "",
        scheduled_at: new Date(createForm.scheduled_at).toISOString(),
        duration: Number(createForm.duration || 60),
        description: createForm.description.trim(),
        stream_url: createForm.stream_url.trim(),
        tags: createForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        is_live: false,
        is_recorded: false,
        offline_available: false,
      });
      toast.success("Session created");
      setShowCreate(false);
      setCreateForm(BLANK_CREATE);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create session");
    } finally {
      setCreatingSession(false);
    }
  };

  const openEdit = (session: Session) => {
    setEditingSession(session);
    setEditForm({
      title: session.title,
      course_code: session.course_code,
      scheduled_at: session.scheduled_at
        ? new Date(session.scheduled_at).toISOString().slice(0, 16)
        : "",
      duration: String(session.duration ?? 60),
      description: session.description ?? "",
      stream_url: session.stream_url ?? "",
      tags: (session.tags ?? []).join(", "),
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    setSavingEdit(true);
    try {
      await updateLecture(supabase, editingSession.id, {
        title: editForm.title.trim(),
        course_code: editForm.course_code.trim().toUpperCase(),
        scheduled_at: new Date(editForm.scheduled_at).toISOString(),
        duration: Number(editForm.duration || 60),
        description: editForm.description.trim(),
        stream_url: editForm.stream_url.trim(),
        tags: editForm.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast.success("Session updated");
      setEditingSession(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update session");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (session: Session) => {
    if (!confirm(`Delete "${session.title}"? This cannot be undone.`)) return;
    setDeletingId(session.id);
    try {
      await deleteLecture(supabase, session.id);
      toast.success("Session deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete session");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveRecording = async () => {
    if (!showRecording) return;
    setSavingRecording(true);
    try {
      await updateLecture(supabase, showRecording.id, {
        is_recorded: true,
        recording_url: recordingUrl.trim(),
      });
      toast.success("Recording saved");
      setShowRecording(null);
      setRecordingUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save recording");
    } finally {
      setSavingRecording(false);
    }
  };

  const FILTER_TABS: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: sessions.length },
    { id: "live", label: "Live", count: liveSessions.length },
    { id: "upcoming", label: "Upcoming", count: upcomingSessions.length },
    { id: "recorded", label: "Recorded", count: recordedSessions.length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-md">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">Lecturer Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Welcome, {profile.name || "Lecturer"}
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Manage your lecture sessions, go live, track attendance, and publish teaching assets.
        </p>
        <p className="mt-1 text-xs uppercase tracking-widest text-neutral-500">
          {profile.university || "Institution not set"}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A8F6A] px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-opacity hover:opacity-90"
          >
            <PlusSignIcon size={14} /> New Session
          </button>
          <Link
            href="/dashboard/resources"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
          >
            Upload Resources
          </Link>
          <Link
            href="/dashboard/opportunities"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
          >
            Post Opportunities
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className={cn(
              "rounded-2xl border p-5 transition-all",
              accent && value > 0
                ? "border-red-500/30 bg-red-500/5 shadow-lg shadow-red-500/10"
                : "border-white/10 bg-black/25",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
              <Icon size={20} className={cn(accent && value > 0 ? "text-red-400" : "text-[#0A8F6A]")} />
            </div>
            <p
              className={cn(
                "mt-3 text-3xl font-semibold tracking-tight",
                accent && value > 0 ? "text-red-400" : "text-white",
              )}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Live Control Panel */}
      {liveSessions.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm font-bold uppercase tracking-widest text-red-400">Live Sessions</p>
          </div>
          <div className="space-y-3">
            {liveSessions.map((session) => {
              const attendees = liveAttendees[session.id] ?? session.attendees;
              return (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-black/30 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{session.title}</p>
                    <p className="mt-0.5 text-xs uppercase tracking-widest text-neutral-500">{session.course_code}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
                      <span className="flex items-center gap-1">
                        <UserGroupIcon size={13} className="text-red-400" />
                        {attendees} connected
                      </span>
                      {session.stream_url && (
                        <a
                          href={session.stream_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#0A8F6A] hover:underline"
                        >
                          <LinkSquare01Icon size={13} /> Stream Link
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.stream_url && (
                      <a
                        href={session.stream_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-white/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
                      >
                        Open Stream
                      </a>
                    )}
                    <button
                      onClick={() => void handleEndLive(session)}
                      disabled={togglingId === session.id}
                      className="rounded-lg bg-red-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {togglingId === session.id ? "Ending..." : "End Session"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session Management */}
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">My Sessions</h2>
          <div className="flex gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
            {FILTER_TABS.map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setFilterTab(id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all",
                  filterTab === id
                    ? "bg-[#0A8F6A] text-white"
                    : "text-neutral-500 hover:text-white",
                )}
              >
                {label}
                {count > 0 && (
                  <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]">{count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 py-12 text-center text-sm text-neutral-500">
            {filterTab === "all" ? (
              <>
                No sessions yet.{" "}
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-[#0A8F6A] underline-offset-2 hover:underline"
                >
                  Create your first session
                </button>
              </>
            ) : (
              `No ${filterTab} sessions.`
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => {
              const attendees = liveAttendees[session.id] ?? session.attendees;
              const isDeleting = deletingId === session.id;
              const isToggling = togglingId === session.id;

              return (
                <div
                  key={session.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border p-4 transition-all md:flex-row md:items-start md:justify-between",
                    session.is_live
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20",
                  )}
                >
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-white">{session.title}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          session.is_live
                            ? "bg-red-500/15 text-red-400"
                            : session.is_recorded
                              ? "bg-[#0A8F6A]/15 text-[#0A8F6A]"
                              : "bg-white/10 text-neutral-400",
                        )}
                      >
                        {session.is_live ? "Live" : session.is_recorded ? "Recorded" : "Scheduled"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs uppercase tracking-widest text-neutral-500">
                      {session.course_code}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar01Icon size={13} className="text-[#0A8F6A]" />
                        {formatDateTime(session.scheduled_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock01Icon size={13} className="text-[#0A8F6A]" />
                        {session.duration ?? 60} min
                      </span>
                      <span className="flex items-center gap-1">
                        <UserGroupIcon size={13} className="text-[#0A8F6A]" />
                        {session.is_live ? attendees : session.attendees} attendees
                      </span>
                    </div>
                    {session.description && (
                      <p className="mt-2 line-clamp-1 text-xs text-neutral-500">{session.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {session.is_live ? (
                      <>
                        {session.stream_url && (
                          <a
                            href={session.stream_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
                          >
                            Stream
                          </a>
                        )}
                        <button
                          onClick={() => void handleEndLive(session)}
                          disabled={isToggling}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          {isToggling ? "..." : "End Live"}
                        </button>
                      </>
                    ) : session.is_recorded ? (
                      <>
                        {session.recording_url && (
                          <a
                            href={session.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-lg bg-[#0A8F6A] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                          >
                            <PlayIcon size={11} /> Watch
                          </a>
                        )}
                        <button
                          onClick={() => openEdit(session)}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <PencilEdit01Icon size={11} /> Edit
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => void handleGoLive(session)}
                          disabled={isToggling}
                          className="flex items-center gap-1.5 rounded-lg bg-[#0A8F6A] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          <SignalIcon size={11} />
                          {isToggling ? "Starting..." : "Go Live"}
                        </button>
                        <button
                          onClick={() => openEdit(session)}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <PencilEdit01Icon size={11} /> Edit
                        </button>
                        <button
                          onClick={() => void handleDelete(session)}
                          disabled={isDeleting}
                          className="flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-60"
                        >
                          {isDeleting ? "..." : <><Delete01Icon size={11} /> Delete</>}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/dashboard/resources"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-5 transition-colors hover:border-[#0A8F6A]/30 hover:bg-[#0A8F6A]/5"
        >
          <div className="flex items-center gap-3">
            <BookOpen01Icon size={22} className="text-[#0A8F6A]" />
            <div>
              <p className="text-sm font-semibold text-white">Resource Library</p>
              <p className="text-xs text-neutral-500">{resourceCount} resources uploaded</p>
            </div>
          </div>
          <ArrowRight01Icon size={16} className="text-neutral-500" />
        </Link>
        <Link
          href="/dashboard/opportunities"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-5 transition-colors hover:border-[#0A8F6A]/30 hover:bg-[#0A8F6A]/5"
        >
          <div className="flex items-center gap-3">
            <Award01Icon size={22} className="text-[#0A8F6A]" />
            <div>
              <p className="text-sm font-semibold text-white">Opportunities Board</p>
              <p className="text-xs text-neutral-500">{opportunityCount} opportunities posted</p>
            </div>
          </div>
          <ArrowRight01Icon size={16} className="text-neutral-500" />
        </Link>
        <Link
          href="/dashboard/events"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-5 transition-colors hover:border-[#0A8F6A]/30 hover:bg-[#0A8F6A]/5"
        >
          <div className="flex items-center gap-3">
            <Calendar01Icon size={22} className="text-[#0A8F6A]" />
            <div>
              <p className="text-sm font-semibold text-white">Events Hub</p>
              <p className="text-xs text-neutral-500">{eventCount} events hosted</p>
            </div>
          </div>
          <ArrowRight01Icon size={16} className="text-neutral-500" />
        </Link>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Create Session Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Create Lecture Session</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-neutral-400 hover:text-white">
                <Cancel01Icon size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Configure the session details and stream link.</p>
            <form onSubmit={(e) => void handleCreate(e)} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Title *</label>
                  <input
                    value={createForm.title}
                    onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Introduction to Algorithms"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Course Code *</label>
                  <input
                    value={createForm.course_code}
                    onChange={(e) => setCreateForm((p) => ({ ...p, course_code: e.target.value.toUpperCase() }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    placeholder="CS201"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Scheduled At *</label>
                  <input
                    type="datetime-local"
                    value={createForm.scheduled_at}
                    onChange={(e) => setCreateForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Duration (min)</label>
                  <input
                    type="number"
                    min={15}
                    value={createForm.duration}
                    onChange={(e) => setCreateForm((p) => ({ ...p, duration: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Stream URL</label>
                <input
                  type="url"
                  value={createForm.stream_url}
                  onChange={(e) => setCreateForm((p) => ({ ...p, stream_url: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  placeholder="https://meet.google.com/abc-xyz or Zoom/YouTube link"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Description</label>
                <textarea
                  rows={2}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  placeholder="Session overview..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Tags (comma-separated)</label>
                <input
                  value={createForm.tags}
                  onChange={(e) => setCreateForm((p) => ({ ...p, tags: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  placeholder="algorithms, sorting, exam prep"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-neutral-300">Cancel</button>
                <button type="submit" disabled={creatingSession} className="flex-1 rounded-xl bg-[#0A8F6A] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {creatingSession ? "Creating..." : "Create Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Edit Session</h2>
              <button onClick={() => setEditingSession(null)} className="rounded-lg p-1 text-neutral-400 hover:text-white">
                <Cancel01Icon size={18} />
              </button>
            </div>
            <form onSubmit={(e) => void handleSaveEdit(e)} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Title</label>
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Course Code</label>
                  <input
                    value={editForm.course_code}
                    onChange={(e) => setEditForm((p) => ({ ...p, course_code: e.target.value.toUpperCase() }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Scheduled At</label>
                  <input
                    type="datetime-local"
                    value={editForm.scheduled_at}
                    onChange={(e) => setEditForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Duration (min)</label>
                  <input
                    type="number"
                    min={15}
                    value={editForm.duration}
                    onChange={(e) => setEditForm((p) => ({ ...p, duration: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Stream URL</label>
                <input
                  type="url"
                  value={editForm.stream_url}
                  onChange={(e) => setEditForm((p) => ({ ...p, stream_url: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Description</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Tags (comma-separated)</label>
                <input
                  value={editForm.tags}
                  onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                />
              </div>
              {/* Recording URL field for recorded sessions */}
              {editingSession.is_recorded && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">Recording URL</label>
                  <input
                    type="url"
                    value={editForm.stream_url}
                    onChange={(e) => setEditForm((p) => ({ ...p, stream_url: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Recording link (YouTube, Drive, etc.)"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditingSession(null)} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-neutral-300">Cancel</button>
                <button type="submit" disabled={savingEdit} className="flex-1 rounded-xl bg-[#0A8F6A] py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recording URL Modal */}
      {showRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Session Ended</h2>
                <p className="mt-0.5 text-xs text-neutral-500 truncate max-w-xs">{showRecording.title}</p>
              </div>
              <button
                onClick={() => { setShowRecording(null); setRecordingUrl(""); }}
                className="rounded-lg p-1 text-neutral-400 hover:text-white"
              >
                <Cancel01Icon size={18} />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-[#0A8F6A]/5 border border-[#0A8F6A]/20 p-4 text-xs text-neutral-300">
              <CheckmarkCircle01Icon size={14} className="inline mr-1.5 text-[#0A8F6A]" />
              Your live session has ended. Optionally add the recording URL so students can watch it later.
            </div>
            <div className="mt-4">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                Recording URL (optional)
              </label>
              <input
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#0A8F6A]/50"
                placeholder="https://youtube.com/watch?v=... or Drive link"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setShowRecording(null); setRecordingUrl(""); }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-neutral-300"
              >
                Skip
              </button>
              <button
                onClick={() => void handleSaveRecording()}
                disabled={savingRecording || !recordingUrl.trim()}
                className="flex-1 rounded-xl bg-[#0A8F6A] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {savingRecording ? "Saving..." : "Save Recording"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
