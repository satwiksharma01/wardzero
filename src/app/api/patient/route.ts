import { getStore } from "@/server/database";
import { localRequestAllowed } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!localRequestAllowed(request))
    return Response.json({ error: "Local preview only." }, { status: 403 });
  try {
    return Response.json(await (await getStore()).snapshot(new Date()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("patient_snapshot_failed");
    return Response.json(
      { error: "Patient readings are temporarily unavailable." },
      { status: 503 },
    );
  }
}
