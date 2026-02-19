import { UniBridgeDashboard } from "@/components/unibridge-dashboard";

export default function AiToolsPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-10">
        <h1 className="text-3xl font-medium tracking-tighter text-white">AI Operations</h1>
        <p className="mt-2 text-sm text-neutral-400 font-light">
          Access UniBridge AI services for summarization, moderation, translation, and opportunity ranking.
        </p>
      </div>
      <UniBridgeDashboard />
    </div>
  );
}
