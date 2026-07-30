# Music Trainer

A collection of music-theory practice quizzes — guitar fretboard drills, piano chord recognition, ear training, and sight reading — in one app. This guide covers everything needed to get it running from scratch, on your computer and on your phone.

## What's inside

| Section | Quizzes |
|---|---|
| 🎸 **Guitar** | **Find All Positions** — a note name is shown; click every fret on the neck where it appears. **Name the Note** — a fret position is highlighted; pick the correct note from all 12 options, timed with accuracy tracking. |
| 🎹 **Piano** | **Chord Recognition** — notes are highlighted on a 3-octave keyboard; identify the root and chord type. Timed, with configurable chord sets. |
| 📄 **Sight Reading** | **Note Reading** — a note appears on the treble or bass clef staff; name it. Includes optional ledger lines. |
| 🎵 **Ear Training** | **Interval Quiz** — two notes play in sequence; identify the interval. **Chord Quiz** — a chord plays from a random root; identify the type (triads, suspended, sevenths), harmonic or arpeggiated. **Chord Inversions** — identify the inversion (and, on Advanced, the chord type too). |

Every quiz has its own **Settings** panel (usually a collapsible "Settings" section on the page) for things like which notes/chords/intervals to practice, instrument sound, and volume — your choices are saved in the browser automatically, so they persist next time you open that quiz.

---

## 1. Requirements

- **Node.js 20 or newer** (Node 22 recommended) — this includes `npm`. Check what you have installed:
  ```bash
  node --version
  npm --version
  ```
  If you don't have Node installed, get it from [nodejs.org](https://nodejs.org) (the LTS version is fine).
- A modern browser (Chrome, Safari, Firefox, Edge) — desktop or mobile.

## 2. Install

From a terminal, navigate into the `music-app` folder (the actual project root — the repository root above it only holds a license file) and install dependencies:

```bash
cd music-app
npm install
```

This only needs to be done once (and again any time dependencies change).

## 3. Run it

There are three ways to run the app depending on what you're doing. All commands are run from inside `music-app/`.

### Option A — Just testing on your computer

```bash
npm run dev
```

Open the URL it prints — normally **http://localhost:5173** — in your browser. This is the fastest option (instant reload on changes) but only reachable from the same computer.

Press `Ctrl+C` in the terminal to stop the server.

### Option B — Opening it on your phone (same WiFi)

This is the same dev server as Option A, but reachable from other devices on your network:

```bash
npm run dev:host
```

The terminal will print something like:

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.42:5173/
```

On your **phone**, make sure it's connected to the **same WiFi network** as the computer, then open the `Network:` address shown (e.g. `http://192.168.1.42:5173`) in its browser.

**If no `Network:` line appears**, or the phone can't connect, find your computer's local IP address manually:

- **Mac:** System Settings → Wi-Fi → Details (or run `ipconfig getifaddr en0` in Terminal)
- **Windows:** run `ipconfig` in Command Prompt and look for "IPv4 Address"
- **Linux:** run `ip addr show | grep "inet "` in a terminal

Then open `http://<that-ip>:5173` on your phone.

**If it still won't connect:** your computer's firewall may be blocking incoming connections — you may need to allow Node.js / port 5173 through it. Also double-check both devices are truly on the same network (not a "guest" WiFi network that isolates devices from each other, which many routers use by default).

### Option C — Installing it on your phone's home screen (PWA)

The app can be "installed" so it opens full-screen from your home screen like a native app, and its shell works even with a flaky connection. This requires a **production build**, not the dev server:

```bash
npm run build
npm run preview -- --host
```

Same as Option B: open the printed `Network:` URL (this time on port **4173**, e.g. `http://192.168.1.42:4173`) on your phone, on the same WiFi.

Once it loads:
- **iPhone (Safari):** tap the Share icon → **Add to Home Screen**.
- **Android (Chrome):** tap the **⋮** menu → **Add to Home screen** / **Install app** (or you may see an automatic install banner).

An icon will appear on your home screen that opens the app full-screen, no browser address bar.

---

## 4. Using the app

- The header has four tabs: **Guitar**, **Piano**, **Ear Training**, **Sight Reading**. On a narrow phone screen the tab row scrolls sideways if it doesn't all fit.
- Tapping a tab takes you to that section's hub page, listing its quizzes with a short description of each — tap one to start.
- Most quizzes have a **Settings** area (often collapsed under a "Settings" heading) to control difficulty, which notes/chords are included, instrument sound, and volume.
- **Audio quizzes (Ear Training) need a tap/click on "Play" before any sound plays** — this is a browser requirement (autoplay isn't allowed until you interact with the page), not a bug.
- Score, streak, and accuracy are tracked live during a quiz. Your settings (not scores) are remembered automatically between visits, per browser/device.

## 5. Troubleshooting

| Problem | Try this |
|---|---|
| Phone can't reach the app | Confirm both devices are on the same WiFi (not a guest/isolated network); check the computer's firewall isn't blocking the port; double-check the IP address is current (it can change when you reconnect to WiFi). |
| No sound in Ear Training quizzes | Click/tap "Play" first — browsers block audio until you interact with the page. Also check the in-quiz Volume slider and your device's own volume/mute state. |
| Instrument sounds fail to load | Ear Training quizzes stream instrument samples from a CDN — you need an internet connection the first time you load a given instrument (after that it's cached for the session). |
| Changes made to the code aren't showing up | Make sure you're using `npm run dev` (auto-reloads); a production build (`npm run build` + `npm run preview`) needs a rebuild to pick up changes. |

---

*For contributor/developer-facing documentation (architecture, code conventions, how to add a new quiz), see `CLAUDE.md` in this same folder.*
