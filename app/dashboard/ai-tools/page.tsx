import { UniBridgeDashboard } from "@/components/unibridge-dashboard";

export default function AiToolsPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold">AI Tools Demo</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Test all AI features — summarization, moderation, translation, matching & wellness.
        </p>
      </div>
      <UniBridgeDashboard />
    </div>
  );
}
