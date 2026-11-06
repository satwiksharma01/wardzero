import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/server/database";
import { runIdentity } from "@/domain/demo";
export const dynamic = "force-dynamic";
export default async function Archive({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!runIdentity.safeParse(id).success) notFound();
  const store = await getStore();
  const runs = await store.demo.list();
  // A direct archive link can outlive the bounded recent-run index.
  let snapshot;
  try {
    snapshot = await store.snapshot(new Date(), id);
  } catch {
    notFound();
  }
  return (
    <main className="archive-page">
      <Link href="/" className="secondary-button">
        ← Back to care overview
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">READ-ONLY DEMO ARCHIVE</span>
          <h1>{snapshot.run.scenario.replaceAll("-", " ")}</h1>
          <p>
            Run {snapshot.run.id} · {snapshot.total} stored readings ·{" "}
            {snapshot.run.active ? "Current run" : "Archived run"}
          </p>
        </div>
      </div>
      <section className="panel">
        <h2>Recorded assessments and responses</h2>
        <p className="section-description">
          Last stored concern:{" "}
          {snapshot.care.lastAssessment?.concern ?? "Unknown"}. Archived data
          does not change the active run.
        </p>
        {snapshot.care.alerts.map((alert) => (
          <article className="alert-card" key={alert.id}>
            <div className="section-heading">
              <strong>
                {alert.severity} · {alert.state}
              </strong>
              <span>
                {alert.escalatedAt
                  ? "Escalated in-app"
                  : "No escalation recorded"}
              </span>
            </div>
            <ul>
              {alert.assessment.reasons.map((reason) => (
                <li key={reason.code}>{reason.message}</li>
              ))}
            </ul>
            <ol>
              {alert.events.map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.actorName} · {event.action}
                  </strong>
                  <p>{event.text}</p>
                  <small>{event.occurredAt}</small>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
      <section className="panel notes-panel">
        <h2>Caregiver observations</h2>
        {snapshot.care.notes.map((note) => (
          <article className="note-entry" key={note.id}>
            <strong>
              {note.authorName} · {note.status}
            </strong>
            <p>{note.text}</p>
            <small>{note.model ?? "No model output"}</small>
          </article>
        ))}
      </section>
      <section className="panel readings-panel">
        <h2>Recent reading evidence</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Observed</th>
                <th>Oxygen</th>
                <th>Pulse</th>
                <th>Temperature</th>
                <th>Respiration</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.history.map((reading) => (
                <tr key={reading.eventId}>
                  <td>{reading.observedAt}</td>
                  <td>{reading.metrics.oxygenPct}%</td>
                  <td>{reading.metrics.pulseBpm} bpm</td>
                  <td>{reading.metrics.temperatureC} °C</td>
                  <td>{reading.metrics.respiratoryRate}/min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <footer className="page-footer">
        Synthetic data · Read-only history · {runs.length} recent runs indexed
      </footer>
    </main>
  );
}
