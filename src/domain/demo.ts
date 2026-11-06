import { z } from "zod";
export const runIdentity = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const demoResetSchema = z
  .object({
    id: runIdentity,
    scenario: z.enum(["stable", "deteriorating", "outage", "no-response"]),
  })
  .strict();
export const demoAdvanceSchema = z
  .object({
    id: runIdentity,
    runId: runIdentity,
    seconds: z.number().int().min(1).max(3600),
  })
  .strict();
export const demoSeedSchema = z
  .object({
    id: runIdentity,
    runId: runIdentity,
    scenario: z.enum(["stable", "deteriorating"]),
  })
  .strict();
export type DemoRun = {
  id: string;
  scenario: string;
  createdAt: string;
  clockOffsetMs: number;
  active: boolean;
};
export type DemoRunSummary = DemoRun & {
  readingCount: number;
  noteCount: number;
  alertCount: number;
};
