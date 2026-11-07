import type { Reading } from "../../src/domain/readings";

// Authored marker and outcomes, not generated from the assessment implementation.
export const EARLY_WARNING_START = "2026-11-07T08:00:00.000Z";
export const earlyWarningTimeline: {
  second: number;
  metrics: Reading["metrics"];
}[] = [
  {
    second: 0,
    metrics: {
      oxygenPct: 98,
      pulseBpm: 76,
      temperatureC: 36.8,
      respiratoryRate: 16,
    },
  },
  {
    second: 5,
    metrics: {
      oxygenPct: 98,
      pulseBpm: 78,
      temperatureC: 36.8,
      respiratoryRate: 16,
    },
  },
  {
    second: 10,
    metrics: {
      oxygenPct: 97.5,
      pulseBpm: 82,
      temperatureC: 37,
      respiratoryRate: 17,
    },
  },
  {
    second: 20,
    metrics: {
      oxygenPct: 96,
      pulseBpm: 88,
      temperatureC: 37.2,
      respiratoryRate: 19,
    },
  },
  {
    second: 40,
    metrics: {
      oxygenPct: 96,
      pulseBpm: 94,
      temperatureC: 37.5,
      respiratoryRate: 20,
    },
  },
  {
    second: 60,
    metrics: {
      oxygenPct: 95,
      pulseBpm: 100,
      temperatureC: 37.6,
      respiratoryRate: 21,
    },
  },
  {
    second: 90,
    metrics: {
      oxygenPct: 92,
      pulseBpm: 115,
      temperatureC: 39,
      respiratoryRate: 26,
    },
  },
];
export const earlyWarningNote = "More tired today and barely ate lunch.";
export const negatedEarlyNote =
  "She is not tired today. Her intake is not reduced today.";
export const historicalEarlyNote =
  "She was tired last week and barely ate lunch during that visit.";
export const expectedEarlyWarning = {
  noteSecond: 15,
  fullFirstConcernSecond: 15,
  firstBothSourcesSecond: 20,
  individualMarkerSecond: 60,
  fullLeadSeconds: 45,
  trendOnlyFirstConcernSecond: 20,
  trendOnlyLeadSeconds: 40,
} as const;
