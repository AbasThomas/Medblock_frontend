import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { AppToaster } from "@/components/app-toaster";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniBridge | Virtual Campus for Nigerian Universities",
  description:
    "UniBridge is an AI-powered virtual campus platform with lecture summaries, resource moderation, opportunity matching, and student wellness tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}
      >
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
