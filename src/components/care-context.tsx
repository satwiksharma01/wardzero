import { Info, ShieldCheck, Stethoscope } from "lucide-react";
import type { CareSnapshot } from "@/domain/care";
import type { StoredReading } from "@/domain/readings";
import { timeLabel } from "./vital-chart";

export function CareContext({
  care,
  fresh,
  disconnected,
  history = [],
}: {
  care?: CareSnapshot;
  fresh: boolean;
  disconnected: boolean;
  history?: StoredReading[];
}) {
  const assessment = disconnected ? null : care?.currentAssessment;
  const incomplete = assessment
    ? (care?.notes.filter(
        (note) =>
          note.status !== "Complete" &&
          Date.parse(assessment.evaluatedAt) - Date.parse(note.recordedAt) >=
            0 &&
          Date.parse(assessment.evaluatedAt) - Date.parse(note.recordedAt) <
            120000,
      ).length ?? 0)
    : 0;
  return (
    <section
      className="panel care-context"
      aria-labelledby="care-context-title"
    >
      <div className="section-heading">
        <h2 id="care-context-title">Care context</h2>
        <Stethoscope size={18} />
      </div>
      <span className="context-label">CURRENT CONCERN · DEMO RULES</span>
      <div
        className={`assessment-status concern-${assessment?.concern.toLowerCase() ?? "unknown"}`}
        aria-live="polite"
      >
        <ShieldCheck size={20} />
        <strong data-testid="concern-level">
          {disconnected ? "Unavailable" : (assessment?.concern ?? "Unknown")}
        </strong>
      </div>
      {assessment && (
        <div className="evidence-summary">
          <strong>
            {assessment.concern === "Unknown"
              ? "Fresh evidence needed"
              : assessment.reasons.some((reason) => reason.noteIds?.length)
                ? "Vitals + caregiver observations"
                : "Vital readings"}
          </strong>
          <span>
            Assessed{" "}
            <time
              dateTime={assessment.evaluatedAt}
              title={assessment.evaluatedAt}
            >
              {timeLabel(assessment.evaluatedAt)}
            </time>
          </span>
          {assessment.latestObservedAt && (
            <span>
              Latest reading{" "}
              <time
                dateTime={assessment.latestObservedAt}
                title={assessment.latestObservedAt}
              >
                {timeLabel(assessment.latestObservedAt)}
              </time>
            </span>
          )}
        </div>
      )}
      {assessment?.reasons
        .filter(
          (reason, index) =>
            index === 0 ||
            reason.code === "combined-trend" ||
            reason.code === "caregiver-context",
        )
        .map((reason) => (
          <p className="assessment-reason" key={reason.code}>
            {reason.message}
          </p>
        ))}
      {incomplete > 0 && (
        <p className="context-analysis-limit">
          Caregiver context incomplete: {incomplete} recent observation
          {incomplete === 1 ? " has" : "s have"} no completed analysis.{" "}
          <a href="#caregiver-notes">Review original notes</a>.
        </p>
      )}
      {!assessment && (
        <p>
          {disconnected
            ? "Reconnect to confirm the current assessment."
            : "Waiting for enough recent observations."}
        </p>
      )}
      {assessment && (
        <details className="evidence-details">
          <summary>Inspect assessment evidence</summary>
          <small>
            Rules: {assessment.ruleVersion} · evaluated{" "}
            {timeLabel(assessment.evaluatedAt)}
          </small>
          {assessment.reasons.map((reason) => (
            <div key={reason.code}>
              <strong>{reason.code}</strong>
              <p>{reason.message}</p>
              <ul>
                {[
                  ...reason.eventIds.map((id) => ({
                    id,
                    kind: "reading" as const,
                  })),
                  ...(reason.noteIds ?? []).map((id) => ({
                    id,
                    kind: "note" as const,
                  })),
                ].map(({ id, kind }) => {
                  const reading =
                    kind === "reading"
                      ? history.find((item) => item.eventId === id)
                      : undefined;
                  const note =
                    kind === "note"
                      ? care?.notes.find((item) => item.id === id)
                      : undefined;
                  return (
                    <li key={`${kind}-${id}`}>
                      {reading ? (
                        <>
                          <strong>
                            Reading · {timeLabel(reading.observedAt)}
                          </strong>
                          <p>
                            {reading.metrics.oxygenPct}% SpO₂ ·{" "}
                            {reading.metrics.pulseBpm} bpm ·{" "}
                            {reading.metrics.temperatureC} °C ·{" "}
                            {reading.metrics.respiratoryRate}/min
                          </p>
                        </>
                      ) : note ? (
                        <a href={`#note-${id}`}>
                          Caregiver note · {timeLabel(note.recordedAt)} ·{" "}
                          {note.status}
                        </a>
                      ) : (
                        <span>Reference outside the recent snapshot</span>
                      )}
                      <code>{id}</code>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </details>
      )}
      {assessment?.concern === "Unknown" &&
        care?.lastAssessment &&
        care.lastAssessment.concern !== "Unknown" && (
          <p className="last-assessment">
            Last stored assessment: {care.lastAssessment.concern} at{" "}
            {timeLabel(care.lastAssessment.evaluatedAt)}. This does not
            establish current condition.
          </p>
        )}
      <div className="context-divider" />
      <span className="context-label">DATA CONFIDENCE</span>
      <strong className="confidence-title">
        {fresh ? "Fresh observations" : "Fresh evidence needed"}
      </strong>
      <p>
        {fresh
          ? "The monitor has received a recent measurement."
          : "Check the last observation time before interpreting these readings."}
      </p>
      <div className="context-tip">
        <Info size={15} />
        <span>
          Synthetic scenario rules; not a validated clinical score. Monitoring
          status describes freshness.
        </span>
      </div>
    </section>
  );
}
