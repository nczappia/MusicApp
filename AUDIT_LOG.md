# Music App Audit Log

This file tracks all findings from code audit passes. New audit sessions should read this file first to avoid repeating prior findings.

---

## Pass 1 — Initial Audit (All Fixed)

### Bugs Fixed
| # | Severity | File | Issue |
|---|---|---|---|
| 1 | 🔴 Critical | `utils/staffNotes.ts` | Bass clef notes 2 diatonic steps too low — bottom line was E2, corrected to G2. Full array + ledger lines redone. |
| 2 | 🟡 Medium | `pages/ChordInversionQuizPage.tsx` ~line 490 | Sus chord inversion hints said "bass = 3rd" — now computes actual degree from `chord.intervals` (shows "2nd"/"4th" correctly). |
| 3 | 🟡 Medium | `hooks/useSimpleSynth.ts` lines 16–18 | `resume()` not awaited — first note after suspension silently dropped. Now properly awaited. |
| 4 | 🟡 Medium | `pages/FretboardPage.tsx` lines 62–71 | Re-clicking already-found fretboard cell replayed audio. Early-exit guard added. |
| 5 | 🟢 Minor | `pages/FretboardPage.tsx` lines 73–75 | Wrong-highlight timeout raced on fast double-click. Timeout ID moved to `useRef`, cleared before rescheduling. |
| 6 | 🟢 Minor | `pages/PianoChordQuizPage.tsx` lines 146–157 | `locked` not cleared alongside `setScreen("results")`. Fixed. |

### Organization Fixed
| # | Issue |
|---|---|
| 7 | `QuizCard` and `Breadcrumb` copy-pasted across all 4 section pages → extracted to shared components |
| 8 | `sleep()` duplicated in `utils/audio.ts` and `hooks/useSoundfontInstrument.ts` → consolidated into `utils/time.ts` |
| 9 | `formatTime()` duplicated in `FretboardNoteQuizPage` and `PianoChordQuizPage` → moved to `utils/time.ts` |
| 10 | localStorage access inconsistent (hook vs manual `useEffect`) → normalized to `useLocalStorageState` |
| 11 | `toggleChord`/`toggleGroup` reinvented in `PianoChordQuizPage` → `useEnabledChords` made generic |
| 12 | Instrument selector + volume slider UI block copy-pasted 3× → extracted to `<InstrumentControls>` |
| 13 | Score state (`correct`, `total`, `streak`, `accuracy`, `resetScore`) duplicated across 3 ear training pages → `useQuizScore()` hook |
| 14 | `App.css` imported in 3 of 11 pages → moved to `main.tsx` only |
| 15 | `INSET` exported from `utils/fretboard.ts` but never imported → removed |
| 16 | `theme.ts` color helpers ignored everywhere; pages hardcoded `rgba(...)` → replaced with theme helpers |
| 17 | 4 render-time style functions in `PianoChordQuizPage` recreated every render → memoized with `useCallback` |

---

## Pass 2 — Second Audit

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 18 | `pages/FretboardNoteQuizPage.tsx` lines 31–48 | Duplicate questions possible when count approaches pool size — rejection-sample loop (100 attempts) gave up. Fixed with question count clamp; fully replaced with Fisher-Yates in Pass 3. |
| 19 | `App.tsx` | No 404 route — unknown paths rendered blank. Added `<NotFound />` component and catch-all route. |

### Noted (Not Fixing)
- `useLocalStorageState.ts` — `codec` excluded from `useEffect` deps via eslint-disable. Safe — all codecs are functionally stable across renders.
- `useIsMobile.ts` — `onChange()` called redundantly on mount. Harmless; React bails on same-value state update. Actually a valid race-condition guard.
- `IntervalQuizPage.tsx` — "Common set" preset hardcodes raw semitone values inline. Correct but slightly fragile.
- `useSoundfontInstrument.ts` — Load failures silent at hook level; handled downstream in UI with feedback text.
- `NoteReadingQuizPage.tsx` — Local `Breadcrumb` function for 2-level path; shared component only supports 1-level. Intentional.
- `ensureAudio` not wrapped in `useCallback` in synth hooks — only called from event handlers, no retrigger issues.

---

## Pass 3 — Third Audit

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 20 | `pages/FretboardNoteQuizPage.tsx` lines 35–48 | Replaced rejection-sample loop with Fisher-Yates shuffle over pre-built position array — guarantees no duplicates regardless of pool size. |
| 21 | `hooks/useSoundfontInstrument.ts` lines 50–65, 76–89 | Race condition: instrument change mid-load caused old soundfont to overwrite new one. Added `cancelled` flag pattern to `ensureAudio` (matching existing pattern in instrument-change `useEffect`). |

### Noted (Not Fixing)
- `theme.ts` — `COLORS`, `answerTileStyle`, `AnswerState` exported but never imported. Partial refactor artifact, harmless.
- `utils/staffNotes.ts` — `isOnLine` exported but never imported. Dead utility.
- `useEnabledChords.ts` line 16 — Non-null assertion on `presets.find(...)`. Fixed in Pass 5.
- `pages/FretboardPage.tsx` line 72 — `&& fret <= maxFret` guard always true; `FretboardDisplay` already clamps. Dead condition.
- `pages/FretboardPage.tsx` lines 36, 51–55 — Two question generations on initial mount (lazy init + `useEffect`). Redundant render, benign.
- `pages/ChordInversionQuizPage.tsx` `degreeLabel` — Semitone 8 labeled "5th" rather than "aug 5th". Intentionally generic for beginners.

---

## Pass 4 — Fourth Audit

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 22 | `pages/PianoChordQuizPage.tsx` line ~444 | Extension legend showed even when current question had no extension (`allowExt` flag vs `current.extension !== null`). Fixed to check actual question state. |
| 23 | `utils/pianoChords.ts` lines ~96–103 | Root range computed assuming worst-case extension (add11, +17 semitones) always used, blocking higher-register chords unnecessarily. Fixed: extension now decided before root range computed. |
| 24 | `components/PianoDisplay.tsx` lines ~39–40 | `React.ReactElement[]` used without importing `React` namespace — latent type error passing due to `skipLibCheck`. Fixed to `import type { ReactElement } from "react"`. |

### Noted (Not Fixing)
- `useIsMobile.ts` — double `onChange` on mount is a valid race guard, React 18 bails for free.
- `ensureAudio` in `useSimpleSynth` recreated each render — event-handler only, no behavioral issue.
- `useLocalStorageState` eslint-disable on `codec` — stable in all call sites (repeated from Pass 2).
- `NoteReadingQuizPage` local `Breadcrumb` — intentional 3-level path (repeated from Pass 2).
- `FretboardDisplay.tsx` — non-null assertion on `boardRef.current!` — safe, handler only fires when element exists.
- `FretboardPage.tsx` — redundant `fret <= maxFret` (repeated from Pass 3).

---

## Pass 5 — Fifth Audit

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 25 | `hooks/useEnabledChords.ts` line ~16 | Non-null assertion `presets.find(...)!.ids` throws on mount if label doesn't match. Replaced with safe fallback to all chord IDs. |
| 26 | `hooks/useEnabledChords.ts` lines ~46–57 | `allEnabled` computed from render-time `enabledSet` inside `setEnabledSet` updater — stale closure in concurrent mode. Moved computation inside updater to use `prev`. |
| 27 | `pages/NoteReadingQuizPage.tsx` lines ~33–40 | `buildQuestions` sampled with replacement — same note could appear consecutively. Now rejects picks matching previous note label. |
| 28 | `pages/FretboardNoteQuizPage.tsx`, `pages/PianoChordQuizPage.tsx`, `pages/NoteReadingQuizPage.tsx` | Auto-advance `setTimeout` not stored or cleared on unmount — fires on unmounted component if user navigates away. Now stored in `useRef`, cleared in `useEffect` cleanup. |
| 29 | `utils/pianoChords.ts` line ~115 | Empty `validRoots` silently produced `undefined`/`NaN` through question generation. Now throws explicit error. |

### Noted (Not Fixing)
- `ensureAudio` in `useSimpleSynth` not memoized — event-handler only, no retrigger issues (repeated).
- `NoteReadingQuizPage` local `Breadcrumb` — intentional (repeated).
- `useIsMobile.ts` `window.matchMedia` in state initializer — SSR-unsafe but irrelevant for this SPA.
- Fisher-Yates in `FretboardNoteQuizPage` shuffles full array even for small `n` — negligible at these sizes.

---

## Pass 6 — Sixth Audit

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 30 | `components/StaffDisplay.tsx` lines 31–62 | Treble (𝄞) and bass (𝄢) clef Unicode characters (U+1D100–U+1D1FF block) rendered as blank boxes on Linux/Android where `"serif"` has no coverage. Replaced `<text>` elements with font-independent inline SVG paths. |

### Noted (Not Fixing)
- `FretboardNoteQuizPage.tsx` `handleAnswer` — sub-millisecond double-tap could bypass locked/chosen guards before React commits state, orphaning one timer. Not achievable in normal use.
- `IntervalQuizPage.tsx` / `ChordQuizPage.tsx` — no consecutive-repeat guard on `makeQuestion`; same interval or chord can appear back-to-back. Marginal improvement at small pool sizes.
- `PianoChordQuizPage.tsx` `startQuiz` — `makePianoQuestion` throw (Pass 5 #29) unguarded at call site. Currently unreachable; defensive try/catch would be good hygiene.
- `IntervalQuizPage.tsx` line 63 — eslint-disable on effect deps, same reasoning as standing-noted instances.

---

## Pass 7 — Seventh Audit

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 31 | `utils/pianoChords.ts` lines 118–121 | Extension with semitone already in `chord.intervals` generated duplicate MIDI number — wrong key color (purple vs blue) and false extension legend. Now filters extension pool to exclude semitone collisions before picking; falls back to no extension if pool empties. |
| 32 | `utils/audio.ts` lines ~35–53 | `SimpleSynth.playTwoNotesAscending` defined but never called anywhere. Removed along with now-unused `sleep` import. |

### Noted (Not Fixing)
- `NoteReadingQuizPage.tsx` anti-repeat guard uses full label (`"C4"`) not note name (`"C"`) — same-letter notes across octaves allowed; intentional since different staff position genuinely tests reading.
- `StaffDisplay.tsx` — a couple of hardcoded hex colors (`"#4caf50"`, `"rgba(220,220,255,0.95)"`) instead of theme helpers — consistent within the module.

---

## Pass 8 — Eighth Audit

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 33 | `hooks/useLocalStorageState.ts` lines ~38–41 | `localStorage.setItem` not in try/catch — throws `SecurityError` in Safari private mode and `QuotaExceededError` when storage full; uncaught in `useEffect` crashes the app. Wrapped in try/catch, silently falls back to in-memory value. |
| 34 | `pages/ChordInversionQuizPage.tsx` line ~195 | Inversion button count (`inversionCount`) leaked chord family in advanced mode — 3 buttons revealed triads, 4 revealed seventh chords. Now always renders 4 buttons in advanced mode. |

### Noted (Not Fixing)
- `useSoundfontInstrument` — "try again" copy misleading on load failure; clicking Play again does nothing (only switching instruments retriggers load). Fixing needs retry button or ctx-state rework.
- Progress bar in `PianoChordQuizPage` / `FretboardNoteQuizPage` peaks at `(n-1)/n%`, never hits 100% — results screen replaces it before user notices.

---

## Pass 9 — Ninth Audit

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 35 | `pages/ChordInversionQuizPage.tsx` line ~467 | 4th inversion button showed "bass = 7th" for triads in advanced mode — `question.chord.intervals[3]` is `undefined` for triads; `degreeLabel(undefined)` falls through to `"7th"`. Fixed with bounds guard: `i < question.chord.intervals.length ? degreeLabel(...) : "—"`. |
| 36 | `pages/IntervalQuizPage.tsx`, `pages/ChordQuizPage.tsx`, `pages/ChordInversionQuizPage.tsx` | In-flight `play()` marked new unheard question as played when settings changed mid-playback. `stop()` now called in settings-change `useEffect` so old audio resolves cancelled. |

### Noted (Not Fixing)
- `FretboardNoteQuizPage.tsx` — `setLocked(false)` missing on results transition (no visible bug; results screen has no locked-gated elements; `startQuiz` resets it).
- `InstrumentControls.tsx` — volume slider `max={1.5}` (150%) — probably intentional for quiet soundfonts.

---

## Deep Pass (Passes 10–12) — Parallel Specialized Audits

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 37 | `pages/FretboardPage.tsx` lines ~75–79 | `setDone(true)` called inside `setFound` functional updater — side effect in pure updater fires twice in React 18 StrictMode. Removed `done` as separate state; now derived from `found` and `question.matches`. |
| 38 | `components/FretboardDisplay.tsx` | Fretboard had no keyboard access — no `role`, `tabIndex`, `aria-label`, or `onKeyDown`. Now focusable with arrow-key navigation and Enter/Space to select. |
| 39 | `components/InstrumentControls.tsx` line ~52 | Volume `<input type="range">` missing `aria-label`. Added `aria-label="Volume"`. |

### Noted (Not Fixing)
- `useIsMobile.ts` — `useMediaQuery` exported but never imported outside the file (dead export).
- `staffNotes.ts` — `getNotesForClef` exported but never imported (second dead export alongside `isOnLine`).
- `PianoDisplay.tsx` — `"root"` `PianoKeyKind` variant and its `HL["root"]` palette entry are unused.
- `ChordInversionQuizPage.tsx` line 411 — `else if (!isSubmittedRight)` always-true at that point; plain `else` would be cleaner. Cosmetic.
- `ChordInversionQuizPage.tsx` — `degreeLabel(9)` returns `"6th"` for dim7 3rd inversion (should be "7th"); fixing needs per-chord-type logic, out of scope for generic function.
- `PianoChordQuizPage.tsx` — post-answer highlighting shows valid roots and chord types independently; can imply invalid pairings as correct. Results table clarifies.
- `IntervalQuizPage.tsx` "Common set" includes unison (semitone 0) — two identical pitches, pedagogically awkward for ascending melodic intervals.
- `FretboardPage.tsx` `handleCellClick` — `question`/`maxFret` stale after `await ensureAudio()`; race window is zero in practice (AudioContext already live after first click).
- `PianoChordQuizPage.tsx` — `useCallback` on four inline style helpers stabilizes identity but is never leveraged (called inline in JSX, not passed to memoized children). `useMemo` would be more appropriate but not a correctness issue.
- `FretboardNoteQuizPage.tsx` / `PianoChordQuizPage.tsx` — `setAnswers` uses closure spread instead of functional updater; safe because locked guard prevents concurrent submissions.

---

## Deep Pass 2 (Passes 13–15) — Parallel Specialized Audits

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 40 | `pages/IntervalQuizPage.tsx`, `pages/ChordQuizPage.tsx`, `pages/ChordInversionQuizPage.tsx` | `locked` permanently stuck after settings change mid-playback. Pass 9 added `stop()` but not `setLocked(false)`. After cancellation, `locked` remained `true` forever — all buttons disabled, user had to reload. Added `setLocked(false)` after `stop()` in all three settings-change effects. |
| 41 | `components/StaffDisplay.tsx` lines ~93–97 | SVG used fixed `width={260}` — overflowed card border on 320px phones. Replaced with `viewBox` + `width: "100%", height: "auto"`. |
| 42 | `components/FretboardDisplay.tsx` line ~108 | `onPointerDown` fired on scroll-start — swiping fretboard on mobile submitted spurious answers. Switched to `onClick` which browsers suppress on scroll. |
| 43 | `pages/FretboardNoteQuizPage.tsx` line ~338, `pages/PianoChordQuizPage.tsx` line ~423 | Quiz-screen h1 used global `3.2em` — "Piano Chord Quiz" pushed score/timer to second row on phones. Clamped to `clamp(1.3rem, 5vw, 2rem)` on quiz screens only. |

### Noted (Not Fixing)
- `App.tsx` — `<Suspense>` has no `ErrorBoundary`; failed lazy bundle load crashes with blank screen. Low risk for locally-bundled Vite SPA.
- `FretboardNoteQuizPage.tsx` `handleAnswer` — async await creates theoretical cleanup-race on unmount; race window zero in practice (same profile as FretboardPage item).
- `FretboardDisplay.tsx` — first render uses flat 40px columns before `ResizeObserver` fires; single frame, invisible.
- `App.tsx` nav tab strip — thin scrollbar visible on sub-420px viewports; `scrollbarWidth: "none"` would hide it.
- `QuizCard.tsx` / `HomePage.tsx` SectionCard — hover effects use `onMouseEnter`/`onMouseLeave`, don't fire on touch; cards appear flat on mobile.
- `PianoChordQuizPage.tsx` `computeValidAnswers` — enharmonic roots bypass `naturalRoots=true` restriction (e.g. E min6 = C# half-dim7 both accepted). Musically correct; pedagogically subverts scope.
- `PianoChordQuizPage.tsx` with extensions — base chord scoring means extension chords can't be identified by their extended name (e.g. "C maj6"). Copy clarification needed, not code change.

---

## Pass 16 — Sixteenth Audit

### Bugs Fixed
| # | Severity | File | Issue |
|---|---|---|---|
| 44 | 🔴 Critical | `hooks/useSoundfontInstrument.ts` lines 79–86 | Mount effect never reset `cancelledRef.current = false`. In React.StrictMode dev double-invoke, the first mount's cleanup set the flag `true` before the real mount ran, permanently poisoning it — all audio silently failed to play in dev across all 3 ear-training quiz pages. Added `cancelledRef.current = false;` as the first line of the mount effect. |
| 45 | 🟡 Medium | `hooks/useSoundfontInstrument.ts` lines ~102–107 | Instrument-change effect cleanup called `playerRef.current?.stop()` directly instead of bumping `playIdRef`. An in-flight `play()` promise still resolved `{ ok: true }` after its full nominal wait, unlocking the answer UI even though playback was cut short. Cleanup now does `playIdRef.current += 1` before stopping/nulling the player, matching the cancellation pattern used elsewhere. |
| 46 | 🟡 Medium | `pages/IntervalQuizPage.tsx`, `pages/ChordQuizPage.tsx`, `pages/ChordInversionQuizPage.tsx` | No effect watched instrument changes mid-quiz — switching instrument while a question was locked/playing left `locked`/`hasPlayed` stuck relative to the now-stopped playback. Added a `useEffect` on `[instrumentId]` in each page that calls `stop()` and resets `locked`/`hasPlayed` (via `resetAnswerState()` in the inversion quiz), mirroring the existing enabled-set/difficulty-change effects. |

---

## Pass 17 — Seventeenth Audit (Touch Targets & A11y)

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 47 | `pages/NoteReadingQuizPage.tsx` lines ~415–425 | Local `Breadcrumb()` rendered a plain `<div>` instead of a nav landmark. Wrapped in `<nav aria-label="Breadcrumb">` to match the shared `Breadcrumb` component. |
| 48 | `pages/PianoChordQuizPage.tsx` lines ~519–544 | "Chord Type" answer buttons missing `minHeight: 44`, falling under the 44px touch-target minimum unlike the adjacent Root buttons. Added `minHeight: 44`. |
| 49 | `pages/ChordQuizPage.tsx`, `pages/IntervalQuizPage.tsx`, `pages/ChordInversionQuizPage.tsx` | Play/Next/Reset toolbar buttons and Presets buttons (plus "Enable all"/"Common set" quick-select buttons in `IntervalQuizPage.tsx`) measured under 44px tall. Added `minHeight: 44` (and `padding: "10px 16px"` where buttons had no existing padding) across all three pages. |
| 50 | `pages/FretboardPage.tsx` lines ~118, ~134–135 | "Frets 0–12" toggle and "New Note"/"Next" buttons under 44px tall. Added `minHeight: 44` to each. |
| 51 | `pages/FretboardNoteQuizPage.tsx` line ~218, `pages/PianoChordQuizPage.tsx` line ~275 | Custom question-count `<input>` used `fontSize: 15`, triggering iOS Safari's auto-zoom on focus. Changed to `fontSize: 16` in both files. |

---

## Pass 18 — Eighteenth Audit

### Bugs Fixed
| # | File | Issue |
|---|---|---|
| 52 | `pages/PianoChordQuizPage.tsx` lines ~272–277 | Custom question-count `<input>` missing `onBlur` normalization — unlike `FretboardNoteQuizPage`, an invalid typed value left stale text displayed after tabbing away instead of resetting to the clamped `totalQ`. Added matching `onBlur` handler. |
| 53 | `utils/fretboard.ts` line ~42 | `stringRanges` exported but never imported anywhere. Removed. |
| 54 | `hooks/useLocalStorageState.ts` lines ~14–20 | `setCodec<T>()` exported but never imported anywhere. Removed. |

---

## Pass 19 — Nineteenth Audit

### Bugs Fixed
| # | Severity | File | Issue |
|---|---|---|---|
| 55 | 🟡 Medium | `pages/FretboardNoteQuizPage.tsx` line ~82 | Custom-count re-clamp used `parseInt(prev, 10) || maxQuestions` — treated a typed `"0"` as falsy and silently replaced it with `maxQuestions` instead of clamping to `1`; negative strings (truthy after `parseInt`) passed through unclamped. Replaced with an explicit `Number.isNaN` check plus `Math.min(Math.max(n, 1), maxQuestions)`. |
| 56 | 🟢 Minor | `pages/NoteReadingQuizPage.tsx` lines ~38–43 | Anti-repeat `while` loop in `buildQuestions` had no iteration cap, unlike the Fisher-Yates approach used in `FretboardNoteQuizPage`. Latent — current pools always contain multiple distinct labels — but would hang if a future pool ever collapsed to same-label entries only. Added a bounded `attempts < pool.length * 2` counter. |

---

## Pass 20 — Twentieth Audit (Touch Targets & Contrast)

### Bugs Fixed
| # | Severity | File | Issue |
|---|---|---|---|
| 57 | 🟡 Medium | `pages/PianoChordQuizPage.tsx` lines ~291–298, ~339–346 | Chord preset buttons and Options toggle buttons missing `minHeight`, rendering ~37–40px tall. Added `minHeight: 44` to both. |
| 58 | 🟡 Medium | `pages/ChordQuizPage.tsx` lines ~300–318 | Play Style toggle buttons missing `minHeight`. Added `minHeight: 44`. |
| 59 | 🟡 Medium | `pages/ChordInversionQuizPage.tsx` lines ~263–282, ~391–406 | Difficulty and Play Style buttons missing `minHeight`. Added `minHeight: 44` to both groups. |
| 60 | 🟢 Minor | `components/Breadcrumb.tsx`, `pages/NoteReadingQuizPage.tsx` | Breadcrumb text at `opacity: 0.5` on `rgba(255,255,255,0.87)` over `#242424` measured ~4.09:1 contrast, below WCAG AA 4.5:1. Raised `opacity` to `0.65` in both the shared component and the local breadcrumb in `NoteReadingQuizPage.tsx`. |

---

## Pass 21 — Twenty-First Audit (Accessibility)

### Bugs Fixed
| # | Severity | File | Issue |
|---|---|---|---|
| 61 | 🟡 Medium | `App.tsx` | No route-change focus management — skip-link target `#main-content` existed but nothing moved focus there on navigation, so screen readers got no page-change announcement. Added `tabIndex={-1}` to `<main id="main-content">` and a `useEffect` keyed on `useLocation().pathname` that focuses it on every route change. |
| 62 | 🟢 Minor | `components/FretboardDisplay.tsx`, `pages/FretboardNoteQuizPage.tsx` | `lastResult`/`lastActivatedCell` (keyboard-nav result state for the live region) were never reset when the parent loaded a new question — after answering, the "String X, Fret Y — correct/try again" announcement stayed stale until the user manually moved focus. Added an optional `resetKey` prop to `FretboardDisplay` and a `useEffect` that clears both on change; `FretboardNoteQuizPage` now passes `resetKey={current?.midi ?? 0}`. |

---

## Standing "Noted" Items (Carry Forward)

These have been seen and consciously skipped across multiple passes. Do not re-flag them:

| File | Note |
|---|---|
| `useLocalStorageState.ts` | `codec` eslint-disable on deps — intentional, safe |
| `useIsMobile.ts` | Double `onChange` on mount — valid race guard |
| `useIsMobile.ts` | `window.matchMedia` SSR-unsafe — irrelevant for SPA |
| `IntervalQuizPage.tsx` | "Common set" hardcodes semitone values — correct, slightly fragile |
| `useSoundfontInstrument.ts` | Load failures silent at hook level — handled in UI |
| `NoteReadingQuizPage.tsx` | Local `Breadcrumb` for 3-level path — intentional divergence |
| `useSimpleSynth.ts` | `ensureAudio` not in `useCallback` — event-handler only |
| `theme.ts` | `COLORS`, `answerTileStyle`, `AnswerState` exported but unused — partial refactor |
| `staffNotes.ts` | `isOnLine` exported but unused — dead utility |
| `FretboardPage.tsx` | `fret <= maxFret` guard always true — dead condition |
| `FretboardPage.tsx` | Two question generations on initial mount — redundant render, benign |
| `ChordInversionQuizPage.tsx` | `degreeLabel` returns "5th" for aug5 — intentionally generic |
| `FretboardDisplay.tsx` | Non-null assertion on `boardRef.current!` — safe by construction |
| `FretboardNoteQuizPage.tsx` | Fisher-Yates shuffles full array for small `n` — negligible |
| `StaffDisplay.tsx` | Hardcoded hex colors `"#4caf50"` and `"rgba(220,220,255,0.95)"` instead of theme helpers — consistent within module |
| `NoteReadingQuizPage.tsx` | Anti-repeat guard uses full label (`"C4"`) not note name — same-letter notes across octaves allowed intentionally |
| `IntervalQuizPage.tsx` / `ChordQuizPage.tsx` | No consecutive-repeat guard on `makeQuestion` — marginal improvement, not worth adding |
| `PianoChordQuizPage.tsx` | `makePianoQuestion` throw unguarded at `startQuiz` call site — currently unreachable |
| `IntervalQuizPage.tsx` line 63 | eslint-disable on effect deps — same reasoning as other standing-noted instances |
| `useSoundfontInstrument.ts` | "try again" copy misleading on load failure — only instrument switch retriggers load |
| `PianoChordQuizPage.tsx` / `FretboardNoteQuizPage.tsx` | Progress bar peaks at `(n-1)/n%`, never 100% — results screen replaces it before user notices |
| `useIsMobile.ts` | `useMediaQuery` exported but never imported outside the file |
| `staffNotes.ts` | `getNotesForClef` exported but never imported — dead export |
| `PianoDisplay.tsx` | `"root"` PianoKeyKind variant and `HL["root"]` palette entry unused |
| `ChordInversionQuizPage.tsx` line 411 | `else if (!isSubmittedRight)` always-true — cosmetic, plain `else` would be cleaner |
| `ChordInversionQuizPage.tsx` | `degreeLabel(9)` returns "6th" for dim7 (should be "7th") — generic function, per-chord logic out of scope |
| `PianoChordQuizPage.tsx` | Post-answer highlighting can imply invalid pairings — results table clarifies |
| `IntervalQuizPage.tsx` | "Common set" includes unison (semitone 0) — pedagogically awkward for ascending intervals |
| `FretboardPage.tsx` | `question`/`maxFret` stale after `await ensureAudio()` — race window zero in practice |

---

## Pass 22 — Verification + FretboardPage resetKey (Fixed)

### Verification of Passes 16–21
All 8 spot-checked fixes confirmed present and correct in source (cancelledRef reset, playIdRef bump, instrument-change useEffects, route focus, FretboardDisplay resetKey, parseInt NaN check, while-loop bound, breadcrumb opacity).

### Bug Fixed
| # | Severity | File | Issue |
|---|---|---|---|
| 63 | 🟢 Minor | `pages/FretboardPage.tsx` line 145 | `<FretboardDisplay>` missing `resetKey` prop — the stale-result fix applied to FretboardNoteQuizPage in Pass 21 was not carried over to this sibling page. On New Note / fret toggle, `lastActivatedCell`/`lastResult` inside FretboardDisplay didn't reset, causing the screen reader to announce "try again" immediately on a fresh question. Fixed by adding `resetKey={question.targetMidi}`. |
| `PianoChordQuizPage.tsx` | `useCallback` on inline style helpers doesn't leverage identity stability — not a correctness issue |
| `FretboardNoteQuizPage.tsx` / `PianoChordQuizPage.tsx` | `setAnswers` uses closure spread — safe due to locked guard |

---

## Pass 23 — Standing Noted Cleanup

### Bugs Fixed
| # | Severity | File | Issue |
|---|---|---|---|
| 64 | 🟢 Minor | `utils/staffNotes.ts` | `isOnLine` and `getNotesForClef` exported but never imported outside the file. Confirmed zero importers via repo-wide grep; both removed. |
| 65 | 🟢 Minor | `hooks/useIsMobile.ts` | `useMediaQuery` exported but never imported outside the file (still used internally by `useIsMobile`). Confirmed zero external importers; un-exported rather than deleted since `useIsMobile` still calls it. |
| 66 | 🟡 Medium | `components/FretboardDisplay.tsx` line ~292 | Outermost interactive container used `role="application"`, which suspends screen-reader browse mode for the entire subtree. Changed to `role="group"` (existing `aria-label` retained) — the conventional, less disruptive choice for a roving-focus keyboard grid. |
| 67 | 🟢 Minor | `components/Breadcrumb.tsx`, `pages/NoteReadingQuizPage.tsx` local breadcrumb | "Home" and section `<Link>`s were plain inline text at ~18px tap height. Added `display: "inline-block", padding: "8px 0"` to each breadcrumb `<Link>` to enlarge the tap target without changing visual layout. |

`npx tsc --noEmit` clean after all changes.

---

## Pass 24 — Final Functional Audit + resetKey collision fix

### Verification
All quiz pages, audio hooks, localStorage codecs, empty-array guards, and state machines re-read and confirmed functional. No regressions from recent changes.

### Bug Fixed
| # | Severity | File | Issue |
|---|---|---|---|
| 68 | 🟢 Minor | `pages/FretboardPage.tsx` | `resetKey={question.targetMidi}` could collide (~2-3% chance) if the same note was picked twice in a row — `resetKey` wouldn't change, so `FretboardDisplay`'s `lastActivatedCell`/`lastResult` wouldn't reset, causing a spurious "try again" announcement. Fixed by adding a monotonically increasing `key` counter to the `Question` type and using `resetKey={question.key}` instead. Also memoized `highlights` array with `useMemo` to prevent spurious dep-array effect firings on unrelated renders. |

### Noted (Not Fixing)
- Switching instruments mid-review in `IntervalQuizPage`/`ChordQuizPage` leaves stale `selected`/`feedback` banner visible (state clears correctly, banner just lingers until Next is clicked). Harmless — buttons stay correctly disabled.
