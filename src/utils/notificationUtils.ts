/**
 * Utilities for managing real OS-level notifications via the Service Worker
 * and Web Notifications API, including iPhone (iOS Safari) standalone detection.
 */

export type NotificationStatus =
  | 'granted'
  | 'default'
  | 'denied'
  | 'ios-needs-install'
  | 'unsupported';

/**
 * Detects if the device is an iPhone/iPad running inside a normal browser tab
 * rather than installed to the Home Screen (`display: standalone`).
 *
 * Interview Note:
 * On iOS 16.4+, Apple only exposes `window.Notification` after the user adds
 * the PWA to their Home Screen and launches it from there.
 */
export function isIosBrowserTab(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as unknown as { standalone?: boolean }).standalone);

  return isIos && !isStandalone;
}

/**
 * Returns the current notification capability and permission state.
 */
export function getNotificationStatus(): NotificationStatus {
  if (isIosBrowserTab()) {
    return 'ios-needs-install';
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests OS notification permission inside a direct user click handler.
 */
export async function requestOsNotificationPermission(): Promise<NotificationStatus> {
  if (isIosBrowserTab()) {
    return 'ios-needs-install';
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  const result = await Notification.requestPermission();
  return result;
}

/**
 * Sends a real OS notification using the active Service Worker registration
 * (required on mobile Android/iOS PWAs), falling back to `new Notification()`
 * on desktop dev servers if no Service Worker is controlling the page yet.
 */
export async function sendOsNotification(
  title: string,
  options?: { body?: string; tag?: string },
): Promise<boolean> {
  if (getNotificationStatus() !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions = {
    body: options?.body ?? '',
    tag: options?.tag,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    }

    // Fallback for desktop browser tabs when Service Worker is not yet registered in dev mode
    new Notification(title, notificationOptions);
    return true;
  } catch {
    return false;
  }
}
