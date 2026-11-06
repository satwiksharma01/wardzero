import { describe, expect, it } from "vitest";
import { localRequestAllowed, readBoundedJson } from "../src/server/http";

describe("local API boundary", () => {
  it("uses the validated local Host when Next.js normalizes the internal request URL", () => {
    const request = new Request("http://localhost:3100/api/readings/batch", {
      headers: {
        host: "127.0.0.1:3100",
        origin: "http://127.0.0.1:3100",
        "content-type": "application/json",
      },
    });
    expect(localRequestAllowed(request, true)).toBe(true);
  });
  it("allows local same-origin JSON and rejects cross-origin or hosted mutation", () => {
    const request = (url: string, origin: string) =>
      new Request(url, {
        headers: { origin, "content-type": "application/json" },
      });
    expect(
      localRequestAllowed(
        request(
          "http://127.0.0.1:3000/api/readings/batch",
          "http://127.0.0.1:3000",
        ),
        true,
      ),
    ).toBe(true);
    expect(
      localRequestAllowed(
        request(
          "http://127.0.0.1:3000/api/readings/batch",
          "https://other.example",
        ),
        true,
      ),
    ).toBe(false);
    expect(
      localRequestAllowed(
        request(
          "https://public.example/api/readings/batch",
          "https://public.example",
        ),
        true,
      ),
    ).toBe(false);
  });
  it("rejects oversized and malformed JSON", async () => {
    await expect(
      readBoundedJson(
        new Request("http://localhost", {
          method: "POST",
          body: "x".repeat(128001),
        }),
      ),
    ).rejects.toThrow("Body too large");
    await expect(
      readBoundedJson(
        new Request("http://localhost", { method: "POST", body: "not-json" }),
      ),
    ).rejects.toThrow();
  });
});
