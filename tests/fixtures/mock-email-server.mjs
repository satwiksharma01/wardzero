import { createServer } from "node:http";

// Loopback-only protocol fixture. No cloud service or real email is involved.
const accepted = new Map();
let requests = 0;
let stableIdentityAndBody = true;
createServer(async (request, response) => {
  if (request.url === "/stats") {
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        requests,
        uniqueAccepted: accepted.size,
        stableIdentityAndBody,
      }),
    );
    return;
  }
  if (request.method !== "POST" || request.url !== "/emails") {
    response.writeHead(404).end();
    return;
  }
  let body = "";
  for await (const chunk of request) body += chunk;
  const key = request.headers["idempotency-key"];
  requests++;
  if (!key || request.headers.authorization !== "Bearer fixture-email-key") {
    response.writeHead(401).end();
    return;
  }
  const prior = accepted.get(key);
  if (!prior) {
    accepted.set(key, { body, id: `fixture-acceptance-${accepted.size + 1}` });
    // Simulate provider acceptance with a lost HTTP acknowledgement.
    response.destroy();
    return;
  }
  stableIdentityAndBody &&= prior.body === body;
  if (requests === 2) {
    response.writeHead(409, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ name: "concurrent_idempotent_requests" }));
    return;
  }
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ id: prior.id }));
}).listen(3112, "127.0.0.1");
