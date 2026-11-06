// Protocol fixture only. This is not model inference and is never the production default.
import { createServer } from "node:http";
createServer(async (request, response) => {
  if (request.method === "GET") {
    response.end("mock-ready");
    return;
  }
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 32000) {
      response.writeHead(413).end();
      return;
    }
  }
  const parsed = JSON.parse(body);
  const note = JSON.parse(parsed.messages.at(-1).content).caregiver_note;
  if (note.includes("[MOCK_FAILURE]")) {
    response.writeHead(503).end();
    return;
  }
  const observations =
    note === "More tired today and barely ate lunch."
      ? [
          {
            code: "fatigue",
            excerpt: "More tired today",
            negated: false,
            temporality: "current",
          },
          {
            code: "reduced_intake",
            excerpt: "barely ate lunch",
            negated: false,
            temporality: "current",
          },
        ]
      : [];
  response.writeHead(200, { "Content-Type": "application/json" }).end(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ observations }) } }],
    }),
  );
}).listen(3111, "127.0.0.1");
