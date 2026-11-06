import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getStore } from "@/server/database";
import { localRequestAllowed, readBoundedJson } from "@/server/http";
import { SESSION_SECONDS } from "@/server/care-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ role: z.enum(["primary", "backup"]) }).strict();
const SESSION_COOKIE = "wardzero-demo-session";

export async function GET(request: NextRequest) {
  if (!localRequestAllowed(request))
    return NextResponse.json({ error: "Local preview only." }, { status: 403 });
  try {
    const actor = await (
      await getStore()
    ).care.actorForSession(
      request.cookies.get(SESSION_COOKIE)?.value ?? null,
      new Date(),
    );
    return NextResponse.json(
      { actor },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Session unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!localRequestAllowed(request, true))
    return NextResponse.json(
      { error: "Local same-origin requests only." },
      { status: 403 },
    );
  let body;
  try {
    body = schema.parse(await readBoundedJson(request));
  } catch {
    return NextResponse.json(
      { error: "Choose a supported demo identity." },
      { status: 400 },
    );
  }
  try {
    const { actor, token } = await (
      await getStore()
    ).care.createSession(body.role, new Date());
    const response = NextResponse.json({ actor });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      { error: "Demo session could not be activated." },
      { status: 503 },
    );
  }
}
