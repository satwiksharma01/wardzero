import type { NextRequest } from "next/server";
import { CareError } from "@/domain/care";
import { getStore } from "@/server/database";
import { localRequestAllowed, readBoundedJson } from "@/server/http";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!localRequestAllowed(request, true))
    return Response.json(
      { error: "Local same-origin requests only." },
      { status: 403 },
    );
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id))
    return Response.json({ error: "Invalid alert ID." }, { status: 400 });
  let body;
  try {
    body = await readBoundedJson(request);
  } catch {
    return Response.json(
      { error: "Invalid or oversized action request." },
      { status: 400 },
    );
  }
  try {
    const result = await (
      await getStore()
    ).care.recordEvent(
      id,
      request.cookies.get("wardzero-demo-session")?.value ?? null,
      body,
      new Date(),
    );
    return Response.json(result);
  } catch (error) {
    if (error instanceof CareError)
      return Response.json({ error: error.message }, { status: error.status });
    console.error("care_event_failed");
    return Response.json(
      { error: "The response could not be stored. Retry this action." },
      { status: 503 },
    );
  }
}
