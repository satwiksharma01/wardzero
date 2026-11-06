import type { NextRequest } from "next/server";
import { isCareError } from "@/domain/care";
import { getStore } from "@/server/database";
import { localRequestAllowed, readBoundedJson } from "@/server/http";
import { configuredNoteProvider } from "@/server/note-provider";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!localRequestAllowed(request, true))
    return Response.json(
      { error: "Local same-origin requests only." },
      { status: 403 },
    );
  let input;
  try {
    input = await readBoundedJson(request);
  } catch {
    return Response.json(
      { error: "Invalid or oversized note." },
      { status: 400 },
    );
  }
  try {
    let provider;
    try {
      provider = configuredNoteProvider();
    } catch {
      provider = null;
    }
    const note = await (
      await getStore()
    ).notes.submit(
      request.cookies.get("wardzero-demo-session")?.value ?? null,
      input,
      new Date(),
      provider,
    );
    return Response.json({ note });
  } catch (error) {
    if (isCareError(error))
      return Response.json({ error: error.message }, { status: error.status });
    console.error("caregiver_note_failed");
    return Response.json(
      { error: "The note could not be saved. Retry the same note." },
      { status: 503 },
    );
  }
}
