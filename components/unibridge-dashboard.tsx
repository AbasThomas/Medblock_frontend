"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Brain,
  CircleAlert,
  HeartPulse,
  Languages,
  Loader2,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PLAN_CATALOG } from "@/lib/pricing";
import { formatNaira } from "@/lib/utils";
import type { SupportedLanguage } from "@/lib/ai/models";

interface SummaryResponse {
  summary: string;
  sourceSummary: string;
  language: SupportedLanguage;
  metadata: {
    summarizationModel: string;
    translationModel: string;
    usedFallback: boolean;
  };
}

interface ModerateResponse {
  flagged: boolean;
  score: number;
  categories: string[];
  recommendation: string;
  model: string;
  usedFallback: boolean;
}

interface MatchResponse {
  total: number;
  matches: Array<{
    score: number;
    reason: string;
    opportunity: {
      id: string;
      title: string;
      type: string;
      organization: string;
      amount?: number;
      currency?: string;
      deadline: string;
      isRemote: boolean;
      location: string;
      applicationUrl: string;
    };
  }>;
}

interface CheckinResponse {
  urgent: boolean;
  response: string;
  followUps: string[];
  model: string;
  usedFallback: boolean;
}

interface TranslateResponse {
  translation: string;
  metadata: {
    model: string;
    usedFallback: boolean;
  };
}

interface StatusResponse {
  configured: boolean;
}

interface OperationalMetric {
  label: string;
  value: string;
}

interface OpportunityPayload {
  id: string;
  title: string;
  type: string;
  organization: string;
  description: string;
  deadline: string;
  isRemote: boolean;
  location: string;
  applicationUrl: string;
  skills: string[];
  requirements: string[];
  tags: string[];
  amount?: number;
  currency?: string;
}

async function postJson<T>(url: string, body: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export function UniBridgeDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [hfConfigured, setHfConfigured] = useState<boolean | null>(null);
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetric[]>([
    { label: "Registered Users", value: "0" },
    { label: "Approved Resources", value: "0" },
    { label: "Active Opportunities", value: "0" },
    { label: "Live Lectures", value: "0" },
  ]);
  const [opportunityPool, setOpportunityPool] = useState<OpportunityPayload[]>([]);

  const [summaryInput, setSummaryInput] = useState(
    "Data Structures lecture covered stacks, queues, and tree traversal, including time complexity comparisons for BFS and DFS.",
  );
  const [summaryLanguage, setSummaryLanguage] = useState<SupportedLanguage>("en");
  const [summaryResult, setSummaryResult] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [moderationInput, setModerationInput] = useState(
    "Comprehensive UNILAG GST notes with solved examples and properly cited references.",
  );
  const [moderationResult, setModerationResult] = useState<ModerateResponse | null>(null);
  const [moderationLoading, setModerationLoading] = useState(false);

  const [translationInput, setTranslationInput] = useState(
    "Mid-semester examinations begin next Monday. Please download your revision materials before Friday.",
  );
  const [translationLanguage, setTranslationLanguage] = useState<SupportedLanguage>("yo");
  const [translationResult, setTranslationResult] = useState<TranslateResponse | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);

  const [skills, setSkills] = useState("react, typescript, research writing");
  const [interests, setInterests] = useState("internship, scholarship, tutoring");
  const [location, setLocation] = useState("Lagos");
  const [gpa, setGpa] = useState("3.8");
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResponse | null>(null);

  const [checkinMood, setCheckinMood] = useState("stressed");
  const [checkinInput, setCheckinInput] = useState(
    "I have multiple deadlines this week and I need help prioritizing my workload.",
  );
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinResult, setCheckinResult] = useState<CheckinResponse | null>(null);

  const loadOperationalData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const [usersRes, resourcesRes, oppRes, liveLecturesRes, opportunitiesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("resources").select("id", { count: "exact", head: true }).eq("is_approved", true),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).gte("deadline", today),
        supabase.from("lectures").select("id", { count: "exact", head: true }).eq("is_live", true),
        supabase
          .from("opportunities")
          .select("*")
          .gte("deadline", today)
          .order("deadline", { ascending: true })
          .limit(80),
      ]);

      setOperationalMetrics([
        { label: "Registered Users", value: String(usersRes.count ?? 0) },
        { label: "Approved Resources", value: String(resourcesRes.count ?? 0) },
        { label: "Active Opportunities", value: String(oppRes.count ?? 0) },
        { label: "Live Lectures", value: String(liveLecturesRes.count ?? 0) },
      ]);

      const mappedOpportunities: OpportunityPayload[] = (opportunitiesRes.data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        organization: item.organization,
        description: item.description ?? "",
        deadline: item.deadline,
        isRemote: item.is_remote ?? false,
        location: item.location ?? "Nigeria",
        applicationUrl: item.application_url ?? "",
        skills: item.skills ?? [],
        requirements: item.requirements ?? [],
        tags: item.tags ?? [],
        amount: item.amount ?? undefined,
        currency: item.currency ?? "NGN",
      }));
      setOpportunityPool(mappedOpportunities);
    } catch {
      setOperationalMetrics([
        { label: "Registered Users", value: "0" },
        { label: "Approved Resources", value: "0" },
        { label: "Active Opportunities", value: "0" },
        { label: "Live Lectures", value: "0" },
      ]);
      setOpportunityPool([]);
    }
  }, [supabase]);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch("/api/ai/status", { cache: "no-store" });
        const data = (await response.json()) as StatusResponse;
        setHfConfigured(data.configured);
      } catch {
        setHfConfigured(false);
      }
    };

    void loadStatus();
    void loadOperationalData();
  }, [loadOperationalData]);

  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const onSummarize = async () => {
    try {
      setSummaryLoading(true);
      const result = await postJson<SummaryResponse>("/api/ai/summarize", {
        text: summaryInput,
        language: summaryLanguage,
      });
      setSummaryResult(result);
      toast.success("Summary generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to summarize.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const onModerate = async () => {
    try {
      setModerationLoading(true);
      const result = await postJson<ModerateResponse>("/api/ai/moderate", {
        text: moderationInput,
      });
      setModerationResult(result);
      toast.success("Moderation complete.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to moderate.");
    } finally {
      setModerationLoading(false);
    }
  };

  const onTranslate = async () => {
    try {
      setTranslationLoading(true);
      const result = await postJson<TranslateResponse>("/api/ai/translate", {
        text: translationInput,
        language: translationLanguage,
      });
      setTranslationResult(result);
      toast.success("Translation complete.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to translate.");
    } finally {
      setTranslationLoading(false);
    }
  };

  const onMatch = async () => {
    try {
      setMatchLoading(true);
      const result = await postJson<MatchResponse>("/api/ai/match", {
        profile: {
          skills: parseList(skills),
          interests: parseList(interests),
          location,
          gpa: gpa ? Number(gpa) : undefined,
          university: "University of Lagos",
          department: "Computer Science",
          level: "300L",
        },
        opportunities: opportunityPool,
      });
      setMatchResult(result);
      toast.success("Opportunity ranking completed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to rank opportunities.");
    } finally {
      setMatchLoading(false);
    }
  };

  const onCheckin = async () => {
    try {
      setCheckinLoading(true);
      const result = await postJson<CheckinResponse>("/api/ai/checkin", {
        message: checkinInput,
        mood: checkinMood,
      });
      setCheckinResult(result);
      if (result.urgent) {
        toast.warning("Urgent guidance returned. Please contact support resources.");
      } else {
        toast.success("Wellness check-in completed.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to run check-in.");
    } finally {
      setCheckinLoading(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (hfConfigured === null) return "Checking AI service status...";
    if (hfConfigured) return "Hugging Face models active";
    return "Fallback inference mode active";
  }, [hfConfigured]);

  const statusClass = hfConfigured
    ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
    : "bg-amber-500/15 text-amber-700 border-amber-300";

  return (
    <div>
      <div className="mx-auto w-full max-w-7xl">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 text-white shadow-2xl backdrop-blur-xl md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#0A8F6A]/10 to-transparent opacity-50"></div>
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">UniBridge AI Workspace</p>
              <h1 className="mt-2 text-3xl font-medium tracking-tighter md:text-5xl">Operational Intelligence Console</h1>
              <p className="mt-3 max-w-2xl text-sm font-light text-neutral-400 md:text-base">
                Manage summarization, moderation, translation, wellness guidance, and opportunity matching from one production dashboard.
              </p>
            </div>
            <div className={`rounded-full border px-4 py-2 text-[11px] font-medium uppercase tracking-widest ${statusClass}`}>
              {statusLabel}
            </div>
          </div>
          <div className="relative z-10 mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {operationalMetrics.map((metric) => (
              <div key={metric.label} className="glass-panel rounded-2xl p-6 transition-all duration-300 hover:border-[#0A8F6A]/30">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tighter text-white">{metric.value}</p>
                <div className="mt-3 h-0.5 w-8 bg-[#0A8F6A]/50"></div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="glass-panel rounded-2xl border-white/5 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3 text-lg font-medium tracking-tight text-white">
              <Brain className="h-6 w-6 text-[#0A8F6A]" />
              Lecture Summarization
            </div>
            <textarea
              value={summaryInput}
              onChange={(event) => setSummaryInput(event.target.value)}
              className="mt-3 h-32 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300 transition-colors focus:border-[#0A8F6A]/50 focus:outline-none"
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {(["en", "yo", "pcm"] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSummaryLanguage(lang)}
                  className={`rounded-lg border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${summaryLanguage === lang ? "bg-[#0A8F6A] text-white shadow-[0_0_15px_rgba(10,143,106,0.4)]" : "bg-white/5 border-white/10 text-neutral-500 hover:text-white hover:border-white/20"}`}
                >
                  {lang}
                </button>
              ))}
              <button
                onClick={onSummarize}
                disabled={summaryLoading}
                className="ml-auto inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-all hover:bg-[#0A8F6A] hover:border-[#0A8F6A] disabled:opacity-60"
              >
                {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate
              </button>
            </div>
            {summaryResult && (
              <div className="mt-6 rounded-xl border border-[#0A8F6A]/20 bg-[#0A8F6A]/5 p-4 text-xs font-light leading-relaxed text-neutral-300">
                <p>{summaryResult.summary}</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                  <div className="h-px w-4 bg-[#0A8F6A]"></div>
                  Model: {summaryResult.metadata.summarizationModel}
                  {summaryResult.metadata.usedFallback ? " (fallback)" : ""}
                </div>
              </div>
            )}
          </article>

          <article className="glass-panel rounded-2xl border-white/5 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3 text-lg font-medium tracking-tight text-white">
              <ShieldCheck className="h-6 w-6 text-[#0A8F6A]" />
              Resource Moderation
            </div>
            <textarea
              value={moderationInput}
              onChange={(event) => setModerationInput(event.target.value)}
              className="mt-3 h-32 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300 transition-colors focus:border-[#0A8F6A]/50 focus:outline-none"
            />
            <button
              onClick={onModerate}
              disabled={moderationLoading}
              className="mt-6 inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-all hover:bg-[#0A8F6A] hover:border-[#0A8F6A] disabled:opacity-60"
            >
              {moderationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              Analyze
            </button>
            {moderationResult && (
              <div
                className={`mt-6 rounded-xl border p-4 text-xs font-light ${moderationResult.flagged ? "border-red-500/30 bg-red-500/5 text-red-200" : "border-[#0A8F6A]/30 bg-[#0A8F6A]/5 text-neutral-300"}`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-bold uppercase tracking-widest text-[#0A8F6A]">
                    Status: {moderationResult.flagged ? "Requires Review" : "Approved"}
                  </p>
                  <p className="font-bold text-neutral-500">{(moderationResult.score * 100).toFixed(1)}% confidence</p>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {moderationResult.categories.map((category) => (
                    <span key={category} className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase">
                      {category}
                    </span>
                  ))}
                </div>
                <p className="leading-relaxed opacity-80">{moderationResult.recommendation}</p>
              </div>
            )}
          </article>

          <article className="glass-panel rounded-2xl border-white/5 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3 text-lg font-medium tracking-tight text-white">
              <Languages className="h-6 w-6 text-[#0A8F6A]" />
              Translation
            </div>
            <textarea
              value={translationInput}
              onChange={(event) => setTranslationInput(event.target.value)}
              className="mt-3 h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300 transition-colors focus:border-[#0A8F6A]/50 focus:outline-none"
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {(["yo", "pcm"] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setTranslationLanguage(lang)}
                  className={`rounded-lg border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${translationLanguage === lang ? "bg-[#0A8F6A] text-white shadow-[0_0_15px_rgba(10,143,106,0.4)]" : "bg-white/5 border-white/10 text-neutral-500 hover:text-white hover:border-white/20"}`}
                >
                  {lang === "yo" ? "Yoruba" : "Pidgin"}
                </button>
              ))}
              <button
                onClick={onTranslate}
                disabled={translationLoading}
                className="ml-auto inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-all hover:bg-[#0A8F6A] hover:border-[#0A8F6A] disabled:opacity-60"
              >
                {translationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                Translate
              </button>
            </div>
            {translationResult && (
              <div className="mt-6 rounded-xl border border-[#0A8F6A]/20 bg-[#0A8F6A]/5 p-4 text-xs font-light leading-relaxed text-neutral-300">
                <p>{translationResult.translation}</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                  <div className="h-px w-4 bg-[#0A8F6A]"></div>
                  Model: {translationResult.metadata.model}
                </div>
              </div>
            )}
          </article>

          <article className="glass-panel rounded-2xl border-white/5 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3 text-lg font-medium tracking-tight text-white">
              <HeartPulse className="h-6 w-6 text-[#0A8F6A]" />
              Wellness Check-In
            </div>
            <textarea
              value={checkinInput}
              onChange={(event) => setCheckinInput(event.target.value)}
              className="mt-3 h-28 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-300 transition-colors focus:border-[#0A8F6A]/50 focus:outline-none"
            />
            <div className="mt-6 flex flex-wrap gap-2">
              {["happy", "sad", "anxious", "stressed", "neutral"].map((mood) => (
                <button
                  key={mood}
                  onClick={() => setCheckinMood(mood)}
                  className={`rounded-lg border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${checkinMood === mood ? "bg-[#0A8F6A] text-white shadow-[0_0_15px_rgba(10,143,106,0.4)]" : "bg-white/5 border-white/10 text-neutral-500 hover:text-white hover:border-white/20"}`}
                >
                  {mood}
                </button>
              ))}
            </div>
            <button
              onClick={onCheckin}
              disabled={checkinLoading}
              className="mt-6 inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-all hover:bg-[#0A8F6A] hover:border-[#0A8F6A] disabled:opacity-60"
            >
              {checkinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
              Submit
            </button>
            {checkinResult && (
              <div className={`mt-6 rounded-xl border p-4 text-xs font-light ${checkinResult.urgent ? "border-red-500/30 bg-red-500/5 text-red-200" : "border-blue-500/30 bg-blue-500/5 text-blue-200"}`}>
                {checkinResult.urgent && (
                  <div className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                    <CircleAlert className="h-4 w-4 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    Priority Guidance
                  </div>
                )}
                <p className="leading-relaxed">{checkinResult.response}</p>
                <ul className="mt-4 space-y-2 border-t border-white/5 pt-4">
                  {checkinResult.followUps.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#0A8F6A]"></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="glass-panel rounded-2xl border-white/5 p-6 shadow-2xl">
            <div className="mb-2 flex items-center gap-3 text-lg font-medium tracking-tight text-white">
              <Sparkles className="h-6 w-6 text-[#0A8F6A]" />
              Opportunity Matching
            </div>
            <p className="mb-6 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              AI ranking based on skills, interests, and eligibility.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
                className="rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-xs text-neutral-300 transition-colors focus:border-[#0A8F6A]/50 focus:outline-none"
                placeholder="Skills (comma separated)"
              />
              <input
                value={interests}
                onChange={(event) => setInterests(event.target.value)}
                className="rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-xs text-neutral-300 transition-colors focus:border-[#0A8F6A]/50 focus:outline-none"
                placeholder="Interests (comma separated)"
              />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-xs text-neutral-300 transition-colors focus:border-[#0A8F6A]/50 focus:outline-none"
                placeholder="Location"
              />
              <input
                value={gpa}
                onChange={(event) => setGpa(event.target.value)}
                className="rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-xs text-neutral-300 transition-colors focus:border-[#0A8F6A]/50 focus:outline-none"
                placeholder="CGPA"
              />
            </div>
            <button
              onClick={onMatch}
              disabled={matchLoading}
              className="mt-6 inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-all hover:bg-[#0A8F6A] hover:border-[#0A8F6A] disabled:opacity-60"
            >
              {matchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Rank Opportunities
            </button>
            <div className="mt-6 space-y-4">
              {(matchResult?.matches ?? []).map((item) => (
                <div key={item.opportunity.id} className="group rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:border-[#0A8F6A]/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-neutral-200 transition-colors group-hover:text-white">{item.opportunity.title}</p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                        {item.opportunity.organization} • {item.opportunity.location}
                        {item.opportunity.isRemote ? " • Remote" : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#0A8F6A]/20 bg-[#0A8F6A]/10 px-3 py-1 text-[10px] font-bold text-[#0A8F6A] shadow-[0_0_10px_rgba(10,143,106,0.1)]">
                      {(item.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-light leading-relaxed text-neutral-400">{item.reason}</p>
                  {item.opportunity.amount ? (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-px w-4 bg-[#0A8F6A]"></div>
                      <p className="text-xs font-semibold tracking-tight text-white">{formatNaira(item.opportunity.amount)}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="glass-panel rounded-2xl border-white/5 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3 text-lg font-medium tracking-tight text-white">
              <BadgeCheck className="h-6 w-6 text-[#0A8F6A]" />
              Plan Entitlements
            </div>
            <div className="mt-3 space-y-4">
              {Object.entries(PLAN_CATALOG).map(([plan, info]) => (
                <div key={plan} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:border-white/10">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">{info.name}</p>
                    <p className="text-[11px] font-semibold text-[#0A8F6A]">{info.priceLabel}</p>
                  </div>
                  <p className="text-[11px] text-neutral-500">{info.summary}</p>
                  <ul className="mt-3 space-y-2">
                    {info.highlights.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-[11px] text-neutral-500">
                        <div className="h-1 w-1 rounded-full bg-white/20"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-5 text-center">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Offline Reliability</p>
              <p className="text-[11px] font-light leading-relaxed text-neutral-600">
                Progressive Web App caching and fallback processing remain available during low-connectivity periods.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3 rounded-lg border border-white/5 bg-white/5 py-3 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
              <WifiOff className="h-3.5 w-3.5" />
              Resilience mode enabled
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
