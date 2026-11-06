import type { StoredReading } from "./readings";

export type Concern = "Unknown" | "Low" | "Medium" | "High";
export type EvidenceReason = {
  code: string;
  message: string;
  eventIds: string[];
  noteIds?: string[];
};
export type Assessment = {
  concern: Concern;
  ruleVersion: string;
  evaluatedAt: string;
  latestObservedAt: string | null;
  reasons: EvidenceReason[];
};
export type SavedAssessment = Assessment & { id: string };
export const DEMO_RULES = {
  version: "synthetic-v1",
  windowMs: 120000,
  staleMs: 90000,
  minimumObservations: 3,
  trendSpanMs: 10000,
  oxygenDrop: 2,
  pulseRise: 10,
  high: { oxygenPct: 92, pulseBpm: 115, temperatureC: 39, respiratoryRate: 26 },
  medium: {
    oxygenPct: 95,
    pulseBpm: 100,
    temperatureC: 38,
    respiratoryRate: 22,
  },
} as const;

export function assess(history: StoredReading[], now: Date): Assessment {
  const eligible = history
    .filter((r) => {
      const age = now.getTime() - Date.parse(r.observedAt);
      return age >= 0 && age <= DEMO_RULES.windowMs;
    })
    .sort(
      (a, b) =>
        Date.parse(a.observedAt) - Date.parse(b.observedAt) ||
        a.eventId.localeCompare(b.eventId),
    );
  const latest = eligible.at(-1);
  const base = {
    ruleVersion: DEMO_RULES.version,
    evaluatedAt: now.toISOString(),
    latestObservedAt: latest?.observedAt ?? null,
  };
  const unknown = (message: string): Assessment => ({
    ...base,
    concern: "Unknown",
    reasons: [
      {
        code: "insufficient-evidence",
        message,
        eventIds: latest ? [latest.eventId] : [],
      },
    ],
  });
  if (
    !latest ||
    now.getTime() - Date.parse(latest.observedAt) >= DEMO_RULES.staleMs
  )
    return unknown(
      "Fresh observations are needed before assessing current concern.",
    );

  const reasons: EvidenceReason[] = [];
  let concern: Concern = "Low";
  const metrics = [
    ["oxygenPct", "Oxygen saturation", "%", "below"],
    ["pulseBpm", "Pulse", " bpm", "above"],
    ["temperatureC", "Temperature", " °C", "above"],
    ["respiratoryRate", "Respiratory rate", "/min", "above"],
  ] as const;
  for (const [key, label, unit, direction] of metrics) {
    const value = latest.metrics[key];
    const meets = (limit: number) =>
      direction === "below" ? value <= limit : value >= limit;
    const level = meets(DEMO_RULES.high[key])
      ? "High"
      : meets(DEMO_RULES.medium[key])
        ? "Medium"
        : null;
    if (!level) continue;
    if (level === "High" || concern === "Low") concern = level;
    reasons.push({
      code: `${key}-${level.toLowerCase()}`,
      message: `${label} is ${value}${unit}, meeting the ${level.toLowerCase()} demo concern limit.`,
      eventIds: [latest.eventId],
    });
  }
  const distinctTimes = new Set(eligible.map((r) => r.observedAt)).size;
  const first = eligible[0];
  if (
    distinctTimes >= DEMO_RULES.minimumObservations &&
    Date.parse(latest.observedAt) - Date.parse(first.observedAt) >=
      DEMO_RULES.trendSpanMs
  ) {
    const drop = Number(
      (first.metrics.oxygenPct - latest.metrics.oxygenPct).toFixed(1),
    );
    const rise = latest.metrics.pulseBpm - first.metrics.pulseBpm;
    if (drop >= DEMO_RULES.oxygenDrop && rise >= DEMO_RULES.pulseRise) {
      if (concern === "Low") concern = "Medium";
      reasons.push({
        code: "combined-trend",
        message: `Oxygen fell ${drop} percentage points (${first.metrics.oxygenPct}% → ${latest.metrics.oxygenPct}%) while pulse rose ${rise} bpm (${first.metrics.pulseBpm} → ${latest.metrics.pulseBpm}).`,
        eventIds: eligible.map((r) => r.eventId),
      });
    }
  }
  if (concern === "Low" && distinctTimes < DEMO_RULES.minimumObservations)
    return unknown(
      "At least three distinct recent observations are needed for a low-concern assessment.",
    );
  if (!reasons.length)
    reasons.push({
      code: "stable-demo",
      message:
        "Recent measurements do not meet the configured demo concern limits.",
      eventIds: eligible.map((r) => r.eventId),
    });
  return { ...base, concern, reasons };
}
