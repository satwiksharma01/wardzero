"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

import { useWorkspaceDraft } from "./workspace-state";
import { useCareIdentity } from "./care-identity";
import { BellRing, CheckCircle2 } from "lucide-react";
import {
  DEMO_ACTORS,
  type Actor,
  type AlertEpisode,
  type CareAction,
} from "@/domain/care";
import { timeLabel } from "./vital-chart";
import type { EmailDeliveryState } from "@/domain/notifications";

const deliveryLabels: Record<EmailDeliveryState, string> = {
  Disabled: "Disabled; no send queued",
  Pending: "Queued",
  Sending: "Request in progress",
  Retry: "Awaiting retry",
  Accepted: "Provider accepted; delivery and reading unverified",
  Failed: "Not confirmed; retries stopped",
  Cancelled: "Cancelled before confirmation",
};

export function CareResponse({
  alerts,
  disconnected,
  onChange,
  workerLastTickAt,
}: {
  alerts: AlertEpisode[];
  disconnected: boolean;
  onChange: () => Promise<void>;
  workerLastTickAt: string | null;
}) {
  const { actor } = useCareIdentity();
  const coordinator = actor?.id === DEMO_ACTORS.backup.id;
  const visibleAlerts = coordinator
    ? alerts.filter((alert) => alert.escalatedAt)
    : alerts;
  return (
    <section
      className="panel response-panel"
      id="care-response"
      tabIndex={-1}
      aria-labelledby="response-title"
    >
      <div className="section-heading">
        <div className="heading-with-icon">
          <BellRing size={19} />
          <h2 id="response-title">
            {coordinator ? "Coordinator inbox" : "Care response"}
          </h2>
        </div>
        <span className="tag">
          {visibleAlerts.filter((alert) => alert.state !== "Resolved").length}{" "}
          active
        </span>
      </div>
      <p className="section-description">
        A concern needs an owner, a recorded action, and a clear outcome.
      </p>
      <p className="worker-status">
        {workerLastTickAt
          ? `Deadline worker checked ${timeLabel(workerLastTickAt)}`
          : "Waiting for deadline worker"}{" "}
        · In-app escalation; optional email is tracked separately
      </p>
      {!visibleAlerts.length && (
        <div className="care-empty">
          <CheckCircle2 size={22} />
          <div>
            <strong>
              {coordinator
                ? "No escalations in your inbox"
                : "No care alerts yet"}
            </strong>
            <p>
              An alert appears when fresh evidence reaches Medium or High demo
              concern.
            </p>
          </div>
        </div>
      )}
      {visibleAlerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          actor={actor}
          disconnected={disconnected}
          onChange={onChange}
        />
      ))}
    </section>
  );
}

function AlertCard({
  alert,
  actor,
  disconnected,
  onChange,
}: {
  alert: AlertEpisode;
  actor: Actor | null;
  disconnected: boolean;
  onChange: () => Promise<void>;
}) {
  const [draft, setDraft] = useWorkspaceDraft<{
    text: string;
    busy: boolean;
    error: string;
    pending: CareAction | null;
  }>(`action/${alert.id}`, { text: "", busy: false, error: "", pending: null });
  const { text, busy, error } = draft;
  const setText = (text: string) => setDraft((value) => ({ ...value, text }));
  const setBusy = (busy: boolean) => setDraft((value) => ({ ...value, busy }));
  const setError = (error: string) =>
    setDraft((value) => ({ ...value, error }));
  const assigned =
    actor?.id === alert.assignedActorId ||
    (!!alert.escalatedAt && actor?.id === alert.backupActorId);
  const resolved = alert.state === "Resolved";
  const action =
    alert.state === "Open"
      ? "acknowledge"
      : alert.state === "Acknowledged"
        ? "record-action"
        : "resolve";
  const needsText = action !== "acknowledge";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload: CareAction =
      draft.pending ??
      (action === "acknowledge"
        ? { eventId: crypto.randomUUID(), action }
        : { eventId: crypto.randomUUID(), action, text: text.trim() });
    setDraft((value) => ({ ...value, pending: payload }));
    try {
      const response = await fetch(`/api/alerts/${alert.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500)
          setDraft((value) => ({ ...value, pending: null }));
        throw new Error(result.error);
      }
      setDraft((value) => ({ ...value, pending: null }));
      setText("");
      await onChange();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Response not confirmed. Retry the same action.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className={`alert-card ${resolved ? "resolved" : ""}`}
      aria-label={`${alert.severity} concern alert ${alert.state}`}
    >
      <div className="section-heading">
        <div className="alert-title">
          <span
            className={`concern-badge concern-${alert.severity.toLowerCase()}`}
          >
            {alert.severity} concern
          </span>
          <strong>
            {alert.state === "ActionRecorded" ? "Action recorded" : alert.state}
          </strong>
        </div>
        <time dateTime={alert.openedAt}>{timeLabel(alert.openedAt)}</time>
      </div>
      <p className="alert-owner">
        Assigned to {DEMO_ACTORS.primary.name} · Primary caregiver
      </p>
      {alert.escalatedAt ? (
        <p className="escalation-banner">
          Escalated in-app to {DEMO_ACTORS.backup.name} at{" "}
          {timeLabel(alert.escalatedAt)}. The coordinator can now respond.
        </p>
      ) : alert.state === "Open" ? (
        <p className="deadline-label">
          Acknowledge by {timeLabel(alert.acknowledgementDueAt)}
        </p>
      ) : (
        <p className="deadline-label">
          Acknowledgement recorded · deadline timer stopped
        </p>
      )}
      {alert.escalatedAt && (
        <div className="email-delivery" data-testid="email-delivery">
          <strong>
            Optional email:{" "}
            {alert.emailDelivery
              ? deliveryLabels[alert.emailDelivery.state]
              : "No attempt recorded"}
          </strong>
          {alert.emailDelivery && (
            <small>
              {alert.emailDelivery.attempts} attempt
              {alert.emailDelivery.attempts === 1 ? "" : "s"}
              {alert.emailDelivery.nextAttemptAt
                ? ` · Next try ${timeLabel(alert.emailDelivery.nextAttemptAt)} (wall time)`
                : ""}
              {alert.emailDelivery.providerAcceptedAt
                ? ` · Acceptance recorded ${timeLabel(alert.emailDelivery.providerAcceptedAt)} (wall time)`
                : ""}
              . Caregiver acknowledgement is recorded separately.
            </small>
          )}
        </div>
      )}
      <ul className="alert-reasons">
        {alert.assessment.reasons.map((reason) => (
          <li key={reason.code}>{reason.message}</li>
        ))}
      </ul>
      <details className="evidence-details">
        <summary>Evidence for this alert</summary>
        <small>
          Assessment {alert.assessment.id} · {alert.assessment.ruleVersion}
        </small>
        <ul>
          {[
            ...new Set(
              alert.assessment.reasons.flatMap((reason) => [
                ...reason.eventIds,
                ...(reason.noteIds ?? []),
              ]),
            ),
          ].map((id) => (
            <li key={id}>
              <code>{id}</code>
            </li>
          ))}
        </ul>
      </details>
      {!resolved && (
        <form
          onSubmit={(event) => void submit(event)}
          className="care-action-form"
        >
          {!assigned && (
            <p className="assignment-hint">
              Activate the assigned primary caregiver to record a response.
            </p>
          )}
          {needsText && (
            <FieldGroup>
              <Field data-disabled={busy || !assigned || disconnected}>
                <FieldLabel htmlFor={`action-${alert.id}`}>
                  {action === "resolve"
                    ? "Resolution reason"
                    : "Caregiver action"}
                </FieldLabel>
                <Textarea
                  id={`action-${alert.id}`}
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    if (draft.pending)
                      setDraft((value) => ({ ...value, pending: null }));
                  }}
                  minLength={5}
                  maxLength={1000}
                  required
                  disabled={busy || !assigned || disconnected}
                  placeholder={
                    action === "resolve"
                      ? "Record why this alert can be closed."
                      : "Record what you did in response to this concern."
                  }
                />
              </Field>
            </FieldGroup>
          )}
          <Button disabled={busy || !assigned || disconnected}>
            {busy
              ? "Saving…"
              : error
                ? "Retry response"
                : action === "acknowledge"
                  ? "Acknowledge alert"
                  : action === "record-action"
                    ? "Record action"
                    : "Resolve alert"}
          </Button>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
      {resolved && (
        <p className="resolution-note">
          Response completed. The current concern above is assessed separately.
        </p>
      )}
      <details className="audit-history" open>
        <summary>Response history · {alert.events.length} events</summary>
        <ol>
          {alert.events.map((event) => (
            <li key={event.id}>
              <span className="audit-dot" />
              <div>
                <strong>{event.actorName}</strong>
                <span className="audit-action">
                  {event.action.replaceAll("-", " ")}
                </span>
                <p>{event.text}</p>
              </div>
              <time dateTime={event.occurredAt}>
                {timeLabel(event.occurredAt)}
              </time>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
