"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar01Icon,
  Cancel01Icon,
  Location01Icon,
  PlusSignIcon,
  Search01Icon,
  UserGroupIcon,
  Wifi01Icon,
  ArrowUpRight01Icon,
  FilterIcon,
  LinkSquare01Icon,
} from "hugeicons-react";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { addUserPoints, createStudentEvent, getStudentEvents } from "@/lib/supabase/queries";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";

type StudentEvent = {
  id: string;
  title: string;
  details: string;
  location: string;
  event_date: string;
  rsvp_url?: string;
  general_registration_url?: string;
  created_by?: string;
  created_by_name?: string;
  university?: string;
  faculty_hosting?: string;
  sponsors: string[];
  is_virtual: boolean;
  created_at: string;
};

type EventRegistration = {
  id: string;
  event_id: string;
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  created_at: string;
};

type EventForm = {
  title: string;
  location: string;
  event_date: string;
  details: string;
  rsvp_url: string;
  general_registration_url: string;
  faculty_hosting: string;
  sponsors: string;
  is_virtual: boolean;
};

export default function EventsPage() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<StudentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [includePast, setIncludePast] = useState(false);

  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [copiedLinkEventId, setCopiedLinkEventId] = useState<string | null>(null);
  const [attendeeEvent, setAttendeeEvent] = useState<StudentEvent | null>(null);

  const [registeredEventIds, setRegisteredEventIds] = useState<Record<string, boolean>>({});
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({});
  const [attendeesByEvent, setAttendeesByEvent] = useState<Record<string, EventRegistration[]>>({});

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "student" as "student" | "lecturer" | "admin",
    university: "",
    department: "",
  });

  const [eventForm, setEventForm] = useState<EventForm>({
    title: "",
    location: "",
    event_date: "",
    details: "",
    rsvp_url: "",
    general_registration_url: "",
    faculty_hosting: "",
    sponsors: "",
    is_virtual: false,
  });

  const supabase = useMemo(() => createClient(), []);
  const isLecturerView = profile.role === "lecturer" || profile.role === "admin";

  const parseCsv = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const getGeneralLink = (eventItem: StudentEvent) => {
    const explicit = eventItem.general_registration_url?.trim();
    if (explicit) return explicit;
    if (typeof window === "undefined") return `/dashboard/events?event=${eventItem.id}`;
    return `${window.location.origin}/dashboard/events?event=${eventItem.id}`;
  };

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
        .select("name, university, department, role")
        .eq("id", user.id)
        .single();

      const resolvedRole =
        data?.role === "student" || data?.role === "lecturer" || data?.role === "admin"
          ? data.role
          : "student";

      setProfile({
        name: data?.name ?? user.email?.split("@")[0] ?? "Student",
        email: user.email ?? "",
        role: resolvedRole,
        university: data?.university ?? "",
        department: data?.department ?? "",
      });

      setEventForm((prev) => ({
        ...prev,
        faculty_hosting: prev.faculty_hosting || data?.department || "",
      }));
    } catch {
      setProfile((prev) => ({
        ...prev,
        name: user.email?.split("@")[0] ?? "Student",
        email: user.email ?? "",
      }));
    }
  }, [supabase]);

  const hydrateRegistrationState = useCallback(
    async (eventRows: StudentEvent[]) => {
      if (!userId || eventRows.length === 0) {
        setRegisteredEventIds({});
        setAttendeeCounts({});
        setAttendeesByEvent({});
        return;
      }

      const eventIds = eventRows.map((row) => row.id);
      const { data: registrations, error } = await supabase
        .from("student_event_registrations")
        .select("id, event_id, user_id, attendee_name, attendee_email, created_at")
        .in("event_id", eventIds)
        .order("created_at", { ascending: true });

      if (error) {
        setRegisteredEventIds({});
        setAttendeeCounts({});
        setAttendeesByEvent({});
        return;
      }

      const allRows = (registrations ?? []) as EventRegistration[];
      const registeredMap: Record<string, boolean> = {};
      const countsMap: Record<string, number> = {};
      const groupedMap: Record<string, EventRegistration[]> = {};

      for (const row of allRows) {
        countsMap[row.event_id] = (countsMap[row.event_id] ?? 0) + 1;
        if (row.user_id === userId) {
          registeredMap[row.event_id] = true;
        }
        groupedMap[row.event_id] = [...(groupedMap[row.event_id] ?? []), row];
      }

      setRegisteredEventIds(registeredMap);
      setAttendeeCounts(countsMap);
      setAttendeesByEvent(groupedMap);
    },
    [supabase, userId],
  );

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStudentEvents(
        supabase,
        {
          search: search || undefined,
          createdBy: mineOnly && userId ? userId : undefined,
          includePast,
        },
        80,
      );
      const rows = (data ?? []) as StudentEvent[];
      setEvents(rows);
      await hydrateRegistrationState(rows);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, [hydrateRegistrationState, includePast, mineOnly, search, supabase, userId]);

  useEffect(() => {
    void loadIdentity();
  }, [loadIdentity]);

  useEffect(() => {
    const timer = setTimeout(() => void loadEvents(), 250);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  useEffect(() => {
    const create = searchParams.get("create") === "1";
    const eventId = searchParams.get("event");
    if (create) {
      setShowCreatePanel(true);
    }
    if (eventId) {
      setActiveEventId(eventId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeEventId) return;
    const target = document.getElementById(`event-${activeEventId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeEventId, events]);

  useEffect(() => {
    const channel = supabase
      .channel("student-events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "student_events" }, () => {
        void loadEvents();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "student_event_registrations" }, () => {
        void loadEvents();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadEvents, supabase]);

  const handleSubmitEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) {
      toast.error("Please sign in to host an event.");
      return;
    }

    if (
      !eventForm.title ||
      !eventForm.location ||
      !eventForm.event_date ||
      !eventForm.details ||
      !eventForm.faculty_hosting
    ) {
      toast.error("Please complete all required fields.");
      return;
    }

    try {
      setSubmittingEvent(true);
      const created = (await createStudentEvent(supabase, {
        title: eventForm.title.trim(),
        location: eventForm.location.trim(),
        event_date: new Date(eventForm.event_date).toISOString(),
        details: eventForm.details.trim(),
        rsvp_url: eventForm.rsvp_url.trim() || undefined,
        general_registration_url: eventForm.general_registration_url.trim() || undefined,
        created_by: userId,
        created_by_name: profile.name,
        university: profile.university || "",
        faculty_hosting: eventForm.faculty_hosting.trim(),
        sponsors: parseCsv(eventForm.sponsors),
        is_virtual: eventForm.is_virtual,
      })) as StudentEvent;

      const generatedLink =
        typeof window !== "undefined" ? `${window.location.origin}/dashboard/events?event=${created.id}` : "";

      if (!eventForm.general_registration_url.trim() && generatedLink) {
        await supabase
          .from("student_events")
          .update({ general_registration_url: generatedLink })
          .eq("id", created.id);
      }

      try {
        await addUserPoints(supabase, userId, 20);
      } catch {
        // Event posting should still succeed if points update fails.
      }

      toast.success("Event published successfully.");
      setShowCreatePanel(false);
      setEventForm({
        title: "",
        location: "",
        event_date: "",
        details: "",
        rsvp_url: "",
        general_registration_url: "",
        faculty_hosting: profile.department || "",
        sponsors: "",
        is_virtual: false,
      });
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish event.");
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleRegister = async (eventItem: StudentEvent) => {
    if (!userId) {
      toast.error("Please sign in to register for events.");
      return;
    }

    try {
      setRegisteringEventId(eventItem.id);
      const { error } = await supabase
        .from("student_event_registrations")
        .upsert(
          {
            event_id: eventItem.id,
            user_id: userId,
            attendee_name: profile.name || "Student",
            attendee_email: profile.email || "",
          },
          { onConflict: "event_id,user_id" },
        );

      if (error) throw error;
      toast.success("Registration successful.");
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register for this event.");
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleUnregister = async (eventId: string) => {
    if (!userId) return;

    try {
      setRegisteringEventId(eventId);
      const { error } = await supabase
        .from("student_event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", userId);

      if (error) throw error;
      toast.success("Registration cancelled.");
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel registration.");
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleCopyLink = async (eventItem: StudentEvent) => {
    const link = getGeneralLink(eventItem);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinkEventId(eventItem.id);
      setTimeout(() => setCopiedLinkEventId((current) => (current === eventItem.id ? null : current)), 1500);
      toast.success("Event link copied.");
    } catch {
      toast.error("Could not copy event link.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {isLecturerView ? "Events Management" : "Student Events"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400 font-light">
            {isLecturerView
              ? "Host events, share public registration links, and track attendees in one place."
              : "Discover events, register quickly, and share opportunities across campus."}
          </p>
        </div>
        <button
          onClick={() => setShowCreatePanel(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A8F6A] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <PlusSignIcon size={16} /> {isLecturerView ? "Host Event" : "Post Event"}
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 focus-within:border-[#0A8F6A]/50 transition-colors">
          <Search01Icon size={16} className="text-neutral-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events"
            className="w-52 bg-transparent text-sm outline-none text-neutral-200 placeholder:text-neutral-500"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <Cancel01Icon size={14} className="text-neutral-500 hover:text-white" />
            </button>
          )}
        </div>

        <button
          onClick={() => setMineOnly((prev) => !prev)}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all",
            mineOnly
              ? "border-[#0A8F6A] bg-[#0A8F6A]/20 text-white"
              : "border-white/10 bg-black/20 text-neutral-500 hover:text-white",
          )}
        >
          {isLecturerView ? "My Hosted Events" : "My Events"}
        </button>

        <button
          onClick={() => setIncludePast((prev) => !prev)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all",
            includePast
              ? "border-[#0A8F6A] bg-[#0A8F6A]/20 text-white"
              : "border-white/10 bg-black/20 text-neutral-500 hover:text-white",
          )}
        >
          <FilterIcon size={14} /> Show Past
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-72 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center">
          <Calendar01Icon size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No events found</p>
          <p className="mt-1 text-xs text-muted-foreground">Post an event to populate the board.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((item) => {
            const isHost = !!userId && item.created_by === userId;
            const canViewAttendees = isHost || profile.role === "admin";
            const isRegistered = Boolean(registeredEventIds[item.id]);
            const attendeeCount = attendeeCounts[item.id] ?? 0;
            const sponsors = item.sponsors ?? [];
            const registerActionDisabled = registeringEventId === item.id;

            return (
              <div
                id={`event-${item.id}`}
                key={item.id}
                className={cn(
                  "glass-panel flex flex-col rounded-2xl p-6 shadow-2xl group hover:border-[#0A8F6A]/30 transition-all duration-500",
                  activeEventId === item.id && "border-[#0A8F6A]/50 bg-[#0A8F6A]/10",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 text-[#0A8F6A]">
                    <Calendar01Icon size={24} />
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {item.is_virtual && (
                      <span className="rounded-full bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 px-3 py-1 text-[10px] font-bold text-[#0A8F6A] tracking-widest uppercase">
                        Virtual
                      </span>
                    )}
                    {item.faculty_hosting && (
                      <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-bold text-neutral-300 tracking-widest uppercase">
                        {item.faculty_hosting}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex-1">
                  <p className="text-lg font-medium leading-tight text-white group-hover:text-[#0A8F6A] transition-colors duration-300">{item.title}</p>
                  <p className="mt-3 text-xs text-neutral-500 font-light leading-relaxed line-clamp-3">{item.details}</p>

                  {sponsors.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {sponsors.slice(0, 4).map((sponsor) => (
                        <span
                          key={sponsor}
                          className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[10px] uppercase tracking-widest text-neutral-400"
                        >
                          {sponsor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-2 border-t border-white/5 pt-5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  <div className="flex items-center gap-2">
                    <Calendar01Icon size={14} className="text-[#0A8F6A]" />
                    {formatDateTime(item.event_date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Location01Icon size={14} className="text-[#0A8F6A]" />
                    {item.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <UserGroupIcon size={14} className="text-[#0A8F6A]" />
                    Host: {item.created_by_name || "Unknown"}
                  </div>
                  <div className="flex items-center gap-2">
                    <UserGroupIcon size={14} className="text-[#0A8F6A]" />
                    {attendeeCount} attendee{attendeeCount === 1 ? "" : "s"}
                  </div>
                </div>

                <p className="mt-4 text-[10px] uppercase tracking-widest text-neutral-600">
                  {item.university || "Open community"} {item.faculty_hosting ? `- ${item.faculty_hosting}` : ""}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-neutral-600">Posted {timeAgo(item.created_at)}</p>

                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-2.5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">General Registration Link</p>
                  <div className="flex items-center gap-2">
                    <p className="line-clamp-1 flex-1 text-[11px] text-neutral-400">{getGeneralLink(item)}</p>
                    <button
                      onClick={() => void handleCopyLink(item)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-neutral-400 hover:text-white"
                    >
                      {copiedLinkEventId === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {item.rsvp_url ? (
                    <a
                      href={item.rsvp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-lg bg-[#0A8F6A] px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      RSVP <ArrowUpRight01Icon size={14} />
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      RSVP Not Set
                    </div>
                  )}

                  <button
                    onClick={() =>
                      void (isRegistered ? handleUnregister(item.id) : handleRegister(item))
                    }
                    disabled={registerActionDisabled}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-60",
                      isRegistered
                        ? "border border-white/10 bg-white/5 text-neutral-300 hover:text-white"
                        : "bg-[#0A8F6A]/20 border border-[#0A8F6A]/30 text-[#8ceacb] hover:bg-[#0A8F6A]/30",
                    )}
                  >
                    {registerActionDisabled
                      ? "Working..."
                      : isRegistered
                        ? "Cancel Registration"
                        : "Register"}
                  </button>
                </div>

                {canViewAttendees && (
                  <button
                    onClick={() => setAttendeeEvent(item)}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-neutral-300 hover:text-white"
                  >
                    <LinkSquare01Icon size={14} /> View Attendees
                  </button>
                )}

                {item.is_virtual && (
                  <div className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-[10px] uppercase tracking-widest text-neutral-500">
                    <Wifi01Icon size={14} /> Online Event
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {attendeeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-black/80 p-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium tracking-tight text-white">Event Attendees</h2>
                <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">{attendeeEvent.title}</p>
              </div>
              <button
                onClick={() => setAttendeeEvent(null)}
                className="rounded-full p-2 bg-white/5 border border-white/5 text-neutral-500 hover:text-white transition-all"
              >
                <Cancel01Icon size={16} />
              </button>
            </div>

            {(attendeesByEvent[attendeeEvent.id] ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-neutral-500">
                No attendees yet.
              </div>
            ) : (
              <div className="space-y-2">
                {(attendeesByEvent[attendeeEvent.id] ?? []).map((attendee) => (
                  <div key={attendee.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-sm text-white">{attendee.attendee_name || "Student"}</p>
                    <p className="text-xs text-neutral-500">{attendee.attendee_email || "No email"}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-neutral-600">
                      Registered {timeAgo(attendee.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showCreatePanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-black/80 p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-medium tracking-tight text-white">{isLecturerView ? "Host Event" : "Post Event"}</h2>
              <button
                onClick={() => setShowCreatePanel(false)}
                className="rounded-full p-2 bg-white/5 border border-white/5 text-neutral-500 hover:text-white transition-all"
              >
                <Cancel01Icon size={16} />
              </button>
            </div>
            <p className="mb-8 text-xs text-neutral-400 font-light leading-relaxed">
              Publish event details, faculty host, sponsors, and a public registration link students can share.
            </p>

            <form onSubmit={(event) => void handleSubmitEvent(event)} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Title *</label>
                  <input
                    value={eventForm.title}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Event title"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Location *</label>
                  <input
                    value={eventForm.location}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, location: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Campus hall, online room, etc"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Event Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={eventForm.event_date}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, event_date: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Faculty Hosting *</label>
                  <input
                    value={eventForm.faculty_hosting}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, faculty_hosting: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Faculty of Engineering"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">RSVP URL</label>
                  <input
                    type="url"
                    value={eventForm.rsvp_url}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, rsvp_url: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">General Registration URL</label>
                  <input
                    type="url"
                    value={eventForm.general_registration_url}
                    onChange={(event) =>
                      setEventForm((prev) => ({ ...prev, general_registration_url: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Optional custom link (auto-generated if empty)"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Sponsors (CSV)</label>
                <input
                  value={eventForm.sponsors}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, sponsors: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                  placeholder="Google, Microsoft, UniBridge"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Event Details *</label>
                <textarea
                  rows={4}
                  value={eventForm.details}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, details: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                  placeholder="Share details students should know before attending."
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={eventForm.is_virtual}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, is_virtual: event.target.checked }))}
                />
                This is a virtual/online event
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePanel(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvent}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60"
                >
                  {submittingEvent && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submittingEvent ? "Publishing..." : "Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
