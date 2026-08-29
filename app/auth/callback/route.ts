import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Handles the redirect from magic-link emails and email confirmations.
// Supabase sends the visitor here with ?code=... ; we exchange that code
// for a real session (which sets the auth cookies), then send them on to
// wherever they were headed (default: /dashboard).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or the exchange failed — send them back to login with a note.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
