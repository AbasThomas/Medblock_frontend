import type { Plan } from "./types";

export interface PlanCatalogEntry {
  name: string;
  priceLabel: string;
  summary: string;
  highlights: string[];
}

export const PLAN_CATALOG: Record<Plan, PlanCatalogEntry> = {
  basic: {
    name: "Basic",
    priceLabel: "NGN 0 / month",
    summary: "Essential access for students getting started on UniBridge.",
    highlights: [
      "Academic timetable and announcements",
      "Resource downloads with daily limits",
      "Basic AI summarization quota",
      "Offline access up to 1 GB",
    ],
  },
  premium: {
    name: "Premium",
    priceLabel: "NGN 500 - NGN 1,000 / month",
    summary: "Advanced tools for high-intent students and lecturers.",
    highlights: [
      "Expanded AI usage and intelligent matching",
      "Priority discovery for opportunities",
      "Ad-free workspace and enhanced support",
      "Offline access up to 5 GB",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceLabel: "NGN 100,000 - NGN 500,000 / year",
    summary: "Institution-grade deployment for universities and partners.",
    highlights: [
      "Bulk user administration and governance controls",
      "Custom integrations and white-label options",
      "Dedicated analytics and performance reporting",
      "Custom SLA and operational support",
    ],
  },
};
