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

Routing and section navigation are centralized in `App.tsx`; there's no nested router or lazy loading — everything is one flat `<Routes>` list.

### Audio

`src/utils/audio.ts` has `SimpleSynth`, a small Web Audio oscillator-based synth (attack/release envelopes, single notes, two-note ascending intervals, a "wrong answer" buzz). `soundfont-player` is also a dependency, used where quizzes need realistic sampled instrument playback rather than a raw oscillator. Prefer following whichever pattern the nearest existing quiz page already uses for its instrument.

### Styling

No CSS framework or CSS modules — components style themselves with inline `style={{ ... }}` objects (dark theme, translucent whites/rgba overlays, backdrop blur). `index.css`/`App.css` only hold minimal global resets. Match the existing inline-style conventions rather than introducing a new styling approach.
