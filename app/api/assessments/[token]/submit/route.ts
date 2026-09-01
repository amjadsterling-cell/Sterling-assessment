import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const KIND_TO_COLUMN: Record<string, string> = {
  passage: "passage_audio_url",
  speaking: "speaking_audio_url", // kept for backward compatibility with in-flight assessments
  speaking1: "speaking_audio_url",
  speaking2: "speaking_audio_url_2"
};

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const form = await req.formData();
  const kind = form.get("kind") as string | null; // "passage" | "speaking1" | "speaking2"
  const file = form.get("audio") as File | null;

  if (!file || !kind || !KIND_TO_COLUMN[kind]) {
    return NextResponse.json({ error: "Missing audio file or invalid kind" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: assessment } = await db
    .from("assessments")
    .select("id")
    .eq("token", params.token)
    .maybeSingle();

  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const path = `${params.token}/${kind}.webm`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await db.storage.from("recordings").upload(path, buffer, {
    contentType: "audio/webm",
    upsert: true
  });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const column = KIND_TO_COLUMN[kind];
  await db
    .from("assessments")
    .update({ [column]: path, status: "recording" })
    .eq("token", params.token);

  return NextResponse.json({ ok: true, path });
}
