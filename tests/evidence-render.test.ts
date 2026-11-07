import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CareContext } from "../src/components/care-context";
import { makeReading } from "../src/domain/readings";
import type { CareSnapshot } from "../src/domain/care";

it("keeps reading and note provenance distinct when their identities happen to match", () => {
  const now = new Date("2026-11-07T08:00:00Z");
  const care: CareSnapshot = {
    currentAssessment: {
      concern: "Medium",
      evaluatedAt: now.toISOString(),
      latestObservedAt: now.toISOString(),
      ruleVersion: "fixture",
      reasons: [
        {
          code: "caregiver-context",
          message: "Supported context",
          eventIds: ["shared"],
          noteIds: ["shared"],
        },
      ],
    },
    lastAssessment: null,
    workerLastTickAt: null,
    alerts: [],
    notes: [
      {
        id: "shared",
        text: "Tired today.",
        authorId: "caregiver-primary",
        authorName: "Ananya",
        recordedAt: now.toISOString(),
        status: "Complete",
        observations: [],
        model: "fixture",
        promptVersion: "fixture",
        failureReason: null,
      },
    ],
  };
  const html = renderToStaticMarkup(
    createElement(CareContext, {
      care,
      fresh: true,
      disconnected: false,
      history: [
        {
          ...makeReading(0, "stable", now, "shared"),
          receivedAt: now.toISOString(),
        },
      ],
    }),
  );
  expect(html).toContain("Reading ·");
  expect(html).toContain('href="#note-shared"');
});
