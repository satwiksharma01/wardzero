"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { History, RotateCcw, Timer } from "lucide-react";
import type { DemoRun, DemoRunSummary } from "@/domain/demo";
import { timeLabel } from "./vital-chart";
type Command =
  | { action: "reset"; id: string; scenario: string }
  | { action: "advance"; id: string; runId: string; seconds: number }
  | { action: "seed"; id: string; runId: string; scenario: string };
async function listRuns(): Promise<DemoRunSummary[]> {
  const response = await fetch("/api/demo", { cache: "no-store" });
  if (!response.ok) throw new Error("Run history unavailable.");
  return (await response.json()).runs;
}

export function DemoControls({
  run,
  serverTime,
  disconnected,
  onChange,
}: {
  run?: DemoRun;
  serverTime?: string;
  disconnected: boolean;
  onChange: () => Promise<void>;
}) {
  const [runs, setRuns] = useState<DemoRunSummary[]>([]);
  const [scenario, setScenario] = useState("stable");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<Command | null>(null);
  useEffect(() => {
    let active = true;
    void listRuns().then(
      (value) => {
        if (active) setRuns(value);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [run?.id]);
  async function execute(command: Command) {
    pending.current = command;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      pending.current = null;
      await onChange();
      setRuns(await listRuns());
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Demo action not confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || disconnected || !run;
  return (
    <section className="panel demo-panel" aria-labelledby="demo-title">
      <div className="section-heading">
        <div className="heading-with-icon">
          <Timer size={19} />
          <h2 id="demo-title">Demo control room</h2>
        </div>
        <span className="tag">Synthetic scenarios</span>
      </div>
      <p className="section-description">
        Use a primary caregiver identity. New runs preserve previous evidence
        and start with an empty timeline.
      </p>
      <div className="run-meta">
        <span>
          Active run <code data-testid="run-id">{run?.id ?? "Connecting"}</code>
        </span>
        <span>
          Demo time {serverTime ? timeLabel(serverTime) : "—"} · advanced{" "}
          {Math.round((run?.clockOffsetMs ?? 0) / 1000)}s
        </span>
      </div>
      <div className="demo-toolbar">
        <label className="sr-only" htmlFor="run-scenario">
          New run scenario
        </label>
        <select
          id="run-scenario"
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
          disabled={disabled}
        >
          <option value="stable">Stable recovery</option>
          <option value="deteriorating">Deterioration and response</option>
          <option value="outage">Connectivity outage</option>
          <option value="no-response">Unanswered alert</option>
        </select>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() =>
            void execute({ action: "reset", id: crypto.randomUUID(), scenario })
          }
        >
          <RotateCcw size={14} />
          New demo run
        </Button>
      </div>
      <div className="demo-toolbar">
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() =>
            void execute({
              action: "seed",
              id: crypto.randomUUID(),
              runId: run!.id,
              scenario: "stable",
            })
          }
        >
          Load stable baseline
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() =>
            void execute({
              action: "seed",
              id: crypto.randomUUID(),
              runId: run!.id,
              scenario: "deteriorating",
            })
          }
        >
          Load deterioration
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() =>
            void execute({
              action: "advance",
              id: crypto.randomUUID(),
              runId: run!.id,
              seconds: 35,
            })
          }
        >
          Advance 35 seconds
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() =>
            void execute({
              action: "advance",
              id: crypto.randomUUID(),
              runId: run!.id,
              seconds: 130,
            })
          }
        >
          Advance 130 seconds
        </Button>
      </div>
      <small>
        Advancing demo time also evaluates freshness and alert deadlines. It
        does not represent elapsed clinical hours. Pending sensor readings
        retain their original run.
      </small>
      {error && (
        <div className="demo-error" role="alert">
          <p>{error}</p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (pending.current) void execute(pending.current);
            }}
          >
            Retry demo action
          </Button>
        </div>
      )}
      <details className="run-history">
        <summary>
          <History size={14} />
          Previous runs
        </summary>
        <ul>
          {runs
            .filter((previous) => !previous.active)
            .map((previous) => (
              <li key={previous.id}>
                <div>
                  <strong>{previous.scenario.replaceAll("-", " ")}</strong>
                  <small>
                    {previous.readingCount} readings · {previous.noteCount}{" "}
                    notes · {previous.alertCount} alerts
                  </small>
                </div>
                <a
                  href={`/archive/${previous.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View archived run
                </a>
              </li>
            ))}
        </ul>
        {runs.length < 2 && <p>No earlier runs yet.</p>}
      </details>
    </section>
  );
}
