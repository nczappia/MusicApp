# Working Notes

See `CLAUDE.md` for how/when to update this file.

## In progress

Nothing in progress right now.

## Recent decisions

- **2026-07-27 — Audit cleanup pass completed (17 items, priority order).** Fixed the critical bass-clef bug (`utils/staffNotes.ts` bottom line was E2, corrected to G2 — full note array + ledger lines redone). Fixed sus2/sus4 inversion hint text (`ChordInversionQuizPage`) to compute the actual scale-degree from `chord.intervals` instead of a hardcoded "3rd/5th/7th" table. Fixed `useSimpleSynth.ensureAudio` to `await` `AudioContext.resume()` (was fire-and-forget, could silently drop the first note). Added an early-exit guard in `FretboardPage` so re-clicking an already-found cell doesn't replay audio, and moved the wrong-highlight timeout into a `useRef` to fix a fast-double-click race. Cleared `locked` alongside `setScreen("results")` in `PianoChordQuizPage`. Extracted `QuizCard`/`Breadcrumb` (shared across the 4 section pages), `InstrumentControls` (shared across the 3 ear-training pages), `useQuizScore()` (correct/total/streak/accuracy, shared across the same 3 pages), and consolidated `sleep()`/`formatTime()` into a new `utils/time.ts`. Generalized `useEnabledChords` to take the chord list + presets as params so `PianoChordQuizPage` could reuse it instead of reinventing toggle logic. Normalized all remaining manual `localStorage.getItem/setItem` call sites onto `useLocalStorageState`. Moved `App.css` import to `main.tsx` only. Removed the unused `INSET` export from `utils/fretboard.ts`. Replaced hardcoded `rgba(...)` literals matching the existing `theme.ts` palette (white/black/blue/green/red/amber, plus a new `orange` helper) across all pages/components — one-off custom colors (piano keys, fretboard wood/wire) were deliberately left alone, not forced into the shared palette. Memoized the 4 `PianoChordQuizPage` answer-tile style functions with `useCallback`, which required hoisting them (and their derived `revealed`/`lastCorrect`/`validRootSems`/`validChordIds` values) above the screen-branch early returns to keep hook-call order unconditional. All verified via `npm run build` after each step plus a live click-through in the browser (bass clef note position cross-checked against the SVG staff geometry, sus hints, fretboard double-click guard via direct React prop invocation, and a full 10-question piano-quiz round-trip through "Try Again").
- **2026-07-26 — Refactor + mobile/PWA pass completed.** Extracted shared hooks (`useSoundfontInstrument`, `useSimpleSynth`, `useLocalStorageState`, `useEnabledChords`, `useIsMobile`) to de-duplicate logic that had been copy-pasted across the 8 quiz pages as the app grew (soundfont loading, localStorage persistence, enabled-chord/preset toggling). Added `React.lazy` code-splitting per route in `App.tsx`. Did a mobile-responsiveness pass (scrollable header nav, `FretboardDisplay` now supports a `visibleFrets` prop so the board actually shrinks on mobile instead of always rendering the full 1900px neck, `minmax(0, 1fr)` fix for 3 answer-grids that overflowed narrow viewports). Added PWA support via `vite-plugin-pwa` with a placeholder icon (blue eighth-note glyph — swap for real branding whenever it exists).
- **Access model:** app is accessed via LAN dev server (`npm run dev:host`) for now, not a public deploy — that was an explicit choice, not an oversight. See `CLAUDE.md` commands section for the exact commands (including the PWA-install caveat: use `npm run build && npm run preview -- --host`, not plain `dev:host`, to actually test "Add to Home Screen").

## Open questions / blockers

- `npm run lint` is broken (pre-existing, unrelated to the above) — `eslint@9.39.2` / `@typescript-eslint@8.14.0` version mismatch crashes the linter entirely. Not fixed yet. Use `npm run build` (full `tsc` typecheck) to verify changes until this is addressed. Fix is likely bumping eslint/typescript-eslint versions in `package.json`.

## Candidate next steps (not started)

- Public deployment/hosting (currently LAN-only by choice).
- Cross-session score-history/progress persistence (currently each quiz's score resets per visit; only settings persist via localStorage).
- Real PWA icon artwork to replace the generated placeholder.
- A test framework (none configured currently).
- Piano reduced-octave mobile mode (fretboard got a `visibleFrets`-based mobile default; piano didn't, since it'd need new question-generation logic in `pianoChords.ts`).

## Last updated

2026-07-27, end of the audit cleanup session.
