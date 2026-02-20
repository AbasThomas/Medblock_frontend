import Link from "next/link";
import { ArrowRight01Icon, Home01Icon } from "hugeicons-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#0A8F6A]/15 blur-3xl" />
        <div className="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-xl rounded-3xl border border-white/10 bg-black/50 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">Error 404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Page Not Found</h1>
        <p className="mt-3 text-sm text-neutral-400">
          The page you requested does not exist or may have been moved.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10"
          >
            <Home01Icon size={16} />
            Go Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8F6A] px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all hover:opacity-90"
          >
            Open Dashboard
            <ArrowRight01Icon size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
