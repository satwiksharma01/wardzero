"use client";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Heart,
  Radio,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { useWorkspace } from "./workspace-state";
import {
  metricDefinitions,
  timeLabel,
  VitalChart,
  type Metric,
} from "./vital-chart";
const metricIcons = {
  oxygenPct: Waves,
  pulseBpm: Heart,
  temperatureC: Thermometer,
  respiratoryRate: Wind,
};

export function VitalCards() {
  const { snapshot, error } = useWorkspace();
  const latest = snapshot?.latest;
  const history = snapshot?.history ?? [];
  return (
    <>
      <div className="section-heading vitals-heading">
        <h2>Vital signs</h2>
        <span className="last-seen">
          <Clock3 size={13} />
          {latest
            ? `Observed ${timeLabel(latest.observedAt)}`
            : snapshot
              ? "Awaiting first reading"
              : "Connecting to monitor…"}
        </span>
      </div>
      <div className="vital-grid" aria-busy={!snapshot && !error}>
        {(Object.keys(metricDefinitions) as Metric[]).map((key) => {
          const definition = metricDefinitions[key];
          const Icon = metricIcons[key];
          const value = latest?.metrics[key];
          const previous = history.at(-2)?.metrics[key];
          const change =
            value !== undefined && previous !== undefined
              ? Number((value - previous).toFixed(1))
              : null;
          return (
            <section className={`vital-card metric-${key}`} key={key}>
              <div className="vital-label">
                <span>{definition.label}</span>
                <Icon size={17} />
              </div>
              <div className="vital-value">
                {!snapshot && !error ? (
                  <Skeleton
                    className="h-10 w-20"
                    aria-label="Loading measurement"
                  />
                ) : value === undefined ? (
                  "—"
                ) : (
                  value.toFixed(definition.decimals)
                )}
                <span>{definition.unit}</span>
              </div>
              <VitalChart history={history.slice(-12)} metric={key} compact />
              <div className="vital-foot">
                {change === null ? (
                  "No comparison yet"
                ) : (
                  <>
                    {change > 0 ? (
                      <ArrowUpRight size={13} />
                    ) : change < 0 ? (
                      <ArrowDownLeft size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                    {change === 0
                      ? "Unchanged"
                      : `${change > 0 ? "+" : ""}${change} ${definition.unit}`}
                    <span>since previous reading</span>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

export function VitalTrend() {
  const { snapshot } = useWorkspace();
  const history = snapshot?.history ?? [];
  const [metric, setMetric] = useState<Metric>("oxygenPct");
  return (
    <div className={`chart-${metric}`}>
      <section
        className="panel trend-panel"
        id="vital-history"
        aria-labelledby="history-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="history-title">The recovery picture</h2>
            <p>Recent observations, ordered by measurement time.</p>
          </div>
          <label className="sr-only" htmlFor="metric">
            Chart measurement
          </label>
          <select
            id="metric"
            value={metric}
            onChange={(event) => setMetric(event.target.value as Metric)}
          >
            {(Object.keys(metricDefinitions) as Metric[]).map((key) => (
              <option value={key} key={key}>
                {metricDefinitions[key].label}
              </option>
            ))}
          </select>
        </div>
        <VitalChart history={history} metric={metric} />
        <div className="chart-footer">
          <span>
            <span className="legend-dot" />
            {metricDefinitions[metric].label} ({metricDefinitions[metric].unit})
          </span>
        </div>
      </section>
    </div>
  );
}

export function ReadingLog() {
  const { snapshot } = useWorkspace();
  const history = snapshot?.history ?? [];
  return (
    <>
      <section
        className="panel readings-panel"
        aria-labelledby="readings-title"
      >
        <div className="section-heading">
          <div>
            <h2 id="readings-title">Reading log</h2>
            <p>Original observation and arrival times stay together.</p>
          </div>
          <span className="tag">
            <Radio size={12} />
            Simulator 001
          </span>
        </div>
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Scrollable reading log"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Observed</th>
                <th scope="col">Received</th>
                <th scope="col">SpO₂</th>
                <th scope="col">Pulse</th>
                <th scope="col">Temp.</th>
                <th scope="col">Resp.</th>
              </tr>
            </thead>
            <tbody>
              {history
                .slice(-5)
                .reverse()
                .map((event) => (
                  <tr key={event.eventId}>
                    <td>
                      <time
                        dateTime={event.observedAt}
                        title={event.observedAt}
                      >
                        {timeLabel(event.observedAt)}
                      </time>
                    </td>
                    <td>
                      <time
                        dateTime={event.receivedAt}
                        title={event.receivedAt}
                      >
                        {timeLabel(event.receivedAt)}
                      </time>
                    </td>
                    <td>{event.metrics.oxygenPct}%</td>
                    <td>{event.metrics.pulseBpm} bpm</td>
                    <td>{event.metrics.temperatureC} °C</td>
                    <td>{event.metrics.respiratoryRate}/min</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!history.length && (
            <p className="log-empty">
              Your first simulated reading will appear here.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
