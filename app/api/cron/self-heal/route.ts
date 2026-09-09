import { NextRequest, NextResponse } from "next/server";
import { processAssessment } from "@/lib/process-assessment";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => ({}));

  // Final goals/budget fields come in on submit, same allow-list discipline as PATCH.
  const finalFields: Record<string, unknown> = {};
  for (const key of ["goal", "budget_range", "availability", "class_format"]) {
    if (body[key] !== undefined) finalFields[key] = body[key];
  }

  try {
    const result = await processAssessment(params.token, finalFields);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Processing failed" }, { status: 500 });
  }
}
