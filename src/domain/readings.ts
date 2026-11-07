import { z } from "zod";
import type { CareSnapshot } from "./care";
import type { DemoRun } from "./demo";

export const PATIENT_ID = "patient-001";
// Future observations have no current-care eligibility; reject instead of buffering them invisibly.
export const FUTURE_SKEW_MS = 0;
export const readingSchema = z
  .object({
    eventId: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/),
    patientId: z.literal(PATIENT_ID),
    runId: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .default("local"),
    deviceId: z.literal("simulator-001"),
    sequence: z.number().int().min(0).max(10000000),
    observedAt: z.iso.datetime(),
    metrics: z
      .object({
        pulseBpm: z.number().min(20).max(250),
        oxygenPct: z.number().min(50).max(100),
        temperatureC: z.number().min(30).max(45),
        respiratoryRate: z.number().min(4).max(80),
      })
      .strict(),
  })
  .strict();

export type Reading = z.infer<typeof readingSchema>;
export type StoredReading = Reading & { receivedAt: string };
export type Scenario = "stable" | "deteriorating";
export type Monitoring = "Waiting" | "Current" | "Delayed" | "Offline";
export type IngestResult = {
  eventId: string | null;
  status: "accepted" | "duplicate" | "conflict" | "rejected";
  reason?: string;
};
export type Snapshot = {
  latest: StoredReading | null;
  history: StoredReading[];
  total: number;
  monitoring: Monitoring;
  serverTime: string;
  care: CareSnapshot;
  run: DemoRun;
  wallTime: string;
};

export function monitoringStatus(
  observedAt: string | null,
  now: Date,
): Monitoring {
  if (!observedAt) return "Waiting";
  const age = now.getTime() - Date.parse(observedAt);
  if (age >= 90000) return "Offline";
  if (age >= 30000) return "Delayed";
  return "Current";
}

export function makeReading(
  sequence: number,
  scenario: Scenario,
  now: Date,
  eventId: string,
  runId = "local",
): Reading {
  const step = scenario === "deteriorating" ? Math.min(sequence, 12) : 0;
  const variation = [0, 1, -1, 0, 1][sequence % 5];
  return {
    eventId,
    patientId: PATIENT_ID,
    runId,
    deviceId: "simulator-001",
    sequence,
    observedAt: now.toISOString(),
    metrics: {
      pulseBpm: 76 + variation + step * 3,
      oxygenPct: Number((98 - step * 0.5).toFixed(1)),
      temperatureC: Number((36.8 + step * 0.1).toFixed(1)),
      respiratoryRate: 16 + Math.floor(step * 0.7),
    },
  };
}
