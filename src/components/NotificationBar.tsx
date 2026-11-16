import { useState } from 'react';
import {
  getNotificationStatus,
  requestOsNotificationPermission,
  sendOsNotification,
  type NotificationStatus,
} from '../utils/notificationUtils';

export default function NotificationBar() {
  const [status, setStatus] = useState<NotificationStatus>(() =>
    getNotificationStatus(),
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleEnableClick() {
    const nextStatus = await requestOsNotificationPermission();
    setStatus(nextStatus);

    if (nextStatus === 'granted') {
      await sendOsNotification('PICO TASK // Alerts Active!', {
        body: 'You will now receive OS notifications for task deadlines and focus timers.',
        tag: 'pico-welcome-alert',
      });
      setFeedback('OS Notifications enabled! Sent a welcome alert.');
    } else if (nextStatus === 'denied') {
      setFeedback('Permission blocked in browser settings.');
    }
  }

  async function handleTestClick() {
    const ok = await sendOsNotification('PICO TASK // Test Reminder', {
      body: 'Your OS notifications are working! Deadlines & timers will alert you here.',
      tag: `pico-test-${Date.now()}`,
    });
    setFeedback(
      ok
        ? 'Sent a real OS notification! Check your system tray / banner.'
        : 'Could not send notification. Check system notification settings.',
    );
  }

  return (
    <section
      aria-label="OS Notification settings"
      className="pixel-card p-3.5 space-y-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`border-2 border-pico-navy px-1.5 py-0.5 font-heading text-[8px] uppercase ${
              status === 'granted'
                ? 'bg-pico-green text-pico-cream'
                : status === 'ios-needs-install'
                  ? 'bg-pico-orange text-pico-navy'
                  : 'bg-pico-peach text-pico-navy'
            }`}
          >
            {status === 'granted'
              ? 'OS Alerts: ON'
              : status === 'denied'
                ? 'OS Alerts: Blocked'
                : status === 'ios-needs-install'
                  ? 'iOS: Install First'
                  : 'OS Alerts: Off'}
          </span>

          <span className="text-sm font-bold text-pico-navy">
            {status === 'granted'
              ? 'Deadline & Timer OS notifications active.'
              : status === 'ios-needs-install'
                ? 'On iPhone: Tap Share -> Add to Home Screen to unlock notifications.'
                : status === 'denied'
                  ? 'Allow notifications in your browser site settings to receive alerts.'
                  : 'Get real phone/desktop alerts when deadlines or timers finish.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status === 'default' && (
            <button
              type="button"
              onClick={() => void handleEnableClick()}
              className="pixel-btn min-h-9 px-3 py-1 bg-pico-blue text-pico-navy font-heading text-[9px] uppercase"
            >
              [Enable Alerts]
            </button>
          )}

          {status === 'granted' && (
            <button
              type="button"
              onClick={() => void handleTestClick()}
              className="pixel-btn min-h-9 px-3 py-1 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
            >
              [Test Alert]
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <p className="text-xs font-bold text-pico-gray border-t border-pico-navy/20 pt-1.5">
          &gt; {feedback}
        </p>
      )}
    </section>
  );
}
