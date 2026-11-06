import { z } from "zod";
import { getStore } from "@/server/database";
import { localRequestAllowed, readBoundedJson } from "@/server/http";

export const runtime = "nodejs";
const batchSchema = z
  .object({ readings: z.array(z.unknown()).min(1).max(100) })
  .strict();

export async function POST(request: Request) {
  if (!localRequestAllowed(request, true))
    return Response.json(
      { error: "Local same-origin JSON requests only." },
      { status: 403 },
    );
  let body;
  try {
    body = batchSchema.parse(await readBoundedJson(request));
  } catch {
    return Response.json(
      { error: "Send 1–100 readings in a JSON body under 128 KB." },
      { status: 400 },
    );
  }
  try {
    const results = await (await getStore()).ingest(body.readings, new Date());
    return Response.json({ results });
  } catch {
    console.error("reading_ingestion_failed");
    return Response.json(
      { error: "Readings could not be stored. Please retry." },
      { status: 503 },
    );
  }
}
