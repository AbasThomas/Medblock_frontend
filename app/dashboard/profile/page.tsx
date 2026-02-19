"use client";

import { useState, useEffect } from "react";
import {
  Award,
  Camera,
  Edit3,
  Loader2,
  Save,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/supabase/queries";
import { getInitials, cn } from "@/lib/utils";
import { PLAN_PRICING } from "@/lib/mock-data";

type Profile = {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  university: string;
  department?: string;
  matric_number?: string;
  bio?: string;
  avatar?: string;
  points: number;
};

const BADGES = [
  { id: "first-upload", name: "First Upload", icon: "📤", desc: "Uploaded your first resource", color: "bg-blue-100" },
  { id: "resource-hero", name: "Resource Hero", icon: "🦸", desc: "10+ verified uploads", color: "bg-emerald-100" },
  { id: "gig-finder", name: "Gig Finder", icon: "💼", desc: "Applied to a gig opportunity", color: "bg-orange-100" },
  { id: "wellness-warrior", name: "Wellness Warrior", icon: "💪", desc: "7 consecutive wellness check-ins", color: "bg-purple-100" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    university: "",
    department: "",
    matric_number: "",
    bio: "",
  });

  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setProfile({ ...data, email: user.email ?? "" });
          setForm({
            name: data.name ?? "",
            university: data.university ?? "",
            department: data.department ?? "",
            matric_number: data.matric_number ?? "",
            bio: data.bio ?? "",
          });
        }
      } catch {
        // graceful fallback
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
      setProfile((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const planInfo = PLAN_PRICING[profile?.plan as keyof typeof PLAN_PRICING ?? "basic"];

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      {/* Profile card */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="h-24 bg-hero-gradient" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between">
            <div className="-mt-10 flex items-end gap-4">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-primary text-2xl font-bold text-white shadow-md">
                  {profile ? getInitials(profile.name || profile.email) : <User className="h-8 w-8" />}
                </div>
                <button className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow border">
                  <Camera className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
              <div className="mb-1">
                <p className="text-lg font-bold">{profile?.name || "Student"}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <button
              onClick={() => editing ? void handleSave() : setEditing(true)}
              disabled={saving}
              className={cn(
                "mb-1 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                editing
                  ? "bg-primary text-white hover:opacity-90"
                  : "border hover:bg-muted",
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                <Save className="h-4 w-4" />
              ) : (
                <Edit3 className="h-4 w-4" />
              )}
              {saving ? "Saving…" : editing ? "Save changes" : "Edit profile"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border px-3 py-1 text-xs capitalize text-muted-foreground">
              {profile?.role ?? "student"}
            </span>
            <span className="rounded-full border border-primary/30 bg-accent px-3 py-1 text-xs capitalize text-accent-foreground">
              {profile?.plan ?? "basic"} plan
            </span>
            {profile?.university && (
              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {profile.university}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <div className="lg:col-span-2 space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Personal Information</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Full Name", key: "name", placeholder: "Tunde Adesanya" },
              { label: "University", key: "university", placeholder: "University of Lagos" },
              { label: "Department", key: "department", placeholder: "Computer Science" },
              { label: "Matric Number", key: "matric_number", placeholder: "190404001" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="mb-1.5 block text-sm font-medium">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  disabled={!editing}
                  className={cn(
                    "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors",
                    editing
                      ? "bg-white ring-primary/50 focus:ring-2"
                      : "bg-muted/30 text-muted-foreground cursor-default",
                  )}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell us a bit about yourself…"
              disabled={!editing}
              rows={3}
              className={cn(
                "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors",
                editing
                  ? "bg-white ring-primary/50 focus:ring-2"
                  : "bg-muted/30 text-muted-foreground cursor-default",
              )}
            />
          </div>

          {editing && (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
            </div>
          )}
        </div>

        {/* Points & Plan */}
        <div className="space-y-4">
          {/* Points */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold">Points & Gamification</p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">{profile?.points ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total points earned</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, ((profile?.points ?? 0) / 1000) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.max(0, 1000 - (profile?.points ?? 0))} points until next level
            </p>
          </div>

          {/* Plan */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold">Current Plan</p>
            <p className="mt-1 text-xl font-bold capitalize text-primary">{profile?.plan ?? "basic"}</p>
            <p className="text-xs text-muted-foreground">{planInfo?.price}</p>
            <ul className="mt-3 space-y-1.5">
              {(planInfo?.highlights ?? []).map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="mt-0.5 text-primary">✓</span> {f}
                </li>
              ))}
            </ul>
            {profile?.plan !== "premium" && (
              <button className="mt-4 w-full rounded-xl bg-secondary py-2 text-sm font-semibold text-white hover:opacity-90">
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Badges</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Earn badges by using UniBridge — uploading resources, applying to opportunities, and more.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BADGES.map(({ id, name, icon, desc, color }) => (
            <div
              key={id}
              className="flex flex-col items-center rounded-xl border p-4 text-center opacity-40"
            >
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-2xl", color)}>
                {icon}
              </div>
              <p className="mt-2 text-xs font-semibold">{name}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Keep using UniBridge to unlock badges and earn more points.
        </p>
      </div>
    </div>
  );
}
