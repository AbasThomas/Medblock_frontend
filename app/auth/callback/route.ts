import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/url";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  const siteUrl = getSiteUrl(origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) {
        return NextResponse.redirect(`${siteUrl}${next}`);
      }

      let destination = "/dashboard";
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          const role = profile?.role || user.user_metadata?.role;
          if (role === "lecturer") {
            destination = "/dashboard/lecturer";
          }
        } catch {
          if (user.user_metadata?.role === "lecturer") {
            destination = "/dashboard/lecturer";
          }
        }
      }

      return NextResponse.redirect(`${siteUrl}${destination}`);
    }
  }

  // Return to login on error
  return NextResponse.redirect(`${siteUrl}/auth/login?error=auth_callback_error`);
}
