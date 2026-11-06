import type { StoredReading } from "@/domain/readings";

export const metricDefinitions = {
  oxygenPct: {
    label: "Oxygen saturation",
    unit: "%",
    color: "var(--teal)",
    decimals: 1,
  },
  pulseBpm: {
    label: "Heart rate",
    unit: "bpm",
    color: "var(--rose)",
    decimals: 0,
  },
  temperatureC: {
    label: "Temperature",
    unit: "°C",
    color: "var(--ochre)",
    decimals: 1,
  },
  respiratoryRate: {
    label: "Respiratory rate",
    unit: "/min",
    color: "var(--blue)",
    decimals: 0,
  },
};
export type Metric = keyof typeof metricDefinitions;

export function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function VitalChart({
  history,
  metric,
  compact = false,
}: {
  history: StoredReading[];
  metric: Metric;
  compact?: boolean;
}) {
  const definition = metricDefinitions[metric];
  if (!history.length)
    return (
      <div className={compact ? "spark-empty" : "chart-empty"}>
        {compact
          ? "Awaiting readings"
          : "Send a simulated reading to begin the timeline."}
      </div>
    );
  const values = history.map((event) => event.metrics[metric]);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const width = compact ? 180 : 800;
  const height = compact ? 54 : 230;
  const pad = compact ? 5 : 35;
  const firstTime = Date.parse(history[0].observedAt);
  const duration = Math.max(
    1,
    Date.parse(history.at(-1)!.observedAt) - firstTime,
  );
  const points = history.map((event, index) => ({
    x:
      pad +
      (history.length === 1
        ? 0.5
        : (Date.parse(event.observedAt) - firstTime) / duration) *
        (width - pad * 2),
    y: pad + ((max - values[index]) / (max - min)) * (height - pad * 2),
  }));
  const last = points.at(-1)!;
  return (
    <svg
      className={compact ? "spark" : "trend-chart"}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${definition.label}, ${values.length} readings. Latest ${values.at(-1)} ${definition.unit}.`}
    >
      {!compact &&
        [0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={pad}
              x2={width - pad}
              y1={pad + fraction * (height - 2 * pad)}
              y2={pad + fraction * (height - 2 * pad)}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <text
              x={2}
              y={pad + fraction * (height - 2 * pad) + 4}
              fontSize="11"
              fill="var(--muted)"
            >
              {(max - fraction * (max - min)).toFixed(definition.decimals)}
            </text>
          </g>
        ))}
      <polyline
        points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        fill="none"
        stroke={definition.color}
        strokeWidth={compact ? 2 : 2.5}
        strokeLinejoin="round"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r={compact ? 3 : 4}
        fill={definition.color}
      />
      {!compact && (
        <>
          <text x={pad} y={height - 3} fontSize="11" fill="var(--muted)">
            {timeLabel(history[0].observedAt)}
          </text>
          <text
            x={width - pad}
            y={height - 3}
            textAnchor="end"
            fontSize="11"
            fill="var(--muted)"
          >
            {timeLabel(history.at(-1)!.observedAt)}
          </text>
        </>
      )}
    </svg>
  );
}
