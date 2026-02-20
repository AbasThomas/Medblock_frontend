"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight01Icon,
  Clock01Icon,
  FilterIcon,
  Location01Icon,
  Search01Icon,
  SparklesIcon,
  Award01Icon as TrophyIcon,
  Wifi01Icon,
  Cancel01Icon,
  PlusSignIcon,
} from "hugeicons-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { addUserPoints, createOpportunity, getOpportunities } from "@/lib/supabase/queries";
import { formatNaira, getOpportunityTypeColor, cn } from "@/lib/utils";

type Opportunity = {
  id: string;
  title: string;
  type: string;
  organization: string;
  created_by?: string;
  submitted_by_name?: string;
  is_approved?: boolean;
  description: string;
  amount?: number;
  currency?: string;
  deadline: string;
  requirements: string[];
  skills: string[];
  location: string;
  is_remote: boolean;
  application_url: string;
  contact_person?: string;
  contact_link?: string;
  tags: string[];
  created_at: string;
  matchScore?: number;
  matchReason?: string;
};

type OpportunityForm = {
  title: string;
  type: "scholarship" | "bursary" | "gig" | "internship" | "grant";
  organization: string;
  description: string;
  amount: string;
  deadline: string;
  requirements: string;
  skills: string;
  location: string;
  is_remote: boolean;
  application_url: string;
  contact_person: string;
  contact_link: string;
  tags: string;
};

const OPP_TYPES = ["scholarship", "bursary", "gig", "internship", "grant"] as const;

export default function OpportunitiesPage() {
  const searchParams = useSearchParams();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);

  const [matchLoading, setMatchLoading] = useState(false);
  const [matchMode, setMatchMode] = useState(false);
  const [showMatchPanel, setShowMatchPanel] = useState(false);

  const [showSubmitPanel, setShowSubmitPanel] = useState(false);
  const [submittingOpportunity, setSubmittingOpportunity] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    name: "",
    university: "",
    department: "",
    skills: "",
    interests: "",
    location: "",
    gpa: "",
  });

  const [opportunityForm, setOpportunityForm] = useState<OpportunityForm>({
    title: "",
    type: "scholarship",
    organization: "",
    description: "",
    amount: "",
    deadline: "",
    requirements: "",
    skills: "",
    location: "",
    is_remote: false,
    application_url: "",
    contact_person: "",
    contact_link: "",
    tags: "",
  });

  const supabase = useMemo(() => createClient(), []);

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

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
        .select("name, department, university")
        .eq("id", user.id)
        .single();

      setProfile((prev) => ({
        ...prev,
        name: data?.name ?? user.email?.split("@")[0] ?? "User",
        university: data?.university ?? "",
        department: data?.department ?? "",
        location: prev.location || data?.university || "",
      }));
    } catch {
      setProfile((prev) => ({
        ...prev,
        name: user.email?.split("@")[0] ?? "User",
      }));
    }
  }, [supabase]);

  const loadOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOpportunities(
        supabase,
        {
          type: typeFilter || undefined,
          isRemote: remoteOnly || undefined,
          search: search || undefined,
          createdBy: mineOnly && userId ? userId : undefined,
        },
        60,
      );
      setOpportunities(data as Opportunity[]);
      setMatchMode(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load opportunities.");
    } finally {
      setLoading(false);
    }
  }, [mineOnly, remoteOnly, search, supabase, typeFilter, userId]);

  useEffect(() => {
    void loadIdentity();
  }, [loadIdentity]);

  useEffect(() => {
    const timer = setTimeout(() => void loadOpportunities(), 300);
    return () => clearTimeout(timer);
  }, [loadOpportunities]);

  useEffect(() => {
    if (searchParams.get("mine") === "1") {
      setMineOnly(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const channel = supabase
      .channel("opportunities-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, () => {
        void loadOpportunities();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadOpportunities, supabase]);

  const handleAiMatch = async () => {
    try {
      setMatchLoading(true);

      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            skills: parseList(profile.skills),
            interests: parseList(profile.interests),
            location: profile.location,
            gpa: profile.gpa ? Number(profile.gpa) : undefined,
            university: profile.university || undefined,
            department: profile.department || undefined,
          },
          opportunities: opportunities.map((opportunity) => ({
            id: opportunity.id,
            title: opportunity.title,
            type: opportunity.type,
            organization: opportunity.organization,
            description: opportunity.description,
            deadline: opportunity.deadline,
            isRemote: opportunity.is_remote,
            location: opportunity.location,
            applicationUrl: opportunity.application_url,
            skills: opportunity.skills,
            requirements: opportunity.requirements,
            tags: opportunity.tags,
            amount: opportunity.amount,
            currency: opportunity.currency,
          })),
        }),
      });

      const data = (await res.json()) as {
        matches?: Array<{ score: number; reason: string; opportunity: { id: string } }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Match failed");

      if (data.matches) {
        const ranked = data.matches
          .map((match) => {
            const opportunity = opportunities.find((item) => item.id === match.opportunity.id);
            return opportunity ? { ...opportunity, matchScore: match.score, matchReason: match.reason } : null;
          })
          .filter(Boolean) as Opportunity[];

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

  const handleSubmitOpportunity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId) {
      toast.error("Please sign in to submit an opportunity.");
      return;
    }

    if (!opportunityForm.title || !opportunityForm.organization || !opportunityForm.deadline || !opportunityForm.application_url) {
      toast.error("Please complete all required fields.");
      return;
    }

    if (!opportunityForm.contact_person.trim()) {
      toast.error("Please provide a contact person.");
      return;
    }

    const payload = {
      title: opportunityForm.title.trim(),
      type: opportunityForm.type,
      organization: opportunityForm.organization.trim(),
      description: opportunityForm.description.trim(),
      amount: opportunityForm.amount ? Number(opportunityForm.amount) : undefined,
      currency: "NGN",
      deadline: opportunityForm.deadline,
      requirements: parseList(opportunityForm.requirements),
      skills: parseList(opportunityForm.skills),
      location: opportunityForm.location.trim() || profile.university || "",
      is_remote: opportunityForm.is_remote,
      application_url: opportunityForm.application_url.trim(),
      contact_person: opportunityForm.contact_person.trim(),
      contact_link: opportunityForm.contact_link.trim() || undefined,
      tags: parseList(opportunityForm.tags),
      created_by: userId,
      submitted_by_name: profile.name,
      is_approved: true,
    };

    try {
      setSubmittingOpportunity(true);
      await createOpportunity(supabase, payload);

      try {
        await addUserPoints(supabase, userId, 30);
      } catch {
        // Non-blocking points update.
      }

      toast.success("Opportunity published successfully.");
      setShowSubmitPanel(false);
      setOpportunityForm({
        title: "",
        type: "scholarship",
        organization: "",
        description: "",
        amount: "",
        deadline: "",
        requirements: "",
        skills: "",
        location: "",
        is_remote: false,
        application_url: "",
        contact_person: "",
        contact_link: "",
        tags: "",
      });
      await loadOpportunities();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit opportunity.");
    } finally {
      setSubmittingOpportunity(false);
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
            Students can publish verified scholarships, gigs, internships, and funding opportunities.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowSubmitPanel(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-all"
          >
            <PlusSignIcon size={16} /> Submit Opportunity
          </button>
          <button
            onClick={() => setShowMatchPanel(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0A8F6A] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <SparklesIcon size={16} /> Run AI Matching
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 focus-within:border-[#0A8F6A]/50 transition-colors">
          <Search01Icon size={16} className="text-neutral-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search opportunities"
            className="w-48 bg-transparent text-sm outline-none text-neutral-200 placeholder:text-neutral-500"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <Cancel01Icon size={14} className="text-neutral-500 hover:text-white" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 focus-within:border-[#0A8F6A]/50 transition-colors">
          <FilterIcon size={16} className="text-neutral-500" />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="bg-transparent text-sm outline-none text-neutral-400 cursor-pointer"
          >
            <option value="" className="bg-neutral-900">All Opportunity Types</option>
            {OPP_TYPES.map((type) => (
              <option key={type} value={type} className="bg-neutral-900">
                {type.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setRemoteOnly((prev) => !prev)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all",
            remoteOnly
              ? "border-[#0A8F6A] bg-[#0A8F6A] text-white shadow-[0_0_15px_rgba(10,143,106,0.3)]"
              : "bg-black/20 border-white/10 text-neutral-500 hover:text-white hover:border-white/20",
          )}
        >
          <Wifi01Icon size={16} /> Remote Only
        </button>

        <button
          onClick={() => setMineOnly((prev) => !prev)}
          className={cn(
            "rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all",
            mineOnly
              ? "border-[#0A8F6A] bg-[#0A8F6A]/20 text-white"
              : "border-white/10 bg-black/20 text-neutral-500 hover:text-white",
          )}
        >
          My Submissions
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
          <SparklesIcon size={16} /> Opportunities ranked by AI fit analysis based on your profile.
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center">
          <TrophyIcon size={40} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No opportunities found</p>
          <p className="mt-1 text-xs text-muted-foreground">Submit an opportunity to populate this board.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opportunity) => {
            const days = daysUntilDeadline(opportunity.deadline);
            return (
              <div
                key={opportunity.id}
                className="glass-panel flex flex-col rounded-2xl p-6 shadow-2xl group hover:border-[#0A8F6A]/30 transition-all duration-500"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border",
                      getOpportunityTypeColor(opportunity.type),
                    )}
                  >
                    {opportunity.type}
                  </span>
                  {opportunity.matchScore !== undefined && (
                    <span className="rounded-full bg-[#0A8F6A] px-3 py-1 text-[10px] font-bold text-white uppercase tracking-widest">
                      {(opportunity.matchScore * 100).toFixed(0)}% MATCH
                    </span>
                  )}
                </div>

                <div className="mt-6 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#0A8F6A] font-semibold mb-2">{opportunity.organization}</p>
                  <p className="text-lg font-medium leading-tight text-white group-hover:text-[#0A8F6A] transition-colors duration-300">{opportunity.title}</p>
                  {opportunity.description && (
                    <p className="mt-4 line-clamp-2 text-xs text-neutral-500 font-light leading-relaxed">{opportunity.description}</p>
                  )}
                  {opportunity.submitted_by_name && (
                    <p className="mt-3 text-[10px] uppercase tracking-widest text-neutral-500">Submitted by {opportunity.submitted_by_name}</p>
                  )}
                  {opportunity.contact_person && (
                    <p className="mt-2 text-[10px] uppercase tracking-widest text-neutral-500">
                      Contact: {opportunity.contact_person}
                    </p>
                  )}
                  {opportunity.contact_link && (
                    <a
                      href={opportunity.contact_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-[10px] font-bold uppercase tracking-widest text-[#0A8F6A] hover:underline"
                    >
                      Contact Profile
                    </a>
                  )}
                  {opportunity.matchReason && (
                    <div className="mt-4 rounded-lg bg-[#0A8F6A]/5 border border-[#0A8F6A]/10 p-3 italic text-[11px] text-neutral-400 font-light">
                      <span className="text-[#0A8F6A] font-bold not-italic">AI Rationale:</span> {opportunity.matchReason}
                    </div>
                  )}
                </div>

                {opportunity.amount && (
                  <p className="mt-6 text-xl font-bold text-white tracking-tight">{formatNaira(opportunity.amount)}</p>
                )}

                <div className="mt-6 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 pt-6 border-t border-white/5">
                  <span className="flex items-center gap-1.5">
                    <Location01Icon size={14} className="text-[#0A8F6A]" /> {opportunity.location}
                    {opportunity.is_remote && " - Remote"}
                  </span>
                  <span className={cn("flex items-center gap-1.5", days <= 7 && "text-red-500")}>
                    <Clock01Icon size={14} className="text-[#0A8F6A]" />
                    {days > 0 ? `${days} days remaining` : "Closed"}
                  </span>
                </div>

                {opportunity.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {opportunity.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-[9px] text-neutral-500 font-medium tracking-wider uppercase">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <a
                  href={opportunity.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Apply Now <ArrowUpRight01Icon size={16} />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {showMatchPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/80 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <SparklesIcon size={24} className="text-[#0A8F6A]" />
                <h2 className="text-xl font-medium tracking-tight text-white">AI Match Setup</h2>
              </div>
              <button onClick={() => setShowMatchPanel(false)} className="rounded-full p-2 bg-white/5 border border-white/5 text-neutral-500 hover:text-white transition-all">
                <Cancel01Icon size={16} />
              </button>
            </div>
            <p className="text-xs text-neutral-400 font-light leading-relaxed mb-8">
              Provide your academic and career profile to rank opportunities by relevance.
            </p>

            <div className="space-y-5">
              {[
                { label: "SKILLS (CSV)", key: "skills", placeholder: "Enter skills separated by commas" },
                { label: "INTERESTS (CSV)", key: "interests", placeholder: "Enter interests separated by commas" },
                { label: "LOCATION", key: "location", placeholder: "Enter preferred location" },
                { label: "CGPA", key: "gpa", placeholder: "Enter your CGPA" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{label}</label>
                  <input
                    value={profile[key as keyof typeof profile]}
                    onChange={(event) => setProfile((prev) => ({ ...prev, [key]: event.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowMatchPanel(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAiMatch()}
                disabled={matchLoading}
                className="flex-[2] flex items-center justify-center gap-3 rounded-xl bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60"
              >
                {matchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {matchLoading ? "Ranking..." : "Rank Opportunities"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmitPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black/80 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium tracking-tight text-white">Submit Opportunity</h2>
              <button onClick={() => setShowSubmitPanel(false)} className="rounded-full p-2 bg-white/5 border border-white/5 text-neutral-500 hover:text-white transition-all">
                <Cancel01Icon size={16} />
              </button>
            </div>
            <p className="text-xs text-neutral-400 font-light leading-relaxed mb-8">
              Publish a real opportunity so students can discover and apply immediately.
            </p>

            <form onSubmit={(event) => void handleSubmitOpportunity(event)} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Title *</label>
                  <input
                    value={opportunityForm.title}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Opportunity title"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Type *</label>
                  <select
                    value={opportunityForm.type}
                    onChange={(event) =>
                      setOpportunityForm((prev) => ({
                        ...prev,
                        type: event.target.value as OpportunityForm["type"],
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                  >
                    {OPP_TYPES.map((type) => (
                      <option key={type} value={type} className="bg-neutral-900">
                        {type.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Organization *</label>
                  <input
                    value={opportunityForm.organization}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, organization: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Organization name"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Deadline *</label>
                  <input
                    type="date"
                    value={opportunityForm.deadline}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, deadline: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Amount (NGN)</label>
                  <input
                    type="number"
                    min={0}
                    value={opportunityForm.amount}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, amount: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Optional amount"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Location</label>
                  <input
                    value={opportunityForm.location}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, location: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Opportunity location"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Application URL *</label>
                <input
                  type="url"
                  value={opportunityForm.application_url}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, application_url: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Contact Person *</label>
                  <input
                    value={opportunityForm.contact_person}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, contact_person: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="Hiring manager or recruiter name"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Contact Link</label>
                  <input
                    type="url"
                    value={opportunityForm.contact_link}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, contact_link: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="https://linkedin.com/in/... or https://upwork.com/..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Description</label>
                <textarea
                  rows={3}
                  value={opportunityForm.description}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                  placeholder="Opportunity details"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Requirements (CSV)</label>
                  <input
                    value={opportunityForm.requirements}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, requirements: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="portfolio, transcript"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Skills (CSV)</label>
                  <input
                    value={opportunityForm.skills}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, skills: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="python, writing"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Tags (CSV)</label>
                  <input
                    value={opportunityForm.tags}
                    onChange={(event) => setOpportunityForm((prev) => ({ ...prev, tags: event.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200 outline-none focus:border-[#0A8F6A]/50"
                    placeholder="remote, internship"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={opportunityForm.is_remote}
                  onChange={(event) => setOpportunityForm((prev) => ({ ...prev, is_remote: event.target.checked }))}
                />
                This opportunity is remote
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitPanel(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOpportunity}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[#0A8F6A] py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60"
                >
                  {submittingOpportunity && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submittingOpportunity ? "Publishing..." : "Publish Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
