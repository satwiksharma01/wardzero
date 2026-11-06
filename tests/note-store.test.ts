import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { ReadingStore } from "../src/server/reading-store";
import { makeReading } from "../src/domain/readings";

it("persists notes first, applies validated provider evidence, and handles unavailable/failed analysis", async () => {
  const db = new PGlite();
  try {
    const store = new ReadingStore(db);
    await store.initialize();
    const now = new Date("2026-11-07T08:00:00Z");
    for (const step of [0, 1, 2])
      await store.ingest(
        [
          makeReading(
            step,
            "stable",
            new Date(now.getTime() - (2 - step) * 5000),
            `note-base-${step}`,
          ),
        ],
        now,
      );
    const { token } = await store.care.createSession("primary", now);
    const input = {
      id: "note-a",
      text: "More tired today and barely ate lunch.",
    };
    await expect(
      store.notes.submit(null, input, now, null, () => now),
    ).rejects.toMatchObject({ status: 401 });
    const unavailable = await store.notes.submit(
      token,
      input,
      now,
      null,
      () => now,
    );
    expect(unavailable.status).toBe("Unavailable");
    expect((await store.snapshot(now)).care.currentAssessment.concern).toBe(
      "Low",
    );
    let calls = 0;
    const provider = {
      model: "mock-protocol-model",
      async extract() {
        calls++;
        expect((await store.snapshot(now)).care.notes[0].status).toBe(
          "Pending",
        );
        return {
          observations: [
            {
              code: "fatigue" as const,
              excerpt: "More tired today",
              negated: false,
              temporality: "current" as const,
            },
            {
              code: "reduced_intake" as const,
              excerpt: "barely ate lunch",
              negated: false,
              temporality: "current" as const,
            },
          ],
        };
      },
    };
    const complete = await store.notes.submit(
      token,
      input,
      now,
      provider,
      () => now,
    );
    expect(complete.status).toBe("Complete");
    const snapshot = await store.snapshot(now);
    expect(snapshot.care.currentAssessment.concern).toBe("Medium");
    expect(snapshot.care.alerts[0].assessment.reasons.at(-1)?.noteIds).toEqual([
      input.id,
    ]);
    await store.notes.submit(token, input, now, provider, () => now);
    expect(calls).toBe(1);
    await expect(
      store.notes.submit(
        token,
        { ...input, text: "Changed note." },
        now,
        provider,
        () => now,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const failed = await store.notes.submit(
      token,
      { id: "note-b", text: "New breathlessness today." },
      now,
      {
        model: "broken",
        async extract() {
          throw new Error("Provider failed");
        },
      },
      () => now,
    );
    expect(failed.status).toBe("Failed");
    expect(failed.observations).toEqual([]);
    expect((await store.snapshot(now)).care.notes).toHaveLength(2);
  } finally {
    await db.close();
  }
});
