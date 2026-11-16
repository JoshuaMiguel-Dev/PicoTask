# <img src="./public/icon.svg" width="28" height="28" alt="PicoTask Cat Icon" /> PicoTask — 8-Bit Desk Companion PWA (Demo)

> **Status:** Interactive Prototype / Demo Build (Work in Progress)  
> **Live Demo:** **[https://picotask.vercel.app](https://picotask.vercel.app)**

**PicoTask** is a mobile-first, installable Progressive Web App (PWA) demo built as an all-in-one student desk companion. Styled after classic **PICO-8** 8-bit hardware, this demo showcases local-first task deadlines, an interactive monthly calendar, a split-flap focus timer with synthesized chiptune alarms, a virtual streak cat pet, and simple Philippine Peso (`₱`) expense tracking.

---

## Try the Live Demo

Open **[picotask.vercel.app](https://picotask.vercel.app)** on your phone or desktop browser:

- **Install on Android (Chrome):** Tap **`+ Install`** in the top header (or open the Chrome `⋮` menu $\rightarrow$ **Install app**).
- **Install on iPhone (Safari):** Tap **Share** $\rightarrow$ **Add to Home Screen**.
- **Offline Demo:** All tasks, focus sessions, streaks, and finance entries are stored locally in your browser's **IndexedDB** (`Dexie.js`) and cached via a **Service Worker** so you can test the app even in Airplane Mode.

---

## Demo Features

- **`[Tasks]` Deadline Ledger & Streak Cat:** Create, edit, filter, and complete tasks with automatic deadline sorting (`OVERDUE`, `DUE SOON`, `SCHEDULED`, `DONE`) and a custom PICO-8 date/time picker modal. Completing 1 task per day keeps your gray pixel cat happy across 4 moods (`HAPPY`, `ALERT`, `SLEEPY`, `SAD`)—tap `[Pet]` for a bounce animation, or tap 5 times for a 360° backflip!
- **`[Cal]` Monthly Schedule & Time-Slot Planner:** 7-column month calendar with color-coded task indicators, a tear-off daily date stamp, and 1-tap time-slot scheduling (`[EXAM]`, `[PROJECT]`, `[LAB]`, `[HW]`, `[MEET]`).
- **`[Clock]` Split-Flap Desk Clock & Focus Timer:** Mechanical split-flap `HRS : MIN : SEC` display with `12H / 24H` clock mode, custom countdown timer (`MIN : SEC`), session logger, 5-second Web Audio 8-bit alarms (`Chiptune`, `Watch Beep`, `Fanfare`), and a Full-Screen Horizontal desk mode.
- **`[Cash]` Peso (`₱`) Finance Tracker:** Log student allowance and daily expenses with a custom 8-bit pixel Peso (`₱`) glyph and a monthly `Recharts` category bar chart.

---

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Custom PICO-8 palette, hard pixel shadows, locked console viewport)
- **Local Database:** Dexie.js (`IndexedDB` wrapper with reactive `useLiveQuery` hooks)
- **PWA & Offline Support:** `vite-plugin-pwa` + Workbox
- **Date & Charts:** `date-fns` + `Recharts`
- **Audio:** Browser Web Audio API (`AudioContext` oscillators)

---

## Run the Demo Locally

```bash
# 1. Clone the repository
git clone https://github.com/JoshuaMiguel-Dev/PicoTask.git
cd PicoTask

# 2. Install dependencies
npm install

# 3. Start the development server (http://localhost:5173)
npm run dev
```
