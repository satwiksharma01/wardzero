import { z } from "zod";
import type { NextRequest } from "next/server";
import { isCareError } from "@/domain/care";
import {
  demoResetSchema,
  demoAdvanceSchema,
  demoSeedSchema,
} from "@/domain/demo";
import { getStore } from "@/server/database";
import { localRequestAllowed, readBoundedJson } from "@/server/http";
const schema = z.discriminatedUnion("action", [
  demoResetSchema.extend({ action: z.literal("reset") }),
  demoAdvanceSchema.extend({ action: z.literal("advance") }),
  demoSeedSchema.extend({ action: z.literal("seed") }),
]);
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (!localRequestAllowed(request))
    return Response.json({ error: "Local preview only." }, { status: 403 });
  try {
    return Response.json(
      { runs: await (await getStore()).demo.list() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Demo history unavailable." },
      { status: 503 },
    );
  }
}
export async function POST(request: NextRequest) {
  if (!localRequestAllowed(request, true))
    return Response.json(
      { error: "Local same-origin requests only." },
      { status: 403 },
    );
  let input;
  try {
    input = schema.parse(await readBoundedJson(request));
  } catch {
    return Response.json({ error: "Invalid demo command." }, { status: 400 });
  }
  try {
    const store = await getStore();
    const token = request.cookies.get("wardzero-demo-session")?.value ?? null;
    const { action, ...command } = input;
    const wall = new Date();
    const result =
      action === "reset"
        ? await store.demo.reset(token, command, wall)
        : action === "advance"
          ? await store.demo.advance(token, command, wall)
          : await store.demo.seed(token, command, wall);
    if (action === "advance") await store.evaluateDeadlines(wall);
    return Response.json({ result });
  } catch (error) {
    if (isCareError(error))
      return Response.json({ error: error.message }, { status: error.status });
    console.error("demo_command_failed");
    return Response.json(
      { error: "Demo command was not confirmed. Retry the same action." },
      { status: 503 },
    );
  }
}
