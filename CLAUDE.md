# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

Pre-implementation. The repo currently contains only `prd.md` — the full product spec for **Claude Code Quiz**, a true/false web quiz about Claude Code with a real-time global ranking. All code still needs to be written; `prd.md` is the source of truth for behavior, UI strings, data model, and the 30 quiz questions. Read it before making any non-trivial change.

## Stack & Architecture

- **No build tooling.** Static frontend: HTML5 + CSS3 + vanilla ES6+ JS, loaded directly via `index.html` (open the file or serve from any static host). The Supabase JS client is loaded via CDN, not npm.
- **Single-page app, multiple "screens"** (Home, Registro, Quiz, Feedback, Resultado, Ranking) toggled by JS — not separate routes.
- **Backend = Supabase only** (PostgreSQL + Realtime). The anon key ships in the frontend; security is enforced by Row Level Security policies, not by hiding the key.
- **Static questions, dynamic scores.** `questions.json` (30 items, 3 levels × 10) is loaded once on the client. Only attempts and participants hit the database. Don't move questions into the DB.

Planned file layout (see PRD §7.3):
```
index.html  style.css  app.js  supabase.js  ranking.js  questions.json
```

### Data flow

- `participants` (uuid + name) → created on first quiz start; `id` cached in `localStorage` as `ccquiz_participant_id`.
- `quiz_attempts` (one row per completion) → INSERT-only from the client.
- `ranking_global` view → derives the leaderboard by picking each participant's **best** attempt (highest %, then lowest time).
- Realtime subscription on `quiz_attempts` INSERT triggers a re-fetch of the ranking view (see PRD §7.8 for the exact channel pattern).

### Ranking ordering (don't get this wrong)

1. `percentage` DESC
2. `time_seconds` ASC (tiebreaker)

Each participant appears **once** with their best attempt — this is enforced by the `ranking_global` view, not client-side dedup.

## localStorage keys

`ccquiz_name`, `ccquiz_participant_id`, `ccquiz_best_scores` — see PRD §7.6 for the schema. Reuse these exact keys.

## UI conventions

- **Language: Portuguese (pt-BR).** All user-facing strings.
- **Design system is fixed** — colors (Anthropic coral `#D97757` on dark `#1A1A1A`), Inter font, max card width 680px, mobile-first. See PRD §6 before changing visual styling.
- Score classification bands (PRD §6.5) are user-visible copy — don't reword without checking the PRD.
- Accessibility requirements are explicit (PRD §7.9): WCAG AA contrast, keyboard nav, `aria-label` on V/F buttons, `aria-live="polite"` on feedback area, `role="progressbar"`.

## Environment

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

Both are inlined into the frontend (anon key is public by Supabase design). There is no `.env` loader — wire them directly into `supabase.js` or via a small config object.

## Out of scope for v1 (PRD §9)

Auth with passwords, attempt edit/delete, admin dashboard, per-level rankings, i18n, analytics, PWA. Don't add these without an explicit ask.
