import { z } from "zod";
import { isCareError } from "../domain/care";
import { getBrowserStore } from "./database";
import type { ReadingStore } from "../server/reading-store";
import { sampleNoteProvider } from "./note-fixture";

type Session = { get: () => string | null; set: (token: string) => void };
const roleSchema = z.object({ role: z.enum(["primary", "backup"]) }).strict();
const batchSchema = z
  .object({ readings: z.array(z.unknown()).min(1).max(100) })
  .strict();
const noteSchema = z.object({ text: z.string() }).passthrough();
const SESSION_KEY = "wardzero-pages-session-v1";

export function createDemoApi(
  getStore: () => Promise<ReadingStore>,
  session: Session,
  clock = () => new Date(),
): typeof fetch {
  const execute: typeof fetch = async (input, init) => {
    const path = String(input);
    const method = init?.method ?? "GET";
    try {
      const store = await getStore();
      const now = clock();
      if (method === "GET" && path === "/api/patient") {
        await store.evaluateDeadlines(now);
        return Response.json(await store.snapshot(now));
      }
      if (method === "GET" && path === "/api/demo")
        return Response.json({ runs: await store.demo.list() });
      if (method === "GET" && path === "/api/demo/session")
        return Response.json({
          actor: await store.care.actorForSession(session.get(), now),
        });
      if (method !== "POST")
        return Response.json(
          { error: "Unknown demo request." },
          { status: 404 },
        );
      if (
        typeof init?.body !== "string" ||
        new TextEncoder().encode(init.body).length > 128000
      )
        return Response.json(
          { error: "Invalid demo request body." },
          { status: 400 },
        );
      const body: unknown = JSON.parse(init.body);
      if (path === "/api/demo/session") {
        const { role } = roleSchema.parse(body);
        const { actor, token } = await store.care.createSession(role, now);
        session.set(token);
        return Response.json({ actor });
      }
      if (path === "/api/readings/batch")
        return Response.json({
          results: await store.ingest(batchSchema.parse(body).readings, now),
        });
      if (path === "/api/notes") {
        const { text } = noteSchema.parse(body);
        return Response.json({
          note: await store.notes.submit(
            session.get(),
            body,
            now,
            sampleNoteProvider(text),
            clock,
          ),
        });
      }
      if (path === "/api/demo") {
        const { action, ...command } = z
          .object({ action: z.enum(["reset", "advance", "seed"]) })
          .passthrough()
          .parse(body);
        const result =
          action === "reset"
            ? await store.demo.reset(session.get(), command, now)
            : action === "seed"
              ? await store.demo.seed(session.get(), command, now)
              : await store.demo.advance(session.get(), command, now);
        if (action === "advance") await store.evaluateDeadlines(now);
        return Response.json({ result });
      }
      const alert = /^\/api\/alerts\/([a-zA-Z0-9_-]+)\/events$/.exec(path);
      if (alert)
        return Response.json(
          await store.care.recordEvent(alert[1], session.get(), body, now),
        );
      return Response.json({ error: "Unknown demo request." }, { status: 404 });
    } catch (error) {
      if (isCareError(error))
        return Response.json(
          { error: error.message },
          { status: error.status },
        );
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return Response.json(
          { error: "Invalid demo request." },
          { status: 400 },
        );
      return Response.json(
        {
          error:
            "Browser storage unavailable. Allow site storage, then reload. Your data was not confirmed saved.",
        },
        { status: 503 },
      );
    }
  };
  return (input, init) => {
    const signal = init?.signal;
    if (signal?.aborted) return Promise.reject(signal.reason);
    const request = execute(input, init);
    if (!signal) return request;
    // Aborted mutations may already be committed; callers retain identities for safe retries.
    return new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      request.then(
        (response) => {
          signal.removeEventListener("abort", abort);
          resolve(response);
        },
        (error) => {
          signal.removeEventListener("abort", abort);
          reject(error);
        },
      );
    });
  };
}

export const apiFetch = createDemoApi(getBrowserStore, {
  get: () => sessionStorage.getItem(SESSION_KEY),
  set: (token) => sessionStorage.setItem(SESSION_KEY, token),
});
