"use client";

import { Button } from "@/components/ui/button";

import { useSimulator } from "@/client/use-simulator";
import type { DemoRun } from "@/domain/demo";
import {
  ArrowUpRight,
  FlaskConical,
  Pause,
  Play,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { Scenario } from "@/domain/readings";

export function Simulator({
  onReading,
  run,
}: {
  onReading: () => Promise<void>;
  run: DemoRun;
}) {
  const {
    scenario,
    setScenario,
    running,
    setRunning,
    sending,
    message,
    error,
    ready,
    summary,
    send,
    sync,
    toggleTransport,
  } = useSimulator(onReading, run);

  return (
    <section
      className="simulator panel"
      id="simulator"
      aria-labelledby="simulator-title"
    >
      <div className="section-heading">
        <div className="heading-with-icon">
          <FlaskConical size={19} />
          <h2 id="simulator-title">Simulation lab</h2>
        </div>
        <span className="small-label">DEMO CONTROLS</span>
      </div>
      <p>Send synthetic vitals through the monitoring system.</p>
      <div className="simulation-controls">
        <div className="scenario-field">
          <label htmlFor="scenario">Patient scenario</label>
          <select
            id="scenario"
            value={scenario}
            disabled={running || sending || !ready}
            onChange={(event) => {
              setScenario(event.target.value as Scenario);
            }}
          >
            <option value="stable">Stable recovery</option>
            <option value="deteriorating">Gradual deterioration</option>
          </select>
        </div>
        <Button disabled={sending || !ready} onClick={() => void send()}>
          <Radio size={16} />
          {sending ? "Sending…" : "Send one reading"}
          <ArrowUpRight size={15} />
        </Button>
        <Button
          variant="outline"
          disabled={sending || !ready}
          onClick={() => setRunning((value) => !value)}
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? "Pause stream" : "Stream every 5s"}
        </Button>
      </div>
      <div className="transport-controls">
        <span className={`tag ${summary.blocked ? "transport-offline" : ""}`}>
          {summary.blocked ? <WifiOff size={13} /> : <Wifi size={13} />}
          {summary.blocked
            ? "Sensor transport offline"
            : "Sensor transport online"}
        </span>
        <span className="queue-count" data-testid="queue-count">
          {summary.pending} queued · {summary.rejected.length} rejected
        </span>
        <Button
          variant="outline"
          disabled={!ready || sending}
          onClick={() => void toggleTransport()}
        >
          {summary.blocked ? "Reconnect sensor" : "Disconnect sensor"}
        </Button>
        {summary.pending > 0 && !summary.blocked && (
          <Button
            variant="outline"
            disabled={sending}
            onClick={() => void sync(true)}
          >
            Retry queued readings
          </Button>
        )}
      </div>
      <div
        className={`simulation-status ${error ? "error-text" : ""}`}
        role="status"
      >
        <span className={`status-dot ${running ? "live" : ""}`} />
        {message}
      </div>
      {summary.rejected.length > 0 && (
        <details className="evidence-details">
          <summary>Inspect rejected readings</summary>
          <ul>
            {summary.rejected.map((entry) => (
              <li key={entry.id}>
                <code>{entry.id}</code>: {entry.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
      <small>
        Readings are saved before transmission and survive refresh. Pausing
        demonstrates delayed (30s) and offline (90s) monitoring. Queue capacity:
        500 readings.
      </small>
    </section>
  );
}
