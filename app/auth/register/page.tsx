"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft01Icon, ViewIcon, ViewOffIcon, ZapIcon } from "hugeicons-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const UNIVERSITIES = [
  "University of Lagos (UNILAG)",
  "Obafemi Awolowo University (OAU)",
  "University of Ibadan (UI)",
  "Ahmadu Bello University (ABU)",
  "University of Nigeria Nsukka (UNN)",
  "University of Benin (UNIBEN)",
  "Lagos State University (LASU)",
  "University of Port Harcourt (UNIPORT)",
  "Bayero University Kano (BUK)",
  "Federal University of Technology Akure (FUTA)",
  "Other",
];

const DEPARTMENTS = [
  "Computer Science",
  "Engineering",
  "Medicine",
  "Law",
  "Economics",
  "Social Sciences",
  "Arts & Humanities",
  "Natural Sciences",
  "Education",
  "Business Administration",
  "Agriculture",
  "Architecture",
  "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student" as "student" | "lecturer" | "admin",
    university: "University of Lagos (UNILAG)",
    department: "Computer Science",
    matricNumber: "",
  });

  const supabase = createClient();

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

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
      toast.success("Account created! Check your email to verify, or log in now.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-black selection:bg-emerald-500/30">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-emerald-900/10 rounded-full blur-[100px] -translate-x-1/2 pointer-events-none" />

      {/* Left panel */}
      <div className="hidden flex-col justify-between p-12 text-white lg:flex lg:w-1/2 relative z-10 border-r border-white/5 bg-black/40 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-1.5 group">
          <Image
            src="/logo.png"
            alt="UniBridge logo"
            width={44}
            height={44}
            className="h-11 w-11 object-contain transition-transform group-hover:scale-110"
            priority
          />
          <span className="font-bold text-2xl tracking-tight uppercase leading-none">UniBridge</span>
        </Link>
        <Link href="/" className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors w-fit group/back">
          <ArrowLeft01Icon size={16} className="group-hover/back:-translate-x-1 transition-transform" />
          Return to Homepage
        </Link>
      </div>

      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Infrastructure for Excellence
        </div>
        <p className="text-4xl font-medium tracking-tight leading-tight text-white mb-6">
          Future-Proof Your <br />
          <span className="text-emerald-500 italic">Academic Trajectory.</span>
        </p>
        <p className="text-neutral-400 font-light leading-relaxed max-w-sm">
          Deploy intelligence systems that organize, summarize, and prioritize your learning resources 24/7.
        </p>
      </div>

      <div className="space-y-4">
        {[
          "Verified Academic Asset Marketplace",
          "Autonomous Lecture Deconstruction",
          "Precision Opportunity Sourcing",
          "Global Research Pipeline Access",
        ].map((feat) => (
          <div key={feat} className="flex items-center gap-4 text-sm text-neutral-300 font-light group">
            <div className="h-px w-6 bg-emerald-900 group-hover:w-10 group-hover:bg-emerald-500 transition-all duration-500" />
            {feat}
          </div>
        ))}
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 md:px-8 relative z-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-12 flex items-center gap-1.5 lg:hidden justify-center">
            <Image
              src="/logo.png"
              alt="UniBridge logo"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              priority
            />
            <span className="font-bold text-2xl tracking-tight text-white uppercase leading-none">UniBridge</span>
          </Link>

          <div className="mb-10 mt-8 lg:mt-0">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", step >= 1 ? "bg-emerald-500" : "bg-white/5")} />
              <div className={cn("h-1 flex-1 rounded-full transition-all duration-500", step >= 2 ? "bg-emerald-500" : "bg-white/5")} />
            </div>
            <h1 className="text-3xl font-medium text-white tracking-tight">
              {step === 1 ? "Create Account" : "Academic Details"}
            </h1>
            <p className="mt-2 text-sm text-neutral-400 font-light">
              {step === 1 ? "Join UniBridge to access intelligent academic tools." : "Tell us about your academic role to personalize your experience."}
            </p>
          </div>

          {step === 1 && (
            <div className="animate-soft-fade">
              <button
                onClick={handleGoogleRegister}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 hover:border-white/15 disabled:opacity-60 shadow-xl"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sync with Intel Core
              </button>

              <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Or register with email</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="pl-1 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Enter full name"
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none ring-emerald-500/20 transition-all focus:ring-4 focus:border-emerald-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="pl-1 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="identity@unibridge.sys"
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none ring-emerald-500/20 transition-all focus:ring-4 focus:border-emerald-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="pl-1 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Password</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-neutral-600 outline-none ring-emerald-500/20 transition-all focus:ring-4 focus:border-emerald-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-emerald-500 transition-colors p-1 flex items-center justify-center h-full"
                    >
                      {showPassword ? <ViewOffIcon size={16} /> : <ViewIcon size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!form.name || !form.email || !form.password) {
                      toast.error("Please fill in all fields.");
                      return;
                    }
                    setStep(2);
                  }}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(10,143,106,0.3)] hover:bg-emerald-500 transition-all hover:shadow-[0_0_25px_rgba(10,143,106,0.5)] active:scale-[0.98]"
                >
                  CONTINUE TO STEP 2
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleRegister} className="mt-2 space-y-6 animate-soft-fade">
              <div className="space-y-2">
                <label className="pl-1 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">I am a...</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["student", "lecturer", "admin"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => update("role", role)}
                      className={cn(
                        "rounded-xl border py-3 text-xs font-bold capitalize transition-all",
                        form.role === role
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(10,143,106,0.1)]"
                          : "border-white/5 bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-neutral-300",
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="pl-1 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Primary Institution</label>
                <select
                  value={form.university}
                  onChange={(e) => update("university", e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-emerald-500/20 transition-all focus:ring-4 focus:border-emerald-500/30 appearance-none"
                >
                  {UNIVERSITIES.map((u) => (
                    <option key={u} value={u} className="bg-neutral-900">{u}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="pl-1 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Faculty / Department</label>
                <select
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-emerald-500/20 transition-all focus:ring-4 focus:border-emerald-500/30 appearance-none"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} className="bg-neutral-900">{d}</option>
                  ))}
                </select>
              </div>

              {form.role === "student" && (
                <div className="space-y-1.5">
                  <label className="pl-1 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
                    Matriculation Index <span className="text-neutral-700 font-medium">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.matricNumber}
                    onChange={(e) => update("matricNumber", e.target.value)}
                    placeholder="190404001"
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none ring-emerald-500/20 transition-all focus:ring-4 focus:border-emerald-500/30"
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl border border-white/10 py-3.5 text-sm font-bold text-neutral-400 hover:bg-white/5 transition-all uppercase tracking-widest"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(10,143,106,0.3)] hover:bg-emerald-500 transition-all disabled:opacity-60 uppercase tracking-widest active:scale-[0.98]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <ZapIcon size={16} />}
                  {loading ? "CREATING..." : "CREATE ACCOUNT"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-neutral-500 font-light">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-bold text-emerald-500 hover:text-emerald-400 transition-colors hover:underline underline-offset-4">
              Log in here
            </Link>
          </p>

          <p className="mt-6 text-center text-[10px] text-neutral-600 font-medium uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
            By creating an account, you agree to our{" "}
            <span className="text-neutral-400 underline cursor-pointer hover:text-white transition-colors">Terms of Service</span> and{" "}
            <span className="text-neutral-400 underline cursor-pointer hover:text-white transition-colors">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
