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
      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="h-32 bg-hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#0A8F6A]/20 rounded-full blur-3xl"></div>
        </div>
        <div className="px-8 pb-8 relative z-10">
          <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
            <div className="-mt-12 flex items-end gap-6">
              <div className="relative group">
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-black/40 bg-[#0A8F6A] text-4xl font-bold text-white shadow-2xl shadow-emerald-500/20 transition-transform duration-500 group-hover:scale-105">
                  {profile ? getInitials(profile.name || profile.email) : <User className="h-12 w-12" />}
                </div>
                <button className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-black/60 border border-white/10 text-white shadow-xl hover:bg-[#0A8F6A] transition-all">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-2">
                <p className="text-2xl font-medium tracking-tight text-white mb-0.5">{profile?.name || "Student Profile"}</p>
                <p className="text-sm text-neutral-500 font-light">{profile?.email}</p>
              </div>
            </div>

            <button
              onClick={() => editing ? void handleSave() : setEditing(true)}
              disabled={saving}
              className={cn(
                "mb-2 flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all",
                editing
                  ? "bg-[#0A8F6A] text-white shadow-lg shadow-emerald-500/20"
                  : "bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:border-white/20",
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
            <span className="rounded-full bg-white/5 border border-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {profile?.role ?? "Student"}
            </span>
            <span className="rounded-full bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0A8F6A] shadow-[0_0_15px_rgba(10,143,106,0.1)]">
              {profile?.plan ?? "Standard"} Plan
            </span>
            {profile?.university && (
              <span className="rounded-full bg-white/5 border border-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {profile.university}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Personal info form */}
        <div className="lg:col-span-2 space-y-8 rounded-3xl border border-white/5 bg-black/40 p-8 shadow-2xl backdrop-blur-md">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">Profile Information</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { label: "FULL NAME", key: "name", placeholder: "Tunde Adesanya" },
              { label: "INSTITUTION", key: "university", placeholder: "University of Lagos" },
              { label: "DEPARTMENT", key: "department", placeholder: "Computer Science" },
              { label: "MATRIC NUMBER", key: "matric_number", placeholder: "190404001" },
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
                      ? "bg-black/20 border-white/10 text-white focus:border-[#0A8F6A]/50"
                      : "bg-white/5 border-transparent text-neutral-500 cursor-default",
                  )}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-neutral-500">ENTITY BIO</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Define your tactical objectives..."
              disabled={!editing}
              rows={4}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all duration-300 resize-none",
                editing
                  ? "bg-black/20 border-white/10 text-white focus:border-[#0A8F6A]/50"
                  : "bg-white/5 border-transparent text-neutral-500 cursor-default",
              )}
            />
          </div>

          {editing && (
            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
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

        {/* Points & Plan */}
        <div className="space-y-6">
          {/* Points */}
          <div className="glass-panel border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A8F6A]/5 to-transparent pointer-events-none"></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A] mb-4">Academic Rewards</p>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-4xl font-bold text-white tracking-tighter">{profile?.points ?? 0}</p>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Total Points Earned</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A8F6A]/10 border border-[#0A8F6A]/20 shadow-[0_0_20px_rgba(10,143,106,0.2)]">
                <Award className="h-7 w-7 text-[#0A8F6A]" />
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 border border-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0A8F6A] shadow-[0_0_15px_rgba(10,143,106,0.6)] transition-all duration-1000"
                style={{ width: `${Math.min(100, ((profile?.points ?? 0) / 1000) * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-[10px] text-neutral-500 font-light flex justify-between">
              <span>Next Level Goal: 1,000</span>
              <span className="font-bold text-[#0A8F6A]">{Math.max(0, 1000 - (profile?.points ?? 0))} TO GO</span>
            </p>
          </div>

          {/* Plan */}
          <div className="glass-panel border-white/5 rounded-2xl p-6 shadow-2xl relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500 mb-4">Subscription Plan</p>
            <p className="text-2xl font-medium tracking-tight text-white capitalize mb-1">{profile?.plan ?? "Standard"} Plan</p>
            <p className="text-xs text-neutral-500 font-light mb-6">{planInfo?.price}</p>
            <ul className="space-y-3 mb-8">
              {(planInfo?.highlights ?? []).map((f) => (
                <li key={f} className="flex items-start gap-3 text-xs text-neutral-400 font-light">
                  <span className="mt-0.5 text-[#0A8F6A] font-bold">»</span> {f}
                </li>
              ))}
            </ul>
            {profile?.plan !== "premium" && (
              <button className="w-full rounded-xl bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all">
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="glass-panel border-white/5 rounded-3xl p-8 shadow-2xl relative">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A] mb-2">Achievements & Badges</h2>
        <p className="text-sm text-neutral-500 font-light mb-8">
          Unlock rewards by completing core UniBridge activities.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BADGES.map(({ id, name, icon, desc }) => (
            <div
              key={id}
              className="flex flex-col items-center rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center group transition-all duration-300 hover:bg-[#0A8F6A]/5 hover:border-[#0A8F6A]/20"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-3xl shadow-xl grayscale group-hover:grayscale-0 transition-all duration-500">
                {icon}
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-white">{name}</p>
              <p className="mt-2 text-[10px] text-neutral-600 font-light leading-relaxed group-hover:text-neutral-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
