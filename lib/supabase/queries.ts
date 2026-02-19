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
  filters?: { type?: string; isRemote?: boolean; search?: string },
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

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
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
