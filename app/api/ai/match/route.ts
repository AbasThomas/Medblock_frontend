import { rankOpportunities } from "@/lib/ai/client";
import type { StudentProfile } from "@/lib/ai/fallbacks";
import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";
import { NextResponse } from "next/server";

interface MatchPayload {
  profile?: Partial<StudentProfile>;
  opportunities?: Opportunity[];
}

const EMPTY_PROFILE: StudentProfile = {
  skills: [],
  interests: [],
};

async function getLiveOpportunities(): Promise<Opportunity[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .gte("deadline", today)
    .order("deadline", { ascending: true })
    .limit(200);

  if (error || !data) return [];

  return data.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    organization: item.organization,
    description: item.description ?? "",
    amount: item.amount ?? undefined,
    currency: item.currency ?? "NGN",
    deadline: item.deadline,
    requirements: item.requirements ?? [],
    skills: item.skills ?? [],
    location: item.location ?? "Nigeria",
    isRemote: item.is_remote ?? false,
    applicationUrl: item.application_url ?? "",
    tags: item.tags ?? [],
    createdAt: item.created_at,
  }));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MatchPayload;
    const profile: StudentProfile = {
      ...EMPTY_PROFILE,
      ...body.profile,
      skills: body.profile?.skills ?? [],
      interests: body.profile?.interests ?? [],
    };

    const opportunities = body.opportunities?.length
      ? body.opportunities
      : await getLiveOpportunities();

    if (!opportunities.length) {
      return NextResponse.json(
        { error: "No active opportunities are available for matching." },
        { status: 400 },
      );
    }

    const ranked = await rankOpportunities(profile, opportunities);

    return NextResponse.json({
      profile,
      total: ranked.length,
      matches: ranked.slice(0, 5),
    });
  } catch {
    return NextResponse.json({ error: "Unable to rank opportunities right now." }, { status: 500 });
  }
}
