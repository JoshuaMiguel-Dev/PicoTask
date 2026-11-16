# <img src="./public/icon.svg" width="28" height="28" alt="PicoTask Cat Icon" /> PicoTask

**Live Demo:** **[https://picotask.vercel.app](https://picotask.vercel.app)**

**PicoTask** is an offline-first Progressive Web App (PWA) built as a personal student desk companion. It combines deadline task tracking, a monthly schedule planner, a mechanical split-flap focus timer & desk clock, an interactive pixel streak cat, and a lightweight Philippine Peso (`₱`) expense tracker inside a cohesive **PICO-8 8-bit console interface**.

---

## Try the Demo

Open **[picotask.vercel.app](https://picotask.vercel.app)** on your phone or desktop browser:

- **Install on Android (Chrome):** Tap **`+ Install`** in the top header (or open the Chrome `⋮` menu $\rightarrow$ **Install app**).
- **Install on iPhone (Safari):** Tap **Share** $\rightarrow$ **Add to Home Screen**.
- **Works 100% Offline:** All tasks, focus sessions, streaks, and finance entries are stored locally on your device using **IndexedDB**, and static assets are cached by a **Service Worker**.

---

## Core Modules

### 1. `[Tasks]` — Deadline Ledger & Streak Cat Companion
- **Deadline Sorting & Urgency Badges:** Tasks automatically sort by earliest deadline and highlight as `OVERDUE`, `DUE SOON` (< 24h), `SCHEDULED`, or `DONE`.
- **Custom Pixel Date & Time Modal:** Pick dates, hours (`01–12`), and minutes (`:00–:59`) or use 1-tap presets (`Today 6PM`, `Tonight 11:59PM`, `Tmrw 9AM`).
- **Interactive Streak Cat:** Complete at least 1 task a day to build your streak and keep your gray tabby companion happy across 4 moods (`HAPPY`, `ALERT`, `SLEEPY`, `SAD`). Tap `[Pet]` for a headpat bounce—or tap 5 times in a row for a 360° backflip easter egg.

### 2. `[Cal]` — Monthly Calendar & Time-Slot Planner
- **7-Column Month Grid:** Color-coded task count badges on every date cell indicating overdue, due-soon, scheduled, or completed days.
- **Tear-Off Day Agenda & Quick Scheduler:** Tap any date to inspect its timeline, tag tasks (`[EXAM]`, `[PROJECT]`, `[LAB]`, `[HW]`, `[MEET]`), and lock in a deadline time slot in one tap.

### 3. `[Clock]` — Split-Flap Desk Clock & Focus Timer
- **Mechanical Split-Flap Display:** Frame-stepped `HRS : MIN : SEC` flip cards with `12H / 24H` toggle.
- **Focus Timer & Session Logger:** Run a count-up stopwatch, Pomodoro presets (`15m`, `25m`, `45m`), or a custom `MIN : SEC` countdown, then save completed study blocks to your session log.
- **Web Audio 8-Bit Alarms:** Synthesizes `Chiptune`, `Watch Beep`, and `Fanfare` 5-second completion alarms directly in the browser using the Web Audio API (zero external audio files).
- **Full-Screen Horizontal Desk Mode:** Tap `[Full Screen]` (with a mobile `[Rotate 90°]` option) to turn your phone into a landscape desk clock.

### 4. `[Cash]` — Peso (`₱`) Finance Tracker
- **Income & Expense Log:** Track allowance, part-time income, and daily student expenses (`Food`, `Transport`, `School`, `Tech`, `Fun`, `Other`) with a custom 8-bit pixel Peso (`₱`) glyph.
- **Monthly Category Chart:** Visualizes current-month spending by category using `Recharts`.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework & Language** | React 19 + TypeScript + Vite |
| **Styling & Design System** | Tailwind CSS v4 (Custom PICO-8 palette, hard pixel shadows, locked console viewport) |
| **Local Database** | Dexie.js (`IndexedDB` wrapper with reactive `useLiveQuery` hooks) |
| **PWA & Offline Support** | `vite-plugin-pwa` + Workbox (`generateSW`, runtime font caching, auto-update) |
| **Date & Charts** | `date-fns` + `Recharts` |
| **Audio Synthesis** | Browser Web Audio API (`AudioContext` square & triangle wave oscillators) |

---

## Project Structure

```text
├── public/                  # Pixelated gray cat PWA icons (SVG, 192x192, 512x512, Apple Touch)
├── src/
│   ├── components/          # PixelCat, StreakPetCard, FlipDigitCard, PixelDateTimePicker, TaskForm
│   ├── db/                  # Dexie IndexedDB schema (tasks, sessions, transactions)
│   ├── hooks/               # Custom React hooks (useClock)
│   ├── pages/               # Main views (TasksPage, CalendarPage, ClockPage, FinancePage)
│   ├── types/               # Strict TypeScript interfaces
│   ├── utils/               # Date, streak calculation, Web Audio synth, and OS notification helpers
│   ├── App.tsx              # Locked console shell & navigation
│   └── index.css            # PICO-8 design tokens & keyframe animations
└── vite.config.ts           # Vite & PWA manifest/service-worker configuration
```

---

## Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/JoshuaMiguel-Dev/PicoTask.git
cd PicoTask

# 2. Install dependencies
npm install

# 3. Start the development server (http://localhost:5173)
npm run dev

# 4. Build and preview production PWA
npm run build
npm run preview
```
