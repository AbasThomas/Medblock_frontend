"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft01Icon,
  ViewIcon,
  ViewOffIcon,
  StudentIcon,
  TeacherIcon,
  BookOpen01Icon,
  Brain02Icon,
  Award01Icon,
  UniversityIcon,
  Search01Icon,
} from "hugeicons-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import universityDirectory from "@/lib/data/nigerian-universities.json";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isManualSchoolEntry, setIsManualSchoolEntry] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student" as "student" | "lecturer",
    university: "",
    department: "",
    matricNumber: "",
  });

  const supabase = createClient();

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const roleOptions = [
    {
      id: "student" as const,
      label: "Student",
      description: "Access classes, resources, and opportunities.",
      icon: StudentIcon,
    },
    {
      id: "lecturer" as const,
      label: "Lecturer",
      description: "Publish lectures and manage live sessions.",
      icon: TeacherIcon,
    },
  ];

  const schoolNames = universityDirectory.data.map((item) => item.name).sort((a, b) => a.localeCompare(b));

  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-up failed.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (!form.university.trim()) {
      toast.error("Please select or enter your institution.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            role: form.role,
            university: form.university,
            department: form.department,
            matric_number: form.matricNumber,
          },
        },
      });
      if (error) throw error;
      toast.success("Account created. Check your email to verify.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToStep2 = () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setStep(2);
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-black/60 selection:bg-emerald-500/30">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-600/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] -translate-x-1/3 translate-y-1/3 rounded-full bg-emerald-900/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      <div className="relative z-10 hidden flex-col justify-between border-r border-white/5 p-12 lg:flex lg:w-[45%]">
        <div className="space-y-1">
          <Link href="/" className="group flex w-fit items-center gap-2">
            <Image
              src="/logo.png"
              alt="UniBridge"
              width={40}
              height={40}
              className="h-10 w-10 object-contain transition-transform group-hover:scale-105"
              priority
            />
            <span className="text-xl font-bold uppercase tracking-tight text-white">UniBridge</span>
          </Link>
          <Link
            href="/"
            className="group/back ml-0.5 flex w-fit items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-500/70 transition-colors hover:text-emerald-400"
          >
            <ArrowLeft01Icon size={13} className="transition-transform group-hover/back:-translate-x-0.5" />
            Back to home
          </Link>
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-emerald-400">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Academic intelligence platform</span>
            </div>
            <h2 className="mb-3 text-3xl font-semibold leading-tight tracking-tight text-white">
              Accelerate your
              <br />
              <span className="text-emerald-400">academic journey</span>
            </h2>
            <p className="max-w-xs text-sm font-light leading-relaxed text-neutral-400">
              Join thousands of students and educators on the platform built to organize, connect, and elevate academic life.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: BookOpen01Icon, text: "Verified resource marketplace" },
              { icon: Brain02Icon, text: "AI-powered lecture analysis" },
              { icon: Award01Icon, text: "Curated opportunity discovery" },
              { icon: UniversityIcon, text: "Institution-wide collaboration network" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="group flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] transition-all group-hover:border-emerald-500/20">
                  <Icon size={18} className="text-emerald-400" />
                </div>
                <span className="text-sm text-neutral-400 transition-colors group-hover:text-neutral-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-widest text-neutral-600">
          (c) {new Date().getFullYear()} UniBridge. All rights reserved.
        </p>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 md:px-10">
        <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
          <Image src="/logo.png" alt="UniBridge" width={36} height={36} className="h-9 w-9 object-contain" priority />
          <span className="text-lg font-bold uppercase tracking-tight text-white">UniBridge</span>
        </Link>

        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-2">
              <div className={cn("h-1 flex-1 rounded-full transition-all duration-300", step >= 1 ? "bg-emerald-500" : "bg-white/5")} />
              <div className={cn("h-1 flex-1 rounded-full transition-all duration-300", step >= 2 ? "bg-emerald-500" : "bg-white/5")} />
              <span className="ml-1 tabular-nums text-[11px] text-neutral-600">{step} / 2</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {step === 1 ? "Create your account" : "Academic details"}
            </h1>
            <p className="mt-1.5 text-sm text-neutral-400">
              {step === 1 ? "Set up your UniBridge account to get started" : "Help us personalize your experience"}
            </p>
          </div>

          {step === 1 && (
            <div>
              <button
                onClick={handleGoogleRegister}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:border-white/10 hover:bg-white/10 disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[11px] uppercase tracking-wider text-neutral-600">or</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Full name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Email address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@university.edu"
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 pr-11 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-600 transition-colors hover:text-neutral-400"
                    >
                      {showPassword ? <ViewOffIcon size={15} /> : <ViewIcon size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={goToStep2}
                  disabled={loading}
                  className="mt-1 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-500 hover:shadow-[0_0_28px_rgba(16,185,129,0.35)] active:scale-[0.99] disabled:opacity-60"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">I am a</label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {roleOptions.map(({ id, label, description, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => update("role", id)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        form.role === id
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-white/5 bg-white/[0.02] text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
                      )}
                    >
                      <Icon
                        size={24}
                        className={cn("mb-2", form.role === id ? "text-emerald-400" : "text-neutral-500")}
                      />
                      <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">{description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400">University / Institution</label>
                <input
                  type="text"
                  value={form.university}
                  onChange={(e) => update("university", e.target.value)}
                  required
                  list={isManualSchoolEntry ? undefined : "university-directory"}
                  placeholder={isManualSchoolEntry ? "Enter your institution name" : "Search and select your university"}
                  className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/25"
                />
                {!isManualSchoolEntry && (
                  <datalist id="university-directory">
                    {schoolNames.map((school) => (
                      <option key={school} value={school} />
                    ))}
                  </datalist>
                )}
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                  <span className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <Search01Icon size={14} className="text-emerald-400" />
                    {isManualSchoolEntry ? "Manual institution entry enabled" : "Search from the university directory"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsManualSchoolEntry((prev) => !prev)}
                    className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400 transition-colors hover:text-emerald-300"
                  >
                    {isManualSchoolEntry ? "Use Directory" : "School Not Listed?"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-400">Faculty / Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  required
                  placeholder="e.g. Computer Science"
                  className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/25"
                />
              </div>

              {form.role === "student" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">
                    Matric number <span className="font-normal text-neutral-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.matricNumber}
                    onChange={(e) => update("matricNumber", e.target.value)}
                    placeholder="e.g. 190401001"
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-neutral-600 focus:border-emerald-500/30 focus:ring-2 focus:ring-emerald-500/25"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-white/5 py-3 text-sm font-semibold text-neutral-400 transition-all hover:bg-white/5 hover:text-neutral-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-500 hover:shadow-[0_0_28px_rgba(16,185,129,0.35)] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-neutral-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-emerald-500 transition-colors hover:text-emerald-400">
              Sign in
            </Link>
          </p>

          {step === 1 && (
            <p className="mt-4 text-center text-[11px] leading-relaxed text-neutral-600">
              By creating an account, you agree to our{" "}
              <span className="cursor-pointer text-neutral-400 underline underline-offset-2 transition-colors hover:text-white">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="cursor-pointer text-neutral-400 underline underline-offset-2 transition-colors hover:text-white">
                Privacy Policy
              </span>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
