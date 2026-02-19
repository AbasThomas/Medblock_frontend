"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Globe2,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Play,
  Shield,
  Sparkles,
  Trophy,
  Users,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Brain,
    color: "bg-emerald-100 text-emerald-700",
    title: "AI Lecture Summaries",
    desc: "Miss a class? Get AI-generated summaries in English, Yoruba, or Pidgin—even when you are offline.",
  },
  {
    icon: BookOpen,
    color: "bg-blue-100 text-blue-700",
    title: "Resource Marketplace",
    desc: "Upload notes, past questions & study guides. Earn points for quality uploads. AI moderates for safety.",
  },
  {
    icon: Trophy,
    color: "bg-orange-100 text-orange-700",
    title: "Opportunity Matching",
    desc: "AI matches your profile with scholarships, bursaries, internships & campus gigs—ranked by fit.",
  },
  {
    icon: WifiOff,
    color: "bg-purple-100 text-purple-700",
    title: "Offline First",
    desc: "Download lectures & resources. Study on 2G or no internet. Auto-sync when you reconnect.",
  },
  {
    icon: LayoutDashboard,
    color: "bg-rose-100 text-rose-700",
    title: "Smart Admin Hub",
    desc: "Pay fees, check results, and register courses digitally—no queues, no cash, no corruption.",
  },
  {
    icon: HeartPulse,
    color: "bg-teal-100 text-teal-700",
    title: "Wellness Check-Ins",
    desc: "24/7 AI mental health support with referrals to licensed counsellors and Nigerian hotlines.",
  },
];

const STATS = [
  { value: "12+", label: "Partner Universities" },
  { value: "30%", label: "Fewer Missed Classes" },
  { value: "5 GB", label: "Offline Storage" },
  { value: "24/7", label: "AI Support" },
];

const STEPS = [
  {
    step: "01",
    title: "Create your account",
    desc: "Sign up as a student, lecturer, or admin. Set your university, department, and profile.",
  },
  {
    step: "02",
    title: "Access your campus",
    desc: "View your timetable, join live lectures, download resources, and apply to opportunities.",
  },
  {
    step: "03",
    title: "Never miss a beat",
    desc: "AI summaries, offline sync, and wellness support keep you moving even when strikes hit.",
  },
];

const PRICING = [
  {
    name: "Basic",
    price: "Free",
    sub: "forever",
    highlight: false,
    features: [
      "Timetable + announcements",
      "5 resource downloads/day",
      "1 AI summary/day",
      "1 GB offline storage",
      "Mental health chatbot",
    ],
    cta: "Get Started Free",
    href: "/auth/register",
  },
  {
    name: "Premium",
    price: "₦500",
    sub: "/ month",
    highlight: true,
    features: [
      "Unlimited AI summaries",
      "Unlimited resource downloads",
      "Full AI opportunity matching",
      "5 GB offline storage",
      "Priority support",
      "Advanced wellness chat",
    ],
    cta: "Start Free Trial",
    href: "/auth/register",
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "per university / year",
    highlight: false,
    features: [
      "Everything in Premium",
      "University white-labeling",
      "Bulk user management",
      "Custom integrations + SLAs",
      "Dedicated analytics dashboard",
    ],
    cta: "Contact Us",
    href: "mailto:hello@unibridge.ng",
  },
];

const TESTIMONIALS = [
  {
    name: "Tunde Adesanya",
    role: "300L Computer Science, UNILAG",
    avatar: "TA",
    text: "During the last ASUU strike I kept up with all my courses using UniBridge. The AI summaries saved my semester.",
  },
  {
    name: "Amaka Okafor",
    role: "200L Economics, UNILAG",
    avatar: "AO",
    text: "I uploaded my ECO 101 notes and earned enough points to unlock premium features. The gig matching found me a tutoring job in a week.",
  },
  {
    name: "Dr. Seun Adebayo",
    role: "Lecturer, Engineering Department",
    avatar: "SA",
    text: "I can now schedule lectures, share materials, and track student engagement all from one dashboard. Game changer.",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/20 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-space-grotesk text-xl font-bold">UniBridge</span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-8 md:flex">
          {["Features", "How it works", "Pricing"].map((item) => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Get Started Free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t bg-white px-4 py-4 md:hidden">
          <ul className="space-y-3">
            {["Features", "How it works", "Pricing"].map((item) => (
              <li key={item}>
                <a
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  className="block text-sm font-medium text-muted-foreground"
                  onClick={() => setOpen(false)}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/auth/login"
              className="rounded-lg border px-4 py-2 text-center text-sm font-medium"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-hero-gradient px-4 pt-20 pb-28 text-white md:px-8 md:pt-28 md:pb-36">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-white/5" />

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-widest">
            <Sparkles className="h-3 w-3" />
            AI-Powered Virtual Campus
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl">
            Your Virtual Campus,{" "}
            <span className="relative">
              Always Open
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 8C50 2 100 10 150 6C200 2 250 10 298 4"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-white/85 md:text-lg">
            Built for Nigerian university students. Keep learning even when strikes, power outages,
            or poor internet get in the way. AI summaries, offline sync, and opportunity matching—all
            in one low-data platform.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition-transform hover:scale-[1.02]"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <Play className="h-4 w-4" /> View Demo
            </Link>
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="glass rounded-2xl border border-white/20 p-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/20 pb-3">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-2 text-xs text-white/60">dashboard.unibridge.ng</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-xl bg-white/10 p-3 text-center">
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="mt-0.5 text-[10px] text-white/70">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["CSC 201 Lecture", "ECO 101 Resources", "STEM Scholarship"].map((item, i) => (
                <div
                  key={item}
                  className={cn(
                    "rounded-xl p-3",
                    i === 0 && "bg-emerald-500/30",
                    i === 1 && "bg-blue-500/30",
                    i === 2 && "bg-orange-500/30",
                  )}
                >
                  <p className="text-xs font-medium text-white">{item}</p>
                  <p className="mt-1 text-[10px] text-white/60">
                    {i === 0 ? "Live Now" : i === 1 ? "234 downloads" : "₦120,000"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats bar ────────────────────────────────────────────── */}
      <section className="border-b bg-muted/40 px-4 py-10 md:px-8">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────── */}
      <section id="features" className="px-4 py-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Everything in one place
            </span>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Built for the Nigerian campus experience
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Every feature is designed around real challenges: ASUU strikes, unstable power, limited
              data, and high dropout rates.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={cn("inline-flex rounded-xl p-3", color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-muted/30 px-4 py-24 md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Simple setup
            </span>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Up and running in 3 minutes
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  {step}
                </div>
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                {step !== "03" && (
                  <div className="absolute top-7 left-[calc(50%+2rem)] hidden w-[calc(100%-4rem)] border-t-2 border-dashed border-primary/30 md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" className="px-4 py-24 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Pricing
            </span>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Accessible for every student</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Basic is free forever. Upgrade for unlimited AI features and priority support.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {PRICING.map(({ name, price, sub, highlight, features, cta, href }) => (
              <div
                key={name}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6",
                  highlight
                    ? "border-primary bg-primary text-white shadow-xl shadow-primary/20"
                    : "bg-white shadow-sm",
                )}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <div>
                  <p className={cn("text-sm font-medium", highlight ? "text-white/80" : "text-muted-foreground")}>
                    {name}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{price}</span>
                    <span className={cn("text-sm", highlight ? "text-white/70" : "text-muted-foreground")}>{sub}</span>
                  </div>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        className={cn("mt-0.5 h-4 w-4 shrink-0", highlight ? "text-white/70" : "text-primary")}
                      />
                      <span className={highlight ? "text-white/90" : ""}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={href}
                  className={cn(
                    "mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90",
                    highlight
                      ? "bg-white text-primary"
                      : "bg-primary text-white",
                  )}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─────────────────────────────────────────── */}
      <section className="bg-muted/30 px-4 py-24 md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Student stories
            </span>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Trusted by Nigerian students</h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(({ name, role, avatar, text }) => (
              <div key={name} className="rounded-2xl border bg-white p-6 shadow-sm">
                <p className="text-sm leading-relaxed text-muted-foreground">"{text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────── */}
      <section className="bg-hero-gradient px-4 py-24 text-white md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Globe2 className="mx-auto h-12 w-12 text-white/60" />
          <h2 className="mt-6 text-3xl font-bold md:text-4xl">
            Your campus is always open on UniBridge
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Join thousands of Nigerian students keeping their education alive—no matter what happens.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition-transform hover:scale-[1.02]"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Shield className="h-4 w-4" /> No credit card required
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t bg-white px-4 py-12 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient">
                  <Zap className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold">UniBridge</span>
              </Link>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Virtual campus platform built for Nigerian university students.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-sm md:grid-cols-3">
              <div>
                <p className="font-semibold">Platform</p>
                <ul className="mt-3 space-y-2 text-muted-foreground">
                  <li><a href="#features" className="hover:text-foreground">Features</a></li>
                  <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
                  <li><Link href="/auth/register" className="hover:text-foreground">Sign Up</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">Students</p>
                <ul className="mt-3 space-y-2 text-muted-foreground">
                  <li><span>Lectures</span></li>
                  <li><span>Resources</span></li>
                  <li><span>Scholarships</span></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">Support</p>
                <ul className="mt-3 space-y-2 text-muted-foreground">
                  <li><a href="https://github.com" className="hover:text-foreground">GitHub</a></li>
                  <li><span>hello@unibridge.ng</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground md:flex-row">
            <p>© 2026 UniBridge. Built for Nigerian students.</p>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" /> Targeting SDGs 4 & 10 — Quality Education & Reduced Inequalities
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
