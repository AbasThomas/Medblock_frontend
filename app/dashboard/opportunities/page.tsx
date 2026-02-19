"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowUpRight,
  Clock,
  Filter,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Trophy,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getOpportunities } from "@/lib/supabase/queries";
import { formatNaira, getOpportunityTypeColor, cn } from "@/lib/utils";

type Opportunity = {
  id: string;
  title: string;
  type: string;
  organization: string;
  description: string;
  amount?: number;
  currency?: string;
  deadline: string;
  requirements: string[];
  skills: string[];
  location: string;
  is_remote: boolean;
  application_url: string;
  tags: string[];
  created_at: string;
  matchScore?: number;
  matchReason?: string;
};

const OPP_TYPES = ["scholarship", "bursary", "gig", "internship", "grant"];

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchMode, setMatchMode] = useState(false);

  // Profile for AI matching
  const [profile, setProfile] = useState({
    skills: "react, typescript, research writing",
    interests: "internship, scholarship",
    location: "Lagos",
    gpa: "3.8",
  });
  const [showMatchPanel, setShowMatchPanel] = useState(false);

  const supabase = createClient();

  const loadOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOpportunities(
        supabase,
        {
          type: typeFilter || undefined,
          isRemote: remoteOnly || undefined,
          search: search || undefined,
        },
        40,
      );
      setOpportunities(data as Opportunity[]);
      setMatchMode(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load opportunities.");
    } finally {
      setLoading(false);
    }
  }, [supabase, typeFilter, remoteOnly, search]);

  useEffect(() => {
    const timer = setTimeout(() => void loadOpportunities(), 300);
    return () => clearTimeout(timer);
  }, [loadOpportunities]);

  const handleAiMatch = async () => {
    try {
      setMatchLoading(true);
      const parseList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            skills: parseList(profile.skills),
            interests: parseList(profile.interests),
            location: profile.location,
            gpa: profile.gpa ? Number(profile.gpa) : undefined,
            university: "University of Lagos",
            department: "Computer Science",
            level: "300L",
          },
          opportunities: opportunities.map((o) => ({
            id: o.id,
            title: o.title,
            type: o.type,
            organization: o.organization,
            description: o.description,
            deadline: o.deadline,
            isRemote: o.is_remote,
            location: o.location,
            applicationUrl: o.application_url,
            skills: o.skills,
            requirements: o.requirements,
            tags: o.tags,
            amount: o.amount,
            currency: o.currency,
          })),
        }),
      });

      const data = await res.json() as {
        matches?: Array<{ score: number; reason: string; opportunity: { id: string } }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Match failed");

      if (data.matches) {
        const ranked = data.matches.map((m) => {
          const opp = opportunities.find((o) => o.id === m.opportunity.id);
          return opp ? { ...opp, matchScore: m.score, matchReason: m.reason } : null;
        }).filter(Boolean) as Opportunity[];

        setOpportunities(ranked);
        setMatchMode(true);
        toast.success(`Ranked ${ranked.length} opportunities by fit.`);
        setShowMatchPanel(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI match failed.");
    } finally {
      setMatchLoading(false);
    }
  };

  const daysUntilDeadline = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Opportunities</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Scholarships, bursaries, internships & gigs matched to your profile.
          </p>
        </div>
        <button
          onClick={() => setShowMatchPanel(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" /> AI Match Me
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opportunities…"
            className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && <button onClick={() => setSearch("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>

        <div className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent text-sm outline-none text-muted-foreground"
          >
            <option value="">All types</option>
            {OPP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button
          onClick={() => setRemoteOnly(!remoteOnly)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
            remoteOnly ? "border-primary bg-accent text-accent-foreground" : "bg-white text-muted-foreground hover:text-foreground",
          )}
        >
          <Wifi className="h-4 w-4" /> Remote only
        </button>

        {matchMode && (
          <button
            onClick={() => void loadOpportunities()}
            className="rounded-xl border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            Clear AI ranking
          </button>
        )}
      </div>

      {matchMode && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-accent px-4 py-2 text-sm text-accent-foreground">
          <Sparkles className="h-4 w-4" />
          Results ranked by AI match score based on your profile.
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No opportunities found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opp) => {
            const days = daysUntilDeadline(opp.deadline);
            return (
              <div key={opp.id} className="flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", getOpportunityTypeColor(opp.type))}>
                    {opp.type}
                  </span>
                  {opp.matchScore !== undefined && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {(opp.matchScore * 100).toFixed(0)}% match
                    </span>
                  )}
                </div>

                <div className="mt-3 flex-1">
                  <p className="text-sm font-semibold leading-snug">{opp.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opp.organization}</p>
                  {opp.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{opp.description}</p>
                  )}
                  {opp.matchReason && (
                    <p className="mt-2 text-xs text-primary/80 italic">{opp.matchReason}</p>
                  )}
                </div>

                {opp.amount && (
                  <p className="mt-3 text-base font-bold text-primary">{formatNaira(opp.amount)}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {opp.location}
                    {opp.is_remote && " · Remote"}
                  </span>
                  <span className={cn("flex items-center gap-1", days <= 7 && "text-destructive font-medium")}>
                    <Clock className="h-3 w-3" />
                    {days > 0 ? `${days}d left` : "Deadline passed"}
                  </span>
                </div>

                {opp.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {opp.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <a
                  href={opp.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-white hover:opacity-90"
                >
                  Apply Now <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Match panel */}
      {showMatchPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">AI Opportunity Matching</h2>
              </div>
              <button onClick={() => setShowMatchPanel(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tell us about yourself and we'll rank opportunities by fit using AI embeddings.
            </p>

            <div className="mt-5 space-y-4">
              {[
                { label: "Skills (comma-separated)", key: "skills", placeholder: "react, python, research writing" },
                { label: "Interests (comma-separated)", key: "interests", placeholder: "scholarship, internship, tutoring" },
                { label: "Location", key: "location", placeholder: "Lagos" },
                { label: "CGPA", key: "gpa", placeholder: "3.8" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-sm font-medium">{label}</label>
                  <input
                    value={profile[key as keyof typeof profile]}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none ring-primary/50 focus:ring-2"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowMatchPanel(false)}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAiMatch()}
                disabled={matchLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {matchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {matchLoading ? "Ranking…" : "Rank Opportunities"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
