"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useWorkspace } from "./workspace-state";
import { VitalCards, VitalTrend, ReadingLog } from "./vitals-panels";
import { CareResponse } from "./care-response";
import { CaregiverNotes } from "./caregiver-notes";
import { DemoControls } from "./demo-controls";
import { Simulator } from "./simulator";

export function OverviewPage() {
  const { snapshot } = useWorkspace();
  const active =
    snapshot?.care.alerts.filter((alert) => alert.state !== "Resolved")
      .length ?? 0;
  return (
    <>
      <VitalCards />
      <VitalTrend />
      <section className="panel overview-next">
        <h2>Continue the care journey</h2>
        <p>
          {active
            ? `${active} unresolved episode${active === 1 ? "" : "s"} awaiting a recorded outcome.`
            : "No unresolved care episodes in this run."}
        </p>
        <div className="overview-links">
          <Link href="/care">Review care response →</Link>
          <Link href="/observations">Record caregiver observations →</Link>
          <Link href="/vitals">Inspect the reading log →</Link>
        </div>
      </section>
    </>
  );
}
export function VitalsPage() {
  return (
    <>
      <VitalCards />
      <VitalTrend />
      <ReadingLog />
    </>
  );
}
export function CarePage() {
  const { snapshot, error, refresh } = useWorkspace();
  return (
    <CareResponse
      alerts={snapshot?.care.alerts ?? []}
      workerLastTickAt={snapshot?.care.workerLastTickAt ?? null}
      disconnected={!!error}
      onChange={refresh}
    />
  );
}
export function ObservationsPage() {
  useEffect(() => {
    let id: string;
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    if (id !== "caregiver-notes" && !id.startsWith("note-")) return;
    const timer = setTimeout(() => document.getElementById(id)?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);
  const { snapshot, error, refresh } = useWorkspace();
  return (
    <CaregiverNotes
      runId={snapshot?.run.id ?? "local"}
      notes={snapshot?.care.notes ?? []}
      assessment={snapshot?.care.currentAssessment}
      serverTime={snapshot?.serverTime}
      disconnected={!!error}
      onChange={refresh}
    />
  );
}
export function SimulationPage() {
  const { snapshot, error, refresh } = useWorkspace();
  return (
    <div className="simulation-page">
      <DemoControls
        run={snapshot?.run}
        serverTime={snapshot?.serverTime}
        disconnected={!!error}
        onChange={refresh}
      />
      <Simulator />
    </div>
  );
}
