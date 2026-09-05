import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Fields a lead is allowed to write via autosave. Never let this route touch
// scores, status transitions beyond "started", or anything computed.
const ALLOWED_FIELDS = new Set([
  "age_range",
  "occupation",
  "mother_tongue",
  "years_english_use",
  "self_rated_fluency",
  "biggest_struggle",
  "quiz_answers",
  "quiz_score",
  "goal",
  "budget_range",
  "availability",
  "class_format",
  "current_step"
]);

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const db = supabaseAdmin();
  const { data: assessment, error } = await db
    .from("assessments")
    .select("*, content_versions(content)")
    .eq("token", params.token)
    .maybeSingle();

  if (error || !assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  if (assessment.status === "sent") {
    await db.from("assessments").update({ status: "started" }).eq("token", params.token);
  }

  const content = assessment.content_versions?.content;
  const passage = (content?.passages ?? []).find((p: any) => p.id === assessment.passage_id) ?? content?.passages?.[0];
  const prompts = content?.speakingPrompts ?? [];
  const idx1 = prompts.length ? Math.floor(Math.random() * prompts.length) : -1;
  let idx2 = idx1;
  if (prompts.length > 1) {
    while (idx2 === idx1) idx2 = Math.floor(Math.random() * prompts.length);
  }
  const speakingPrompt = idx1 >= 0 ? prompts[idx1] : null;
  const speakingPrompt2 = idx2 >= 0 ? prompts[idx2] : null;

  return NextResponse.json({
    status: assessment.status,
    current_step: assessment.current_step,
    saved: {
      age_range: assessment.age_range,
      occupation: assessment.occupation,
      mother_tongue: assessment.mother_tongue,
      years_english_use: assessment.years_english_use,
      self_rated_fluency: assessment.self_rated_fluency,
      biggest_struggle: assessment.biggest_struggle,
      quiz_answers: assessment.quiz_answers,
      goal: assessment.goal,
      budget_range: assessment.budget_range,
      availability: assessment.availability,
      class_format: assessment.class_format
    },
    content: {
      profileQuestions: content?.profileQuestions ?? [],
      quiz: content?.quiz ?? [],
      passage,
      speakingPrompt,
      speakingPrompt2,
      goalsQuestions: content?.goalsQuestions ?? []
    }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json();
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) update[key] = value;
  }

  // Status is handled separately: a lead's own progress ping may only move
  // it to "started" or "recording", never to anything scored/complete.
  const SAFE_STATUSES = new Set(["started", "recording"]);
  if (typeof body.status === "string" && SAFE_STATUSES.has(body.status)) {
    update.status = body.status;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("assessments").update(update).eq("token", params.token);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
