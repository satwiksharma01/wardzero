"use client";

import { useRef, useState } from "react";
import { FileText } from "lucide-react";
import type { CareNote } from "@/domain/notes";
import type { Assessment } from "@/domain/assessment";
import { noteEvidenceUse } from "@/domain/evidence";
import { timeLabel } from "./vital-chart";

export function CaregiverNotes({
  notes,
  disconnected,
  onChange,
  runId,
  assessment,
  serverTime,
}: {
  notes: CareNote[];
  disconnected: boolean;
  onChange: () => Promise<void>;
  runId: string;
  assessment?: Assessment;
  serverTime?: string;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<{ id: string; text: string } | null>(null);
  async function save(input: { id: string; text: string }, retry = false) {
    setBusy(true);
    setError("");
    if (!retry) pending.current = input;
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, runId }),
        signal: AbortSignal.timeout(22000),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500) pending.current = null;
        throw new Error(result.error);
      }
      if (!retry) {
        pending.current = null;
        setText("");
      }
      await onChange();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Note not confirmed. Retry with the same text.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="panel notes-panel"
      aria-labelledby="notes-title"
      id="caregiver-notes"
    >
      <div className="section-heading">
        <div className="heading-with-icon">
          <FileText size={19} />
          <h2 id="notes-title">Caregiver observations</h2>
        </div>
        <span className="tag">English notes</span>
      </div>
      <p className="section-description">
        Record what you notice between readings. Activate a caregiver identity
        in Care response before saving.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(
            pending.current ?? { id: crypto.randomUUID(), text: text.trim() },
          );
        }}
        className="care-action-form"
      >
        <label htmlFor="caregiver-note">Patient observation</label>
        <textarea
          id="caregiver-note"
          minLength={5}
          maxLength={2000}
          required
          value={text}
          disabled={busy || disconnected}
          onChange={(event) => {
            setText(event.target.value);
            pending.current = null;
          }}
          placeholder="For example: More tired today and barely ate lunch."
        />
        <button className="primary-button" disabled={busy || disconnected}>
          {busy ? "Saving and interpreting…" : "Save observation"}
        </button>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </form>
      {!notes.length && (
        <p className="notes-empty">No caregiver observations recorded yet.</p>
      )}
      {notes.map((note) => (
        <article className="note-entry" key={note.id} id={`note-${note.id}`}>
          <div className="section-heading">
            <strong>{note.authorName}</strong>
            <time dateTime={note.recordedAt} title={note.recordedAt}>
              Recorded {timeLabel(note.recordedAt)}
            </time>
          </div>
          <p>{note.text}</p>
          <span
            className={`analysis-status analysis-${note.status.toLowerCase()}`}
          >
            AI analysis: {note.status}
          </span>
          <p className="note-use" data-testid="note-use">
            {noteEvidenceUse(
              note,
              new Date(serverTime ?? note.recordedAt),
              assessment ?? null,
              disconnected,
            )}
          </p>
          {note.model && (
            <small>
              {note.model} · {note.promptVersion}
            </small>
          )}
          {note.failureReason && (
            <p className="analysis-limit">{note.failureReason}</p>
          )}
          {note.observations.length > 0 && (
            <ul>
              {note.observations.map((observation, index) => (
                <li key={index}>
                  <strong>{observation.code.replaceAll("_", " ")}</strong> ·{" "}
                  {observation.negated ? "negated" : "reported"} ·{" "}
                  {observation.temporality}
                  <blockquote>“{observation.excerpt}”</blockquote>
                </li>
              ))}
            </ul>
          )}
          {(note.status === "Failed" ||
            note.status === "Unavailable" ||
            note.status === "Pending") && (
            <button
              className="secondary-button"
              disabled={busy || disconnected}
              onClick={() => void save({ id: note.id, text: note.text }, true)}
            >
              Retry analysis
            </button>
          )}
          <details className="evidence-details">
            <summary>Observation reference</summary>
            <code>{note.id}</code>
          </details>
        </article>
      ))}
    </section>
  );
}
