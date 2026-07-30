# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run all commands from `music-app/` (the actual app root; the repo root only holds `LICENSE`/`.gitignore` above it).

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then production-build with Vite
- `npm run lint` — ESLint over the whole project
- `npm run preview` — serve the production build locally

There is no test framework configured in this project (no test script, no test files).

## Architecture

This is a single-page React + TypeScript app (Vite, react-router-dom) that hosts a set of independent music-training quizzes, organized into **sections**. Each section is: a section hub page + one or more quiz pages.

Sections today: Guitar (`/guitar`), Piano (`/piano`), Ear Training (`/ear-training`), Sight Reading (`/sight-reading`).

Adding a new quiz means touching three places:
1. **`src/utils/<domain>.ts`** — pure music-theory/data logic for the quiz (note pools, randomization, chord/interval definitions), no React.
2. **`src/pages/<Name>QuizPage.tsx`** (+ a `<Name>SectionPage.tsx` if it's a new section) — the page component, usually paired with a presentational SVG display component in `src/components/` (e.g. `FretboardDisplay`, `PianoDisplay`, `StaffDisplay`) that takes plain data props and renders the visual (fretboard/keyboard/staff).
3. **Wire it up** in `src/App.tsx` (add the `<Route>`, and a `<SectionTab>` in the header if it's a new section) and in `src/pages/HomePage.tsx` (add/extend an entry in the `SECTIONS` array so it shows up as a hub card).

Routing and section navigation are centralized in `App.tsx` — one flat `<Routes>` list, no nested router. Every page component is loaded via `React.lazy` (wrapped in a single `<Suspense>`) except `HomePage`, which stays eager since it's the landing route. Add new routes the same way: `const Foo = lazy(() => import("./pages/Foo"))`.

### Shared hooks

`src/hooks/` holds cross-quiz logic extracted to avoid re-duplicating it in every new quiz page: `useSoundfontInstrument` (soundfont-player wiring — instrument load/switch, volume, low-level multi-note `play()`), `useSimpleSynth` (lightweight oscillator audio via `SimpleSynth`), `useLocalStorageState` (generic persisted state with a pluggable codec), `useEnabledChords` (chord-quiz enabled-set/preset/group-toggle logic), and `useIsMobile`/`useMediaQuery`. Reach for these before writing new quiz-local state for the same concerns. `src/utils/theme.ts` has shared color constants (`blue`, `green`, `red`, `amber`, `white`, `black` alpha-parameterized helpers, plus an `answerTileStyle()` helper) — not yet used everywhere, but prefer it over hand-typing new rgba literals.

### Audio

`src/utils/audio.ts` has `SimpleSynth`, a small Web Audio oscillator-based synth (attack/release envelopes, single notes, two-note ascending intervals, a "wrong answer" buzz). `soundfont-player` is also a dependency, used where quizzes need realistic sampled instrument playback rather than a raw oscillator. Prefer following whichever pattern the nearest existing quiz page already uses for its instrument.

### Styling

No CSS framework or CSS modules — components style themselves with inline `style={{ ... }}` objects (dark theme, translucent whites/rgba overlays, backdrop blur). `index.css`/`App.css` only hold minimal global resets. Match the existing inline-style conventions rather than introducing a new styling approach.

## Working notes (`NOTES.md`)

Keep `NOTES.md` (in this directory) current with what's in progress, right here in the repo — don't rely solely on conversation history or the memory system to carry this forward, since neither is guaranteed to be visible to whoever/whatever picks up next.

- **Update it as you go, not just at the end of a session.** Sessions can end abruptly (context/usage limits, disconnects, crashes) with no chance for a clean wrap-up. Treat every completed task, every non-obvious decision, and the start of any long-running or risky step as a checkpoint worth writing down immediately, not something to summarize later.
- **It reflects current state, not a changelog.** Overwrite/trim stale entries rather than appending forever — git history is the log of what happened; this file is "where things stand right now" and what's actively unresolved. Prefer specifics: file paths, function names, why a decision was made — not vague status text.
- **Minimum structure:** what's in progress, key recent decisions (+ why), open questions/blockers, concrete next steps, and a last-updated line. Once a body of work is finished and verified, clear it out down to a short "nothing in progress" state rather than leaving completed work cluttering it.
