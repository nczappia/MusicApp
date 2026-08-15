# Running Music Trainer

Step-by-step instructions for running the app in three situations: on the same computer you're developing on, from a different machine, and on a mobile device.

All commands are run from inside the `music-app/` folder.

## Prerequisites (all scenarios)

1. Install [Node.js](https://nodejs.org) 20+ (22 recommended) if you don't already have it.
2. Install dependencies once:
   ```bash
   cd music-app
   npm install
   ```

---

## 1. On your local machine

Use this when you're just working on the app on the computer you're sitting at.

1. Start the dev server:
   ```bash
   npm run dev
   ```
2. Open the URL it prints in your browser — normally **http://localhost:5173**.
3. Edit code and the page will hot-reload automatically.
4. Press `Ctrl+C` in the terminal to stop the server when done.

---

## 2. From another machine (same network)

Use this to open the app from a second computer, laptop, or any other device on the same local network — not just a phone.

1. Start the dev server in "host" mode, which binds it to your network interface instead of just `localhost`:
   ```bash
   npm run dev:host
   ```
2. The terminal prints two URLs:
   ```
     ➜  Local:   http://localhost:5173/
     ➜  Network: http://192.168.1.42:5173/
   ```
3. On the other machine, make sure it's connected to the **same network** as the machine running the server, then open the `Network:` URL shown (your IP will differ).
4. **If no `Network:` line appears**, find the host computer's local IP manually:
   - **Mac:** `ipconfig getifaddr en0` (or System Settings → Wi-Fi → Details)
   - **Windows:** `ipconfig` → look for "IPv4 Address"
   - **Linux:** `ip addr show | grep "inet "`

   Then open `http://<that-ip>:5173` from the other machine.
5. **If it still won't connect:**
   - The host machine's firewall may be blocking incoming connections on port 5173 — allow Node.js / that port through it.
   - Confirm both machines are truly on the same network segment (some networks isolate devices from each other by default, e.g. guest WiFi or a VLAN).
6. Press `Ctrl+C` on the host machine to stop the server.

---

## 3. On a mobile device

There are two ways to run it on a phone, depending on whether you just want to try it or want it installed like an app.

### 3a. Quick access over WiFi (dev server)

Same idea as scenario 2, using the phone as the "other machine":

1. On the computer, run:
   ```bash
   npm run dev:host
   ```
2. Make sure the phone is on the **same WiFi network** as the computer.
3. Open the `Network:` URL printed in the terminal (e.g. `http://192.168.1.42:5173`) in the phone's browser.
4. If it doesn't connect, see the troubleshooting steps in section 2 above (IP address, firewall, guest/isolated WiFi).

### 3b. Installing it on the home screen (PWA)

This builds a production version and lets you "install" it so it opens full-screen like a native app, with offline support for the app shell.

1. Build and serve the production build in host mode:
   ```bash
   npm run build
   npm run preview -- --host
   ```
2. On the phone (same WiFi), open the printed `Network:` URL — this time on port **4173**, e.g. `http://192.168.1.42:4173`.
3. Install it:
   - **iPhone (Safari):** tap the Share icon → **Add to Home Screen**.
   - **Android (Chrome):** tap the **⋮** menu → **Add to Home screen** / **Install app** (or accept the automatic install prompt if one appears).
4. An icon now appears on the home screen that launches the app full-screen, with no browser address bar.

**Note:** the PWA build is a snapshot — if you change the code, you need to re-run `npm run build` and reload/reinstall to see the changes, unlike the dev server which hot-reloads.

---

## Troubleshooting

| Problem | Try this |
|---|---|
| Other machine/phone can't reach the app | Confirm both devices are on the same network (not a guest/isolated WiFi); check the host computer's firewall isn't blocking the port; make sure the IP address is current (it can change when reconnecting to WiFi). |
| No sound in Ear Training quizzes | Click/tap "Play" first — browsers block audio until you interact with the page. |
| Instrument sounds fail to load | Ear Training quizzes stream instrument samples from a CDN — you need an internet connection the first time you load a given instrument. |
| Code changes aren't showing up | Make sure you're using `npm run dev` / `npm run dev:host` (auto-reloads). A production build (`npm run build` + `npm run preview`) needs a rebuild to pick up changes. |

---

*For contributor/developer-facing documentation (architecture, code conventions, how to add a new quiz), see `CLAUDE.md`. For a feature overview of the app itself, see `README.md`.*
