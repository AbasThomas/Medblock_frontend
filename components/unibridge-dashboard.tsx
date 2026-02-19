"use client";

import { useEffect, useMemo, useState } from "react";
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
import { DEFAULT_OPPORTUNITIES, MVP_STATS, PLAN_PRICING } from "@/lib/mock-data";
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
  const [hfConfigured, setHfConfigured] = useState<boolean | null>(null);

  const [summaryInput, setSummaryInput] = useState(
    "Data Structures lecture focused on stacks, queues, and tree traversal. The lecturer explained time complexity tradeoffs and gave practice questions for BFS and DFS. A quiz opens tomorrow by 8:00 AM and closes 11:59 PM.",
  );
  const [summaryLanguage, setSummaryLanguage] = useState<SupportedLanguage>("en");
  const [summaryResult, setSummaryResult] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [moderationInput, setModerationInput] = useState(
    "Comprehensive UNILAG GST notes with solved examples and references from 2025 sessions.",
  );
  const [moderationResult, setModerationResult] = useState<ModerateResponse | null>(null);
  const [moderationLoading, setModerationLoading] = useState(false);

  const [translationInput, setTranslationInput] = useState(
    "Mid-semester exams start next Monday. Download your revision pack now.",
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
    "I have too many deadlines this week and I cannot focus on one course at a time.",
  );
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinResult, setCheckinResult] = useState<CheckinResponse | null>(null);

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
  }, []);

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
      toast.success("Lecture summary generated.");
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
      toast.success("Resource moderation complete.");
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
        opportunities: DEFAULT_OPPORTUNITIES,
      });
      setMatchResult(result);
      toast.success("Top opportunities ranked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to match opportunities.");
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
        toast.warning("Urgent support guidance returned.");
      } else {
        toast.success("Wellness check-in complete.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to run check-in.");
    } finally {
      setCheckinLoading(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (hfConfigured === null) return "Checking AI access...";
    if (hfConfigured) return "Hugging Face models active";
    return "Running local fallback mode (set HUGGINGFACE_API_KEY for full AI)";
  }, [hfConfigured]);

  const statusClass = hfConfigured
    ? "bg-emerald-500/15 text-emerald-700 border-emerald-300"
    : "bg-amber-500/15 text-amber-700 border-amber-300";

  return (
    <div>
      <div className="mx-auto w-full max-w-7xl">
        <section className="overflow-hidden rounded-3xl border border-white/80 bg-hero-gradient p-6 text-white shadow-xl md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/85">UniBridge Hackathon MVP</p>
              <h1 className="mt-2 text-3xl font-semibold md:text-5xl">Virtual Campus For Nigerian Universities</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/90 md:text-base">
                AI summaries, resource moderation, scholarship and gig matching, and wellness check-ins in one
                low-data-ready platform.
              </p>
            </div>
            <div className={`rounded-full border px-4 py-2 text-sm font-medium ${statusClass}`}>
              {statusLabel}
            </div>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MVP_STATS.map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-4 text-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-600">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Brain className="h-5 w-5 text-primary" />
              AI Lecture Summarizer
            </div>
            <textarea
              value={summaryInput}
              onChange={(event) => setSummaryInput(event.target.value)}
              className="mt-3 h-32 w-full rounded-xl border px-3 py-2 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {(["en", "yo", "pcm"] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSummaryLanguage(lang)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium uppercase ${
                    summaryLanguage === lang ? "bg-primary text-white" : "bg-white"
                  }`}
                >
                  {lang}
                </button>
              ))}
              <button
                onClick={onSummarize}
                disabled={summaryLoading}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate
              </button>
            </div>
            {summaryResult && (
              <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
                <p>{summaryResult.summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Model: {summaryResult.metadata.summarizationModel}
                  {summaryResult.metadata.usedFallback ? " (fallback used)" : ""}
                </p>
              </div>
            )}
          </article>

          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Resource Moderation
            </div>
            <textarea
              value={moderationInput}
              onChange={(event) => setModerationInput(event.target.value)}
              className="mt-3 h-32 w-full rounded-xl border px-3 py-2 text-sm"
            />
            <button
              onClick={onModerate}
              disabled={moderationLoading}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {moderationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              Run Moderation
            </button>
            {moderationResult && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${
                  moderationResult.flagged
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-emerald-300 bg-emerald-50 text-emerald-800"
                }`}
              >
                <p className="font-medium">
                  Status: {moderationResult.flagged ? "Needs Manual Review" : "Auto-Approve Candidate"}
                </p>
                <p className="mt-1">Score: {(moderationResult.score * 100).toFixed(1)}%</p>
                <p className="mt-1">Labels: {moderationResult.categories.join(", ")}</p>
                <p className="mt-2 text-xs">{moderationResult.recommendation}</p>
              </div>
            )}
          </article>

          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Languages className="h-5 w-5 text-primary" />
              Local Language Translation
            </div>
            <textarea
              value={translationInput}
              onChange={(event) => setTranslationInput(event.target.value)}
              className="mt-3 h-28 w-full rounded-xl border px-3 py-2 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {(["yo", "pcm"] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setTranslationLanguage(lang)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium uppercase ${
                    translationLanguage === lang ? "bg-primary text-white" : "bg-white"
                  }`}
                >
                  {lang}
                </button>
              ))}
              <button
                onClick={onTranslate}
                disabled={translationLoading}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {translationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                Translate
              </button>
            </div>
            {translationResult && (
              <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
                <p>{translationResult.translation}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Model: {translationResult.metadata.model}
                  {translationResult.metadata.usedFallback ? " (fallback used)" : ""}
                </p>
              </div>
            )}
          </article>

          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <HeartPulse className="h-5 w-5 text-primary" />
              Mental Health Check-In
            </div>
            <textarea
              value={checkinInput}
              onChange={(event) => setCheckinInput(event.target.value)}
              className="mt-3 h-28 w-full rounded-xl border px-3 py-2 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {["happy", "sad", "anxious", "stressed", "neutral"].map((mood) => (
                <button
                  key={mood}
                  onClick={() => setCheckinMood(mood)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize ${
                    checkinMood === mood ? "bg-primary text-white" : "bg-white"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
            <button
              onClick={onCheckin}
              disabled={checkinLoading}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {checkinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
              Check In
            </button>
            {checkinResult && (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm ${
                  checkinResult.urgent ? "border-red-300 bg-red-50 text-red-900" : "border-blue-300 bg-blue-50"
                }`}
              >
                {checkinResult.urgent && (
                  <div className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase">
                    <CircleAlert className="h-4 w-4" />
                    Urgent Support
                  </div>
                )}
                <p>{checkinResult.response}</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {checkinResult.followUps.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              Scholarship + Gig Matching
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              AI ranks opportunities using profile context + embedding similarity.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="skills (comma separated)"
              />
              <input
                value={interests}
                onChange={(event) => setInterests(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="interests (comma separated)"
              />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="location"
              />
              <input
                value={gpa}
                onChange={(event) => setGpa(event.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="CGPA"
              />
            </div>
            <button
              onClick={onMatch}
              disabled={matchLoading}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {matchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Rank Opportunities
            </button>
            <div className="mt-4 space-y-3">
              {(matchResult?.matches ?? []).map((item) => (
                <div key={item.opportunity.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.opportunity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.opportunity.organization} | {item.opportunity.location}
                        {item.opportunity.isRemote ? " | Remote" : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold">
                      {(item.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>
                  {item.opportunity.amount ? (
                    <p className="mt-1 text-xs font-medium">{formatNaira(item.opportunity.amount)}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Pricing Plans
            </div>
            <div className="mt-3 space-y-3">
              {Object.entries(PLAN_PRICING).map(([plan, info]) => (
                <div key={plan} className="rounded-xl border p-3">
                  <p className="text-sm font-semibold capitalize">{plan}</p>
                  <p className="text-xs text-muted-foreground">{info.price}</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {info.highlights.map((feature) => (
                      <li key={feature}>- {feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Low-data mode + resilience notes</p>
              <p className="mt-1">
                Add `next-pwa`, IndexedDB caching, and queued sync to complete offline-first behavior before final
                production rollout.
              </p>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
              <WifiOff className="h-3.5 w-3.5" />
              Works in fallback mode if AI APIs are unavailable
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
