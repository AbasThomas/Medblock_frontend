"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

export function UnicornBackground() {
  const pathname = usePathname();

  const initializeUnicorn = () => {
    if (!window.UnicornStudio) return;
    window.UnicornStudio.init();
  };

  useEffect(() => {
    // Re-initialize after route transitions so the canvas remains mounted on every page.
    const raf = requestAnimationFrame(() => {
      initializeUnicorn();
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return (
    <div className="absolute inset-0">
      <div
        className="aura-background-component absolute inset-0 saturate-0 opacity-80"
        data-alpha-mask="80"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)",
        }}
      >
        <div
          data-us-project="BqS5vTHVEpn6NiF0g8iJ"
          className="absolute inset-0"
        ></div>
      </div>
      <Script
        src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js"
        onLoad={() => {
          initializeUnicorn();
        }}
        strategy="afterInteractive"
      />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
    </div>
  );
}

declare global {
  interface Window {
    UnicornStudio?: {
      init: () => void;
      isInitialized?: boolean;
    };
  }
}
