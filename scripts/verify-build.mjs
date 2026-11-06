import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const server = path.join(root, ".next", "server");
async function traces(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => traces(path.join(directory, entry.name))),
  );
  return [
    ...entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".nft.json"))
      .map((entry) => path.join(directory, entry.name)),
    ...nested.flat(),
  ];
}
const files = await traces(server);
if (!files.length) throw new Error("No server build traces found.");
const forbidden = [];
for (const trace of files) {
  const manifest = JSON.parse(await readFile(trace, "utf8"));
  for (const file of manifest.files ?? []) {
    const resolved = path.resolve(path.dirname(trace), file);
    const relative = path.relative(root, resolved).replaceAll("\\", "/");
    if (
      relative === ".data" ||
      relative.startsWith(".data/") ||
      /^\.env(\.|$)/.test(relative)
    )
      forbidden.push({ trace: path.relative(root, trace), file: relative });
  }
}
if (forbidden.length) {
  for (const entry of forbidden.slice(0, 10))
    process.stderr.write(
      `${entry.trace}: forbidden runtime artifact ${entry.file}\n`,
    );
  throw new Error(
    `${forbidden.length} runtime/private files appear in build traces.`,
  );
}
process.stdout.write(
  `Verified ${files.length} server trace manifests: no runtime database or private environment files.\n`,
);
