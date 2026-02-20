"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award01Icon,
  BookOpen01Icon,
  RankingIcon,
  StarIcon,
  Target01Icon,
  UserGroupIcon,
  WaterfallDown01Icon,
} from "hugeicons-react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLeaderboard } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

type LeaderboardUser = {
  id: string;
  name: string;
  university: string;
  points: number;
  avatar?: string;
};

type Metric = {
  resourcesUploaded: number;
  verifiedResources: number;
  opportunitiesSubmitted: number;
  wellnessDays: number;
};

type BadgeCard = {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  icon: React.ElementType;
};

export default function GamificationPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("Student");
  const [points, setPoints] = useState(0);
  const [metrics, setMetrics] = useState<Metric>({
    resourcesUploaded: 0,
    verifiedResources: 0,
    opportunitiesSubmitted: 0,
    wellnessDays: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const loadGamification = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        const [profileRes, resourcesRes, verifiedRes, opportunitiesRes, wellnessRes, leaderboardRes] = await Promise.all([
          supabase.from("profiles").select("name, points").eq("id", user.id).single(),
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
            .from("opportunities")
            .select("id", { count: "exact", head: true })
            .eq("created_by", user.id),
          supabase
            .from("chat_messages")
            .select("created_at")
            .eq("user_id", user.id)
            .eq("role", "user")
            .limit(500),
          getLeaderboard(supabase, 15),
        ]);

        setName(profileRes.data?.name ?? user.email?.split("@")[0] ?? "Student");
        setPoints(profileRes.data?.points ?? 0);

        const distinctWellnessDays = new Set(
          (wellnessRes.data ?? []).map((row) => String(row.created_at).slice(0, 10)),
        );

        setMetrics({
          resourcesUploaded: resourcesRes.count ?? 0,
          verifiedResources: verifiedRes.count ?? 0,
          opportunitiesSubmitted: opportunitiesRes.count ?? 0,
          wellnessDays: distinctWellnessDays.size,
        });

        setLeaderboard((leaderboardRes ?? []) as LeaderboardUser[]);
      } finally {
        setLoading(false);
      }
    };

    void loadGamification();
  }, [supabase]);

  const level = Math.floor(points / 200) + 1;
  const levelProgress = Math.min(100, ((points % 200) / 200) * 100);

  const badgeCards: BadgeCard[] = [
    {
      id: "resource-starter",
      title: "Resource Starter",
      description: "Upload your first five resources.",
      current: metrics.resourcesUploaded,
      target: 5,
      icon: BookOpen01Icon,
    },
    {
      id: "verified-scholar",
      title: "Verified Scholar",
      description: "Publish ten verified resources.",
      current: metrics.verifiedResources,
      target: 10,
      icon: StarIcon,
    },
    {
      id: "opportunity-scout",
      title: "Opportunity Scout",
      description: "Submit five quality opportunities.",
      current: metrics.opportunitiesSubmitted,
      target: 5,
      icon: Target01Icon,
    },
    {
      id: "wellness-consistency",
      title: "Wellness Consistency",
      description: "Check in for seven distinct days.",
      current: metrics.wellnessDays,
      target: 7,
      icon: WaterfallDown01Icon,
    },
  ];

  const earnedBadges = badgeCards.filter((badge) => badge.current >= badge.target).length;
  const userRank = leaderboard.findIndex((entry) => entry.id === userId) + 1;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">Gamification Hub</p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight text-white">Achievements and Badges</h1>
            <p className="mt-2 text-sm text-neutral-400">Track contribution milestones, rank progression, and reward status.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">Level</p>
              <p className="text-xl font-bold text-white">{level}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">Points</p>
              <p className="text-xl font-bold text-white">{points}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500">Badges</p>
              <p className="text-xl font-bold text-white">{earnedBadges}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-neutral-500">
            <span>{name}</span>
            <span>{Math.round(levelProgress)}% to next level</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 border border-white/10">
            <div className="h-full bg-[#0A8F6A]" style={{ width: `${levelProgress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {badgeCards.map((badge) => {
          const earned = badge.current >= badge.target;
          const progress = Math.min(100, (badge.current / badge.target) * 100);
          const Icon = badge.icon;

          return (
            <div
              key={badge.id}
              className={cn(
                "rounded-2xl border p-5 shadow-xl transition-all",
                earned
                  ? "border-[#0A8F6A]/30 bg-[#0A8F6A]/10"
                  : "border-white/10 bg-black/30",
              )}
            >
              <div className="flex items-center justify-between">
                <Icon size={28} className={earned ? "text-[#0A8F6A]" : "text-neutral-500"} />
                {earned && <Award01Icon size={24} className="text-[#0A8F6A]" />}
              </div>
              <p className="mt-4 text-sm font-semibold text-white">{badge.title}</p>
              <p className="mt-1 text-xs text-neutral-500">{badge.description}</p>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/10">
                <div className="h-full bg-[#0A8F6A]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-widest text-neutral-500">
                {Math.min(badge.current, badge.target)}/{badge.target}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-2">
            <RankingIcon size={22} className="text-[#0A8F6A]" />
            <h2 className="text-lg font-medium text-white">Leaderboard</h2>
          </div>
          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-neutral-500">No leaderboard data yet.</p>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3",
                    entry.id === userId
                      ? "border-[#0A8F6A]/30 bg-[#0A8F6A]/10"
                      : "border-white/10 bg-white/5",
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-white">#{index + 1} {entry.name || "User"}</p>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500">{entry.university || "Institution not set"}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[#0A8F6A]">
                    <UserGroupIcon size={18} />
                    <span className="text-sm font-bold">{entry.points}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
          <h2 className="text-lg font-medium text-white">Progress Snapshot</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-neutral-400">Resources Uploaded</span>
              <span className="font-semibold text-white">{metrics.resourcesUploaded}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-neutral-400">Verified Resources</span>
              <span className="font-semibold text-white">{metrics.verifiedResources}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-neutral-400">Opportunities Submitted</span>
              <span className="font-semibold text-white">{metrics.opportunitiesSubmitted}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-neutral-400">Wellness Check-in Days</span>
              <span className="font-semibold text-white">{metrics.wellnessDays}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-neutral-400">Current Rank</span>
              <span className="font-semibold text-white">{userRank > 0 ? `#${userRank}` : "Unranked"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
