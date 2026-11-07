# Third-party components

Versions and resolved dependencies are pinned in `package-lock.json`. npm installs upstream license files alongside each package; those upstream notices continue to apply. The application repository does not grant a new license to its original source by listing dependencies here.

| Component | Installed version | Package license | Use |
|---|---|---|---|
| Next.js | 16.4.5 | MIT | App framework and server. |
| React / React DOM | 19.3.1 | MIT | Interface rendering. |
| PGlite | 0.5.15 | Apache-2.0 | Embedded PostgreSQL runtime. |
| Zod | 4.6.7 | MIT | Input and model-output validation. |
| Lucide React | 1.70.0 | ISC | Interface icons. |
| Playwright | 1.65.0 | Apache-2.0 | Chrome tests and actual-screen video capture. |
| axe Playwright integration | 4.14.0 | MPL-2.0 | Development accessibility checks. |
| shadcn/ui source components | CLI 4.23.0, customized | MIT | Buttons, badges, fields, textarea, loading placeholder. |
| Radix UI | 1.8.1 | MIT | Accessible slot, label and separator primitives. |
| cn | 0.5.2 | MIT | Tailwind class composition. |
| class-variance-authority | 0.7.1 | Apache-2.0 | Component variants. |
| Tailwind CSS / PostCSS integration | 4.3.5 | MIT | UI utility generation, restricted to application source. |

The CSS requests DM Sans and Manrope through Google Fonts, with Arial/sans-serif fallbacks. No font binaries are vendored into this repository. The app remains functional with fallback fonts if that request is unavailable.

The demo narration uses the installed Windows Microsoft Zira voice; FFmpeg encodes screen footage, audio, and captions. No music, stock photography, imported patient dataset, or third-party patient footage is used.
