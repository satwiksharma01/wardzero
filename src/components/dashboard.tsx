"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  FlaskConical,
  Heart,
  House,
  Info,
  LayoutDashboard,
  Radio,
  Thermometer,
  Waves,
  Wind,
  BellRing,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Snapshot } from "@/domain/readings";
import { Simulator } from "./simulator";
import { CareContext } from "./care-context";
import { CareResponse } from "./care-response";
import { CaregiverNotes } from "./caregiver-notes";
import { DemoControls } from "./demo-controls";
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

async function loadSnapshot(): Promise<Snapshot> {
  const response = await fetch("/api/patient", {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Readings are unavailable.");
  return response.json();
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("oxygenPct");
  const acceptSnapshot = useCallback((data: Snapshot) => {
    setSnapshot((previous) =>
      previous && Date.parse(previous.wallTime) > Date.parse(data.wallTime)
        ? previous
        : data,
    );
    setError(null);
  }, []);
  const reportFailure = useCallback(() => {
    setError(
      "Connection unavailable. Displaying last-known readings; current monitoring status cannot be confirmed.",
    );
  }, []);
  const refresh = useCallback(
    () => loadSnapshot().then(acceptSnapshot, reportFailure),
    [acceptSnapshot, reportFailure],
  );
  useEffect(() => {
    let active = true;
    const update = () =>
      loadSnapshot().then(
        (data) => {
          if (active) acceptSnapshot(data);
        },
        () => {
          if (active) reportFailure();
        },
      );
    void update();
    const timer = setInterval(() => {
      void update();
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [acceptSnapshot, reportFailure]);

  const history = snapshot?.history ?? [];
  const latest = snapshot?.latest;
  const monitoring = error
    ? "Disconnected"
    : (snapshot?.monitoring ?? "Connecting");
  const fresh = monitoring === "Current";
  const activeEpisode = snapshot?.care.alerts.find(
    (alert) => alert.state !== "Resolved",
  );

  return (
    <div className="workspace">
      <a className="skip-link" href="#main">
        Skip to patient overview
      </a>
      <aside className="sidebar">
        <a className="brand" href="#main" aria-label="WardZero home">
          <span className="brand-mark">
            <Activity size={24} />
          </span>
          wardzero<span className="brand-dot">.</span>
        </a>
        <span className="nav-caption">Your workspace</span>
        <nav aria-label="Workspace">
          <a className="nav-link selected" href="#main">
            <LayoutDashboard size={18} />
            Care overview
          </a>
          <a className="nav-link" href="#vital-history">
            <Activity size={18} />
            Vital history
          </a>
          <a className="nav-link" href="#care-response">
            <BellRing size={18} />
            Care response
          </a>
          <a className="nav-link" href="#caregiver-notes">
            <FileText size={18} />
            Observations
          </a>
          <a className="nav-link" href="#simulator">
            <FlaskConical size={18} />
            Simulation lab
          </a>
        </nav>
        <div className="sidebar-note">
          <House size={23} />
          <p>Care with continuity.</p>
          <span>Readings, context, and a recorded response.</span>
        </div>
        <div className="workspace-identity">
          <span className="avatar small">WZ</span>
          <div>
            <strong>Local workspace</strong>
            <small>Synthetic patient demo</small>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <span>Care overview</span>
          </div>
          <Badge variant="outline" className="demo-badge">
            <FlaskConical size={13} />
            DEMONSTRATION
            {(snapshot?.run.clockOffsetMs ?? 0) > 0 &&
              ` · CLOCK +${Math.round(snapshot!.run.clockOffsetMs / 1000)}s`}
          </Badge>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <h1>Patient overview</h1>
              <p>Readings, observations, and the next care action.</p>
            </div>
            <div className="heading-actions">
              <Button variant="outline" asChild>
                <a href="#simulator">
                  Open simulator
                  <ArrowUpRight data-icon="inline-end" />
                </a>
              </Button>
              <Button asChild>
                <a href="#caregiver-notes">
                  <FileText data-icon="inline-start" />
                  Record observation
                </a>
              </Button>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <Info size={18} />
              <span>{error}</span>
              <Button variant="outline" onClick={() => void refresh()}>
                Retry
              </Button>
            </div>
          )}

          <section className="patient-panel" aria-labelledby="patient-name">
            <div className="patient-identity">
              <span className="avatar patient-avatar">MR</span>
              <div>
                <div className="patient-title">
                  <h2 id="patient-name">Meera Rao</h2>
                  <Badge variant="secondary">Demo patient</Badge>
                </div>
                <p>
                  68 years <span>·</span> Post-discharge recovery <span>·</span>{" "}
                  WZ–001
                </p>
              </div>
            </div>
            <div className="patient-context">
              <span>CARE SETTING</span>
              <strong>
                <House size={15} />
                Recovery at home
              </strong>
            </div>
            <div className="patient-context">
              <span>MONITORING</span>
              <strong className={fresh ? "teal-text" : ""}>
                <span className={`status-dot ${fresh ? "live" : ""}`} />
                {monitoring}
              </strong>
            </div>
          </section>

          {activeEpisode && (
            <div className="priority-response">
              <div>
                <strong>
                  {error ? "Last-known unresolved" : "Unresolved"}{" "}
                  {activeEpisode.severity.toLowerCase()}-concern episode
                </strong>
                <p>
                  {activeEpisode.state === "ActionRecorded"
                    ? "Action recorded"
                    : activeEpisode.state}{" "}
                  · Opened {timeLabel(activeEpisode.openedAt)}. Response state
                  is separate from current concern.
                </p>
              </div>
              <Button variant="outline" asChild>
                <a href="#care-response">
                  View care response
                  <ArrowUpRight data-icon="inline-end" />
                </a>
              </Button>
            </div>
          )}
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
                  <VitalChart
                    history={history.slice(-12)}
                    metric={key}
                    compact
                  />
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

          <div className={`overview-grid chart-${metric}`}>
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
                  {metricDefinitions[metric].label} (
                  {metricDefinitions[metric].unit})
                </span>
                <span>
                  {history.length} recent / {snapshot?.total ?? 0} stored
                </span>
              </div>
            </section>
            <CareContext
              history={history}
              care={snapshot?.care}
              fresh={fresh}
              disconnected={!!error}
            />
          </div>

          <div className="care-workspace-grid">
            <CareResponse
              workerLastTickAt={snapshot?.care.workerLastTickAt ?? null}
              alerts={snapshot?.care.alerts ?? []}
              disconnected={!!error}
              onChange={refresh}
            />
            <CaregiverNotes
              assessment={snapshot?.care.currentAssessment}
              serverTime={snapshot?.serverTime}
              key={`notes-${snapshot?.run.id ?? "loading"}`}
              runId={snapshot?.run.id ?? "local"}
              notes={snapshot?.care.notes ?? []}
              disconnected={!!error}
              onChange={refresh}
            />
          </div>
          <div className="section-heading tools-heading">
            <div>
              <h2>Demo workspace</h2>
              <p>Generate synthetic readings and repeat the care journey.</p>
            </div>
            <Badge variant="outline">
              <FlaskConical aria-hidden="true" />
              Simulation tools
            </Badge>
          </div>
          <div className="tools-grid">
            <DemoControls
              run={snapshot?.run}
              serverTime={snapshot?.serverTime}
              disconnected={!!error}
              onChange={refresh}
            />
            {snapshot && (
              <Simulator
                key={`simulator-${snapshot.run.id}`}
                run={snapshot.run}
                onReading={refresh}
              />
            )}
          </div>
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
          <footer className="page-footer">
            <span>
              <Activity size={14} />
              WardZero · Care with continuity
            </span>
            <span>Synthetic data only. Not for clinical use.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
