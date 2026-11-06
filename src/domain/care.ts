import { z } from "zod";
import type { Assessment, SavedAssessment } from "./assessment";
import type { CareNote } from "./notes";

export const DEMO_ACTORS = {
  primary: {
    id: "caregiver-primary",
    name: "Ananya Shah",
    role: "Primary caregiver",
  },
  backup: {
    id: "coordinator-backup",
    name: "Ravi Menon",
    role: "Backup coordinator",
  },
} as const;
export type Actor = (typeof DEMO_ACTORS)[keyof typeof DEMO_ACTORS];
export type DemoRole = keyof typeof DEMO_ACTORS;
const identity = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().trim().min(5).max(1000);
export const careActionSchema = z.discriminatedUnion("action", [
  z.object({ eventId: identity, action: z.literal("acknowledge") }).strict(),
  z
    .object({ eventId: identity, action: z.literal("record-action"), text })
    .strict(),
  z.object({ eventId: identity, action: z.literal("resolve"), text }).strict(),
]);
export type CareAction = z.infer<typeof careActionSchema>;
export type AlertState =
  "Open" | "Acknowledged" | "ActionRecorded" | "Resolved";
export type AuditEvent = {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  text: string;
  occurredAt: string;
};
export type AlertEpisode = {
  id: string;
  severity: "Medium" | "High";
  state: AlertState;
  assignedActorId: string;
  backupActorId: string;
  acknowledgementDueAt: string;
  escalatedAt: string | null;
  openedAt: string;
  updatedAt: string;
  assessment: SavedAssessment;
  events: AuditEvent[];
};
export type CareSnapshot = {
  currentAssessment: Assessment;
  lastAssessment: SavedAssessment | null;
  alerts: AlertEpisode[];
  notes: CareNote[];
  workerLastTickAt: string | null;
};

export class CareError extends Error {
  readonly kind = "wardzero-care-error";
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Instrumentation and route handlers can load separate module instances in Next.js.
// A stable brand preserves expected HTTP errors across those entry points.
export function isCareError(error: unknown): error is CareError {
  return (
    error instanceof Error &&
    "kind" in error &&
    error.kind === "wardzero-care-error" &&
    "status" in error &&
    typeof error.status === "number" &&
    [400, 401, 403, 404, 409].includes(error.status)
  );
}
