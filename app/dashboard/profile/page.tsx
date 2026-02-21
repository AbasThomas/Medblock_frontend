"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { Plan } from "@/lib/types";
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
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<Plan | null>(null);
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
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      setAvatarUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated.");

      const extension = file.name.split(".").pop() ?? "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const uploadTargets = [
        { bucket: "resources", path: `${user.id}/avatars/${filename}` },
        { bucket: "avatars", path: `${user.id}/${filename}` },
      ];

      let uploadedBucket: string | null = null;
      let uploadedPath: string | null = null;
      const uploadErrors: string[] = [];

      for (const target of uploadTargets) {
        const { error: uploadError } = await supabase.storage
          .from(target.bucket)
          .upload(target.path, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (!uploadError) {
          uploadedBucket = target.bucket;
          uploadedPath = target.path;
          break;
        }

        uploadErrors.push(`${target.bucket}: ${uploadError.message}`);
      }

      if (!uploadedBucket || !uploadedPath) {
        throw new Error(
          `Profile image upload failed. ${uploadErrors.join(" | ") || "No writable storage bucket found."}`,
        );
      }

      const { data: publicUrl } = supabase.storage.from(uploadedBucket).getPublicUrl(uploadedPath);
      const updated = await updateProfile(supabase, user.id, { avatar: publicUrl.publicUrl });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              avatar: String(updated.avatar ?? publicUrl.publicUrl),
            }
          : prev,
      );
      toast.success("Profile image updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to upload profile image.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handlePlanUpgrade = async (targetPlan: Plan) => {
    if (!profile || profile.plan === targetPlan) return;

    try {
      setUpgradingPlan(targetPlan);
      const updated = await updateProfile(supabase, profile.id, { plan: targetPlan });
      setProfile((prev) => (prev ? { ...prev, plan: String(updated.plan ?? targetPlan) as Profile["plan"] } : prev));
      toast.success(`Plan updated to ${PLAN_CATALOG[targetPlan].name}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to upgrade plan.");
    } finally {
      setUpgradingPlan(null);
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
        <div className="relative z-10 px-4 pb-6 sm:px-8 sm:pb-8">
          <div className="flex flex-col items-end justify-between gap-6 sm:flex-row">
            <div className="-mt-12 flex items-end gap-6">
              <div className="group relative">
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-black/40 bg-[#0A8F6A] text-4xl font-bold text-white shadow-2xl shadow-emerald-500/20 transition-transform duration-500 group-hover:scale-105">
                  {profile?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar}
                      alt={profile.name || profile.email}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : profile ? (
                    getInitials(profile.name || profile.email)
                  ) : (
                    <User className="h-12 w-12" />
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleAvatarUpload(event)}
                  className="hidden"
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-white shadow-xl transition-all hover:bg-[#0A8F6A] disabled:opacity-60"
                >
                  {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
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
              { label: "Full Name", key: "name", placeholder: "Enter your full name" },
              { label: "Institution", key: "university", placeholder: "Enter your institution" },
              { label: "Department", key: "department", placeholder: "Enter your department" },
              { label: "Matric Number", key: "matric_number", placeholder: "Enter your matric number" },
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
            <div className="space-y-2">
              {(Object.keys(PLAN_CATALOG) as Plan[])
                .filter((plan) => plan !== profile?.plan)
                .map((plan) => (
                  <button
                    key={plan}
                    onClick={() => void handlePlanUpgrade(plan)}
                    disabled={upgradingPlan !== null}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all hover:border-[#0A8F6A]/40 hover:bg-[#0A8F6A]/15 disabled:opacity-60"
                  >
                    {upgradingPlan === plan ? "Updating..." : `Switch to ${PLAN_CATALOG[plan].name}`}
                  </button>
                ))}
            </div>
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
