"use client";
import { apiFetch } from "@/client/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { makeReading, type Scenario } from "../domain/readings";
import { Outbox, type QueueSummary } from "./outbox";
import type { DemoRun } from "../domain/demo";

export function useSimulator(onReading: () => Promise<void>, run: DemoRun) {
  const [outbox] = useState(() => new Outbox());
  const [summary, setSummary] = useState<QueueSummary>({
    pending: 0,
    rejected: [],
    blocked: false,
  });
  const [ready, setReady] = useState(false);
  const [scenario, updateScenario] = useState<Scenario>(
    run.scenario === "deteriorating" || run.scenario === "no-response"
      ? "deteriorating"
      : "stable",
  );
  const [running, setRunning] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(
    "Ready to send. No physical device needed.",
  );
  const [error, setError] = useState(false);
  const sequence = useRef(0);
  const generating = useRef(false);
  const syncing = useRef(false);
  const sync = useCallback(
    async (force = false) => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        const current = await outbox.summary();
        setSummary(current);
        if (current.blocked) return;
        const batch = await outbox.pending(force ? Infinity : Date.now());
        if (!batch.length) return;
        try {
          const response = await apiFetch("/api/readings/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              readings: batch.map((entry) => entry.reading),
            }),
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) throw new Error("Transport unavailable");
          const result = await response.json();
          await outbox.acknowledge(batch, result.results);
          const after = await outbox.summary();
          setSummary(after);
          setError(after.rejected.length > 0);
          setMessage(
            after.rejected.length
              ? "Some readings were rejected. Inspect the retained entries below."
              : "Queued readings synced. Original observation times preserved.",
          );
          await onReading();
        } catch {
          await outbox.failed(batch);
          setError(true);
          setMessage(
            "Sensor transport unavailable. Readings are saved in this browser and will retry automatically.",
          );
        }
      } catch {
        setError(true);
        setMessage(
          "Browser storage is unavailable. Sensor generation is paused; no reading was confirmed saved.",
        );
        setRunning(false);
      } finally {
        syncing.current = false;
      }
    },
    [outbox, onReading],
  );
  useEffect(() => {
    let active = true;
    void outbox.configureRun(run.id).then(
      (value) => {
        if (active) {
          setSummary(value);
          setReady(true);
        }
      },
      () => {
        if (active) {
          setError(true);
          setMessage(
            "Browser storage unavailable. Enable browser storage before generating readings.",
          );
        }
      },
    );
    const timer = setInterval(() => {
      if (active) void sync();
    }, 2000);
    const reconnect = () => {
      if (active) void sync(true);
    };
    window.addEventListener("online", reconnect);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", reconnect);
    };
  }, [outbox, sync, run.id]);
  const send = useCallback(async () => {
    if (generating.current || !ready) return;
    generating.current = true;
    setSending(true);
    try {
      const reading = makeReading(
        sequence.current,
        scenario,
        new Date(Date.now() + run.clockOffsetMs),
        crypto.randomUUID(),
        run.id,
      );
      await outbox.enqueue(reading);
      sequence.current++;
      await sync();
      const after = await outbox.summary();
      setSummary(after);
      if (!after.pending && !after.rejected.length) {
        setMessage(`Reading ${sequence.current} stored. Dashboard updated.`);
        setError(false);
      } else if (after.blocked) {
        setMessage(
          `Reading ${sequence.current} queued durably. Reconnect sensor transport to sync.`,
        );
        setError(false);
      }
    } catch (failure) {
      setRunning(false);
      setError(true);
      setMessage(
        failure instanceof Error
          ? failure.message
          : "Reading could not be saved in browser storage.",
      );
    } finally {
      generating.current = false;
      setSending(false);
    }
  }, [outbox, ready, scenario, sync, run.clockOffsetMs, run.id]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      void send();
    }, 5000);
    return () => clearInterval(timer);
  }, [running, send]);
  async function toggleTransport() {
    try {
      const before = await outbox.summary();
      await outbox.setBlocked(!before.blocked);
      setSummary(await outbox.summary());
      setMessage(
        before.blocked
          ? "Sensor transport reconnected. Synchronizing pending readings."
          : "Sensor transport disconnected. Readings will be stored in this browser.",
      );
      if (before.blocked) await sync(true);
    } catch {
      setError(true);
      setMessage("Could not change transport state in browser storage.");
    }
  }
  function setScenario(value: Scenario) {
    sequence.current = 0;
    updateScenario(value);
  }
  return {
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
  };
}
