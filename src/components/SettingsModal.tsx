import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../db/db';
import {
  getNotificationStatus,
  requestOsNotificationPermission,
  sendOsNotification,
  type NotificationStatus,
} from '../utils/notificationUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isImmersive: boolean;
  onToggleImmersive: () => void;
}

/**
 * 8-Bit Pixel Gear SVG Icon for the header Settings button.
 */
export function PixelGearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 11 11"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="w-3.5 h-3.5 fill-current"
    >
      {/* Gear teeth */}
      <rect x="4" y="0" width="3" height="2" />
      <rect x="4" y="9" width="3" height="2" />
      <rect x="0" y="4" width="2" height="3" />
      <rect x="9" y="4" width="2" height="3" />
      <rect x="1" y="1" width="2" height="2" />
      <rect x="8" y="1" width="2" height="2" />
      <rect x="1" y="8" width="2" height="2" />
      <rect x="8" y="8" width="2" height="2" />
      {/* Outer ring */}
      <rect x="2" y="2" width="7" height="2" />
      <rect x="2" y="7" width="7" height="2" />
      <rect x="2" y="4" width="2" height="3" />
      <rect x="7" y="4" width="2" height="3" />
    </svg>
  );
}

export default function SettingsModal({
  isOpen,
  onClose,
  isImmersive,
  onToggleImmersive,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>(() =>
    getNotificationStatus(),
  );

  if (!isOpen) return null;

  async function handleAlertsClick() {
    if (notifStatus === 'default') {
      const next = await requestOsNotificationPermission();
      setNotifStatus(next);
      if (next === 'granted') {
        await sendOsNotification('PicoTask // Alerts Enabled', {
          body: 'OS notifications are now active.',
        });
      }
    } else if (notifStatus === 'granted') {
      await sendOsNotification('PicoTask // Test Alert', {
        body: 'Your notifications are working!',
      });
    }
  }

  async function handleResetAccount() {
    try {
      await db.tasks.clear();
      await db.sessions.clear();
      await db.transactions.clear();
      localStorage.clear();
      window.location.reload();
    } catch {
      localStorage.clear();
      window.location.reload();
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App Settings"
      className="fixed inset-0 z-[9999] bg-pico-navy/80 p-3 flex items-center justify-center overflow-hidden touch-none"
    >
      <div className="w-full max-w-sm pixel-card-peach p-4 space-y-4 border-4 border-pico-navy">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-pico-navy pb-2">
          <div className="flex items-center gap-2 text-pico-navy">
            <PixelGearIcon />
            <h2 className="font-heading text-[10px] sm:text-xs uppercase">
              Settings
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfirmReset(false);
              onClose();
            }}
            className="pixel-btn px-2.5 py-0.5 bg-pico-red text-pico-cream font-heading text-[9px] uppercase"
          >
            X
          </button>
        </div>

        {/* 1. Fullscreen Immersive Mode */}
        <div className="bg-pico-cream border-2 border-pico-navy p-3 flex items-center justify-between gap-2">
          <div>
            <span className="font-heading text-[9px] uppercase text-pico-navy block">
              Fullscreen App
            </span>
            <span className="text-xs text-pico-gray">
              Hide phone status &amp; back bars
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleImmersive}
            className={`pixel-btn min-h-9 px-3 py-1 font-heading text-[8px] uppercase ${
              isImmersive
                ? 'bg-pico-green text-pico-cream'
                : 'bg-pico-peach text-pico-navy'
            }`}
          >
            {isImmersive ? 'Full: ON' : 'Full: OFF'}
          </button>
        </div>

        {/* 2. OS Notifications */}
        <div className="bg-pico-cream border-2 border-pico-navy p-3 flex items-center justify-between gap-2">
          <div>
            <span className="font-heading text-[9px] uppercase text-pico-navy block">
              OS Notifications
            </span>
            <span className="text-xs text-pico-gray">
              {notifStatus === 'granted'
                ? 'Active (tap to test)'
                : notifStatus === 'denied'
                  ? 'Blocked in browser'
                  : 'Deadline & timer alerts'}
            </span>
          </div>

          {(notifStatus === 'default' || notifStatus === 'granted') && (
            <button
              type="button"
              onClick={() => void handleAlertsClick()}
              className={`pixel-btn min-h-9 px-3 py-1 font-heading text-[8px] uppercase ${
                notifStatus === 'granted'
                  ? 'bg-pico-green text-pico-cream'
                  : 'bg-pico-blue text-pico-navy'
              }`}
            >
              {notifStatus === 'granted' ? 'Test Alert' : 'Enable'}
            </button>
          )}
        </div>

        {/* 3. Reset Account / Wipe All Data */}
        <div className="bg-pico-cream border-2 border-pico-navy p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-heading text-[9px] uppercase text-pico-red block">
                Reset Account &amp; Data
              </span>
              <span className="text-xs text-pico-gray">
                Clears tasks, streaks, cat &amp; cash log
              </span>
            </div>

            {!confirmReset && (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="pixel-btn min-h-9 px-3 py-1 bg-pico-red text-pico-cream font-heading text-[8px] uppercase shrink-0"
              >
                Reset
              </button>
            )}
          </div>

          {confirmReset && (
            <div className="pt-2 border-t border-pico-navy/30 space-y-2">
              <p className="text-xs font-bold text-pico-red">
                Are you sure? This will wipe all saved data and restart at the setup screen.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleResetAccount()}
                  className="pixel-btn min-h-9 py-1.5 bg-pico-red text-pico-cream font-heading text-[8px] uppercase"
                >
                  Yes, Wipe All
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="pixel-btn min-h-9 py-1.5 bg-pico-peach text-pico-navy font-heading text-[8px] uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setConfirmReset(false);
            onClose();
          }}
          className="pixel-btn w-full min-h-10 py-2 bg-pico-cream text-pico-navy font-heading text-[9px] uppercase"
        >
          [Close Settings]
        </button>
      </div>
    </div>,
    document.body,
  );
}
