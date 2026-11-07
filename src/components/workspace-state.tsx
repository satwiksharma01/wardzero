"use client";
import { apiFetch } from "@/client/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Snapshot } from "@/domain/readings";
import { useSimulator } from "@/client/use-simulator";

type WorkspaceState = {
  snapshot: Snapshot | null;
  error: string | null;
  refresh: () => Promise<void>;
};
const WorkspaceContext = createContext<WorkspaceState | null>(null);
const SimulationContext = createContext<ReturnType<typeof useSimulator> | null>(
  null,
);
type DraftStore = {
  values: Record<string, unknown>;
  update: <T>(key: string, initial: T, update: SetStateAction<T>) => void;
};
const DraftContext = createContext<DraftStore | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const update = useCallback(
    <T,>(key: string, initial: T, action: SetStateAction<T>) => {
      setValues((previous) => ({
        ...previous,
        [key]:
          typeof action === "function"
            ? (action as (value: T) => T)((previous[key] as T) ?? initial)
            : action,
      }));
    },
    [],
  );
  const refresh = useCallback(async () => {
    try {
      const response = await apiFetch("/api/patient", {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw Error("Readings unavailable");
      const data: Snapshot = await response.json();
      setSnapshot((previous) =>
        previous && Date.parse(previous.wallTime) > Date.parse(data.wallTime)
          ? previous
          : data,
      );
      setError(null);
    } catch {
      setError(
        "Connection unavailable. Displaying last-known readings; current monitoring status cannot be confirmed.",
      );
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);
  return (
    <WorkspaceContext.Provider value={{ snapshot, error, refresh }}>
      <DraftContext.Provider value={{ values, update }}>
        {children}
      </DraftContext.Provider>
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw Error("Workspace provider required");
  return value;
}
export function useWorkspaceDraft<T>(
  key: string,
  initial: T,
): [T, (action: SetStateAction<T>) => void] {
  const store = useContext(DraftContext);
  if (!store) throw Error("Draft provider required");
  return [
    (store.values[key] as T) ?? initial,
    (action) => store.update(key, initial, action),
  ];
}
export function SimulationBoundary({ children }: { children: ReactNode }) {
  const { snapshot, refresh } = useWorkspace();
  if (!snapshot)
    return <p className="workspace-loading">Loading patient workspace…</p>;
  return (
    <ActiveSimulation
      key={snapshot.run.id}
      run={snapshot.run}
      refresh={refresh}
    >
      {children}
    </ActiveSimulation>
  );
}
function ActiveSimulation({
  children,
  run,
  refresh,
}: {
  children: ReactNode;
  run: Snapshot["run"];
  refresh: () => Promise<void>;
}) {
  const simulation = useSimulator(refresh, run);
  return (
    <SimulationContext.Provider value={simulation}>
      {children}
    </SimulationContext.Provider>
  );
}
export function useSimulation() {
  const value = useContext(SimulationContext);
  if (!value) throw Error("Simulation provider required");
  return value;
}
