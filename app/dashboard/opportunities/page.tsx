"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

  const [profile, setProfile] = useState({
    skills: "",
    interests: "",
    location: "",
    gpa: "",
  });
  const [showMatchPanel, setShowMatchPanel] = useState(false);

  const supabase = useMemo(() => createClient(), []);

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

  useEffect(() => {
    const loadProfileDefaults = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("department, university")
        .eq("id", user.id)
        .single();

      const department = data?.department ?? "";
      const university = data?.university ?? "";

      setProfile((prev) => ({
        ...prev,
        skills: prev.skills || (department ? `${department.toLowerCase()}, communication` : ""),
        interests: prev.interests || "scholarship, internship",
        location: prev.location || university || "Lagos",
      }));
    };

    void loadProfileDefaults();
  }, [supabase]);

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
          <h1 className="text-2xl font-semibold tracking-tight text-white">Strategic Opportunities</h1>
          <p className="mt-1 text-sm text-neutral-400 font-light">
            Scholarships, bursaries, internships, and gigs matched to your profile.
          </p>
        </div>
        <button
          onClick={() => setShowMatchPanel(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A8F6A] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Sparkles className="h-4 w-4" /> Run AI Matching
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 focus-within:border-[#0A8F6A]/50 transition-colors">
          <Search className="h-4 w-4 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opportunities..."
            className="w-44 bg-transparent text-sm outline-none text-neutral-200 placeholder:text-neutral-500"
          />
          {search && <button onClick={() => setSearch("")}><X className="h-3.5 w-3.5 text-neutral-500 hover:text-white" /></button>}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 focus-within:border-[#0A8F6A]/50 transition-colors">
          <Filter className="h-4 w-4 text-neutral-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-transparent text-sm outline-none text-neutral-400 cursor-pointer"
          >
            <option value="" className="bg-neutral-900">All Opportunity Types</option>
            {OPP_TYPES.map((t) => <option key={t} value={t} className="bg-neutral-900">{t.toUpperCase()}</option>)}
          </select>
        </div>

        <button
          onClick={() => setRemoteOnly(!remoteOnly)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all",
            remoteOnly ? "border-[#0A8F6A] bg-[#0A8F6A] text-white shadow-[0_0_15px_rgba(10,143,106,0.3)]" : "bg-black/20 border-white/10 text-neutral-500 hover:text-white hover:border-white/20",
          )}
        >
          <Wifi className="h-4 w-4" /> Remote Only
        </button>

        {matchMode && (
          <button
            onClick={() => void loadOpportunities()}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
          >
            Reset Ranking
          </button>
        )}
      </div>

      {matchMode && (
        <div className="flex items-center gap-2 rounded-xl border border-[#0A8F6A]/30 bg-[#0A8F6A]/5 px-4 py-3 text-sm text-[#0A8F6A] font-light">
          <Sparkles className="h-4 w-4 shadow-[0_0_10px_rgba(10,143,106,0.3)]" />
          Opportunities ranked by AI fit analysis based on your profile.
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opp) => {
            const days = daysUntilDeadline(opp.deadline);
            return (
              <div key={opp.id} className="glass-panel flex flex-col rounded-2xl p-6 shadow-2xl group hover:border-[#0A8F6A]/30 transition-all duration-500">
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border", getOpportunityTypeColor(opp.type))}>
                    {opp.type}
                  </span>
                  {opp.matchScore !== undefined && (
                    <span className="rounded-full bg-[#0A8F6A] px-3 py-1 text-[10px] font-bold text-white shadow-[0_0_15px_rgba(10,143,106,0.4)] uppercase tracking-widest">
                      {(opp.matchScore * 100).toFixed(0)}% Match
                    </span>
                  )}
                </div>

                <div className="mt-6 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#0A8F6A] font-semibold mb-2">{opp.organization}</p>
                  <p className="text-lg font-medium leading-tight text-white group-hover:text-[#0A8F6A] transition-colors duration-300">{opp.title}</p>
                  {opp.description && (
                    <p className="mt-4 line-clamp-2 text-xs text-neutral-500 font-light leading-relaxed">{opp.description}</p>
                  )}
                  {opp.matchReason && (
                    <div className="mt-4 rounded-lg bg-[#0A8F6A]/5 border border-[#0A8F6A]/10 p-3 italic text-[11px] text-neutral-400 font-light">
                      <span className="text-[#0A8F6A] font-bold not-italic">AI Rationale:</span> {opp.matchReason}
                    </div>
                  )}
                </div>

                {opp.amount && (
                  <p className="mt-6 text-xl font-bold text-white tracking-tight">{formatNaira(opp.amount)}</p>
                )}

                <div className="mt-6 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 pt-6 border-t border-white/5">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#0A8F6A]" /> {opp.location}
                    {opp.is_remote && " • Remote"}
                  </span>
                  <span className={cn("flex items-center gap-1.5", days <= 7 && "text-red-500")}>
                    <Clock className="h-3.5 w-3.5 text-[#0A8F6A]" />
                    {days > 0 ? `${days} days remaining` : "Closed"}
                  </span>
                </div>

                {opp.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {opp.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-[9px] text-neutral-500 font-medium tracking-wider uppercase">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <a
                  href={opp.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Apply Now <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Match panel */}
      {showMatchPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/80 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0A8F6A]/5 to-transparent pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10 mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-[#0A8F6A]" />
                <h2 className="text-xl font-medium tracking-tight text-white">AI Match Setup</h2>
              </div>
              <button onClick={() => setShowMatchPanel(false)} className="rounded-full p-2 bg-white/5 border border-white/5 text-neutral-500 hover:text-white transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-400 font-light leading-relaxed mb-8 relative z-10">
              Provide your academic and career profile to rank opportunities by relevance.
            </p>

            <div className="space-y-5 relative z-10">
              {[
                { label: "SKILLS (CSV)", key: "skills", placeholder: "react, python, research writing" },
                { label: "INTERESTS (CSV)", key: "interests", placeholder: "scholarship, internship, tutoring" },
                { label: "LOCATION", key: "location", placeholder: "Lagos" },
                { label: "CGPA", key: "gpa", placeholder: "3.8" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{label}</label>
                  <input
                    value={profile[key as keyof typeof profile]}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3 relative z-10">
              <button
                onClick={() => setShowMatchPanel(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAiMatch()}
                disabled={matchLoading}
                className="flex-[2] items-center justify-center gap-3 rounded-xl bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60 flex"
              >
                {matchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {matchLoading ? "Ranking..." : "Rank Opportunities"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
