import { UniBridgeDashboard } from "@/components/unibridge-dashboard";

export default function AiToolsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/50 p-8 shadow-2xl">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#0A8F6A]/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0A8F6A]">AI Command Center</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tighter text-white md:text-4xl">AI Operations</h1>
          <p className="mt-3 max-w-3xl text-sm text-neutral-300">
            Run moderation, summarization, translation, wellness check-ins, and opportunity intelligence from one streamlined workspace.
          </p>
        </div>
      </div>

      <UniBridgeDashboard />
    </div>
  );
}
