import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Profile ────────────────────────────────────────────────────────────────

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertProfile(
  supabase: SupabaseClient,
  profile: {
    id: string;
    email: string;
    name: string;
    role?: string;
    university?: string;
    department?: string;
    matric_number?: string;
    bio?: string;
    avatar?: string;
  },
) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ ...profile, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Lectures ────────────────────────────────────────────────────────────────

export async function getLectures(
  supabase: SupabaseClient,
  filters?: { university?: string; department?: string; isLive?: boolean },
) {
  let query = supabase
    .from("lectures")
    .select("*")
    .order("scheduled_at", { ascending: false });

  if (filters?.university) query = query.eq("university", filters.university);
  if (filters?.department) query = query.eq("department", filters.department);
  if (filters?.isLive !== undefined) query = query.eq("is_live", filters.isLive);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getLiveLectures(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("lectures")
    .select("*")
    .eq("is_live", true)
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getUpcomingLectures(supabase: SupabaseClient, limit = 5) {
  const { data, error } = await supabase
    .from("lectures")
    .select("*")
    .gte("scheduled_at", new Date().toISOString())
    .eq("is_live", false)
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function createLecture(
  supabase: SupabaseClient,
  lecture: {
    title: string;
    course_code: string;
    lecturer_id: string;
    lecturer_name: string;
    university: string;
    department: string;
    scheduled_at: string;
    duration?: number;
    description?: string;
    tags?: string[];
    stream_url?: string;
    recording_url?: string;
    is_live?: boolean;
    is_recorded?: boolean;
    offline_available?: boolean;
  },
) {
  const { data, error } = await supabase.from("lectures").insert(lecture).select().single();
  if (error) throw error;
  return data;
}

export async function updateLecture(
  supabase: SupabaseClient,
  lectureId: string,
  updates: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("lectures")
    .update(updates)
    .eq("id", lectureId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setLectureLiveStatus(
  supabase: SupabaseClient,
  lectureId: string,
  isLive: boolean,
) {
  const { data, error } = await supabase
    .from("lectures")
    .update({ is_live: isLive })
    .eq("id", lectureId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLectureAttendees(
  supabase: SupabaseClient,
  lectureId: string,
  attendees: number,
) {
  const { error } = await supabase
    .from("lectures")
    .update({ attendees })
    .eq("id", lectureId);
  if (error) throw error;
}

export async function deleteLecture(supabase: SupabaseClient, lectureId: string) {
  const { error } = await supabase.from("lectures").delete().eq("id", lectureId);
  if (error) throw error;
}

export async function getLecturerLectures(supabase: SupabaseClient, lecturerId: string) {
  const { data, error } = await supabase
    .from("lectures")
    .select("*")
    .eq("lecturer_id", lecturerId)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Resources ───────────────────────────────────────────────────────────────

export async function getResources(
  supabase: SupabaseClient,
  filters?: {
    type?: string;
    courseCode?: string;
    university?: string;
    isPremium?: boolean;
    isApproved?: boolean;
    search?: string;
  },
  limit = 20,
) {
  let query = supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.university) query = query.eq("university", filters.university);
  if (filters?.courseCode) query = query.ilike("course_code", `%${filters.courseCode}%`);
  if (filters?.isPremium !== undefined) query = query.eq("is_premium", filters.isPremium);
  if (filters?.isApproved !== undefined) query = query.eq("is_approved", filters.isApproved);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createResource(
  supabase: SupabaseClient,
  resource: {
    title: string;
    description: string;
    type: string;
    course_code: string;
    university: string;
    department: string;
    uploaded_by: string;
    uploader_name: string;
    file_url?: string;
    file_size?: number;
    tags?: string[];
    is_premium?: boolean;
    year?: number;
  },
) {
  const { data, error } = await supabase
    .from("resources")
    .insert(resource)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function incrementDownload(supabase: SupabaseClient, resourceId: string) {
  const { error } = await supabase.rpc("increment_downloads", { resource_id: resourceId });
  if (error) throw error;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function getOpportunities(
  supabase: SupabaseClient,
  filters?: { type?: string; isRemote?: boolean; search?: string; createdBy?: string },
  limit = 20,
) {
  let query = supabase
    .from("opportunities")
    .select("*")
    .gte("deadline", new Date().toISOString().split("T")[0])
    .order("deadline", { ascending: true })
    .limit(limit);

  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.isRemote !== undefined) query = query.eq("is_remote", filters.isRemote);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);
  if (filters?.createdBy) query = query.eq("created_by", filters.createdBy);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createOpportunity(
  supabase: SupabaseClient,
  opportunity: {
    title: string;
    type: "scholarship" | "bursary" | "gig" | "internship" | "grant";
    organization: string;
    description?: string;
    amount?: number;
    currency?: string;
    deadline: string;
    requirements?: string[];
    skills?: string[];
    location?: string;
    is_remote?: boolean;
    application_url?: string;
    contact_person?: string;
    contact_link?: string;
    tags?: string[];
    created_by: string;
    submitted_by_name?: string;
    is_approved?: boolean;
  },
) {
  const { data, error } = await supabase
    .from("opportunities")
    .insert(opportunity)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getStudentEvents(
  supabase: SupabaseClient,
  filters?: { search?: string; createdBy?: string; includePast?: boolean },
  limit = 50,
) {
  let query = supabase
    .from("student_events")
    .select("*")
    .order("event_date", { ascending: true })
    .limit(limit);

  if (!filters?.includePast) {
    query = query.gte("event_date", new Date().toISOString());
  }

  if (filters?.createdBy) query = query.eq("created_by", filters.createdBy);
  if (filters?.search) {
    const q = filters.search.trim();
    query = query.or(
      `title.ilike.%${q}%,details.ilike.%${q}%,location.ilike.%${q}%,faculty_hosting.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createStudentEvent(
  supabase: SupabaseClient,
  event: {
    title: string;
    details?: string;
    location: string;
    event_date: string;
    rsvp_url?: string;
    created_by: string;
    created_by_name?: string;
    university?: string;
    faculty_hosting?: string;
    sponsors?: string[];
    general_registration_url?: string;
    is_virtual?: boolean;
  },
) {
  const { data, error } = await supabase
    .from("student_events")
    .insert(event)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(supabase: SupabaseClient, userId: string, limit = 20) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(supabase: SupabaseClient, notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

// ─── Chat (Wellness) ──────────────────────────────────────────────────────────

export async function getChatMessages(supabase: SupabaseClient, userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function saveChatMessage(
  supabase: SupabaseClient,
  message: {
    user_id: string;
    role: "user" | "assistant";
    content: string;
    mood?: string;
  },
) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(message)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminStats(supabase: SupabaseClient) {
  const [usersResult, resourcesResult, lecturesResult, oppResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("resources").select("id", { count: "exact", head: true }),
    supabase.from("lectures").select("id", { count: "exact", head: true }),
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
  ]);

  const pendingResult = await supabase
    .from("resources")
    .select("id", { count: "exact", head: true })
    .eq("is_approved", false);

  return {
    totalUsers: usersResult.count ?? 0,
    totalResources: resourcesResult.count ?? 0,
    totalLectures: lecturesResult.count ?? 0,
    totalOpportunities: oppResult.count ?? 0,
    pendingApprovals: pendingResult.count ?? 0,
  };
}

export async function getPendingResources(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("is_approved", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function approveResource(supabase: SupabaseClient, resourceId: string) {
  const { error } = await supabase
    .from("resources")
    .update({ is_approved: true, is_verified: true })
    .eq("id", resourceId);
  if (error) throw error;
}

export async function rejectResource(supabase: SupabaseClient, resourceId: string) {
  const { error } = await supabase.from("resources").delete().eq("id", resourceId);
  if (error) throw error;
}

export async function getAllUsers(supabase: SupabaseClient, limit = 50) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getLeaderboard(supabase: SupabaseClient, limit?: number) {
  let query = supabase
    .from("profiles")
    .select("id, name, university, points, avatar")
    .order("points", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function addUserPoints(supabase: SupabaseClient, userId: string, pointsToAdd: number) {
  const { data: current, error: currentError } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .single();
  if (currentError) throw currentError;

  const nextPoints = Math.max(0, (current?.points ?? 0) + pointsToAdd);
  const { data, error } = await supabase
    .from("profiles")
    .update({ points: nextPoints, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("points")
    .single();
  if (error) throw error;
  return data?.points ?? nextPoints;
}
