export function localRequestAllowed(
  request: Request,
  mutation = false,
): boolean {
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return false;
  const host = request.headers.get("host") ?? url.host;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host))
    return false;
  if (!mutation) return true;
  // This milestone is bound to loopback. Public deployment requires real authorization.
  // Next.js may normalize the internal URL to localhost; compare the browser origin to the validated Host.
  return (
    request.headers.get("origin") === `${url.protocol}//${host}` &&
    request.headers.get("content-type")?.split(";")[0] === "application/json"
  );
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 128000) {
      await reader.cancel();
      throw new Error("Body too large");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
