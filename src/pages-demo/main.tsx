import { Component, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { WorkspaceProvider, useWorkspace } from "../components/workspace-state";
import { CareIdentityProvider } from "../components/care-identity";
import { WorkspaceShell } from "../components/workspace-shell";
import {
  OverviewPage,
  VitalsPage,
  CarePage,
  ObservationsPage,
  SimulationPage,
} from "../components/workspace-pages";
import { ArchiveView } from "../components/archive-view";
import { workspaceRoutes } from "../components/workspace-routes";
import type { Snapshot } from "../domain/readings";
import { getBrowserStore } from "./database";
import Link, { usePathname } from "./router";
import { SAMPLE_NOTE } from "./note-fixture";
import "../app/globals.css";
import "./pages.css";

function Archive({ id }: { id: string }) {
  const [result, setResult] = useState<{
    snapshot: Snapshot;
    runCount: number;
  } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void getBrowserStore()
      .then(async (store) => ({
        snapshot: await store.snapshot(new Date(), id),
        runCount: (await store.demo.list()).length,
      }))
      .then(
        (result) => {
          if (active) setResult(result);
        },
        () => {
          if (active) setError(true);
        },
      );
    return () => {
      active = false;
    };
  }, [id]);
  if (error)
    return (
      <main className="archive-page">
        <h1>Archive unavailable</h1>
        <p>This run is not available in this browser.</p>
        <Link href="/">Back to overview</Link>
      </main>
    );
  return result ? (
    <ArchiveView {...result} />
  ) : (
    <p className="workspace-loading" role="status">
      Loading archived evidence…
    </p>
  );
}

function BrowserRecovery() {
  const { error } = useWorkspace();
  return error ? (
    <section className="pages-notice" aria-label="Browser demo recovery">
      <p>
        Allow this site to store data and check that its database download is
        not blocked, then reload.
      </p>
      <button onClick={() => location.reload()}>Reload demo</button>
    </section>
  ) : null;
}

function App() {
  const path = usePathname();
  const index = workspaceRoutes.findIndex((route) => route.href === path);
  const pages = [
    OverviewPage,
    VitalsPage,
    CarePage,
    ObservationsPage,
    SimulationPage,
  ];
  const Page = pages[index];
  useEffect(() => {
    document.title = `WardZero · ${workspaceRoutes[index]?.label ?? "Archive"} · Browser demo`;
  }, [index]);
  return (
    <div
      className={path.startsWith("/archive/") ? "pages-archive" : "pages-app"}
    >
      <aside className="pages-notice" aria-label="Browser demo information">
        <div>
          <strong>Browser demo</strong>
          <span>
            Data stays on this device. No live AI, email or monitoring after you
            close the app.
          </span>
        </div>
        <a href="https://github.com/satwiksharma01/wardzero#quick-start">
          Run with Gemini ↗
        </a>
      </aside>
      {path.startsWith("/archive/") ? (
        <Archive key={path} id={path.slice(9)} />
      ) : (
        <WorkspaceProvider>
          <BrowserRecovery />
          <CareIdentityProvider>
            <WorkspaceShell>
              {path === "/observations" && (
                <section className="panel pages-note-help">
                  <h2>Try the sample observation</h2>
                  <p>
                    Only this exact sample uses a fixed interpretation, labeled
                    in its evidence. Other notes are saved with analysis
                    Unavailable.
                  </p>
                  <blockquote>{SAMPLE_NOTE}</blockquote>
                  <p>
                    Paste it below after loading a stable baseline. The full
                    server app uses Gemini.
                  </p>
                </section>
              )}
              {Page ? (
                <Page />
              ) : (
                <section className="panel">
                  <h2>Page not found</h2>
                  <Link href="/">Back to overview</Link>
                </section>
              )}
            </WorkspaceShell>
          </CareIdentityProvider>
        </WorkspaceProvider>
      )}
      <footer className="pages-licenses">
        <a href="./LICENSES.md">Dependency licenses</a>
        <a href="./shadcn-ui.txt">UI source notice</a>
        <a href="https://github.com/satwiksharma01/wardzero">Source code</a>
      </footer>
    </div>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="archive-page">
        <h1>The demo could not open</h1>
        <p>
          Use a current browser with site storage, WebAssembly and Web Workers
          enabled, then reload.
        </p>
        <button onClick={() => location.reload()}>Reload demo</button>
      </main>
    ) : (
      this.props.children
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
