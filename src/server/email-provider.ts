import { z } from "zod";
import { readBoundedJson } from "./http";

export const emailPayloadSchema = z
  .object({
    from: z.email(),
    to: z.array(z.email()).length(1),
    subject: z.string().min(1).max(120),
    text: z.string().min(1).max(3000),
  })
  .strict();
export type EmailPayload = z.infer<typeof emailPayloadSchema>;
export type EmailConfig = {
  apiKey: string;
  from: string;
  to: string;
  endpoint?: string;
};
export type EmailProvider = {
  send(
    payload: EmailPayload,
    identity: string,
  ): Promise<{ acceptedId: string }>;
};

export class EmailFailure extends Error {
  readonly kind = "wardzero-email-failure";
  constructor(
    public readonly retryable: boolean,
    public readonly code: string,
    public readonly retryAfterMs = 0,
  ) {
    super(code);
  }
}
export function isEmailFailure(error: unknown): error is EmailFailure {
  return (
    error instanceof Error &&
    "kind" in error &&
    error.kind === "wardzero-email-failure" &&
    "retryable" in error &&
    typeof error.retryable === "boolean" &&
    "code" in error &&
    typeof error.code === "string" &&
    "retryAfterMs" in error &&
    typeof error.retryAfterMs === "number"
  );
}
function emailEndpoint(value = "https://api.resend.com/emails") {
  const endpoint = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if (
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== "/emails" ||
    !(
      endpoint.origin === "https://api.resend.com" ||
      (local && endpoint.protocol === "http:")
    )
  )
    throw Error(
      "Email endpoint must be Resend HTTPS or a loopback test receiver.",
    );
  return endpoint;
}
export function emailConfiguration(
  env: Record<string, string | undefined> = process.env,
): EmailConfig | null {
  if (env.WARDZERO_EMAIL_ENABLED !== "true") return null;
  const parsed = z
    .object({ apiKey: z.string().min(1), from: z.email(), to: z.email() })
    .safeParse({
      apiKey: env.WARDZERO_EMAIL_API_KEY,
      from: env.WARDZERO_EMAIL_FROM,
      to: env.WARDZERO_EMAIL_TO,
    });
  if (!parsed.success) return null;
  try {
    emailEndpoint(env.WARDZERO_EMAIL_ENDPOINT);
    return env.WARDZERO_EMAIL_ENDPOINT
      ? { ...parsed.data, endpoint: env.WARDZERO_EMAIL_ENDPOINT }
      : parsed.data;
  } catch {
    return null;
  }
}

export function createEmailProvider(
  config: EmailConfig,
  transport: typeof fetch = fetch,
): EmailProvider {
  const endpoint = emailEndpoint(config.endpoint);
  return {
    async send(payload, identity) {
      if (
        !emailPayloadSchema.safeParse(payload).success ||
        !identity ||
        identity.length > 256 ||
        /[\r\n]/.test(identity)
      )
        throw new EmailFailure(false, "invalid_payload");
      let response: Response;
      try {
        response = await transport(endpoint.href, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(8000),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
            "Idempotency-Key": identity,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        throw new EmailFailure(true, "network_or_timeout");
      }
      if (!response.ok) {
        const seconds = response.headers.get("retry-after") ?? "";
        let concurrent = false;
        if (response.status === 409) {
          try {
            const error = z
              .object({ name: z.string().max(100) })
              .parse(await readBoundedJson(response, 16000));
            concurrent = error.name === "concurrent_idempotent_requests";
          } catch {
            // Unknown/malformed conflicts remain permanent; never change request identity.
          }
        } else await response.body?.cancel();
        throw new EmailFailure(
          concurrent || response.status === 429 || response.status >= 500,
          `http_${response.status}`,
          /^\d+$/.test(seconds) ? Math.min(Number(seconds) * 1000, 3600000) : 0,
        );
      }
      try {
        const raw = await readBoundedJson(response, 16000);
        return {
          acceptedId: z.object({ id: z.string().min(1).max(100) }).parse(raw)
            .id,
        };
      } catch {
        throw new EmailFailure(true, "invalid_response");
      }
    },
  };
}

export function configuredEmailProvider(): EmailProvider | null {
  const config = emailConfiguration();
  return config ? createEmailProvider(config) : null;
}
