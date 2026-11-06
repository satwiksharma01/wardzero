import { Info, ShieldCheck, Stethoscope } from "lucide-react";
import type { CareSnapshot } from "@/domain/care";
import { timeLabel } from "./vital-chart";

export function CareContext({
  care,
  fresh,
  disconnected,
}: {
  care?: CareSnapshot;
  fresh: boolean;
  disconnected: boolean;
}) {
  const assessment = disconnected ? null : care?.currentAssessment;
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
      >
        <ShieldCheck size={20} />
        <strong data-testid="concern-level">
          {disconnected ? "Unavailable" : (assessment?.concern ?? "Unknown")}
        </strong>
      </div>
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
                {[...reason.eventIds, ...(reason.noteIds ?? [])].map((id) => (
                  <li key={id}>
                    <code>{id}</code>
                  </li>
                ))}
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
