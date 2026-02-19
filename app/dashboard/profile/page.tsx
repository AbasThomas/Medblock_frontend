"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Camera,
  Edit3,
  Loader2,
  Save,
  ShieldCheck,
  Upload,
  User,
  HeartPulse,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PLAN_CATALOG } from "@/lib/pricing";
import { updateProfile } from "@/lib/supabase/queries";
import { getInitials, cn } from "@/lib/utils";

type Profile = {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: "basic" | "premium" | "enterprise";
  university: string;
  department?: string;
  matric_number?: string;
  bio?: string;
  avatar?: string;
  points: number;
};

type ActivityStats = {
  uploads: number;
  verifiedUploads: number;
  wellnessDays: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityStats>({
    uploads: 0,
    verifiedUploads: 0,
    wellnessDays: 0,
  });

  const [form, setForm] = useState({
    name: "",
    university: "",
    department: "",
    matric_number: "",
    bio: "",
  });

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [profileRes, uploadsRes, verifiedRes, wellnessRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase
            .from("resources")
            .select("id", { count: "exact", head: true })
            .eq("uploaded_by", user.id),
          supabase
            .from("resources")
            .select("id", { count: "exact", head: true })
            .eq("uploaded_by", user.id)
            .eq("is_verified", true),
          supabase
            .from("chat_messages")
            .select("created_at")
            .eq("user_id", user.id)
            .eq("role", "user")
            .limit(500),
        ]);

        if (profileRes.data) {
          setProfile({ ...profileRes.data, email: user.email ?? "" });
          setForm({
            name: profileRes.data.name ?? "",
            university: profileRes.data.university ?? "",
            department: profileRes.data.department ?? "",
            matric_number: profileRes.data.matric_number ?? "",
            bio: profileRes.data.bio ?? "",
          });
        }

        const distinctWellnessDays = new Set(
          (wellnessRes.data ?? []).map((row) => String(row.created_at).slice(0, 10)),
        );

        setActivity({
          uploads: uploadsRes.count ?? 0,
          verifiedUploads: verifiedRes.count ?? 0,
          wellnessDays: distinctWellnessDays.size,
        });
      } catch {
        // Graceful fallback when tables are unavailable.
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [supabase]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const updated = await updateProfile(supabase, profile.id, form);
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const planInfo = PLAN_CATALOG[(profile?.plan ?? "basic") as keyof typeof PLAN_CATALOG];

  const badges = useMemo(
    () => [
      {
        id: "first-upload",
        name: "First Contribution",
        desc: "Upload at least one resource.",
        earned: activity.uploads >= 1,
        progress: `${Math.min(activity.uploads, 1)}/1`,
        icon: Upload,
      },
      {
        id: "verified-contributor",
        name: "Verified Contributor",
        desc: "Publish 10 verified resources.",
        earned: activity.verifiedUploads >= 10,
        progress: `${Math.min(activity.verifiedUploads, 10)}/10`,
        icon: ShieldCheck,
      },
      {
        id: "wellness-consistency",
        name: "Wellness Consistency",
        desc: "Check in for 7 distinct days.",
        earned: activity.wellnessDays >= 7,
        progress: `${Math.min(activity.wellnessDays, 7)}/7`,
        icon: HeartPulse,
      },
      {
        id: "points-milestone",
        name: "Points Milestone",
        desc: "Reach 500 engagement points.",
        earned: (profile?.points ?? 0) >= 500,
        progress: `${Math.min(profile?.points ?? 0, 500)}/500`,
        icon: Award,
      },
    ],
    [activity, profile?.points],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="glass-panel relative overflow-hidden rounded-3xl shadow-2xl">
        <div className="relative h-32 overflow-hidden bg-hero-gradient">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#0A8F6A]/20 blur-3xl"></div>
        </div>
        <div className="relative z-10 px-8 pb-8">
          <div className="flex flex-col items-end justify-between gap-6 sm:flex-row">
            <div className="-mt-12 flex items-end gap-6">
              <div className="group relative">
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-black/40 bg-[#0A8F6A] text-4xl font-bold text-white shadow-2xl shadow-emerald-500/20 transition-transform duration-500 group-hover:scale-105">
                  {profile ? getInitials(profile.name || profile.email) : <User className="h-12 w-12" />}
                </div>
                <button className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-white shadow-xl transition-all hover:bg-[#0A8F6A]">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-2">
                <p className="mb-0.5 text-2xl font-medium tracking-tight text-white">{profile?.name || "Student Profile"}</p>
                <p className="text-sm font-light text-neutral-500">{profile?.email}</p>
              </div>
            </div>

            <button
              onClick={() => (editing ? void handleSave() : setEditing(true))}
              disabled={saving}
              className={cn(
                "mb-2 flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all",
                editing
                  ? "bg-[#0A8F6A] text-white shadow-lg shadow-emerald-500/20"
                  : "border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:border-white/20",
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                <Save className="h-4 w-4" />
              ) : (
                <Edit3 className="h-4 w-4" />
              )}
              {saving ? "Saving..." : editing ? "Save Changes" : "Edit Profile"}
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {profile?.role ?? "Student"}
            </span>
            <span className="rounded-full border border-[#0A8F6A]/20 bg-[#0A8F6A]/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0A8F6A] shadow-[0_0_15px_rgba(10,143,106,0.1)]">
              {planInfo.name} Plan
            </span>
            {profile?.university && (
              <span className="rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {profile.university}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 rounded-3xl border border-white/5 bg-black/40 p-8 shadow-2xl backdrop-blur-md lg:col-span-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">Profile Information</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { label: "Full Name", key: "name", placeholder: "Tunde Adesanya" },
              { label: "Institution", key: "university", placeholder: "University of Lagos" },
              { label: "Department", key: "department", placeholder: "Computer Science" },
              { label: "Matric Number", key: "matric_number", placeholder: "190404001" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  disabled={!editing}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-300",
                    editing
                      ? "border-white/10 bg-black/20 text-white focus:border-[#0A8F6A]/50"
                      : "cursor-default border-transparent bg-white/5 text-neutral-500",
                  )}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Share your academic focus, professional interests, and goals."
              disabled={!editing}
              rows={4}
              className={cn(
                "w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-300",
                editing
                  ? "border-white/10 bg-black/20 text-white focus:border-[#0A8F6A]/50"
                  : "cursor-default border-transparent bg-white/5 text-neutral-500",
              )}
            />
          </div>

          {editing && (
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 transition-all hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-[2] flex items-center justify-center gap-3 rounded-xl bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Profile
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-panel relative overflow-hidden rounded-2xl border-white/5 p-6 shadow-2xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0A8F6A]/5 to-transparent"></div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">Engagement Points</p>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold tracking-tighter text-white">{profile?.points ?? 0}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Total Points</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#0A8F6A]/20 bg-[#0A8F6A]/10 shadow-[0_0_20px_rgba(10,143,106,0.2)]">
                <Award className="h-7 w-7 text-[#0A8F6A]" />
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full border border-white/5 bg-white/5">
              <div
                className="h-full rounded-full bg-[#0A8F6A] shadow-[0_0_15px_rgba(10,143,106,0.6)] transition-all duration-1000"
                style={{ width: `${Math.min(100, ((profile?.points ?? 0) / 1000) * 100)}%` }}
              />
            </div>
            <p className="mt-3 flex justify-between text-[10px] font-light text-neutral-500">
              <span>Next goal: 1,000</span>
              <span className="font-bold text-[#0A8F6A]">{Math.max(0, 1000 - (profile?.points ?? 0))} remaining</span>
            </p>
          </div>

          <div className="glass-panel relative rounded-2xl border-white/5 p-6 shadow-2xl">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Subscription</p>
            <p className="mb-1 text-2xl font-medium tracking-tight text-white">{planInfo.name}</p>
            <p className="mb-2 text-xs font-light text-neutral-500">{planInfo.priceLabel}</p>
            <p className="mb-6 text-xs font-light text-neutral-500">{planInfo.summary}</p>
            <ul className="mb-8 space-y-3">
              {planInfo.highlights.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-xs font-light text-neutral-400">
                  <span className="mt-0.5 font-bold text-[#0A8F6A]">•</span> {feature}
                </li>
              ))}
            </ul>
            {profile?.plan !== "premium" && (
              <button className="w-full rounded-xl bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all hover:opacity-90">
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel relative rounded-3xl border-white/5 p-8 shadow-2xl">
        <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">Achievements</h2>
        <p className="mb-8 text-sm font-light text-neutral-500">
          Achievement status is calculated from your account activity in real time.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map(({ id, name, desc, earned, progress, icon: Icon }) => (
            <div
              key={id}
              className={cn(
                "group flex flex-col items-center rounded-2xl border p-6 text-center transition-all duration-300",
                earned
                  ? "border-[#0A8F6A]/30 bg-[#0A8F6A]/5"
                  : "border-white/5 bg-white/[0.02] hover:border-[#0A8F6A]/20",
              )}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-xl transition-all duration-500 group-hover:scale-105">
                <Icon className={cn("h-10 w-10", earned ? "text-[#0A8F6A]" : "text-neutral-500")} />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-neutral-300">{name}</p>
              <p className="mt-2 text-[10px] font-light leading-relaxed text-neutral-500">{desc}</p>
              <p className={cn("mt-3 text-[10px] font-bold uppercase tracking-widest", earned ? "text-[#0A8F6A]" : "text-neutral-600")}>
                {earned ? "Completed" : `Progress ${progress}`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
