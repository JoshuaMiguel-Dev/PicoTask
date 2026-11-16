# PICO TASK — Tactile Pixel Desk Companion (PWA)

A mobile-first, offline-capable Progressive Web App (PWA) built with a deliberate **PICO-8 8-bit hardware aesthetic**. Designed as a daily student desk companion combining deadline task management, an interactive month calendar, a split-flap focus timer & desk clock, an adoptable streak cat companion, and personal finance tracking in Philippine Pesos (`₱`).

---

## Design Direction

- **Tone:** Tactile 8-bit Hardware & Utilitarian Planner (inspired by PICO-8 & classic Braun desk clocks)
- **Color Palette (Official PICO-8 Hex Values):**
  - Cream `#FFF1E8` (Primary paper background)
  - Peach `#FFCCAA` (Recessed panels & header/navigation surfaces)
  - Dark Navy `#1D2B53` (Typography, 2–4px structural borders, hard offset shadows — 11.9:1 AAA contrast)
  - Red-Pink `#FF004D` (Primary actions, active tabs, overdue alerts)
  - Blue `#29ADFF` (Selected calendar dates, focus rings, secondary badges)
  - Dark Green `#008751` (Completed tasks, income, active timer state)
  - Orange `#FFA300` (Due-soon warnings within 24h, paused states)
  - Gray `#5F574F` (Muted metadata — 6.4:1 AA contrast)
- **Typography:** `'Press Start 2P'` for compact hardware headers & split-flap numerals; `'Pixelify Sans'` (`16px` base) for high-legibility body copy and mobile form inputs.
- **Memorable Detail:** Mechanical split-flap digit housings with a 4-step frame animation (`steps(4, end)`) and a full-screen horizontal desk mode (`createPortal` + Fullscreen API + `90°` portrait-lock rotation helper).

---

## Features by Phase

### Phase 1: MVP
1. **Task Ledger ([src/pages/TasksPage.tsx](file:///c:/Users/Joshua/Desktop/Projects/Project_ToDoTask/src/pages/TasksPage.tsx))**
   - Full CRUD (Add, Edit, Delete, Toggle Complete) persisted locally in **IndexedDB** via **Dexie.js**.
   - Automatic chronological sorting by deadline (active tasks first, earliest deadline at the top).
   - Urgency classification (`OVERDUE`, `DUE SOON` < 24h, `SCHEDULED`, `DONE`) with color-coded left hardware strips.
2. **Monthly Calendar ([src/pages/CalendarPage.tsx](file:///c:/Users/Joshua/Desktop/Projects/Project_ToDoTask/src/pages/CalendarPage.tsx))**
   - 7-column responsive month grid generated via `date-fns` (`eachDayOfInterval`).
   - Color-coded task count badges on each day cell; tap any date to inspect, complete, edit, or add tasks directly on that day.
3. **Calm Split-Flap Desk Clock & Focus Timer ([src/pages/ClockPage.tsx](file:///c:/Users/Joshua/Desktop/Projects/Project_ToDoTask/src/pages/ClockPage.tsx))**
   - **Desk Clock Mode:** Clean, distraction-free `HH:MM:SS` split-flap display with `12H / 24H` toggle.
   - **Focus Timer Mode:** Stopwatch and Pomodoro presets (`15m`, `25m`, `45m`) using **Progressive Disclosure** (the session title & save prompt only appears when you pause a session with time on the clock, and saved history is tucked into a collapsible drawer).
   - **Full-Screen Horizontal Mode:** Edge-to-edge landscape view (`[Full Screen]`) with oversized split-flap tiles and a mobile `[Rotate 90°]` toggle.
4. **Live In-App Deadline Reminder Banner ([src/components/DeadlineBanner.tsx](file:///c:/Users/Joshua/Desktop/Projects/Project_ToDoTask/src/components/DeadlineBanner.tsx))**
   - Highlights overdue and due-soon tasks across all tabs with signature-based dismissal.
5. **Installable Offline-First PWA ([vite.config.ts](file:///c:/Users/Joshua/Desktop/Projects/Project_ToDoTask/vite.config.ts))**
   - Web App Manifest (`manifest.webmanifest`), custom pixel icons (`192x192`, `512x512`, `apple-touch-icon`), and Workbox Service Worker caching all static assets and Google Fonts.

### Phase 2: Streak Pet Companion
- **Custom SVG Pixel Cat ([src/components/PixelCat.tsx](file:///c:/Users/Joshua/Desktop/Projects/Project_ToDoTask/src/components/PixelCat.tsx)):** Original 8-bit SVG cat drawn on a 24×20 pixel grid with 4 moods (`happy`, `neutral`, `sleepy`, `sad`) driven by your daily task completion streak.
- **Adopt & Name Your Cat ([src/components/StreakPetCard.tsx](file:///c:/Users/Joshua/Desktop/Projects/Project_ToDoTask/src/components/StreakPetCard.tsx)):** Prompts you to name your cat on first launch (with a `[Rename]` button anytime later) and reacts when you tap to pet it.

### Phase 3: Minimal Finance Tracker (`₱`)
- **Income & Expense Ledger ([src/pages/FinancePage.tsx](file:///c:/Users/Joshua/Desktop/Projects/Project_ToDoTask/src/pages/FinancePage.tsx)):** Track income and expenses in Philippine Pesos (`₱`) with categories (`Food`, `Transport`, `School`, `Tech`, `Fun`, `Allowance`, `Part-Time`, `Other`).
- **Monthly Summary & Category Bar Chart:** Live Net Balance, Monthly Income, Monthly Spend, and a PICO-8 styled `Recharts` category bar chart.

---

## Keyboard Shortcuts & Accessibility

- `Tab` / `Shift + Tab`: Navigate interactive controls with high-contrast dashed `#29ADFF` focus rings (`3px dashed`).
- `Alt + 1`: Switch to **Tasks** tab.
- `Alt + 2`: Switch to **Calendar** tab.
- `Alt + 3`: Switch to **Clock / Focus Timer** tab.
- `Alt + 4`: Switch to **Cash (Finance)** tab.
- `Escape`: Exit Full-Screen Horizontal Timer/Clock mode.

---

## Local Development & Production PWA Test

```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server (http://localhost:5173)
npm run dev

# 3. Build production bundle & Service Worker
npm run build

# 4. Preview production PWA locally
npm run preview
```
