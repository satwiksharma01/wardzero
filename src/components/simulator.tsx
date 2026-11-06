"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, FlaskConical, Pause, Play, Radio } from "lucide-react";
import {
  makeReading,
  type IngestResult,
  type Reading,
  type Scenario,
} from "@/domain/readings";

export function Simulator({ onReading }: { onReading: () => Promise<void> }) {
  const [scenario, setScenario] = useState<Scenario>("stable");
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(
    "Ready to send. No physical device needed.",
  );
  const [error, setError] = useState(false);
  const sequence = useRef(0);
  const busy = useRef(false);
  const pending = useRef<Reading | null>(null);

  const send = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSending(true);
    const event =
      pending.current ??
      makeReading(sequence.current, scenario, new Date(), crypto.randomUUID());
    pending.current = event;
    try {
      const response = await fetch("/api/readings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readings: [event] }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw new Error("Reading could not be stored. Retry this reading.");
      const data: { results: IngestResult[] } = await response.json();
      const result = data.results[0];
      if (!["accepted", "duplicate"].includes(result.status)) {
        pending.current = null;
        throw new Error(
          result.reason ?? "Reading rejected. Send a new reading.",
        );
      }
      pending.current = null;
      sequence.current += 1;
      setMessage(
        `Reading ${sequence.current} ${result.status === "duplicate" ? "already stored" : "stored"}. Dashboard updated.`,
      );
      setError(false);
      await onReading();
    } catch (failure) {
      setRunning(false);
      setMessage(
        failure instanceof Error
          ? failure.message
          : "Connection failed. Retry this reading.",
      );
      setError(true);
    } finally {
      busy.current = false;
      setSending(false);
    }
  }, [scenario, onReading]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      void send();
    }, 5000);
    return () => clearInterval(timer);
  }, [running, send]);

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
            disabled={running || sending || error}
            onChange={(event) => {
              setScenario(event.target.value as Scenario);
              sequence.current = 0;
            }}
          >
            <option value="stable">Stable recovery</option>
            <option value="deteriorating">Gradual deterioration</option>
          </select>
        </div>
        <button
          className="primary-button"
          disabled={sending}
          onClick={() => void send()}
        >
          <Radio size={16} />
          {sending ? "Sending…" : error ? "Retry reading" : "Send one reading"}
          <ArrowUpRight size={15} />
        </button>
        <button
          className="secondary-button"
          disabled={sending || error}
          onClick={() => setRunning((value) => !value)}
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? "Pause stream" : "Stream every 5s"}
        </button>
      </div>
      <div
        className={`simulation-status ${error ? "error-text" : ""}`}
        role="status"
      >
        <span className={`status-dot ${running ? "live" : ""}`} />
        {message}
      </div>
      <small>
        Pausing the stream lets you inspect delayed (30s) and offline (90s)
        monitoring. These are demo timing settings.
      </small>
    </section>
  );
}
