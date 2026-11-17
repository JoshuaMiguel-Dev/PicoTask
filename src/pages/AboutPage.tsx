import PixelCat, {
  getSavedCatAccessory,
  getSavedCatVariant,
} from '../components/PixelCat';

export default function AboutPage() {
  const variant = getSavedCatVariant();
  const accessory = getSavedCatAccessory();

  return (
    <div className="space-y-4">
      {/* Hero Banner */}
      <section className="pixel-card-peach p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="bg-pico-cream border-2 border-pico-navy p-3 shrink-0 flex items-center justify-center">
          <PixelCat
            mood="happy"
            size="md"
            isPetted
            variant={variant}
            accessory={accessory}
          />
        </div>

        <div className="space-y-1.5 text-center sm:text-left">
          <span className="inline-block bg-pico-navy text-pico-cream px-2 py-0.5 font-heading text-[8px] uppercase">
            Student Desk Companion PWA
          </span>
          <h2 className="font-heading text-sm sm:text-base text-pico-navy">
            What is PicoTask?
          </h2>
          <p className="text-sm sm:text-base text-pico-navy leading-snug">
            <strong>PicoTask</strong> is an offline-first Progressive Web App designed
            to sit on your phone or desk while you study—combining deadline tracking,
            a monthly planner, a focus timer, a virtual streak cat, and a Peso (`₱`)
            budget log in one 8-bit console.
          </p>
        </div>
      </section>

      {/* Module Guide */}
      <section className="pixel-card p-4 space-y-3">
        <h3 className="font-heading text-xs uppercase text-pico-navy border-b-2 border-pico-navy pb-2">
          // How Each Tab Works
        </h3>

        <div className="space-y-2.5 text-sm sm:text-base">
          <div className="border-2 border-pico-navy bg-pico-cream p-3">
            <span className="bg-pico-red text-pico-cream border border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase mr-2">
              [Tasks]
            </span>
            <strong className="text-pico-navy">Deadline Ledger & Streak Pet:</strong>
            <p className="text-pico-gray mt-1 text-sm">
              Log assignments and tasks with deadlines. Tasks automatically sort by urgency
              (Overdue, Due &lt;24h, Scheduled). Complete at least <strong>1 task a day</strong> to
              build your streak and keep your cat happy! Tap <strong>[Style]</strong> to change
              your cat&apos;s coat and cosmetics, or tap <strong>[Pet]</strong> 5 times for a secret backflip.
            </p>
          </div>

          <div className="border-2 border-pico-navy bg-pico-cream p-3">
            <span className="bg-pico-blue text-pico-navy border border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase mr-2">
              [Cal]
            </span>
            <strong className="text-pico-navy">Monthly Schedule Planner:</strong>
            <p className="text-pico-gray mt-1 text-sm">
              See your entire month at a glance with color-coded task indicators on each day.
              Tap any date to inspect its timeline or schedule a task into a specific time slot.
            </p>
          </div>

          <div className="border-2 border-pico-navy bg-pico-cream p-3">
            <span className="bg-pico-orange text-pico-navy border border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase mr-2">
              [Clock]
            </span>
            <strong className="text-pico-navy">Split-Flap Clock & Focus Timer:</strong>
            <p className="text-pico-gray mt-1 text-sm">
              Use it as a live desk clock or switch to <strong>Timer</strong> for Pomodoro
              study blocks (`15m`, `25m`, `45m`, or custom `MIN:SEC`) with 8-bit chiptune
              alarms and a saved session log. Tap <strong>[Full Screen]</strong> to turn your
              phone sideways as a horizontal desk clock.
            </p>
          </div>

          <div className="border-2 border-pico-navy bg-pico-cream p-3">
            <span className="bg-pico-green text-pico-cream border border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase mr-2">
              [Cash]
            </span>
            <strong className="text-pico-navy">Peso (₱) Finance Tracker:</strong>
            <p className="text-pico-gray mt-1 text-sm">
              Track your allowance, part-time income, and daily student expenses (`Food`,
              `Transport`, `School`, `Tech`, `Fun`) with a monthly category chart.
            </p>
          </div>
        </div>
      </section>

      {/* Offline & Privacy Note */}
      <section className="pixel-card p-4 space-y-2">
        <h3 className="font-heading text-xs uppercase text-pico-navy border-b-2 border-pico-navy pb-2">
          // 100% Offline & Private
        </h3>
        <p className="text-sm text-pico-gray leading-relaxed">
          All of your tasks, focus sessions, cat customizations, and finance entries are
          saved directly on your device using <strong>IndexedDB</strong> and a{' '}
          <strong>PWA Service Worker</strong>. No account login is required, and it works
          even in Airplane Mode.
        </p>
      </section>
    </div>
  );
}
