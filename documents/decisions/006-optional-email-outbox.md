# ADR-006 — Optional, disabled-by-default email outbox

Accepted for implementation on 7 November 2026 under the delegated review scope. No real email send is authorized. The environment currently contains Gemini configuration only; no email sender, recipient, or provider key is configured.

## Decision

Add one Resend HTTP adapter and a transactional outbox for unanswered-alert escalation. A stable request identity and frozen payload survive retries and process restarts. Provider acceptance is recorded separately from caregiver acknowledgement; it does not prove delivery, reading, or response. Existing in-app escalation remains available without the adapter.

The official [Resend idempotency documentation](https://resend.com/docs/dashboard/emails/idempotency-keys) supports `Idempotency-Key` for sending email and retains keys for 24 hours. The outbox therefore stops retries before 23 hours, caps attempts at six, and keeps the exact payload/key. A 30-second claim lease recovers an interrupted attempt; the HTTP timeout is eight seconds. Retries use actual wall time, independently of the synthetic demo clock. These limits are prototype policy, not evidence of external delivery.

Use the official [send-email endpoint](https://resend.com/docs/api-reference/emails/send-email), a verified sender, and one explicitly configured recipient. Do not include raw caregiver notes, vitals, provider credentials, or patient names in the email payload. An email records only synthetic episode metadata and a review request. Pending/retrying jobs are cancelled if the episode is acknowledged/resolved or its run is archived; a request already accepted by the provider cannot be withdrawn by this prototype.

Both explicit enablement and valid configuration are required. Disabled escalations remain Disabled and are never automatically sent later. Existing historical escalations are not backfilled. Tests use fixtures and a loopback receiver only; live delivery remains unverified until the participant authorizes a specific sender/recipient and a real test is performed.
