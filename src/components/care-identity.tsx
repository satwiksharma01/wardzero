"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { UserCheck } from "lucide-react";
import { DEMO_ACTORS, type Actor, type DemoRole } from "@/domain/care";
import { Button } from "./ui/button";
import { useWorkspace } from "./workspace-state";
async function readActor(): Promise<Actor | null> {
  const response = await fetch("/api/demo/session", {
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Demo session unavailable.");
  return (await response.json()).actor;
}

type Identity = {
  actor: Actor | null;
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  busy: boolean;
  checking: boolean;
  error: string;
  activate: () => Promise<void>;
};
const IdentityContext = createContext<Identity | null>(null);
export function CareIdentityProvider({ children }: { children: ReactNode }) {
  const [actor, setActor] = useState<Actor | null>(null);
  const [role, setRole] = useState<DemoRole>("primary");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    void readActor().then(
      (value) => {
        if (active) {
          setActor(value);
          setRole(value?.id === DEMO_ACTORS.backup.id ? "backup" : "primary");
          setChecking(false);
        }
      },
      () => {
        if (active) {
          setError("Demo session unavailable. Retry activation.");
          setChecking(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);
  async function activate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/demo/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setActor(result.actor);
    } catch {
      setError("Could not activate the demo identity. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <IdentityContext.Provider
      value={{ actor, role, setRole, busy, checking, error, activate }}
    >
      {children}
    </IdentityContext.Provider>
  );
}
export function useCareIdentity() {
  const value = useContext(IdentityContext);
  if (!value) throw Error("Identity provider required");
  return value;
}
export function CareIdentityBar() {
  const { actor, role, setRole, busy, checking, error, activate } =
    useCareIdentity();
  const { error: disconnected } = useWorkspace();
  return (
    <>
      <div className="demo-identity">
        <UserCheck size={18} />
        <div>
          <strong>
            {actor
              ? `${actor.name} · ${actor.role}`
              : "No active caregiver session"}
          </strong>
          <small>Local demo identity</small>
        </div>
        <label className="sr-only" htmlFor="demo-role">
          Demo identity
        </label>
        <select
          id="demo-role"
          value={role}
          disabled={busy || checking || !!disconnected}
          onChange={(event) => setRole(event.target.value as DemoRole)}
        >
          <option value="primary">Ananya · Primary caregiver</option>
          <option value="backup">Ravi · Backup coordinator</option>
        </select>
        <Button
          variant="outline"
          disabled={busy || checking || !!disconnected}
          onClick={() => void activate()}
        >
          {checking
            ? "Checking identity…"
            : busy
              ? "Activating…"
              : "Activate identity"}
        </Button>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
