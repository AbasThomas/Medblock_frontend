"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft01Icon, ViewIcon, ViewOffIcon, ZapIcon, UserGroupIcon } from "hugeicons-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google login failed.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-black selection:bg-emerald-500/30">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Left panel */}
      <div className="hidden flex-col justify-between p-12 text-white lg:flex lg:w-1/2 relative z-10 border-r border-white/5 bg-black/40 backdrop-blur-sm">
        <div>
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

        <div className="max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Student Intel
          </div>
          <blockquote className="text-2xl font-light leading-relaxed text-neutral-200 italic">
            &ldquo;The AI systems identified three scholarship opportunities I would have missed entirely. This isn&apos;t just a portal; it&apos;s a success protocol.&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10" />
            <div>
              <p className="text-sm font-semibold text-white">Tunde Adesanya</p>
              <p className="text-xs text-neutral-500">Computer Science • Unilag</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { v: "24/7", l: "System Resilience", i: UserGroupIcon },
            { v: "10x", l: "Recall Velocity", i: ZapIcon },
          ].map(({ v, l, i: Icon }) => (
            <div key={l} className="glass-panel p-4 rounded-xl border-white/5 hover:border-emerald-500/20 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <Icon className="w-4 h-4 text-emerald-500" />
                <p className="text-xl font-bold tracking-tight text-white">{v}</p>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 group-hover:text-neutral-400 transition-colors">{l}</p>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 md:px-8 relative z-10">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
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

            <div className="text-center lg:text-left mb-10 mt-8 lg:mt-0">
              <h1 className="text-3xl font-medium text-white tracking-tight">Welcome Back</h1>
              <p className="mt-2 text-sm text-neutral-400 font-light">
                Log in to your UniBridge account to continue.
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 hover:border-white/15 disabled:opacity-60 shadow-xl"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
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
              Continue with Intel Core
            </button>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Or continue with email</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="pl-1 text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="identity@unibridge.sys"
                  className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none ring-emerald-500/20 transition-all focus:ring-4 focus:border-emerald-500/30"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Password</label>
                  <Link href="/auth/forgot-password" title="Recover Access" className="text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-wider font-bold">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-neutral-600 outline-none ring-emerald-500/20 transition-all focus:ring-4 focus:border-emerald-500/30"
                    required
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
                type="submit"
                disabled={loading}
                className={cn(
                  "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-60",
                  "shadow-[0_0_20px_rgba(10,143,106,0.3)] hover:shadow-[0_0_25px_rgba(10,143,106,0.5)]"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ZapIcon size={16} />}
                {loading ? "AUTHENTICATING..." : "LOG IN NOW"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-neutral-500 font-light">
              Don't have an account?{" "}
              <Link href="/auth/register" className="font-bold text-emerald-500 hover:text-emerald-400 transition-colors hover:underline underline-offset-4">
                Sign up today
              </Link>
            </p>
          </div>

          <div className="mt-auto pt-8 flex items-center gap-2 text-[10px] text-neutral-600 uppercase tracking-[0.2em] font-medium">
            <div className="w-1 h-1 rounded-full bg-neutral-800" />
            UniBridge Systems v1.0.4
            <div className="w-1 h-1 rounded-full bg-neutral-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
