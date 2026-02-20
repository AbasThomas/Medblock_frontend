"use client";

import type { ReactNode } from "react";
import { WatchupProvider } from "watchup-react";

type WatchupClientProps = {
  children: ReactNode;
};

export function WatchupClient({ children }: WatchupClientProps) {
  const projectId = process.env.NEXT_PUBLIC_WATCHUP_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_WATCHUP_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_WATCHUP_BASE_URL ?? "https://watchup.space";

  // Avoid runtime errors and hydration issues when keys are not configured yet.
  if (!projectId || !apiKey) {
    return <>{children}</>;
  }

  return (
    <WatchupProvider projectId={projectId} apiKey={apiKey} baseUrl={baseUrl}>
      {children}
    </WatchupProvider>
  );
}

