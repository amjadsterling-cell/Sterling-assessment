import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const form = await req.formData();
  const kind = form.get("kind"); // "passage" | "speaking"
  const file = form.get("audio") as File | null;

  if (!file || (kind !== "passage" && kind !== "speaking")) {
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

  const column = kind === "passage" ? "passage_audio_url" : "speaking_audio_url";
  await db
    .from("assessments")
    .update({ [column]: path, status: "recording" })
    .eq("token", params.token);

  return NextResponse.json({ ok: true, path });
}
