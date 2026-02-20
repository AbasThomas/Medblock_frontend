import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import { AppToaster } from "@/components/app-toaster";
import { UnicornBackground } from "@/components/ui/UnicornBackground";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { WatchupClient } from "@/components/watchup-client";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "UniBridge | Virtual Campus for Nigerian Universities",
  description:
    "The all-in-one platform bridging the gap between students, resources, and opportunities in the Nigerian university ecosystem.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth bg-black">
      <body
        className={`${inter.variable} ${montserrat.variable} font-sans antialiased text-neutral-300 relative isolate selection:bg-emerald-600 selection:text-white overflow-x-hidden`}
      >
        <WatchupClient>
          <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <UnicornBackground />
            <AmbientBackground />
          </div>
          <div className="relative z-10">{children}</div>
          <AppToaster />
        </WatchupClient>
      </body>
    </html>
  );
}
