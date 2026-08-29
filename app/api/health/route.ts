import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      CRON_SECRET: !!process.env.CRON_SECRET
    }
  });
}
