# design/

Human-provided design inputs for NODUS. Agents read from here and never edit it (AGENTS.md §3.1).

- `references/` — screenshots, Figma exports, links, videos. One subfolder per surface
  (`landing`, `dashboard`, `graph`, `notes`, `tutor`, `other`). Add a short `notes.md` per
  subfolder saying what to copy (layout, colors, motion, etc.).
- `fonts/` — source font files (.woff2 / .ttf / .otf) plus a `fonts.md` listing family,
  weights and where each is used. The FE agent will wire them in via `next/font/local`
  and tokens in `app/globals.css`.
