"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BellRing,
  ChevronRight,
  FileText,
  FlaskConical,
  House,
  Info,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useWorkspace, SimulationBoundary } from "./workspace-state";
import { CareIdentityBar } from "./care-identity";
import { CareContext } from "./care-context";
import { timeLabel } from "./vital-chart";
import { workspaceRoutes } from "./workspace-routes";
const icons = [LayoutDashboard, Activity, BellRing, FileText, FlaskConical];
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const route =
    workspaceRoutes.find((route) => route.href === path) ?? workspaceRoutes[0];
  const { snapshot, error, refresh } = useWorkspace();
  const history = snapshot?.history ?? [];
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
        <Link className="brand" href="/" aria-label="WardZero home">
          <span className="brand-mark">
            <Activity size={24} />
          </span>
          wardzero<span className="brand-dot">.</span>
        </Link>
        <span className="nav-caption">Your workspace</span>
        <nav aria-label="Workspace">
          {workspaceRoutes.map((item, index) => {
            const Icon = icons[index];
            const selected = path === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${selected ? "selected" : ""}`}
                aria-current={selected ? "page" : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
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
            Workspace
            <ChevronRight size={13} />
            <span>{route.label}</span>
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
              <h1>{route.title}</h1>
              <p>{route.description}</p>
            </div>
            <div className="heading-actions">
              <Button variant="outline" asChild>
                <Link href="/simulation">
                  Open simulator
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild>
                <Link href="/observations#caregiver-notes">
                  <FileText data-icon="inline-start" />
                  Record observation
                </Link>
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
                <Link href="/care">
                  View care response
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          )}
          <div className="patient-evidence-meta">
            <span>
              {history.length} recent / {snapshot?.total ?? 0} stored
            </span>
            <span>
              {snapshot?.latest
                ? `Observed ${timeLabel(snapshot.latest.observedAt)}`
                : snapshot
                  ? "Awaiting first reading"
                  : "Connecting to monitor…"}
            </span>
          </div>
          <CareIdentityBar />
          <div className="route-layout">
            <div className="route-content">
              <SimulationBoundary>{children}</SimulationBoundary>
            </div>
            <CareContext
              history={history}
              care={snapshot?.care}
              fresh={fresh}
              disconnected={!!error}
            />
          </div>
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
