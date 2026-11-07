import { defineConfig } from "vite";
import path from "node:path";
import tailwindcss from "@tailwindcss/postcss";
import { readFileSync } from "node:fs";

const source = (file: string) => path.resolve(import.meta.dirname, "src", file);

export default defineConfig({
  root: source("pages-demo"),
  base: "./",
  publicDir: false,
  // Never load private local server configuration into the public demo build.
  envDir: false,
  define: { "process.env": "{}" },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [
    {
      name: "wardzero-notices",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "shadcn-ui.txt",
          source: readFileSync(
            path.resolve(import.meta.dirname, "LICENSES/shadcn-ui.txt"),
            "utf8",
          ),
        });
      },
    },
  ],
  resolve: {
    alias: [
      { find: "@/client/api", replacement: source("pages-demo/api.ts") },
      { find: "next/link", replacement: source("pages-demo/router.tsx") },
      { find: "next/navigation", replacement: source("pages-demo/router.tsx") },
      { find: "@", replacement: source("") },
    ],
  },
  worker: { format: "es" },
  build: {
    outDir: path.resolve(import.meta.dirname, ".data/pages"),
    emptyOutDir: true,
    license: { fileName: "LICENSES.md" },
    rolldownOptions: {
      onwarn(warning, warn) {
        // This entry is entirely client-side; React Server Component markers have no role here.
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes("use client")
        )
          return;
        warn(warning);
      },
    },
  },
});
