import { expect, it } from "vitest";
import {
  createEmailProvider,
  emailConfiguration,
} from "../src/server/email-provider";

const config = {
  apiKey: "fixture-key",
  from: "sender@example.invalid",
  to: "recipient@example.invalid",
};
const payload = {
  from: config.from,
  to: [config.to],
  subject: "Synthetic episode",
  text: "Synthetic alert metadata only.",
};

it("requires explicit opt-in and valid sender/recipient before external email is configured", () => {
  expect(emailConfiguration({})).toBeNull();
  expect(
    emailConfiguration({
      WARDZERO_EMAIL_API_KEY: "fixture-key",
      WARDZERO_EMAIL_FROM: config.from,
      WARDZERO_EMAIL_TO: config.to,
    }),
  ).toBeNull();
  expect(
    emailConfiguration({
      WARDZERO_EMAIL_ENABLED: "true",
      WARDZERO_EMAIL_API_KEY: "fixture-key",
      WARDZERO_EMAIL_FROM: config.from,
      WARDZERO_EMAIL_TO: "invalid",
    }),
  ).toBeNull();
  expect(
    emailConfiguration({
      WARDZERO_EMAIL_ENABLED: "true",
      WARDZERO_EMAIL_API_KEY: "fixture-key",
      WARDZERO_EMAIL_FROM: config.from,
      WARDZERO_EMAIL_TO: config.to,
    }),
  ).toEqual(config);
});

it("sends a stable JSON request and idempotency header and only records provider acceptance", async () => {
  let request: RequestInit | undefined;
  const provider = createEmailProvider(config, async (url, init) => {
    expect(url).toBe("https://api.resend.com/emails");
    request = init;
    return Response.json({ id: "provider-reference" });
  });
  expect(await provider.send(payload, "wardzero/escalation/episode-1")).toEqual(
    { acceptedId: "provider-reference" },
  );
  expect(new Headers(request?.headers).get("Idempotency-Key")).toBe(
    "wardzero/escalation/episode-1",
  );
  expect(JSON.parse(String(request?.body))).toEqual(payload);
  expect(request?.redirect).toBe("error");
});

it("accepts an explicit loopback test receiver and disables invalid endpoint configuration", () => {
  const env = {
    WARDZERO_EMAIL_ENABLED: "true",
    WARDZERO_EMAIL_API_KEY: config.apiKey,
    WARDZERO_EMAIL_FROM: config.from,
    WARDZERO_EMAIL_TO: config.to,
    WARDZERO_EMAIL_ENDPOINT: "http://127.0.0.1:3112/emails",
  };
  expect(emailConfiguration(env)).toEqual({
    ...config,
    endpoint: env.WARDZERO_EMAIL_ENDPOINT,
  });
  expect(
    emailConfiguration({
      ...env,
      WARDZERO_EMAIL_ENDPOINT: "https://untrusted.example/emails",
    }),
  ).toBeNull();
  expect(() =>
    createEmailProvider({
      ...config,
      endpoint: "https://api.resend.com:444/emails",
    }),
  ).toThrow();
});

it("distinguishes transient/permanent failures and refuses arbitrary credential destinations", async () => {
  await expect(
    createEmailProvider(
      config,
      async () =>
        new Response(null, { status: 429, headers: { "Retry-After": "30" } }),
    ).send(payload, "same-key"),
  ).rejects.toMatchObject({
    retryable: true,
    code: "http_429",
    retryAfterMs: 30000,
  });
  await expect(
    createEmailProvider(
      config,
      async () => new Response(null, { status: 401 }),
    ).send(payload, "same-key"),
  ).rejects.toMatchObject({ retryable: false, code: "http_401" });
  await expect(
    createEmailProvider(config, async () =>
      Response.json({ status: "not-an-acceptance" }),
    ).send(payload, "same-key"),
  ).rejects.toMatchObject({ retryable: true, code: "invalid_response" });
  expect(() =>
    createEmailProvider({
      ...config,
      endpoint: "https://untrusted.example/emails",
    }),
  ).toThrow();
});

it("retries only Resend's concurrent-idempotent 409 response, not a changed-payload conflict", async () => {
  for (const [name, retryable] of [
    ["concurrent_idempotent_requests", true],
    ["invalid_idempotent_request", false],
    ["unknown_conflict", false],
  ] as const) {
    await expect(
      createEmailProvider(config, async () =>
        Response.json({ name, message: "fixture" }, { status: 409 }),
      ).send(payload, "same-key"),
    ).rejects.toMatchObject({ retryable });
  }
});
